import { heroOf } from '../data/heroes.js';
import { enemyOf } from '../data/enemies.js';
import { itemOf } from '../data/items.js';
import { skillOf } from '../data/skills.js';
import { actionXp, heroCrit, heroLifesteal, heroSkillNumbers, heroStats, killXp, resolveSkill, statsAt } from '../rules.js';
export const W = 8;
export const H = 10;
/* ---------------- terrain ---------------- */
export const TERRAIN_NAME = {
    '.': 'Plain', F: 'Forest', M: 'Mountain', W: 'Water', '#': 'Wall', T: 'Fort', L: 'Lava', S: 'Sand', B: 'Bog',
    I: 'Ice', X: 'Snowdrift', R: 'Rubble', C: 'Ley Rune', E: 'Goal', G: 'Grave', V: 'Chasm',
};
export function moveCost(t, m) {
    const fly = m === 'flying';
    switch (t) {
        case '#': return Infinity;
        case 'M':
        case 'W':
        case 'V': return fly ? 1 : Infinity;
        case 'F': return fly ? 1 : m === 'mounted' ? 3 : 2;
        case 'S':
        case 'B':
        case 'X':
        case 'R': return fly ? 1 : 2;
        default: return 1;
    }
}
export function defBonus(t) {
    return t === 'T' ? 3 : t === 'F' ? 2 : t === 'R' ? 1 : 0;
}
export const inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
export const dist = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);
export const terrainAt = (b, x, y) => b.map[y][x];
export const unitAt = (b, x, y) => b.units.find((u) => u.alive && u.x === x && u.y === y);
export const alive = (b, side) => b.units.filter((u) => u.alive && (!side || u.side === side));
export const hasStatus = (u, id) => u.statuses.some((s) => s.id === id);
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/* ---------------- unit creation ---------------- */
function attackSkill(a, name) {
    const def = {
        id: 'attack', name: 'Attack', icon: a.minRange >= 2 ? '🏹' : a.scale === 'mag' ? '✴️' : '⚔️', school: a.school, target: 'enemy',
        shape: 'circle', scale: a.scale, kind: 'damage', learnLevel: 1, upgrades: [],
        desc: `${name}'s basic attack. Free. The target strikes back if it can reach.`,
        base: { range: a.range, minRange: a.minRange, power: 100 },
    };
    return { id: 'attack', def, nums: resolveSkill(def, {}, []), cd: 0 };
}
export function makeHero(b, hs, x, y) {
    const def = heroOf(hs.id);
    const stats = heroStats(hs);
    return {
        uid: b.nextUid++, side: 'hero', key: hs.id, name: def.name, level: hs.level, x, y, startX: x, startY: y,
        hp: stats.hp, mp: stats.mp, stats, crit: heroCrit(hs), lifesteal: heroLifesteal(hs), move: def.move,
        attack: attackSkill(def.attack, def.name),
        skills: hs.learned.map((id) => ({ id, def: skillOf(id), nums: heroSkillNumbers(hs, id), cd: 0 })),
        statuses: [], moved: false, acted: false, boss: false, ai: 'aggro', provoked: true, tags: def.move === 'flying' ? ['flying'] : [],
        weak: [], resist: [], art: { sprite: def.sprite }, alive: true, xp: 0, kills: 0,
    };
}
export function makeEnemy(b, p, baseLevel) {
    const def = enemyOf(p.id);
    const level = p.lv ?? baseLevel;
    const stats = statsAt(def.base, def.growth, level);
    if (p.boss)
        stats.hp = Math.floor(stats.hp * 1.3);
    return {
        uid: b.nextUid++, side: 'enemy', key: def.id, name: def.name, level, x: p.x, y: p.y, startX: p.x, startY: p.y,
        hp: stats.hp, mp: 0, stats, crit: p.boss ? 5 : 0, lifesteal: 0, move: def.move,
        attack: attackSkill(def.attack, def.name),
        skills: def.skills.map((id) => ({ id, def: skillOf(id), nums: resolveSkill(skillOf(id), {}, []), cd: 0 })),
        statuses: [], moved: false, acted: false, boss: !!p.boss, ai: p.ai ?? def.ai, provoked: (p.ai ?? def.ai) === 'aggro' || (p.ai ?? def.ai) === 'healer',
        tags: def.tags, weak: def.weak, resist: def.resist, art: def.art, alive: true, xp: 0, kills: 0,
    };
}
export function createBattle(site, heroes, bag, rng = Math.random) {
    const b = {
        site, map: site.map.map((row) => row.split('')), units: [], turn: 1, phase: 'hero', nextUid: 1,
        result: null, bag: { ...bag }, rng,
    };
    heroes.forEach((hs, i) => { const [x, y] = site.heroStarts[i]; b.units.push(makeHero(b, hs, x, y)); });
    for (const p of site.enemies)
        b.units.push(makeEnemy(b, p, site.level));
    return b;
}
/* ---------------- movement ---------------- */
export function effMove(u) {
    if (hasStatus(u, 'root') || hasStatus(u, 'stun'))
        return 0;
    return Math.max(0, u.stats.mov + (hasStatus(u, 'haste') ? 1 : 0) - (hasStatus(u, 'slow') ? 1 : 0));
}
const key = (x, y) => y * W + x;
export const unkey = (k) => [k % W, Math.floor(k / W)];
/** Dijkstra over terrain costs. Units may pass allies but not foes. Returned tiles include pass-through tiles. */
export function reachMap(b, u, budget = effMove(u)) {
    const out = new Map();
    out.set(key(u.x, u.y), { cost: 0, prev: -1 });
    const open = [key(u.x, u.y)];
    while (open.length) {
        open.sort((a, c) => out.get(a).cost - out.get(c).cost);
        const k = open.shift();
        const [x, y] = unkey(k);
        const c0 = out.get(k).cost;
        for (const [dx, dy] of DIRS) {
            const nx = x + dx, ny = y + dy;
            if (!inBounds(nx, ny))
                continue;
            const o = unitAt(b, nx, ny);
            if (o && o.side !== u.side)
                continue;
            const nc = c0 + moveCost(terrainAt(b, nx, ny), u.move);
            if (nc > budget)
                continue;
            const nk = key(nx, ny);
            const ex = out.get(nk);
            if (!ex || ex.cost > nc) {
                out.set(nk, { cost: nc, prev: k });
                open.push(nk);
            }
        }
    }
    return out;
}
/** Tiles the unit may end its move on. */
export function moveTiles(b, u) {
    const m = reachMap(b, u);
    for (const k of [...m.keys()]) {
        const [x, y] = unkey(k);
        const o = unitAt(b, x, y);
        if (o && o !== u)
            m.delete(k);
    }
    return m;
}
export function pathTo(m, x, y) {
    const out = [];
    let k = key(x, y);
    while (k >= 0) {
        out.unshift(unkey(k));
        k = m.get(k)?.prev ?? -1;
    }
    return out;
}
export function moveUnit(b, u, x, y) {
    const m = moveTiles(b, u);
    if (!m.has(key(x, y)))
        return [];
    const path = pathTo(m, x, y);
    u.x = x;
    u.y = y;
    u.moved = true;
    checkResult(b);
    return path.length > 1 ? [{ t: 'move', uid: u.uid, path }] : [];
}
/* ---------------- targeting ---------------- */
export function canUse(u, s) {
    if (u.acted)
        return 'Already acted';
    if (s.cd > 0)
        return `Ready in ${s.cd}`;
    if (u.side === 'hero' && u.mp < s.nums.cost)
        return 'Not enough mana';
    return null;
}
export function rangeTiles(b, u, s, fx = u.x, fy = u.y) {
    if (s.def.target === 'self')
        return [[fx, fy]];
    const out = [];
    for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
            const d = dist(fx, fy, x, y);
            if (d >= s.nums.minRange && d <= s.nums.range)
                out.push([x, y]);
        }
    return out;
}
export function areaTiles(cx, cy, shape, r) {
    const out = [];
    for (let y = cy - r; y <= cy + r; y++)
        for (let x = cx - r; x <= cx + r; x++) {
            if (!inBounds(x, y))
                continue;
            const d = shape === 'square' ? Math.max(Math.abs(x - cx), Math.abs(y - cy)) : dist(cx, cy, x, y);
            if (d <= r)
                out.push([x, y]);
        }
    return out;
}
function landing(b, u, t, far) {
    let best = null;
    let bestD = far ? -1 : Infinity;
    for (const [dx, dy] of DIRS) {
        const x = t.x + dx, y = t.y + dy;
        if (!inBounds(x, y) || moveCost(terrainAt(b, x, y), u.move) === Infinity)
            continue;
        const o = unitAt(b, x, y);
        if (o && o !== u)
            continue;
        const d = dist(u.x, u.y, x, y);
        if (far ? d > bestD : d < bestD) {
            bestD = d;
            best = [x, y];
        }
    }
    return best;
}
export function isValidTarget(b, u, s, x, y) {
    if (!inBounds(x, y))
        return false;
    if (s.def.target === 'self')
        return x === u.x && y === u.y;
    const d = dist(u.x, u.y, x, y);
    if (d < s.nums.minRange || d > s.nums.range)
        return false;
    const o = unitAt(b, x, y);
    switch (s.def.target) {
        case 'enemy':
            if (!o || o.side === u.side)
                return false;
            if (s.def.special === 'dash')
                return !!landing(b, u, o, false);
            if (s.def.special === 'shadowstep')
                return !!landing(b, u, o, true);
            return true;
        case 'ally': return !!o && o.side === u.side;
        case 'ground':
            if (s.def.special === 'blink' || s.def.special === 'summon')
                return !o && moveCost(terrainAt(b, x, y), s.def.special === 'blink' ? u.move : 'foot') !== Infinity;
            return true;
    }
}
/** The tiles a cast at (x,y) covers, from the caster's position after any dash. */
export function castArea(u, s, x, y) {
    if (s.def.target === 'self')
        return areaTiles(u.x, u.y, s.def.shape, s.nums.aoe);
    return s.nums.aoe > 0 ? areaTiles(x, y, s.def.shape, s.nums.aoe) : [[x, y]];
}
function unitsIn(b, area) {
    return area.map(([x, y]) => unitAt(b, x, y)).filter((v) => !!v);
}
/** Chain targets: nearest un-hit foe within 2 tiles of the previous target. */
function chainTargets(b, u, first, n, hit) {
    const out = [];
    let last = first;
    for (let i = 0; i < n; i++) {
        const next = alive(b).filter((v) => v.side !== u.side && !hit.has(v) && dist(v.x, v.y, last.x, last.y) <= 2)
            .sort((a, c) => dist(a.x, a.y, last.x, last.y) - dist(c.x, c.y, last.x, last.y))[0];
        if (!next)
            break;
        out.push(next);
        hit.add(next);
        last = next;
    }
    return out;
}
/* ---------------- damage ---------------- */
export function isArcher(u) {
    return u.attack.nums.minRange >= 2 && u.attack.def.school === 'physical';
}
export function damageOf(b, a, d, school, scale, power) {
    const raw = (a.stats[scale] * power) / 100;
    const bonus = d.move === 'flying' ? 0 : defBonus(terrainAt(b, d.x, d.y));
    const mit = (school === 'physical' ? d.stats.def : d.stats.res) + bonus;
    let mult = 1;
    if (d.weak.indexOf(school) >= 0)
        mult *= 1.5;
    if (d.resist.indexOf(school) >= 0)
        mult *= 0.5;
    if (school === 'physical' && isArcher(a) && d.tags.indexOf('flying') >= 0)
        mult *= 1.5;
    if (hasStatus(a, 'empower'))
        mult *= 1.25;
    if (hasStatus(a, 'weaken'))
        mult *= 0.75;
    if (hasStatus(d, 'expose'))
        mult *= 1.25;
    if (hasStatus(d, 'fortify'))
        mult *= 0.75;
    return Math.max(1, Math.floor((raw - mit) * mult));
}
export function healOf(a, scale, power) {
    return Math.max(1, Math.floor((a.stats[scale] * power) / 100));
}
export function canCounter(b, d, a) {
    if (!d.alive || hasStatus(d, 'stun'))
        return false;
    const r = dist(a.x, a.y, d.x, d.y);
    return r >= d.attack.nums.minRange && r <= d.attack.nums.range;
}
const FOLLOW_UP = 5;
/** Predicts a cast (no crits). For dash skills the caster position is the landing tile. */
export function forecast(b, u, s, x, y) {
    const ox = u.x, oy = u.y;
    const tgt = unitAt(b, x, y);
    if (tgt && (s.def.special === 'dash' || s.def.special === 'shadowstep')) {
        const l = landing(b, u, tgt, s.def.special === 'shadowstep');
        if (l) {
            u.x = l[0];
            u.y = l[1];
        }
    }
    if (s.def.special === 'blink') {
        u.x = x;
        u.y = y;
    }
    const area = castArea(u, s, x, y);
    const list = [];
    const add = (t) => {
        let f = list.find((v) => v.target === t);
        if (!f) {
            f = { target: t, dmg: 0, heal: 0, hits: 0, lethal: false, statuses: [], counter: 0, counterHits: 0 };
            list.push(f);
        }
        return f;
    };
    if (s.id === 'attack' && tgt) {
        const f = add(tgt);
        f.dmg = damageOf(b, u, tgt, s.def.school, s.def.scale, 100);
        f.hits = u.stats.spd >= tgt.stats.spd + FOLLOW_UP ? 2 : 1;
        if (canCounter(b, tgt, u)) {
            f.counter = damageOf(b, tgt, u, tgt.attack.def.school, tgt.attack.def.scale, 100);
            f.counterHits = tgt.stats.spd >= u.stats.spd + FOLLOW_UP ? 2 : 1;
        }
        f.lethal = f.dmg * f.hits >= tgt.hp + shieldOf(tgt);
    }
    else if (s.def.kind === 'damage') {
        const foes = unitsIn(b, area).filter((v) => v.side !== u.side);
        if (s.nums.chain > 0 && tgt && tgt.side !== u.side) {
            const hit = new Set(foes);
            let p = s.nums.power;
            for (const c of chainTargets(b, u, tgt, s.nums.chain, hit)) {
                p *= 0.8;
                const f = add(c);
                f.dmg += damageOf(b, u, c, s.def.school, s.def.scale, p);
                f.hits = 1;
            }
        }
        for (const t of foes) {
            const f = add(t);
            f.dmg += damageOf(b, u, t, s.def.school, s.def.scale, s.nums.power);
            f.hits = 1;
        }
        for (const f of list) {
            f.lethal = f.dmg >= f.target.hp + shieldOf(f.target);
            f.statuses = s.nums.statuses.map((st) => st.id).filter((id) => !immune(f.target, id));
        }
        if (s.nums.allyHeal > 0)
            for (const t of unitsIn(b, area).filter((v) => v.side === u.side)) {
                add(t).heal = Math.min(t.stats.hp - t.hp, healOf(u, s.def.scale, s.nums.allyHeal));
            }
    }
    else {
        const allies = unitsIn(b, area).filter((v) => v.side === u.side);
        for (const t of allies) {
            const f = add(t);
            if (s.def.kind === 'heal')
                f.heal = Math.min(t.stats.hp - t.hp, healOf(u, s.def.scale, s.nums.power));
            f.statuses = s.nums.statuses.map((st) => st.id);
        }
        if (s.def.taunts)
            for (const t of unitsIn(b, area).filter((v) => v.side !== u.side))
                add(t).statuses = ['taunt'];
    }
    u.x = ox;
    u.y = oy;
    return { area, list };
}
function shieldOf(u) {
    return u.statuses.find((s) => s.id === 'shield')?.amount ?? 0;
}
function immune(u, id) {
    return u.boss && (id === 'stun' || id === 'root');
}
/* ---------------- resolution ---------------- */
function applyStatus(b, t, sa, caster, scale, ev) {
    if (!t.alive || immune(t, sa.id))
        return;
    const amount = sa.power ? Math.max(1, Math.floor((caster.stats[scale] * sa.power) / 100)) : 0;
    const ex = t.statuses.find((s) => s.id === sa.id);
    if (ex) {
        ex.turns = Math.max(ex.turns, sa.turns);
        ex.amount = Math.max(ex.amount, amount);
        ex.source = caster.uid;
        ex.fresh = ex.fresh || t.side === b.phase;
    }
    else
        t.statuses.push({ id: sa.id, turns: sa.turns, amount, source: caster.uid, fresh: t.side === b.phase });
    ev.push({ t: 'status', uid: t.uid, id: sa.id });
}
function kill(b, t, by, ev) {
    t.alive = false;
    ev.push({ t: 'death', uid: t.uid });
    if (by && by.side === 'hero' && t.side === 'enemy') {
        by.xp += killXp(by.level, t.level, t.boss);
        by.kills++;
    }
}
/** Deals damage through shields. Returns damage dealt to HP. */
function dealDamage(b, t, amount, crit, by, ev, useShield = true) {
    let absorbed = 0;
    const sh = useShield ? t.statuses.find((s) => s.id === 'shield') : undefined;
    if (sh) {
        absorbed = Math.min(sh.amount, amount);
        sh.amount -= absorbed;
        if (sh.amount <= 0)
            t.statuses.splice(t.statuses.indexOf(sh), 1);
    }
    const real = Math.min(t.hp, amount - absorbed);
    t.hp -= real;
    if (t.side === 'enemy' && by)
        t.provoked = true;
    ev.push({ t: 'dmg', uid: t.uid, amount: amount - absorbed, crit, absorbed });
    if (t.hp <= 0)
        kill(b, t, by, ev);
    return real;
}
function heal(t, amount, ev) {
    const real = Math.min(t.stats.hp - t.hp, amount);
    if (real > 0) {
        t.hp += real;
        ev.push({ t: 'heal', uid: t.uid, amount: real });
    }
    return real;
}
function strike(b, a, d, school, scale, power, lifesteal, ev) {
    let dmg = damageOf(b, a, d, school, scale, power);
    const crit = a.crit > 0 && b.rng() * 100 < a.crit;
    if (crit)
        dmg = Math.floor(dmg * 1.5);
    const real = dealDamage(b, d, dmg, crit, a, ev);
    if (lifesteal > 0 && a.alive)
        heal(a, Math.floor((real * lifesteal) / 100), ev);
    return real;
}
function push(b, u, t, n, ev) {
    if (!t.alive || t.boss)
        return;
    const dx = Math.sign(t.x - u.x), dy = Math.sign(t.y - u.y);
    const [sx, sy] = Math.abs(t.x - u.x) >= Math.abs(t.y - u.y) ? [dx, 0] : [0, dy];
    let moved = false;
    for (let i = 0; i < n; i++) {
        const nx = t.x + sx, ny = t.y + sy;
        if (!inBounds(nx, ny) || unitAt(b, nx, ny) || moveCost(terrainAt(b, nx, ny), t.move) === Infinity)
            break;
        t.x = nx;
        t.y = ny;
        moved = true;
    }
    if (moved)
        ev.push({ t: 'push', uid: t.uid, x: t.x, y: t.y });
}
function spawn(b, p, ev) {
    let spot = null;
    let best = Infinity;
    for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
            if (unitAt(b, x, y) || moveCost(terrainAt(b, x, y), enemyOf(p.id).move) === Infinity)
                continue;
            const d = dist(x, y, p.x, p.y);
            if (d < best) {
                best = d;
                spot = [x, y];
            }
        }
    if (!spot)
        return null;
    const u = makeEnemy(b, { ...p, x: spot[0], y: spot[1] }, b.site.level);
    u.provoked = true;
    b.units.push(u);
    ev.push({ t: 'spawn', uid: u.uid });
    return u;
}
/** Performs a skill or basic attack at (x,y). Caller must have validated the target. */
export function useSkill(b, u, s, x, y) {
    const ev = [];
    const tgt = unitAt(b, x, y);
    if (tgt && (s.def.special === 'dash' || s.def.special === 'shadowstep')) {
        const l = landing(b, u, tgt, s.def.special === 'shadowstep');
        if (l && (l[0] !== u.x || l[1] !== u.y)) {
            ev.push({ t: 'move', uid: u.uid, path: [[u.x, u.y], l] });
            u.x = l[0];
            u.y = l[1];
        }
    }
    if (s.def.special === 'blink') {
        ev.push({ t: 'move', uid: u.uid, path: [[u.x, u.y], [x, y]] });
        u.x = x;
        u.y = y;
    }
    if (u.side === 'hero')
        u.mp -= s.nums.cost;
    if (s.id !== 'attack')
        s.cd = s.nums.cooldown > 0 ? s.nums.cooldown + 1 : 0;
    u.moved = true;
    u.acted = true;
    const area = castArea(u, s, x, y);
    ev.push({ t: 'cast', uid: u.uid, name: s.def.name, icon: s.def.icon, school: s.def.school, tx: x, ty: y, area, basic: s.id === 'attack' });
    let didSomething = false;
    let topLv = 1;
    if (s.def.special === 'summon' && s.def.summon) {
        spawn(b, { id: s.def.summon, x, y }, ev);
    }
    else if (s.id === 'attack' && tgt) {
        // Attack, counter, follow-ups (SPEC 6.6).
        topLv = tgt.level;
        strike(b, u, tgt, s.def.school, s.def.scale, 100, u.lifesteal, ev);
        didSomething = true;
        const counters = canCounter(b, tgt, u);
        if (counters && u.alive)
            strike(b, tgt, u, tgt.attack.def.school, tgt.attack.def.scale, 100, tgt.lifesteal, ev);
        if (u.alive && tgt.alive && u.stats.spd >= tgt.stats.spd + FOLLOW_UP)
            strike(b, u, tgt, s.def.school, s.def.scale, 100, u.lifesteal, ev);
        else if (counters && u.alive && tgt.alive && tgt.stats.spd >= u.stats.spd + FOLLOW_UP)
            strike(b, tgt, u, tgt.attack.def.school, tgt.attack.def.scale, 100, tgt.lifesteal, ev);
    }
    else if (s.def.kind === 'damage') {
        const foes = unitsIn(b, area).filter((v) => v.side !== u.side);
        const allies = unitsIn(b, area).filter((v) => v.side === u.side);
        const chained = [];
        if (s.nums.chain > 0 && tgt && tgt.side !== u.side) {
            let p = s.nums.power;
            for (const c of chainTargets(b, u, tgt, s.nums.chain, new Set(foes))) {
                p *= 0.8;
                chained.push([c, p]);
            }
        }
        const targets = [...foes.map((f) => [f, s.nums.power]), ...chained];
        for (const [t, p] of targets) {
            topLv = Math.max(topLv, t.level);
            strike(b, u, t, s.def.school, s.def.scale, p, s.nums.lifesteal, ev);
            didSomething = true;
            for (const st of s.nums.statuses)
                applyStatus(b, t, st, u, s.def.scale, ev);
            if (s.nums.push > 0)
                push(b, u, t, s.nums.push, ev);
        }
        if (s.nums.allyHeal > 0)
            for (const a of allies)
                if (heal(a, healOf(u, s.def.scale, s.nums.allyHeal), ev) > 0)
                    didSomething = true;
    }
    else {
        const allies = unitsIn(b, area).filter((v) => v.side === u.side);
        for (const a of allies) {
            if (s.def.kind === 'heal' && heal(a, healOf(u, s.def.scale, s.nums.power), ev) > 0)
                didSomething = true;
            for (const st of s.nums.statuses)
                applyStatus(b, a, st, u, s.def.scale, ev);
            if (s.nums.statuses.length)
                didSomething = true;
        }
        if (s.def.taunts)
            for (const f of unitsIn(b, area).filter((v) => v.side !== u.side)) {
                applyStatus(b, f, { id: 'taunt', turns: 1 }, u, s.def.scale, ev);
                didSomething = true;
            }
    }
    for (const st of s.nums.selfStatuses)
        applyStatus(b, u, st, u, s.def.scale, ev);
    if (u.side === 'hero' && didSomething)
        u.xp += actionXp(u.level, topLv);
    checkResult(b);
    return ev;
}
export function useItem(b, u, itemId) {
    const it = itemOf(itemId);
    const ev = [];
    if (!it.use || (b.bag[itemId] ?? 0) <= 0)
        return ev;
    b.bag[itemId]--;
    if (it.use.heal)
        heal(u, Math.ceil((u.stats.hp * it.use.heal) / 100), ev);
    if (it.use.mana) {
        const m = Math.min(u.stats.mp - u.mp, Math.ceil((u.stats.mp * it.use.mana) / 100));
        if (m > 0) {
            u.mp += m;
            ev.push({ t: 'mana', uid: u.uid, amount: m });
        }
    }
    if (it.use.cleanse) {
        u.statuses = u.statuses.filter((s) => s.id === 'shield' || s.id === 'regen' || s.id === 'haste' || s.id === 'fortify' || s.id === 'empower');
        ev.push({ t: 'text', uid: u.uid, text: 'Cleansed' });
    }
    u.moved = true;
    u.acted = true;
    return ev;
}
export function waitUnit(u) { u.moved = true; u.acted = true; }
/* ---------------- phases ---------------- */
/** Start of a side's phase: reinforcements, terrain, damage/heal over time, cooldowns, mana, stun (SPEC 11.2). */
export function beginPhase(b, side) {
    b.phase = side;
    const ev = [];
    if (side === 'hero')
        for (const r of b.site.reinforcements ?? [])
            if (r.turn === b.turn)
                for (const p of r.units)
                    spawn(b, p, ev);
    for (const u of alive(b, side)) {
        u.moved = false;
        u.acted = false;
        u.startX = u.x;
        u.startY = u.y;
        for (const s of u.skills)
            s.cd = Math.max(0, s.cd - 1);
        if (side === 'hero') {
            const regen = Math.min(u.stats.mp - u.mp, Math.max(2, Math.floor(u.stats.mp * 0.1)) + (terrainAt(b, u.x, u.y) === 'C' ? 6 : 0));
            if (regen > 0) {
                u.mp += regen;
                if (terrainAt(b, u.x, u.y) === 'C')
                    ev.push({ t: 'mana', uid: u.uid, amount: regen });
            }
        }
        const t = terrainAt(b, u.x, u.y);
        if (t === 'T')
            heal(u, Math.ceil(u.stats.hp * 0.1), ev);
        if (t === 'L' && u.move !== 'flying') {
            ev.push({ t: 'text', uid: u.uid, text: 'Lava!' });
            dealDamage(b, u, Math.ceil(u.stats.hp * 0.2), false, null, ev, false);
        }
        for (const s of [...u.statuses]) {
            if (!u.alive)
                break;
            if (s.id === 'burn' || s.id === 'poison' || s.id === 'bleed')
                dealDamage(b, u, s.amount, false, null, ev, false);
            if (s.id === 'regen')
                heal(u, s.amount, ev);
        }
        if (u.alive && hasStatus(u, 'stun')) {
            u.moved = true;
            u.acted = true;
            ev.push({ t: 'text', uid: u.uid, text: 'Stunned' });
        }
    }
    checkResult(b);
    return ev;
}
/** End of a side's phase: statuses on that side tick down. */
export function endPhase(b, side) {
    for (const u of alive(b, side)) {
        for (const s of u.statuses) {
            if (s.fresh)
                s.fresh = false;
            else
                s.turns--;
        }
        u.statuses = u.statuses.filter((s) => s.turns > 0 && (s.id !== 'taunt' || b.units.some((v) => v.uid === s.source && v.alive)));
    }
    if (side === 'enemy') {
        const o = b.site.objective;
        if (!b.result && o.kind === 'survive' && b.turn >= o.turns)
            b.result = 'win';
        b.turn++;
    }
}
export function checkResult(b) {
    if (b.result)
        return;
    if (alive(b, 'hero').length === 0) {
        b.result = 'lose';
        return;
    }
    const o = b.site.objective;
    const foes = alive(b, 'enemy');
    if (foes.length === 0) {
        b.result = 'win';
        return;
    }
    if (o.kind === 'boss' && !b.units.some((u) => u.boss && u.alive))
        b.result = 'win';
    if (o.kind === 'reach' && alive(b, 'hero').some((u) => o.tiles.some(([x, y]) => u.x === x && u.y === y)))
        b.result = 'win';
}
export function objectiveText(b) {
    const o = b.site.objective;
    switch (o.kind) {
        case 'rout': return 'Defeat all enemies';
        case 'boss': return `Defeat ${b.units.find((u) => u.boss)?.name ?? 'the boss'}`;
        case 'survive': return `Survive ${Math.max(0, o.turns - b.turn + 1)} more turn${o.turns - b.turn === 0 ? '' : 's'} (or rout)`;
        case 'reach': return 'Move a hero onto a ★ goal tile';
    }
}
/** Every tile an enemy could hit next phase (move + max reach). */
export function threatTiles(b, u) {
    const out = new Set();
    const moves = u.ai === 'hold' ? new Map([[key(u.x, u.y), { cost: 0, prev: -1 }]]) : moveTiles(b, u);
    const reach = Math.max(u.attack.nums.range, ...u.skills.filter((s) => s.def.kind === 'damage' && s.def.target !== 'self').map((s) => s.nums.range), ...u.skills.filter((s) => s.def.target === 'self' && s.def.kind === 'damage').map((s) => s.nums.aoe));
    for (const k of moves.keys()) {
        const [mx, my] = unkey(k);
        for (let y = 0; y < H; y++)
            for (let x = 0; x < W; x++)
                if (dist(mx, my, x, y) <= reach)
                    out.add(key(x, y));
    }
    return out;
}
export const tileKey = key;
//# sourceMappingURL=engine.js.map