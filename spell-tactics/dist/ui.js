export const STAGE_W = 360;
export const STAGE_H = 800;
export function fitStage() {
    const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    const st = document.getElementById('stage');
    st.style.transform = `scale(${s})`;
}
export function h(tag, cls, ...kids) {
    const el = document.createElement(tag);
    if (typeof cls === 'string')
        el.className = cls;
    else if (cls)
        for (const [k, v] of Object.entries(cls)) {
            if (k === 'class')
                el.className = String(v);
            else if (k === 'style')
                el.setAttribute('style', String(v));
            else if (k.startsWith('on') && typeof v === 'function')
                el.addEventListener(k.slice(2), v);
            else if (v !== undefined && v !== false && v !== null)
                el.setAttribute(k, v === true ? '' : String(v));
        }
    for (const c of kids)
        if (c !== null && c !== undefined && c !== false)
            el.append(c instanceof Node ? c : String(c));
    return el;
}
export function button(label, onClick, cls = 'btn', disabled = false) {
    const b = h('button', { class: cls, type: 'button' }, label);
    b.disabled = disabled;
    b.addEventListener('click', (e) => { e.stopPropagation(); if (!b.disabled)
        onClick(); });
    return b;
}
/** Replaces the visible screen. */
export function showScreen(el) {
    const host = document.getElementById('screen');
    host.replaceChildren(el);
    el.classList.add('screen', 'fade-in');
}
export function clearModals() {
    document.getElementById('modals').replaceChildren();
}
/** Opens a centered modal card. Returns a close function. */
export function modal(content, opts = {}) {
    const layer = h('div', 'modal-layer');
    const card = h('div', 'modal ' + (opts.cls ?? ''), content);
    layer.append(card);
    const close = () => layer.remove();
    if (opts.dismiss)
        layer.addEventListener('click', (e) => { if (e.target === layer)
            close(); });
    document.getElementById('modals').append(layer);
    return close;
}
export function confirmModal(title, text, ok, onOk, cancel = 'Cancel') {
    const close = modal(h('div', null, h('h2', null, title), h('p', null, text), h('div', 'row-btns', button(cancel, () => close()), button(ok, () => { close(); onOk(); }, 'btn primary'))), { dismiss: true });
}
export function toast(text) {
    const t = h('div', 'toast', text);
    document.getElementById('modals').append(t);
    setTimeout(() => t.remove(), 1800);
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const SCHOOL_COLOR = {
    physical: '#d9d2c3', fire: '#ff7a2f', frost: '#7fd4ff', nature: '#7ed957', holy: '#ffe27a',
    shadow: '#b07cff', arcane: '#ff7ae0', storm: '#8fb4ff',
};
/** Unit art: a sprite (mirrored for enemies) or a filler emoji token. */
export function artEl(art, enemy, cls = 'art') {
    if (art.sprite) {
        const el = h('div', cls + ' sprite' + (enemy ? ' flip' : ''));
        el.style.backgroundImage = `url(${art.sprite})`;
        if (art.filter)
            el.style.filter = art.filter;
        return el;
    }
    const el = h('div', cls + ' token', h('span', null, art.glyph ?? '?'));
    el.style.setProperty('--tint', art.tint ?? '#555');
    return el;
}
/** A head-and-shoulders crop of a sprite (or a token) for panels. */
export function portraitEl(art, enemy, cls = 'portrait') {
    if (art.sprite) {
        const el = h('div', cls + ' sprite-crop' + (enemy ? ' flip' : ''));
        el.style.backgroundImage = `url(${art.sprite})`;
        if (art.filter)
            el.style.filter = art.filter;
        return el;
    }
    const el = h('div', cls + ' token', h('span', null, art.glyph ?? '?'));
    el.style.setProperty('--tint', art.tint ?? '#555');
    return el;
}
export function bar(cur, max, cls, label = true) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
    return h('div', 'bar ' + cls, h('i', { style: `width:${pct}%` }), label ? h('b', null, `${cur}/${max}`) : null);
}
export function preload(urls) {
    return Promise.all(urls.map((u) => new Promise((res) => {
        const img = new Image();
        img.onload = img.onerror = () => res();
        img.src = u;
    }))).then(() => undefined);
}
//# sourceMappingURL=ui.js.map