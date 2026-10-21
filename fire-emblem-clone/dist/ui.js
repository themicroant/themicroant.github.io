import { WEAPONS } from './logic.js';
import { baseDef, displayName } from './data/units.js';
/* ---------------- typed DOM lookup ---------------- */
export function $(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error('Missing element #' + id);
    return el;
}
export function q(root, selector) {
    const el = root.querySelector(selector);
    if (!el)
        throw new Error('Missing element ' + selector);
    return el;
}
export function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls)
        e.className = cls;
    if (text !== undefined)
        e.textContent = text;
    return e;
}
export const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
export const COLOR_HEX = { red: '#d9433d', blue: '#3b78dc', green: '#34a853', colourless: '#868c9a' };
export const MOVE_NAMES = { infantry: 'Infantry', armored: 'Armored', cavalry: 'Cavalry', flying: 'Flying' };
export const TILE_GLYPH = { forest: '♣', mountain: '▲', water: '≈', wall: '▦', fort: '✚', plain: '' };
export function hpColor(p) { return p > 0.5 ? '#46d36b' : p > 0.25 ? '#e8c53a' : '#e85a4a'; }
/* ---------------- assets ---------------- */
const ASSET = {}; // path -> loaded?
export function assetOk(path) { return ASSET[path] !== false; }
export function assetLoaded(path) { return ASSET[path] === true; }
export function markAssetFailed(path) { ASSET[path] = false; }
export function preload(paths) {
    return Promise.all(paths.map((p) => new Promise((res) => {
        const img = new Image();
        const t = setTimeout(() => { ASSET[p] = false; res(); }, 4000);
        img.onload = () => { clearTimeout(t); ASSET[p] = true; res(); };
        img.onerror = () => { clearTimeout(t); ASSET[p] = false; res(); };
        img.src = p;
    }))).then(() => undefined);
}
export function unitMeta(id) {
    const d = baseDef(id);
    return {
        id, side: d.side, name: d.name, color: WEAPONS[d.weapon].color, sprite: 'assets/units/' + id + '.png',
        weapon: d.weapon, moveType: d.moveType,
    };
}
export function speakerName(id) { return displayName(id); }
export function fallbackEl(u) {
    const d = h('div', 'fbunit side-' + u.side, u.name.charAt(0));
    d.style.background = COLOR_HEX[u.color];
    return d;
}
/* append the unit's sprite image to parent, or the placeholder circle when the image is missing */
export function spriteImg(u, parent) {
    if (!assetOk(u.sprite)) {
        parent.appendChild(fallbackEl(u));
        return;
    }
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.onerror = () => {
        markAssetFailed(u.sprite);
        if (img.parentNode)
            img.parentNode.replaceChild(fallbackEl(u), img);
    };
    img.src = u.sprite;
    parent.appendChild(img);
}
export function badgeHtml(weapon) {
    const w = WEAPONS[weapon];
    return '<span class="wb ' + w.color + '" title="' + weapon + '">' + w.code + '</span>';
}
/* framed portrait (10.4) */
export function portrait(u) {
    const f = h('div', 'frame side-' + u.side);
    spriteImg(u, f);
    return f;
}
export function sideOf(id) { return baseDef(id).side; }
/* ---------------- tiles ---------------- */
export function tileEl(key, col, row) {
    const el = h('div', 'tile t-' + key);
    const path = 'assets/tiles/' + key + '.png';
    el.style.left = col * 60 + 'px';
    el.style.top = row * 60 + 'px';
    if (assetLoaded(path))
        el.style.backgroundImage = 'url(' + path + ')';
    else {
        el.classList.add('fb');
        el.textContent = TILE_GLYPH[key];
    }
    return el;
}
/* ---------------- stage scale ---------------- */
export function fitStage() {
    const s = Math.min(window.innerWidth / 360, window.innerHeight / 800);
    $('stage').style.transform = 'scale(' + s + ')';
}
/* ---------------- buttons ---------------- */
export function button(label, cls, onClick) {
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
}
let currentScreen = null;
let fading = false;
export function isFading() { return fading; }
export function screenEl(id) { return $('screen-' + id); }
/* 200 ms cross-fade; the new screen fades in from opacity 0. Input is ignored meanwhile. */
export async function showScreen(id, instant = false) {
    const next = screenEl(id);
    const prev = currentScreen ? screenEl(currentScreen) : null;
    currentScreen = id;
    if (prev === next)
        return;
    if (instant || !prev) {
        document.querySelectorAll('.screen').forEach((s) => { s.classList.remove('active'); });
        next.classList.add('active');
        return;
    }
    fading = true;
    $('stage').classList.add('fading');
    next.style.zIndex = '2';
    next.classList.add('active');
    const a = next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
    try {
        await a.finished;
    }
    catch { /* cancelled */ }
    prev.classList.remove('active');
    next.style.zIndex = '';
    fading = false;
    $('stage').classList.remove('fading');
}
export function isModalOpen() { return $('modalLayer').classList.contains('open'); }
export function closeModal() {
    const l = $('modalLayer');
    l.classList.remove('open', 'plain');
    l.innerHTML = '';
}
export function openModal(spec) {
    const l = $('modalLayer');
    l.innerHTML = '';
    l.classList.remove('plain');
    const card = h('div', 'card' + (spec.wide ? ' wide' : ''));
    card.appendChild(h('h2', '', spec.title));
    if (spec.text)
        card.appendChild(h('p', '', spec.text));
    if (spec.body)
        card.appendChild(spec.body);
    const row = h('div', 'mbtns');
    for (const b of spec.buttons) {
        row.appendChild(button(b.label, b.primary ? 'primary' : '', () => { b.onClick(); }));
    }
    card.appendChild(row);
    l.appendChild(card);
    l.classList.add('open');
}
export function overwriteModal(onErase) {
    openModal({
        title: 'Start a new game?', text: 'Your saved progress will be erased.',
        buttons: [
            { label: 'Cancel', onClick: closeModal },
            { label: 'Erase and Start', primary: true, onClick: () => { closeModal(); onErase(); } },
        ],
    });
}
export function defeatModal(onRetry, onBack) {
    openModal({
        title: 'Defeat', text: 'Your squad has fallen.',
        buttons: [
            { label: 'Retry', primary: true, onClick: () => { closeModal(); onRetry(); } },
            { label: 'Back to Chapters', onClick: () => { closeModal(); onBack(); } },
        ],
    });
}
export function menuModal(onRetry, onBack) {
    openModal({
        title: 'Menu',
        buttons: [
            { label: 'Resume', primary: true, onClick: closeModal },
            { label: 'Retry battle', onClick: () => { closeModal(); onRetry(); } },
            { label: 'Back to Chapters', onClick: () => { closeModal(); onBack(); } },
        ],
    });
}
export function rulesModal() {
    const body = h('div', 'rules');
    const items = [
        ['Triangle', 'Red beats Green, Green beats Blue, Blue beats Red: ±20% Atk.'],
        ['Range', 'Weapons hit at exactly their range: 1 or 2 tiles, never closer. Bows hit fliers for ×1.5.'],
        ['Specials', 'Surge (×1.5 damage) is ready when its counter hits 0. Attacking and being attacked both charge it.'],
        ['Speed', 'A unit 5+ Spd faster strikes twice.'],
        ['Terrain', 'Forest: foot units pay 2, cavalry cannot enter. Mountain, Water: fliers only. Wall: blocked for all. Fort: +20% Def/Res.'],
        ['Healing', 'Staff users heal an adjacent wounded ally: 10 + half Atk.'],
    ];
    for (const [k, v] of items) {
        const p = h('p', 'rule');
        p.appendChild(h('b', '', k + ': '));
        p.appendChild(document.createTextNode(v));
        body.appendChild(p);
    }
    openModal({ title: 'Rules', body, wide: true, buttons: [{ label: 'Close', primary: true, onClick: closeModal }] });
}
export function rewardsModal(res, onContinue) {
    const body = h('div', 'rewards');
    for (const c of res.changes) {
        if (c.caughtUp)
            continue;
        const row = h('div', 'rrow');
        row.appendChild(document.createTextNode(displayName(c.id) + '  Lv ' + c.from + ' '));
        row.appendChild(h('span', 'arr', '→'));
        row.appendChild(document.createTextNode(' ' + c.to));
        body.appendChild(row);
    }
    for (const c of res.changes) {
        if (!c.caughtUp)
            continue;
        const row = h('div', 'rrow');
        row.appendChild(document.createTextNode(displayName(c.id) + '  Lv ' + c.from + ' '));
        row.appendChild(h('span', 'arr', '→'));
        row.appendChild(document.createTextNode(' ' + c.to + ' (caught up)'));
        body.appendChild(row);
    }
    for (const id of res.recruits) {
        const row = h('div', 'rrow recruit');
        const p = portrait(unitMeta(id));
        p.classList.add('mini');
        row.appendChild(p);
        row.appendChild(h('span', '', displayName(id) + ' joins the party!'));
        body.appendChild(row);
    }
    if (res.unlocked !== null)
        body.appendChild(h('div', 'rrow unlock', 'Chapter ' + res.unlocked + ' unlocked'));
    openModal({
        title: 'Chapter Cleared!', body,
        buttons: [{ label: 'Continue', primary: true, onClick: () => { closeModal(); onContinue(); } }],
    });
}
/* "The End" card: full-stage, no dim card (18.6) */
export function theEndCard(onReturn) {
    const l = $('modalLayer');
    l.innerHTML = '';
    l.classList.add('open', 'plain');
    const wrap = h('div', 'theend');
    wrap.appendChild(h('h1', '', 'The End'));
    wrap.appendChild(h('p', '', 'Thank you for playing.'));
    wrap.appendChild(button('Return to Title', 'primary big', () => { closeModal(); onReturn(); }));
    l.appendChild(wrap);
}
//# sourceMappingURL=ui.js.map