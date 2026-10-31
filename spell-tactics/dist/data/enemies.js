const U = (f) => 'assets/units/' + f + '.png';
const melee = { school: 'physical', scale: 'atk', minRange: 1, range: 1 };
const bow = { school: 'physical', scale: 'atk', minRange: 2, range: 2 };
const magic = (school) => ({ school, scale: 'mag', minRange: 1, range: 2 });
export const ENEMIES = [
    /* Thornwood */
    { id: 'wolf', name: 'Dire Wolf', art: { sprite: U('m_wolf') }, tags: ['beast'], move: 'mounted', attack: melee,
        base: { hp: 22, mp: 0, atk: 10, mag: 0, def: 3, res: 1, spd: 11, mov: 4 }, growth: { hp: 2.5, atk: 1.2, def: 0.5, res: 0.3, spd: 0.8 },
        skills: ['e_bite'], ai: 'aggro', weak: ['fire'], resist: [], desc: 'Fast pack hunter. Bites cause Bleed.' },
    { id: 'bandit', name: 'Brigand', art: { sprite: U('e_bandit') }, tags: ['human'], move: 'foot', attack: melee,
        base: { hp: 28, mp: 0, atk: 12, mag: 0, def: 4, res: 1, spd: 7, mov: 3 }, growth: { hp: 3, atk: 1.3, def: 0.6, res: 0.3, spd: 0.6 },
        skills: [], ai: 'aggro', weak: [], resist: [], desc: 'Hits hard, slow and easy to outmanoeuvre.' },
    { id: 'poacher', name: 'Poacher', art: { sprite: U('e_poacher') }, tags: ['human'], move: 'foot', attack: bow,
        base: { hp: 22, mp: 0, atk: 11, mag: 0, def: 2, res: 2, spd: 9, mov: 3 }, growth: { hp: 2.4, atk: 1.2, def: 0.4, res: 0.4, spd: 0.7 },
        skills: [], ai: 'aggro', weak: [], resist: [], desc: 'Archer. Cannot strike adjacent foes.' },
    /* Mirefen */
    { id: 'slime', name: 'Bog Ooze', art: { sprite: U('m_slime') }, tags: ['ooze'], move: 'heavy', attack: melee,
        base: { hp: 30, mp: 0, atk: 9, mag: 6, def: 2, res: 6, spd: 4, mov: 2 }, growth: { hp: 3.5, atk: 1, mag: 0.6, def: 0.4, res: 0.6, spd: 0.3 },
        skills: ['e_acid'], ai: 'aggro', weak: ['fire'], resist: ['nature', 'physical'], desc: 'Shrugs off blades and poison. Burn it.' },
    { id: 'spider', name: 'Fen Spider', art: { sprite: U('m_spider') }, tags: ['beast'], move: 'foot', attack: melee,
        base: { hp: 20, mp: 0, atk: 10, mag: 0, def: 3, res: 2, spd: 10, mov: 3 }, growth: { hp: 2.2, atk: 1.2, def: 0.4, res: 0.3, spd: 0.8 },
        skills: ['e_web'], ai: 'aggro', weak: ['fire'], resist: ['nature'], desc: 'Webs Root heroes in place.' },
    { id: 'hag', name: 'Bog Witch', art: { sprite: U('e_hag') }, tags: ['human'], move: 'foot', attack: magic('shadow'),
        base: { hp: 26, mp: 0, atk: 3, mag: 11, def: 2, res: 7, spd: 7, mov: 3 }, growth: { hp: 2.6, mag: 1.3, def: 0.3, res: 0.8, spd: 0.6 },
        skills: ['e_mend', 'e_hex'], ai: 'healer', weak: ['holy'], resist: ['shadow'], desc: 'Heals allies and Weakens heroes. Kill first.' },
    /* Cinderforge */
    { id: 'imp', name: 'Cinder Imp', art: { sprite: U('m_imp') }, tags: ['demon'], move: 'flying', attack: magic('fire'),
        base: { hp: 20, mp: 0, atk: 4, mag: 11, def: 2, res: 5, spd: 11, mov: 3 }, growth: { hp: 2.2, mag: 1.3, def: 0.3, res: 0.6, spd: 0.8 },
        skills: ['e_firebolt'], ai: 'aggro', weak: ['frost', 'holy'], resist: ['fire'], desc: 'Flying fire-caster. Burns.' },
    { id: 'golem', name: 'Magma Golem', art: { sprite: U('m_golem') }, tags: ['construct', 'elemental'], move: 'heavy', attack: melee,
        base: { hp: 44, mp: 0, atk: 14, mag: 0, def: 10, res: 3, spd: 3, mov: 2 }, growth: { hp: 4.5, atk: 1.4, def: 1.2, res: 0.4, spd: 0.2 },
        skills: ['e_slam'], ai: 'aggro', weak: ['frost'], resist: ['fire', 'physical'], desc: 'Armoured. Slam hits all around it. Use magic.' },
    { id: 'forgemaster', name: 'Brazen Overseer', art: { sprite: U('e_forgemaster') }, tags: ['human'], move: 'heavy', attack: melee,
        base: { hp: 50, mp: 0, atk: 15, mag: 8, def: 12, res: 5, spd: 4, mov: 2 }, growth: { hp: 5, atk: 1.4, mag: 0.6, def: 1.2, res: 0.5, spd: 0.3 },
        skills: ['e_breath', 'e_cleave'], ai: 'guard', weak: ['frost'], resist: ['fire'], desc: 'The shard-mad foreman of the forge.' },
    /* Frostfang */
    { id: 'frostwolf', name: 'Frostfang Wolf', art: { sprite: U('m_frostwolf') }, tags: ['beast'], move: 'mounted', attack: melee,
        base: { hp: 24, mp: 0, atk: 11, mag: 0, def: 4, res: 3, spd: 12, mov: 4 }, growth: { hp: 2.6, atk: 1.2, def: 0.5, res: 0.4, spd: 0.8 },
        skills: ['e_bite'], ai: 'aggro', weak: ['fire'], resist: ['frost'], desc: 'Swift and resistant to cold.' },
    { id: 'yeti', name: 'Yeti', art: { sprite: U('m_yeti') }, tags: ['beast'], move: 'foot', attack: melee,
        base: { hp: 46, mp: 0, atk: 15, mag: 0, def: 7, res: 4, spd: 6, mov: 3 }, growth: { hp: 4.5, atk: 1.5, def: 0.8, res: 0.4, spd: 0.4 },
        skills: ['e_slam'], ai: 'guard', weak: ['fire'], resist: ['frost'], desc: 'Huge, slams everything around it.' },
    { id: 'icewraith', name: 'Rime Wraith', art: { sprite: U('m_icewraith') }, tags: ['undead', 'elemental'], move: 'flying', attack: magic('frost'),
        base: { hp: 24, mp: 0, atk: 3, mag: 12, def: 2, res: 8, spd: 9, mov: 3 }, growth: { hp: 2.4, mag: 1.3, def: 0.3, res: 0.8, spd: 0.6 },
        skills: ['e_frostbolt'], ai: 'aggro', weak: ['fire', 'holy'], resist: ['frost', 'physical'], desc: 'Frostbolts Slow. Weak to fire and holy.' },
    /* Drowned Archive */
    { id: 'tome', name: 'Animated Tome', art: { sprite: U('m_tome') }, tags: ['construct'], move: 'flying', attack: magic('arcane'),
        base: { hp: 22, mp: 0, atk: 2, mag: 13, def: 3, res: 8, spd: 10, mov: 3 }, growth: { hp: 2.2, mag: 1.4, def: 0.3, res: 0.8, spd: 0.7 },
        skills: ['e_missiles'], ai: 'aggro', weak: ['fire'], resist: ['arcane'], desc: 'Barrages arcane bolts that chain.' },
    { id: 'sentinel', name: 'Runic Sentinel', art: { sprite: U('m_sentinel') }, tags: ['construct'], move: 'heavy', attack: melee,
        base: { hp: 42, mp: 0, atk: 14, mag: 8, def: 11, res: 6, spd: 4, mov: 2 }, growth: { hp: 4, atk: 1.4, mag: 0.6, def: 1.2, res: 0.6, spd: 0.3 },
        skills: ['e_ward'], ai: 'guard', weak: ['storm'], resist: ['physical'], desc: 'Shields allies with rune wards. Weak to storm.' },
    { id: 'warden', name: 'Drowned Warden', art: { sprite: U('e_warden') }, tags: ['undead'], move: 'foot', attack: magic('arcane'),
        base: { hp: 48, mp: 0, atk: 4, mag: 15, def: 6, res: 10, spd: 8, mov: 3 }, growth: { hp: 4.5, mag: 1.5, def: 0.6, res: 1, spd: 0.6 },
        skills: ['e_missiles', 'e_frostbolt'], ai: 'hold', weak: ['holy'], resist: ['arcane', 'frost'], desc: 'The drowned keeper of forbidden shelves.' },
    /* Gravewatch */
    { id: 'skeleton', name: 'Skeleton', art: { sprite: U('m_skeleton') }, tags: ['undead'], move: 'foot', attack: melee,
        base: { hp: 22, mp: 0, atk: 11, mag: 0, def: 5, res: 2, spd: 6, mov: 3 }, growth: { hp: 2.4, atk: 1.2, def: 0.6, res: 0.3, spd: 0.5 },
        skills: [], ai: 'aggro', weak: ['holy'], resist: ['shadow', 'nature'], desc: 'Weak to holy. Necromancers raise more.' },
    { id: 'wraith', name: 'Barrow Wraith', art: { sprite: U('m_wraith') }, tags: ['undead'], move: 'flying', attack: magic('shadow'),
        base: { hp: 26, mp: 0, atk: 3, mag: 12, def: 2, res: 8, spd: 10, mov: 3 }, growth: { hp: 2.6, mag: 1.3, def: 0.3, res: 0.8, spd: 0.7 },
        skills: ['e_drain'], ai: 'aggro', weak: ['holy'], resist: ['physical', 'shadow'], desc: 'Drains life. Blades pass through it.' },
    { id: 'necro', name: 'Mordrel the Gravecaller', art: { sprite: U('e_necro') }, tags: ['human'], move: 'foot', attack: magic('shadow'),
        base: { hp: 52, mp: 0, atk: 4, mag: 16, def: 6, res: 10, spd: 8, mov: 3 }, growth: { hp: 5, mag: 1.6, def: 0.6, res: 1, spd: 0.6 },
        skills: ['e_raise', 'e_shadowbolt'], ai: 'guard', weak: ['holy'], resist: ['shadow'], desc: 'Raises skeletons every few turns.' },
    /* Skyreach */
    { id: 'harpy', name: 'Storm Harpy', art: { sprite: U('m_harpy') }, tags: ['beast', 'flying'], move: 'flying', attack: melee,
        base: { hp: 24, mp: 0, atk: 12, mag: 0, def: 3, res: 4, spd: 13, mov: 4 }, growth: { hp: 2.5, atk: 1.3, def: 0.4, res: 0.5, spd: 0.9 },
        skills: ['e_dive'], ai: 'aggro', weak: ['storm'], resist: [], desc: 'Swoops from afar. Arrows hit it hard.' },
    { id: 'gargoyle', name: 'Gargoyle', art: { sprite: U('m_gargoyle') }, tags: ['construct', 'flying'], move: 'flying', attack: melee,
        base: { hp: 36, mp: 0, atk: 13, mag: 9, def: 10, res: 5, spd: 7, mov: 3 }, growth: { hp: 3.5, atk: 1.3, mag: 0.8, def: 1.1, res: 0.5, spd: 0.5 },
        skills: ['e_lightning'], ai: 'guard', weak: ['storm'], resist: ['physical'], desc: 'Stone skin; calls lightning.' },
    { id: 'skyknight', name: 'Talon Knight', art: { sprite: U('e_skyknight') }, tags: ['human', 'flying'], move: 'flying', attack: melee,
        base: { hp: 34, mp: 0, atk: 14, mag: 0, def: 7, res: 6, spd: 11, mov: 3 }, growth: { hp: 3.4, atk: 1.4, def: 0.8, res: 0.6, spd: 0.8 },
        skills: ['e_dive'], ai: 'aggro', weak: [], resist: [], desc: 'Elite flier of the Hollow King.' },
    /* Sunscar */
    { id: 'scorpion', name: 'Dune Scorpion', art: { sprite: U('m_scorpion') }, tags: ['beast'], move: 'foot', attack: melee,
        base: { hp: 30, mp: 0, atk: 13, mag: 0, def: 8, res: 3, spd: 8, mov: 3 }, growth: { hp: 3, atk: 1.3, def: 0.9, res: 0.3, spd: 0.6 },
        skills: ['e_sting'], ai: 'aggro', weak: ['frost'], resist: ['nature'], desc: 'Armoured. Strong poison.' },
    { id: 'wurm', name: 'Sand Wurm', art: { sprite: U('m_wurm') }, tags: ['beast'], move: 'foot', attack: melee,
        base: { hp: 50, mp: 0, atk: 15, mag: 0, def: 6, res: 4, spd: 5, mov: 3 }, growth: { hp: 5, atk: 1.5, def: 0.7, res: 0.4, spd: 0.4 },
        skills: ['e_quake'], ai: 'guard', weak: ['frost'], resist: [], desc: 'Burrowing giant; quakes Slow.' },
    { id: 'raider', name: 'Dune Raider', art: { sprite: U('e_raider') }, tags: ['human'], move: 'mounted', attack: melee,
        base: { hp: 34, mp: 0, atk: 14, mag: 0, def: 7, res: 4, spd: 10, mov: 4 }, growth: { hp: 3.4, atk: 1.4, def: 0.8, res: 0.4, spd: 0.7 },
        skills: [], ai: 'aggro', weak: [], resist: [], desc: 'Fast lancer on horseback.' },
    /* Obsidian Citadel */
    { id: 'darkknight', name: 'Obsidian Knight', art: { sprite: U('e_darkknight') }, tags: ['human'], move: 'heavy', attack: melee,
        base: { hp: 48, mp: 0, atk: 16, mag: 0, def: 13, res: 5, spd: 5, mov: 2 }, growth: { hp: 4.5, atk: 1.5, def: 1.3, res: 0.5, spd: 0.3 },
        skills: ['e_cleave'], ai: 'aggro', weak: ['holy'], resist: ['physical'], desc: 'Heavy armour. Use magic.' },
    { id: 'darkmage', name: 'Void Adept', art: { sprite: U('e_darkmage') }, tags: ['human'], move: 'foot', attack: magic('shadow'),
        base: { hp: 28, mp: 0, atk: 3, mag: 15, def: 3, res: 9, spd: 9, mov: 3 }, growth: { hp: 2.6, mag: 1.5, def: 0.3, res: 0.9, spd: 0.6 },
        skills: ['e_shadowbolt'], ai: 'aggro', weak: ['holy'], resist: ['shadow'], desc: 'Fragile shadow caster.' },
    { id: 'acolyte', name: 'Hollow Acolyte', art: { sprite: U('e_acolyte') }, tags: ['human'], move: 'foot', attack: magic('shadow'),
        base: { hp: 28, mp: 0, atk: 3, mag: 12, def: 3, res: 9, spd: 7, mov: 3 }, growth: { hp: 2.6, mag: 1.3, def: 0.3, res: 0.9, spd: 0.6 },
        skills: ['e_mend', 'e_hex'], ai: 'healer', weak: ['holy'], resist: ['shadow'], desc: 'Heals other enemies.' },
    { id: 'demon', name: 'Voidspawn', art: { sprite: U('m_demon') }, tags: ['demon'], move: 'foot', attack: melee,
        base: { hp: 38, mp: 0, atk: 15, mag: 10, def: 7, res: 7, spd: 9, mov: 3 }, growth: { hp: 3.6, atk: 1.5, mag: 1, def: 0.7, res: 0.7, spd: 0.7 },
        skills: ['e_drain'], ai: 'aggro', weak: ['holy'], resist: ['shadow', 'fire'], desc: 'Drains life to keep fighting.' },
    { id: 'hollowking', name: 'Vaelith, the Hollow King', art: { sprite: U('e_boss') }, tags: ['human'], move: 'foot', attack: magic('shadow'),
        base: { hp: 90, mp: 0, atk: 8, mag: 18, def: 9, res: 12, spd: 10, mov: 3 }, growth: { hp: 6, mag: 1.6, def: 0.8, res: 1, spd: 0.6 },
        skills: ['e_doom', 'e_nova', 'e_shadowbolt'], ai: 'hold', weak: [], resist: ['shadow'], desc: 'The sorcerer who shattered the Star.' },
];
const BY_ID = new Map(ENEMIES.map((e) => [e.id, e]));
export function enemyOf(id) {
    const e = BY_ID.get(id);
    if (!e)
        throw new Error('unknown enemy ' + id);
    return e;
}
//# sourceMappingURL=enemies.js.map