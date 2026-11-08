import { baseDef } from './data/units.js';
import { enemyStats, heroStats } from './progress.js';
export const COLS = 6;
export const ROWS = 8;
export const TERRAIN = {
    P: { key: 'plain', name: 'Plain' },
    F: { key: 'forest', name: 'Forest' },
    M: { key: 'mountain', name: 'Mountain' },
    '~': { key: 'water', name: 'Water' },
    W: { key: 'wall', name: 'Wall' },
    T: { key: 'fort', name: 'Fort' },
};
export const MOVE_RANGE = { infantry: 2, armored: 1, cavalry: 3, flying: 2 };
export const WEAPONS = {
    'Sword': { color: 'red', range: 1, magic: false, code: 'Sw' },
    'Lance': { color: 'blue', range: 1, magic: false, code: 'Ln' },
    'Axe': { color: 'green', range: 1, magic: false, code: 'Ax' },
    'Bow': { color: 'colourless', range: 2, magic: false, code: 'Bw' },
    'Dagger': { color: 'colourless', range: 2, magic: false, code: 'Dg' },
    'Staff': { color: 'colourless', range: 2, magic: true, code: 'St' },
    'Red Tome': { color: 'red', range: 2, magic: true, code: 'Tm' },
    'Blue Tome': { color: 'blue', range: 2, magic: true, code: 'Tm' },
    'Green Tome': { color: 'green', range: 2, magic: true, code: 'Tm' },
};
export const SPECIAL_NAME = 'Surge';
export const SPECIAL_MULT = 1.5;
export const HEAL_BASE = 10;
export const HEAL_ATK_DIV = 2;
export const STAFF_MULT = 0.5;
export const FORT_MULT = 1.2;
export function key(c, r) { return c + ',' + r; }
function inBounds(c, r) { return c >= 0 && r >= 0 && c < COLS && r < ROWS; }
export function terrainOfMap(map, c, r) {
    const ch = (map[r] ?? '').charAt(c);
    return TERRAIN[ch] ?? TERRAIN.P;
}
export function terrainAt(state, c, r) {
    return terrainOfMap(state.chapter.map, c, r);
}
export function dist(a, b) { return Math.abs(a.col - b.col) + Math.abs(a.row - b.row); }
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
/* Units array order (SPEC 4.4): the team heroes in slot order, then the chapter's enemies. */
export function createState(chapter, team, levels) {
    const units = [];
    team.forEach((id, i) => {
        const d = baseDef(id);
        const lv = levels[id] ?? 1;
        const s = heroStats(id, lv);
        const start = chapter.starts[i] ?? chapter.starts[chapter.starts.length - 1];
        units.push({
            uid: id, id, side: 'player', name: d.name, weapon: d.weapon, moveType: d.moveType, color: WEAPONS[d.weapon].color,
            level: lv, boss: false,
            maxHp: s.hp, hp: s.hp, atk: s.atk, spd: s.spd, def: s.def, res: s.res, cdMax: s.cd, cd: s.cd,
            col: start[0], row: start[1], sprite: 'assets/units/' + id + '.png',
            alive: true, done: false, moved: false,
        });
    });
    chapter.enemies.forEach((e, i) => {
        const d = baseDef(e.type);
        const s = enemyStats(e.type, e.level);
        units.push({
            uid: e.type + '#' + i, id: e.type, side: 'enemy', name: d.name, weapon: d.weapon, moveType: d.moveType,
            color: WEAPONS[d.weapon].color, level: e.level, boss: e.type === 'e_boss',
            maxHp: s.hp, hp: s.hp, atk: s.atk, spd: s.spd, def: s.def, res: s.res, cdMax: s.cd, cd: s.cd,
            col: e.col, row: e.row, sprite: 'assets/units/' + e.type + '.png',
            alive: true, done: false, moved: false,
        });
    });
    return { units, turn: 1, phase: 'player', over: null, chapter };
}
export function living(state, side) {
    return state.units.filter((u) => u.alive && (!side || u.side === side));
}
export function unitAt(state, c, r) {
    for (const u of state.units) {
        if (u.alive && u.col === c && u.row === r)
            return u;
    }
    return null;
}
export function isHealer(unit) { return unit.weapon === 'Staff'; }
/* cost to ENTER a tile for a movement type; Infinity if impassable */
export function moveCost(moveType, terrain) {
    if (terrain === 'wall')
        return Infinity;
    if (terrain === 'mountain' || terrain === 'water')
        return moveType === 'flying' ? 1 : Infinity;
    if (terrain === 'forest') {
        if (moveType === 'cavalry')
            return Infinity;
        if (moveType === 'flying')
            return 1;
        return 2;
    }
    return 1;
}
function costAt(state, moveType, c, r) {
    return moveCost(moveType, terrainAt(state, c, r).key);
}
/* Dijkstra over move costs. opts.ignoreUnits: ignore blocking; opts.limit: max cost.
   Units cannot pass through foes. */
export function reach(state, unit, opts = {}) {
    const limit = opts.limit != null ? opts.limit : MOVE_RANGE[unit.moveType];
    const cost = {};
    const prev = {};
    const done = {};
    const startK = key(unit.col, unit.row);
    cost[startK] = 0;
    const frontier = [[unit.col, unit.row]];
    while (frontier.length) {
        let bi = 0;
        for (let i = 1; i < frontier.length; i++) {
            if (cost[key(frontier[i][0], frontier[i][1])] < cost[key(frontier[bi][0], frontier[bi][1])])
                bi = i;
        }
        const cur = frontier.splice(bi, 1)[0];
        const ck = key(cur[0], cur[1]);
        if (done[ck])
            continue;
        done[ck] = true;
        for (const [dc, dr] of DIRS) {
            const nc = cur[0] + dc, nr = cur[1] + dr;
            if (!inBounds(nc, nr))
                continue;
            const step = costAt(state, unit.moveType, nc, nr);
            if (step === Infinity)
                continue;
            if (!opts.ignoreUnits) {
                const o = unitAt(state, nc, nr);
                if (o && o.side !== unit.side)
                    continue;
            }
            const nk = key(nc, nr), c2 = cost[ck] + step;
            if (c2 > limit)
                continue;
            if (cost[nk] === undefined || c2 < cost[nk]) {
                cost[nk] = c2;
                prev[nk] = ck;
                frontier.push([nc, nr]);
            }
        }
    }
    const stops = [];
    Object.keys(cost).forEach((k) => {
        const p = k.split(',');
        const c = +p[0], r = +p[1];
        const o = unitAt(state, c, r);
        if (o && o !== unit)
            return; // cannot end on occupied tile
        stops.push({ col: c, row: r, cost: cost[k] });
    });
    return { cost, prev, stops, start: startK };
}
export function pathTo(info, c, r) {
    let k = key(c, r);
    const out = [];
    while (k !== undefined) {
        const p = k.split(',');
        out.unshift({ col: +p[0], row: +p[1] });
        k = info.prev[k];
    }
    return out;
}
/* tiles at exactly `range` from (c,r) */
export function tilesInRange(c, r, range) {
    const out = [];
    for (let dc = -range; dc <= range; dc++) {
        const rem = range - Math.abs(dc);
        const drs = rem === 0 ? [0] : [-rem, rem];
        for (const dr of drs) {
            const nc = c + dc, nr = r + dr;
            if (inBounds(nc, nr))
                out.push({ col: nc, row: nr });
        }
    }
    return out;
}
/* triangle: +1 if colour a beats b, -1 if loses, 0 otherwise */
export function triangle(a, b) {
    const beats = { red: 'green', green: 'blue', blue: 'red' };
    if (beats[a] === b)
        return 1;
    if (beats[b] === a)
        return -1;
    return 0;
}
export function defStat(unit, magic, terrain) {
    let v = magic ? unit.res : unit.def;
    if (terrain === 'fort')
        v = Math.floor(v * FORT_MULT);
    return v;
}
function hitDamage(att, def, defTerrain, adv, special) {
    const w = WEAPONS[att.weapon];
    let atk = att.atk * (1 + 0.2 * adv);
    if (att.weapon === 'Bow' && def.moveType === 'flying')
        atk *= 1.5;
    if (att.weapon === 'Staff')
        atk *= STAFF_MULT;
    atk = Math.floor(atk + 1e-9);
    let dmg = Math.max(0, atk - defStat(def, w.magic, defTerrain));
    if (special)
        dmg = Math.floor(dmg * SPECIAL_MULT);
    return dmg;
}
/* Full combat simulation att -> def, with attacker standing on atile. Pure. */
export function simulate(state, att, def, atile) {
    const dtile = { col: def.col, row: def.row };
    const tD = terrainAt(state, dtile.col, dtile.row).key;
    const tA = terrainAt(state, atile.col, atile.row).key;
    const d = Math.abs(atile.col - dtile.col) + Math.abs(atile.row - dtile.row);
    const aw = WEAPONS[att.weapon], dw = WEAPONS[def.weapon];
    const adv = triangle(aw.color, dw.color);
    const counter = dw.range === d;
    const followA = att.spd >= def.spd + 5;
    const followD = counter && def.spd >= att.spd + 5;
    const seq = ['a'];
    if (counter)
        seq.push('d');
    if (followA)
        seq.push('a');
    if (followD)
        seq.push('d');
    const hp = { a: att.hp, d: def.hp };
    const cd = { a: att.cd, d: def.cd };
    const events = [];
    for (const who of seq) {
        if (hp.a <= 0 || hp.d <= 0)
            break;
        const other = who === 'a' ? 'd' : 'a';
        const X = who === 'a' ? att : def, Y = who === 'a' ? def : att;
        const tY = who === 'a' ? tD : tA;
        const advX = who === 'a' ? adv : -adv;
        const special = cd[who] === 0;
        const dmg = hitDamage(X, Y, tY, advX, special);
        if (special)
            cd[who] = X.cdMax;
        else
            cd[who] = Math.max(0, cd[who] - 1);
        if (cd[other] > 0)
            cd[other]--;
        hp[other] = Math.max(0, hp[other] - dmg);
        events.push({ who, dmg, special, targetHp: hp[other], cdA: cd.a, cdD: cd.d });
    }
    let hitsA = 0, hitsD = 0;
    seq.forEach((s) => { if (s === 'a')
        hitsA++;
    else
        hitsD++; });
    return {
        dist: d, counter, adv, events, hp, cd,
        hitsA, hitsD,
        dmgA: hitDamage(att, def, tD, adv, false),
        dmgD: counter ? hitDamage(def, att, tA, -adv, false) : 0,
        bowBonus: att.weapon === 'Bow' && def.moveType === 'flying',
        killsDef: hp.d <= 0, killsAtt: hp.a <= 0,
        atile,
    };
}
export function applyResult(att, def, sim) {
    att.hp = sim.hp.a;
    def.hp = sim.hp.d;
    att.cd = sim.cd.a;
    def.cd = sim.cd.d;
    if (att.hp <= 0)
        att.alive = false;
    if (def.hp <= 0)
        def.alive = false;
}
/* ---------------- healing (SPEC 8) ---------------- */
/* full heal power of a healer: 10 + floor(Atk / 2) */
export function healFromAtk(atk) { return HEAL_BASE + Math.floor(atk / HEAL_ATK_DIV); }
export function healPower(healer) { return healFromAtk(healer.atk); }
export function healAmount(healer, target) {
    return Math.max(0, Math.min(target.maxHp - target.hp, healPower(healer)));
}
export function applyHeal(healer, target) {
    const n = healAmount(healer, target);
    target.hp = Math.min(target.maxHp, target.hp + n);
    return n;
}
function foesOf(state, unit) {
    return living(state, unit.side === 'player' ? 'enemy' : 'player');
}
function alliesOf(state, unit) {
    return living(state, unit.side).filter((u) => u !== unit);
}
/* 7.4 score used to choose the from-tile */
function stopScore(state, unit, s) {
    const own = s.col === unit.col && s.row === unit.row;
    return (own ? 100 : 0) - s.cost + (terrainAt(state, s.col, s.row).key === 'fort' ? 0.5 : 0);
}
function bestStop(state, unit, stops, target, range) {
    let best = null;
    for (const s of stops) {
        if (Math.abs(s.col - target.col) + Math.abs(s.row - target.row) !== range)
            continue;
        const score = stopScore(state, unit, s);
        if (!best || score > best.score)
            best = { col: s.col, row: s.row, cost: s.cost, score };
    }
    return best;
}
/* map foe uid -> best stop tile to attack from */
export function targetsFrom(state, unit, stops) {
    const map = {};
    const range = WEAPONS[unit.weapon].range;
    for (const f of foesOf(state, unit)) {
        const best = bestStop(state, unit, stops, f, range);
        if (best)
            map[f.uid] = best;
    }
    return map;
}
/* map damaged ally uid -> best stop tile to heal from (distance exactly 1) */
export function healTargets(state, unit, stops) {
    const map = {};
    if (!isHealer(unit))
        return map;
    for (const a of alliesOf(state, unit)) {
        if (a.hp >= a.maxHp)
            continue;
        const best = bestStop(state, unit, stops, a, 1);
        if (best)
            map[a.uid] = best;
    }
    return map;
}
export function attackTiles(unit, stops) {
    const range = WEAPONS[unit.weapon].range;
    const set = {};
    stops.forEach((s) => {
        tilesInRange(s.col, s.row, range).forEach((t) => { set[key(t.col, t.row)] = true; });
    });
    return set;
}
/* assist range: tiles at distance 1 from every stop */
export function assistTiles(stops) {
    const set = {};
    stops.forEach((s) => {
        tilesInRange(s.col, s.row, 1).forEach((t) => { set[key(t.col, t.row)] = true; });
    });
    return set;
}
/* Danger area: every tile any enemy could attack next turn */
export function dangerTiles(state) {
    const set = {};
    living(state, 'enemy').forEach((e) => {
        const info = reach(state, e);
        const a = attackTiles(e, info.stops);
        Object.keys(a).forEach((k) => { set[k] = true; });
    });
    return set;
}
/* Reverse Dijkstra: distance for `unit` to reach any tile from which it could attack a foe. */
function approachMap(state, unit) {
    const range = WEAPONS[unit.weapon].range;
    const dmap = {};
    const queue = [];
    foesOf(state, unit).forEach((f) => {
        tilesInRange(f.col, f.row, range).forEach((t) => {
            if (costAt(state, unit.moveType, t.col, t.row) === Infinity)
                return;
            dmap[key(t.col, t.row)] = 0;
            queue.push([t.col, t.row]);
        });
    });
    while (queue.length) {
        let bi = 0;
        for (let i = 1; i < queue.length; i++) {
            if (dmap[key(queue[i][0], queue[i][1])] < dmap[key(queue[bi][0], queue[bi][1])])
                bi = i;
        }
        const cur = queue.splice(bi, 1)[0], ck = key(cur[0], cur[1]);
        for (const [dc, dr] of DIRS) {
            const nc = cur[0] + dc, nr = cur[1] + dr;
            if (!inBounds(nc, nr))
                continue;
            if (costAt(state, unit.moveType, nc, nr) === Infinity)
                continue;
            const nd = dmap[ck] + costAt(state, unit.moveType, cur[0], cur[1]);
            const nk = key(nc, nr);
            if (dmap[nk] === undefined || nd < dmap[nk]) {
                dmap[nk] = nd;
                queue.push([nc, nr]);
            }
        }
    }
    return dmap;
}
/* Enemy AI (SPEC 25): heal (staff users) -> attack -> approach. */
export function planEnemy(state, unit) {
    const info = reach(state, unit);
    const range = WEAPONS[unit.weapon].range;
    if (isHealer(unit)) {
        let pick = null;
        for (const a of alliesOf(state, unit)) {
            if (!(a.hp < 0.7 * a.maxHp))
                continue;
            if (!bestStop(state, unit, info.stops, a, 1))
                continue;
            if (!pick || a.hp / a.maxHp < pick.hp / pick.maxHp)
                pick = a;
        }
        if (pick) {
            const t = bestStop(state, unit, info.stops, pick, 1);
            if (t) {
                return { col: t.col, row: t.row, path: pathTo(info, t.col, t.row), target: pick, sim: null, heal: true };
            }
        }
    }
    const foes = foesOf(state, unit);
    let best = null;
    for (const s of info.stops) {
        for (const f of foes) {
            if (Math.abs(s.col - f.col) + Math.abs(s.row - f.row) !== range)
                continue;
            const sim = simulate(state, unit, f, { col: s.col, row: s.row });
            const dealt = f.hp - sim.hp.d, taken = unit.hp - sim.hp.a;
            const score = (sim.killsDef ? 1000 : 0) + dealt - 0.25 * taken - (sim.killsAtt ? 500 : 0)
                + (terrainAt(state, s.col, s.row).key === 'fort' ? 3 : 0) - s.cost * 0.1;
            if (!best || score > best.score)
                best = { score, stop: s, target: f, sim };
        }
    }
    if (best) {
        return {
            col: best.stop.col, row: best.stop.row, path: pathTo(info, best.stop.col, best.stop.row),
            target: best.target, sim: best.sim, heal: false,
        };
    }
    const dmap = approachMap(state, unit);
    let pick = null;
    for (const s of info.stops) {
        const dv = dmap[key(s.col, s.row)];
        if (dv === undefined)
            continue;
        if (!pick || dv < pick.dv || (dv === pick.dv && s.cost > pick.cost))
            pick = { dv, cost: s.cost, col: s.col, row: s.row };
    }
    const p = pick ?? { col: unit.col, row: unit.row };
    return { col: p.col, row: p.row, path: pathTo(info, p.col, p.row), target: null, sim: null, heal: false };
}
export function checkEnd(state, objective = state.chapter.objective) {
    const boss = state.units.find((u) => u.boss);
    const won = objective === 'Defeat the commander' && boss ? !boss.alive : living(state, 'enemy').length === 0;
    if (won)
        state.over = 'win';
    else if (living(state, 'player').length === 0)
        state.over = 'lose';
    return state.over;
}
//# sourceMappingURL=logic.js.map