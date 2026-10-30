import { HEROES } from '../data/heroes.js';
import { ENEMIES } from '../data/enemies.js';
import { NPCS } from '../data/sites.js';
import { button, h, portraitEl, showScreen } from '../ui.js';
function speaker(who) {
    const hero = HEROES.find((x) => x.id === who);
    if (hero)
        return { name: hero.name, art: { sprite: hero.sprite }, enemy: false };
    const en = ENEMIES.find((x) => x.id === who);
    if (en)
        return { name: en.name, art: en.art, enemy: true };
    const n = NPCS[who];
    if (n)
        return { name: n.name, art: n.sprite ? { sprite: n.sprite } : n.glyph ? { glyph: n.glyph, tint: n.tint } : null, enemy: !!n.sprite };
    return { name: who, art: null, enemy: false };
}
export function show(lines, backdrop, title, onDone) {
    let i = 0;
    const left = h('div', 'dlg-por left');
    const right = h('div', 'dlg-por right');
    const plate = h('div', 'dlg-plate');
    const text = h('div', 'dlg-text');
    const box = h('div', 'dlg-box', plate, text, h('div', 'dlg-next', '▼'));
    const head = title ? h('div', 'dlg-title', title) : null;
    const root = h('div', 'dialog', head, left, right, box, button('Skip ▸▸', () => onDone(), 'btn small dlg-skip'));
    root.style.background = backdrop;
    const step = () => {
        if (i >= lines.length) {
            onDone();
            return;
        }
        const l = lines[i++];
        const sp = speaker(l.who);
        const narr = l.who === 'narrator' || !sp.name;
        box.classList.toggle('narr', narr);
        plate.textContent = narr ? '' : sp.name;
        plate.className = 'dlg-plate ' + (l.side === 'R' ? 'r' : 'l');
        text.textContent = l.text;
        if (!narr && sp.art) {
            const slot = l.side === 'R' ? right : left;
            slot.replaceChildren(portraitEl(sp.art, l.side === 'R', 'dlg-art'));
            left.classList.toggle('dim', l.side === 'R');
            right.classList.toggle('dim', l.side !== 'R');
        }
    };
    root.addEventListener('click', step);
    showScreen(root);
    step();
}
//# sourceMappingURL=dialog.js.map