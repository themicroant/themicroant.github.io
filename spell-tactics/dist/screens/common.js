const STAT_LABEL = { hp: 'HP', mp: 'MP', atk: 'Atk', mag: 'Mag', def: 'Def', res: 'Res', spd: 'Spd', mov: 'Move' };
export function itemText(it) {
    const parts = [];
    for (const [k, v] of Object.entries(it.stats ?? {}))
        if (v)
            parts.push(`${v > 0 ? '+' : ''}${v} ${STAT_LABEL[k]}`);
    if (it.crit)
        parts.push(`+${it.crit}% crit`);
    if (it.lifesteal)
        parts.push(`${it.lifesteal}% lifesteal on attacks`);
    for (const m of it.mods ?? [])
        parts.push(m.text);
    if (it.slot === 'consumable' || it.slot === 'scroll')
        parts.push(it.desc);
    return parts.join(' · ');
}
export const SLOT_LABEL = { weapon: 'Weapon', armor: 'Armor', trinket: 'Trinket', consumable: 'Consumable', scroll: 'Scroll' };
//# sourceMappingURL=common.js.map