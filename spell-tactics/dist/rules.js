import { heroOf, MOVE_RANGE } from './data/heroes.js';
import { itemOf } from './data/items.js';
import { MAX_SCROLL_SKILLS, SCROLL_SKILLS, skillOf } from './data/skills.js';
export const MAX_LEVEL = 20;
export const XP_PER_LEVEL = 100;
export const STAT_KEYS = ['hp', 'mp', 'atk', 'mag', 'def', 'res', 'spd', 'mov'];
export function statsAt(base, growth, level) {
    const out = { ...base };
    for (const k of STAT_KEYS)
        out[k] = Math.floor(base[k] + (growth[k] ?? 0) * (level - 1));
    return out;
}
export function equippedItems(hs) {
    return [hs.equip.weapon, hs.equip.armor, hs.equip.trinket].filter((x) => !!x).map(itemOf);
}
/** Final hero stats: level growth + equipment. Movement comes from the move type (+ item bonuses). */
export function heroStats(hs) {
    const def = heroOf(hs.id);
    const s = statsAt(def.base, def.growth, hs.level);
    s.mov = MOVE_RANGE[def.move];
    for (const it of equippedItems(hs))
        for (const k of STAT_KEYS)
            s[k] += it.stats?.[k] ?? 0;
    for (const k of STAT_KEYS)
        s[k] = Math.max(k === 'hp' ? 1 : 0, s[k]);
    return s;
}
export function heroCrit(hs) {
    return heroOf(hs.id).crit + equippedItems(hs).reduce((a, i) => a + (i.crit ?? 0), 0);
}
export function heroLifesteal(hs) {
    return equippedItems(hs).reduce((a, i) => a + (i.lifesteal ?? 0), 0);
}
/* ---------------- skill points ---------------- */
/** Total SP: 3 at Lv1, +2 per level, +1 per recovered shard (cleared site). */
export function spTotal(hs, shards) {
    return 3 + 2 * (hs.level - 1) + shards;
}
export function isInnate(hs, skillId) {
    return heroOf(hs.id).skills[0] === skillId;
}
export function spSpent(hs) {
    let n = 0;
    for (const id of hs.learned)
        if (!isInnate(hs, id) && SCROLL_SKILLS.indexOf(id) < 0)
            n += 1;
    for (const key of Object.keys(hs.ranks)) {
        const [sid, uid] = key.split('.');
        const up = skillOf(sid).upgrades.find((u) => u.id === uid);
        if (up)
            n += up.cost * hs.ranks[key];
    }
    return n;
}
export function spFree(hs, shards) {
    return spTotal(hs, shards) - spSpent(hs);
}
export function canLearn(hs, skillId, shards) {
    const def = skillOf(skillId);
    if (hs.learned.indexOf(skillId) >= 0)
        return 'Already learned';
    if (hs.level < def.learnLevel)
        return `Requires Lv ${def.learnLevel}`;
    if (spFree(hs, shards) < 1)
        return 'Needs 1 SP';
    return null;
}
export function scrollSkillCount(hs) {
    return hs.learned.filter((id) => SCROLL_SKILLS.indexOf(id) >= 0).length;
}
export function canLearnScroll(hs, skillId) {
    if (hs.learned.indexOf(skillId) >= 0)
        return 'Already known';
    if (scrollSkillCount(hs) >= MAX_SCROLL_SKILLS)
        return `Knows ${MAX_SCROLL_SKILLS} scroll skills`;
    return null;
}
export function rankOf(hs, skillId, upId) {
    return hs.ranks[skillId + '.' + upId] ?? 0;
}
export function canUpgrade(hs, skillId, upId, shards) {
    if (hs.learned.indexOf(skillId) < 0)
        return 'Learn the skill first';
    const up = skillOf(skillId).upgrades.find((u) => u.id === upId);
    if (!up)
        return 'Unknown upgrade';
    if (rankOf(hs, skillId, upId) >= up.max)
        return 'Max rank';
    if (spFree(hs, shards) < up.cost)
        return `Needs ${up.cost} SP`;
    return null;
}
/* ---------------- skill resolution ---------------- */
function blank(def) {
    const b = def.base;
    const range = b.range ?? 1;
    return {
        range,
        minRange: b.minRange ?? (range === 0 || def.target === 'ally' ? 0 : 1),
        power: b.power ?? 0, aoe: b.aoe ?? 0, cost: b.cost ?? 0, cooldown: b.cooldown ?? 0,
        chain: b.chain ?? 0, push: b.push ?? 0, lifesteal: b.lifesteal ?? 0, allyHeal: b.allyHeal ?? 0,
        statuses: (b.statuses ?? []).map((s) => ({ ...s })),
        selfStatuses: (b.selfStatuses ?? []).map((s) => ({ ...s })),
    };
}
function addStatus(list, s) {
    const ex = list.find((x) => x.id === s.id);
    if (ex) {
        ex.turns = Math.max(ex.turns, s.turns);
        ex.power = Math.max(ex.power ?? 0, s.power ?? 0) || undefined;
    }
    else
        list.push({ ...s });
}
function applyMod(def, n, m, times, acc) {
    for (let i = 0; i < times; i++) {
        if (def.target !== 'self') {
            n.range += m.range ?? 0;
            n.minRange += m.minRange ?? 0;
        }
        if (def.special !== 'blink' && def.special !== 'summon')
            n.aoe += m.aoe ?? 0;
        n.power += n.power > 0 || def.kind !== 'buff' ? m.power ?? 0 : 0;
        n.cost += m.cost ?? 0;
        n.cooldown += m.cooldown ?? 0;
        if (def.kind === 'damage' && def.target === 'enemy')
            n.chain += m.chain ?? 0;
        n.push += m.push ?? 0;
        if (def.kind === 'damage')
            n.lifesteal += m.lifesteal ?? 0;
        n.allyHeal += m.allyHeal ?? 0;
        if (m.addStatus)
            addStatus(n.statuses, m.addStatus);
        if (m.addSelfStatus)
            addStatus(n.selfStatuses, m.addSelfStatus);
        acc.turns += m.statusTurns ?? 0;
        acc.power += m.statusPower ?? 0;
    }
}
/** Apply upgrade ranks and item rules to a skill definition (SPEC 6.4). */
export function resolveSkill(def, ranks, items) {
    const n = blank(def);
    const acc = { turns: 0, power: 0 };
    for (const up of def.upgrades)
        applyMod(def, n, up.mod, ranks[up.id] ?? 0, acc);
    for (const it of items)
        for (const r of it.mods ?? []) {
            if ((r.school && r.school !== def.school) || (r.skill && r.skill !== def.id))
                continue;
            applyMod(def, n, r.mod, 1, acc);
        }
    for (const s of [...n.statuses, ...n.selfStatuses]) {
        s.turns += acc.turns;
        if (s.power !== undefined)
            s.power += acc.power;
    }
    n.cost = Math.max(0, n.cost);
    n.cooldown = Math.max(0, n.cooldown);
    n.range = Math.max(n.minRange, n.range);
    return n;
}
export function heroSkillNumbers(hs, skillId) {
    const def = skillOf(skillId);
    const ranks = {};
    for (const up of def.upgrades)
        ranks[up.id] = rankOf(hs, skillId, up.id);
    return resolveSkill(def, ranks, equippedItems(hs));
}
/* ---------------- heroes & xp ---------------- */
export function newHeroSave(id, level) {
    const def = heroOf(id);
    return { id, level, xp: 0, learned: [def.skills[0]], ranks: {}, equip: {} };
}
/** Adds XP, levelling up as needed. Returns the number of levels gained. */
export function addXp(hs, xp) {
    let gained = 0;
    if (hs.level >= MAX_LEVEL)
        return 0;
    hs.xp += xp;
    while (hs.xp >= XP_PER_LEVEL && hs.level < MAX_LEVEL) {
        hs.xp -= XP_PER_LEVEL;
        hs.level++;
        gained++;
    }
    if (hs.level >= MAX_LEVEL)
        hs.xp = 0;
    return gained;
}
/** XP for a damaging/healing action and for defeating an enemy (SPEC 9.2). */
export function actionXp(heroLv, targetLv) {
    return heroLv > targetLv + 3 ? 5 : 10;
}
export function killXp(heroLv, enemyLv, boss) {
    const base = 20 + 5 * Math.max(0, Math.min(4, enemyLv - heroLv + 2));
    return (heroLv > enemyLv + 3 ? Math.floor(base / 2) : base) + (boss ? 40 : 0);
}
export function describeNumbers(def, n, scaleStat) {
    const out = [];
    if (def.target === 'self')
        out.push('Self');
    else
        out.push(n.minRange > 1 || (n.minRange === 1 && def.target === 'ally') ? `Range ${n.minRange}–${n.range}` : `Range ${n.range}`);
    if (n.aoe > 0)
        out.push(`Area ${n.aoe} (${def.shape === 'square' ? '◼' : '◆'})`);
    if (n.power > 0) {
        const what = def.kind === 'heal' ? 'Heal' : def.kind === 'buff' ? 'Power' : 'Power';
        out.push(`${what} ${n.power}%` + (scaleStat !== undefined ? ` (${Math.floor((scaleStat * n.power) / 100)})` : ''));
    }
    if (n.allyHeal > 0)
        out.push(`Ally heal ${n.allyHeal}%`);
    if (n.chain > 0)
        out.push(`Chains ×${n.chain}`);
    if (n.push > 0)
        out.push(`Knockback ${n.push}`);
    if (n.lifesteal > 0)
        out.push(`Lifesteal ${n.lifesteal}%`);
    out.push(`Mana ${n.cost}`);
    out.push(n.cooldown > 0 ? `Cooldown ${n.cooldown}` : 'No cooldown');
    return out;
}
//# sourceMappingURL=rules.js.map