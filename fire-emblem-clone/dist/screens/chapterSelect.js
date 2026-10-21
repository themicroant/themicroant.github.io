import { CHAPTERS } from '../data/chapters.js';
import { $, h } from '../ui.js';
let wired = false;
let onBackCb = null;
export function show(opts) {
    const list = $('chapterList');
    list.innerHTML = '';
    onBackCb = opts.onBack;
    for (const ch of CHAPTERS) {
        const cleared = opts.save.cleared.indexOf(ch.num) >= 0;
        const unlocked = ch.num <= opts.save.unlockedChapter;
        const card = h('div', 'ccard ' + (cleared ? 'cleared' : unlocked ? 'available' : 'locked'));
        card.appendChild(h('div', 'cnum', String(ch.num)));
        const info = h('div', 'cinfo');
        info.appendChild(h('div', 'cname', ch.name));
        info.appendChild(h('div', 'cobj', ch.objective));
        info.appendChild(h('div', 'crec', 'Recommended Lv ' + ch.recLevel));
        card.appendChild(info);
        card.appendChild(h('div', 'cmark', cleared ? '✔' : unlocked ? '▶' : 'Locked'));
        if (unlocked)
            card.addEventListener('click', () => { opts.onSelect(ch.num); });
        list.appendChild(card);
    }
    if (!wired) {
        wired = true;
        $('btnChaptersBack').addEventListener('click', () => { if (onBackCb)
            onBackCb(); });
    }
}
//# sourceMappingURL=chapterSelect.js.map