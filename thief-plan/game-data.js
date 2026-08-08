// Thief's Plotting Pad — static game data: the museum grid layout and fixed counts.
// Loaded before script.js. See docs/requirements.md §3-4 for the exact spec this implements.
"use strict";

const GameData = {
  GRID_ROWS: 11,
  GRID_COLS: 12,

  // Main rooms — paintings may only be placed on these. Each is an axis-aligned rectangle
  // [rowStart, rowEnd] x [colStart, colEnd], inclusive. The physical pad doesn't color-code or
  // label rooms on the grid itself (it's plain graph paper) — names here are only for the move
  // log, borrowed from the story text ("named the rooms after us, his dearest friends").
  //
  // Layout (see docs/requirements.md §3): a 4-wide x 5-tall middle room with a corridor running
  // all the way around it, connecting up to a 2x6 room on the north, sideways to two 3x3 rooms on
  // the west (with a corridor between them), sideways to a stacked 3x2 + 3x4 room on the east
  // (where the entrance is), and down to two 2x2 rooms on the south flanking a small walkable
  // connector — each south room has exactly one connected corner and no windows of its own.
  ROOMS: [
    { id: "mustard", name: "Mustard Room", rows: [0, 1], cols: [3, 8] }, // North, 2x6
    { id: "scarlet", name: "Scarlet Room", rows: [2, 4], cols: [0, 2] }, // West upper, 3x3
    { id: "green", name: "Green Room", rows: [6, 8], cols: [0, 2] }, // West lower, 3x3
    { id: "plum", name: "Plum Room", rows: [2, 3], cols: [9, 11] }, // East upper, 3x2
    { id: "peacock", name: "Peacock Room", rows: [4, 7], cols: [9, 11] }, // East lower, 3x4
    { id: "white", name: "White Room", rows: [3, 7], cols: [4, 7] }, // Middle, 4 wide x 5 tall
    { id: "gray", name: "Small Gray Room", rows: [9, 10], cols: [7, 8] }, // South east — connects
    // only via its top-left corner, no windows on its own outer wall. The rules' "small 'empty'
    // gray room" a painting may optionally go in, distinct from the 6 main rooms above (each of
    // which needs at least one painting per the physical setup rules, though this app doesn't
    // enforce that minimum since the Thief is only *transcribing* a setup the Characters already
    // made).
  ],

  // The small gray Power room ("Security Command Center"), south west, 2x2, mirroring the Gray
  // Room — connects only via its top-right corner, no windows on its own outer wall. Cameras may
  // be placed here, paintings may not.
  POWER_ROOM: { id: "power", name: "Security Command Center", rows: [9, 10], cols: [3, 4] },

  // Corridor: a ring all the way around the middle (White) room, plus the hallway between the two
  // West rooms, plus the small walkable connector between the Power and Gray rooms.
  CORRIDOR_RECTS: [
    { rows: [2, 2], cols: [3, 8] }, // ring: north of White, also under Mustard Room
    { rows: [8, 8], cols: [4, 7] }, // ring: south of White
    { rows: [3, 7], cols: [3, 3] }, // ring: west of White
    { rows: [3, 7], cols: [8, 8] }, // ring: east of White
    { rows: [5, 5], cols: [0, 2] }, // the hallway between Scarlet and Green
    { rows: [9, 10], cols: [5, 6] }, // the walkable connector between Power and Gray
  ],

  // Fixed door/window points, matching the small square lock icons on the reference pad. The
  // south rooms (Power, Gray) have none of their own — their only connection is the single
  // corner each borders the corridor through.
  DOOR_POINTS: [
    { row: 0, col: 3 }, { row: 0, col: 8 }, // North, near its west/east corners
    { row: 2, col: 0 }, { row: 5, col: 0 }, { row: 8, col: 0 }, // West: Scarlet, hallway, Green
    { row: 2, col: 11 }, { row: 5, col: 11 }, { row: 7, col: 11 }, // East: Plum, Peacock (x2)
    { row: 10, col: 5 }, { row: 10, col: 6 }, // South, on the walkable connector
  ],

  PAINTING_COUNT: 9,
  CAMERA_COUNT: 6,
  MOTION_DETECTOR_USES: 2,
};

if (typeof module !== "undefined" && module.exports) module.exports = GameData;
