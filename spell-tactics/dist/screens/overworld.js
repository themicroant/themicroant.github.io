import { SITES } from '../data/sites.js';
import { heroOf } from '../data/heroes.js';
import { enemyOf } from '../data/enemies.js';
import { itemOf } from '../data/items.js';
import { isUnlocked, shards } from '../progress.js';
import { button, h, modal, portraitEl, showScreen } from '../ui.js';
export const HOME = [190, 668];
const BIOMES = [
    // cx, cy, rx, ry, colour
    [92, 600, 95, 70, '#2f6b2a'], [84, 470, 80, 62, '#4b5e2a'], [258, 560, 95, 75, '#6b2a16'], [168, 396, 110, 60, '#c8d6e2'],
    [84, 290, 80, 60, '#1f4a6b'], [270, 340, 85, 65, '#3d3a4d'], [116, 168, 90, 62, '#4f5b78'], [268, 190, 90, 70, '#c49a52'],
    [190, 78, 110, 55, '#3a0f1c'], [190, 668, 70, 40, '#2a5a8a'],
];
function svgMap(save) {
    const land = 'M30,700 C0,600 20,520 10,430 C0,330 30,260 20,180 C15,110 60,40 140,30 C220,20 300,30 340,90 C360,160 340,240 350,320 C360,420 345,520 352,610 C358,680 320,720 250,730 C170,740 80,745 30,700 Z';
    const biomes = BIOMES.map(([cx, cy, rx, ry, c]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" opacity=".85" filter="url(#soft)"/>`).join('');
    const lines = [];
    for (const s of SITES) {
        const from = s.requires.length ? s.requires.map((r) => SITES.find((x) => x.id === r).pos) : [HOME];
        for (const p of from) {
            const open = isUnlocked(save, s);
            lines.push(`<line x1="${p[0]}" y1="${p[1]}" x2="${s.pos[0]}" y2="${s.pos[1]}" stroke="${open ? '#f3d27a' : '#8a7d5c'}" stroke-width="${open ? 3 : 2}" stroke-dasharray="${open ? '0' : '6 6'}" opacity="${open ? 0.9 : 0.5}"/>`);
        }
    }
    return `<svg viewBox="0 0 360 800" width="360" height="800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
      <radialGradient id="sea" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#1f4466"/><stop offset="1" stop-color="#0a1626"/></radialGradient>
      <pattern id="waves" width="40" height="20" patternUnits="userSpaceOnUse"><path d="M0,10 q10,-6 20,0 t20,0" fill="none" stroke="#4d7aa3" stroke-width="1" opacity=".35"/></pattern>
    </defs>
    <rect width="360" height="800" fill="url(#sea)"/><rect width="360" height="800" fill="url(#waves)"/>
    <path d="${land}" fill="#5d6b3e" stroke="#c9b27a" stroke-width="3" opacity=".95"/>
    <g>${biomes}</g>
    <path d="${land}" fill="none" stroke="#e6d39a" stroke-width="1.5" opacity=".6"/>
    <g>${lines.join('')}</g>
  </svg>`;
}
export function show(o) {
    const save = o.save;
    const mapLayer = h('div', 'ow-map');
    mapLayer.innerHTML = svgMap(save);
    const nodes = h('div', 'ow-nodes');
    const home = h('div', 'ow-node home', h('span', 'ow-icon', '✨'), h('span', 'ow-label', 'Starwell'));
    home.style.left = HOME[0] + 'px';
    home.style.top = HOME[1] + 'px';
    home.addEventListener('click', o.onShop);
    nodes.append(home);
    const next = SITES.find((s) => isUnlocked(save, s) && save.cleared.indexOf(s.id) < 0);
    for (const s of SITES) {
        const open = isUnlocked(save, s);
        const done = save.cleared.indexOf(s.id) >= 0;
        const n = h('div', 'ow-node' + (open ? '' : ' locked') + (done ? ' done' : '') + (s === next ? ' next' : ''), h('span', 'ow-icon', open ? s.icon : '🔒'), h('span', 'ow-label', open ? s.name : '???'), done ? h('span', 'ow-check', '✦') : null);
        n.style.left = s.pos[0] + 'px';
        n.style.top = s.pos[1] + 'px';
        n.addEventListener('click', () => { if (open)
            siteSheet(save, s, o.onSite); });
        nodes.append(n);
    }
    const top = h('div', 'ow-top', h('div', 'ow-title', 'Realm of Aster'), h('div', 'ow-res', h('span', null, `💰 ${save.gold}`), h('span', null, `✦ ${shards(save)}/9`)));
    const bottom = h('div', 'ow-bottom', button(h('span', null, '🛡️', h('br'), 'Party'), o.onParty, 'btn tab'), button(h('span', null, '⚖️', h('br'), 'Market'), o.onShop, 'btn tab'), button(h('span', null, '☰', h('br'), 'Menu'), o.onMenu, 'btn tab'));
    showScreen(h('div', 'overworld', mapLayer, nodes, top, bottom));
}
function objectiveLabel(s) {
    const o = s.objective;
    return o.kind === 'rout' ? 'Defeat all enemies' : o.kind === 'boss' ? 'Defeat the boss' : o.kind === 'survive' ? `Survive ${o.turns} turns` : 'Reach the goal';
}
function siteSheet(save, s, onEnter) {
    const done = save.cleared.indexOf(s.id) >= 0;
    const foes = [...new Set([...s.enemies, ...(s.reinforcements ?? []).flatMap((r) => r.units)].map((p) => p.id))];
    const close = modal(h('div', 'sheet', h('div', 'sh-head', h('span', 'sh-icon', s.icon), h('div', null, h('h2', null, s.name), h('div', 'sh-sub', s.subtitle))), h('p', 'sh-blurb', s.blurb), h('div', 'sh-facts', h('span', null, `🎯 ${objectiveLabel(s)}`), h('span', null, `⚔ Enemy Lv ${s.level}`), h('span', null, `👥 Up to ${s.deploy} heroes`)), h('div', 'sh-label', 'Enemies'), h('div', 'sh-foes', ...foes.map((id) => { const e = enemyOf(id); return h('div', 'sh-foe', portraitEl(e.art, true, 'mini'), h('small', null, e.name)); })), s.recruit ? h('div', 'sh-recruit', portraitEl({ sprite: heroOf(s.recruit).sprite }, false, 'mini'), h('div', null, h('b', null, `${heroOf(s.recruit).name}, ${heroOf(s.recruit).title}`), h('small', null, save.roster.indexOf(s.recruit) >= 0 ? 'Joined your company.' : 'Fights as a guest here and joins when you win.'))) : null, h('div', 'sh-label', done ? 'Replay reward: gold, XP and a tonic' : 'First-clear reward'), h('div', 'sh-loot', ...(done ? [] : s.loot).map((id) => { const it = itemOf(id); return h('span', 'loot', `${it.icon} ${it.name}`); }), h('span', 'loot', `💰 ${done ? Math.floor(s.gold * 0.4) : s.gold}`), done ? null : h('span', 'loot', '✦ Star Shard (+1 SP to all)')), h('div', 'row-btns', button('Close', () => close()), button(done ? 'Replay' : 'Enter', () => { close(); onEnter(s); }, 'btn primary'))), { dismiss: true, cls: 'bottom' });
}
//# sourceMappingURL=overworld.js.map