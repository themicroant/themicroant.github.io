// Thief's Plotting Pad — static game data: the museum grid layout and fixed counts.
// Loaded before script.js. See docs/requirements.md §3-4 for the exact spec this implements.
"use strict";

const GameData = {
  GRID_ROWS: 13,
  GRID_COLS: 10,

  // Main rooms — paintings may only be placed on these. Each is an axis-aligned rectangle
  // [rowStart, rowEnd] x [colStart, colEnd], inclusive. The physical pad doesn't color-code or
  // label rooms on the grid itself (it's plain graph paper) — names here are only for the move
  // log, borrowed from the story text ("named the rooms after us, his dearest friends").
  //
  // Layout (see docs/requirements.md §3): a 4-wide x 5-tall middle room, connected by a corridor
  // to a 2x6 room on the north and two 2x2 rooms on the south, flanked by two 3x3 rooms on the
  // west (with a corridor between them) and a stacked 3x2 + 3x4 room on the east (where the
  // entrance is, no corridor between those two).
  ROOMS: [
    { id: "mustard", name: "Mustard Room", rows: [0, 1], cols: [2, 7] }, // North, 2x6
    { id: "scarlet", name: "Scarlet Room", rows: [2, 4], cols: [0, 2] }, // West upper, 3x3
    { id: "green", name: "Green Room", rows: [6, 8], cols: [0, 2] }, // West lower, 3x3
    { id: "plum", name: "Plum Room", rows: [2, 3], cols: [7, 9] }, // East upper, 3x2
    { id: "peacock", name: "Peacock Room", rows: [4, 7], cols: [7, 9] }, // East lower, 3x4
    { id: "white", name: "White Room", rows: [3, 7], cols: [3, 6] }, // Middle, 4 wide x 5 tall
    { id: "gray", name: "Small Gray Room", rows: [11, 12], cols: [4, 5] }, // South lower, 2x2 —
    // the rules' "small 'empty' gray room" a painting may optionally go in, distinct from the 6
    // main rooms above (which each need at least one).
  ],

  // The small gray Power room ("Security Command Center"), south upper, 2x2. Cameras may be
  // placed here, paintings may not.
  POWER_ROOM: { id: "power", name: "Security Command Center", rows: [9, 10], cols: [4, 5] },

  // Corridor: links the middle room to the North and South rooms, and separates the two West
  // rooms from each other.
  CORRIDOR_RECTS: [
    { rows: [2, 2], cols: [3, 6] }, // links North down to the middle room
    { rows: [8, 8], cols: [3, 6] }, // links the middle room down to the Power/Gray rooms
    { rows: [5, 5], cols: [0, 2] }, // the hallway between the two West rooms
  ],

  // Fixed door/window points, matching the small square lock icons on the reference pad (11
  // total, matching the physical game's 11 locks): two near the North room's corners, three along
  // the West wall (one per room plus the hallway between them), three along the East wall (the
  // traditional entrance side), two along the South wall.
  DOOR_POINTS: [
    { row: 0, col: 2 }, { row: 0, col: 7 }, // North, near its west/east corners
    { row: 2, col: 0 }, { row: 5, col: 0 }, { row: 8, col: 0 }, // West: Scarlet, hallway, Green
    { row: 2, col: 9 }, { row: 5, col: 9 }, { row: 7, col: 9 }, // East: Plum, Peacock (x2)
    { row: 12, col: 4 }, { row: 12, col: 5 }, // South, Gray Room's outer wall
  ],

  PAINTING_COUNT: 9,
  CAMERA_COUNT: 6,
  MOTION_DETECTOR_USES: 2,
};

if (typeof module !== "undefined" && module.exports) module.exports = GameData;
