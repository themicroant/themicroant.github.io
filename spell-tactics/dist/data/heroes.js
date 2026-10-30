export const MOVE_RANGE = { foot: 3, heavy: 2, mounted: 4, flying: 3 };
export const HEROES = [
    { id: 'aldric', name: 'Aldric', title: 'Blademaster', sprite: 'assets/units/p_sword.png', move: 'foot', weapon: 'sword',
        attack: { school: 'physical', scale: 'atk', minRange: 1, range: 1 },
        base: { hp: 42, mp: 22, atk: 14, mag: 3, def: 8, res: 4, spd: 10, mov: 3 },
        growth: { hp: 4, mp: 1, atk: 1.6, mag: 0.2, def: 1, res: 0.5, spd: 0.8 }, crit: 10,
        skills: ['mighty_strike', 'whirlwind', 'charge', 'battle_shout'], joins: 0,
        bio: 'A sellsword of the Dawnward Company who swore to see the Star made whole.' },
    { id: 'seren', name: 'Seren', title: 'Priestess', sprite: 'assets/units/p_staff.png', move: 'foot', weapon: 'staff',
        attack: { school: 'holy', scale: 'mag', minRange: 1, range: 2 },
        base: { hp: 32, mp: 40, atk: 4, mag: 12, def: 4, res: 10, spd: 8, mov: 3 },
        growth: { hp: 3, mp: 2, atk: 0.3, mag: 1.5, def: 0.5, res: 1.2, spd: 0.7 }, crit: 0,
        skills: ['heal', 'smite', 'holy_nova', 'aegis'], joins: 0,
        bio: 'Keeper of the Starwell shrine. She felt the Star break before anyone else.' },
    { id: 'rook', name: 'Rook', title: 'Ranger', sprite: 'assets/units/p_bow.png', move: 'foot', weapon: 'bow',
        attack: { school: 'physical', scale: 'atk', minRange: 2, range: 2 },
        base: { hp: 34, mp: 24, atk: 13, mag: 3, def: 5, res: 5, spd: 11, mov: 3 },
        growth: { hp: 3, mp: 1, atk: 1.5, mag: 0.2, def: 0.6, res: 0.6, spd: 1 }, crit: 15,
        skills: ['aimed_shot', 'volley', 'snare_shot', 'multishot'], joins: 1,
        bio: 'Warden of Thornwood. Knows every trail and every wolf by its howl.' },
    { id: 'thessa', name: 'Thessa', title: 'Druid', sprite: 'assets/units/p_gtome.png', move: 'mounted', weapon: 'tome',
        attack: { school: 'nature', scale: 'mag', minRange: 1, range: 2 },
        base: { hp: 36, mp: 34, atk: 5, mag: 12, def: 5, res: 9, spd: 9, mov: 4 },
        growth: { hp: 3, mp: 1.6, atk: 0.3, mag: 1.4, def: 0.6, res: 1, spd: 0.8 }, crit: 0,
        skills: ['thornlash', 'rejuvenation', 'entangle', 'starfall'], joins: 2,
        bio: 'A druid of the Mirefen circle, bound to the land she rides.' },
    { id: 'garron', name: 'Garron', title: 'Guardian', sprite: 'assets/units/p_lance.png', move: 'heavy', weapon: 'lance',
        attack: { school: 'physical', scale: 'atk', minRange: 1, range: 1 },
        base: { hp: 50, mp: 20, atk: 12, mag: 4, def: 13, res: 6, spd: 5, mov: 2 },
        growth: { hp: 5, mp: 1, atk: 1.3, mag: 0.2, def: 1.5, res: 0.6, spd: 0.4 }, crit: 0,
        skills: ['shield_bash', 'challenge', 'consecrate', 'bulwark'], joins: 3,
        bio: 'Smith-knight of the Cinderforge. His armour was forged in the mountain’s heart.' },
    { id: 'ilsa', name: 'Ilsa', title: 'Spellblade', sprite: 'assets/units/p_tome.png', move: 'mounted', weapon: 'tome',
        attack: { school: 'arcane', scale: 'mag', minRange: 1, range: 2 },
        base: { hp: 30, mp: 40, atk: 3, mag: 14, def: 3, res: 9, spd: 9, mov: 4 },
        growth: { hp: 2.6, mp: 2, atk: 0.2, mag: 1.7, def: 0.4, res: 1, spd: 0.8 }, crit: 5,
        skills: ['fireball', 'frost_nova', 'blizzard', 'blink'], joins: 4,
        bio: 'Exiled battle-mage of the Frostfang Watch, master of fire and ice alike.' },
    { id: 'vex', name: 'Vex', title: 'Shadow', sprite: 'assets/units/p_dagger.png', move: 'foot', weapon: 'dagger',
        attack: { school: 'physical', scale: 'atk', minRange: 1, range: 1 },
        base: { hp: 32, mp: 24, atk: 13, mag: 4, def: 5, res: 6, spd: 14, mov: 3 },
        growth: { hp: 3, mp: 1, atk: 1.5, mag: 0.3, def: 0.5, res: 0.6, spd: 1.2 }, crit: 20,
        skills: ['backstab', 'envenom', 'shadowstep', 'fan_of_knives'], joins: 6,
        bio: 'A grave-robber who saw too much in the Barrows and wants to make it right.' },
    { id: 'kestrel', name: 'Kestrel', title: 'Storm Rider', sprite: 'assets/units/p_flier.png', move: 'flying', weapon: 'axe',
        attack: { school: 'physical', scale: 'atk', minRange: 1, range: 1 },
        base: { hp: 38, mp: 26, atk: 13, mag: 9, def: 7, res: 7, spd: 12, mov: 3 },
        growth: { hp: 3.5, mp: 1.2, atk: 1.3, mag: 1, def: 0.8, res: 0.8, spd: 1 }, crit: 10,
        skills: ['storm_bolt', 'chain_lightning', 'thunder_clap', 'tailwind'], joins: 7,
        bio: 'Last rider of the Skyreach aerie, who flies the storm instead of fleeing it.' },
];
const BY_ID = new Map(HEROES.map((h) => [h.id, h]));
export function heroOf(id) {
    const h = BY_ID.get(id);
    if (!h)
        throw new Error('unknown hero ' + id);
    return h;
}
//# sourceMappingURL=heroes.js.map