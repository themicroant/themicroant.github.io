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

  // Each piece type offers several abilities to choose from; a piece may install exactly one,
  // ever (no re-upgrading, no stacking). cost is in Upgrade Points. kind is "permanent" (usable
  // every eligible turn for the rest of the game) or "onetime" (fires once, then the piece keeps
  // its badge but the ability is gone). `id` is referenced by game/script.js and must stay unique
  // within a piece type — the mechanics for each id are implemented there, not here.
  UPGRADES: {
    p: [
      { id: "longbowman", name: "Longbowman", emoji: "🏹", cost: 1, kind: "permanent",
        description: "May capture an enemy piece two squares straight ahead (same file) without moving, if the square between is empty." },
      { id: "skirmisher", name: "Skirmisher", emoji: "🗡️", cost: 1, kind: "permanent",
        description: "May capture an enemy piece directly ahead (same file, one square) as well as diagonally." },
      { id: "rearguard", name: "Rearguard", emoji: "↩️", cost: 1, kind: "permanent",
        description: "May move one square straight backward onto an empty square (no capture)." },
    ],
    n: [
      { id: "cavalry", name: "Border Reiver Cavalry", emoji: "🐎", cost: 1, kind: "permanent",
        description: "Whenever this knight captures, it immediately gets one bonus knight move (may be a second capture) before the turn passes." },
      { id: "feint", name: "Feint", emoji: "🌀", cost: 1, kind: "permanent",
        description: "May also move or capture one square straight (N/E/S/W), like a single rook step." },
      { id: "deepstrike", name: "Deep Strike", emoji: "🎯", cost: 2, kind: "permanent",
        description: "May also move or capture in a wider L-shape: 1-and-3 or 3-and-1 squares away." },
    ],
    b: [
      { id: "blessing", name: "Cardinal's Blessing", emoji: "⛪", cost: 1, kind: "onetime",
        description: "Once per game, this bishop may move like a knight for a single move, in addition to its normal diagonal moves." },
      { id: "vigil", name: "Vigil", emoji: "🕯️", cost: 1, kind: "permanent",
        description: "May also move or capture one square straight (N/E/S/W), like a single rook step." },
      { id: "anchorite", name: "Anchorite's Leap", emoji: "🌒", cost: 2, kind: "permanent",
        description: "Along a diagonal, if exactly one piece stands between this bishop and a more distant enemy piece, the bishop may leap it and capture the distant piece." },
    ],
    r: [
      { id: "siege", name: "Siege Engine", emoji: "🏰", cost: 1, kind: "permanent",
        description: "Along a rank or file, if exactly one piece stands between this rook and a more distant enemy piece, the rook may leap it and capture the distant piece." },
      { id: "vanguard", name: "Vanguard", emoji: "🚩", cost: 1, kind: "permanent",
        description: "May also move or capture one square diagonally, like a single bishop step." },
      { id: "portcullis", name: "Portcullis", emoji: "⚙️", cost: 2, kind: "onetime",
        description: "Once per game, this rook may slide along its rank or file straight through any blocking pieces to land on any empty square beyond (no capture; blockers are unaffected)." },
    ],
    q: [
      { id: "kingmaker", name: "Kingmaker's Gambit", emoji: "👑", cost: 2, kind: "onetime",
        description: "Once per game, after this queen moves, it may immediately make one more legal queen move before the turn passes." },
      { id: "regicide", name: "Regicide's Reach", emoji: "🗡️", cost: 3, kind: "permanent",
        description: "May also move or capture like a knight, in addition to its normal moves." },
      { id: "diplomat", name: "Diplomat's Envoy", emoji: "🕊️", cost: 3, kind: "permanent",
        description: "Along any rank, file, or diagonal, if exactly one piece stands between this queen and a more distant enemy piece, the queen may leap it and capture the distant piece." },
    ],
    k: [
      { id: "royalguard", name: "Royal Guard", emoji: "🛡️", cost: 2, kind: "onetime",
        description: "Once per game, the king may move exactly two squares in any direction instead of a normal move, if every square crossed and the destination are unattacked and empty." },
      { id: "flankguard", name: "Flank Guard", emoji: "🏇", cost: 1, kind: "permanent",
        description: "May move exactly two squares in a straight line (not diagonal) instead of a normal move, if the square crossed and the destination are unattacked and empty." },
      { id: "nightmarch", name: "Night March", emoji: "🌙", cost: 2, kind: "onetime",
        description: "Once per game, the king may move exactly three squares in a straight line (not diagonal) instead of a normal move, if every square crossed and the destination are unattacked and empty." },
    ],
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
