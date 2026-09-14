"use strict";
// 7 Ships — game-state engine. DOM-free. Compiled to game/engine.js, loaded after game-data.js
// and before script.js. Also require()-able from Node for scripts/simulate.js.
//
// Every action is (game, seat, …): no function assumes seat 0 is the human. AI decisions live
// only in the ai* functions at the bottom. Section references are to docs/requirements.md.
const GD = (typeof module !== "undefined" && module.exports) ? require("./game-data.js") : GameData;
const C = GD.C;
// ---- lookups ----
const TECH_BY_ID = {};
GD.TECH_CARDS.forEach((t) => { TECH_BY_ID[t.id] = t; });
const HULL_BY_ID = {};
GD.HULLS.forEach((h) => { HULL_BY_ID[h.id] = h; });
const ALIEN_BY_ID = {};
GD.ALIENS.forEach((a) => { ALIEN_BY_ID[a.id] = a; });
const SITE_TYPE_BY_ID = {};
GD.SITE_TYPES.forEach((s) => { SITE_TYPE_BY_ID[s.id] = s; });
const DECK_TYPES = ["void", "ice", "garden", "gas", "rock", "asteroid", "anomaly", "derelict", "hazard"];
const BANDS = ["easy", "medium", "hard"];
const BASE_RES = ["fuel", "rations", "water", "steel"];
const ALL_RES = ["fuel", "rations", "water", "steel", "crystal", "data"];
const KINDS = ["physics", "biology", "engineering"];
const NAMES = ["Aurora", "Meridian", "Cinder", "Halcyon", "Tempest", "Vesper", "Lodestar"];
// ---- rng ----
function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function shuffle(rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function weightedPick(rng, weights) {
    let total = 0;
    for (const t of DECK_TYPES)
        total += weights[t] || 0;
    let r = rng() * total;
    for (const t of DECK_TYPES) {
        r -= weights[t] || 0;
        if (r < 0)
            return t;
    }
    return "void";
}
// ---- derived player stats ----
function has(p, techId) { return p.installed.indexOf(techId) >= 0; }
function level(p, system) {
    let l = 0;
    for (const id of p.installed) {
        const t = TECH_BY_ID[id];
        if (t && t.system === system && t.level && t.level > l)
            l = t.level;
    }
    return l;
}
function hasArtifact(p, id) { return p.artifacts.indexOf(id) >= 0; }
function maxHull(p) { return C.BASE_MAX_HULL + 2 * level(p, "shields") + p.hull.maxHullBonus; }
function defense(p) { return level(p, "shields") + p.hull.defenseBonus + (hasArtifact(p, "heart") ? 1 : 0); }
function attack(p, ignoreSkeleton = false) {
    const skel = p.crew <= 2 && !ignoreSkeleton && !has(p, "boarding-pods") ? 1 : 0;
    return level(p, "weapons") + p.hull.attackBonus + (hasArtifact(p, "mirror") ? 2 : 0) - skel;
}
function maxCrew(p) {
    return Math.max(C.MAX_CREW, p.hull.power === "colony" ? 10 : 0, level(p, "life") >= 3 ? 10 : 0) + (has(p, "greenhouse-ring") ? 1 : 0);
}
function cargoCap(p, res) { return res === "crystal" || res === "data" ? C.SPECIAL_CAP : C.CARGO_CAP[level(p, "cargo")]; }
function sensorRange(p) { return 1 + level(p, "sensors"); }
function proximityRange(p) { return level(p, "sensors") >= 2 ? 2 : 1; }
function installedCount(p) { return p.installed.length; }
function tier(p) {
    const n = installedCount(p);
    let t = 0;
    C.TIER_THRESHOLDS.forEach((th, i) => { if (n >= th)
        t = i + 1; });
    return t;
}
function labLevelFor(p) { return Math.max(level(p, "lab"), p.hull.power === "faculty" ? 2 : 0); }
function isAdrift(p, game) { return p.adriftUntil > game.turn; }
function repairCost(p, game) {
    const s = site(game, p.col, p.lane);
    return s && s.isStation ? C.STATION_REPAIR_STEEL : C.REPAIR_STEEL;
}
function repairPerSteel(p) { return p.hull.power === "bulwark" ? 2 : 1; }
function inPact(a, b) { return a.pacts.some((x) => x.with === b.seat); }
function maxPacts(p) { return has(p, "diplomatic-bay") ? 2 : 1; }
function dist(a, b) { return Math.max(Math.abs(a.col - b.col), Math.abs(a.lane - b.lane)); }
function inProximity(game, a, b) {
    return a.seat !== b.seat && !isAdrift(a, game) && !isAdrift(b, game) && dist(a, b) <= Math.max(proximityRange(a), 1);
}
function neighbours(game, seat) { const p = game.players[seat]; return game.players.filter((q) => inProximity(game, p, q)); }
function site(game, col, lane) { return game.sites[col] ? game.sites[col][lane] : undefined; }
function bandOf(col) { return C.BAND_OF_COLUMN(Math.max(1, Math.min(C.COLUMNS, col))); }
function logTo(game, seat, msg) {
    const line = `T${game.turn} ${seat === null ? "" : game.players[seat].hull.emoji + " " + game.players[seat].name + ": "}${msg}`;
    game.log.push(line);
    if (seat !== null)
        game.players[seat].log.push(line);
}
function give(p, res, n) {
    const cap = cargoCap(p, res);
    const before = p.res[res];
    if (n <= 0 || before >= cap)
        return 0;
    p.res[res] = Math.min(cap, before + n);
    return p.res[res] - before;
}
function damage(game, seat, n, cause) {
    if (n <= 0)
        return;
    const p = game.players[seat];
    p.hp -= n;
    logTo(game, seat, `takes ${n} hull (${cause})`);
    if (p.hp <= 0)
        wreck(game, seat, cause);
}
function loseCrew(game, seat, n, cause) {
    const p = game.players[seat];
    p.crew -= n;
    logTo(game, seat, `loses ${n} crew (${cause})`);
    if (p.crew <= 0)
        wreck(game, seat, cause);
}
function wreck(game, seat, cause) {
    const p = game.players[seat];
    if (isAdrift(p, game))
        return;
    p.rescues += 1;
    p.adriftUntil = game.turn + 1 + C.RESCUE_ADRIFT_TURNS;
    p.wreckCause = cause;
    p.wreckTurn = game.turn;
    logTo(game, seat, `is WRECKED (${cause}) — rescue crew dispatched, adrift until turn ${p.adriftUntil}`);
}
function restore(game, seat) {
    const p = game.players[seat];
    p.hp = Math.ceil(maxHull(p) / 2);
    p.crew = Math.max(3, p.crew);
    for (const r of BASE_RES)
        p.res[r] = Math.max(3, p.res[r]);
    logTo(game, seat, `is restored by the rescue crew (hull ${p.hp}, crew ${p.crew})`);
}
// ---- deck handling (§4b) ----
function drawCard(game, type, band) {
    const d = game.decks[type][band];
    // An exhausted deck is reshuffled from its full card list (cards already face up on the board
    // can repeat) — the physical equivalent of a busy band running through a 10-card deck twice.
    if (d.draw.length === 0) {
        d.draw = shuffle(game.rng, GD.SITE_DECKS[type][band]);
        d.discard = [];
    }
    return d.draw.pop();
}
function flipSite(game, s) {
    if (s.card)
        return s.card;
    const card = s.previewCard || drawCard(game, s.type, s.band);
    s.previewCard = undefined;
    s.card = card;
    s.stock = card.yield ? (card.stock || 1) : 0;
    return card;
}
function peekSite(game, seat, col, lane) {
    const p = game.players[seat];
    const s = site(game, col, lane);
    if (!s || s.card || s.isStation || s.isRim)
        return undefined;
    if (!(level(p, "sensors") >= 2 || p.hull.power === "cartographer"))
        return undefined;
    if (p.peekedThisTurn)
        return undefined;
    if (col - p.col > sensorRange(p) || col <= p.col)
        return undefined;
    if (!s.previewCard)
        s.previewCard = drawCard(game, s.type, s.band);
    p.peekedThisTurn = true;
    s.peekedBy.push(seat);
    return s.previewCard;
}
function deckOdds(type, band) {
    const cards = GD.SITE_DECKS[type][band];
    const n = cards.length || 1;
    const yieldRes = {};
    let hostile = 0, hazardSum = 0, tech = 0, artifact = 0, discovery = 0;
    for (const c of cards) {
        if (c.yield)
            for (const r of Object.keys(c.yield))
                yieldRes[r] = (yieldRes[r] || 0) + (c.yield[r] || 0) / n;
        if (c.alien && ALIEN_BY_ID[c.alien.species].attitude === "hostile")
            hostile++;
        if (c.hazard)
            hazardSum += c.hazard;
        if (c.tech)
            tech++;
        if (c.artifact)
            artifact++;
        if (c.discovery)
            discovery++;
    }
    return { hostile: hostile / n, yieldRes, hazardMean: hazardSum / n, tech: tech / n, artifact: artifact / n, discovery: discovery / n };
}
// ---- map generation (§4e) ----
function makeSite(col, lane, type) {
    return { col, lane, type, band: bandOf(col), stock: 0, visitedBy: [], mines: [], techClaimed: false, artifactClaimed: false, alienCleared: false,
        isStation: type === "station", isRim: col === C.COLUMNS, peekedBy: [], arrivals: [] };
}
function generateMapOnce(rng) {
    // Constructive per-column generation (§4e): seed each free column with the sites the cadence
    // rules require, fill the rest by weight, then repair calm cover / density / hazard rules by
    // swapping offenders for calm types. validateMap() is still the final word.
    const sites = [];
    const CALM_FILL = ["ice", "garden", "gas", "rock"];
    const prevTypes = (col) => (sites[col] ? sites[col].map((x) => x.type) : []);
    for (let col = 1; col <= C.COLUMNS; col++) {
        const band = bandOf(col);
        const types = new Array(C.LANES).fill("void");
        if (col === C.COLUMNS) {
            sites[col] = types.map((t, lane) => makeSite(col, lane, t));
            continue;
        }
        if (C.STATION_COLUMNS.indexOf(col) >= 0) {
            sites[col] = types.map((_, lane) => makeSite(col, lane, C.STATION_LANES.indexOf(lane) >= 0 ? "station" : "void"));
            continue;
        }
        const lanes = shuffle(rng, [0, 1, 2, 3, 4, 5, 6]);
        let li = 0;
        const required = ["gas"];
        const p1 = prevTypes(col - 1), p2 = prevTypes(col - 2);
        const win = p1.concat(p2);
        const lifeMissing = [];
        if (win.indexOf("ice") < 0)
            lifeMissing.push("ice");
        if (win.indexOf("garden") < 0)
            lifeMissing.push("garden");
        if (lifeMissing.length === 0)
            lifeMissing.push(rng() < 0.5 ? "ice" : "garden");
        required.push(...lifeMissing);
        if (!win.some((t) => t === "rock" || t === "asteroid"))
            required.push("rock");
        for (const t of required)
            types[lanes[li++]] = t;
        for (; li < C.LANES; li++)
            if (types[lanes[li]] === "void")
                types[lanes[li]] = weightedPick(rng, GD.SITE_WEIGHTS[band]);
        // reach rule: over columns (c-1, c) every lane group {0-2},{2-4},{4-6} holds a life-support site and a gas site
        const GROUPS = [[0, 1, 2], [2, 3, 4], [4, 5, 6]];
        const prevHas = (grp, ok) => grp.some((l) => p1[l] !== undefined && ok(p1[l]));
        const curHas = (grp, ok) => grp.some((l) => ok(types[l]));
        for (const grp of GROUPS) {
            if (!prevHas(grp, (t) => t === "ice" || t === "garden") && !curHas(grp, (t) => t === "ice" || t === "garden")) {
                const free = grp.filter((l) => required.indexOf(types[l]) < 0 || types[l] === "void");
                const lane = free.length ? pick(rng, free) : pick(rng, grp);
                types[lane] = rng() < 0.5 ? "ice" : "garden";
            }
            if (!prevHas(grp, (t) => t === "gas") && !curHas(grp, (t) => t === "gas")) {
                const free = grp.filter((l) => types[l] !== "ice" && types[l] !== "garden" && types[l] !== "gas");
                const lane = free.length ? pick(rng, free) : pick(rng, grp);
                types[lane] = "gas";
            }
        }
        // repair: density (≤3 of a type, void exempt), hazard ceiling, hazard adjacency, calm cover
        for (let pass = 0; pass < 8; pass++) {
            let changed = false;
            const count = (t) => types.filter((x) => x === t).length;
            for (const t of DECK_TYPES)
                while (t !== "void" && count(t) > 3) {
                    types[types.lastIndexOf(t)] = pick(rng, CALM_FILL);
                    changed = true;
                }
            while (count("hazard") > (band === "easy" ? 1 : 2)) {
                types[types.lastIndexOf("hazard")] = pick(rng, CALM_FILL);
                changed = true;
            }
            for (let l = 0; l < C.LANES - 1; l++)
                if (types[l] === "hazard" && types[l + 1] === "hazard") {
                    types[l + 1] = pick(rng, CALM_FILL);
                    changed = true;
                }
            for (let L = 0; L < C.LANES; L++) {
                const ok = [L - 1, L, L + 1].some((l) => l >= 0 && l < C.LANES && SITE_TYPE_BY_ID[types[l]].calm);
                if (!ok) {
                    types[L] = pick(rng, CALM_FILL);
                    changed = true;
                }
            }
            if (!changed)
                break;
        }
        sites[col] = types.map((t, lane) => makeSite(col, lane, t));
    }
    return sites;
}
function validateMap(sites) {
    const problems = [];
    const colTypes = (col) => sites[col].map((s) => s.type);
    for (let col = 1; col < C.COLUMNS; col++) {
        const types = colTypes(col);
        const band = bandOf(col);
        const fixed = C.STATION_COLUMNS.indexOf(col) >= 0; // station columns are exempt from the cadence rules
        // 1. calm cover
        for (let L = 0; L < C.LANES; L++) {
            const ok = [L - 1, L, L + 1].some((l) => l >= 0 && l < C.LANES && SITE_TYPE_BY_ID[types[l]].calm);
            if (!ok)
                problems.push(`col ${col}: lane ${L} has no calm site within reach`);
        }
        // 2. fuel cadence
        if (!fixed && !types.some((t) => t === "gas" || t === "hazard"))
            problems.push(`col ${col}: no fuel source`);
        // 3. life support
        if (!fixed && !types.some((t) => t === "ice" || t === "garden"))
            problems.push(`col ${col}: no life-support site`);
        if (col >= 3) {
            const win = [col - 2, col - 1, col].map(colTypes).reduce((a, b) => a.concat(b), []);
            if (!win.some((t) => t === "ice"))
                problems.push(`col ${col}: no ice in last 3 columns`);
            if (!win.some((t) => t === "garden"))
                problems.push(`col ${col}: no garden in last 3 columns`);
            // 3b. reach: over (col-1, col) each lane group has a life-support site and a gas site
            if (col >= 2 && !fixed && C.STATION_COLUMNS.indexOf(col - 1) < 0) {
                const prev = colTypes(col - 1);
                for (const grp of [[0, 1, 2], [2, 3, 4], [4, 5, 6]]) {
                    if (!grp.some((l) => prev[l] === "ice" || prev[l] === "garden" || types[l] === "ice" || types[l] === "garden"))
                        problems.push(`col ${col}: lanes ${grp} lack life support over 2 columns`);
                    if (!grp.some((l) => prev[l] === "gas" || types[l] === "gas"))
                        problems.push(`col ${col}: lanes ${grp} lack gas over 2 columns`);
                }
            }
            // 4. steel cadence
            if (!win.some((t) => t === "rock" || t === "asteroid"))
                problems.push(`col ${col}: no steel in last 3 columns`);
        }
        // 5. density
        for (const t of DECK_TYPES) {
            const n = types.filter((x) => x === t).length;
            if (n > 3 && t !== "void")
                problems.push(`col ${col}: ${n} × ${t}`);
        }
        // 6. hazard ceiling
        const nh = types.filter((t) => t === "hazard").length;
        if (nh > (band === "easy" ? 1 : 2))
            problems.push(`col ${col}: ${nh} hazards`);
        for (let l = 0; l < C.LANES - 1; l++)
            if (types[l] === "hazard" && types[l + 1] === "hazard")
                problems.push(`col ${col}: adjacent hazards`);
    }
    return problems;
}
function generateMap(seed) {
    for (let attempt = 0; attempt < 50; attempt++) {
        const s = seed + attempt;
        const sites = generateMapOnce(mulberry32(s ^ 0x9e3779b9));
        if (validateMap(sites).length === 0)
            return { sites, seedUsed: s };
    }
    throw new Error(`generateMap: no valid map within 50 attempts from seed ${seed} — SITE_WEIGHTS make the constraints unsatisfiable`);
}
function createGame(opts) {
    const numPlayers = Math.max(3, Math.min(7, opts.numPlayers));
    const seed = (opts.seed === undefined ? Math.floor(Math.random() * 0x7fffffff) : opts.seed) >>> 0;
    const rng = mulberry32(seed);
    const decks = {};
    for (const t of DECK_TYPES) {
        decks[t] = {};
        for (const b of BANDS) {
            const cards = GD.SITE_DECKS[t] && GD.SITE_DECKS[t][b];
            if (!cards || cards.length !== 10)
                throw new Error(`SITE_DECKS.${t}.${b} must hold 10 cards (run npm run content)`);
            decks[t][b] = { draw: shuffle(rng, cards), discard: [] };
        }
    }
    const { sites } = generateMap(seed);
    let hullIds = shuffle(rng, GD.HULLS.map((h) => h.id));
    if (opts.hullId)
        hullIds = [opts.hullId].concat(hullIds.filter((h) => h !== opts.hullId));
    const laneOrder = [3, 1, 5, 0, 6, 2, 4];
    const game = { seed, rng, numPlayers, turn: 0, phase: "plot", sites, decks, players: [], plotted: [], log: [], pendingOffers: [] };
    for (let seat = 0; seat < numPlayers; seat++) {
        const hull = HULL_BY_ID[hullIds[seat]];
        const controller = opts.controllers ? opts.controllers[seat] : seat === 0 ? "human" : "ai";
        const prof = opts.profiles ? opts.profiles[seat] : undefined;
        const profile = controller === "ai" ? (typeof prof === "string" ? GD.AI_PROFILES[prof] : prof || GD.AI_PROFILES.cautious) : undefined;
        const res = {};
        for (const r of GD.RESOURCES)
            res[r.id] = r.start + (hull.startResources[r.id] || 0);
        const p = {
            seat, name: NAMES[seat], controller, hull, profile, col: 0, lane: laneOrder[seat], furthestCol: 0,
            hp: 0, crew: C.BASE_CREW + hull.crewBonus, res,
            // Earth's archives: every ship leaves owning all seven L1 blueprints (§6b); installing still costs steel.
            owned: GD.TECH_CARDS.filter((t) => t.level === 1).map((t) => t.id), installed: [hull.startTech], artifacts: [],
            tokens: { physics: 0, biology: 0, engineering: 0 }, bounties: [], contacted: [], pacts: [], completedPacts: 0,
            rescues: 0, adriftUntil: 0, raidsMade: 0, betrayals: 0, traitor: false, karrakMarked: false,
            starveSkip: false, thirstSkip: false, installedThisTurn: false, diplomacyThisTurn: false, minedThisTurn: false,
            visitedThisTurn: false, peekedThisTurn: false, arrive: null, holdStreak: 0, log: [],
        };
        p.hp = maxHull(p);
        game.players.push(p);
    }
    startTurn(game);
    return game;
}
// ---- turn flow (§2a) ----
function startTurn(game) {
    game.turn += 1;
    game.phase = "plot";
    game.plotted = game.players.map(() => null);
    game.pendingOffers = [];
    for (const p of game.players) {
        p.installedThisTurn = false;
        p.diplomacyThisTurn = false;
        p.minedThisTurn = false;
        p.visitedThisTurn = false;
        p.peekedThisTurn = false;
        p.arrive = null;
        if (p.adriftUntil === game.turn) {
            p.adriftUntil = 0;
            restore(game, p.seat);
        }
    }
    for (const s of game.sites.slice(1))
        for (const x of s)
            x.arrivals = [];
    // AI seats plot first so Oracle Lens (Sensors 3) can show their intent to a human.
    for (const p of game.players)
        if (p.controller === "ai")
            plotCourse(game, p.seat, isAdrift(p, game) ? { kind: "hold", lane: p.lane } : aiPlot(game, p.seat));
}
function moveOptions(game, seat) {
    const p = game.players[seat];
    const opts = [];
    const add = (kind, lane, fuel, hull, reason) => {
        const legal = !reason && p.res.fuel >= fuel && lane >= 0 && lane < C.LANES;
        opts.push({ kind, lane, fuel, hull, legal, reason: reason || (p.res.fuel < fuel ? "not enough fuel" : undefined) });
    };
    add("hold", p.lane, 0, 0);
    if (isAdrift(p, game) || p.col >= C.COLUMNS)
        return opts;
    const eng = level(p, "engines");
    if (p.res.fuel < 1)
        add("coast", p.lane, 0, eng >= 3 ? 0 : C.COAST_HULL);
    for (let shift = -2; shift <= 2; shift++) {
        const lane = p.lane + shift;
        if (lane < 0 || lane >= C.LANES)
            continue;
        const a = Math.abs(shift);
        if (a === 2 && eng < 1 && p.hull.power !== "cartographer")
            continue;
        add("advance", lane, 1 + a, 0);
    }
    if (p.col + 2 <= C.COLUMNS) {
        const fuel = eng >= 2 || p.hull.power === "slingshot" ? 2 : C.OVERDRIVE_FUEL;
        const hull = eng >= 3 ? 0 : eng >= 2 || p.hull.power === "slingshot" ? 1 : C.OVERDRIVE_HULL;
        add("overdrive", p.lane, fuel, hull);
    }
    if (eng >= 3)
        for (let lane = 0; lane < C.LANES; lane++)
            if (Math.abs(lane - p.lane) > 2)
                add("warp", lane, C.WARP_FUEL, 0);
    return opts;
}
function findOption(game, seat, move) {
    return moveOptions(game, seat).find((o) => o.kind === move.kind && o.lane === move.lane);
}
function plotCourse(game, seat, move) {
    if (game.phase !== "plot")
        return { success: false, reason: "not the plot phase" };
    const o = findOption(game, seat, move);
    if (!o)
        return { success: false, reason: "no such move" };
    if (!o.legal)
        return { success: false, reason: o.reason || "illegal move" };
    game.plotted[seat] = { kind: move.kind, lane: move.lane };
    return { success: true };
}
function allPlotted(game) { return game.plotted.every((m) => m !== null); }
function resolveMoves(game) {
    if (game.phase !== "plot")
        return { success: false, reason: "not the plot phase" };
    if (!allPlotted(game))
        return { success: false, reason: "not every seat has plotted" };
    for (const p of game.players) {
        const m = game.plotted[p.seat];
        const o = findOption(game, p.seat, m);
        if (m.kind === "hold") {
            p.holdStreak += 1;
            p.arrive = { hazardDone: true, encounterDone: true, actionDone: false, held: true };
            continue;
        }
        p.holdStreak = 0;
        p.res.fuel -= o.fuel;
        const dcol = m.kind === "overdrive" ? 2 : 1;
        p.col = Math.min(C.COLUMNS, p.col + dcol);
        p.lane = m.lane;
        p.furthestCol = Math.max(p.furthestCol, p.col);
        p.visitedThisTurn = true;
        p.arrive = { hazardDone: false, encounterDone: false, actionDone: false, held: false };
        logTo(game, p.seat, `${m.kind}s to sector ${p.col} lane ${p.lane}${o.fuel ? ` (−${o.fuel} fuel)` : ""}`);
        if (o.hull)
            damage(game, p.seat, o.hull, m.kind);
        const s = site(game, p.col, p.lane);
        s.arrivals.push(p.seat);
        if (s.visitedBy.indexOf(p.seat) < 0)
            s.visitedBy.push(p.seat);
    }
    game.phase = "arrive";
    // mines (§5c), then flips + hazards (§4c)
    for (const p of game.players) {
        if (!p.arrive || p.arrive.held || isAdrift(p, game))
            continue;
        const s = site(game, p.col, p.lane);
        for (let i = s.mines.length - 1; i >= 0; i--) {
            const m = s.mines[i];
            const owner = game.players[m.owner];
            if (m.owner === p.seat || inPact(p, owner))
                continue;
            s.mines.splice(i, 1);
            let dmg = has(p, "point-defence") ? 0 : Math.max(1, C.MINE_DAMAGE - defense(p) - (p.hull.power === "bulwark" ? 1 : 0));
            logTo(game, p.seat, `hits a mine laid by ${owner.name}`);
            p.lastMinedBy = m.owner;
            damage(game, p.seat, dmg, "mine");
        }
    }
    for (const p of game.players) {
        if (!p.arrive || p.arrive.held || isAdrift(p, game))
            continue;
        const s = site(game, p.col, p.lane);
        if (s.isStation || s.isRim) {
            p.arrive.hazardDone = true;
            p.arrive.encounterDone = true;
            if (s.isRim)
                logTo(game, p.seat, "reaches the Outer Rim! 🌌");
            continue;
        }
        const card = flipSite(game, s);
        p.arrive.hazardDone = true;
        if (card.hazard) {
            const dmg = Math.max(0, card.hazard - defense(p));
            if (dmg > 0)
                damage(game, p.seat, dmg, `${card.title} hazard ${card.hazard} vs defense ${defense(p)}`);
            else
                logTo(game, p.seat, `shrugs off ${card.title}'s hazard ${card.hazard}`);
        }
        if (!card.alien || s.alienCleared)
            p.arrive.encounterDone = true;
    }
    // salvage priority per contested cell (§4a)
    for (const row of game.sites.slice(1))
        for (const s of row) {
            if (s.arrivals.length < 2) {
                s.salvagePriority = s.arrivals[0];
                continue;
            }
            let best = s.arrivals[0];
            for (const seat of s.arrivals) {
                const a = game.players[seat], b = game.players[best];
                const ka = has(a, "salvage-rig") ? 99 : level(a, "sensors"), kb = has(b, "salvage-rig") ? 99 : level(b, "sensors");
                if (ka > kb || (ka === kb && seat < best))
                    best = seat;
            }
            s.salvagePriority = best;
        }
    // AI seats resolve their arrivals now; humans do it through arriveOptions/arriveChoose.
    for (const p of game.players)
        if (p.controller === "ai")
            aiArriveAll(game, p.seat);
    return { success: true };
}
// ---- arrive (§4a, §4d, §4f) ----
function arriveOptions(game, seat) {
    const p = game.players[seat];
    const st = p.arrive;
    const out = [];
    if (game.phase !== "arrive" || !st || isAdrift(p, game))
        return out;
    const s = site(game, p.col, p.lane);
    const card = s.card;
    if (!st.encounterDone && card && card.alien) {
        const sp = ALIEN_BY_ID[card.alien.species];
        const str = card.alien.strength;
        for (const o of sp.options) {
            let detail = "";
            if (o.kind === "fight") {
                const a = attack(p);
                detail = a >= str ? `attack ${a} vs ${str}: win` : `attack ${a} vs ${str}: lose ${str - a} hull`;
            }
            else if (o.kind === "flee")
                detail = p.res.fuel >= C.FLEE_FUEL ? `−${C.FLEE_FUEL} fuel` : `−2 hull (no fuel)`;
            else if (o.kind === "barter")
                detail = `give ${vrellPrice(p)} water → +4 rations / +3 steel / +1 crystal`;
            else if (o.kind === "tribute")
                detail = sp.id === "choir" ? "−2 crew" : `−${tributeCost(p)} ${mostHeld(p)}`;
            else if (o.kind === "commune")
                detail = `give ${communeCost(p)} data → random ${s.band} tech`;
            else if (o.kind === "interface")
                detail = labLevelFor(p) >= 2 ? "+5 data, +1 ⚙️" : "requires Lab 2";
            else if (o.kind === "petition")
                detail = petitionOk(p) ? "artifact +3 crystal +1 🧬" : "they see your record: nothing";
            out.push({ id: o.id, label: o.label, emoji: o.emoji, detail, kind: "encounter" });
        }
        return out;
    }
    if (st.actionDone)
        return out;
    if (s.isRim) {
        out.push({ id: "bypass", label: "Rest at the Rim", emoji: "🌌", detail: "", kind: "site" });
        return out;
    }
    if (s.isStation) {
        out.push({ id: "dock", label: "Dock at station", emoji: "🏪", detail: "exchange, refit, broker, recruit", kind: "site" });
    }
    if (card) {
        if (card.yield && s.stock > 0) {
            const y = harvestYield(game, p, s);
            out.push({ id: "harvest", label: "Harvest", emoji: "⛏️", detail: Object.keys(y).map((r) => `+${y[r]} ${resEmoji(r)}`).join(" ") + (s.arrivals.length > 1 ? " (shared)" : ""), kind: "site" });
        }
        if (card.discovery && (s.stock > 0 || !card.yield) && !st.researched) {
            const d = researchYield(p, card);
            out.push({ id: "research", label: "Research", emoji: "🔬", detail: `+${d.data} 📡 +${d.tokens.length} token${d.tokens.length === 1 ? "" : "s"}`, kind: "site" });
        }
        if ((card.tech && !s.techClaimed) || (card.artifact && !s.artifactClaimed)) {
            const prio = s.salvagePriority === undefined || s.salvagePriority === seat;
            out.push({ id: "salvage", label: "Salvage", emoji: "🧲", detail: prio ? (card.tech && !s.techClaimed ? "claim tech" : "claim artifact") : `${game.players[s.salvagePriority].name} has salvage priority`, kind: "site" });
        }
    }
    out.push({ id: "bypass", label: "Bypass", emoji: "⏭️", detail: "do nothing", kind: "site" });
    return out;
}
function resEmoji(r) { return GD.RESOURCES.find((x) => x.id === r).emoji; }
function vrellPrice(p) { return Math.max(1, (p.res.water >= 4 ? 2 : 3) - (has(p, "xenolinguistics") ? 1 : 0)); }
function communeCost(p) { return has(p, "xenolinguistics") ? 2 : 3; }
function mostHeld(p) { let best = "fuel"; for (const r of BASE_RES)
    if (p.res[r] > p.res[best])
        best = r; return best; }
function tributeCost(p) { return Math.max(1, (p.karrakMarked ? 4 : 3) - (has(p, "xenolinguistics") ? 1 : 0)); }
function petitionOk(p) { return p.crew >= 5 && p.betrayals === 0 && p.raidsMade <= 1; }
function harvestYield(game, p, s) {
    const card = s.card;
    const y = {};
    if (!card.yield)
        return y;
    // Split among ships that harvest: arrivals that already passed on the card don't count (§5a).
    let n = s.arrivals.filter((seat) => { const q = game.players[seat]; return !isAdrift(q, game) && (seat === p.seat || !q.arrive || !q.arrive.actionDone || q.arrive.harvested); }).length;
    if (n < 1)
        n = 1;
    const allies = n > 1 && s.arrivals.every((seat) => seat === p.seat || inPact(p, game.players[seat]));
    const bonusCap = level(p, "shields") >= 3 ? 5 : 3;
    const hazardBonus = s.type === "hazard" && card.hazard ? Math.min(bonusCap, Math.min(defense(p), card.hazard)) : 0;
    for (const r of Object.keys(card.yield)) {
        let v = card.yield[r] || 0;
        if (has(p, "mining-lasers") && (s.type === "rock" || s.type === "asteroid") && r === "steel")
            v += 2;
        if (has(p, "mining-lasers") && s.type === "asteroid" && r === "crystal")
            v += 1;
        if (has(p, "greenhouse-ring") && (s.type === "garden" || s.type === "ice") && (r === "rations" || r === "water"))
            v += 2;
        if (has(p, "salvage-rig") && s.type === "derelict" && r === "steel")
            v += 2;
        v += hazardBonus;
        y[r] = allies ? v : Math.floor(v / n);
    }
    return y;
}
function researchYield(p, card) {
    const d = card.discovery;
    let data = d.data + (level(p, "lab") >= 1 ? 1 : 0) + (p.hull.power === "faculty" ? 1 : 0);
    let tokens = d.tokens.slice();
    if (level(p, "lab") >= 2 && tokens.length)
        tokens = tokens.concat([tokens[0]]);
    if (has(p, "survey-drones") && card.type === "anomaly" && tokens.length)
        tokens = tokens.concat([tokens[0]]);
    return { data, tokens };
}
function randomTechFromBand(game, p, band) {
    const pool = GD.TECH_CARDS.filter((t) => t.band === band && p.owned.indexOf(t.id) < 0);
    return pool.length ? pick(game.rng, pool) : undefined;
}
function grantTech(game, seat, t, source) {
    const p = game.players[seat];
    if (!t) {
        give(p, "crystal", 2);
        logTo(game, seat, `finds nothing new (${source}) — +2 crystal instead`);
        return;
    }
    p.owned.push(t.id);
    logTo(game, seat, `acquires the ${t.name} blueprint (${source})`);
}
function grantArtifact(game, seat, id, source) {
    const p = game.players[seat];
    let a = id === "random" || !id ? undefined : id;
    if (!a) {
        const pool = GD.ARTIFACTS.filter((x) => !hasArtifact(p, x.id));
        a = pool.length ? pick(game.rng, pool).id : undefined;
    }
    if (!a || hasArtifact(p, a)) {
        give(p, "crystal", 4);
        logTo(game, seat, `finds a duplicate artifact (${source}) — +4 crystal instead`);
        return;
    }
    p.artifacts.push(a);
    logTo(game, seat, `installs the ${GD.ARTIFACTS.find((x) => x.id === a).name} (${source})`);
}
function addBounty(game, seat) { const p = game.players[seat]; p.bounties.push(C.BOUNTY_VP[bandOf(p.col)]); }
function contact(p, id) { if (p.contacted.indexOf(id) < 0)
    p.contacted.push(id); }
function arriveChoose(game, seat, optionId) {
    const p = game.players[seat];
    const st = p.arrive;
    if (game.phase !== "arrive" || !st)
        return { success: false, reason: "not arriving" };
    const opts = arriveOptions(game, seat);
    const o = opts.find((x) => x.id === optionId);
    if (!o)
        return { success: false, reason: `option ${optionId} not available` };
    const s = site(game, p.col, p.lane);
    const card = s.card;
    if (o.kind === "encounter") {
        const al = card.alien;
        const sp = ALIEN_BY_ID[al.species];
        const str = al.strength;
        st.encounterDone = true;
        switch (o.id) {
            case "flee":
                contact(p, sp.id);
                st.actionDone = true;
                if (p.res.fuel >= C.FLEE_FUEL) {
                    p.res.fuel -= C.FLEE_FUEL;
                    logTo(game, seat, `flees the ${sp.name} (−${C.FLEE_FUEL} fuel)`);
                }
                else {
                    logTo(game, seat, `flees the ${sp.name} on fumes`);
                    damage(game, seat, 2, "emergency burn");
                }
                return { success: true };
            case "fight": {
                const a = attack(p);
                if (a >= str) {
                    s.alienCleared = true;
                    addBounty(game, seat);
                    logTo(game, seat, `defeats the ${sp.name} (attack ${a} vs ${str})`);
                    if (level(p, "weapons") >= 3)
                        give(p, "crystal", 2);
                    if (sp.id === "vrell")
                        give(p, "crystal", 3);
                    else if (sp.id === "karrak") {
                        give(p, "steel", 4);
                        give(p, "crystal", 1);
                    }
                    else if (sp.id === "solenne")
                        give(p, "data", 4);
                    else if (sp.id === "lattice")
                        grantTech(game, seat, randomTechFromBand(game, p, s.band), "Lattice salvage");
                    else if (sp.id === "choir") {
                        give(p, "crystal", 4);
                        grantArtifact(game, seat, "random", "Choir hoard");
                    }
                }
                else {
                    logTo(game, seat, `loses to the ${sp.name} (attack ${a} vs ${str})`);
                    damage(game, seat, Math.max(1, str - a), `${sp.name}`);
                }
                return { success: true };
            }
            case "barter": {
                const cost = vrellPrice(p);
                if (p.res.water < cost)
                    return { success: false, reason: "not enough water" };
                p.res.water -= cost;
                contact(p, sp.id);
                // choice of goods: prefer what the ship is shortest of
                const want = p.res.rations <= 4 ? "rations" : p.res.steel <= 4 ? "steel" : "crystal";
                give(p, want, want === "rations" ? 4 : want === "steel" ? 3 : 1);
                logTo(game, seat, `barters ${cost} water with the Vrell for ${want}`);
                return { success: true };
            }
            case "tribute":
                contact(p, sp.id);
                if (sp.id === "choir")
                    loseCrew(game, seat, 2, "Choir tribute");
                else {
                    const r = mostHeld(p);
                    const cost = Math.min(p.res[r], tributeCost(p));
                    p.res[r] -= cost;
                    p.karrakMarked = true;
                    logTo(game, seat, `pays ${cost} ${r} tribute to the Karrak`);
                }
                return { success: true };
            case "commune": {
                const cost = communeCost(p);
                if (p.res.data < cost)
                    return { success: false, reason: "not enough data" };
                p.res.data -= cost;
                contact(p, sp.id);
                grantTech(game, seat, randomTechFromBand(game, p, s.band), "Solenne commune");
                return { success: true };
            }
            case "interface":
                if (labLevelFor(p) < 2)
                    return { success: false, reason: "requires Lab 2" };
                contact(p, sp.id);
                give(p, "data", 5);
                p.tokens.engineering += 1;
                logTo(game, seat, "interfaces with the Lattice: +5 data, +1 ⚙️");
                return { success: true };
            case "petition":
                contact(p, sp.id);
                if (petitionOk(p)) {
                    grantArtifact(game, seat, "random", "Oomari gift");
                    give(p, "crystal", 3);
                    p.tokens.biology += 1;
                }
                else
                    logTo(game, seat, "petitions the Oomari, who look through the ship and say nothing");
                return { success: true };
        }
        return { success: false, reason: "unknown encounter option" };
    }
    // site actions
    switch (o.id) {
        case "harvest": {
            const y = harvestYield(game, p, s);
            s.stock -= 1;
            const parts = [];
            for (const r of Object.keys(y)) {
                const got = give(p, r, y[r] || 0);
                parts.push(`+${got} ${r}`);
            }
            logTo(game, seat, `harvests ${card.title}: ${parts.join(", ")}`);
            st.harvested = true;
            if (has(p, "void-anchor") && st.held && s.stock > 0) {
                s.stock -= 1;
                for (const r of Object.keys(y))
                    give(p, r, y[r] || 0);
                logTo(game, seat, "harvests again (Void Anchor)");
            }
            st.actionDone = true;
            return { success: true };
        }
        case "research": {
            const d = researchYield(p, card);
            give(p, "data", d.data);
            for (const k of d.tokens)
                p.tokens[k] += 1;
            if (card.yield)
                s.stock -= 1;
            st.researched = true;
            st.actionDone = true;
            logTo(game, seat, `researches ${card.title}: +${d.data} data, tokens ${d.tokens.join("+")}`);
            return { success: true };
        }
        case "salvage": {
            if (s.salvagePriority !== undefined && s.salvagePriority !== seat)
                return { success: false, reason: "another ship has salvage priority" };
            if (card.tech && !s.techClaimed) {
                s.techClaimed = true;
                grantTech(game, seat, card.tech === "randomFromBand" ? randomTechFromBand(game, p, s.band) : TECH_BY_ID[card.tech], card.title);
            }
            else if (card.artifact && !s.artifactClaimed) {
                s.artifactClaimed = true;
                grantArtifact(game, seat, card.artifact, card.title);
            }
            st.actionDone = true;
            return { success: true };
        }
        case "dock":
            st.actionDone = true;
            return { success: true }; // station services are separate calls
        case "bypass":
            st.actionDone = true;
            return { success: true };
    }
    return { success: false, reason: "unknown option" };
}
function arriveComplete(game, seat) {
    const p = game.players[seat];
    return !p.arrive || isAdrift(p, game) || (p.arrive.encounterDone && p.arrive.actionDone);
}
function finishArrive(game) {
    if (game.phase !== "arrive")
        return { success: false, reason: "not the arrive phase" };
    const waiting = game.players.filter((p) => !arriveComplete(game, p.seat));
    if (waiting.length)
        return { success: false, reason: `${waiting.map((p) => p.name).join(", ")} still arriving` };
    game.phase = "dock";
    for (const p of game.players)
        if (p.controller === "ai" && !isAdrift(p, game))
            aiDock(game, p.seat);
    return { success: true };
}
// ---- station services (§4f) — available while on a station in arrive or dock ----
function onStation(game, seat) {
    const p = game.players[seat];
    const s = site(game, p.col, p.lane);
    return !!s && s.isStation && (game.phase === "arrive" || game.phase === "dock") && !isAdrift(p, game);
}
function stationExchange(game, seat, giveRes, getRes, getAmount) {
    if (!onStation(game, seat))
        return { success: false, reason: "not at a station" };
    const p = game.players[seat];
    if (getAmount < 1)
        return { success: false, reason: "amount" };
    let giveAmount;
    const baseGive = BASE_RES.indexOf(giveRes) >= 0, baseGet = BASE_RES.indexOf(getRes) >= 0;
    if (baseGive && baseGet)
        giveAmount = p.hull.power === "bulkTrader" ? Math.ceil(getAmount * 3 / 2) : getAmount * 2;
    else if (baseGive && getRes === "crystal")
        giveAmount = getAmount * 3;
    else if (giveRes === "crystal" && baseGet)
        giveAmount = Math.ceil(getAmount / 3);
    else
        return { success: false, reason: "no such exchange" };
    if (p.res[giveRes] < giveAmount)
        return { success: false, reason: `need ${giveAmount} ${giveRes}` };
    p.res[giveRes] -= giveAmount;
    give(p, getRes, getAmount);
    logTo(game, seat, `exchanges ${giveAmount} ${giveRes} for ${getAmount} ${getRes}`);
    return { success: true };
}
function repair(game, seat, points) {
    const p = game.players[seat];
    if (game.phase !== "dock" && !onStation(game, seat))
        return { success: false, reason: "repair only in dock" };
    const room = maxHull(p) - p.hp;
    if (onStation(game, seat)) { // §4f Refit: a station rebuilds the hull for free
        if (room <= 0)
            return { success: false, reason: "hull is full" };
        p.hp = maxHull(p);
        logTo(game, seat, `is refitted to full hull (${p.hp}) at the station`);
        return { success: true };
    }
    const cost = repairCost(p, game);
    const per = repairPerSteel(p);
    const steelUnits = Math.min(Math.ceil(points / per), Math.ceil(room / per), Math.floor(p.res.steel / cost));
    if (steelUnits <= 0)
        return { success: false, reason: room <= 0 ? "hull is full" : "not enough steel" };
    const n = Math.min(room, steelUnits * per);
    p.res.steel -= steelUnits * cost;
    p.hp += n;
    logTo(game, seat, `repairs ${n} hull for ${steelUnits * cost} steel`);
    return { success: true };
}
function brokerBuy(game, seat, techId, pay) {
    if (!onStation(game, seat))
        return { success: false, reason: "not at a station" };
    const p = game.players[seat];
    const t = TECH_BY_ID[techId];
    if (!t)
        return { success: false, reason: "no such tech" };
    if (p.owned.indexOf(techId) >= 0)
        return { success: false, reason: "already owned" };
    // §4f: a broker stocks its own band and the band ahead (station 7 sells L1+L2, station 14 sells everything)
    const bandRank = { easy: 0, medium: 1, hard: 2 };
    if (bandRank[t.band] > bandRank[bandOf(p.col)] + 1)
        return { success: false, reason: `${t.band}-band tech not sold here yet` };
    let cost = t.brokerCost[pay];
    if (pay === "data" && t.level === 2 && level(p, "lab") >= 2)
        cost = Math.max(1, cost - 2);
    if (p.res[pay] < cost)
        return { success: false, reason: `need ${cost} ${pay}` };
    p.res[pay] -= cost;
    p.owned.push(techId);
    logTo(game, seat, `buys the ${t.name} blueprint for ${cost} ${pay}`);
    return { success: true };
}
function recruit(game, seat) {
    if (!onStation(game, seat))
        return { success: false, reason: "not at a station" };
    const p = game.players[seat];
    const cost = p.hull.power === "colony" ? 2 : C.RECRUIT_RATIONS;
    if (p.crew >= maxCrew(p))
        return { success: false, reason: "crew is full" };
    if (p.res.rations < cost)
        return { success: false, reason: `need ${cost} rations` };
    p.res.rations -= cost;
    p.crew += 1;
    logTo(game, seat, `recruits a crew member for ${cost} rations`);
    return { success: true };
}
// ---- dock (§2a phase 5, §5b, §5c, §6b) ----
function canInstall(game, seat, techId) {
    const p = game.players[seat];
    const t = TECH_BY_ID[techId];
    if (!t)
        return { ok: false, reason: "no such tech" };
    if (p.owned.indexOf(techId) < 0)
        return { ok: false, reason: "not owned" };
    if (has(p, techId))
        return { ok: false, reason: "already installed" };
    if (p.installedThisTurn)
        return { ok: false, reason: "one install per turn" };
    for (const r of t.requires)
        if (!has(p, r))
            return { ok: false, reason: `requires ${TECH_BY_ID[r].name}` };
    const free = level(p, "lab") >= 3 && p.freeInstallUsedBand !== bandOf(p.col);
    if (!free)
        for (const r of Object.keys(t.installCost))
            if (p.res[r] < (t.installCost[r] || 0))
                return { ok: false, reason: `need ${t.installCost[r]} ${r}` };
    return { ok: true, free };
}
function install(game, seat, techId, useFree = false) {
    if (game.phase !== "dock")
        return { success: false, reason: "install only in dock" };
    const p = game.players[seat];
    const c = canInstall(game, seat, techId);
    if (!c.ok)
        return { success: false, reason: c.reason };
    const t = TECH_BY_ID[techId];
    const free = useFree && c.free;
    if (free)
        p.freeInstallUsedBand = bandOf(p.col);
    else
        for (const r of Object.keys(t.installCost))
            p.res[r] -= t.installCost[r] || 0;
    p.installed.push(techId);
    p.installedThisTurn = true;
    const before = maxHull(p);
    p.hp = Math.min(p.hp + Math.max(0, maxHull(p) - before), maxHull(p));
    logTo(game, seat, `installs ${t.name}${free ? " (Singularity Core, free)" : ""} — tier ${tier(p)}`);
    return { success: true };
}
function layMine(game, seat) {
    if (game.phase !== "dock")
        return { success: false, reason: "mine only in dock" };
    const p = game.players[seat];
    const s = site(game, p.col, p.lane);
    if (p.minedThisTurn)
        return { success: false, reason: "one mine per turn" };
    if (p.crew < 3)
        return { success: false, reason: "skeleton crew" };
    if (p.res.steel < C.MINE_STEEL)
        return { success: false, reason: `need ${C.MINE_STEEL} steel` };
    if (s.mines.length)
        return { success: false, reason: "cell already mined" };
    p.res.steel -= C.MINE_STEEL;
    p.minedThisTurn = true;
    s.mines.push({ owner: seat });
    logTo(game, seat, `lays a mine at sector ${p.col} lane ${p.lane}`);
    return { success: true };
}
function tradeRate(a, b, giveRes, getRes) {
    const baseGive = BASE_RES.indexOf(giveRes) >= 0, baseGet = BASE_RES.indexOf(getRes) >= 0;
    if (baseGive && baseGet)
        return a.traitor && !inPact(a, b) ? 3 : (inPact(a, b) || a.hull.power === "bulkTrader") ? 1 : 2;
    if (baseGive && !baseGet)
        return 3;
    if (giveRes === "crystal" && baseGet)
        return 1 / 3;
    return undefined;
}
function aiAcceptsTrade(b, giveRes, giveAmount, getRes, getAmount) {
    // b receives giveRes, gives getRes
    if (b.res[giveRes] + giveAmount > cargoCap(b, giveRes))
        return false;
    const reserve = { fuel: 4, rations: 4, water: 4, steel: 4, crystal: 2, data: 3 };
    return b.res[getRes] - getAmount >= reserve[getRes];
}
function trade(game, seat, target, giveRes, getRes, getAmount) {
    if (game.phase !== "dock")
        return { success: false, reason: "trade only in dock" };
    const a = game.players[seat], b = game.players[target];
    if (a.diplomacyThisTurn)
        return { success: false, reason: "one diplomatic act per turn" };
    if (!inProximity(game, a, b))
        return { success: false, reason: "not in proximity" };
    const rate = tradeRate(a, b, giveRes, getRes);
    if (rate === undefined || getAmount < 1)
        return { success: false, reason: "no such trade" };
    const giveAmount = Math.ceil(getAmount * rate);
    if (a.res[giveRes] < giveAmount)
        return { success: false, reason: `need ${giveAmount} ${giveRes}` };
    if (b.res[getRes] < getAmount)
        return { success: false, reason: `${b.name} lacks ${getRes}` };
    if (b.controller === "ai") {
        if (!aiAcceptsTrade(b, giveRes, giveAmount, getRes, getAmount)) {
            a.diplomacyThisTurn = true;
            logTo(game, seat, `${b.name} declines the trade`);
            return { success: false, reason: "declined" };
        }
    }
    else {
        game.pendingOffers.push({ id: game.pendingOffers.length + 1, kind: "trade", from: seat, to: target, giveRes, giveAmount, getRes, getAmount });
        a.diplomacyThisTurn = true;
        return { success: true, reason: "offered" };
    }
    a.res[giveRes] -= giveAmount;
    b.res[getRes] -= getAmount;
    give(b, giveRes, giveAmount);
    give(a, getRes, getAmount);
    a.diplomacyThisTurn = true;
    logTo(game, seat, `trades ${giveAmount} ${giveRes} to ${b.name} for ${getAmount} ${getRes}`);
    return { success: true };
}
function techCopy(game, seat, target, techId, pay) {
    if (game.phase !== "dock")
        return { success: false, reason: "only in dock" };
    const a = game.players[seat], b = game.players[target];
    if (a.diplomacyThisTurn)
        return { success: false, reason: "one diplomatic act per turn" };
    if (!inProximity(game, a, b))
        return { success: false, reason: "not in proximity" };
    if (!has(b, techId))
        return { success: false, reason: `${b.name} hasn't installed that` };
    if (a.owned.indexOf(techId) >= 0)
        return { success: false, reason: "already owned" };
    const cost = pay === "crystal" ? C.TECH_COPY_CRYSTAL : C.TECH_COPY_DATA;
    if (a.res[pay] < cost)
        return { success: false, reason: `need ${cost} ${pay}` };
    a.res[pay] -= cost;
    give(b, pay, cost);
    a.owned.push(techId);
    a.diplomacyThisTurn = true;
    logTo(game, seat, `buys a copy of ${TECH_BY_ID[techId].name} from ${b.name}`);
    return { success: true };
}
function aiAcceptsPact(game, a, b) {
    if (a.traitor)
        return false;
    if (b.pacts.length >= maxPacts(b))
        return false;
    if (a.hull.power === "colony" && !a.hailUsed)
        return true;
    return Math.abs(scoreOf(game, a).total - scoreOf(game, b).total) <= C.PACT_SCORE_WINDOW;
}
function formPact(game, a, b) {
    a.pacts.push({ with: b.seat, since: game.turn, apartTurns: 0 });
    b.pacts.push({ with: a.seat, since: game.turn, apartTurns: 0 });
    logTo(game, a.seat, `forms a pact with ${b.name} 🤝`);
}
function proposePact(game, seat, target) {
    if (game.phase !== "dock")
        return { success: false, reason: "only in dock" };
    const a = game.players[seat], b = game.players[target];
    if (a.diplomacyThisTurn)
        return { success: false, reason: "one diplomatic act per turn" };
    if (!inProximity(game, a, b))
        return { success: false, reason: "not in proximity" };
    if (inPact(a, b))
        return { success: false, reason: "already in a pact" };
    if (a.pacts.length >= maxPacts(a))
        return { success: false, reason: "no pact slot" };
    a.diplomacyThisTurn = true;
    if (b.controller === "ai") {
        const ok = aiAcceptsPact(game, a, b);
        if (a.hull.power === "colony")
            a.hailUsed = true;
        if (!ok) {
            logTo(game, seat, `${b.name} declines the pact`);
            return { success: false, reason: "declined" };
        }
        formPact(game, a, b);
        return { success: true };
    }
    game.pendingOffers.push({ id: game.pendingOffers.length + 1, kind: "pact", from: seat, to: target });
    return { success: true, reason: "offered" };
}
function respondOffer(game, seat, offerId, accept) {
    const i = game.pendingOffers.findIndex((o) => o.id === offerId && o.to === seat);
    if (i < 0)
        return { success: false, reason: "no such offer" };
    const o = game.pendingOffers.splice(i, 1)[0];
    const a = game.players[o.from], b = game.players[seat];
    if (!accept) {
        logTo(game, seat, `declines ${a.name}'s ${o.kind}`);
        return { success: true };
    }
    if (o.kind === "pact") {
        if (b.pacts.length >= maxPacts(b))
            return { success: false, reason: "no pact slot" };
        formPact(game, a, b);
        return { success: true };
    }
    if (a.res[o.giveRes] < o.giveAmount || b.res[o.getRes] < o.getAmount)
        return { success: false, reason: "resources changed" };
    a.res[o.giveRes] -= o.giveAmount;
    b.res[o.getRes] -= o.getAmount;
    give(b, o.giveRes, o.giveAmount);
    give(a, o.getRes, o.getAmount);
    logTo(game, seat, `accepts ${a.name}'s trade`);
    return { success: true };
}
function endPact(game, a, b, reason) {
    const pa = a.pacts.find((x) => x.with === b.seat);
    if (pa && game.turn - pa.since >= C.PACT_COMPLETE_TURNS) {
        a.completedPacts += 1;
        b.completedPacts += 1;
    }
    a.pacts = a.pacts.filter((x) => x.with !== b.seat);
    b.pacts = b.pacts.filter((x) => x.with !== a.seat);
    logTo(game, a.seat, `pact with ${b.name} ends (${reason})`);
}
function raid(game, seat, target, wantRes) {
    if (game.phase !== "dock")
        return { success: false, reason: "raid only in dock" };
    const a = game.players[seat], b = game.players[target];
    if (a.diplomacyThisTurn)
        return { success: false, reason: "one diplomatic act per turn" };
    if (!inProximity(game, a, b))
        return { success: false, reason: "not in proximity" };
    if (a.crew < 3)
        return { success: false, reason: "skeleton crew" };
    const fuel = a.hull.power === "marque" ? 0 : C.RAID_FUEL;
    if (a.res.fuel < fuel)
        return { success: false, reason: "no fuel" };
    a.res.fuel -= fuel;
    a.diplomacyThisTurn = true;
    a.raidsMade += 1;
    const betrayal = inPact(a, b);
    if (betrayal) {
        endPact(game, a, b, "betrayal");
        a.betrayals += 1;
        a.traitor = true;
    }
    const atk = attack(a), def = defense(b) + (has(b, "point-defence") ? 1 : 0);
    b.lastRaidedBy = seat;
    if (atk > def) {
        let loot = 3 + (a.hull.power === "marque" ? 1 : 0) + (has(a, "boarding-pods") ? 2 : 0) + (scoreOf(game, b).total > scoreOf(game, a).total ? 1 : 0);
        if (betrayal)
            loot *= 2;
        loot = Math.min(loot, b.res[wantRes]);
        b.res[wantRes] -= loot;
        give(a, wantRes, loot);
        addBounty(game, seat);
        logTo(game, seat, `${betrayal ? "BETRAYS and " : ""}raids ${b.name}: takes ${loot} ${wantRes}`);
    }
    else {
        logTo(game, seat, `${betrayal ? "BETRAYS and " : ""}raids ${b.name} and is repelled`);
        damage(game, seat, 2 + (def - atk), "failed raid");
    }
    return { success: true };
}
// ---- upkeep (§2a phase 6, §3c) and turn end ----
function upkeep(game) {
    for (const p of game.players) {
        if (isAdrift(p, game))
            continue;
        if (hasArtifact(p, "heart") && p.hp < maxHull(p))
            p.hp += 1;
        // §3c upkeep: rations on odd turns, water on even turns; Life Support L1/L2 halve each again
        // (only every other such turn); the Oomari Seed removes both.
        const seed = hasArtifact(p, "seed");
        const rationsTurn = game.turn % 2 === 1;
        const half = Math.floor((game.turn + 1) / 2) % 2 === 0;
        const eatsNow = !seed && rationsTurn && !(level(p, "life") >= 1 && half);
        const drinksNow = !seed && !rationsTurn && !(level(p, "life") >= 2 && half);
        if (eatsNow) {
            if (p.res.rations > 0)
                p.res.rations -= 1;
            else if (level(p, "life") >= 3 && !p.starveSkip)
                p.starveSkip = true;
            else {
                p.starveSkip = false;
                loseCrew(game, p.seat, 1, "starvation");
            }
        }
        if (drinksNow) {
            if (p.res.water > 0)
                p.res.water -= 1;
            else if (level(p, "life") >= 3 && !p.thirstSkip)
                p.thirstSkip = true;
            else {
                p.thirstSkip = false;
                loseCrew(game, p.seat, 1, "dehydration");
            }
        }
        for (const r of ALL_RES) {
            const cap = cargoCap(p, r);
            if (p.res[r] > cap) {
                const over = p.res[r] - cap;
                p.res[r] = cap;
                if (level(p, "cargo") >= 3)
                    p.res.crystal = Math.min(C.SPECIAL_CAP, p.res.crystal + Math.floor(over / 4));
            }
        }
        // pacts drift apart
        for (const pact of p.pacts.slice()) {
            const q = game.players[pact.with];
            if (pact.with < p.seat)
                continue; // handle each pair once
            const near = dist(p, q) <= Math.max(proximityRange(p), proximityRange(q));
            const pq = q.pacts.find((x) => x.with === p.seat);
            if (near) {
                pact.apartTurns = 0;
                pq.apartTurns = 0;
            }
            else {
                pact.apartTurns += 1;
                pq.apartTurns += 1;
                if (pact.apartTurns >= C.PACT_BREAK_TURNS)
                    endPact(game, p, q, "drifted apart");
            }
        }
    }
}
function endTurn(game) {
    if (game.phase !== "dock")
        return { success: false, reason: "not the dock phase" };
    game.pendingOffers = [];
    upkeep(game);
    if (game.turn >= C.TURNS) {
        game.phase = "gameEnd";
        game.finalScores = computeScores(game);
        logTo(game, null, "The voyage ends.");
        return { success: true };
    }
    if (C.STATION_COLUMNS.indexOf(game.turn) >= 0) {
        game.phase = "bandSummary";
        game.bandSummaryFor = bandOf(game.turn);
        return { success: true };
    }
    startTurn(game);
    return { success: true };
}
function continueFromSummary(game) {
    if (game.phase !== "bandSummary")
        return { success: false, reason: "not at a band summary" };
    startTurn(game);
    return { success: true };
}
// ---- scoring (§7a) ----
function scoreOf(game, p) {
    const distance = C.DISTANCE_VP * p.furthestCol;
    const rim = p.col >= C.COLUMNS ? C.RIM_VP + (hasArtifact(p, "key") ? 10 : 0) : 0;
    let ship = p.artifacts.length * C.ARTIFACT_VP;
    for (const id of p.installed)
        ship += TECH_BY_ID[id].vp;
    let science = 0;
    let sets = Infinity;
    for (const k of KINDS) {
        science += p.tokens[k] * p.tokens[k];
        sets = Math.min(sets, p.tokens[k]);
    }
    science += (isFinite(sets) ? sets : 0) * C.SET_VP;
    const military = p.bounties.reduce((a, b) => a + b, 0);
    let base = 0;
    for (const r of BASE_RES)
        base += p.res[r];
    const commerce = p.res.crystal + p.completedPacts * (has(p, "diplomatic-bay") ? C.PACT_VP + 2 : C.PACT_VP) + Math.floor(base / 4);
    const contactVp = 2 * p.contacted.length;
    const crew = p.crew;
    const rescues = -C.RESCUE_VP * p.rescues;
    const total = distance + rim + ship + science + military + commerce + contactVp + crew + rescues;
    void game;
    return { seat: p.seat, name: p.name, hullId: p.hull.id, distance, rim, ship, science, military, commerce, contact: contactVp, crew, rescues, total };
}
function computeScores(game) {
    return game.players.map((p) => scoreOf(game, p)).sort((a, b) => b.total - a.total || b.rim - a.rim || b.distance - a.distance || b.ship - a.ship);
}
// ---- AI (§5d) ----
const RESERVE = { fuel: 6, rations: 4, water: 4, steel: 4, crystal: 2, data: 3 };
function need(p, r, greed) {
    const shortfall = Math.max(0, Math.min(1, (RESERVE[r] - p.res[r]) / RESERVE[r]));
    const room = p.res[r] >= cargoCap(p, r) ? 0 : 0.25; // surplus is still worth banking until the hold is full
    const steelWant = r === "steel" ? (p.owned.some((id) => !has(p, id)) ? 0.25 : 0) + (p.hp < maxHull(p) - 2 ? 0.5 : 0) : 0;
    return (r === "fuel" ? 1.5 : 1) * shortfall + room + steelWant + greed * 0.3;
}
function worstCaseDamage(game, seat, o) {
    const p = game.players[seat];
    if (o.kind === "hold")
        return 0;
    const col = p.col + (o.kind === "overdrive" ? 2 : 1);
    const s = site(game, Math.min(col, C.COLUMNS), o.lane);
    let worst = o.hull;
    if (!s || s.isStation || s.isRim)
        return worst;
    const def = defense(p);
    const fleeHull = p.res.fuel - o.fuel >= C.FLEE_FUEL ? 0 : 2;
    const cards = s.card ? [s.card] : GD.SITE_DECKS[s.type][s.band];
    let cardWorst = 0;
    for (const c of cards) {
        let d = Math.max(0, (c.hazard || 0) - def);
        if (c.alien && !s.alienCleared) {
            const a = ALIEN_BY_ID[c.alien.species];
            if (a.attitude === "hostile" || a.id === "vrell" || a.id === "solenne")
                d += Math.min(fleeHull, Math.max(0, c.alien.strength - attack(p)));
        }
        cardWorst = Math.max(cardWorst, d);
    }
    return worst + cardWorst;
}
function cellValue(game, seat, s, prof, holding) {
    const p = game.players[seat];
    const g = prof.greed;
    let v = 0;
    if (s.isRim)
        return holding ? 1 : 12;
    if (s.isStation) {
        if (holding)
            return -4; // station services were available on arrival; there is nothing to wait for
        v += 4 + (p.hp < maxHull(p) - 3 ? 3 : 0) + (p.owned.length === p.installed.length ? 3 : 0) + (prof.route === "commerce" ? 3 : 0);
        return v;
    }
    const odds = s.card ? null : deckOdds(s.type, s.band);
    const y = s.card ? (s.stock > 0 && s.card.yield ? s.card.yield : {}) : odds.yieldRes;
    for (const r of Object.keys(y))
        v += need(p, r, g) * (y[r] || 0) * (r === "crystal" ? 2 : 1);
    const disc = s.card ? (s.card.discovery ? 1 : 0) : odds.discovery;
    const tech = s.card ? ((s.card.tech && !s.techClaimed) || (s.card.artifact && !s.artifactClaimed) ? 1 : 0) : odds.tech + odds.artifact;
    v += disc * (prof.route === "science" ? 6 : 2) + tech * 4;
    const hostile = s.card ? (s.card.alien && !s.alienCleared && ALIEN_BY_ID[s.card.alien.species].attitude === "hostile" ? 1 : 0) : odds.hostile;
    if (prof.route === "military")
        v += hostile * (attack(p) >= (s.card && s.card.alien ? s.card.alien.strength : C.SAFE_THRESHOLD[s.band] + 1) ? 5 : -2);
    if (holding && s.stock <= 0 && !(s.card && s.card.discovery))
        v -= 3;
    const expDmg = holding ? 0 : s.card ? Math.max(0, (s.card.hazard || 0) - defense(p)) : Math.max(0, odds.hazardMean - defense(p));
    v -= (1 - prof.risk) * 3 * expDmg;
    return v;
}
function expectedValue(game, seat, o, prof) {
    const p = game.players[seat];
    const col = Math.min(C.COLUMNS, p.col + (o.kind === "overdrive" ? 2 : 1));
    const s = o.kind === "hold" ? site(game, p.col, p.lane) : site(game, col, o.lane);
    if (!s)
        return -99;
    let v = cellValue(game, seat, s, prof, o.kind === "hold");
    // one-column lookahead: the best cell reachable from the destination, discounted
    if (s.col < C.COLUMNS) {
        let best = -Infinity;
        for (let l = Math.max(0, s.lane - 1); l <= Math.min(C.LANES - 1, s.lane + 1); l++) {
            const nx = site(game, s.col + 1, l);
            if (nx)
                best = Math.max(best, cellValue(game, seat, nx, prof, false));
        }
        if (isFinite(best))
            v += 0.5 * best;
    }
    v -= (1 - prof.risk) * 3 * o.hull;
    v -= o.fuel * need(p, "fuel", 0) * 2;
    if (o.kind === "hold")
        v -= 2 + (C.TURNS - game.turn) * 0.2 + p.holdStreak * 2;
    if (o.kind === "overdrive" && C.STATION_COLUMNS.indexOf(p.col + 1) >= 0)
        v -= 6; // don't skip a station column
    // behind schedule for the Rim? overdrive is how you catch up (§7c)
    const behind = (C.COLUMNS - p.col) - (C.TURNS - game.turn + 1);
    if (behind > 0 && prof.campAt === undefined) {
        if (o.kind === "overdrive")
            v += 4 + behind * 2;
        else if (o.kind === "hold")
            v -= 4;
    }
    if (prof.route === "explorer")
        v += o.kind === "overdrive" ? 4 : o.kind === "hold" ? -3 : 1;
    if (prof.campAt !== undefined && col > prof.campAt && o.kind !== "hold")
        v -= 100;
    if (prof.campAt !== undefined && o.kind === "hold")
        v += 2 + (C.TURNS - game.turn) * 0.2;
    return v;
}
function aiPlot(game, seat) {
    const p = game.players[seat];
    const prof = p.profile || GD.AI_PROFILES.cautious;
    const opts = moveOptions(game, seat).filter((o) => o.legal);
    // Safety filter scales with risk appetite: cautious ships keep a 2-hull margin against the
    // worst card in the deck; reckless ones (risk ≥ 0.8) trust the expected value alone.
    const margin = prof.risk >= 0.8 ? -99 : prof.risk >= 0.5 ? -1 : 0;
    let safe = opts.filter((o) => worstCaseDamage(game, seat, o) < p.hp - margin);
    // Holding on a cell that yields no fuel while the tank is empty is a slow death, not safety:
    // coasting (or any move) that merely survives beats it, unless it would wreck the ship outright.
    const here = site(game, p.col, p.lane);
    const holdGivesFuel = !!here && here.stock > 0 && !!here.card && !!here.card.yield && (here.card.yield.fuel || 0) > 0;
    if (p.res.fuel < 1 && !holdGivesFuel && !(here && here.isStation))
        safe = opts.filter((o) => o.kind !== "hold" && worstCaseDamage(game, seat, o) < p.hp);
    const pool = safe.length ? safe : opts;
    let best = pool[0], bestV = -Infinity;
    for (const o of pool) {
        const v = expectedValue(game, seat, o, prof) + game.rng() * 2;
        if (v > bestV) {
            bestV = v;
            best = o;
        }
    }
    return { kind: best.kind, lane: best.lane };
}
function aiArriveAll(game, seat) {
    let guard = 0;
    while (!arriveComplete(game, seat) && guard++ < 10) {
        const opts = arriveOptions(game, seat);
        if (!opts.length)
            break;
        const choice = aiArriveChoice(game, seat, opts);
        const r = arriveChoose(game, seat, choice);
        if (!r.success) {
            const fb = opts.find((o) => o.id === "flee" || o.id === "bypass");
            if (fb)
                arriveChoose(game, seat, fb.id);
            else
                break;
        }
    }
    if (onStation(game, seat))
        aiStation(game, seat);
}
function aiArriveChoice(game, seat, opts) {
    const p = game.players[seat];
    const prof = p.profile || GD.AI_PROFILES.cautious;
    const s = site(game, p.col, p.lane);
    const card = s.card;
    const ids = opts.map((o) => o.id);
    if (opts[0].kind === "encounter" && card && card.alien) {
        const str = card.alien.strength;
        const sp = card.alien.species;
        if (ids.indexOf("fight") >= 0 && attack(p) >= str)
            return "fight";
        if (ids.indexOf("interface") >= 0 && labLevelFor(p) >= 2)
            return "interface";
        if (ids.indexOf("petition") >= 0)
            return "petition";
        if (ids.indexOf("barter") >= 0 && p.res.water >= vrellPrice(p) + 2)
            return "barter";
        if (ids.indexOf("commune") >= 0 && p.res.data >= communeCost(p) && (prof.route === "science" || p.res.data >= 6))
            return "commune";
        if (ids.indexOf("tribute") >= 0 && sp !== "choir" && p.res[mostHeld(p)] >= 6)
            return "tribute";
        if (ids.indexOf("fight") >= 0 && prof.risk >= 0.8 && p.hp > str - attack(p) + 2)
            return "fight";
        return "flee";
    }
    if (ids.indexOf("salvage") >= 0 && opts.find((o) => o.id === "salvage").detail.indexOf("priority") < 0)
        return "salvage";
    if (prof.route === "science" && ids.indexOf("research") >= 0)
        return "research";
    if (ids.indexOf("harvest") >= 0)
        return "harvest";
    if (ids.indexOf("research") >= 0)
        return "research";
    if (ids.indexOf("dock") >= 0)
        return "dock";
    return "bypass";
}
function routeSystems(route) {
    switch (route) {
        case "science": return ["lab", "sensors", "shields", "cargo", "life", "engines", "weapons"];
        case "military": return ["weapons", "shields", "engines", "cargo", "sensors", "life", "lab"];
        case "commerce": return ["cargo", "life", "shields", "sensors", "engines", "lab", "weapons"];
        case "explorer": return ["engines", "sensors", "shields", "cargo", "life", "weapons", "lab"];
        default: return ["shields", "engines", "cargo", "life", "weapons", "sensors", "lab"];
    }
}
function aiStation(game, seat) {
    const p = game.players[seat];
    const prof = p.profile || GD.AI_PROFILES.cautious;
    // refit cheaply
    if (p.hp < maxHull(p))
        repair(game, seat, maxHull(p) - p.hp);
    // refuel first: an empty tank strands the ship
    for (let i = 0; i < 4 && p.res.fuel < RESERVE.fuel; i++) {
        let high = "rations";
        for (const r of BASE_RES)
            if (r !== "fuel" && p.res[r] > p.res[high])
                high = r;
        if (p.res[high] >= 5 && !stationExchange(game, seat, high, "fuel", 2).success)
            break;
        else if (p.res[high] < 5)
            break;
    }
    // convert surplus into crystal for L2 installs / blueprints
    for (let i = 0; i < 3; i++) {
        let high = "fuel";
        for (const r of BASE_RES)
            if (p.res[r] > p.res[high])
                high = r;
        const wantsCrystal = p.owned.some((id) => !has(p, id) && (TECH_BY_ID[id].installCost.crystal || 0) > p.res.crystal) || p.owned.filter((id) => !has(p, id)).length <= 1;
        if (wantsCrystal && p.res[high] >= RESERVE[high] + 3)
            stationExchange(game, seat, high, "crystal", 1);
        else
            break;
    }
    // buy the next tech in route order that we lack and can afford
    if (prof.upgradeBias > 0) {
        const nextBand = bandOf(Math.min(C.COLUMNS, p.col + 1));
        const want = [];
        if (defense(p) < C.SAFE_THRESHOLD[nextBand])
            want.push(`shields-${level(p, "shields") + 1}`);
        for (const sys of routeSystems(prof.route)) {
            const l = level(p, sys);
            if (l < 3)
                want.push(`${sys}-${l + 1}`);
        }
        let bought = 0;
        for (const id of want) {
            const t = TECH_BY_ID[id];
            if (!t || p.owned.indexOf(id) >= 0)
                continue;
            if (brokerBuy(game, seat, id, "crystal").success || brokerBuy(game, seat, id, "data").success) {
                if (++bought >= 2)
                    break;
            }
        }
    }
    // top up the worst reserve
    for (let i = 0; i < 2; i++) {
        let low = "fuel";
        let high = "fuel";
        for (const r of BASE_RES) {
            if (p.res[r] < p.res[low])
                low = r;
            if (p.res[r] > p.res[high])
                high = r;
        }
        if (p.res[low] < RESERVE[low] && p.res[high] >= RESERVE[high] + 4)
            stationExchange(game, seat, high, low, 2);
        else
            break;
    }
    if (p.crew < 5 && p.res.rations >= 8)
        recruit(game, seat);
}
function aiDock(game, seat) {
    const p = game.players[seat];
    const prof = p.profile || GD.AI_PROFILES.cautious;
    if (p.hp < maxHull(p) - 2 && p.res.steel >= 4)
        repair(game, seat, Math.floor((p.res.steel - 2) / repairCost(p, game)));
    if (game.rng() < prof.upgradeBias) {
        const nextBand = bandOf(Math.min(C.COLUMNS, p.col + 1));
        const order = routeSystems(prof.route);
        const candidates = p.owned.filter((id) => !has(p, id)).sort((x, y) => {
            const tx = TECH_BY_ID[x], ty = TECH_BY_ID[y];
            const px = (tx.system === "shields" && defense(p) < C.SAFE_THRESHOLD[nextBand] ? -100 : 0) + (tx.system ? order.indexOf(tx.system) : 3);
            const py = (ty.system === "shields" && defense(p) < C.SAFE_THRESHOLD[nextBand] ? -100 : 0) + (ty.system ? order.indexOf(ty.system) : 3);
            return px - py;
        });
        for (const id of candidates) {
            const c = canInstall(game, seat, id);
            if (c.ok && install(game, seat, id, !!c.free).success)
                break;
        }
    }
    const near = neighbours(game, seat);
    if (near.length && !p.diplomacyThisTurn) {
        // raid?
        if (prof.risk >= 0.7) {
            for (const q of near) {
                if (inPact(p, q))
                    continue;
                let low = "fuel";
                for (const r of BASE_RES)
                    if (need(p, r, 0) > need(p, low, 0))
                        low = r;
                if (attack(p) > defense(q) + 1 && q.res[low] >= 4 && p.crew >= 3) {
                    raid(game, seat, q.seat, low);
                    break;
                }
            }
        }
        if (!p.diplomacyThisTurn && p.pacts.length < maxPacts(p) && game.rng() < prof.diplomacy) {
            const cand = near.filter((q) => !q.traitor && !inPact(p, q)).sort((a, b) => dist(p, a) - dist(p, b))[0];
            if (cand)
                proposePact(game, seat, cand.seat);
        }
        if (!p.diplomacyThisTurn && p.res.crystal >= C.TECH_COPY_CRYSTAL + 1) {
            for (const q of near) {
                const id = q.installed.find((x) => p.owned.indexOf(x) < 0);
                if (id && techCopy(game, seat, q.seat, id, "crystal").success)
                    break;
            }
        }
        if (!p.diplomacyThisTurn) {
            let low = "fuel";
            for (const r of BASE_RES)
                if (p.res[r] < p.res[low])
                    low = r;
            if (p.res[low] < RESERVE[low]) {
                let high = "fuel";
                for (const r of BASE_RES)
                    if (p.res[r] > p.res[high])
                        high = r;
                const partner = near.sort((a, b) => b.res[low] - a.res[low])[0];
                if (partner && p.res[high] >= RESERVE[high] + 4)
                    trade(game, seat, partner.seat, high, low, 2);
            }
        }
    }
    if (prof.risk >= 0.5 && p.res.steel >= 7 && p.crew >= 3) {
        const s = site(game, p.col, p.lane);
        if (s.card && s.stock === 0 && !s.mines.length)
            layMine(game, seat);
    }
}
// ---- convenience for simulations and the UI ----
function humanSeats(game) { return game.players.filter((p) => p.controller === "human").map((p) => p.seat); }
/** Plays one whole turn with every seat on AI. Returns false when the game is over. */
function playTurnAllAi(game) {
    if (game.phase === "bandSummary")
        continueFromSummary(game);
    if (game.phase === "gameEnd")
        return false;
    for (const p of game.players)
        if (game.plotted[p.seat] === null)
            plotCourse(game, p.seat, isAdrift(p, game) ? { kind: "hold", lane: p.lane } : aiPlot(game, p.seat));
    const r1 = resolveMoves(game);
    if (!r1.success)
        throw new Error(r1.reason);
    for (const p of game.players)
        if (p.controller !== "ai")
            aiArriveAll(game, p.seat);
    const r2 = finishArrive(game);
    if (!r2.success)
        throw new Error(r2.reason);
    for (const p of game.players)
        if (p.controller !== "ai" && !isAdrift(p, game))
            aiDock(game, p.seat);
    const r3 = endTurn(game);
    if (!r3.success)
        throw new Error(r3.reason);
    return game.phase !== "gameEnd";
}
const GameEngine = {
    createGame, generateMap, validateMap, mulberry32, shuffle,
    startTurn, moveOptions, plotCourse, allPlotted, resolveMoves,
    arriveOptions, arriveChoose, arriveComplete, finishArrive,
    stationExchange, repair, brokerBuy, recruit, onStation,
    canInstall, install, layMine, trade, techCopy, proposePact, respondOffer, raid, endTurn, continueFromSummary,
    peekSite, deckOdds, scoreOf, computeScores,
    level, has, maxHull, defense, attack, cargoCap, sensorRange, tier, isAdrift, inPact, neighbours, inProximity, site, bandOf, worstCaseDamage,
    aiPlot, aiArriveAll, aiDock, playTurnAllAi, humanSeats,
    TECH_BY_ID, HULL_BY_ID, ALIEN_BY_ID, SITE_TYPE_BY_ID, DECK_TYPES, BANDS, BASE_RES, ALL_RES, KINDS,
};
if (typeof module !== "undefined" && module.exports)
    module.exports = GameEngine;
