import { alive, canUse, defBonus, dist, forecast, H, hasStatus, inBounds, isValidTarget, moveCost, moveTiles, rangeTiles, terrainAt, tileKey, unkey, W, } from './engine.js';
function tileValue(b, u, x, y) {
    const t = terrainAt(b, x, y);
    let v = u.move === 'flying' ? 0 : defBonus(t);
    if (t === 'T')
        v += 2;
    if (t === 'L' && u.move !== 'flying')
        v -= 25;
    return v;
}
function scoreAction(b, u, s, x, y, taunter) {
    const { list } = forecast(b, u, s, x, y);
    if (taunter && !list.some((f) => f.target === taunter && f.dmg > 0))
        return -Infinity;
    let score = 0;
    for (const f of list) {
        if (f.target.side !== u.side) {
            const dmg = Math.min(f.target.hp, f.dmg * Math.max(1, f.hits));
            score += dmg + (f.lethal ? 40 : 0) + f.statuses.length * 5;
            if (f.statuses.indexOf('taunt') >= 0)
                score += 0;
            score -= Math.min(u.hp, f.counter * f.counterHits) * 0.6;
            if (f.counter * f.counterHits >= u.hp)
                score -= 30;
        }
        else {
            if (f.heal > 0)
                score += f.heal * (f.target.hp < f.target.stats.hp * 0.6 ? 1.3 : 0.4);
            for (const st of f.statuses)
                if (!hasStatus(f.target, st))
                    score += st === 'shield' ? (f.target.hp < f.target.stats.hp ? 10 : 4) : 6;
        }
    }
    if (s.def.special === 'summon')
        score += alive(b, u.side).length < 9 ? 22 : 0;
    return score;
}
/** Multi-source distance (terrain cost) from all heroes, ignoring units. */
function distanceField(b, u, goals) {
    const d = new Array(W * H).fill(Infinity);
    const open = [];
    for (const g of goals) {
        d[tileKey(g.x, g.y)] = 0;
        open.push(tileKey(g.x, g.y));
    }
    while (open.length) {
        open.sort((a, c) => d[a] - d[c]);
        const k = open.shift();
        const [x, y] = unkey(k);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (!inBounds(nx, ny))
                continue;
            const c = moveCost(terrainAt(b, nx, ny), u.move);
            if (c === Infinity)
                continue;
            const nk = tileKey(nx, ny);
            if (d[k] + c < d[nk]) {
                d[nk] = d[k] + c;
                open.push(nk);
            }
        }
    }
    return d;
}
export function planFor(b, u) {
    const home = [u.x, u.y];
    if (u.acted)
        return { to: home };
    const tauntSt = u.statuses.find((s) => s.id === 'taunt');
    const taunter = tauntSt ? b.units.find((v) => v.uid === tauntSt.source && v.alive) ?? null : null;
    const moves = moveTiles(b, u);
    let tiles = [...moves.keys()].map(unkey);
    if (u.ai === 'hold')
        tiles = [home];
    const actions = [u.attack, ...u.skills].filter((s) => !canUse(u, s));
    let best = null;
    let bestScore = 0;
    const ox = u.x, oy = u.y;
    for (const [mx, my] of tiles) {
        u.x = mx;
        u.y = my;
        const tv = tileValue(b, u, mx, my);
        for (const s of actions) {
            for (const [tx, ty] of rangeTiles(b, u, s)) {
                if (!isValidTarget(b, u, s, tx, ty))
                    continue;
                const sc = scoreAction(b, u, s, tx, ty, taunter);
                if (sc <= 0)
                    continue;
                const total = sc + tv - (mx === ox && my === oy ? 0 : 0.5);
                if (total > bestScore) {
                    bestScore = total;
                    best = { to: [mx, my], skill: s, tx, ty };
                }
            }
        }
    }
    u.x = ox;
    u.y = oy;
    // Guards hold position until something is in reach or they are hit.
    if (u.ai === 'guard' && !u.provoked) {
        if (best && best.skill && best.skill.def.kind === 'damage')
            u.provoked = true;
        else
            return best && best.to[0] === ox && best.to[1] === oy ? best : { to: home };
    }
    if (best)
        return best;
    if (u.ai === 'hold')
        return { to: home };
    // Advance: toward the taunter, the nearest hero, or (healers) stay near allies but out of reach.
    const foeSide = u.side === 'hero' ? 'enemy' : 'hero';
    const goals = taunter ? [taunter] : alive(b, foeSide);
    if (!goals.length)
        return { to: home };
    const field = distanceField(b, u, goals);
    let bestTile = home;
    let bestVal = Infinity;
    for (const [mx, my] of [...moves.keys()].map(unkey)) {
        let v = field[tileKey(mx, my)];
        if (u.ai === 'healer')
            v = Math.abs(v - 3) + Math.min(...alive(b, u.side).filter((e) => e !== u).map((e) => dist(e.x, e.y, mx, my)), 9) * 0.3;
        v -= tileValue(b, u, mx, my) * 0.1;
        if (v < bestVal) {
            bestVal = v;
            bestTile = [mx, my];
        }
    }
    return { to: bestTile };
}
//# sourceMappingURL=ai.js.map