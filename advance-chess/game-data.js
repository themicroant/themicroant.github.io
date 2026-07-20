// Advance Chess: Wars of the Roses — static game data (phases, upgrades, flavor text).
// Loaded before script.js. This is the file admin/index.html edits and re-exports — keep all
// content data here, keep logic in script.js.
"use strict";

const GameData = {
  PHASES: {
    phase2StartPly: 10,
    phase3StartPly: 20,
    reinforcementInterval: 8, // extra UP tick every N plies after phase 3 begins
    banners: {
      phase2: {
        title: "⚔️ 1455 — The Wars of the Roses Begin ⚔️",
        subtitle: "The houses of York and Lancaster take up arms.",
      },
      phase3: {
        title: "🏹 1461 — Towton: The Rules of War Change 🏹",
        subtitle: "Commanders may now upgrade their forces.",
      },
    },
  },

  HOUSES: {
    w: { name: "House York", rose: "🌹", roseColor: "#f2f2f2" },
    b: { name: "House Lancaster", rose: "🌹", roseColor: "#c0293b" },
  },

  // One upgrade per piece type. cost is in Upgrade Points. kind is "permanent" or "onetime".
  UPGRADES: {
    p: { name: "Longbowman", emoji: "🏹", cost: 1, kind: "permanent",
      description: "May capture an enemy piece two squares straight ahead (same file) without moving, if the square between is empty." },
    n: { name: "Border Reiver Cavalry", emoji: "🐎", cost: 1, kind: "permanent",
      description: "After this knight captures, it immediately gets one bonus knight move (may be a second capture) before the turn passes." },
    b: { name: "Cardinal's Blessing", emoji: "⛪", cost: 1, kind: "onetime",
      description: "Once per game, this bishop may move like a knight for a single move, in addition to its normal diagonal moves." },
    r: { name: "Siege Engine", emoji: "🏰", cost: 1, kind: "permanent",
      description: "If exactly one piece stands between this rook and a more distant enemy piece on the same rank/file, the rook may leap it and capture the distant piece." },
    q: { name: "Kingmaker's Gambit", emoji: "👑", cost: 2, kind: "onetime",
      description: "Once per game, after this queen moves, it may immediately make one more legal queen move before the turn passes." },
    k: { name: "Royal Guard", emoji: "🛡️", cost: 2, kind: "onetime",
      description: "Once per game, the king may move exactly two squares in any direction instead of a normal move, if every square crossed and the destination are unattacked and empty." },
  },

  FLAVOR_QUOTES: {
    phase2: [
      "The Kingmaker watches from the ridge.",
      "A white rose is pinned to a doublet.",
      "Word reaches the camp: the Duke of York has raised his banner.",
      "Somewhere south, Margaret of Anjou rallies her lords.",
      "The road to St Albans is thick with soldiers.",
      "A herald reads the muster roll by torchlight.",
      "Retainers swear their oaths beneath the rose.",
      "Rumor says Warwick has changed sides again.",
    ],
    phase3: [
      "Longbowmen take the ridge at Towton.",
      "Snow blows sideways across the battle line.",
      "A commander is unhorsed and dragged from the field.",
      "The Kingmaker commits his reserve.",
      "Banners fall and are raised again by other hands.",
      "A rider gallops for reinforcements.",
      "The line bends but does not break — yet.",
      "Somewhere, a crown changes hands quietly.",
    ],
  },

  GAME_OVER_FLAVOR: {
    w: "House York claims the crown — 1485, Bosworth Field.",
    b: "House Lancaster claims the crown — 1485, Bosworth Field.",
    draw: "The field is abandoned. Neither rose flies over the crown tonight.",
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = GameData;
