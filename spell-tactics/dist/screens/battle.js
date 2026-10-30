import { alive, beginPhase, canUse, createBattle, endPhase, forecast, H, isValidTarget, moveTiles, moveUnit, objectiveText, rangeTiles, TERRAIN_NAME, terrainAt, threatTiles, tileKey, unitAt, unkey, useItem, useSkill, W, waitUnit, dist, } from '../battle/engine.js';
import { planFor } from '../battle/ai.js';
import { STATUS } from '../data/statuses.js';
import { heroOf } from '../data/heroes.js';
import { itemOf } from '../data/items.js';
import { describeNumbers } from '../rules.js';
import { artEl, bar, button, h, modal, portraitEl, SCHOOL_COLOR, showScreen, sleep } from '../ui.js';
export const TILE = 45;
let b;
let opts;
let mode = 'idle';
let sel = null;
let skill = null;
let aim = null;
let inspect = null;
let danger = false;
let ended = false;
let root, topEl, objEl, mapEl, hlEl, unitsEl;
let fxEl, barEl, bannerEl;
const unitEls = new Map();
export function show(o) {
    opts = o;
    b = createBattle(o.site, o.heroes, o.bag);
    mode = 'idle';
    sel = null;
    skill = null;
    aim = null;
    inspect = null;
    danger = false;
    ended = false;
    unitEls.clear();
    build();
    beginPhase(b, 'hero');
    renderAll();
    void banner('Player Phase', 'hero');
}
/* ---------------- layout ---------------- */
function build() {
    topEl = h('div', 'b-top');
    objEl = h('div', 'b-obj');
    const tiles = h('div', 'b-tiles');
    tiles.style.filter = b.site.filter;
    for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
            const t = terrainAt(b, x, y);
            const el = h('div', 'tile t-' + tileClass(t));
            el.style.left = x * TILE + 'px';
            el.style.top = y * TILE + 'px';
            tiles.append(el);
        }
    const goals = h('div', 'b-goals');
    const o = b.site.objective;
    if (o.kind === 'reach')
        for (const [x, y] of o.tiles) {
            const g = h('div', 'goal', '★');
            g.style.left = x * TILE + 'px';
            g.style.top = y * TILE + 'px';
            goals.append(g);
        }
    hlEl = h('div', 'b-hl');
    unitsEl = h('div', 'b-units');
    fxEl = h('div', 'b-fx');
    mapEl = h('div', 'b-map', tiles, goals, hlEl, unitsEl, fxEl, weatherEl(b.site.weather));
    mapEl.addEventListener('click', onMapClick);
    barEl = h('div', 'b-bar');
    bannerEl = h('div', 'banner');
    root = h('div', 'battle', topEl, objEl, mapEl, barEl, bannerEl);
    showScreen(root);
}
function tileClass(t) {
    return { '.': 'plain', F: 'forest', M: 'mountain', W: 'water', '#': 'wall', T: 'fort', L: 'lava', S: 'sand', B: 'bog', I: 'ice', X: 'snow', R: 'rubble', C: 'rune', E: 'exit', G: 'grave', V: 'chasm' }[t] ?? 'plain';
}
function weatherEl(w) {
    const el = h('div', 'weather w-' + w);
    const n = w === 'rain' ? 40 : w === 'mist' ? 6 : 22;
    for (let i = 0; i < n; i++) {
        const p = h('i');
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = -Math.random() * 8 + 's';
        p.style.animationDuration = (w === 'rain' ? 0.6 + Math.random() * 0.4 : 5 + Math.random() * 5) + 's';
        if (w === 'glyphs')
            p.textContent = '✦✧ᚠᚱᛟ'[i % 5];
        p.style.top = w === 'mist' ? Math.random() * 90 + '%' : '';
        el.append(p);
    }
    return el;
}
/* ---------------- rendering ---------------- */
function renderAll() {
    renderUnits();
    renderHl();
    renderTop();
    renderObj();
    renderBar();
}
function renderObj() {
    objEl.replaceChildren(h('span', 'turn', `Turn ${b.turn}`), h('span', 'obj', objectiveText(b)), h('span', 'phase ' + b.phase, b.phase === 'hero' ? 'Player' : 'Enemy'));
}
function placeUnit(el, x, y) {
    el.style.transform = `translate(${x * TILE}px, ${y * TILE}px)`;
    el.style.zIndex = String(10 + y);
}
function renderUnits() {
    for (const u of b.units) {
        let el = unitEls.get(u.uid);
        if (!u.alive) {
            if (el) {
                el.remove();
                unitEls.delete(u.uid);
            }
            continue;
        }
        if (!el) {
            el = h('div', 'unit ' + u.side + (u.move === 'mounted' || u.move === 'flying' ? ' wide' : ''), artEl(u.art, u.side === 'enemy'), h('div', 'u-hp', h('i')), h('div', 'u-st'));
            if (u.boss)
                el.append(h('div', 'u-boss', '👑'));
            unitsEl.append(el);
            unitEls.set(u.uid, el);
        }
        placeUnit(el, u.x, u.y);
        el.classList.toggle('done', u.side === b.phase && u.acted && u.side === 'hero');
        el.classList.toggle('sel', u === sel);
        el.querySelector('.u-hp i').style.width = (u.hp / u.stats.hp) * 100 + '%';
        const st = el.querySelector('.u-st');
        st.replaceChildren(...u.statuses.slice(0, 3).map((s) => h('span', null, STATUS[s.id].icon)));
    }
}
function hl(x, y, cls, extra) {
    const el = h('div', 'hl ' + cls);
    el.style.left = x * TILE + 'px';
    el.style.top = y * TILE + 'px';
    if (extra)
        el.style.setProperty('--c', extra);
    hlEl.append(el);
}
function renderHl() {
    hlEl.replaceChildren();
    if (danger) {
        const all = new Set();
        for (const e of alive(b, 'enemy'))
            for (const k of threatTiles(b, e))
                all.add(k);
        for (const k of all) {
            const [x, y] = unkey(k);
            hl(x, y, 'danger');
        }
    }
    if (inspect && inspect.side === 'enemy' && !sel) {
        for (const k of threatTiles(b, inspect)) {
            const [x, y] = unkey(k);
            hl(x, y, 'threat');
        }
    }
    if (sel && mode !== 'target') {
        const mt = sel.moved ? new Map([[tileKey(sel.x, sel.y), { cost: 0, prev: -1 }]]) : moveTiles(b, sel);
        const atk = new Set();
        if (!sel.acted)
            for (const k of mt.keys()) {
                const [mx, my] = unkey(k);
                for (const [x, y] of rangeTiles(b, sel, sel.attack, mx, my))
                    if (!mt.has(tileKey(x, y)))
                        atk.add(tileKey(x, y));
            }
        for (const k of atk) {
            const [x, y] = unkey(k);
            hl(x, y, 'atk');
        }
        if (!sel.moved)
            for (const k of mt.keys()) {
                const [x, y] = unkey(k);
                hl(x, y, 'move');
            }
    }
    if (sel && mode === 'target' && skill) {
        const color = SCHOOL_COLOR[skill.def.school];
        for (const [x, y] of rangeTiles(b, sel, skill))
            hl(x, y, isValidTarget(b, sel, skill, x, y) ? 'valid' : 'range', color);
        if (aim) {
            const fc = forecast(b, sel, skill, aim[0], aim[1]);
            for (const [x, y] of fc.area)
                hl(x, y, 'area', color);
            for (const f of fc.list)
                if (!fc.area.some(([x, y]) => x === f.target.x && y === f.target.y))
                    hl(f.target.x, f.target.y, 'area', color);
        }
    }
    if (sel)
        hl(sel.x, sel.y, 'cur');
}
function unitInfo(u) {
    const st = u.stats;
    const isHero = u.side === 'hero';
    const cls = isHero ? heroOf(u.key).title : u.boss ? 'Boss' : u.tags.join(' · ');
    const t = terrainAt(b, u.x, u.y);
    return h('div', 'info', portraitEl(u.art, !isHero, 'portrait ' + u.side), h('div', 'info-r', h('div', 'info-name', h('b', null, u.name), h('span', null, ` Lv ${u.level} · ${cls}`)), bar(u.hp, st.hp, 'hp'), isHero ? bar(u.mp, st.mp, 'mp') : null, h('div', 'stats', ...['atk', 'mag', 'def', 'res', 'spd'].map((k) => h('span', null, h('i', null, k.toUpperCase()), String(st[k]))), h('span', null, h('i', null, 'MOV'), String(st.mov))), h('div', 'chips', ...u.statuses.map((s) => h('span', 'chip ' + (STATUS[s.id].good ? 'good' : 'bad'), `${STATUS[s.id].icon} ${STATUS[s.id].name}${s.amount ? ' ' + s.amount : ''} (${s.turns})`)), !isHero && u.weak.length ? h('span', 'chip weak', 'Weak: ' + u.weak.join(', ')) : null, !isHero && u.resist.length ? h('span', 'chip resist', 'Resists: ' + u.resist.join(', ')) : null, h('span', 'chip terrain', TERRAIN_NAME[t]))));
}
function skillCard(u, s) {
    return h('div', 'skillcard', h('div', 'sc-head', h('span', 'sc-icon', s.def.icon), h('b', null, s.def.name), h('span', 'school s-' + s.def.school, s.def.school)), h('div', 'sc-desc', s.def.desc), h('div', 'sc-nums', describeNumbers(s.def, s.nums, u.stats[s.def.scale]).filter((x) => !(s.id === 'attack' && /Mana|cooldown/i.test(x))).join(' · ')), s.nums.statuses.length || s.nums.selfStatuses.length
        ? h('div', 'sc-eff', [...s.nums.statuses.map((x) => `${STATUS[x.id].icon} ${STATUS[x.id].name} ${x.turns}t`), ...s.nums.selfStatuses.map((x) => `Self: ${STATUS[x.id].name} ${x.turns}t`)].join(' · '))
        : null, h('div', 'sc-hint', 'Tap a highlighted tile to aim.'));
}
function forecastRow(u, f) {
    const t = f.target;
    const after = Math.max(0, t.hp - f.dmg * Math.max(1, f.hits)) + f.heal;
    return h('div', 'fc-row', portraitEl(t.art, t.side === 'enemy', 'mini'), h('div', 'fc-mid', h('b', null, t.name), h('div', 'fc-hp', `${t.hp} → `, h('span', after <= 0 ? 'lethal' : f.heal ? 'heal' : '', after <= 0 ? 'KO' : String(Math.min(t.stats.hp, after)))), f.statuses.length ? h('div', 'fc-st', f.statuses.map((s) => STATUS[s].icon + STATUS[s].name).join(' ')) : null), h('div', 'fc-num', f.dmg ? h('span', 'dmg', `${f.dmg}${f.hits > 1 ? ' ×2' : ''}`) : null, f.heal ? h('span', 'heal', `+${f.heal}`) : null, f.counter ? h('span', 'counter', `↩ ${f.counter}${f.counterHits > 1 ? ' ×2' : ''} → ${u.name} ${Math.max(0, u.hp - f.counter * f.counterHits)}`) : null));
}
function renderTop() {
    topEl.replaceChildren();
    if (sel && mode === 'target' && skill) {
        if (aim) {
            const fc = forecast(b, sel, skill, aim[0], aim[1]);
            const rows = fc.list.slice(0, 3).map((f) => forecastRow(sel, f));
            topEl.append(h('div', 'forecast', h('div', 'fc-title', `${skill.def.icon} ${skill.def.name}`, fc.list.length > 3 ? h('span', null, ` +${fc.list.length - 3} more`) : null), ...(rows.length ? rows : [h('div', 'fc-empty', skill.def.special === 'blink' ? 'Teleport here.' : skill.def.special === 'summon' ? '' : 'No targets in the area.')]), h('div', 'fc-btns', button('Cancel', () => { aim = null; renderAll(); }, 'btn small'), button('Confirm ✓', () => { void execute(); }, 'btn primary small'))));
        }
        else
            topEl.append(skillCard(sel, skill));
        return;
    }
    const u = inspect ?? sel;
    if (u) {
        topEl.append(unitInfo(u));
        return;
    }
    topEl.append(h('div', 'top-idle', h('div', 'ti-name', b.site.name), h('div', 'ti-sub', b.site.subtitle), h('div', 'ti-hint', 'Tap a hero to move and act. Tap an enemy to see its reach. Tap a target twice to confirm.')));
}
function renderBar() {
    barEl.replaceChildren();
    const grid = h('div', 'actions');
    if (sel && b.phase === 'hero' && !sel.acted && mode !== 'busy') {
        const u = sel;
        for (const s of [u.attack, ...u.skills]) {
            const why = canUse(u, s);
            const btn = button(h('div', 'ab', h('span', 'ab-icon', s.def.icon), h('span', 'ab-name', s.def.name), s.id !== 'attack' ? h('span', 'ab-cost' + (u.mp < s.nums.cost ? ' short' : ''), `${s.nums.cost}`) : null, s.cd > 0 ? h('span', 'ab-cd', String(s.cd)) : null), () => chooseSkill(s), 'act s-' + s.def.school + (skill === s ? ' on' : ''), !!why);
            grid.append(btn);
        }
        const potions = Object.keys(b.bag).filter((id) => b.bag[id] > 0 && itemOf(id).use);
        grid.append(button(h('div', 'ab', h('span', 'ab-icon', '🎒'), h('span', 'ab-name', 'Items')), () => itemsMenu(u), 'act', potions.length === 0));
        grid.append(button(h('div', 'ab', h('span', 'ab-icon', '⏸'), h('span', 'ab-name', 'Wait')), () => { waitUnit(u); afterHeroAction(); }, 'act'));
    }
    else {
        for (const u of alive(b, 'hero')) {
            grid.append(button(h('div', 'ab hero-chip', portraitEl(u.art, false, 'chip-face'), h('span', 'ab-name', u.name), h('div', 'chip-bars', bar(u.hp, u.stats.hp, 'hp', false), bar(u.mp, u.stats.mp, 'mp', false))), () => { if (b.phase === 'hero' && mode !== 'busy')
                selectUnit(u); }, 'act hero' + (u.acted ? ' done' : ''), mode === 'busy' || b.phase !== 'hero'));
        }
    }
    const canUndo = !!sel && sel.moved && !sel.acted && mode !== 'busy';
    const ctrl = h('div', 'controls', button('↶ Undo', undoMove, 'btn small', !canUndo), button(danger ? 'Danger ●' : 'Danger', () => { danger = !danger; renderHl(); renderBar(); }, 'btn small' + (danger ? ' on' : '')), button('Menu', menu, 'btn small'), button('End Turn', () => { void endTurn(); }, 'btn primary small', mode === 'busy' || b.phase !== 'hero'));
    barEl.append(grid, ctrl);
}
/* ---------------- input ---------------- */
function tileFromEvent(e) {
    const r = mapEl.getBoundingClientRect();
    const scale = r.width / (W * TILE);
    return [Math.floor((e.clientX - r.left) / scale / TILE), Math.floor((e.clientY - r.top) / scale / TILE)];
}
function selectUnit(u) {
    sel = u;
    inspect = null;
    skill = null;
    aim = null;
    mode = 'idle';
    renderAll();
}
function deselect() {
    sel = null;
    skill = null;
    aim = null;
    mode = 'idle';
    inspect = null;
    renderAll();
}
function chooseSkill(s) {
    if (!sel || canUse(sel, s))
        return;
    if (skill === s) {
        skill = null;
        aim = null;
        mode = 'idle';
        renderAll();
        return;
    }
    skill = s;
    aim = null;
    mode = 'target';
    if (s.def.target === 'self')
        aim = [sel.x, sel.y];
    renderAll();
}
function onMapClick(e) {
    if (mode === 'busy' || b.phase !== 'hero' || ended)
        return;
    const [x, y] = tileFromEvent(e);
    if (x < 0 || y < 0 || x >= W || y >= H)
        return;
    const o = unitAt(b, x, y);
    if (mode === 'target' && sel && skill) {
        if (isValidTarget(b, sel, skill, x, y)) {
            if (aim && aim[0] === x && aim[1] === y) {
                void execute();
                return;
            }
            aim = [x, y];
            renderAll();
            return;
        }
        if (o && o.side === 'hero' && o !== sel && !o.acted) {
            selectUnit(o);
            return;
        }
        skill = null;
        aim = null;
        mode = 'idle';
        renderAll();
        return;
    }
    if (o) {
        if (o.side === 'hero') {
            if (o === sel) {
                renderAll();
                return;
            }
            if (!o.acted) {
                selectUnit(o);
                return;
            }
            inspect = o;
            sel = null;
            renderAll();
            return;
        }
        // Enemy: quick-attack if the selected hero can already reach it, otherwise inspect.
        if (sel && !sel.acted && isValidTarget(b, sel, sel.attack, x, y)) {
            skill = sel.attack;
            mode = 'target';
            aim = [x, y];
            renderAll();
            return;
        }
        inspect = o;
        if (sel && sel.moved) { /* keep selection so the hero can still act */ }
        else
            sel = null;
        renderAll();
        return;
    }
    if (sel && !sel.moved && !sel.acted) {
        const mt = moveTiles(b, sel);
        if (mt.has(tileKey(x, y))) {
            void doMove(sel, x, y);
            return;
        }
    }
    if (sel && sel.moved && !sel.acted) {
        inspect = null;
        renderAll();
        return;
    }
    deselect();
}
async function doMove(u, x, y) {
    mode = 'busy';
    renderBar();
    const ev = moveUnit(b, u, x, y);
    await play(ev);
    mode = 'idle';
    if (b.result) {
        void finish();
        return;
    }
    renderAll();
}
function undoMove() {
    if (!sel || !sel.moved || sel.acted)
        return;
    sel.x = sel.startX;
    sel.y = sel.startY;
    sel.moved = false;
    skill = null;
    aim = null;
    mode = 'idle';
    renderAll();
}
async function execute() {
    if (!sel || !skill || !aim)
        return;
    const u = sel, s = skill, [x, y] = aim;
    if (!isValidTarget(b, u, s, x, y) || canUse(u, s))
        return;
    mode = 'busy';
    skill = null;
    aim = null;
    renderHl();
    renderBar();
    topEl.replaceChildren(unitInfo(u));
    const ev = useSkill(b, u, s, x, y);
    await play(ev);
    afterHeroAction();
}
function afterHeroAction() {
    mode = 'idle';
    sel = null;
    skill = null;
    aim = null;
    inspect = null;
    renderAll();
    if (b.result) {
        void finish();
        return;
    }
    if (alive(b, 'hero').every((u) => u.acted))
        setTimeout(() => { if (!ended && mode === 'idle' && b.phase === 'hero')
            void endTurn(); }, 450);
}
function itemsMenu(u) {
    const ids = Object.keys(b.bag).filter((id) => b.bag[id] > 0 && itemOf(id).use);
    const close = modal(h('div', null, h('h2', null, 'Use an item'), h('p', 'muted', `${u.name} uses it as their action.`), h('div', 'list', ...ids.map((id) => {
        const it = itemOf(id);
        return button(h('div', 'li', h('span', 'li-icon', it.icon), h('div', 'li-mid', h('b', null, it.name), h('small', null, it.desc)), h('span', 'li-r', '×' + b.bag[id])), async () => { close(); mode = 'busy'; renderBar(); await play(useItem(b, u, id)); afterHeroAction(); }, 'li-btn');
    })), h('div', 'row-btns', button('Close', () => close()))), { dismiss: true });
}
function menu() {
    const close = modal(h('div', null, h('h2', null, b.site.name), h('div', 'col-btns', button('Resume', () => close(), 'btn primary'), button('How to play', () => { close(); help(); }), button('Retreat to map', () => { close(); ended = true; opts.onRetreat(b.units, b.bag); }))), { dismiss: true });
}
export function help() {
    modal(h('div', 'help', h('h2', null, 'How to play'), h('ul', null, h('li', null, 'Tap a hero: blue tiles show where they can move, red tiles what they can hit. Tap a blue tile to move.'), h('li', null, 'Pick Attack or a skill, tap a target to preview, then tap it again (or Confirm).'), h('li', null, 'Basic attacks are free but the target strikes back if it can reach. Skills cost mana and have cooldowns, but are never countered.'), h('li', null, 'A unit 5+ Speed faster attacks twice with basic attacks.'), h('li', null, 'Forest, rubble and forts raise Def/Res. Forts heal 10% each turn. Lava burns. Ley runes restore mana.'), h('li', null, 'Enemies have weaknesses (×1.5) and resistances (×½). Bows deal ×1.5 to fliers.'), h('li', null, 'Danger shows every tile enemies can hit next turn. Bosses ignore Stun and Root.'), h('li', null, 'Heroes earn XP and Skill Points. Spend SP in the Party screen to learn and reshape skills.')), h('div', 'row-btns', button('Got it', () => document.querySelector('.modal-layer:last-child')?.remove(), 'btn primary'))), { dismiss: true });
}
/* ---------------- animation ---------------- */
function centerOf(x, y) { return [x * TILE + TILE / 2, y * TILE + TILE / 2]; }
function floatText(u, text, cls) {
    const [cx, cy] = centerOf(u.x, u.y);
    const el = h('div', 'float ' + cls, text);
    el.style.left = cx + 'px';
    el.style.top = cy - 18 + 'px';
    fxEl.append(el);
    setTimeout(() => el.remove(), 1000);
}
function unitById(uid) { return b.units.find((u) => u.uid === uid); }
async function play(ev) {
    for (const e of ev) {
        const u = unitById(e.uid);
        const el = unitEls.get(e.uid);
        switch (e.t) {
            case 'move':
                if (el)
                    for (const [x, y] of e.path.slice(1)) {
                        placeUnit(el, x, y);
                        await sleep(e.path.length === 2 ? 220 : 110);
                    }
                break;
            case 'push':
                if (el) {
                    placeUnit(el, e.x, e.y);
                    await sleep(160);
                }
                break;
            case 'cast': {
                if (!u)
                    break;
                const color = SCHOOL_COLOR[e.school];
                if (!e.basic) {
                    const tag = h('div', 'cast-tag', `${e.icon} ${e.name}`);
                    tag.style.setProperty('--c', color);
                    fxEl.append(tag);
                    setTimeout(() => tag.remove(), 900);
                }
                if (e.tx !== u.x || e.ty !== u.y) {
                    const [sx, sy] = centerOf(u.x, u.y), [tx, ty] = centerOf(e.tx, e.ty);
                    if (dist(u.x, u.y, e.tx, e.ty) > 1 || !e.basic) {
                        const p = h('div', 'proj');
                        p.style.setProperty('--c', color);
                        p.style.transform = `translate(${sx}px,${sy}px)`;
                        fxEl.append(p);
                        await sleep(20);
                        p.style.transform = `translate(${tx}px,${ty}px)`;
                        await sleep(220);
                        p.remove();
                    }
                    else if (el) {
                        el.classList.add('lunge');
                        el.style.setProperty('--dx', (e.tx - u.x) * 10 + 'px');
                        el.style.setProperty('--dy', (e.ty - u.y) * 10 + 'px');
                        await sleep(150);
                        el.classList.remove('lunge');
                    }
                }
                for (const [x, y] of e.area) {
                    const f = h('div', 'flash');
                    f.style.left = x * TILE + 'px';
                    f.style.top = y * TILE + 'px';
                    f.style.setProperty('--c', color);
                    fxEl.append(f);
                    setTimeout(() => f.remove(), 450);
                }
                await sleep(180);
                break;
            }
            case 'dmg':
                if (u) {
                    floatText(u, e.amount > 0 ? `${e.crit ? 'CRIT ' : ''}-${e.amount}` : 'Blocked', 'dmg' + (e.crit ? ' crit' : ''));
                    if (e.absorbed)
                        floatText(u, `🛡${e.absorbed}`, 'shield');
                    if (el) {
                        el.classList.remove('hit');
                        void el.offsetWidth;
                        el.classList.add('hit');
                        el.querySelector('.u-hp i').style.width = (u.hp / u.stats.hp) * 100 + '%';
                    }
                    if (e.crit) {
                        mapEl.classList.remove('shake');
                        void mapEl.offsetWidth;
                        mapEl.classList.add('shake');
                    }
                }
                await sleep(230);
                break;
            case 'heal':
                if (u)
                    floatText(u, `+${e.amount}`, 'heal');
                if (u && el)
                    el.querySelector('.u-hp i').style.width = (u.hp / u.stats.hp) * 100 + '%';
                await sleep(180);
                break;
            case 'mana':
                if (u)
                    floatText(u, `+${e.amount} MP`, 'mana');
                await sleep(150);
                break;
            case 'status':
                if (u)
                    floatText(u, `${STATUS[e.id].icon} ${STATUS[e.id].name}`, 'status ' + (STATUS[e.id].good ? 'good' : 'bad'));
                await sleep(120);
                break;
            case 'text':
                if (u)
                    floatText(u, e.text, 'status bad');
                await sleep(250);
                break;
            case 'death':
                if (el) {
                    el.classList.add('dying');
                    await sleep(380);
                    el.remove();
                    unitEls.delete(e.uid);
                }
                break;
            case 'spawn':
                renderUnits();
                {
                    const ne = unitEls.get(e.uid);
                    ne?.classList.add('pop');
                }
                await sleep(250);
                break;
        }
    }
    renderUnits();
}
async function banner(text, cls) {
    bannerEl.replaceChildren(h('span', null, text));
    bannerEl.className = 'banner show ' + cls;
    await sleep(950);
    bannerEl.className = 'banner';
}
/* ---------------- turn flow ---------------- */
async function endTurn() {
    if (mode === 'busy' || ended || b.phase !== 'hero')
        return;
    mode = 'busy';
    sel = null;
    skill = null;
    aim = null;
    inspect = null;
    endPhase(b, 'hero');
    renderAll();
    await banner('Enemy Phase', 'enemy');
    await play(beginPhase(b, 'enemy'));
    renderAll();
    if (b.result) {
        void finish();
        return;
    }
    const order = alive(b, 'enemy').sort((a, c) => (a.ai === 'healer' ? 1 : 0) - (c.ai === 'healer' ? 1 : 0));
    for (const e of order) {
        if (!e.alive || e.acted)
            continue;
        const plan = planFor(b, e);
        if (plan.to[0] !== e.x || plan.to[1] !== e.y)
            await play(moveUnit(b, e, plan.to[0], plan.to[1]));
        if (plan.skill && plan.tx !== undefined && plan.ty !== undefined && isValidTarget(b, e, plan.skill, plan.tx, plan.ty)) {
            inspect = e;
            renderTop();
            await play(useSkill(b, e, plan.skill, plan.tx, plan.ty));
        }
        else
            e.acted = true;
        renderAll();
        if (b.result) {
            void finish();
            return;
        }
        await sleep(120);
    }
    inspect = null;
    endPhase(b, 'enemy');
    if (b.result) {
        renderAll();
        void finish();
        return;
    }
    await banner('Player Phase', 'hero');
    await play(beginPhase(b, 'hero'));
    mode = 'idle';
    renderAll();
    if (b.result)
        void finish();
}
async function finish() {
    if (ended)
        return;
    ended = true;
    mode = 'busy';
    renderAll();
    await sleep(300);
    await banner(b.result === 'win' ? 'Victory!' : 'Defeat', b.result === 'win' ? 'win' : 'lose');
    opts.onEnd(b.result === 'win', b.units, b.bag);
}
/** For tests: current battle state. */
export function current() { return b; }
//# sourceMappingURL=battle.js.map