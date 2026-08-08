// Thief's Plotting Pad — static game data: the museum grid layout and fixed counts.
// Loaded before script.js. See docs/requirements.md §3-4 for the exact spec this implements.
"use strict";

const GameData = {
  // The grid has a 1-cell void margin all the way around the building, so door/window points can
  // sit outside each room as their own non-travelable square instead of overlaying a floor cell.
  GRID_ROWS: 13,
  GRID_COLS: 14,

  // Main rooms — paintings may only be placed on these. Each is an axis-aligned rectangle
  // [rowStart, rowEnd] x [colStart, colEnd], inclusive. `color` is a barely-visible paper tint
  // (see docs/requirements.md §9) — the physical pad doesn't color-code rooms, this is just a
  // faint aid. Names are for the move log, borrowed from the story text ("named the rooms after
  // us, his dearest friends").
  //
  // Layout (see docs/requirements.md §3): a 4-wide x 5-tall middle room with a corridor running
  // all the way around it, connecting up to a 2x6 room on the north, sideways to two 3x3 rooms on
  // the west (with a corridor between them) and a 3x2 + 3x4 room on the east (with a corridor
  // between them too, where the entrance is), and down to two 2x2 rooms on the south flanking a
  // small walkable connector.
  ROOMS: [
    { id: "mustard", name: "Mustard Room", rows: [1, 2], cols: [4, 9], color: "#f2ecd6" }, // North, 2x6
    { id: "scarlet", name: "Scarlet Room", rows: [3, 5], cols: [1, 3], color: "#f1e2df" }, // West upper, 3x3
    { id: "green", name: "Green Room", rows: [7, 9], cols: [1, 3], color: "#e5ebe0" }, // West lower, 3x3
    { id: "plum", name: "Plum Room", rows: [3, 4], cols: [10, 12], color: "#ece2ec" }, // East upper, 3x2
    { id: "peacock", name: "Peacock Room", rows: [6, 9], cols: [10, 12], color: "#dfe7ec" }, // East lower, 3x4
    { id: "white", name: "White Room", rows: [4, 8], cols: [5, 8], color: "#eee9dc" }, // Middle, 4 wide x 5 tall
    { id: "gray", name: "Small Gray Room", rows: [10, 11], cols: [4, 5], color: "#e7e6e1" }, // South
    // west, mirrors Power. The rules' "small 'empty' gray room" a painting may optionally go in,
    // distinct from the 6 main rooms above (each of which needs at least one painting per the
    // physical setup rules, though this app doesn't enforce that minimum since the Thief is only
    // *transcribing* a setup the Characters already made).
  ],

  // The small gray Power room ("Security Command Center"), south east, 2x2, mirroring the Gray
  // Room. Cameras may be placed here, paintings may not.
  POWER_ROOM: { id: "power", name: "Security Command Center", rows: [10, 11], cols: [8, 9], color: "#e9e3da" },

  // Corridor: a ring all the way around the middle (White) room — its south side spans the full
  // width above both south rooms — plus the hallway between the two West rooms, the hallway
  // between the two East rooms, and the small walkable connector between the Gray and Power rooms.
  CORRIDOR_RECTS: [
    { rows: [3, 3], cols: [4, 9] }, // ring: north of White, also under Mustard Room
    { rows: [9, 9], cols: [4, 9] }, // ring: south of White, spanning above both south rooms
    { rows: [4, 8], cols: [4, 4] }, // ring: west of White
    { rows: [4, 8], cols: [9, 9] }, // ring: east of White
    { rows: [6, 6], cols: [1, 3] }, // the hallway between Scarlet and Green
    { rows: [5, 5], cols: [10, 12] }, // the hallway between Plum and Peacock
    { rows: [10, 10], cols: [6, 7] }, // the walkable connector between Gray and Power
  ],

  // Fixed door/window points: each is a void cell just outside the room it serves, matching the
  // small square lock icons on the reference pad (rendered as a non-travelable marker, not a
  // floor tile). Most rooms have at least one — Gray and Power are the exception, with none of
  // their own (see the south group below). At setup the Thief picks exactly one as their entrance;
  // all remain choosable later when logging an escape.
  //
  // A door at an outer *corner* can end up touching two different rooms' cells at once (e.g. one
  // via its top neighbor, another via its side neighbor) — doorEntryCell() resolves that by
  // checking top/bottom/left/right in that fixed order, so whichever room it finds first wins,
  // silently mislabeling the door as the wrong room's. Every point below is placed so only ONE
  // room cell actually borders it — verify a new one the same way before adding it.
  DOOR_POINTS: [
    { row: 0, col: 5 }, { row: 0, col: 8 }, // North (Mustard), one square in from each corner
    { row: 4, col: 0 }, { row: 6, col: 0 }, { row: 8, col: 0 }, // West: Scarlet, hallway, Green
    { row: 10, col: 2 }, // Green Room, second door (south end of its west wall)
    { row: 2, col: 11 }, { row: 5, col: 13 }, { row: 8, col: 13 }, // East: Plum, hallway, Peacock
    { row: 11, col: 6 }, { row: 11, col: 7 }, // South, on the walkable connector — the only two
    // south doors; Gray and Power have no exterior door of their own (they still connect inward
    // via their OPENINGS below).
  ],

  // Every room connects to the corridor across its whole shared edge for movement purposes, but
  // that would draw as a wall-to-wall thick line — indistinguishable from a solid wall. Each of
  // these marks one cell's specific side as a visible doorway (thin line) into the corridor, so
  // every room shows at least one clear opening, matching the reference pad's convention of only
  // drawing a gap in the wall where there's an actual doorway.
  // Every opening faces toward the board's center (the White Room). Mustard Room gets two,
  // symmetric around its own center column with a gap between them (not touching each other).
  // The White Room's own openings are two cells wide, on both its north and south sides.
  OPENINGS: [
    { row: 2, col: 5, side: "bottom" }, // Mustard -> ring, west of center
    { row: 2, col: 8, side: "bottom" }, // Mustard -> ring, east of center
    { row: 4, col: 3, side: "right" }, // Scarlet -> ring (toward center)
    { row: 8, col: 3, side: "right" }, // Green -> ring (toward center)
    { row: 4, col: 10, side: "left" }, // Plum -> ring (toward center)
    { row: 7, col: 10, side: "left" }, // Peacock -> ring (toward center)
    { row: 4, col: 6, side: "top" }, // White -> ring, north (double wide)
    { row: 4, col: 7, side: "top" }, // White -> ring, north (double wide)
    { row: 8, col: 6, side: "bottom" }, // White -> ring, south (double wide)
    { row: 8, col: 7, side: "bottom" }, // White -> ring, south (double wide)
    { row: 7, col: 5, side: "left" }, // White -> ring, west
    { row: 6, col: 8, side: "right" }, // White -> ring, east
    { row: 10, col: 5, side: "top" }, // Gray -> ring (toward center)
    { row: 10, col: 8, side: "top" }, // Power -> ring (toward center)
  ],

  PAINTING_COUNT: 9,
  CAMERA_COUNT: 6,
  MOTION_DETECTOR_USES: 2,
};

if (typeof module !== "undefined" && module.exports) module.exports = GameData;
