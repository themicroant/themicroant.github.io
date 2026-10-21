import { GROWTH, START_HEROES, baseDef } from './data/units.js';
import { CHAPTERS } from './data/chapters.js';
export const MAX_LEVEL = 10;
export const LAST_CHAPTER = 5;
/* stat = base + growth * (Lv - 1); CD does not scale */
export function statsAt(id, level) {
    const b = baseDef(id);
    const g = GROWTH[id];
    const n = Math.max(0, level - 1);
    return {
        hp: b.hp + g.hp * n, atk: b.atk + g.atk * n, spd: b.spd + g.spd * n,
        def: b.def + g.def * n, res: b.res + g.res * n, cd: b.cd,
    };
}
export function heroStats(id, level) { return statsAt(id, level); }
export function enemyStats(type, level) { return statsAt(type, level); }
/* roster = starting four plus the recruits of every cleared chapter, in table order */
export function rosterFor(cleared) {
    const out = [...START_HEROES];
    for (const ch of CHAPTERS) {
        if (cleared.indexOf(ch.num) >= 0) {
            for (const h of ch.joins)
                if (out.indexOf(h) < 0)
                    out.push(h);
        }
    }
    return out;
}
export function defaultSave() {
    const levels = {};
    START_HEROES.forEach((h) => { levels[h] = 1; });
    return { version: 1, unlockedChapter: 1, cleared: [], levels, team: [...START_HEROES] };
}
/* Apply a victory in chapter `chapter` with the given deployed team (SPEC 19.3, 19.4). Does not mutate `save`. */
export function applyVictory(save, chapter, team) {
    const levels = { ...save.levels };
    const changes = [];
    const recruits = [];
    // 19.3 level up deployed heroes
    for (const id of team) {
        const from = levels[id] ?? 1;
        const to = Math.min(MAX_LEVEL, from + 1);
        levels[id] = to;
        changes.push({ id, from, to, caughtUp: false });
    }
    // 19.4.1 recruit
    const first = save.cleared.indexOf(chapter) < 0;
    const ch = CHAPTERS.find((c) => c.num === chapter);
    const fresh = [];
    if (first && ch) {
        for (const h of ch.joins) {
            if (levels[h] === undefined) {
                fresh.push(h);
                recruits.push(h);
            }
        }
    }
    // 19.4.2 / 3 catch-up
    let sum = 0;
    for (const id of team)
        sum += levels[id];
    const avg = team.length ? Math.floor(sum / team.length) : 1;
    const floorLv = Math.max(1, avg - 1);
    for (const h of fresh)
        levels[h] = floorLv;
    for (const id of Object.keys(levels)) {
        if (team.indexOf(id) >= 0 || fresh.indexOf(id) >= 0)
            continue;
        if (levels[id] < floorLv) {
            changes.push({ id, from: levels[id], to: floorLv, caughtUp: true });
            levels[id] = floorLv;
        }
    }
    // 19.4.4 progress
    const cleared = save.cleared.indexOf(chapter) < 0 ? [...save.cleared, chapter].sort((a, b) => a - b) : [...save.cleared];
    const unlockedChapter = Math.max(save.unlockedChapter, Math.min(LAST_CHAPTER, chapter + 1));
    const unlocked = unlockedChapter > save.unlockedChapter ? unlockedChapter : null;
    const out = { version: 1, unlockedChapter, cleared, levels, team: [...save.team] };
    return { save: out, changes, recruits, unlocked };
}
//# sourceMappingURL=progress.js.map