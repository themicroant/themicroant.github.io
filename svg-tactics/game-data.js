// Arcanum Tactics — static game data: jobs, abilities, stat tables, enemy templates, battles,
// and the layered-SVG art system (unit sprites, tile textures, ability icons).
// Loaded before script.js. This is the file admin/index.html edits and re-exports — keep all
// content data here, keep logic in script.js.
"use strict";

// ---------------------------------------------------------------------------------------------
// Elements & statuses
// ---------------------------------------------------------------------------------------------

const ELEMENTS = ["physical", "fire", "ice", "lightning", "holy"];

const STATUS_DEFS = {
  poison: { name: "Poison", icon: "poison", turns: 3, kind: "dot" },
  stun: { name: "Stun", icon: "stun", turns: 1, kind: "stun" },
  haste: { name: "Haste", icon: "haste", turns: 3, kind: "buff" },
  slow: { name: "Slow", icon: "slow", turns: 3, kind: "debuff" },
  stop: { name: "Stop", icon: "stop", turns: 2, kind: "stop" },
  protect: { name: "Protect", icon: "protect", turns: 3, kind: "buff" },
  shell: { name: "Shell", icon: "shell", turns: 3, kind: "buff" },
  atkUp: { name: "Focus", icon: "atkUp", turns: 3, kind: "buff" },
  cheer: { name: "Cheer", icon: "atkUp", turns: 3, kind: "buff" },
  defDown: { name: "Sunder", icon: "defDown", turns: 3, kind: "debuff" },
  counter: { name: "Counter", icon: "counter", turns: 1, kind: "buff" },
  float: { name: "Float", icon: "float", turns: 3, kind: "buff" },
  brace: { name: "Brace", icon: "protect", turns: 3, kind: "buff" },
};

// ---------------------------------------------------------------------------------------------
// Jobs — base stats, per-level growth, and each job's 4 action abilities.
// stat(job, level) = base + growth * (level - 1)
// ---------------------------------------------------------------------------------------------

const JOBS = {
  squire: {
    id: "squire", name: "Squire", tier: 0, cost: 0, prereq: [],
    base: { hp: 28, mp: 8, atk: 9, mag: 4, def: 6, res: 4, spd: 8 }, mov: 4,
    growth: { hp: 5, mp: 1, atk: 1, mag: 0, def: 1, res: 0, spd: 0 },
    color: "#7d8fa8", colorDark: "#4a5a70", accent: "#f0c674",
    visual: { headgear: "cap", weapon: "sword" },
    abilities: [
      { id: "focus", name: "Focus", mp: 0, range: 0, aoe: 0, power: 0, element: "physical",
        kind: "buffSelf", status: "atkUp", icon: "atkUp", desc: "+30% ATK/MAG to self, 3 turns." },
      { id: "cheer", name: "Cheer", mp: 0, range: 2, aoe: 1, power: 0, element: "physical",
        kind: "buffAllies", status: "cheer", icon: "atkUp", desc: "Allies in range: +20% ATK, 3 turns." },
      { id: "throwStone", name: "Throw Stone", mp: 0, range: 3, aoe: 0, power: 0.7, element: "physical",
        kind: "damage", icon: "stone", desc: "Ranged low damage." },
      { id: "guts", name: "Guts", mp: 8, range: 0, aoe: 0, power: 0, element: "holy",
        kind: "healSelf", pct: 0.25, icon: "heal", desc: "Heal self 25% max HP." },
    ],
  },
  knight: {
    id: "knight", name: "Knight", tier: 1, cost: 100, prereq: ["squire"],
    base: { hp: 36, mp: 4, atk: 11, mag: 3, def: 10, res: 5, spd: 6 }, mov: 3,
    growth: { hp: 7, mp: 0, atk: 2, mag: 0, def: 2, res: 1, spd: 0 },
    color: "#5a6b82", colorDark: "#333f4f", accent: "#c9d6e3",
    visual: { headgear: "helm", weapon: "greatsword" },
    abilities: [
      { id: "powerSlash", name: "Power Slash", mp: 6, range: 1, aoe: 0, power: 1.6, element: "physical",
        kind: "damage", icon: "sword", desc: "Heavy melee damage." },
      { id: "shieldBash", name: "Shield Bash", mp: 8, range: 1, aoe: 0, power: 1.0, element: "physical",
        kind: "damage", status: "stun", icon: "shield", desc: "Damage + Stun 1 turn." },
      { id: "rampart", name: "Rampart", mp: 6, range: 0, aoe: 0, power: 0, element: "physical",
        kind: "buffSelf", status: "protect", icon: "protect", desc: "+Protect (-30% physical dmg), 3 turns." },
      { id: "sunder", name: "Sunder", mp: 8, range: 1, aoe: 0, power: 0.8, element: "physical",
        kind: "damage", status: "defDown", icon: "defDown", desc: "Damage + DEF -25%, 3 turns." },
    ],
  },
  archer: {
    id: "archer", name: "Archer", tier: 1, cost: 100, prereq: ["squire"],
    base: { hp: 26, mp: 6, atk: 9, mag: 3, def: 6, res: 4, spd: 9 }, mov: 4,
    growth: { hp: 4, mp: 1, atk: 1, mag: 0, def: 1, res: 0, spd: 1 },
    color: "#4f8a5c", colorDark: "#2e5136", accent: "#e8dba0",
    visual: { headgear: "hood", weapon: "bow" },
    abilities: [
      { id: "aimedShot", name: "Aimed Shot", mp: 4, range: 5, aoe: 0, power: 1.3, element: "physical",
        kind: "damage", icon: "arrow", desc: "Long-range single target." },
      { id: "multiShot", name: "Multi Shot", mp: 8, range: 4, aoe: 1, power: 0.9, element: "physical",
        kind: "damage", icon: "arrow", desc: "Hits target + adjacent tiles." },
      { id: "poisonArrow", name: "Poison Arrow", mp: 6, range: 4, aoe: 0, power: 0.8, element: "physical",
        kind: "damage", status: "poison", icon: "poison", desc: "Damage + Poison 3 turns." },
      { id: "retreatShot", name: "Retreat Shot", mp: 6, range: 4, aoe: 0, power: 1.0, element: "physical",
        kind: "damage", retreat: true, icon: "arrow", desc: "Damage, then step back 1 tile." },
    ],
  },
  blackmage: {
    id: "blackmage", name: "Black Mage", tier: 1, cost: 100, prereq: ["squire"],
    base: { hp: 20, mp: 20, atk: 4, mag: 12, def: 4, res: 6, spd: 7 }, mov: 3,
    growth: { hp: 3, mp: 4, atk: 0, mag: 2, def: 0, res: 1, spd: 0 },
    color: "#5b3f8f", colorDark: "#33224f", accent: "#c9a6ff",
    visual: { headgear: "conehat", weapon: "staffdark" },
    abilities: [
      { id: "fire", name: "Fire", mp: 8, range: 4, aoe: 1, power: 1.4, element: "fire",
        kind: "damage", icon: "fire", desc: "AoE burn." },
      { id: "blizzard", name: "Blizzard", mp: 8, range: 4, aoe: 1, power: 1.4, element: "ice",
        kind: "damage", icon: "ice", desc: "AoE freeze." },
      { id: "thunder", name: "Thunder", mp: 8, range: 4, aoe: 1, power: 1.4, element: "lightning",
        kind: "damage", icon: "lightning", desc: "AoE shock." },
      { id: "flare", name: "Flare", mp: 16, range: 3, aoe: 1, power: 2.2, element: "fire",
        kind: "damage", icon: "fire", desc: "High-tier nuke." },
    ],
  },
  whitemage: {
    id: "whitemage", name: "White Mage", tier: 1, cost: 100, prereq: ["squire"],
    base: { hp: 22, mp: 20, atk: 4, mag: 10, def: 5, res: 8, spd: 7 }, mov: 3,
    growth: { hp: 3, mp: 4, atk: 0, mag: 2, def: 1, res: 1, spd: 0 },
    color: "#e9e2c9", colorDark: "#b7ac86", accent: "#f0c674",
    visual: { headgear: "hoodpoint", weapon: "staffholy" },
    abilities: [
      { id: "cure", name: "Cure", mp: 6, range: 4, aoe: 0, power: 1.6, element: "holy",
        kind: "heal", icon: "heal", desc: "Heal one ally." },
      { id: "cura", name: "Cura", mp: 14, range: 4, aoe: 1, power: 1.2, element: "holy",
        kind: "heal", icon: "heal", desc: "Heal allies in AoE." },
      { id: "raise", name: "Raise", mp: 20, range: 3, aoe: 0, power: 0, element: "holy",
        kind: "revive", pct: 0.5, icon: "raise", desc: "Revive a KO'd ally at 50% HP." },
      { id: "protect", name: "Protect", mp: 8, range: 4, aoe: 1, power: 0, element: "holy",
        kind: "buffAllies", status: "protect", status2: "shell", icon: "protect", desc: "Allies: +Protect +Shell, 3 turns." },
    ],
  },
  monk: {
    id: "monk", name: "Monk", tier: 1, cost: 100, prereq: ["squire"],
    base: { hp: 32, mp: 6, atk: 12, mag: 5, def: 7, res: 6, spd: 9 }, mov: 4,
    growth: { hp: 6, mp: 1, atk: 2, mag: 0, def: 1, res: 1, spd: 1 },
    color: "#c17a45", colorDark: "#8a5027", accent: "#f0c674",
    visual: { headgear: "headband", weapon: "fists" },
    abilities: [
      { id: "comboPunch", name: "Combo Punch", mp: 0, range: 1, aoe: 0, power: 1.5, element: "physical",
        kind: "damage", icon: "fist", desc: "No weapon needed, high power." },
      { id: "chakra", name: "Chakra", mp: 6, range: 0, aoe: 0, power: 0, element: "holy",
        kind: "chakra", pct: 0.2, icon: "heal", desc: "Restore 20% HP and MP to self." },
      { id: "counterStance", name: "Counter Stance", mp: 4, range: 0, aoe: 0, power: 0, element: "physical",
        kind: "buffSelf", status: "counter", icon: "counter", desc: "Reflect the next hit taken." },
      { id: "reviveFist", name: "Revive Fist", mp: 0, range: 1, aoe: 0, power: 0, element: "physical",
        kind: "revive", pct: 0.3, icon: "raise", desc: "Revive adjacent KO'd ally at 30% HP." },
    ],
  },
  thief: {
    id: "thief", name: "Thief", tier: 1, cost: 100, prereq: ["squire"],
    base: { hp: 24, mp: 6, atk: 8, mag: 3, def: 5, res: 4, spd: 12 }, mov: 5,
    growth: { hp: 4, mp: 1, atk: 1, mag: 0, def: 0, res: 0, spd: 1 },
    color: "#3d3d47", colorDark: "#1f1f26", accent: "#a83240",
    visual: { headgear: "mask", weapon: "daggers" },
    abilities: [
      { id: "steal", name: "Steal", mp: 0, range: 1, aoe: 0, power: 0, element: "physical",
        kind: "steal", icon: "steal", desc: "50% chance: +5 JP to you, target loses 10% max HP." },
      { id: "sneakAttack", name: "Sneak Attack", mp: 0, range: 1, aoe: 0, power: 1.3, element: "physical",
        kind: "damage", sneakBonus: 0.5, icon: "dagger", desc: "+50% dmg if you moved this turn." },
      { id: "mug", name: "Mug", mp: 4, range: 1, aoe: 0, power: 1.0, element: "physical",
        kind: "damage", steal: true, icon: "dagger", desc: "Damage + Steal's JP effect." },
      { id: "hasteStep", name: "Haste Step", mp: 6, range: 0, aoe: 0, power: 0, element: "physical",
        kind: "buffSelf", status: "haste", icon: "haste", desc: "+Haste (+50% CT gain), 3 turns." },
    ],
  },
  timemage: {
    id: "timemage", name: "Time Mage", tier: 2, cost: 250, prereq: ["blackmage", "whitemage"],
    base: { hp: 20, mp: 18, atk: 4, mag: 10, def: 5, res: 7, spd: 8 }, mov: 3,
    growth: { hp: 3, mp: 3, atk: 0, mag: 2, def: 1, res: 1, spd: 0 },
    color: "#3f7590", colorDark: "#254a5c", accent: "#bfe6f0",
    visual: { headgear: "hoodstar", weapon: "staffclock" },
    abilities: [
      { id: "haste", name: "Haste", mp: 8, range: 4, aoe: 1, power: 0, element: "physical",
        kind: "buffAllies", status: "haste", icon: "haste", desc: "Allies: +Haste, 3 turns." },
      { id: "slow", name: "Slow", mp: 8, range: 4, aoe: 1, power: 0, element: "physical",
        kind: "debuffEnemies", status: "slow", icon: "slow", desc: "Enemies: -Slow, 3 turns." },
      { id: "stop", name: "Stop", mp: 16, range: 3, aoe: 0, power: 0, element: "physical",
        kind: "debuffEnemies", status: "stop", icon: "stop", desc: "Target loses all turns, 2 turns." },
      { id: "float", name: "Float", mp: 6, range: 4, aoe: 1, power: 0, element: "physical",
        kind: "buffAllies", status: "float", icon: "float", desc: "Allies: immune to Poison, 3 turns." },
    ],
  },
  dragoon: {
    id: "dragoon", name: "Dragoon", tier: 2, cost: 250, prereq: ["knight", "monk"],
    base: { hp: 34, mp: 6, atk: 12, mag: 4, def: 8, res: 5, spd: 8 }, mov: 4,
    growth: { hp: 6, mp: 0, atk: 2, mag: 0, def: 1, res: 1, spd: 0 },
    color: "#7a2f36", colorDark: "#4a1a1f", accent: "#e3c86b",
    visual: { headgear: "wingedhelm", weapon: "lance" },
    abilities: [
      { id: "jump", name: "Jump", mp: 10, range: 4, aoe: 0, power: 1.8, element: "physical",
        kind: "damage", icon: "lance", desc: "Leap to melee target, high damage." },
      { id: "lancet", name: "Lancet", mp: 6, range: 1, aoe: 0, power: 0.9, element: "physical",
        kind: "drain", icon: "lance", desc: "Damage dealt is also healed to you." },
      { id: "dragonDive", name: "Dragon Dive", mp: 14, range: 3, aoe: 1, power: 1.6, element: "physical",
        kind: "damage", icon: "lance", desc: "AoE around target." },
      { id: "brace", name: "Brace", mp: 4, range: 0, aoe: 0, power: 0, element: "physical",
        kind: "buffSelf", status: "brace", icon: "protect", desc: "+DEF/RES +25%, 3 turns." },
    ],
  },
};

const JOB_ORDER = ["squire", "knight", "archer", "blackmage", "whitemage", "monk", "thief", "timemage", "dragoon"];

const WEAPON_ATTACK = { id: "attack", name: "Attack", mp: 0, range: 1, aoe: 0, power: 1.0, element: "physical", kind: "damage", icon: "sword", desc: "Basic weapon attack." };

function jobStat(jobId, level, stat) {
  const job = JOBS[jobId];
  return Math.floor(job.base[stat] + job.growth[stat] * (level - 1));
}

// ---------------------------------------------------------------------------------------------
// Recruits — the player's 5-person squad.
// ---------------------------------------------------------------------------------------------

const RECRUITS = [
  { id: "r1", name: "Aldric", skin: "#e2b48c", hair: "#3b2a1e" },
  { id: "r2", name: "Brynn", skin: "#c98a5e", hair: "#1a1a1a" },
  { id: "r3", name: "Corin", skin: "#f0c9a0", hair: "#7a5a2e" },
  { id: "r4", name: "Dessa", skin: "#a8703f", hair: "#2a1a12" },
  { id: "r5", name: "Elowen", skin: "#e8d0b0", hair: "#c97b2e" },
];

// ---------------------------------------------------------------------------------------------
// Enemy templates — layer a multiplier + fixed AI tag + elemental affinities on a job's kit.
// ---------------------------------------------------------------------------------------------

const ENEMY_TEMPLATES = {
  bandit: { name: "Bandit", job: "squire", mult: 1.15, ai: "aggressive", weakTo: [], resist: [], color: "#8a5a3a" },
  raiderArcher: { name: "Raider Archer", job: "archer", mult: 1.1, ai: "ranged", weakTo: [], resist: [], color: "#5a7a3a" },
  cultist: { name: "Cultist", job: "blackmage", mult: 1.1, ai: "caster", weakTo: ["holy"], resist: ["fire"], color: "#4a2a6a" },
  cultPriest: { name: "Cult Priest", job: "whitemage", mult: 1.1, ai: "support", weakTo: ["holy"], resist: [], color: "#5a2a3a" },
  warlord: { name: "Warlord", job: "dragoon", mult: 1.3, ai: "aggressive", weakTo: [], resist: ["physical"], color: "#3a1a1a" },
  dreadLord: { name: "Dread Lord", job: "knight", mult: 1.6, ai: "aggressive", weakTo: [], resist: ["ice"], color: "#1a0a1a", extraAbility: "flare" },
};

// ---------------------------------------------------------------------------------------------
// Battles — 6-battle linear campaign. Terrain grid codes: . plain, r rough, w water, # wall.
// ---------------------------------------------------------------------------------------------

const BATTLES = [
  {
    id: "b1", name: "Border Skirmish", width: 8, height: 6, level: 1,
    terrain: [
      "........",
      "..r.....",
      "........",
      "........",
      ".....r..",
      "........",
    ],
    playerSpawns: [[0, 2], [0, 3], [1, 1], [1, 4], [0, 1]],
    enemies: [
      { template: "bandit", pos: [6, 1] },
      { template: "bandit", pos: [6, 3] },
      { template: "bandit", pos: [7, 4] },
    ],
  },
  {
    id: "b2", name: "Ambush at the Ford", width: 9, height: 6, level: 2,
    terrain: [
      ".....w...",
      "..r..w...",
      ".....w...",
      "........w",
      "..r..w...",
      ".....w...",
    ],
    playerSpawns: [[0, 1], [0, 2], [0, 3], [1, 1], [1, 4]],
    enemies: [
      { template: "bandit", pos: [7, 1] },
      { template: "bandit", pos: [7, 3] },
      { template: "raiderArcher", pos: [8, 2] },
      { template: "raiderArcher", pos: [8, 4] },
    ],
  },
  {
    id: "b3", name: "The Ruined Chapel", width: 9, height: 7, level: 3,
    terrain: [
      "..#...#..",
      ".........",
      "....r....",
      ".#.....#.",
      "....r....",
      ".........",
      "..#...#..",
    ],
    playerSpawns: [[0, 2], [0, 3], [0, 4], [1, 2], [1, 4]],
    enemies: [
      { template: "bandit", pos: [7, 2] },
      { template: "bandit", pos: [7, 4] },
      { template: "raiderArcher", pos: [8, 3] },
      { template: "cultist", pos: [6, 3] },
    ],
  },
  {
    id: "b4", name: "Riverside Stand", width: 10, height: 7, level: 4,
    terrain: [
      "....w.....",
      "....w..r..",
      "....w.....",
      "....w.....",
      "....w..r..",
      "....w.....",
      "....w.....",
    ],
    playerSpawns: [[0, 2], [0, 3], [0, 4], [1, 1], [1, 5]],
    enemies: [
      { template: "bandit", pos: [8, 2] },
      { template: "bandit", pos: [8, 4] },
      { template: "raiderArcher", pos: [9, 1] },
      { template: "raiderArcher", pos: [9, 5] },
      { template: "cultPriest", pos: [7, 3] },
    ],
  },
  {
    id: "b5", name: "The Warlord's Camp", width: 10, height: 8, level: 5,
    terrain: [
      "..........",
      "..r....r..",
      "..........",
      "....##....",
      "....##....",
      "..........",
      "..r....r..",
      "..........",
    ],
    playerSpawns: [[0, 2], [0, 3], [0, 4], [0, 5], [1, 3]],
    enemies: [
      { template: "warlord", pos: [8, 3] },
      { template: "bandit", pos: [8, 1] },
      { template: "bandit", pos: [8, 6] },
      { template: "raiderArcher", pos: [9, 2] },
      { template: "cultPriest", pos: [9, 5] },
    ],
  },
  {
    id: "b6", name: "The Dark Spire", width: 10, height: 8, level: 6,
    terrain: [
      "..#....#..",
      "..........",
      "....r.r...",
      "..........",
      "..........",
      "....r.r...",
      "..........",
      "..#....#..",
    ],
    playerSpawns: [[0, 2], [0, 3], [0, 4], [0, 5], [1, 3]],
    enemies: [
      { template: "dreadLord", pos: [8, 3], name: "Dread Lord Malchezar" },
      { template: "cultist", pos: [7, 1] },
      { template: "cultist", pos: [7, 6] },
      { template: "bandit", pos: [8, 1] },
      { template: "bandit", pos: [8, 6] },
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// SVG art system — shared <defs> (gradients/filters), unit sprite builder, ability icons.
// ---------------------------------------------------------------------------------------------

const SVG_DEFS = `
<linearGradient id="g-skin" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#f3cda3"/><stop offset="100%" stop-color="#d9a973"/>
</linearGradient>
<linearGradient id="g-metal" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#dfe7ee"/><stop offset="55%" stop-color="#9fb0c0"/><stop offset="100%" stop-color="#5c6c7c"/>
</linearGradient>
<linearGradient id="g-wood" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#c99a5f"/><stop offset="100%" stop-color="#8a6236"/>
</linearGradient>
<linearGradient id="g-gold" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#ffe9a8"/><stop offset="100%" stop-color="#cf9d3f"/>
</linearGradient>
<radialGradient id="g-glow-fire" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="#ffdd88"/><stop offset="100%" stop-color="#ff5a2e" stop-opacity="0"/>
</radialGradient>
<radialGradient id="g-glow-ice" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="#dffbff"/><stop offset="100%" stop-color="#3fb8ff" stop-opacity="0"/>
</radialGradient>
<radialGradient id="g-glow-holy" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="#fffce0"/><stop offset="100%" stop-color="#f0c674" stop-opacity="0"/>
</radialGradient>
<filter id="f-soft" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur stdDeviation="1.1"/>
</filter>
`;

// One gradient per job, hoisted into the single global <defs> at startup (see script.js) so
// every unit sprite can reference url(#g-<jobId>) without declaring duplicate SVG ids.
function allJobGradients() {
  return JOB_ORDER.map((id) => {
    const j = JOBS[id];
    return `<linearGradient id="g-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${j.color}"/><stop offset="100%" stop-color="${j.colorDark}"/>
    </linearGradient>`;
  }).join("");
}

// Headgear snippets, drawn around head circle centered at (50,30) r=13.
const HEADGEAR = {
  cap: (a) => `<path d="M37,24 Q50,10 63,24 L61,26 Q50,17 39,26 Z" fill="${a}"/><circle cx="50" cy="16" r="3" fill="${a}"/>`,
  helm: () => `<path d="M35,26 Q50,8 65,26 L65,32 Q50,24 35,32 Z" fill="url(#g-metal)" stroke="#2a3644" stroke-width="1.2"/>
    <rect x="47" y="24" width="6" height="14" fill="#2a3644"/>
    <path d="M32,20 Q50,4 68,20" fill="none" stroke="url(#g-gold)" stroke-width="2.5"/>`,
  hood: (a) => `<path d="M34,28 Q50,6 66,28 Q66,20 50,16 Q34,20 34,28 Z" fill="${a}"/>
    <path d="M36,27 Q50,12 64,27 Q64,32 50,36 Q36,32 36,27 Z" fill="#1c2430" opacity=".55"/>`,
  conehat: (a) => `<path d="M50,2 L68,30 Q50,22 32,30 Z" fill="${a}" stroke="#1c1330" stroke-width="1"/>
    <ellipse cx="50" cy="30" rx="19" ry="4" fill="${a}"/>
    <circle cx="45" cy="27" r="1.6" fill="#ffe9a8"/><circle cx="55" cy="27" r="1.6" fill="#ffe9a8"/>`,
  hoodpoint: (a) => `<path d="M50,3 L65,29 Q50,20 35,29 Z" fill="${a}" stroke="#b7ac86" stroke-width="1"/>
    <ellipse cx="50" cy="29" rx="17" ry="4" fill="${a}"/>`,
  headband: (a) => `<rect x="35" y="21" width="30" height="5" rx="2.5" fill="${a}"/><circle cx="65" cy="23.5" r="2" fill="${a}"/>`,
  mask: (a) => `<path d="M34,26 Q50,10 66,26 Q66,34 50,36 Q34,34 34,26 Z" fill="${a}"/>
    <rect x="38" y="30" width="24" height="7" rx="3" fill="#15151a"/>`,
  hoodstar: (a) => `<path d="M34,28 Q50,6 66,28 Q66,20 50,16 Q34,20 34,28 Z" fill="${a}"/>
    <g fill="#bfe6f0"><circle cx="44" cy="20" r="1.3"/><circle cx="56" cy="18" r="1"/><circle cx="50" cy="24" r="1.1"/></g>`,
  wingedhelm: () => `<path d="M35,26 Q50,10 65,26 L65,32 Q50,25 35,32 Z" fill="url(#g-metal)" stroke="#3a1a1f" stroke-width="1.2"/>
    <path d="M33,22 Q20,14 16,22 Q26,24 33,28 Z" fill="url(#g-gold)"/>
    <path d="M67,22 Q80,14 84,22 Q74,24 67,28 Z" fill="url(#g-gold)"/>
    <rect x="47" y="24" width="6" height="12" fill="#3a1a1f"/>`,
};

// Weapon snippets, drawn in the unit's right hand around (74,62).
const WEAPONS = {
  sword: () => `<rect x="71" y="40" width="5" height="30" rx="1.5" fill="url(#g-metal)" transform="rotate(18 73.5 55)"/>
    <rect x="68" y="66" width="11" height="4" rx="1" fill="url(#g-gold)" transform="rotate(18 73.5 68)"/>`,
  greatsword: () => `<rect x="70" y="20" width="7" height="52" rx="2" fill="url(#g-metal)" stroke="#2a3644" stroke-width=".8" transform="rotate(10 73.5 46)"/>
    <rect x="65" y="66" width="17" height="5" rx="1.5" fill="url(#g-gold)" transform="rotate(10 73.5 68)"/>`,
  bow: () => `<path d="M78,28 Q94,58 78,88" fill="none" stroke="url(#g-wood)" stroke-width="3.5"/>
    <line x1="78" y1="28" x2="78" y2="88" stroke="#e8dba0" stroke-width="1.2"/>`,
  staffdark: () => `<rect x="72" y="18" width="4.5" height="56" rx="2" fill="url(#g-wood)" transform="rotate(6 74 46)"/>
    <circle cx="75" cy="20" r="7" fill="#3c2861" stroke="#c9a6ff" stroke-width="1.4"/>`,
  staffholy: () => `<rect x="72" y="18" width="4.5" height="56" rx="2" fill="url(#g-wood)" transform="rotate(-6 74 46)"/>
    <path d="M72,16 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 z" fill="url(#g-gold)"/>`,
  fists: (a) => `<circle cx="76" cy="62" r="7" fill="url(#g-skin)" stroke="${a}" stroke-width="2"/>`,
  daggers: () => `<rect x="72" y="44" width="3.5" height="20" rx="1.2" fill="url(#g-metal)" transform="rotate(25 74 54)"/>
    <rect x="24" y="44" width="3.5" height="20" rx="1.2" fill="url(#g-metal)" transform="rotate(-25 26 54)"/>`,
  staffclock: () => `<rect x="72" y="18" width="4.5" height="56" rx="2" fill="url(#g-wood)" transform="rotate(6 74 46)"/>
    <circle cx="75" cy="20" r="7.5" fill="#254a5c" stroke="#bfe6f0" stroke-width="1.4"/>
    <line x1="75" y1="20" x2="75" y2="15.5" stroke="#bfe6f0" stroke-width="1.2"/>
    <line x1="75" y1="20" x2="78" y2="20" stroke="#bfe6f0" stroke-width="1.2"/>`,
  lance: () => `<rect x="72" y="4" width="4.5" height="80" rx="2" fill="url(#g-wood)" transform="rotate(14 74 44)"/>
    <path d="M72,2 L78,2 L83,14 L67,14 Z" fill="url(#g-metal)" transform="rotate(14 74 44)"/>`,
};

function shieldSnippet() {
  return `<path d="M24,48 Q24,66 34,74 Q44,66 44,48 Q34,44 24,48 Z" fill="url(#g-metal)" stroke="#2a3644" stroke-width="1"/>
    <path d="M29,50 Q29,64 34,69 Q39,64 39,50 Q34,47 29,50 Z" fill="url(#g-gold)" opacity=".7"/>`;
}

// Builds a full unit sprite: viewBox 0 0 100 130, standing figure.
function buildUnitSvg(jobId, opts) {
  opts = opts || {};
  const job = JOBS[jobId];
  const v = job.visual;
  const skin = opts.skin || "url(#g-skin)";
  const cloth = job.color;
  const clothDark = job.colorDark;
  const accent = job.accent;
  const team = opts.team === "enemy" ? "#ff6b6b" : "#4cc3ff";
  const flipArm = v.weapon === "bow" || v.weapon === "daggers";
  const clothFill = `url(#g-${jobId})`;
  return `<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" class="unit-svg">
    <ellipse cx="50" cy="122" rx="27" ry="6" fill="rgba(0,0,0,.45)"/>
    <ellipse cx="50" cy="120" rx="30" ry="7.5" fill="none" stroke="${team}" stroke-width="2.5" opacity=".85"/>
    <!-- legs -->
    <path d="M40,86 L37,116 Q37,120 42,120 L46,120 L48,88 Z" fill="${clothDark}"/>
    <path d="M60,86 L63,116 Q63,120 58,120 L54,120 L52,88 Z" fill="${clothDark}"/>
    <!-- back arm -->
    ${!flipArm ? `<path d="M35,50 Q24,58 26,72 L32,74 Q32,60 40,54 Z" fill="${clothFill}"/>` : ""}
    <!-- torso -->
    <path d="M33,50 Q50,40 67,50 L65,90 Q50,96 35,90 Z" fill="${clothFill}" stroke="${clothDark}" stroke-width="1.2"/>
    <path d="M42,52 L50,58 L58,52 L58,60 L50,66 L42,60 Z" fill="${accent}" opacity=".9"/>
    <!-- head -->
    <circle cx="50" cy="30" r="13" fill="${skin}"/>
    ${v.headgear !== "conehat" && v.headgear !== "mask" ? `<circle cx="46" cy="30" r="1.5" fill="#22262e"/><circle cx="54" cy="30" r="1.5" fill="#22262e"/>` : ""}
    <!-- front arm + weapon -->
    <path d="M65,50 Q76,56 76,68 L70,70 Q68,58 62,54 Z" fill="${clothFill}"/>
    ${v.weapon === "fists" ? WEAPONS.fists(accent) : (WEAPONS[v.weapon] ? WEAPONS[v.weapon]() : "")}
    ${job.visual.shield ? shieldSnippet() : ""}
    <!-- headgear on top -->
    ${HEADGEAR[v.headgear] ? HEADGEAR[v.headgear](accent) : ""}
  </svg>`;
}

// Small 28x28 ability/status icons, referenced by key.
const ICONS = {
  sword: `<path d="M6,22 L18,10" stroke="#cfd8e0" stroke-width="3" stroke-linecap="round"/><path d="M18,10 L22,6 L24,8 L20,12 Z" fill="#e8eef4"/><path d="M5,20 L9,24" stroke="#cf9d3f" stroke-width="3" stroke-linecap="round"/>`,
  shield: `<path d="M14,4 L23,8 Q23,19 14,25 Q5,19 5,8 Z" fill="#9fb0c0" stroke="#5c6c7c" stroke-width="1.4"/>`,
  stone: `<circle cx="14" cy="15" r="7" fill="#8a8a8a"/><circle cx="12" cy="12" r="1.6" fill="#bdbdbd"/>`,
  heal: `<path d="M14,5 L14,23 M5,14 L23,14" stroke="#7ec98f" stroke-width="4" stroke-linecap="round"/>`,
  raise: `<circle cx="14" cy="14" r="9" fill="none" stroke="#f0c674" stroke-width="2.4"/><path d="M14,8 L14,20 M9,14 L19,14" stroke="#f0c674" stroke-width="2"/>`,
  fire: `<path d="M14,3 Q20,12 15,16 Q18,17 18,21 Q18,26 14,26 Q10,26 10,21 Q10,18 12,16 Q8,13 14,3 Z" fill="#ff7a3d"/>`,
  ice: `<path d="M14,2 V26 M4,8 L24,20 M24,8 L4,20" stroke="#8fdcff" stroke-width="2.4" stroke-linecap="round"/>`,
  lightning: `<path d="M16,2 L7,16 L13,16 L11,26 L22,12 L15,12 Z" fill="#ffe25a"/>`,
  poison: `<circle cx="14" cy="14" r="10" fill="#8a5fc9" opacity=".85"/><circle cx="14" cy="14" r="4" fill="#d9c6ff"/>`,
  stun: `<path d="M16,2 L7,16 L13,16 L11,26 L22,12 L15,12 Z" fill="#f0d030"/>`,
  haste: `<path d="M6,14 L20,14 M15,8 L21,14 L15,20" stroke="#8fe0ff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  slow: `<path d="M22,14 L8,14 M13,8 L7,14 L13,20" stroke="#8a8fb0" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  stop: `<circle cx="14" cy="14" r="10" fill="none" stroke="#c9c9c9" stroke-width="2.6"/><line x1="7" y1="7" x2="21" y2="21" stroke="#c9c9c9" stroke-width="2.6"/>`,
  protect: `<path d="M14,3 L23,7 Q23,18 14,24 Q5,18 5,7 Z" fill="none" stroke="#7ec9ff" stroke-width="2.4"/>`,
  shell: `<path d="M6,17 Q6,7 14,5 Q22,7 22,17 Q14,21 6,17 Z" fill="#d9b56a" opacity=".85"/>`,
  defDown: `<path d="M14,3 L23,7 Q23,18 14,24 Q5,18 5,7 Z" fill="none" stroke="#e0555e" stroke-width="2.4"/><line x1="8" y1="21" x2="20" y2="7" stroke="#e0555e" stroke-width="2"/>`,
  counter: `<path d="M6,14 A8,8 0 1 1 10,20" fill="none" stroke="#f0c674" stroke-width="2.6"/><path d="M10,15 L10,21 L4,21" fill="none" stroke="#f0c674" stroke-width="2.6"/>`,
  float: `<ellipse cx="14" cy="16" rx="10" ry="4" fill="none" stroke="#bfe6f0" stroke-width="2"/><path d="M14,3 L14,10" stroke="#bfe6f0" stroke-width="2"/>`,
  arrow: `<path d="M4,14 L22,14 M16,8 L22,14 L16,20" stroke="#e8dba0" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  dagger: `<path d="M6,22 L18,10 L22,6 L24,8 L20,12 L8,24 Z" fill="#cfd8e0"/>`,
  fist: `<circle cx="14" cy="14" r="8" fill="#d9a973" stroke="#8a5027" stroke-width="1.4"/>`,
  steal: `<path d="M6,20 L18,8 M18,8 L18,14 M18,8 L12,8" stroke="#a83240" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ELEMENTS, STATUS_DEFS, JOBS, JOB_ORDER, WEAPON_ATTACK, jobStat, RECRUITS, ENEMY_TEMPLATES, BATTLES, SVG_DEFS, allJobGradients, buildUnitSvg, ICONS };
}
