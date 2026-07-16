// Emojimon — static game data (types, moves, species, maps, trainers, items).
// Pure data + small pure helper functions. No DOM access, no game state here —
// script.js (and admin.html) both load this file as the single source of truth.
"use strict";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const TYPES = [
  "leaf", "ember", "aqua", "volt", "stone", "frost",
  "sky", "bug", "spooky", "psy", "shadow", "normal",
];

const TYPE_EMOJI = {
  leaf: "🌿", ember: "🔥", aqua: "💧", volt: "⚡", stone: "🪨", frost: "❄️",
  sky: "🕊️", bug: "🐛", spooky: "👻", psy: "🧿", shadow: "🌑", normal: "⭐",
};

const TYPE_NAME = {
  leaf: "Leaf", ember: "Ember", aqua: "Aqua", volt: "Volt", stone: "Stone", frost: "Frost",
  sky: "Sky", bug: "Bug", spooky: "Spooky", psy: "Psy", shadow: "Shadow", normal: "Normal",
};

// Single authored table: STRONG_AGAINST[type] = types that type's moves deal 2x damage to.
// Effectiveness is *derived* (see typeEffectiveness) instead of hand-authoring a second
// "weak against" table, so the chart can never self-contradict.
const STRONG_AGAINST = {
  leaf: ["aqua", "stone"],
  ember: ["leaf", "bug", "frost"],
  aqua: ["ember", "stone"],
  volt: ["aqua", "sky"],
  stone: ["ember", "sky", "bug"],
  frost: ["leaf", "sky"],
  sky: ["leaf", "bug"],
  bug: ["leaf", "psy"],
  spooky: ["psy", "spooky"],
  psy: ["normal", "shadow"],
  shadow: ["spooky", "psy"],
  normal: [],
};

function typeEffectiveness(atkType, defType) {
  if ((STRONG_AGAINST[atkType] || []).includes(defType)) return 2;
  if ((STRONG_AGAINST[defType] || []).includes(atkType)) return 0.5;
  return 1;
}

// ---------------------------------------------------------------------------
// Terrain / tiles
// ---------------------------------------------------------------------------

// Terrain-only legend. Buildings, trainers and warps are overlaid per-map via `entities`
// so the same char always means the same terrain everywhere.
const TILE_LEGEND = {
  "#": { name: "Wall", emoji: "🌳", walkable: false },
  ".": { name: "Path", emoji: "🟩", walkable: true },
  ",": { name: "Tall Grass", emoji: "🌾", walkable: true, encounter: "grass" },
  T: { name: "Forest", emoji: "🌲", walkable: true, encounter: "forest" },
  "~": { name: "Water", emoji: "🌊", walkable: true, encounter: "water" },
  d: { name: "Sand", emoji: "🏖️", walkable: true, encounter: "sand" },
  m: { name: "Mountain", emoji: "⛰️", walkable: true, encounter: "mountain" },
  c: { name: "Cave", emoji: "🕳️", walkable: true, encounter: "cave" },
  n: { name: "Snow", emoji: "❄️", walkable: true, encounter: "snow" },
  b: { name: "Bridge", emoji: "🌉", walkable: true },
  o: { name: "Floor", emoji: "🟫", walkable: true },
};

const ENCOUNTER_POOLS = {
  grass: ["leaf", "bug", "normal", "sky"],
  forest: ["leaf", "bug", "spooky"],
  water: ["aqua"],
  sand: ["aqua", "stone"],
  mountain: ["stone", "frost"],
  cave: ["stone", "spooky", "shadow", "bug"],
  snow: ["frost", "sky"],
};

const ENCOUNTER_RATE = {
  grass: 0.12, forest: 0.12, sand: 0.12, snow: 0.12,
  water: 0.08, mountain: 0.08, cave: 0.18,
};

// ---------------------------------------------------------------------------
// Moves
// ---------------------------------------------------------------------------
// Every type gets a "light" (cheap, accurate) and "heavy" (stronger, can inflict that
// type's signature status) move. Plus 4 shared moves everyone can learn.

const STATUS_BY_TYPE = {
  ember: "burn", volt: "paralyze", frost: "freeze", spooky: "curse", shadow: "curse",
};

const MOVE_FLAVOR = {
  leaf: { light: ["Vine Snap", "🌿"], heavy: ["Bramble Slam", "🌳"] },
  ember: { light: ["Ember Jab", "🔥"], heavy: ["Inferno Blast", "🌋"] },
  aqua: { light: ["Water Splash", "💧"], heavy: ["Tidal Crash", "🌊"] },
  volt: { light: ["Static Shock", "⚡"], heavy: ["Thunder Slam", "🌩️"] },
  stone: { light: ["Rock Toss", "🪨"], heavy: ["Boulder Crush", "⛰️"] },
  frost: { light: ["Frost Bite", "❄️"], heavy: ["Blizzard Slam", "🌨️"] },
  sky: { light: ["Wing Buffet", "🕊️"], heavy: ["Sky Dive", "🌪️"] },
  bug: { light: ["Bug Bite", "🐛"], heavy: ["Swarm Sting", "🐝"] },
  spooky: { light: ["Spooky Touch", "👻"], heavy: ["Nightmare Wail", "💀"] },
  psy: { light: ["Mind Poke", "🧿"], heavy: ["Psychic Wave", "🔮"] },
  shadow: { light: ["Shadow Claw", "🌑"], heavy: ["Dark Ambush", "🕶️"] },
  normal: { light: ["Quick Hit", "⭐"], heavy: ["Full Force", "💥"] },
};

const MOVES = {
  tackle: { id: "tackle", name: "Tackle", emoji: "🥊", type: "normal", kind: "attack", power: 35, accuracy: 100 },
  growl: { id: "growl", name: "Growl", emoji: "😤", type: "normal", kind: "debuff", stat: "atk", amount: -1, accuracy: 100 },
  guard: { id: "guard", name: "Guard", emoji: "🛡️", type: "normal", kind: "buff", stat: "def", amount: 1, accuracy: 100 },
  recover: { id: "recover", name: "Recover", emoji: "💗", type: "normal", kind: "heal", percent: 0.4, accuracy: 100 },
};

for (const type of TYPES) {
  const [lightName, lightEmoji] = MOVE_FLAVOR[type].light;
  const [heavyName, heavyEmoji] = MOVE_FLAVOR[type].heavy;
  MOVES[`${type}_light`] = {
    id: `${type}_light`, name: lightName, emoji: lightEmoji, type, kind: "attack",
    power: 40, accuracy: 95,
  };
  MOVES[`${type}_heavy`] = {
    id: `${type}_heavy`, name: heavyName, emoji: heavyEmoji, type, kind: "attack",
    power: 70, accuracy: 85, status: STATUS_BY_TYPE[type] || null, statusChance: 0.3,
  };
}

// Movepool rule: every species of a given type learns the same shape of movepool, so the
// whole roster stays balanced without hand-authoring 25 movepools. Admins can still override
// a specific species' `movepool` in the editor (see admin.html).
function buildMovepool(type, typeIndex) {
  const buff = typeIndex % 2 === 0 ? "growl" : "guard";
  return [
    { level: 1, move: "tackle" },
    { level: 1, move: `${type}_light` },
    { level: 7, move: buff },
    { level: 14, move: `${type}_heavy` },
    { level: 24, move: "recover" },
  ];
}

// ---------------------------------------------------------------------------
// Status effects (applied in battle, defined here so admin/UI can describe them)
// ---------------------------------------------------------------------------

const STATUS_INFO = {
  burn: { name: "Burn", emoji: "🔥", tickPercent: 0.08, atkMult: 0.75 },
  paralyze: { name: "Paralyze", emoji: "⚡", skipChance: 0.25 },
  freeze: { name: "Freeze", emoji: "🥶", thawChance: 0.2 },
  curse: { name: "Curse", emoji: "🌑", tickPercent: 0.1 },
};

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------
// Growth (deterministic — no IVs/EVs/hidden randomness, this is a short prototype run):
//   maxHp = baseHp + level*2 | atk = baseAtk + floor(level/2)
//   def = baseDef + floor(level/2) | spd = baseSpd + floor(level/3)

function statsAtLevel(base, level) {
  return {
    hp: base.hp + level * 2,
    atk: base.atk + Math.floor(level / 2),
    def: base.def + Math.floor(level / 2),
    spd: base.spd + Math.floor(level / 3),
  };
}

const SPECIES = {
  // --- Volt line: the player's starter (never appears in the wild) ---
  sparkit: {
    id: "sparkit", name: "Sparkit", type: "volt", emoji: "🐹", stage: 1,
    base: { hp: 30, atk: 32, def: 24, spd: 40 }, evolveLevel: 16, evolvesTo: "boltail",
  },
  boltail: {
    id: "boltail", name: "Boltail", type: "volt", emoji: "🐿️", stage: 2,
    base: { hp: 45, atk: 48, def: 36, spd: 58 }, evolveLevel: 32, evolvesTo: "voltfox",
  },
  voltfox: {
    id: "voltfox", name: "Voltfox", type: "volt", emoji: "🦊", stage: 3,
    base: { hp: 62, atk: 68, def: 50, spd: 80 }, evolveLevel: null, evolvesTo: null,
  },

  // --- Leaf line ---
  sproutoad: {
    id: "sproutoad", name: "Sproutoad", type: "leaf", emoji: "🐸", stage: 1,
    base: { hp: 35, atk: 30, def: 32, spd: 28 }, evolveLevel: 20, evolvesTo: "vinedile",
  },
  vinedile: {
    id: "vinedile", name: "Vinedile", type: "leaf", emoji: "🐊", stage: 2,
    base: { hp: 58, atk: 52, def: 54, spd: 42 }, evolveLevel: null, evolvesTo: null,
  },

  // --- Ember line ---
  emberlizard: {
    id: "emberlizard", name: "Emberlizard", type: "ember", emoji: "🦎", stage: 1,
    base: { hp: 32, atk: 36, def: 26, spd: 34 }, evolveLevel: 22, evolvesTo: "infernrex",
  },
  infernrex: {
    id: "infernrex", name: "Infernrex", type: "ember", emoji: "🐉", stage: 2,
    base: { hp: 55, atk: 62, def: 44, spd: 52 }, evolveLevel: null, evolvesTo: null,
  },

  // --- Aqua line ---
  pufflet: {
    id: "pufflet", name: "Pufflet", type: "aqua", emoji: "🐡", stage: 1,
    base: { hp: 36, atk: 28, def: 30, spd: 30 }, evolveLevel: 18, evolvesTo: "aquarin",
  },
  aquarin: {
    id: "aquarin", name: "Aquarin", type: "aqua", emoji: "🐬", stage: 2,
    base: { hp: 56, atk: 46, def: 48, spd: 48 }, evolveLevel: null, evolvesTo: null,
  },

  // --- Stone line ---
  pebbleback: {
    id: "pebbleback", name: "Pebbleback", type: "stone", emoji: "🐢", stage: 1,
    base: { hp: 40, atk: 26, def: 40, spd: 18 }, evolveLevel: 24, evolvesTo: "boulderhorn",
  },
  boulderhorn: {
    id: "boulderhorn", name: "Boulderhorn", type: "stone", emoji: "🦏", stage: 2,
    base: { hp: 68, atk: 50, def: 66, spd: 28 }, evolveLevel: null, evolvesTo: null,
  },

  // --- Frost line ---
  chillpen: {
    id: "chillpen", name: "Chillpen", type: "frost", emoji: "🐧", stage: 1,
    base: { hp: 34, atk: 30, def: 30, spd: 32 }, evolveLevel: 20, evolvesTo: "frostbear",
  },
  frostbear: {
    id: "frostbear", name: "Frostbear", type: "frost", emoji: "🐻‍❄️", stage: 2,
    base: { hp: 58, atk: 52, def: 50, spd: 44 }, evolveLevel: null, evolvesTo: null,
  },

  // --- Sky line ---
  chirpuff: {
    id: "chirpuff", name: "Chirpuff", type: "sky", emoji: "🐤", stage: 1,
    base: { hp: 28, atk: 30, def: 24, spd: 42 }, evolveLevel: 18, evolvesTo: "skytalon",
  },
  skytalon: {
    id: "skytalon", name: "Skytalon", type: "sky", emoji: "🦅", stage: 2,
    base: { hp: 46, atk: 52, def: 40, spd: 64 }, evolveLevel: null, evolvesTo: null,
  },

  // --- Bug line ---
  creepling: {
    id: "creepling", name: "Creepling", type: "bug", emoji: "🐛", stage: 1,
    base: { hp: 26, atk: 28, def: 24, spd: 30 }, evolveLevel: 12, evolvesTo: "mothwing",
  },
  mothwing: {
    id: "mothwing", name: "Mothwing", type: "bug", emoji: "🦋", stage: 2,
    base: { hp: 42, atk: 44, def: 38, spd: 50 }, evolveLevel: null, evolvesTo: null,
  },

  // --- Spooky line ---
  batling: {
    id: "batling", name: "Batling", type: "spooky", emoji: "🦇", stage: 1,
    base: { hp: 30, atk: 32, def: 24, spd: 38 }, evolveLevel: 16, evolvesTo: "ghoulbat",
  },
  ghoulbat: {
    id: "ghoulbat", name: "Ghoulbat", type: "spooky", emoji: "👻", stage: 2,
    base: { hp: 48, atk: 54, def: 38, spd: 56 }, evolveLevel: null, evolvesTo: null,
  },

  // --- Psy line ---
  mysticat: {
    id: "mysticat", name: "Mysticat", type: "psy", emoji: "🐱", stage: 1,
    base: { hp: 30, atk: 30, def: 28, spd: 34 }, evolveLevel: 19, evolvesTo: "owlsage",
  },
  owlsage: {
    id: "owlsage", name: "Owlsage", type: "psy", emoji: "🦉", stage: 2,
    base: { hp: 48, atk: 50, def: 44, spd: 54 }, evolveLevel: null, evolvesTo: null,
  },

  // --- Shadow line ---
  ratlurk: {
    id: "ratlurk", name: "Ratlurk", type: "shadow", emoji: "🐀", stage: 1,
    base: { hp: 30, atk: 32, def: 26, spd: 36 }, evolveLevel: 21, evolvesTo: "direwolf",
  },
  direwolf: {
    id: "direwolf", name: "Direwolf", type: "shadow", emoji: "🐺", stage: 2,
    base: { hp: 52, atk: 58, def: 42, spd: 58 }, evolveLevel: null, evolvesTo: null,
  },

  // --- Normal line ---
  fluffet: {
    id: "fluffet", name: "Fluffet", type: "normal", emoji: "🐑", stage: 1,
    base: { hp: 36, atk: 26, def: 30, spd: 26 }, evolveLevel: 15, evolvesTo: "moolass",
  },
  moolass: {
    id: "moolass", name: "Moolass", type: "normal", emoji: "🐮", stage: 2,
    base: { hp: 56, atk: 44, def: 48, spd: 36 }, evolveLevel: null, evolvesTo: null,
  },
};

// Fill in movepools from the type-driven rule (skipped for any species the admin tool has
// already given an explicit `movepool`).
(function attachMovepools() {
  for (const species of Object.values(SPECIES)) {
    if (!species.movepool) {
      const typeIndex = TYPES.indexOf(species.type);
      species.movepool = buildMovepool(species.type, typeIndex);
    }
  }
})();

const STARTER_SPECIES = "sparkit";

// Base (stage 1) species per type, used to populate wild encounter rolls. The Volt line is
// reserved for the starter and is never rolled in the wild.
const WILD_BASE_SPECIES_BY_TYPE = {};
for (const species of Object.values(SPECIES)) {
  if (species.stage === 1 && species.type !== "volt") {
    WILD_BASE_SPECIES_BY_TYPE[species.type] = species.id;
  }
}

function xpToNext(level) {
  return 20 + level * 15;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

const ITEMS = {
  emojiball: { id: "emojiball", name: "Emoji Ball", emoji: "🔴", kind: "ball", catchPower: 1, price: 40 },
  greatball: { id: "greatball", name: "Great Ball", emoji: "🔵", kind: "ball", catchPower: 1.5, price: 100 },
  ultraball: { id: "ultraball", name: "Ultra Ball", emoji: "🟡", kind: "ball", catchPower: 2, price: 200 },
  potion: { id: "potion", name: "Potion", emoji: "💊", kind: "heal", healAmount: 20, price: 30 },
  fullheal: { id: "fullheal", name: "Full Heal", emoji: "🧪", kind: "cure", price: 50 },
};

const SHOP_STOCK = ["emojiball", "greatball", "ultraball", "potion", "fullheal"];

// ---------------------------------------------------------------------------
// Trainers
// ---------------------------------------------------------------------------

const TRAINERS = {
  timmy: {
    id: "timmy", name: "Bug Catcher Timmy", emoji: "🧑", reward: 80,
    line: "My bugs won't lose!", winLine: "Aw, bugged out...",
    team: [{ species: "creepling", level: 4 }, { species: "sproutoad", level: 4 }],
  },
  mae: {
    id: "mae", name: "Angler Mae", emoji: "👩", reward: 120,
    line: "Reel it in!", winLine: "The one that got away...",
    team: [{ species: "pufflet", level: 6 }, { species: "pebbleback", level: 6 }],
  },
  jo: {
    id: "jo", name: "Spelunker Jo", emoji: "🧑‍🦯", reward: 150,
    line: "The dark holds secrets!", winLine: "Back to base camp...",
    team: [
      { species: "ratlurk", level: 7 },
      { species: "pebbleback", level: 7 },
      { species: "batling", level: 8 },
    ],
  },
  rival1: {
    id: "rival1", name: "Rival Zex", emoji: "😎", reward: 100,
    line: "Let's see what you've got!", winLine: "This isn't over!",
    team: [{ species: "emberlizard", level: 5 }],
  },
  rival2: {
    id: "rival2", name: "Rival Zex", emoji: "😎", reward: 300,
    line: "Time for the real battle!", winLine: "You're... actually good.",
    team: [
      { species: "emberlizard", level: 12 },
      { species: "ratlurk", level: 11 },
      { species: "chirpuff", level: 10 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Maps
// ---------------------------------------------------------------------------
// `tiles` is terrain-only (TILE_LEGEND chars). Buildings/trainers/warps are overlaid via
// `entities` at fixed coordinates so terrain chars never need to collide with content.

const MAPS = {
  town: {
    id: "town", name: "Emberbrook Town", width: 14, height: 11, levelRange: null,
    spawn: { x: 7, y: 7 },
    tiles: [
      "##############",
      "#............#",
      "#............#",
      "#....o..o....#",
      "#............#",
      "..............",
      "#............#",
      "#............#",
      "#............#",
      "#............#",
      "######..######",
    ],
    entities: [
      { x: 7, y: 1, kind: "building", id: "lab", emoji: "🏠", name: "Lab" },
      { x: 5, y: 3, kind: "building", id: "shop", emoji: "🏪", name: "Shop" },
      { x: 8, y: 3, kind: "building", id: "healhut", emoji: "🏥", name: "Heal Hut" },
      { x: 0, y: 5, kind: "warp", toMap: "cave", toX: 11, toY: 4 },
      { x: 13, y: 5, kind: "warp", toMap: "lake", toX: 1, toY: 5 },
      { x: 6, y: 10, kind: "warp", toMap: "route1", toX: 7, toY: 1 },
      { x: 7, y: 10, kind: "warp", toMap: "route1", toX: 7, toY: 1 },
    ],
  },

  route1: {
    id: "route1", name: "Route 1", width: 15, height: 11, levelRange: [2, 5],
    spawn: { x: 7, y: 1 },
    tiles: [
      "#######.#######",
      "#.............#",
      "#,,,,,,,,,,,,,#",
      "#,,,y,,,,,,,,,#",
      "#,,,,,,,,,,,,,#",
      "#TTT,,,,,,,TTT#",
      "#,,,,,,,,,,,,,#",
      "#,,,,,,,v,,,,,#",
      "#,,,,,,,,,,,,,#",
      "#.............#",
      "###############",
    ],
    entities: [
      { x: 7, y: 0, kind: "warp", toMap: "town", toX: 7, toY: 9 },
      { x: 4, y: 3, kind: "trainer", id: "timmy" },
      { x: 8, y: 7, kind: "trainer", id: "rival1" },
    ],
  },

  lake: {
    id: "lake", name: "Lake Shore", width: 15, height: 11, levelRange: [4, 8],
    spawn: { x: 1, y: 5 },
    tiles: [
      "#######.#######",
      "#......b......#",
      "#ddddddddddddd#",
      "#d~~~~~~~~~~~d#",
      "#d~~~~~~~~~~~d#",
      "..~~~~~~~~~~~~.",
      "#d~~~~~~~~~~~d#",
      "#d~~~~~~~~~~~d#",
      "#ddddddddddddd#",
      "#.............#",
      "###############",
    ],
    entities: [
      { x: 0, y: 5, kind: "warp", toMap: "town", toX: 12, toY: 5 },
      { x: 7, y: 0, kind: "warp", toMap: "snowyridge", toX: 10, toY: 9 },
      { x: 7, y: 3, kind: "trainer", id: "mae" },
    ],
  },

  cave: {
    id: "cave", name: "Whispering Cave", width: 13, height: 9, levelRange: [5, 9],
    spawn: { x: 11, y: 4 },
    tiles: [
      "#######.#####",
      "#...........#",
      "#ccccccccccc#",
      "#ccccccccccc#",
      "#ccccccccccc.",
      "#cccjccccccc#",
      "#ccccccccccc#",
      "#...........#",
      "#############",
    ],
    entities: [
      { x: 12, y: 4, kind: "warp", toMap: "town", toX: 1, toY: 5 },
      { x: 7, y: 0, kind: "warp", toMap: "snowyridge", toX: 4, toY: 9 },
      { x: 6, y: 3, kind: "trainer", id: "jo" },
    ],
  },

  snowyridge: {
    id: "snowyridge", name: "Snowy Ridge", width: 15, height: 11, levelRange: [7, 12],
    spawn: { x: 4, y: 9 },
    tiles: [
      "###############",
      "#nnnnnnnnnnnnn#",
      "#nnnmmmmmnnnnn#",
      "#nnnmmvmmnnnnn#",
      "#nnnnnnnnnnnnn#",
      "#nnnnnnnnnnnnn#",
      "#nnnnnnnnnnnnn#",
      "#nnnnnnnnnnnnn#",
      "#nnnnnnnnnnnnn#",
      "#nnnnnnnnnnnnn#",
      "####.#####.####",
    ],
    entities: [
      { x: 4, y: 10, kind: "warp", toMap: "cave", toX: 7, toY: 1 },
      { x: 10, y: 10, kind: "warp", toMap: "lake", toX: 7, toY: 1 },
      { x: 6, y: 3, kind: "trainer", id: "rival2" },
    ],
  },
};

// The `y`/`v`/`j` characters above are trainer markers baked into the tiles for readability
// while authoring the map art; they are stripped to plain grass/cave floor at load time and
// the real trainer position comes only from `entities`.
(function stripTrainerMarkersFromTiles() {
  const markerReplacement = { y: ",", v: ",", j: "c" };
  for (const map of Object.values(MAPS)) {
    map.tiles = map.tiles.map((row) => {
      let out = "";
      for (const ch of row) out += markerReplacement[ch] || ch;
      return out;
    });
  }
})();

// ---------------------------------------------------------------------------
// Export (works both as plain <script> globals and, if ever needed, as a module)
// ---------------------------------------------------------------------------

const EmojimonData = {
  TYPES, TYPE_EMOJI, TYPE_NAME, STRONG_AGAINST, typeEffectiveness,
  TILE_LEGEND, ENCOUNTER_POOLS, ENCOUNTER_RATE,
  MOVES, STATUS_INFO, STATUS_BY_TYPE,
  SPECIES, STARTER_SPECIES, WILD_BASE_SPECIES_BY_TYPE, statsAtLevel, xpToNext,
  ITEMS, SHOP_STOCK, TRAINERS, MAPS,
};

if (typeof module !== "undefined" && module.exports) module.exports = EmojimonData;
