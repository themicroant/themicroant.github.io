import { heroOf } from '../data/heroes.js';
import { itemOf } from '../data/items.js';
import { SCROLL_SKILLS, skillOf } from '../data/skills.js';
import { STATUS } from '../data/statuses.js';
import { canLearn, canLearnScroll, canUpgrade, describeNumbers, equippedItems, heroCrit, heroSkillNumbers, heroStats, isInnate, MAX_LEVEL, rankOf, spFree, spTotal, statsAt, XP_PER_LEVEL, } from '../rules.js';
import { MOVE_RANGE } from '../data/heroes.js';
import { addItem, shards } from '../progress.js';
import { bar, button, confirmModal, h, modal, portraitEl, showScreen, toast } from '../ui.js';
import { itemText, SLOT_LABEL } from './common.js';
let save;
let heroId;
let onBack;
let onChange;
export function show(s, back, changed, focus) {
    save = s;
    onBack = back;
    onChange = changed;
    heroId = focus && s.roster.indexOf(focus) >= 0 ? focus : heroId && s.roster.indexOf(heroId) >= 0 ? heroId : s.roster[0];
    render();
}
function hs() { return save.heroes[heroId]; }
function commit() { onChange(); render(); }
function render() {
    const st = save.heroes[heroId];
    const def = heroOf(heroId);
    const stats = heroStats(st);
    const bare = statsAt(def.base, def.growth, st.level);
    bare.mov = MOVE_RANGE[def.move];
    const free = spFree(st, shards(save));
    const tabs = h('div', 'p-tabs', ...save.roster.map((id) => {
        const t = button(portraitEl({ sprite: heroOf(id).sprite }, false, 'tab-face'), () => { heroId = id; render(); }, 'p-tab' + (id === heroId ? ' on' : ''));
        if (spFree(save.heroes[id], shards(save)) > 0)
            t.append(h('i', 'dot'));
        return t;
    }));
    const statGrid = h('div', 'p-stats', ...['hp', 'mp', 'atk', 'mag', 'def', 'res', 'spd', 'mov'].map((k) => {
        const d = stats[k] - bare[k];
        return h('div', 'ps', h('i', null, k.toUpperCase()), h('b', null, String(stats[k])), d ? h('small', d > 0 ? 'up' : 'down', `${d > 0 ? '+' : ''}${d}`) : null);
    }), h('div', 'ps', h('i', null, 'CRIT'), h('b', null, heroCrit(st) + '%')));
    const card = h('div', 'p-card', portraitEl({ sprite: def.sprite }, false, 'p-face'), h('div', 'p-info', h('div', 'p-name', h('b', null, def.name), h('span', null, ` ${def.title}`)), h('div', 'p-lv', `Lv ${st.level}` + (st.level >= MAX_LEVEL ? ' (max)' : ''), h('span', 'p-move', ` · ${def.move} · ${def.weapon}`)), st.level < MAX_LEVEL ? bar(st.xp, XP_PER_LEVEL, 'xp') : null, statGrid));
    const slots = ['weapon', 'armor', 'trinket'];
    const equip = h('div', 'p-equip', ...slots.map((slot) => {
        const id = st.equip[slot];
        const it = id ? itemOf(id) : null;
        return button(h('div', 'eq', h('span', 'eq-icon', it ? it.icon : '＋'), h('div', 'eq-mid', h('small', null, SLOT_LABEL[slot]), h('b', null, it ? it.name : 'Empty'))), () => equipMenu(slot), 'eq-btn');
    }));
    const skills = h('div', 'p-skills', h('div', 'p-sec', h('span', null, 'Skills'), h('span', 'sp' + (free > 0 ? ' has' : ''), `SP ${free} / ${spTotal(st, shards(save))}`)), ...[...def.skills, ...st.learned.filter((x) => SCROLL_SKILLS.indexOf(x) >= 0)].map((sid) => skillRow(st, sid)), Object.keys(save.bag).some((id) => itemOf(id).slot === 'scroll') ? button('📜 Learn from a scroll…', scrollMenu, 'btn small wide') : null);
    showScreen(h('div', 'party', h('div', 'hdr', button('‹ Back', onBack, 'btn small'), h('div', 'hdr-t', 'Party'), button('Reset SP', resetSp, 'btn small')), tabs, card, equip, skills));
}
function skillRow(st, sid) {
    const def = skillOf(sid);
    const learned = st.learned.indexOf(sid) >= 0;
    const why = learned ? null : canLearn(st, sid, shards(save));
    const ranks = def.upgrades.reduce((a, u) => a + rankOf(st, sid, u.id), 0);
    const maxRanks = def.upgrades.reduce((a, u) => a + u.max, 0);
    let right;
    if (learned)
        right = h('span', 'sk-ranks', `${ranks}/${maxRanks} ✦`);
    else if (st.level < def.learnLevel)
        right = h('span', 'sk-lock', `Lv ${def.learnLevel}`);
    else
        right = button('Learn · 1 SP', () => { if (!canLearn(hs(), sid, shards(save))) {
            hs().learned.push(sid);
            toast(`${heroOf(heroId).name} learned ${def.name}!`);
            commit();
        } }, 'btn small primary', !!why);
    const row = h('div', 'sk-row' + (learned ? ' learned' : '') + (st.level < def.learnLevel ? ' locked' : ''), h('span', 'sk-icon s-' + def.school, def.icon), h('div', 'sk-mid', h('b', null, def.name, isInnate(st, sid) ? h('small', null, ' innate') : SCROLL_SKILLS.indexOf(sid) >= 0 ? h('small', null, ' scroll') : null), h('small', null, def.desc)), right);
    row.addEventListener('click', (e) => { if (e.target.closest('button'))
        return; forge(sid); });
    return row;
}
/* ---------------- Skill Forge ---------------- */
function miniGrid(def, n) {
    const R = 4;
    const g = h('div', 'mini-grid');
    // Area example: centred on the caster for self skills, else on the farthest tile to the right.
    const ax = def.target === 'self' ? 0 : Math.min(R, n.range), ay = 0;
    for (let y = -R; y <= R; y++)
        for (let x = -R; x <= R; x++) {
            const d = Math.abs(x) + Math.abs(y);
            const inRange = def.target !== 'self' && d >= n.minRange && d <= n.range;
            const ad = def.shape === 'square' ? Math.max(Math.abs(x - ax), Math.abs(y - ay)) : Math.abs(x - ax) + Math.abs(y - ay);
            const inArea = ad <= n.aoe && !(def.special === 'blink');
            g.append(h('i', (x === 0 && y === 0 ? 'me ' : '') + (inArea ? 'area ' : '') + (inRange ? 'rng' : '')));
        }
    return g;
}
function forge(sid) {
    const def = skillOf(sid);
    const holder = h('div');
    const close = modal(holder, { cls: 'tall' });
    const draw = () => {
        const st = hs();
        const learned = st.learned.indexOf(sid) >= 0;
        const n = heroSkillNumbers(st, sid);
        const free = spFree(st, shards(save));
        const itemRules = equippedItems(st).flatMap((it) => (it.mods ?? []).filter((r) => (!r.school || r.school === def.school) && (!r.skill || r.skill === def.id)).map((r) => `${it.icon} ${r.text}`));
        const body = h('div', 'forge', h('div', 'fg-head', h('span', 'sk-icon big s-' + def.school, def.icon), h('div', null, h('h2', null, def.name), h('small', 'school s-' + def.school, `${def.school} · ${def.kind} · scales with ${def.scale.toUpperCase()}`))), h('p', 'fg-desc', def.desc), h('div', 'fg-top', miniGrid(def, n), h('div', 'fg-nums', ...describeNumbers(def, n, heroStats(st)[def.scale]).map((t) => h('div', null, t)), ...n.statuses.map((s) => h('div', 'fx', `${STATUS[s.id].icon} ${STATUS[s.id].name} ${s.turns}t${s.power ? ` (${s.power}%)` : ''}`)), ...n.selfStatuses.map((s) => h('div', 'fx', `Self: ${STATUS[s.id].icon} ${STATUS[s.id].name} ${s.turns}t`)))), itemRules.length ? h('div', 'fg-items', 'From items: ' + itemRules.join(' · ')) : null, h('div', 'p-sec', h('span', null, 'Enhancements'), h('span', 'sp' + (free > 0 ? ' has' : ''), `SP ${free}`)), !learned ? h('p', 'muted', st.level < def.learnLevel ? `Unlocks at Lv ${def.learnLevel}.` : 'Learn this skill to enhance it.') : null, ...def.upgrades.map((u) => {
            const r = rankOf(st, sid, u.id);
            const why = canUpgrade(st, sid, u.id, shards(save));
            return h('div', 'up-row', h('div', 'up-mid', h('b', null, u.name), h('small', null, u.desc), h('div', 'pips', ...Array.from({ length: u.max }, (_, i) => h('i', i < r ? 'on' : '')))), h('span', 'up-cost', `${u.cost} SP`), button('−', () => { const k = sid + '.' + u.id; if (r > 0) {
                st.ranks[k] = r - 1;
                if (!st.ranks[k])
                    delete st.ranks[k];
                onChange();
                draw();
            } }, 'btn sq', r === 0), button('+', () => { if (!why) {
                st.ranks[sid + '.' + u.id] = r + 1;
                onChange();
                draw();
            } }, 'btn sq primary', !!why));
        }), h('div', 'row-btns', button('Done', () => { close(); render(); }, 'btn primary')));
        holder.replaceChildren(body);
    };
    draw();
}
/* ---------------- equipment ---------------- */
function equipMenu(slot) {
    const st = hs();
    const def = heroOf(heroId);
    const cur = st.equip[slot];
    const ids = Object.keys(save.bag).filter((id) => {
        const it = itemOf(id);
        return it.slot === slot && (slot !== 'weapon' || it.weapon === def.weapon);
    });
    const others = save.roster.filter((r) => r !== heroId && save.heroes[r].equip[slot] && (slot !== 'weapon' || itemOf(save.heroes[r].equip.weapon).weapon === def.weapon));
    const close = modal(h('div', null, h('h2', null, `${def.name} · ${SLOT_LABEL[slot]}`), slot === 'weapon' ? h('p', 'muted', `${def.name} uses ${def.weapon}s.`) : null, cur ? h('div', 'li cur', h('span', 'li-icon', itemOf(cur).icon), h('div', 'li-mid', h('b', null, itemOf(cur).name + ' (equipped)'), h('small', null, itemText(itemOf(cur))))) : null, h('div', 'list', ...ids.map((id) => {
        const it = itemOf(id);
        return button(h('div', 'li', h('span', 'li-icon', it.icon), h('div', 'li-mid', h('b', null, it.name), h('small', null, itemText(it))), h('span', 'li-r', '×' + save.bag[id])), () => { if (cur)
            addItem(save, cur); addItem(save, id, -1); st.equip[slot] = id; close(); commit(); }, 'li-btn');
    }), ...others.map((r) => {
        const id = save.heroes[r].equip[slot];
        const it = itemOf(id);
        return button(h('div', 'li', h('span', 'li-icon', it.icon), h('div', 'li-mid', h('b', null, it.name), h('small', null, `Swap with ${heroOf(r).name} · ${itemText(it)}`))), () => { save.heroes[r].equip[slot] = cur; if (!cur)
            delete save.heroes[r].equip[slot]; st.equip[slot] = id; close(); commit(); }, 'li-btn');
    }), !ids.length && !others.length ? h('p', 'muted', 'No items for this slot. Win battles or visit the Market.') : null), h('div', 'row-btns', cur ? button('Unequip', () => { addItem(save, cur); delete st.equip[slot]; close(); commit(); }) : null, button('Close', () => close(), 'btn primary'))), { dismiss: true, cls: 'tall' });
}
function scrollMenu() {
    const st = hs();
    const ids = Object.keys(save.bag).filter((id) => itemOf(id).slot === 'scroll');
    const close = modal(h('div', null, h('h2', null, 'Learn from a scroll'), h('p', 'muted', 'The scroll is used up. Each hero can know up to 2 scroll skills.'), h('div', 'list', ...ids.map((id) => {
        const it = itemOf(id);
        const why = canLearnScroll(st, it.teaches);
        return button(h('div', 'li', h('span', 'li-icon', skillOf(it.teaches).icon), h('div', 'li-mid', h('b', null, skillOf(it.teaches).name), h('small', null, why ?? skillOf(it.teaches).desc)), h('span', 'li-r', '×' + save.bag[id])), () => { if (!why) {
            st.learned.push(it.teaches);
            addItem(save, id, -1);
            close();
            toast(`${heroOf(heroId).name} learned ${skillOf(it.teaches).name}!`);
            commit();
        } }, 'li-btn', !!why);
    })), h('div', 'row-btns', button('Close', () => close()))), { dismiss: true });
}
function resetSp() {
    confirmModal('Reset skill points?', `${heroOf(heroId).name} forgets all learned class skills (except the innate one) and enhancements. All SP are refunded. Scroll skills are kept.`, 'Reset', () => {
        const st = hs();
        st.ranks = {};
        st.learned = st.learned.filter((id) => isInnate(st, id) || SCROLL_SKILLS.indexOf(id) >= 0);
        commit();
    });
}
//# sourceMappingURL=party.js.map