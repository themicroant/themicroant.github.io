/* Tactics Battle - battle screen: rendering, input, animation and battle flow (SPEC 9-13, 24, 25). */
import * as TB from '../logic.js';
import { $, badgeHtml, closeModal, defeatModal, h, hpColor, isFading, isModalOpen, menuModal, MOVE_NAMES, portrait, q, rulesModal, showScreen, sleep, spriteImg, tileEl, } from '../ui.js';
const TS = 60;
let G = null;
let O = null;
let danger = false; // persists across retries and battles (11.2)
let wired = false;
function game() {
    if (!G)
        throw new Error('No battle in progress');
    return G;
}
function newGame(o) {
    return {
        state: TB.createState(o.chapter, o.team, o.levels),
        sel: null, peek: null, fc: null, hover: null, focus: null,
        stops: [], targets: {}, assist: {}, info: null, busy: true, els: {}, hlEls: {},
    };
}
/* ---------------- board build ---------------- */
function buildTiles(g) {
    const t = $('tiles');
    t.innerHTML = '';
    const hl = $('hl');
    hl.innerHTML = '';
    $('fx').innerHTML = '';
    g.hlEls = {};
    for (let r = 0; r < TB.ROWS; r++) {
        for (let c = 0; c < TB.COLS; c++) {
            t.appendChild(tileEl(TB.terrainAt(g.state, c, r).key, c, r));
            const e = h('div', 'hlc');
            e.style.left = c * TS + 'px';
            e.style.top = r * TS + 'px';
            hl.appendChild(e);
            g.hlEls[TB.key(c, r)] = e;
        }
    }
}
function buildUnits(g) {
    const layer = $('units');
    layer.innerHTML = '';
    g.els = {};
    g.state.units.forEach((u) => {
        const el = h('div', 'unit ' + u.side);
        el.innerHTML = '<div class="inner"><div class="base"></div><div class="sprite"></div>' +
            badgeHtml(u.weapon) + '<div class="mhp"><i></i></div></div>';
        spriteImg(u, q(el, '.sprite'));
        layer.appendChild(el);
        g.els[u.uid] = el;
        updateUnitEl(u);
    });
}
function updateUnitEl(u) {
    const g = game();
    const el = g.els[u.uid];
    el.style.left = u.col * TS + 'px';
    el.style.top = u.row * TS + 'px';
    el.style.zIndex = String(10 + u.row);
    const p = Math.max(0, u.hp) / u.maxHp;
    const bar = q(el, '.mhp i');
    bar.style.width = p * 100 + '%';
    bar.style.background = hpColor(p);
    el.classList.toggle('done', u.side === 'player' && u.done);
    el.classList.toggle('selected', g.sel === u);
    el.classList.toggle('dead', !u.alive);
}
function updateAllUnitEls() { game().state.units.forEach(updateUnitEl); }
/* ---------------- highlights ---------------- */
function findUnit(uid) { return game().state.units.find((u) => u.uid === uid); }
function refreshHL() {
    const g = game();
    const hl = g.hlEls;
    for (const k in hl)
        hl[k].className = 'hlc';
    const dg = danger ? TB.dangerTiles(g.state) : null;
    const u = g.sel || g.peek;
    if (u && u.alive) {
        const stops = g.sel ? g.stops : TB.reach(g.state, u).stops;
        const atk = TB.attackTiles(u, stops);
        const asst = g.sel && TB.isHealer(u) ? TB.assistTiles(stops) : {};
        const mv = {};
        if (!g.sel || !g.sel.moved)
            stops.forEach((s) => { mv[TB.key(s.col, s.row)] = true; });
        for (const k in hl) {
            if (mv[k])
                hl[k].classList.add('mv');
            else if (asst[k])
                hl[k].classList.add('asst');
            else if (atk[k])
                hl[k].classList.add('atk');
        }
        if (g.sel) {
            Object.keys(g.targets).forEach((id) => {
                const e = findUnit(id);
                if (e)
                    hl[TB.key(e.col, e.row)].classList.add('tgt');
            });
            Object.keys(g.assist).forEach((id) => {
                const e = findUnit(id);
                if (e)
                    hl[TB.key(e.col, e.row)].classList.add('atgt');
            });
            hl[TB.key(u.col, u.row)].classList.add('sel');
        }
    }
    if (dg)
        for (const k in dg)
            if (hl[k])
                hl[k].classList.add('danger');
    if (g.fc)
        hl[TB.key(g.fc.tile.col, g.fc.tile.row)].classList.add('ghost');
}
/* ---------------- top panel ---------------- */
function statCell(label, val, base) {
    return '<div class="stat"><span>' + label + '</span><b' + (val > base ? ' class="up"' : '') + '>' + val + '</b></div>';
}
function hpPct(u) { return u.hp / u.maxHp * 100; }
function renderInfo(u) {
    const g = game();
    const top = $('top');
    const fort = TB.terrainAt(g.state, u.col, u.row).key === 'fort';
    const def = fort ? TB.defStat(u, false, 'fort') : u.def;
    const res = fort ? TB.defStat(u, true, 'fort') : u.res;
    const heal = TB.isHealer(u) ? '<div class="spc">Heal &nbsp;<b>+' + TB.healPower(u) + '</b></div>' : '';
    top.innerHTML = '<div class="info"><div class="pf"></div><div class="meta">' +
        '<div class="nm">' + u.name + '<span class="lv">Lv ' + u.level + '</span></div>' +
        '<div class="sub">' + badgeHtml(u.weapon) + '<span>' + u.weapon + '</span><span>· ' + MOVE_NAMES[u.moveType] + '</span></div>' +
        '<div class="hprow"><span class="lbl">HP</span><div class="hpbar"><div class="fill" style="width:' + hpPct(u) +
        '%;background:' + hpColor(u.hp / u.maxHp) + '"></div></div><span>' + u.hp + '/' + u.maxHp + '</span></div>' +
        '<div class="stats">' + statCell('Atk', u.atk, u.atk) + statCell('Spd', u.spd, u.spd) +
        statCell('Def', def, u.def) + statCell('Res', res, u.res) + '</div>' +
        '<div class="spc">' + TB.SPECIAL_NAME + ' &nbsp;<b>' + (u.cd === 0 ? 'READY' : 'CD ' + u.cd + '/' + u.cdMax) +
        '</b>' + (fort ? ' &nbsp;· Fort +20%' : '') + '</div>' + heal + '</div></div>';
    q(top, '.pf').replaceWith(portrait(u));
}
function renderIdle() {
    const ch = game().state.chapter;
    $('top').innerHTML = '<div class="idle"><div class="cap">CHAPTER ' + ch.num + '</div><div class="cname">' + ch.name +
        '</div><div class="div"></div><div class="olbl">Objective</div><div class="otxt">' + ch.objective + '</div></div>';
}
function forecastCol(u, sim, who) {
    const isA = who === 'a';
    const hits = isA ? sim.hitsA : sim.hitsD;
    const dmg = isA ? sim.dmgA : sim.dmgD;
    const hpNow = u.hp, hpAfter = isA ? sim.hp.a : sim.hp.d;
    const adv = isA ? sim.adv : -sim.adv;
    const arrow = adv > 0 ? '<span class="arrow up" title="Advantage">▲</span>' : adv < 0 ? '<span class="arrow down" title="Disadvantage">▼</span>' : '';
    const notes = [];
    if (adv)
        notes.push('Triangle ' + (adv > 0 ? '<b>+20%</b> Atk' : '<b>−20%</b> Atk'));
    if (isA && sim.bowBonus)
        notes.push('<b>×1.5</b> vs flying');
    if (u.cd === 0)
        notes.push(TB.SPECIAL_NAME + ' <b>READY</b>');
    const tt = TB.terrainAt(game().state, isA ? sim.atile.col : u.col, isA ? sim.atile.row : u.row);
    if (tt.key === 'fort')
        notes.push('Fort +20% Def/Res');
    let dmgHtml;
    if (hits > 0)
        dmgHtml = '<span class="num">' + dmg + '</span>' + (hits > 1 ? '<span class="x2">×' + hits + '</span>' : '');
    else
        dmgHtml = '<span class="na">—</span>';
    const pNow = hpNow / u.maxHp * 100, pAfter = hpAfter / u.maxHp * 100;
    return '<div class="col"><div class="head"><div class="pf"></div><div style="min-width:0"><div class="nm">' + u.name + '</div>' +
        '<div class="wline">' + badgeHtml(u.weapon) + arrow + '<span>' + u.weapon + '</span></div></div></div>' +
        '<div class="hpnums">HP ' + hpNow + ' <span class="to">→</span> <span class="' + (hpAfter <= 0 ? 'dead' : 'to') + '">' + hpAfter + '</span></div>' +
        '<div class="hpbar"><div class="lost" style="width:' + pNow + '%"></div><div class="fill" style="width:' + pAfter + '%;background:' + hpColor(hpAfter / u.maxHp) + '"></div></div>' +
        '<div class="dmg"><span class="lbl">Dmg</span>' + dmgHtml + '</div>' +
        '<div class="note">' + (notes.join('<br>') || '&nbsp;') + '</div></div>';
}
function healForecastCols(healer, target, amount) {
    const after = target.hp + amount;
    const healerCol = '<div class="col"><div class="head"><div class="pf"></div><div style="min-width:0"><div class="nm">' + healer.name + '</div>' +
        '<div class="wline">' + badgeHtml(healer.weapon) + '<span>' + healer.weapon + '</span></div></div></div>' +
        '<div class="hpnums">HP ' + healer.hp + '/' + healer.maxHp + '</div>' +
        '<div class="hpbar"><div class="fill" style="width:' + hpPct(healer) + '%;background:' + hpColor(healer.hp / healer.maxHp) + '"></div></div>' +
        '<div class="dmg"><span class="lbl">Assist</span><span class="healw">Heal</span></div>' +
        '<div class="note">&nbsp;</div></div>';
    const targetCol = '<div class="col"><div class="head"><div class="pf"></div><div style="min-width:0"><div class="nm">' + target.name + '</div>' +
        '<div class="wline">' + badgeHtml(target.weapon) + '<span>' + target.weapon + '</span></div></div></div>' +
        '<div class="hpnums">HP ' + target.hp + ' <span class="to">→</span> <span class="gain">' + after + '</span></div>' +
        '<div class="hpbar"><div class="gainbar" style="width:' + after / target.maxHp * 100 + '%"></div><div class="fill" style="width:' +
        hpPct(target) + '%;background:' + hpColor(target.hp / target.maxHp) + '"></div></div>' +
        '<div class="dmg"><span class="lbl">Heal</span><span class="num heal">+' + amount + '</span></div>' +
        '<div class="note">&nbsp;</div></div>';
    return healerCol + targetCol;
}
function renderForecast(fc) {
    const top = $('top');
    if (fc.kind === 'attack') {
        top.innerHTML = '<div class="fc">' + forecastCol(fc.att, fc.sim, 'a') + forecastCol(fc.def, fc.sim, 'd') + '<div class="vs">VS</div></div>';
        const pfs = top.querySelectorAll('.pf');
        pfs[0].replaceWith(portrait(fc.att));
        pfs[1].replaceWith(portrait(fc.def));
    }
    else {
        top.innerHTML = '<div class="fc">' + healForecastCols(fc.healer, fc.target, fc.amount) + '<div class="vs">✚</div></div>';
        const pfs = top.querySelectorAll('.pf');
        pfs[0].replaceWith(portrait(fc.healer));
        pfs[1].replaceWith(portrait(fc.target));
    }
}
function renderTop() {
    const g = game();
    if (g.fc) {
        renderForecast(g.fc);
        return;
    }
    const u = g.hover || g.focus || g.sel || g.peek;
    if (u && u.alive) {
        renderInfo(u);
        return;
    }
    renderIdle();
}
/* ---------------- bottom bar ---------------- */
function renderBottom() {
    const g = game();
    $('turn').textContent = 'Turn ' + g.state.turn;
    const ph = $('phase');
    ph.className = g.state.phase;
    ph.textContent = g.state.phase === 'player' ? 'Player Phase' : 'Enemy Phase';
    const left = TB.living(g.state, 'player').filter((u) => !u.done).length;
    const foes = TB.living(g.state, 'enemy').length;
    $('remain').textContent = g.state.phase === 'player' ? 'Ready: ' + left + '  ·  Foes: ' + foes : 'Foes: ' + foes;
    $('btnEnd').disabled = g.busy || g.state.phase !== 'player' || !!g.state.over;
    $('btnDanger').classList.toggle('on', danger);
}
function refreshAll() { refreshHL(); renderTop(); renderBottom(); }
/* ---------------- effects ---------------- */
function floatText(col, row, text, cls) {
    const f = h('div', 'float ' + (cls || ''), text);
    f.style.left = col * TS + 'px';
    f.style.top = (row * TS - 4) + 'px';
    $('fx').appendChild(f);
    const a = f.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-18px)', opacity: 1, offset: 0.5 },
        { transform: 'translateY(-34px)', opacity: 0 }], { duration: 900, easing: 'ease-out' });
    a.onfinish = () => { f.remove(); };
}
function lunge(att, def) {
    const inner = q(game().els[att.uid], '.inner');
    const dx = Math.sign(def.col - att.col), dy = Math.sign(def.row - att.row);
    inner.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(' + dx * 16 + 'px,' + dy * 16 + 'px)', offset: 0.4 },
        { transform: 'translate(0,0)' }], { duration: 300, easing: 'ease-in-out' });
    return sleep(190);
}
function shake(u) {
    q(game().els[u.uid], '.inner').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 220 });
}
function healPulse(col, row) {
    const p = h('div', 'healpulse');
    p.style.left = col * TS + 'px';
    p.style.top = row * TS + 'px';
    $('fx').appendChild(p);
    const a = p.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.4 }, { opacity: 0 }], { duration: 400, easing: 'ease-in-out' });
    a.onfinish = () => { p.remove(); };
}
async function moveAlong(g, u, path) {
    for (let i = 1; i < path.length; i++) {
        u.col = path[i].col;
        u.row = path[i].row;
        updateUnitEl(u);
        await sleep(120);
        if (g !== G)
            return;
    }
    updateUnitEl(u);
}
async function runCombat(g, att, def, sim) {
    for (const ev of sim.events) {
        const X = ev.who === 'a' ? att : def, Y = ev.who === 'a' ? def : att;
        await lunge(X, Y);
        if (g !== G)
            return;
        Y.hp = ev.targetHp;
        X.cd = ev.who === 'a' ? ev.cdA : ev.cdD;
        Y.cd = ev.who === 'a' ? ev.cdD : ev.cdA;
        shake(Y);
        if (ev.special)
            floatText(X.col, X.row, TB.SPECIAL_NAME + '!', 'sp');
        if (ev.dmg > 0)
            floatText(Y.col, Y.row, String(ev.dmg), ev.special ? 'sp' : '');
        else
            floatText(Y.col, Y.row, 'No damage', 'nodmg');
        if (Y.hp <= 0)
            Y.alive = false;
        updateUnitEl(Y);
        renderTop();
        await sleep(Y.hp <= 0 ? 650 : 380);
        if (g !== G)
            return;
    }
    TB.applyResult(att, def, sim); // ensures the final state is consistent
    updateUnitEl(att);
    updateUnitEl(def);
    await sleep(100);
}
async function playHeal(g, healer, target) {
    healPulse(target.col, target.row);
    const n = TB.applyHeal(healer, target);
    floatText(target.col, target.row, '+' + n, 'heal');
    updateUnitEl(target);
    renderTop();
    await sleep(400);
    if (g !== G)
        return;
    await sleep(500);
}
/* ---------------- player selection / input ---------------- */
function clearSel(g) {
    g.sel = null;
    g.peek = null;
    g.fc = null;
    g.stops = [];
    g.targets = {};
    g.assist = {};
    g.info = null;
}
function computeOptions(g, u) {
    if (u.moved) {
        g.stops = [{ col: u.col, row: u.row, cost: 0 }];
    }
    else {
        g.info = TB.reach(g.state, u);
        g.stops = g.info.stops;
    }
    g.targets = TB.targetsFrom(g.state, u, g.stops);
    g.assist = TB.healTargets(g.state, u, g.stops);
}
function selectUnit(u) {
    const g = game();
    clearSel(g);
    g.sel = u;
    computeOptions(g, u);
    updateAllUnitEls();
    refreshAll();
}
function peekUnit(u) {
    const g = game();
    clearSel(g);
    g.peek = u;
    updateAllUnitEls();
    refreshAll();
}
function deselect() {
    const g = game();
    clearSel(g);
    updateAllUnitEls();
    refreshAll();
}
function showAttackForecast(att, def) {
    const g = game();
    const best = g.targets[def.uid];
    const tile = { col: best.col, row: best.row };
    g.fc = { kind: 'attack', att, def, tile, sim: TB.simulate(g.state, att, def, tile) };
    refreshAll();
}
function showHealForecast(healer, target) {
    const g = game();
    const best = g.assist[target.uid];
    g.fc = { kind: 'heal', healer, target, tile: { col: best.col, row: best.row }, amount: TB.healAmount(healer, target) };
    refreshAll();
}
async function finishUnit(g, u) {
    u.done = true;
    u.moved = true;
    clearSel(g);
    updateAllUnitEls();
    refreshAll();
    if (TB.checkEnd(g.state)) {
        endGame(g);
        return;
    }
    if (TB.living(g.state, 'player').every((p) => p.done)) {
        g.busy = true;
        renderBottom();
        await sleep(450);
        if (g !== G)
            return;
        await endPlayerPhase(g);
    }
}
/* walk to the forecast's from-tile if the unit has not moved yet */
async function walkToForecastTile(g, u, tile) {
    const info = g.info;
    if (!u.moved && info && (u.col !== tile.col || u.row !== tile.row)) {
        const path = TB.pathTo(info, tile.col, tile.row);
        g.stops = [];
        g.targets = {};
        g.assist = {};
        refreshHL();
        await moveAlong(g, u, path);
    }
    u.moved = true;
    g.stops = [];
    g.targets = {};
    g.assist = {};
    refreshHL();
}
async function confirmForecast(g, fc) {
    g.busy = true;
    g.fc = null;
    if (fc.kind === 'attack') {
        const att = fc.att, def = fc.def;
        await walkToForecastTile(g, att, fc.tile);
        if (g !== G)
            return;
        const sim = TB.simulate(g.state, att, def, { col: att.col, row: att.row });
        g.focus = null;
        await runCombat(g, att, def, sim);
        if (g !== G)
            return;
        g.busy = false;
        await finishUnit(g, att);
    }
    else {
        await walkToForecastTile(g, fc.healer, fc.tile);
        if (g !== G)
            return;
        await playHeal(g, fc.healer, fc.target);
        if (g !== G)
            return;
        g.busy = false;
        await finishUnit(g, fc.healer);
    }
}
async function doMove(g, u, c, r) {
    if (!g.info)
        return;
    g.busy = true;
    const path = TB.pathTo(g.info, c, r);
    g.stops = [];
    g.targets = {};
    g.assist = {};
    refreshHL();
    await moveAlong(g, u, path);
    if (g !== G)
        return;
    u.moved = true;
    computeOptions(g, u);
    g.busy = false;
    if (Object.keys(g.targets).length === 0 && Object.keys(g.assist).length === 0) {
        await finishUnit(g, u);
        return;
    }
    updateAllUnitEls();
    refreshAll();
}
function isBusy(g) {
    return g.busy || !!g.state.over || g.state.phase !== 'player' || isModalOpen() || isFading();
}
function onTap(c, r) {
    const g = G;
    if (!g || isBusy(g))
        return;
    const u = TB.unitAt(g.state, c, r);
    if (g.fc) {
        const tgt = g.fc.kind === 'attack' ? g.fc.def : g.fc.target;
        if (u && u === tgt) {
            void confirmForecast(g, g.fc);
            return;
        }
        g.fc = null;
        refreshAll();
    }
    const sel = g.sel;
    if (sel) {
        if (u === sel) {
            void finishUnit(g, sel);
            return;
        }
        if (u && g.targets[u.uid]) {
            showAttackForecast(sel, u);
            return;
        }
        if (u && g.assist[u.uid]) {
            showHealForecast(sel, u);
            return;
        }
        if (u && u.side === 'enemy') {
            if (!sel.moved)
                peekUnit(u);
            return;
        }
        if (u) {
            if (!sel.moved && !u.done)
                selectUnit(u);
            return;
        }
        if (!sel.moved) {
            if (g.stops.some((s) => s.col === c && s.row === r)) {
                void doMove(g, sel, c, r);
                return;
            }
            deselect();
        }
        return;
    }
    if (u && u.side === 'player' && !u.done) {
        selectUnit(u);
        return;
    }
    if (u) {
        if (g.peek === u)
            deselect();
        else
            peekUnit(u);
        return;
    }
    if (g.peek)
        deselect();
}
/* ---------------- phases ---------------- */
async function banner(text, cls) {
    const b = $('banner');
    b.className = cls;
    const label = b.firstElementChild;
    if (label)
        label.textContent = text;
    b.style.display = 'flex';
    const a = b.animate([{ transform: 'translateX(-110%)', opacity: 0.4 }, { transform: 'translateX(0)', opacity: 1, offset: 0.25 },
        { transform: 'translateX(0)', opacity: 1, offset: 0.7 }, { transform: 'translateX(110%)', opacity: 0.4 }], { duration: 1300, easing: 'ease-in-out', fill: 'forwards' });
    // Hide on the animation's own completion so the banner never flashes at centre afterwards.
    try {
        await a.finished;
    }
    catch { /* cancelled */ }
    b.style.display = 'none';
    a.cancel();
}
async function endPlayerPhase(g) {
    if (g.state.over)
        return;
    g.busy = true;
    clearSel(g);
    g.state.phase = 'enemy';
    updateAllUnitEls();
    refreshAll();
    await banner('Enemy Phase', 'enemy');
    if (g !== G)
        return;
    const enemies = TB.living(g.state, 'enemy');
    for (const e of enemies) {
        if (!e.alive)
            continue;
        g.focus = e;
        renderTop();
        await sleep(350);
        if (g !== G)
            return;
        const plan = TB.planEnemy(g.state, e);
        if (plan.path.length > 1) {
            await moveAlong(g, e, plan.path);
            if (g !== G)
                return;
        }
        if (plan.target) {
            await sleep(150);
            if (g !== G)
                return;
            if (plan.heal)
                await playHeal(g, e, plan.target);
            else
                await runCombat(g, e, plan.target, TB.simulate(g.state, e, plan.target, { col: e.col, row: e.row }));
            if (g !== G)
                return;
        }
        renderBottom();
        if (TB.checkEnd(g.state)) {
            g.focus = null;
            endGame(g);
            return;
        }
        await sleep(250);
        if (g !== G)
            return;
    }
    g.focus = null;
    g.state.turn++;
    g.state.phase = 'player';
    g.state.units.forEach((u) => { u.done = false; u.moved = false; updateUnitEl(u); });
    refreshAll();
    await banner('Player Phase', 'player');
    if (g !== G)
        return;
    g.busy = false;
    refreshAll();
}
function endGame(g) {
    g.busy = true;
    g.sel = null;
    g.peek = null;
    g.fc = null;
    renderBottom();
    const o = O;
    if (!o)
        return;
    if (g.state.over === 'win') {
        o.onWin();
        setTimeout(() => {
            if (g !== G)
                return;
            void banner('Victory', 'victory').then(() => { if (g === G)
                o.onVictoryDone(); });
        }, 700);
    }
    else {
        setTimeout(() => {
            if (g !== G)
                return;
            defeatModal(() => { void start(false); }, () => { leave(); });
        }, 700);
    }
}
/* abandon the battle (Menu / Defeat -> Back to Chapters) */
function leave() {
    G = null;
    closeModal();
    if (O)
        O.onExit();
}
async function start(fade) {
    const o = O;
    if (!o)
        return;
    closeModal();
    const g = newGame(o);
    G = g;
    $('banner').style.display = 'none';
    buildTiles(g);
    buildUnits(g);
    refreshAll();
    if (fade)
        await showScreen('battle');
    if (g !== G)
        return;
    await banner('Player Phase', 'player');
    if (g !== G)
        return;
    g.busy = false;
    refreshAll();
}
/* ---------------- wiring ---------------- */
function tileFromEvent(e) {
    const rect = $('map').getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / (rect.width / TB.COLS));
    const r = Math.floor((e.clientY - rect.top) / (rect.height / TB.ROWS));
    if (c < 0 || r < 0 || c >= TB.COLS || r >= TB.ROWS)
        return null;
    return { col: c, row: r };
}
function wire() {
    $('map').addEventListener('click', (e) => {
        const t = tileFromEvent(e);
        if (t)
            onTap(t.col, t.row);
    });
    $('map').addEventListener('pointermove', (e) => {
        const g = G;
        if (!g || e.pointerType !== 'mouse' || g.busy || g.fc || isModalOpen())
            return;
        const t = tileFromEvent(e);
        const u = t ? TB.unitAt(g.state, t.col, t.row) : null;
        if (u !== g.hover) {
            g.hover = u;
            renderTop();
        }
    });
    $('map').addEventListener('pointerleave', () => {
        const g = G;
        if (g && g.hover) {
            g.hover = null;
            renderTop();
        }
    });
    $('btnEnd').addEventListener('click', () => {
        const g = G;
        if (!g || isBusy(g))
            return;
        void endPlayerPhase(g);
    });
    $('btnDanger').addEventListener('click', () => {
        if (!G)
            return;
        danger = !danger;
        refreshAll();
    });
    $('btnMenu').addEventListener('click', () => {
        const g = G;
        if (!g || isModalOpen() || isFading())
            return;
        if (g.busy && g.state.over !== 'lose')
            return;
        menuModal(() => { void start(false); }, () => { leave(); });
    });
    $('btnHelp').addEventListener('click', () => {
        if (!G || isModalOpen() || isFading())
            return;
        rulesModal();
    });
}
/* Entry point: build the chapter's battle and fade the battle screen in. */
export function show(o) {
    O = o;
    if (!wired) {
        wired = true;
        wire();
    }
    return start(true);
}
/* leave any battle in progress without callbacks (used when the game returns to another screen) */
export function discard() { G = null; }
//# sourceMappingURL=battle.js.map