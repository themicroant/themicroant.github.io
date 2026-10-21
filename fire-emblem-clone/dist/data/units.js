export const HERO_DEFS = [
    { id: 'p_sword', side: 'player', name: 'Kael', weapon: 'Sword', moveType: 'infantry', hp: 40, atk: 33, spd: 36, def: 24, res: 20, cd: 3 },
    { id: 'p_lance', side: 'player', name: 'Brynn', weapon: 'Lance', moveType: 'armored', hp: 52, atk: 38, spd: 18, def: 40, res: 18, cd: 4 },
    { id: 'p_tome', side: 'player', name: 'Liora', weapon: 'Red Tome', moveType: 'cavalry', hp: 36, atk: 36, spd: 32, def: 18, res: 30, cd: 3 },
    { id: 'p_flier', side: 'player', name: 'Sefa', weapon: 'Axe', moveType: 'flying', hp: 40, atk: 35, spd: 34, def: 25, res: 28, cd: 3 },
    { id: 'p_staff', side: 'player', name: 'Mira', weapon: 'Staff', moveType: 'infantry', hp: 34, atk: 24, spd: 28, def: 16, res: 32, cd: 3 },
    { id: 'p_bow', side: 'player', name: 'Tarn', weapon: 'Bow', moveType: 'infantry', hp: 34, atk: 33, spd: 30, def: 18, res: 20, cd: 3 },
    { id: 'p_dagger', side: 'player', name: 'Wren', weapon: 'Dagger', moveType: 'infantry', hp: 32, atk: 32, spd: 38, def: 16, res: 24, cd: 3 },
    { id: 'p_gtome', side: 'player', name: 'Elowen', weapon: 'Green Tome', moveType: 'cavalry', hp: 37, atk: 35, spd: 31, def: 20, res: 27, cd: 3 },
];
export const ENEMY_DEFS = [
    { id: 'e_axe', side: 'enemy', name: 'Brute', weapon: 'Axe', moveType: 'infantry', hp: 38, atk: 31, spd: 24, def: 23, res: 16, cd: 4 },
    { id: 'e_bow', side: 'enemy', name: 'Archer', weapon: 'Bow', moveType: 'infantry', hp: 30, atk: 29, spd: 30, def: 15, res: 18, cd: 3 },
    { id: 'e_cav', side: 'enemy', name: 'Raider', weapon: 'Lance', moveType: 'cavalry', hp: 36, atk: 31, spd: 30, def: 25, res: 16, cd: 3 },
    { id: 'e_dark', side: 'enemy', name: 'Hexer', weapon: 'Green Tome', moveType: 'infantry', hp: 28, atk: 31, spd: 28, def: 16, res: 27, cd: 3 },
    { id: 'e_armor', side: 'enemy', name: 'Bulwark', weapon: 'Axe', moveType: 'armored', hp: 46, atk: 30, spd: 14, def: 38, res: 14, cd: 4 },
    { id: 'e_flier', side: 'enemy', name: 'Harrier', weapon: 'Sword', moveType: 'flying', hp: 32, atk: 30, spd: 34, def: 20, res: 24, cd: 3 },
    { id: 'e_heal', side: 'enemy', name: 'Acolyte', weapon: 'Staff', moveType: 'infantry', hp: 30, atk: 22, spd: 26, def: 14, res: 30, cd: 3 },
    { id: 'e_boss', side: 'enemy', name: 'Morvane', weapon: 'Blue Tome', moveType: 'infantry', hp: 60, atk: 36, spd: 30, def: 22, res: 30, cd: 3 },
];
/* growth per level above 1 (HP is +2 for everyone) */
export const GROWTH = {
    p_sword: { hp: 2, atk: 0, spd: 1, def: 1, res: 0 },
    p_lance: { hp: 2, atk: 1, spd: 0, def: 1, res: 0 },
    p_tome: { hp: 2, atk: 1, spd: 1, def: 0, res: 0 },
    p_flier: { hp: 2, atk: 1, spd: 0, def: 0, res: 1 },
    p_staff: { hp: 2, atk: 1, spd: 0, def: 0, res: 1 },
    p_bow: { hp: 2, atk: 1, spd: 1, def: 0, res: 0 },
    p_dagger: { hp: 2, atk: 0, spd: 1, def: 1, res: 0 },
    p_gtome: { hp: 2, atk: 1, spd: 0, def: 0, res: 1 },
    e_axe: { hp: 2, atk: 1, spd: 0, def: 1, res: 0 },
    e_bow: { hp: 2, atk: 1, spd: 0, def: 1, res: 0 },
    e_cav: { hp: 2, atk: 1, spd: 0, def: 1, res: 0 },
    e_dark: { hp: 2, atk: 1, spd: 0, def: 0, res: 1 },
    e_armor: { hp: 2, atk: 1, spd: 0, def: 1, res: 0 },
    e_flier: { hp: 2, atk: 1, spd: 1, def: 0, res: 0 },
    e_heal: { hp: 2, atk: 1, spd: 0, def: 0, res: 1 },
    e_boss: { hp: 2, atk: 1, spd: 0, def: 0, res: 1 },
};
export const BIOS = {
    p_sword: 'A steady young swordsman who never leaves a friend behind.',
    p_lance: 'A heavy knight who treats every fight as a door to hold shut.',
    p_tome: 'A mounted scholar who casts first and reads the footnotes later.',
    p_flier: 'A cheerful sky-rider with an axe and no fear of heights.',
    p_staff: 'A gentle healer who patches friends up faster than foes can hurt them.',
    p_bow: 'A woodland hunter who speaks rarely and misses even less.',
    p_dagger: 'A cheeky scout who strikes from two tiles away and is gone by three.',
    p_gtome: 'A calm rider-mage with green magic and a weakness for bad puns.',
};
export const ALL_DEFS = [...HERO_DEFS, ...ENEMY_DEFS];
export function baseDef(id) {
    const d = ALL_DEFS.find((x) => x.id === id);
    if (!d)
        throw new Error('Unknown unit id ' + id);
    return d;
}
export function isHeroId(id) { return HERO_DEFS.some((h) => h.id === id); }
export function displayName(id) {
    const d = ALL_DEFS.find((x) => x.id === id);
    return d ? d.name : id;
}
export const START_HEROES = ['p_sword', 'p_lance', 'p_tome', 'p_flier'];
//# sourceMappingURL=units.js.map