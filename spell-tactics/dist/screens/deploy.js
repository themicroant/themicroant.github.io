import { heroOf } from '../data/heroes.js';
import { heroStats, spFree } from '../rules.js';
import { shards } from '../progress.js';
import { button, h, portraitEl, showScreen, toast } from '../ui.js';
export function show(o) {
    const { save, site, guest } = o;
    const slots = site.deploy - (guest ? 1 : 0);
    let picked = save.party.filter((id) => save.roster.indexOf(id) >= 0).slice(0, slots);
    for (const id of save.roster)
        if (picked.length < slots && picked.indexOf(id) < 0)
            picked.push(id);
    const render = () => {
        const card = (id, locked) => {
            const hs = save.heroes[id];
            const def = heroOf(id);
            const st = heroStats(hs);
            const on = locked || picked.indexOf(id) >= 0;
            const sp = spFree(hs, shards(save));
            const el = h('div', 'dp-card' + (on ? ' on' : '') + (locked ? ' locked' : ''), portraitEl({ sprite: def.sprite }, false, 'dp-face'), h('div', 'dp-mid', h('b', null, def.name), h('small', null, `Lv ${hs.level} ${def.title}`), h('small', null, `HP ${st.hp} · MP ${st.mp}`), locked ? h('span', 'tag', 'Guest') : null, sp > 0 ? h('span', 'tag sp', `${sp} SP unspent`) : null), h('span', 'dp-check', on ? '✔' : ''));
            if (!locked)
                el.addEventListener('click', () => {
                    const i = picked.indexOf(id);
                    if (i >= 0)
                        picked.splice(i, 1);
                    else if (picked.length < slots)
                        picked.push(id);
                    else
                        toast(`Up to ${site.deploy} heroes`);
                    render();
                });
            return el;
        };
        showScreen(h('div', 'deploy', h('div', 'hdr', button('‹ Map', o.onBack, 'btn small'), h('div', 'hdr-t', site.name), button('Party', o.onParty, 'btn small')), h('div', 'dp-info', `Choose up to ${site.deploy} heroes (${picked.length + (guest ? 1 : 0)}/${site.deploy})`), h('div', 'dp-list', guest ? card(guest.id, true) : null, ...save.roster.map((id) => card(id, false))), h('div', 'dp-foot', button('To Battle ⚔', () => { save.party = [...picked]; o.onStart(guest ? [...picked, guest.id] : [...picked]); }, 'btn primary big', picked.length === 0))));
    };
    render();
}
//# sourceMappingURL=deploy.js.map