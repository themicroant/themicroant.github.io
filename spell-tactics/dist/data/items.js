export const ITEMS = [
    /* ---- starting gear & general store ---- */
    { id: 'iron_sword', name: 'Iron Sword', icon: '🗡️', slot: 'weapon', weapon: 'sword', stats: { atk: 3 }, price: 60, site: 0, desc: 'Plain, reliable steel.' },
    { id: 'oak_staff', name: 'Oak Staff', icon: '🪄', slot: 'weapon', weapon: 'staff', stats: { mag: 3 }, price: 60, site: 0, desc: 'A pilgrim’s staff.' },
    { id: 'hunting_bow', name: 'Hunting Bow', icon: '🏹', slot: 'weapon', weapon: 'bow', stats: { atk: 3 }, price: 60, site: 0, desc: 'Yew and gut string.' },
    { id: 'worn_tome', name: 'Worn Tome', icon: '📘', slot: 'weapon', weapon: 'tome', stats: { mag: 3 }, price: 60, site: 0, desc: 'Dog-eared spell primer.' },
    { id: 'iron_lance', name: 'Iron Lance', icon: '🔱', slot: 'weapon', weapon: 'lance', stats: { atk: 3 }, price: 60, site: 0, desc: 'Long iron point.' },
    { id: 'tin_dagger', name: 'Tin Dagger', icon: '🔪', slot: 'weapon', weapon: 'dagger', stats: { atk: 2, spd: 1 }, price: 60, site: 0, desc: 'Light and quick.' },
    { id: 'hand_axe', name: 'Hand Axe', icon: '🪓', slot: 'weapon', weapon: 'axe', stats: { atk: 3 }, price: 60, site: 0, desc: 'Balanced for riders.' },
    { id: 'padded_vest', name: 'Padded Vest', icon: '🦺', slot: 'armor', stats: { def: 1, hp: 3 }, price: 50, site: 0, desc: 'Quilted cloth armour.' },
    { id: 'potion', name: 'Healing Draught', icon: '🧉', slot: 'consumable', use: { heal: 50 }, price: 30, site: 0, desc: 'Restores 50% HP.' },
    { id: 'ether', name: 'Mana Tonic', icon: '🫙', slot: 'consumable', use: { mana: 50 }, price: 30, site: 0, desc: 'Restores 50% MP.' },
    { id: 'elixir', name: 'Panacea', icon: '⚗️', slot: 'consumable', use: { heal: 30, mana: 30, cleanse: true }, price: 60, site: 0, desc: 'Restores 30% HP and MP, removes harmful effects.' },
    /* ---- 1 Thornwood: hunters' gear ---- */
    { id: 'thornbow', name: 'Thornwood Longbow', icon: '🏹', slot: 'weapon', weapon: 'bow', stats: { atk: 5 }, crit: 5, price: 160, site: 1, desc: 'Strung with thorn-vine.' },
    { id: 'ranger_blade', name: 'Ranger’s Blade', icon: '🗡️', slot: 'weapon', weapon: 'sword', stats: { atk: 4, spd: 2 }, price: 150, site: 1, desc: 'Light sword for long patrols.' },
    { id: 'wolfhide', name: 'Wolfhide Jerkin', icon: '🧥', slot: 'armor', stats: { def: 3, hp: 5 }, price: 120, site: 1, desc: 'Warm and tough.' },
    { id: 'fang_charm', name: 'Fang Charm', icon: '🦷', slot: 'trinket', stats: { spd: 1 }, crit: 10, price: 140, site: 1, desc: 'A dire wolf’s tooth on a cord.' },
    /* ---- 2 Mirefen: venom & growth ---- */
    { id: 'viper_fang', name: 'Viper Fang', icon: '🔪', slot: 'weapon', weapon: 'dagger', stats: { atk: 4, spd: 2 }, price: 180, site: 2,
        mods: [{ school: 'nature', mod: { statusPower: 10 }, text: 'Nature effects +10% strength' }], desc: 'Still drips venom.' },
    { id: 'bog_staff', name: 'Mangrove Staff', icon: '🪄', slot: 'weapon', weapon: 'staff', stats: { mag: 4, mp: 4 }, price: 180, site: 2,
        mods: [{ school: 'holy', mod: { power: 10 }, text: 'Holy skills +10% power' }], desc: 'Living wood, still budding.' },
    { id: 'mossmail', name: 'Mossmail', icon: '🥋', slot: 'armor', stats: { def: 2, res: 3, hp: 4 }, price: 160, site: 2, desc: 'Mail grown over with soft moss.' },
    { id: 'spore_totem', name: 'Spore Totem', icon: '🍄', slot: 'trinket', stats: { hp: 4 }, price: 200, site: 2,
        mods: [{ school: 'nature', mod: { statusTurns: 1 }, text: 'Nature effects last +1 turn' }], desc: 'Pulses with marsh spores.' },
    /* ---- 3 Cinderforge: fire & steel ---- */
    { id: 'molten_lance', name: 'Molten Lance', icon: '🔱', slot: 'weapon', weapon: 'lance', stats: { atk: 6 }, price: 240, site: 3,
        mods: [{ skill: 'shield_bash', mod: { power: 30 }, text: 'Shield Bash +30% power' }], desc: 'The tip never cools.' },
    { id: 'ember_axe', name: 'Ember Axe', icon: '🪓', slot: 'weapon', weapon: 'axe', stats: { atk: 5, mag: 2 }, price: 230, site: 3, desc: 'Glows like a coal.' },
    { id: 'forgeplate', name: 'Forgeplate', icon: '🛡️', slot: 'armor', stats: { def: 5, res: 1, hp: 6, spd: -1 }, price: 220, site: 3, desc: 'Heavy, but nothing gets through.' },
    { id: 'emberheart', name: 'Emberheart Ring', icon: '💍', slot: 'trinket', stats: { mag: 1 }, price: 280, site: 3,
        mods: [{ school: 'fire', mod: { range: 1, power: 10 }, text: 'Fire skills +1 range, +10% power' }], desc: 'A forge-coal set in gold.' },
    { id: 'scroll_flame', name: 'Scroll: Flame Strike', icon: '📜', slot: 'scroll', teaches: 'flame_strike', price: 200, site: 3, desc: 'Teaches Flame Strike to any hero.' },
    /* ---- 4 Frostfang: ice ---- */
    { id: 'rime_tome', name: 'Rime Codex', icon: '📘', slot: 'weapon', weapon: 'tome', stats: { mag: 6 }, price: 260, site: 4,
        mods: [{ school: 'frost', mod: { statusTurns: 1 }, text: 'Frost effects last +1 turn' }], desc: 'Pages rimed with frost.' },
    { id: 'glacier_mail', name: 'Glacier Mail', icon: '🧊', slot: 'armor', stats: { def: 3, res: 5, hp: 4 }, price: 240, site: 4, desc: 'Ice that never melts.' },
    { id: 'frostbound', name: 'Frostbound Amulet', icon: '📿', slot: 'trinket', stats: { res: 2 }, price: 320, site: 4,
        mods: [{ school: 'frost', mod: { aoe: 1 }, text: 'Frost skills +1 area radius' }], desc: 'Cold radiates from it.' },
    { id: 'scroll_ice', name: 'Scroll: Ice Lance', icon: '📜', slot: 'scroll', teaches: 'ice_lance', price: 220, site: 4, desc: 'Teaches Ice Lance to any hero.' },
    /* ---- 5 Drowned Archive: arcane ---- */
    { id: 'runed_tome', name: 'Runed Grimoire', icon: '📕', slot: 'weapon', weapon: 'tome', stats: { mag: 7, mp: 4 }, price: 320, site: 5,
        mods: [{ school: 'arcane', mod: { range: 1 }, text: 'Arcane skills +1 range' }], desc: 'Its runes rearrange when unwatched.' },
    { id: 'sage_robe', name: 'Sage’s Robe', icon: '👘', slot: 'armor', stats: { res: 5, mp: 8, hp: 4 }, price: 260, site: 5, desc: 'Woven with silver thread.' },
    { id: 'mana_pearl', name: 'Mana Pearl', icon: '🔵', slot: 'trinket', stats: { mp: 10 }, price: 340, site: 5,
        mods: [{ mod: { cost: -1 }, text: 'All skills −1 mana' }], desc: 'Found in a drowned reading room.' },
    { id: 'scroll_arcane', name: 'Scroll: Arcane Missiles', icon: '📜', slot: 'scroll', teaches: 'arcane_missiles', price: 240, site: 5, desc: 'Teaches Arcane Missiles to any hero.' },
    /* ---- 6 Gravewatch: shadow & life-steal ---- */
    { id: 'soulreaver', name: 'Soulreaver', icon: '🗡️', slot: 'weapon', weapon: 'dagger', stats: { atk: 7, spd: 2 }, lifesteal: 15, price: 360, site: 6, desc: 'Hungers for the living.' },
    { id: 'dawnblade', name: 'Dawnblade', icon: '⚔️', slot: 'weapon', weapon: 'sword', stats: { atk: 7, res: 2 }, price: 360, site: 6,
        mods: [{ school: 'holy', mod: { power: 20 }, text: 'Holy skills +20% power' }], desc: 'Forged to end the restless dead.' },
    { id: 'bone_ward', name: 'Bone Ward', icon: '🦴', slot: 'armor', stats: { def: 4, res: 4, hp: 6 }, price: 300, site: 6, desc: 'Charms of bone against curses.' },
    { id: 'grave_lantern', name: 'Grave Lantern', icon: '🏮', slot: 'trinket', lifesteal: 20, price: 360, site: 6,
        mods: [{ school: 'shadow', mod: { lifesteal: 15 }, text: 'Shadow skills +15% lifesteal' }], desc: 'Its flame feeds on fallen foes.' },
    { id: 'scroll_shadow', name: 'Scroll: Shadow Bolt', icon: '📜', slot: 'scroll', teaches: 'shadow_bolt', price: 260, site: 6, desc: 'Teaches Shadow Bolt to any hero.' },
    /* ---- 7 Skyreach: storm & wind ---- */
    { id: 'thunder_axe', name: 'Thunder Axe', icon: '🪓', slot: 'weapon', weapon: 'axe', stats: { atk: 7, mag: 3 }, price: 380, site: 7,
        mods: [{ school: 'storm', mod: { power: 15 }, text: 'Storm skills +15% power' }], desc: 'Crackles when swung.' },
    { id: 'galebow', name: 'Galebow', icon: '🏹', slot: 'weapon', weapon: 'bow', stats: { atk: 7, spd: 2 }, price: 380, site: 7,
        mods: [{ skill: 'aimed_shot', mod: { range: 1 }, text: 'Aimed Shot +1 range' }], desc: 'Arrows ride the wind.' },
    { id: 'feather_cloak', name: 'Featherfall Cloak', icon: '🪶', slot: 'armor', stats: { def: 2, res: 2, spd: 2, mov: 1 }, price: 400, site: 7, desc: '+1 movement.' },
    { id: 'stormcaller', name: 'Stormcaller Talisman', icon: '🌩️', slot: 'trinket', stats: { mag: 2 }, price: 400, site: 7,
        mods: [{ school: 'storm', mod: { chain: 1 }, text: 'Storm skills +1 chain target' }], desc: 'Hums before lightning strikes.' },
    /* ---- 8 Sunscar: sun & sand ---- */
    { id: 'sunfire_scepter', name: 'Sunfire Scepter', icon: '🔆', slot: 'weapon', weapon: 'staff', stats: { mag: 8, mp: 4 }, price: 420, site: 8,
        mods: [{ school: 'holy', mod: { power: 15, range: 1 }, text: 'Holy skills +15% power, +1 range' }], desc: 'Holds a captured noon.' },
    { id: 'dune_lance', name: 'Dune Lance', icon: '🔱', slot: 'weapon', weapon: 'lance', stats: { atk: 8, def: 2 }, price: 420, site: 8, desc: 'Raider steel, sand-scoured.' },
    { id: 'scarab_shell', name: 'Scarab Carapace', icon: '🪲', slot: 'armor', stats: { def: 6, res: 3, hp: 8 }, price: 380, site: 8, desc: 'Lacquered beetle shell.' },
    { id: 'mirage_charm', name: 'Mirage Charm', icon: '🌞', slot: 'trinket', stats: { spd: 4 }, crit: 8, price: 380, site: 8, desc: 'You are never quite where they aim.' },
    { id: 'scroll_sand', name: 'Scroll: Sandstorm', icon: '📜', slot: 'scroll', teaches: 'sandstorm', price: 280, site: 8, desc: 'Teaches Sandstorm to any hero.' },
    /* ---- 9 Obsidian Citadel: relics of the Star ---- */
    { id: 'starblade', name: 'Starforged Blade', icon: '🌟', slot: 'weapon', weapon: 'sword', stats: { atk: 10, spd: 2 }, crit: 10, price: 700, site: 9, desc: 'Forged from a sliver of the Star.' },
    { id: 'star_crown', name: 'Crown of the Nine', icon: '👑', slot: 'trinket', stats: { hp: 8, mp: 10, atk: 2, mag: 2 }, price: 800, site: 9,
        mods: [{ mod: { power: 10 }, text: 'All skills +10% power' }], desc: 'Nine sockets, nine shards.' },
    { id: 'void_mantle', name: 'Mantle of the Hollow', icon: '🦇', slot: 'armor', stats: { def: 6, res: 6, hp: 10 }, price: 700, site: 9, desc: 'Vaelith’s own cloak.' },
];
const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export function itemOf(id) {
    const i = BY_ID.get(id);
    if (!i)
        throw new Error('unknown item ' + id);
    return i;
}
/** Weapon each hero arrives with. */
export const STARTING_WEAPON = {
    aldric: 'iron_sword', seren: 'oak_staff', rook: 'hunting_bow', thessa: 'worn_tome',
    garron: 'iron_lance', ilsa: 'worn_tome', vex: 'tin_dagger', kestrel: 'hand_axe',
};
//# sourceMappingURL=items.js.map