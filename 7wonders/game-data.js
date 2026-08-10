// 7 Wonders — static game data (card types, resources, cards). Loaded before script.js.
// This is the file admin/index.html edits and re-exports — keep all content data here, keep
// logic in script.js. See docs/requirements.md §3 for the card data shape.
"use strict";

const GameData = {
  CARD_TYPES: {
    raw:          { label: "Raw Material",       color: "#c98a4b", colorDim: "#5a4230" },
    manufactured: { label: "Manufactured Good",   color: "#b9bec7", colorDim: "#454a52" },
    civilian:     { label: "Civilian Structure",  color: "#5b9bd5", colorDim: "#22384a" },
    scientific:   { label: "Scientific Structure",color: "#7ec98f", colorDim: "#22402c" },
    commercial:   { label: "Commercial Structure",color: "#f0c674", colorDim: "#4a3d1e" },
    military:     { label: "Military Structure",  color: "#e0555e", colorDim: "#4a2226" },
    guild:        { label: "Guild",               color: "#b489d6", colorDim: "#3a2a49" },
  },

  RESOURCES: {
    wood:    { label: "Wood",    emoji: "🪵" },
    clay:    { label: "Clay",    emoji: "🧱" },
    ore:     { label: "Ore",     emoji: "⛏️" },
    stone:   { label: "Stone",   emoji: "🪨" },
    glass:   { label: "Glass",   emoji: "🔷" },
    loom:    { label: "Loom",    emoji: "🧵" },
    papyrus: { label: "Papyrus", emoji: "📜" },
  },

  SCIENCE_SYMBOLS: {
    tablet:  { label: "Tablet",  emoji: "📚" },
    compass: { label: "Compass", emoji: "🧭" },
    gear:    { label: "Gear",    emoji: "⚙️" },
  },

  // Sample content only — NOT the complete Age I deck. The real game has ~24 Age I cards (count
  // varies by player count) with exact costs sourced from the physical box. This sample covers
  // all 7 card types so the hand/selection screen (docs/requirements.md §4) can be built and
  // tested; replace/extend via admin/index.html once the full card list is transcribed.
  CARDS: [
    {
      id: "lumber-yard", name: "Lumber Yard", emoji: "🪵", age: 1, type: "raw",
      cost: {}, produces: ["wood"], producesChoice: false,
      vp: 0, shields: 0, coinsOnPlay: 0, science: null,
      effect: "Produces 1 Wood.", chainFrom: [], chainTo: [],
    },
    {
      id: "ore-vein", name: "Ore Vein", emoji: "⛏️", age: 1, type: "raw",
      cost: {}, produces: ["ore"], producesChoice: false,
      vp: 0, shields: 0, coinsOnPlay: 0, science: null,
      effect: "Produces 1 Ore.", chainFrom: [], chainTo: [],
    },
    {
      id: "glassworks", name: "Glassworks", emoji: "🔷", age: 1, type: "manufactured",
      cost: {}, produces: ["glass"], producesChoice: false,
      vp: 0, shields: 0, coinsOnPlay: 0, science: null,
      effect: "Produces 1 Glass.", chainFrom: [], chainTo: ["stained-glass-works"],
    },
    {
      id: "baths", name: "Baths", emoji: "🛁", age: 1, type: "civilian",
      cost: { stone: 1 }, produces: [], producesChoice: false,
      vp: 3, shields: 0, coinsOnPlay: 0, science: null,
      effect: "Worth 3 VP.", chainFrom: [], chainTo: ["aqueduct"],
    },
    {
      id: "scriptorium", name: "Scriptorium", emoji: "📚", age: 1, type: "scientific",
      cost: { papyrus: 1 }, produces: [], producesChoice: false,
      vp: 0, shields: 0, coinsOnPlay: 0, science: "tablet",
      effect: "Grants a Tablet science symbol.", chainFrom: [], chainTo: ["courthouse"],
    },
    {
      id: "tavern", name: "Tavern", emoji: "🍺", age: 1, type: "commercial",
      cost: {}, produces: [], producesChoice: false,
      vp: 0, shields: 0, coinsOnPlay: 5, science: null,
      effect: "Gives 5 coins when built.", chainFrom: [], chainTo: [],
    },
    {
      id: "stockade", name: "Stockade", emoji: "🛡️", age: 1, type: "military",
      cost: { wood: 1 }, produces: [], producesChoice: false,
      vp: 0, shields: 1, coinsOnPlay: 0, science: null,
      effect: "Grants 1 Shield.", chainFrom: [], chainTo: [],
    },
  ],
};

if (typeof module !== "undefined" && module.exports) module.exports = GameData;
