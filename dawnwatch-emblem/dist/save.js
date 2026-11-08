import { HERO_DEFS } from './data/units.js';
import { LAST_CHAPTER, MAX_LEVEL, defaultSave, rosterFor } from './progress.js';
export const SAVE_KEY = 'tactics-battle-save-v1';
/* in-memory copy: used when storage is unavailable (22.4) and as a read cache */
let memory = null;
function isRecord(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
/* Validate and repair parsed JSON. Returns null when the save is invalid (22.3). */
export function validate(raw) {
    if (!isRecord(raw))
        return null;
    if (raw.version !== 1)
        return null;
    if (typeof raw.unlockedChapter !== 'number' || !Array.isArray(raw.cleared) || !isRecord(raw.levels) || !Array.isArray(raw.team))
        return null;
    if (!Number.isFinite(raw.unlockedChapter))
        return null;
    for (const c of raw.cleared)
        if (typeof c !== 'number')
            return null;
    for (const k of Object.keys(raw.levels))
        if (typeof raw.levels[k] !== 'number')
            return null;
    for (const t of raw.team)
        if (typeof t !== 'string')
            return null;
    const cleared = Array.from(new Set(raw.cleared.map((c) => Math.floor(c))
        .filter((c) => c >= 1 && c <= LAST_CHAPTER))).sort((a, b) => a - b);
    let unlocked = clamp(Math.floor(raw.unlockedChapter), 1, LAST_CHAPTER);
    if (cleared.length)
        unlocked = Math.max(unlocked, Math.min(LAST_CHAPTER, cleared[cleared.length - 1] + 1));
    const roster = rosterFor(cleared);
    const levels = {};
    for (const id of roster) {
        const v = raw.levels[id];
        levels[id] = typeof v === 'number' && Number.isFinite(v) ? clamp(Math.floor(v), 1, MAX_LEVEL) : 1;
    }
    const team = [];
    for (const t of raw.team) {
        if (roster.indexOf(t) >= 0 && team.indexOf(t) < 0 && team.length < 4)
            team.push(t);
    }
    for (const id of roster) {
        if (team.length >= 4)
            break;
        if (team.indexOf(id) < 0)
            team.push(id);
    }
    return { version: 1, unlockedChapter: unlocked, cleared, levels, team };
}
export function loadSave() {
    try {
        const txt = window.localStorage.getItem(SAVE_KEY);
        if (txt !== null) {
            const v = validate(JSON.parse(txt));
            if (v) {
                memory = v;
                return v;
            }
            return null;
        }
    }
    catch {
        /* storage unavailable or JSON invalid: fall through to the in-memory copy */
    }
    return memory;
}
export function hasSave() { return loadSave() !== null; }
export function writeSave(save) {
    memory = { ...save, cleared: [...save.cleared], levels: { ...save.levels }, team: [...save.team] };
    try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(memory));
    }
    catch { /* ignore */ }
}
export function newGameSave() {
    const s = defaultSave();
    writeSave(s);
    return s;
}
/* all hero ids (for tests / tools) */
export const ALL_HERO_IDS = HERO_DEFS.map((h) => h.id);
//# sourceMappingURL=save.js.map