// Thief's Plotting Pad — static game data: the museum grid layout and fixed counts.
// Loaded before script.js. See docs/requirements.md §3-4 for the exact spec this implements.
"use strict";

const GameData = {
  GRID_ROWS: 11,
  GRID_COLS: 11,

  // Main rooms — paintings may only be placed on these. Each is an axis-aligned rectangle
  // [rowStart, rowEnd] x [colStart, colEnd], inclusive.
  ROOMS: [
    { id: "mustard", name: "Mustard Room", emoji: "🟡", rows: [0, 2], cols: [4, 6] },
    { id: "scarlet", name: "Scarlet Room", emoji: "🔴", rows: [8, 10], cols: [4, 6] },
    { id: "green", name: "Green Room", emoji: "🟢", rows: [4, 6], cols: [0, 2] },
    { id: "white", name: "White Room", emoji: "⚪", rows: [4, 6], cols: [8, 10] },
    { id: "plum", name: "Plum Room", emoji: "🟣", rows: [3, 4], cols: [3, 4] },
    { id: "peacock", name: "Peacock Room", emoji: "🔵", rows: [6, 7], cols: [6, 7] },
  ],

  // The small gray Power room ("Security Command Center"). Cameras may be placed here (per the
  // rules cameras can go "wherever"), paintings may not.
  POWER_ROOM: { id: "power", name: "Security Command Center", emoji: "⚡", rows: [3, 4], cols: [6, 7] },

  // Corridor cells: the core's central cross, plus one extra nook. See requirements.md §3.
  CORRIDOR_RECTS: [
    { rows: [5, 5], cols: [3, 7] }, // core horizontal corridor
    { rows: [3, 7], cols: [5, 5] }, // core vertical corridor
    { rows: [6, 7], cols: [3, 4] }, // SW nook
  ],

  // Fixed door/window points. One is picked as the entrance at setup; all four remain choosable
  // when logging an escape. Each sits at the outer-wall midpoint of one arm.
  DOOR_POINTS: [
    { row: 0, col: 5, room: "mustard" },
    { row: 10, col: 5, room: "scarlet" },
    { row: 5, col: 0, room: "green" },
    { row: 5, col: 10, room: "white" },
  ],

  PAINTING_COUNT: 9,
  CAMERA_COUNT: 6,
  MOTION_DETECTOR_USES: 2,
};

if (typeof module !== "undefined" && module.exports) module.exports = GameData;
