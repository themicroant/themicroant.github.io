// Fire Tactics — static game data (terrain table, map layout, unit roster, the one battle).
// Loaded before script.js. This is the file admin/index.html edits and re-exports — keep all
// content data here, keep logic in script.js.
"use strict";

const GameData = {
  cols: 8,
  rows: 6,

  // Movement cost to enter, avoid bonus (subtracted from attacker hit%), def bonus (added to
  // defender DEF), and passability. See docs/requirements.md §3.
  terrainTypes: {
    P: { name: "Plain", icon: "plain", moveCost: 1, avoid: 0, def: 0, passable: true },
    F: { name: "Forest", icon: "forest", moveCost: 2, avoid: 20, def: 0, passable: true },
    M: { name: "Mountain", icon: "mountain", moveCost: 3, avoid: 10, def: 2, passable: true },
    W: { name: "Water", icon: "water", moveCost: Infinity, avoid: 0, def: 0, passable: false },
  },

  // row 0 = top, col 0 = left.
  map: [
    "PPFPPMPP",
    "PFPPPPFP",
    "PPPWPPPP",
    "PPPWPPPP",
    "PFPPPPFP",
    "PPMPPFPP",
  ],

  // The one pre-made battle: fixed roster, fixed starting positions. No customization, no
  // procedural generation, no meta-progression — see docs/requirements.md §2, §4.
  battle: {
    name: "Riverbank Skirmish",
    objective: "Defeat all four enemies.",
    units: [
      { id: "knight", name: "Knight", icon: "knight", team: "player", hp: 22, hpMax: 22, atk: 7, def: 6, spd: 5, mov: 4, rangeMin: 1, rangeMax: 1, crit: 5, magic: false, heal: null, x: 0, y: 1 },
      { id: "archer", name: "Archer", icon: "archer", team: "player", hp: 16, hpMax: 16, atk: 6, def: 3, spd: 6, mov: 4, rangeMin: 1, rangeMax: 2, crit: 15, magic: false, heal: null, x: 0, y: 2 },
      { id: "mage", name: "Mage", icon: "mage", team: "player", hp: 14, hpMax: 14, atk: 8, def: 2, spd: 7, mov: 4, rangeMin: 1, rangeMax: 2, crit: 0, magic: true, heal: null, x: 0, y: 3 },
      { id: "cleric", name: "Cleric", icon: "cleric", team: "player", hp: 16, hpMax: 16, atk: 0, def: 3, spd: 6, mov: 4, rangeMin: 1, rangeMax: 1, crit: 0, magic: false, heal: 8, x: 0, y: 4 },

      { id: "soldier", name: "Soldier", icon: "soldier", team: "enemy", hp: 20, hpMax: 20, atk: 6, def: 5, spd: 4, mov: 3, rangeMin: 1, rangeMax: 1, crit: 5, magic: false, heal: null, x: 7, y: 1 },
      { id: "brigand", name: "Brigand", icon: "brigand", team: "enemy", hp: 24, hpMax: 24, atk: 8, def: 3, spd: 3, mov: 4, rangeMin: 1, rangeMax: 1, crit: 5, magic: false, heal: null, x: 7, y: 2 },
      { id: "enemy_archer", name: "Enemy Archer", icon: "enemy_archer", team: "enemy", hp: 14, hpMax: 14, atk: 5, def: 2, spd: 5, mov: 3, rangeMin: 1, rangeMax: 2, crit: 15, magic: false, heal: null, x: 7, y: 3 },
      { id: "sorcerer", name: "Sorcerer", icon: "sorcerer", team: "enemy", hp: 12, hpMax: 12, atk: 7, def: 1, spd: 5, mov: 3, rangeMin: 1, rangeMax: 2, crit: 0, magic: true, heal: null, x: 7, y: 4 },
    ],
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = GameData;
