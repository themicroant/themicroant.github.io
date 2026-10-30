import { HEROES, heroOf } from './data/heroes.js';
import { STARTING_WEAPON } from './data/items.js';
import { canLearn, newHeroSave } from './rules.js';
import { skillOf } from './data/skills.js';
const KEY = 'spell-tactics-save-v1';
export function newGameSave() {
    const s = { v: 1, heroes: {}, roster: [], party: [], cleared: [], gold: 100, bag: { potion: 3, ether: 2, padded_vest: 1 }, seenIntro: false };
    for (const h of HEROES.filter((x) => x.joins === 0)) {
        s.heroes[h.id] = makeHero(h.id, 1);
        s.roster.push(h.id);
    }
    s.party = [...s.roster];
    return s;
}
export function makeHero(id, level) {
    const hs = newHeroSave(id, level);
    hs.equip.weapon = STARTING_WEAPON[id];
    return hs;
}
/** A guest arrives with its class skills learned in order while SP allows (SPEC 9.4). */
export function makeGuest(id, level, shards) {
    const hs = makeHero(id, level);
    for (const sid of heroOf(id).skills)
        if (!canLearn(hs, sid, shards))
            hs.learned.push(sid);
    return hs;
}
export function hasSave() {
    try {
        return !!localStorage.getItem(KEY);
    }
    catch {
        return false;
    }
}
export function loadSave() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw)
            return null;
        const s = JSON.parse(raw);
        if (s.v !== 1 || !s.heroes || !Array.isArray(s.roster))
            return null;
        for (const hs of Object.values(s.heroes))
            hs.learned = hs.learned.filter((id) => { try {
                skillOf(id);
                return true;
            }
            catch {
                return false;
            } });
        return s;
    }
    catch {
        return null;
    }
}
export function writeSave(s) {
    try {
        localStorage.setItem(KEY, JSON.stringify(s));
    }
    catch { /* storage unavailable: play continues unsaved */ }
}
export function clearSave() {
    try {
        localStorage.removeItem(KEY);
    }
    catch { /* ignore */ }
}
//# sourceMappingURL=save.js.map