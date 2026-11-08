import { chapterOf } from '../data/chapters.js';
import { BIOS, HERO_DEFS } from '../data/units.js';
import { heroStats, rosterFor } from '../progress.js';
import { healFromAtk } from '../logic.js';
import { badgeHtml, $, h, MOVE_NAMES, portrait, unitMeta, button } from '../ui.js';
import { writeSave } from '../save.js';
let T = null;
let opts = null;
let wired = false;
function persist() {
    if (!T)
        return;
    T.save = { ...T.save, team: [...T.team] };
    writeSave(T.save);
}
function heroLevel(id) { return T ? T.save.levels[id] ?? 1 : 1; }
function slotOf(id) { return T ? T.team.indexOf(id) : -1; }
function renderHeader() {
    if (!opts)
        return;
    const ch = chapterOf(opts.chapter);
    const el = $('teamHeader');
    el.innerHTML = '';
    el.appendChild(h('div', 'th-cap', 'CHAPTER ' + ch.num));
    el.appendChild(h('div', 'th-name', ch.name));
    el.appendChild(h('div', 'th-obj', ch.objective + '  ·  Rec. Lv ' + ch.recLevel));
}
function renderSlots() {
    if (!T)
        return;
    const el = $('teamSlots');
    el.innerHTML = '';
    T.team.forEach((id, i) => {
        const s = h('div', 'slot' + (T && T.armed === i ? ' armed' : ''));
        const p = portrait(unitMeta(id));
        s.appendChild(p);
        s.appendChild(h('div', 'sn', String(i + 1)));
        s.appendChild(h('div', 'sname', unitMeta(id).name));
        s.appendChild(h('div', 'slv', 'Lv ' + heroLevel(id)));
        s.addEventListener('click', () => { tapSlot(i); });
        el.appendChild(s);
    });
}
function renderRoster() {
    if (!T)
        return;
    const el = $('rosterGrid');
    el.innerHTML = '';
    for (const id of T.roster) {
        const slot = slotOf(id);
        const c = h('div', 'rcell' + (slot >= 0 ? ' inteam' : '') + (T.fromRoster && T.pick === id ? ' picked' : ''));
        c.appendChild(portrait(unitMeta(id)));
        c.appendChild(h('div', 'rname', unitMeta(id).name));
        c.appendChild(h('div', 'rlv', 'Lv ' + heroLevel(id)));
        if (slot >= 0)
            c.appendChild(h('div', 'rtag', 'Slot ' + (slot + 1)));
        c.addEventListener('click', () => { tapRoster(id); });
        el.appendChild(c);
    }
}
function statRow(label, v) {
    return '<div class="stat"><span>' + label + '</span><b>' + v + '</b></div>';
}
function renderDetail() {
    if (!T)
        return;
    const id = T.pick;
    const m = unitMeta(id);
    const lv = heroLevel(id);
    const s = heroStats(id, lv);
    const el = $('heroDetail');
    el.innerHTML = '';
    const pf = portrait(m);
    pf.classList.add('big');
    el.appendChild(pf);
    const meta = h('div', 'dmeta');
    const nm = h('div', 'nm');
    nm.appendChild(document.createTextNode(m.name));
    nm.appendChild(h('span', 'lv', 'Lv ' + lv));
    meta.appendChild(nm);
    const sub = h('div', 'sub');
    sub.innerHTML = badgeHtml(m.weapon) + '<span>' + m.weapon + '</span><span>· ' + MOVE_NAMES[m.moveType] + '</span>';
    meta.appendChild(sub);
    meta.appendChild(h('div', 'bio', BIOS[id] ?? ''));
    const stats = h('div', 'stats');
    stats.innerHTML = statRow('HP', s.hp) + statRow('Atk', s.atk) + statRow('Spd', s.spd) + statRow('Def', s.def) + statRow('Res', s.res);
    meta.appendChild(stats);
    let spc = 'Surge  CD ' + s.cd;
    if (m.weapon === 'Staff')
        spc += '   ·   Heal  +' + healFromAtk(s.atk);
    meta.appendChild(h('div', 'spc', spc));
    el.appendChild(meta);
    const slot = slotOf(id);
    if (slot >= 0) {
        el.appendChild(h('div', 'inteamlbl', 'In team (slot ' + (slot + 1) + ')'));
    }
    else {
        const b = button('Add', 'primary addbtn', () => { replaceArmed(); });
        el.appendChild(b);
    }
}
function renderAll() {
    renderHeader();
    renderSlots();
    renderRoster();
    renderDetail();
    const bb = $('btnBattle');
    bb.disabled = !T || T.roster.length < 4;
}
function replaceAt(i) {
    if (!T)
        return;
    T.team[i] = T.pick;
    T.armed = i;
    persist();
    renderAll();
}
function replaceArmed() {
    if (!T || slotOf(T.pick) >= 0)
        return;
    replaceAt(T.armed);
}
function tapRoster(id) {
    if (!T)
        return;
    T.pick = id;
    T.fromRoster = true;
    const s = slotOf(id);
    if (s >= 0)
        T.armed = s;
    renderAll();
}
function tapSlot(i) {
    if (!T)
        return;
    if (T.fromRoster) {
        const j = slotOf(T.pick);
        if (j < 0) {
            replaceAt(i);
            return;
        }
        if (j !== i) {
            const a = T.team[i], b = T.team[j];
            T.team[i] = b;
            T.team[j] = a;
            T.armed = i;
            persist();
            renderAll();
            return;
        }
    }
    T.armed = i;
    T.pick = T.team[i];
    T.fromRoster = false;
    renderAll();
}
export function show(o) {
    opts = o;
    const roster = rosterFor(o.save.cleared).filter((id) => HERO_DEFS.some((d) => d.id === id));
    const team = o.save.team.filter((id) => roster.indexOf(id) >= 0).slice(0, 4);
    for (const id of roster)
        if (team.length < 4 && team.indexOf(id) < 0)
            team.push(id);
    T = { save: o.save, team, roster, pick: roster[0] ?? team[0], fromRoster: false, armed: 3 };
    if (!wired) {
        wired = true;
        $('btnTeamBack').addEventListener('click', () => { if (opts)
            opts.onBack(); });
        $('btnBattle').addEventListener('click', () => {
            if (!T || !opts || T.roster.length < 4)
                return;
            persist();
            opts.onBattle(T.save);
        });
    }
    renderAll();
}
//# sourceMappingURL=teamBuilder.js.map