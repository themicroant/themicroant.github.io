// Thief's Plotting Pad — static game data: the museum grid layout and fixed counts.
// Loaded before script.js. See docs/requirements.md §3-4 for the exact spec this implements.
"use strict";

const GameData = {
  GRID_ROWS: 12,
  GRID_COLS: 11,

  // Main rooms — paintings may only be placed on these. Each is an axis-aligned rectangle
  // [rowStart, rowEnd] x [colStart, colEnd], inclusive. The physical pad doesn't color-code or
  // label rooms on the grid itself (it's plain graph paper) — names here are only for the move
  // log, borrowed from the story text ("named the rooms after us, his dearest friends").
  //
  // Layout (see docs/requirements.md §3): a 4x5 middle room connected to a 2x6 room on the north
  // and two 2x2 rooms on the south by a corridor, flanked by two stacked 3x3 rooms on the west and
  // a stacked 3x2 + 3x4 room on the east (where the entrance is).
  ROOMS: [
    { id: "mustard", name: "Mustard Room", rows: [0, 1], cols: [2, 7] }, // North, 2x6
    { id: "scarlet", name: "Scarlet Room", rows: [2, 4], cols: [0, 2] }, // West upper, 3x3
    { id: "green", name: "Green Room", rows: [5, 7], cols: [0, 2] }, // West lower, 3x3
    { id: "plum", name: "Plum Room", rows: [2, 3], cols: [8, 10] }, // East upper, 3x2
    { id: "peacock", name: "Peacock Room", rows: [4, 7], cols: [8, 10] }, // East lower, 3x4
    { id: "white", name: "White Room", rows: [3, 6], cols: [3, 7] }, // Middle, 4x5
    { id: "gray", name: "Small Gray Room", rows: [10, 11], cols: [4, 5] }, // South lower, 2x2 —
    // the rules' "small 'empty' gray room" a painting may optionally go in, distinct from the 6
    // main rooms above (which each need at least one).
  ],

  // The small gray Power room ("Security Command Center"), south upper, 2x2, next to where the
  // South rooms connect back up to the corridor. Cameras may be placed here, paintings may not.
  POWER_ROOM: { id: "power", name: "Security Command Center", rows: [8, 9], cols: [4, 5] },

  // Corridor: the hallway connecting the middle room to the North and South rooms.
  CORRIDOR_RECTS: [
    { rows: [2, 2], cols: [3, 7] }, // links North to the middle room
    { rows: [7, 7], cols: [3, 7] }, // links the middle room down to the Power/Gray rooms
  ],

  // Fixed door/window points: every outer-wall cell along each room's far edge, echoing the
  // reference pad's many small square lock icons. One is picked as the entrance at setup; all
  // remain choosable when logging an escape. The entrance is traditionally on the east wall.
  DOOR_POINTS: [
    ...[2, 3, 4, 5, 6, 7].map((col) => ({ row: 0, col })), // North outer wall
    ...[2, 3, 4, 5, 6, 7].map((row) => ({ row, col: 0 })), // West outer wall
    ...[2, 3, 4, 5, 6, 7].map((row) => ({ row, col: 10 })), // East outer wall (entrance side)
    ...[4, 5].map((col) => ({ row: 11, col })), // South outer wall
  ],

  PAINTING_COUNT: 9,
  CAMERA_COUNT: 6,
  MOTION_DETECTOR_USES: 2,
};

if (typeof module !== "undefined" && module.exports) module.exports = GameData;
