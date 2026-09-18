"use strict";
// 7 Ships — rendering/DOM layer. Compiled to game/script.js; loaded last. Holds no rules: it
// reads GameEngine state, renders it, and calls back into GameEngine. Seat 0 is the human in v1.
const SAVE_KEY = "sevenships_save";
void SAVE_KEY; // reserved (docs/requirements.md §1)
const E = GameEngine;
const D = GameData;
const K = D.C;
const ME = 0;
const ui = { screen: "setup", game: null, hullId: null, numPlayers: 5, seedText: "", selected: null, modal: null,
    tradeGive: "fuel", tradeGet: "steel", tradeAmount: 1, tradeTarget: -1, keyboard: false, lastTier: 0 };
// ---- tiny DOM helpers ----
function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === "class")
            el.className = v;
        else if (k === "onclick")
            el.onclick = v;
        else if (k === "html")
            el.innerHTML = v;
        else if (k === "disabled")
            el.disabled = !!v;
        else if (k === "title")
            el.title = v;
        else
            el.setAttribute(k, String(v));
    }
    for (const c of children)
        if (c !== null && c !== undefined && c !== false)
            el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return el;
}
const resInfo = (r) => D.RESOURCES.find((x) => x.id === r);
const resE = (r) => resInfo(r).emoji;
const typeInfo = (t) => E.SITE_TYPE_BY_ID[t];
const me = () => ui.game.players[ME];
/** Renders a spritesheet cell at `size` px, or the fallback emoji when the sheet isn't available. */
function spriteEl(sprite, size, fallback, extraClass = "") {
    const sheet = sprite ? D.SPRITE_SHEETS[sprite.sheet] : undefined;
    if (!sprite || !sheet)
        return h("span", { class: "sprite-fallback " + extraClass, style: `font-size:${Math.round(size * 0.7)}px;line-height:${size}px;width:${size}px;height:${size}px` }, fallback);
    const col = sprite.index % sheet.cols, row = Math.floor(sprite.index / sheet.cols);
    return h("span", { class: "sprite " + extraClass, title: fallback,
        style: `width:${size}px;height:${size}px;background-image:url(${sheet.file});background-size:${sheet.cols * size}px ${sheet.rows * size}px;background-position:-${col * size}px -${row * size}px` });
}
function siteSprite(s, size, extraClass = "") {
    if (s.isRim)
        return spriteEl(D.SCENE_SPRITES.rimBeacon, size, "🌌", extraClass);
    const t = typeInfo(s.type);
    return spriteEl(t.sprite, size, t.emoji, extraClass);
}
function hullSprite(p, size, extraClass = "") { return spriteEl(p.hull.sprites[E.tier(p)], size, p.hull.emoji, extraClass); }
function toast(msg) { const t = h("div", { class: "toast" }, msg); document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
function tryAct(r, okMsg) { if (!r.success) {
    toast("❌ " + (r.reason || "not allowed"));
    return false;
} if (okMsg)
    toast(okMsg); render(); return true; }
// ---- setup ----
function renderSetup() {
    const tiles = D.HULLS.map((hu) => h("div", { class: "hull-tile" + (ui.hullId === hu.id ? " selected" : ""), onclick: () => { ui.hullId = hu.id; render(); } }, h("div", { class: "big" }, spriteEl(hu.sprites[0], 96, hu.emoji)), h("div", {}, h("strong", {}, hu.name)), h("div", { class: "dim" }, hu.blurb), h("div", { class: "small" }, "Starts with " + E.TECH_BY_ID[hu.startTech].name + (Object.keys(hu.startResources).length ? "; " + Object.entries(hu.startResources).map(([r, n]) => `+${n} ${resE(r)}`).join(" ") : "")), h("div", { class: "small dim" }, hu.powerText)));
    const counts = [3, 4, 5, 6, 7].map((n) => h("button", { class: ui.numPlayers === n ? "primary" : "", onclick: () => { ui.numPlayers = n; render(); } }, `${n}`));
    return h("div", { class: "panel" }, h("h1", {}, "🚀 7 Ships"), h("p", { class: "dim" }, "Earth is gone. Run for the Outer Rim: 21 turns, 21 sectors, 7 lanes. Harvest, upgrade, trade, betray. Highest score at the end wins. Every wreck is rescued, at a price."), h("h3", {}, "Ships at the table"), h("div", { class: "row" }, ...counts), h("h3", { style: "margin-top:10px" }, "Choose your hull"), h("div", { class: "row" }, h("button", { onclick: () => { ui.hullId = D.HULLS[Math.floor(Math.random() * D.HULLS.length)].id; render(); } }, "🎲 Random")), h("div", { class: "hull-grid", style: "margin-top:8px" }, ...tiles), h("div", { class: "row", style: "margin-top:12px" }, h("label", { class: "dim" }, "Seed "), (() => { const i = h("input", { placeholder: "blank = random", value: ui.seedText, style: "width:140px" }); i.oninput = () => { ui.seedText = i.value; }; return i; })(), h("button", { class: "primary", disabled: !ui.hullId, onclick: launch }, "Launch 🚀")), h("p", { class: "small dim" }, "Keys: ", kbd("←/→"), " lane, ", kbd("Enter"), " confirm, ", kbd("H"), " hold, ", kbd("O"), " overdrive, ", kbd("1–9"), " pick an option, ", kbd("Esc"), " close."));
}
function kbd(s) { return h("span", { class: "kbd" }, s); }
function launch() {
    const seed = ui.seedText.trim() ? (parseInt(ui.seedText.trim(), 10) >>> 0) : undefined;
    ui.game = E.createGame({ numPlayers: ui.numPlayers, seed, hullId: ui.hullId });
    ui.screen = "bridge";
    ui.selected = null;
    ui.lastTier = E.tier(me());
    render();
}
// ---- status bar ----
function renderStatus() {
    const g = ui.game;
    const p = me();
    const chips = D.RESOURCES.map((r) => h("span", { class: "chip" + (r.base && p.res[r.id] <= 2 ? " low" : ""), title: r.label + " (cap " + E.cargoCap(p, r.id) + ")" }, r.emoji, h("strong", {}, String(p.res[r.id]))));
    return h("div", { class: "panel status-bar" }, h("div", { class: "row" }, h("h1", {}, "🚀 7 Ships"), h("span", { class: "chip" }, "Turn ", h("strong", {}, `${g.turn}/${K.TURNS}`)), h("span", { class: "chip" }, "Sector ", h("strong", {}, `${p.col}`)), h("span", { class: "chip", title: "seed" }, "🎲 ", h("strong", {}, String(g.seed)))), h("div", { class: "row" }, ...chips, h("span", { class: "chip" }, "❤️ ", h("strong", {}, `${p.hp}/${E.maxHull(p)}`)), h("span", { class: "chip" }, "👥 ", h("strong", {}, String(p.crew)))));
}
// ---- sector strip ----
function renderStrip() {
    const g = ui.game;
    const p = me();
    const opts = E.moveOptions(g, ME);
    const from = Math.max(0, p.col - 1), to = Math.min(K.COLUMNS, Math.max(p.col + 3, 3));
    const cols = [];
    const range = E.sensorRange(p);
    for (let col = from; col <= to; col++) {
        if (col === 0) { // Earth: the launch column, no sites
            const cells = [h("div", { class: "col-head" + (p.col === 0 ? " current" : "") }, "0 · Earth")];
            for (let lane = 0; lane < K.LANES; lane++) {
                const cell = h("div", { class: "cell fog" }, spriteEl(D.SCENE_SPRITES.earthWreck, 40, "🌍", "site"), h("div", { class: "dim" }, "debris"));
                const ships = g.players.filter((q) => q.seat !== ME && q.col === 0 && q.lane === lane);
                if (ships.length)
                    cell.appendChild(h("div", { class: "ships" }, ...ships.map((q) => hullSprite(q, 22, "inline"))));
                if (p.col === 0 && p.lane === lane)
                    cell.appendChild(h("div", { class: "me" }, hullSprite(p, 30, "inline")));
                cells.push(cell);
            }
            cols.push(h("div", { class: "col" }, ...cells));
            continue;
        }
        const band = E.bandOf(col);
        const cells = [h("div", { class: "col-head" + (col === p.col ? " current" : "") }, `${col} · ${band}`)];
        for (let lane = 0; lane < K.LANES; lane++) {
            const s = E.site(g, col, lane);
            const opt = g.phase === "plot" ? opts.find((o) => o.legal && o.lane === lane && ((o.kind === "overdrive" && col === p.col + 2) || ((o.kind === "advance" || o.kind === "warp" || o.kind === "coast") && col === p.col + 1) || (o.kind === "hold" && col === p.col))) : undefined;
            const known = s.card !== undefined || col <= p.col + range || s.isStation || s.isRim;
            const cls = ["cell", "band-" + band];
            if (opt)
                cls.push("reach");
            if (ui.selected && opt && ui.selected.kind === opt.kind && ui.selected.lane === opt.lane)
                cls.push("selected");
            if (s.card)
                cls.push("faceup");
            if (!known)
                cls.push("fog");
            const ships = g.players.filter((q) => q.seat !== ME && q.col === col && q.lane === lane);
            const body = [];
            if (known) {
                body.push(h("div", { class: "t" }, siteSprite(s, 40, "site"), s.card ? h("span", { class: "card-emoji" }, s.card.emoji) : null));
                if (s.isRim)
                    body.push("Outer Rim");
                else if (s.isStation)
                    body.push("Station");
                else if (s.card) {
                    body.push(h("div", {}, s.card.title));
                    const bits = [];
                    if (s.card.hazard)
                        bits.push(`☠${s.card.hazard}`);
                    if (s.card.alien && !s.alienCleared)
                        bits.push(`${E.ALIEN_BY_ID[s.card.alien.species].emoji}${s.card.alien.strength}`);
                    if (s.card.yield)
                        bits.push(Object.entries(s.card.yield).map(([r, n]) => `${resE(r)}${n}`).join("") + (s.stock > 0 ? `×${s.stock}` : ""));
                    if (s.card.discovery)
                        bits.push("🔬");
                    if ((s.card.tech && !s.techClaimed) || (s.card.artifact && !s.artifactClaimed))
                        bits.push("🧲");
                    body.push(h("div", { class: s.stock <= 0 && s.card.yield ? "stock0" : "" }, bits.join(" ")));
                    if (s.card.hazard && opt) {
                        const dmg = Math.max(0, s.card.hazard - E.defense(p));
                        body.push(h("div", { class: "dmg" }, dmg ? `−${dmg} hull` : "safe"));
                    }
                }
                else {
                    const odds = E.deckOdds(s.type, s.band);
                    body.push(h("div", {}, typeInfo(s.type).name));
                    const bits = [];
                    for (const [r, v] of Object.entries(odds.yieldRes))
                        if (v >= 0.5)
                            bits.push(`${resE(r)}~${Math.round(v)}`);
                    if (odds.hostile)
                        body.push(h("div", { class: "haz" }, `${Math.round(odds.hostile * 10)}/10 hostile`));
                    if (odds.hazardMean)
                        bits.push(`☠~${odds.hazardMean.toFixed(1)}`);
                    body.push(h("div", {}, bits.join(" ")));
                    if (opt)
                        body.push(h("div", { class: "dmg" }, `worst −${E.worstCaseDamage(g, ME, opt)}`));
                }
            }
            else
                body.push(h("div", { class: "t" }, "❔"), h("div", { class: "dim" }, "unknown"));
            if (opt)
                body.push(h("div", { class: "small dim" }, `${opt.kind} ⛽${opt.fuel}${opt.hull ? ` ❤️−${opt.hull}` : ""}`));
            if (s.mines.length && (E.level(p, "sensors") >= 2 || s.mines.some((m) => m.owner === ME || E.inPact(p, g.players[m.owner]))))
                body.push(h("div", { class: "haz" }, "⚠️ mine"));
            const cell = h("div", { class: cls.join(" "), onclick: opt ? () => { ui.selected = { kind: opt.kind, lane: opt.lane }; render(); } : undefined }, ...body);
            if (ships.length)
                cell.appendChild(h("div", { class: "ships" }, ...ships.map((q) => E.isAdrift(q, g) ? h("span", {}, "🆘") : hullSprite(q, 22, "inline"))));
            if (p.col === col && p.lane === lane)
                cell.appendChild(h("div", { class: "me" }, E.isAdrift(p, g) ? h("span", {}, "🆘") : hullSprite(p, 30, "inline")));
            cells.push(cell);
        }
        cols.push(h("div", { class: "col" }, ...cells));
    }
    return h("div", { class: "panel strip-wrap" }, h("div", { class: "strip" }, ...cols));
}
// ---- phase card ----
function renderPhase() {
    const g = ui.game;
    const p = me();
    if (E.isAdrift(p, g))
        return h("div", { class: "panel phase" }, h("h2", {}, "🆘 Adrift"), h("p", { class: "dim" }, `A rescue crew is on its way. You are restored on turn ${p.adriftUntil}.`), h("button", { class: "primary", onclick: advancePhase }, "Wait ▶"));
    if (g.phase === "plot") {
        const opts = E.moveOptions(g, ME);
        const sel = ui.selected ? opts.find((o) => o.kind === ui.selected.kind && o.lane === ui.selected.lane) : undefined;
        const buttons = opts.map((o) => h("button", { class: "opt" + (sel === o ? " primary" : ""), disabled: !o.legal, onclick: () => { ui.selected = { kind: o.kind, lane: o.lane }; render(); } }, h("span", { class: "lbl" }, `${moveEmoji(o.kind)} ${o.kind}${o.kind === "hold" ? "" : ` → lane ${o.lane}`}`), h("span", { class: "det" }, `⛽${o.fuel}${o.hull ? ` ❤️−${o.hull}` : ""}${o.legal ? "" : " · " + (o.reason || "")}${o.legal ? ` · worst −${E.worstCaseDamage(g, ME, o)}` : ""}`)));
        const intent = E.level(p, "sensors") >= 3 ? g.players.filter((q) => q.seat !== ME && g.plotted[q.seat]).map((q) => `${q.hull.emoji} ${q.name}: ${g.plotted[q.seat].kind} → lane ${g.plotted[q.seat].lane}`).join(" · ") : "";
        return h("div", { class: "panel phase" }, h("h2", {}, "🧭 Plot your course"), h("p", { class: "dim" }, "Tap a glowing cell or a button. Face-down sites show their deck's odds; face-up ones show the card."), intent ? h("p", { class: "small" }, "🔭 Oracle: " + intent) : null, h("div", { class: "options" }, ...buttons), h("div", { class: "row", style: "margin-top:8px" }, h("button", { class: "primary", disabled: !sel, onclick: confirmPlot }, "Engage ▶"), peekButton()));
    }
    if (g.phase === "arrive") {
        const s = E.site(g, p.col, p.lane);
        const opts = E.arriveOptions(g, ME);
        const parts = [h("h2", {}, p.arrive && p.arrive.held ? "⚓ Holding position" : "🛬 Arrival"), renderCardFace(s)];
        if (opts.length && opts[0].kind === "encounter")
            parts.push(h("h3", {}, "Encounter"));
        else if (opts.length)
            parts.push(h("h3", {}, "Site action"));
        parts.push(h("div", { class: "options" }, ...opts.map((o, i) => h("button", { class: "opt", onclick: () => tryAct(E.arriveChoose(g, ME, o.id)) }, h("span", { class: "lbl" }, `${i + 1}. ${o.emoji} ${o.label}`), h("span", { class: "det" }, o.detail)))));
        if (E.onStation(g, ME))
            parts.push(renderStation());
        if (E.arriveComplete(g, ME))
            parts.push(h("button", { class: "primary", onclick: advancePhase }, "Dock ▶"));
        return h("div", { class: "panel phase" }, ...parts);
    }
    if (g.phase === "dock")
        return renderDock();
    return h("div", { class: "panel phase" }, h("button", { class: "primary", onclick: advancePhase }, "Continue ▶"));
}
function moveEmoji(k) { return k === "hold" ? "⚓" : k === "advance" ? "➡️" : k === "overdrive" ? "⏩" : k === "warp" ? "🌀" : "🛞"; }
function peekButton() {
    const g = ui.game;
    const p = me();
    if (!(E.level(p, "sensors") >= 2 || p.hull.power === "cartographer") || p.peekedThisTurn)
        return null;
    return h("button", { onclick: () => {
            ui.modal = () => {
                const rows = [];
                for (let col = p.col + 1; col <= Math.min(K.COLUMNS, p.col + E.sensorRange(p)); col++)
                    for (let lane = 0; lane < K.LANES; lane++) {
                        const s = E.site(g, col, lane);
                        if (s.card || s.isStation || s.isRim)
                            continue;
                        rows.push(h("button", { class: "opt", onclick: () => { const c = E.peekSite(g, ME, col, lane); ui.modal = null; if (c)
                                toast(`🔭 ${c.emoji} ${c.title}` + (c.hazard ? ` ☠${c.hazard}` : "")); render(); } }, `${typeInfo(s.type).emoji} sector ${col} lane ${lane}`, h("span", { class: "det" }, typeInfo(s.type).name)));
                    }
                return h("div", { class: "panel modal" }, h("h2", {}, "🔭 Peek a face-down site"), h("div", { class: "options" }, ...rows), h("button", { onclick: () => { ui.modal = null; render(); } }, "Close"));
            };
            render();
        } }, "🔭 Peek");
}
function renderCardFace(s) {
    if (s.isRim)
        return h("div", { class: "card-face" }, siteSprite(s, 96, "face"), h("div", { class: "title" }, "🌌 The Outer Rim"), h("div", { class: "flavour" }, "Past the last planet there is only the dark, and you crossed it."));
    if (s.isStation)
        return h("div", { class: "card-face" }, siteSprite(s, 96, "face"), h("div", { class: "title" }, "🏪 Waystation"), h("div", { class: "flavour" }, typeInfo("station").blurb));
    const c = s.card;
    if (!c)
        return h("div", { class: "card-face" }, siteSprite(s, 96, "face"), h("div", { class: "title" }, `${typeInfo(s.type).emoji} ${typeInfo(s.type).name}`), h("div", { class: "flavour" }, "Face down."));
    const tags = [];
    if (c.hazard)
        tags.push(h("span", { class: "tag haz" }, `☠ hazard ${c.hazard}`));
    if (c.alien)
        tags.push(h("span", { class: "tag alien" }, `${E.ALIEN_BY_ID[c.alien.species].emoji} ${E.ALIEN_BY_ID[c.alien.species].name}${c.alien.strength ? " · strength " + c.alien.strength : ""}${s.alienCleared ? " · cleared" : ""}`));
    if (c.yield)
        tags.push(h("span", { class: "tag" }, Object.entries(c.yield).map(([r, n]) => `${resE(r)} ${n}`).join("  ") + ` · stock ${s.stock}`));
    if (c.discovery)
        tags.push(h("span", { class: "tag tech" }, `🔬 +${c.discovery.data} 📡 ${c.discovery.tokens.map(tokenE).join("")}`));
    if (c.tech)
        tags.push(h("span", { class: "tag tech" }, s.techClaimed ? "🧲 tech (claimed)" : "🧲 tech blueprint"));
    if (c.artifact)
        tags.push(h("span", { class: "tag tech" }, s.artifactClaimed ? "🗝️ artifact (claimed)" : "🗝️ artifact"));
    return h("div", { class: "card-face" }, siteSprite(s, 96, "face"), h("div", { class: "title" }, `${c.emoji} ${c.title}`), h("div", { class: "flavour" }, c.flavour), h("div", {}, ...tags));
}
function tokenE(k) { return k === "physics" ? "🔬" : k === "biology" ? "🧬" : "⚙️"; }
// ---- station ----
function renderStation() {
    const g = ui.game;
    const p = me();
    const base = ["fuel", "rations", "water", "steel"];
    const exch = h("div", { class: "row" }, h("span", { class: "dim" }, "Exchange 2:1 →"), sel(base.concat(["crystal"]), ui.tradeGive, (v) => { ui.tradeGive = v; }), h("span", {}, "for"), sel(base.concat(["crystal"]), ui.tradeGet, (v) => { ui.tradeGet = v; }), numIn(ui.tradeAmount, (v) => { ui.tradeAmount = v; }), h("button", { onclick: () => tryAct(E.stationExchange(g, ME, ui.tradeGive, ui.tradeGet, ui.tradeAmount)) }, "Exchange"));
    const bandRank = { easy: 0, medium: 1, hard: 2 };
    const techs = D.TECH_CARDS.filter((t) => p.owned.indexOf(t.id) < 0 && bandRank[t.band] <= bandRank[E.bandOf(p.col)] + 1).map((t) => h("div", { class: "row small" }, h("span", { style: "flex:1" }, `${t.emoji} ${t.name}`, h("span", { class: "dim" }, ` · ${t.effect}`)), h("button", { disabled: p.res.data < t.brokerCost.data, onclick: () => tryAct(E.brokerBuy(g, ME, t.id, "data"), `Bought ${t.name}`) }, `📡${t.brokerCost.data}`), h("button", { disabled: p.res.crystal < t.brokerCost.crystal, onclick: () => tryAct(E.brokerBuy(g, ME, t.id, "crystal"), `Bought ${t.name}`) }, `💎${t.brokerCost.crystal}`)));
    return h("div", { class: "card-face", style: "margin-top:8px" }, h("h3", {}, "🏪 Station services"), h("div", { class: "row", style: "margin:6px 0" }, h("button", { disabled: p.hp >= E.maxHull(p), onclick: () => tryAct(E.repair(g, ME, 99), "Refitted") }, "🔧 Refit to full (free)"), h("button", { onclick: () => tryAct(E.recruit(g, ME)) }, `👥 Recruit (${p.hull.power === "colony" ? 2 : K.RECRUIT_RATIONS} 🍱)`)), exch, h("h3", { style: "margin-top:8px" }, "Tech broker"), h("div", { class: "options" }, ...techs));
}
function sel(vals, cur, on) {
    const s = h("select", {});
    for (const v of vals) {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = `${resE(v)} ${resInfo(v).label}`;
        if (v === cur)
            o.selected = true;
        s.appendChild(o);
    }
    s.onchange = () => on(s.value);
    return s;
}
function numIn(cur, on) {
    const i = h("input", { type: "number", min: 1, max: 12, value: cur, style: "width:60px" });
    i.oninput = () => on(Math.max(1, parseInt(i.value, 10) || 1));
    return i;
}
// ---- dock ----
function renderDock() {
    const g = ui.game;
    const p = me();
    const installs = p.owned.filter((id) => !E.has(p, id)).map((id) => {
        const t = E.TECH_BY_ID[id];
        const c = E.canInstall(g, ME, id);
        return h("button", { class: "opt", disabled: !c.ok, onclick: () => tryAct(E.install(g, ME, id, !!c.free), `Installed ${t.name}`) }, h("span", { class: "lbl" }, `${t.emoji} ${t.name}`), h("span", { class: "det" }, (c.ok ? (c.free ? "free (Singularity Core)" : costText(t.installCost)) : c.reason || "") + " · " + t.effect));
    });
    const near = E.neighbours(g, ME);
    if (ui.tradeTarget < 0 || !near.some((q) => q.seat === ui.tradeTarget))
        ui.tradeTarget = near.length ? near[0].seat : -1;
    const target = ui.tradeTarget >= 0 ? g.players[ui.tradeTarget] : null;
    const dip = near.length ? h("div", { class: "card-face", style: "margin-top:8px" }, h("h3", {}, "🤝 Diplomacy (one act per turn)"), h("div", { class: "row" }, h("span", { class: "dim" }, "With"), (() => { const s = h("select", {}); for (const q of near) {
        const o = document.createElement("option");
        o.value = String(q.seat);
        o.textContent = `${q.hull.emoji} ${q.name}${E.inPact(p, q) ? " (pact)" : ""}${q.traitor ? " (traitor)" : ""}`;
        if (q.seat === ui.tradeTarget)
            o.selected = true;
        s.appendChild(o);
    } s.onchange = () => { ui.tradeTarget = parseInt(s.value, 10); render(); }; return s; })()), target ? h("div", { class: "row", style: "margin-top:6px" }, h("span", { class: "dim" }, "Trade: give"), sel(E.ALL_RES, ui.tradeGive, (v) => { ui.tradeGive = v; }), h("span", {}, "get"), sel(E.ALL_RES, ui.tradeGet, (v) => { ui.tradeGet = v; }), numIn(ui.tradeAmount, (v) => { ui.tradeAmount = v; }), h("button", { disabled: p.diplomacyThisTurn, onclick: () => tryAct(E.trade(g, ME, ui.tradeTarget, ui.tradeGive, ui.tradeGet, ui.tradeAmount), "Traded") }, "Offer")) : null, target ? h("div", { class: "row", style: "margin-top:6px" }, h("button", { disabled: p.diplomacyThisTurn || E.inPact(p, target), onclick: () => tryAct(E.proposePact(g, ME, ui.tradeTarget), "Pact formed 🤝") }, "🤝 Propose pact"), h("button", { class: "danger", disabled: p.diplomacyThisTurn, onclick: () => tryAct(E.raid(g, ME, ui.tradeTarget, ui.tradeGet)) }, `⚔️ Raid for ${resE(ui.tradeGet)} (attack ${E.attack(p)} vs defense ${E.defense(target)})${E.inPact(p, target) ? " — BETRAYAL" : ""}`), ...target.installed.filter((id) => p.owned.indexOf(id) < 0).slice(0, 3).map((id) => h("button", { disabled: p.diplomacyThisTurn, onclick: () => tryAct(E.techCopy(g, ME, ui.tradeTarget, id, p.res.crystal >= K.TECH_COPY_CRYSTAL ? "crystal" : "data"), "Blueprint copied") }, `📋 Copy ${E.TECH_BY_ID[id].name} (💎${K.TECH_COPY_CRYSTAL}/📡${K.TECH_COPY_DATA})`))) : null, ...g.pendingOffers.filter((o) => o.to === ME).map((o) => h("div", { class: "row", style: "margin-top:6px" }, h("span", {}, `${g.players[o.from].hull.emoji} ${g.players[o.from].name} offers ${o.kind === "pact" ? "a pact" : `${o.giveAmount} ${resE(o.giveRes)} for your ${o.getAmount} ${resE(o.getRes)}`}`), h("button", { class: "primary", onclick: () => tryAct(E.respondOffer(g, ME, o.id, true), "Accepted") }, "Accept"), h("button", { onclick: () => tryAct(E.respondOffer(g, ME, o.id, false)) }, "Decline")))) : h("p", { class: "dim small" }, "No ships in proximity for trade, pacts or raids.");
    const s = E.site(g, p.col, p.lane);
    return h("div", { class: "panel phase" }, h("h2", {}, "🔧 Dock"), h("div", { class: "row" }, h("button", { disabled: p.hp >= E.maxHull(p) || p.res.steel < 1, onclick: () => tryAct(E.repair(g, ME, 1)) }, `🔧 Repair +${p.hull.power === "bulwark" ? 2 : 1} (1 🔩)`), h("button", { disabled: p.minedThisTurn || p.res.steel < K.MINE_STEEL || !!(s && s.mines.length), onclick: () => tryAct(E.layMine(g, ME), "Mine laid") }, `💣 Lay mine (${K.MINE_STEEL} 🔩)`)), h("h3", { style: "margin-top:8px" }, p.installedThisTurn ? "Install (done this turn)" : "Install one blueprint"), installs.length ? h("div", { class: "options" }, ...installs) : h("p", { class: "dim small" }, "No uninstalled blueprints. Find them at derelicts, aliens, brokers, or copy from a partner."), E.onStation(g, ME) ? renderStation() : null, dip, h("button", { class: "primary", style: "margin-top:10px", onclick: advancePhase }, "End turn ▶"));
}
function costText(c) { return Object.entries(c).map(([r, n]) => `${resE(r)}${n}`).join(" ") || "free"; }
// ---- ship panel & rivals ----
function renderShip() {
    const p = me();
    const g = ui.game;
    const tierNow = E.tier(p);
    const flash = tierNow !== ui.lastTier;
    ui.lastTier = tierNow;
    const systems = ["shields", "weapons", "engines", "cargo", "sensors", "lab", "life"];
    const badges = systems.map((sys) => { const l = E.level(p, sys); return h("span", { class: "badge lvl" + l, title: sys }, sysE(sys) + (l ? "" : "·")); });
    const specs = p.installed.filter((id) => E.TECH_BY_ID[id].kind === "specialist").map((id) => h("span", { class: "badge" }, E.TECH_BY_ID[id].emoji + " " + E.TECH_BY_ID[id].name));
    const arts = p.artifacts.map((a) => h("span", { class: "badge" }, D.ARTIFACTS.find((x) => x.id === a).emoji + " " + D.ARTIFACTS.find((x) => x.id === a).name));
    const flags = [];
    if (p.traitor)
        flags.push("🩸 traitor");
    if (p.karrakMarked)
        flags.push("🦂 marked");
    if (p.rescues)
        flags.push(`🆘×${p.rescues}`);
    for (const pc of p.pacts)
        flags.push(`🤝 ${g.players[pc.with].name}`);
    const sc = E.scoreOf(g, p);
    return h("div", { class: "panel ship-panel" }, h("div", { class: "ship-art" + (flash ? " flash" : "") }, hullSprite(p, 192), h("div", { class: "small dim" }, `${p.hull.name} · tier ${tierNow}`)), h("div", { class: "small", style: "margin-top:6px" }, `❤️ ${p.hp}/${E.maxHull(p)}`), h("div", { class: "bar hull" }, h("div", { style: `width:${Math.max(0, 100 * p.hp / E.maxHull(p))}%` })), h("div", { class: "small", style: "margin-top:4px" }, `👥 crew ${p.crew} · 🛡️ def ${E.defense(p)} · ⚔️ atk ${E.attack(p)}`), h("h3", { style: "margin-top:8px" }, "Systems"), h("div", { class: "badges" }, ...badges), specs.length ? h("div", { class: "badges", style: "margin-top:4px" }, ...specs) : null, arts.length ? h("div", { class: "badges", style: "margin-top:4px" }, ...arts) : null, h("h3", { style: "margin-top:8px" }, "Tokens"), h("div", { class: "small" }, `🔬${p.tokens.physics} 🧬${p.tokens.biology} ⚙️${p.tokens.engineering} · ⚔️ bounties ${p.bounties.reduce((a, b) => a + b, 0)} · 👾 ${p.contacted.length} · 🤝 ${p.completedPacts}`), flags.length ? h("div", { class: "small dim", style: "margin-top:4px" }, flags.join(" · ")) : null, h("h3", { style: "margin-top:8px" }, "Score so far"), h("div", { class: "small" }, `${sc.total} — 🧭${sc.distance} 🔧${sc.ship} 🔬${sc.science} ⚔️${sc.military} 💎${sc.commerce} 👾${sc.contact} 👥${sc.crew}${sc.rescues ? ` 🆘${sc.rescues}` : ""}`));
}
function sysE(s) { return { shields: "🛡️", weapons: "⚔️", engines: "🔥", cargo: "📦", sensors: "🔭", lab: "🧪", life: "🌱" }[s]; }
function renderRivals() {
    const g = ui.game;
    const p = me();
    return h("div", { class: "panel" }, h("h3", {}, "Rivals"), ...g.players.filter((q) => q.seat !== ME).map((q) => h("div", { class: "rival", onclick: () => { ui.modal = () => rivalModal(q); render(); } }, E.isAdrift(q, g) ? h("span", { class: "mini" }, "🆘") : hullSprite(q, 48), h("div", {}, h("div", {}, `${q.name} `, h("span", { class: "dim" }, `sector ${q.col} lane ${q.lane} · tier ${E.tier(q)}`)), h("div", { class: "bar hull", style: "margin-top:3px" }, h("div", { style: `width:${Math.max(0, 100 * q.hp / E.maxHull(q))}%` }))), h("span", { class: "small dim" }, `${E.inPact(p, q) ? "🤝" : ""}${q.traitor ? "🩸" : ""}${q.lastRaidedBy === ME ? "" : ""}${p.lastRaidedBy === q.seat ? "⚔️!" : ""} ${E.scoreOf(g, q).total}`))));
}
function rivalModal(q) {
    const g = ui.game;
    const p = me();
    const showCargo = E.inPact(p, q);
    return h("div", { class: "panel modal" }, h("h2", {}, `${q.hull.emoji} ${q.name} — ${q.hull.name}`), h("p", { class: "dim small" }, q.hull.powerText), h("div", { class: "small" }, `❤️ ${q.hp}/${E.maxHull(q)} · 👥 ${q.crew} · 🛡️ ${E.defense(q)} · ⚔️ ${E.attack(q)} · score ${E.scoreOf(g, q).total}`), h("h3", { style: "margin-top:8px" }, "Installed"), h("div", { class: "badges" }, ...q.installed.map((id) => h("span", { class: "badge" }, E.TECH_BY_ID[id].emoji + " " + E.TECH_BY_ID[id].name))), h("h3", { style: "margin-top:8px" }, showCargo ? "Cargo (shared by pact)" : "Cargo"), h("div", { class: "small" }, showCargo ? D.RESOURCES.map((r) => `${r.emoji}${q.res[r.id]}`).join(" ") : "Unknown — form a pact to see it."), h("button", { style: "margin-top:10px", onclick: () => { ui.modal = null; render(); } }, "Close"));
}
function renderLog() {
    const g = ui.game;
    return h("div", { class: "panel" }, h("h3", {}, "Log"), h("div", { class: "log" }, ...g.log.slice(-40).reverse().map((l) => h("div", {}, l))));
}
// ---- flow ----
function confirmPlot() {
    const g = ui.game;
    if (!ui.selected)
        return;
    if (!tryAct(E.plotCourse(g, ME, ui.selected)))
        return;
    ui.selected = null;
    const r = E.resolveMoves(g);
    if (!r.success) {
        toast(r.reason || "");
        return;
    }
    render();
}
function advancePhase() {
    const g = ui.game;
    const p = me();
    if (g.phase === "plot") {
        if (E.isAdrift(p, g)) {
            E.plotCourse(g, ME, { kind: "hold", lane: p.lane });
            E.resolveMoves(g);
        }
        render();
        return;
    }
    if (g.phase === "arrive") {
        const r = E.finishArrive(g);
        if (!r.success) {
            toast(r.reason || "");
            return;
        }
        render();
        return;
    }
    if (g.phase === "dock") {
        const r = E.endTurn(g);
        if (!r.success) {
            toast(r.reason || "");
            return;
        }
        const ph = g.phase;
        if (ph === "bandSummary")
            ui.screen = "summary";
        if (ph === "gameEnd")
            ui.screen = "end";
        render();
        return;
    }
    if (g.phase === "bandSummary") {
        E.continueFromSummary(g);
        ui.screen = "bridge";
        render();
        return;
    }
}
// ---- summary & end ----
function renderSummary() {
    const g = ui.game;
    return h("div", { class: "panel" }, h("h2", {}, `🛰️ End of the ${g.bandSummaryFor} band`), scoreTable(g.players.map((p) => E.scoreOf(g, p)).sort((a, b) => b.total - a.total), false), h("div", { class: "small dim", style: "margin-top:8px" }, ...g.players.map((p) => h("div", {}, `${p.hull.emoji} ${p.name}: sector ${p.col}, ❤️ ${p.hp}/${E.maxHull(p)}, 👥 ${p.crew}, ${p.installed.length} cards, ${p.rescues} rescue${p.rescues === 1 ? "" : "s"}`))), h("button", { class: "primary", style: "margin-top:10px", onclick: advancePhase }, "Onward ▶"));
}
function renderEnd() {
    const g = ui.game;
    const scores = g.finalScores || E.computeScores(g);
    return h("div", { class: "panel" }, h("h2", {}, "🏁 Final scoring"), h("p", { class: "dim" }, `${g.players[scores[0].seat].hull.emoji} ${scores[0].name} wins with ${scores[0].total} points.`), scoreTable(scores, true), h("button", { class: "primary", style: "margin-top:10px", onclick: () => { ui.screen = "setup"; ui.game = null; render(); } }, "New voyage"));
}
function scoreTable(scores, final) {
    const g = ui.game;
    const head = h("tr", {}, ...["Ship", "🧭", "🌌", "🔧", "🔬", "⚔️", "💎", "👾", "👥", "🆘", "Total"].map((t) => h("th", {}, t)));
    const rows = scores.map((s, i) => h("tr", { class: final && i === 0 ? "winner" : "" }, h("td", {}, `${g.players[s.seat].hull.emoji} ${s.name}${s.seat === ME ? " (you)" : ""}`), ...[s.distance, s.rim, s.ship, s.science, s.military, s.commerce, s.contact, s.crew, s.rescues, s.total].map((v) => h("td", {}, String(v)))));
    return h("div", { style: "overflow-x:auto" }, h("table", { class: "scores" }, head, ...rows));
}
// ---- keyboard ----
document.addEventListener("keydown", (ev) => {
    ui.keyboard = true;
    const g = ui.game;
    if (!g || ui.screen !== "bridge")
        return;
    if (ev.key === "Escape") {
        ui.modal = null;
        render();
        return;
    }
    if (g.phase === "plot") {
        const p = me();
        const opts = E.moveOptions(g, ME).filter((o) => o.legal);
        const cur = ui.selected || { kind: "advance", lane: p.lane };
        if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
            const o = opts.filter((x) => x.kind === "advance" && x.lane < cur.lane).sort((a, b) => b.lane - a.lane)[0];
            if (o) {
                ui.selected = { kind: o.kind, lane: o.lane };
                render();
            }
        }
        if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") {
            const o = opts.filter((x) => x.kind === "advance" && x.lane > cur.lane).sort((a, b) => a.lane - b.lane)[0];
            if (o) {
                ui.selected = { kind: o.kind, lane: o.lane };
                render();
            }
        }
        if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") {
            const o = opts.find((x) => x.kind === "advance" && x.lane === p.lane) || opts.find((x) => x.kind === "coast");
            if (o) {
                ui.selected = { kind: o.kind, lane: o.lane };
                render();
            }
        }
        if (ev.key === "h" || ev.key === "H") {
            ui.selected = { kind: "hold", lane: p.lane };
            render();
        }
        if (ev.key === "o" || ev.key === "O") {
            const o = opts.find((x) => x.kind === "overdrive");
            if (o) {
                ui.selected = { kind: o.kind, lane: o.lane };
                render();
            }
        }
        if (ev.key === "Enter" && ui.selected)
            confirmPlot();
    }
    else if (g.phase === "arrive") {
        const n = parseInt(ev.key, 10);
        const opts = E.arriveOptions(g, ME);
        if (n >= 1 && n <= opts.length)
            tryAct(E.arriveChoose(g, ME, opts[n - 1].id));
        else if (ev.key === "Enter" && E.arriveComplete(g, ME))
            advancePhase();
    }
    else if (g.phase === "dock" && ev.key === "Enter")
        advancePhase();
});
// ---- render root ----
function render() {
    const app = document.getElementById("app");
    app.innerHTML = "";
    if (ui.screen === "setup" || !ui.game) {
        app.appendChild(renderSetup());
        return;
    }
    if (ui.screen === "summary") {
        app.appendChild(renderStatus());
        app.appendChild(renderSummary());
        return;
    }
    if (ui.screen === "end") {
        app.appendChild(renderStatus());
        app.appendChild(renderEnd());
        return;
    }
    app.appendChild(renderStatus());
    app.appendChild(renderStrip());
    app.appendChild(h("div", { class: "bridge" }, h("div", { style: "display:flex;flex-direction:column;gap:10px;min-width:0" }, renderPhase(), renderLog()), h("div", { style: "display:flex;flex-direction:column;gap:10px" }, renderShip(), renderRivals())));
    if (ui.modal)
        app.appendChild(h("div", { class: "modal-bg", onclick: (ev) => { if (ev.target === ev.currentTarget) {
                ui.modal = null;
                render();
            } } }, ui.modal()));
}
render();
