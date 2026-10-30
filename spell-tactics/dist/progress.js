import { SITES } from './data/sites.js';
import { ITEMS } from './data/items.js';
import { addXp } from './rules.js';
import { makeGuest } from './save.js';
export const VICTORY_XP = 30;
export const BENCH_XP = 20;
export function isUnlocked(save, site) {
    return site.requires.every((r) => save.cleared.indexOf(r) >= 0);
}
export function shards(save) { return save.cleared.length; }
export function avgLevel(save) {
    const lv = save.roster.map((id) => save.heroes[id].level);
    return lv.length ? Math.round(lv.reduce((a, c) => a + c, 0) / lv.length) : 1;
}
/** The guest for a site, created on first visit (fights there, joins on first clear). */
export function guestFor(save, site) {
    if (!site.recruit || save.roster.indexOf(site.recruit) >= 0)
        return null;
    if (!save.heroes[site.recruit])
        save.heroes[site.recruit] = makeGuest(site.recruit, Math.max(site.level, avgLevel(save)), shards(save));
    return save.heroes[site.recruit];
}
export function addItem(save, id, n = 1) {
    save.bag[id] = (save.bag[id] ?? 0) + n;
    if (save.bag[id] <= 0)
        delete save.bag[id];
}
/** Applies the result of a battle to the save (SPEC 9.2, 10.4). Mutates and returns rewards. */
export function applyBattle(save, site, units, win, bag) {
    save.bag = { ...bag };
    for (const k of Object.keys(save.bag))
        if (save.bag[k] <= 0)
            delete save.bag[k];
    const firstClear = win && save.cleared.indexOf(site.id) < 0;
    const r = { firstClear, gold: 0, loot: [], gains: [], win };
    const heroes = units.filter((u) => u.side === 'hero');
    for (const u of heroes) {
        const xp = u.xp + (win ? VICTORY_XP : 0);
        r.gains.push({ id: u.key, xp, levels: addXp(save.heroes[u.key], xp), deployed: true });
    }
    if (!win)
        return r;
    for (const id of save.roster)
        if (!heroes.some((u) => u.key === id)) {
            r.gains.push({ id, xp: BENCH_XP, levels: addXp(save.heroes[id], BENCH_XP), deployed: false });
        }
    if (firstClear) {
        r.gold = site.gold;
        r.loot = [...site.loot];
        save.cleared.push(site.id);
        if (site.recruit && save.roster.indexOf(site.recruit) < 0) {
            save.roster.push(site.recruit);
            r.recruit = site.recruit;
        }
    }
    else {
        r.gold = Math.floor(site.gold * 0.4);
        r.loot = [Math.random() < 0.5 ? 'potion' : 'ether'];
    }
    save.gold += r.gold;
    for (const id of r.loot)
        addItem(save, id);
    return r;
}
/** Items the market sells: general stock + themed items of every cleared site (SPEC 8.5). */
export function shopStock(save) {
    return ITEMS.filter((i) => (i.site === 0 || (save.cleared.indexOf(i.site) >= 0 && i.site < 9))).map((i) => i.id);
}
export function finished(save) {
    return save.cleared.indexOf(SITES[SITES.length - 1].id) >= 0;
}
//# sourceMappingURL=progress.js.map