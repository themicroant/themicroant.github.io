/*
 * "Crystal Clash" — an original battle theme.
 * Style notes (not borrowed melodies): A minor, fast tempo, a pumping octave
 * bass with chromatic walk-ups like classic JRPG battle music, a diminished
 * run in the intro for Bach-toccata drama, and a section where one motif
 * climbs step by step, the way Grieg builds tension in "Mountain King".
 * Design notes: docs/song-notes.md
 */
RetroSongs.register({
  id: "crystal-clash",
  title: "Crystal Clash (Battle)",
  bpm: 152,
  arrangement: ["intro", "A", "A", "B", "C", "A", "B"],
  loopFrom: "A",
  sections: {
    intro: {
      lead:    "E6/16 C6/16 A5/16 F#5/16 D#5/16 C5/16 A4/16 F#4/16 E4/8 R/8 E4/8 R/8 | E4/16 F4/16 G#4/16 B4/16 D5/16 E5/16 G#5/16 B5/16 E6/2",
      harmony: "R/1 | R/1",
      bass:    "A2/8 A2/8 A2/8 A2/8 E2/8 R/8 E2/8 R/8 | [E2/16]x8 E2/8 D2/8 C2/8 B1/8",
      drums:   "K/8 R/8 K/8 R/8 S/8 R/8 S/8 R/8 | [S/16]x8 S/8 S/8 K/8 S/8",
    },

    // Main theme: Am – F – Dm – E
    A: {
      lead:    "A4/4 E5/4. D5/8 C5/8 B4/8 | C5/4 A4/8 C5/8 F5/4 E5/8 D5/8 | D5/8 E5/8 F5/4 A5/4. G5/8 | G#5/8 F5/8 E5/8 D5/8 B4/4 G#4/4",
      harmony: "[A4/16 C5/16 E5/16 C5/16]x4 | [F4/16 A4/16 C5/16 A4/16]x4 | [D4/16 F4/16 A4/16 F4/16]x4 | [E4/16 G#4/16 B4/16 D5/16]x4",
      bass:    "A2/8 A3/8 A2/8 A3/8 A2/8 A3/8 G2/8 G#2/8 | F2/8 F3/8 F2/8 F3/8 F2/8 F3/8 E2/8 D#2/8 | D2/8 D3/8 D2/8 D3/8 D2/8 D3/8 D2/8 D#2/8 | E2/8 E3/8 E2/8 E3/8 E2/8 E3/8 D3/8 B2/8",
      drums:   "[K/8 H/8 S/8 H/8 K/8 K/8 S/8 H/8]x4",
    },

    // Climbing motif: same shape, one step higher each bar
    B: {
      lead:    "A4/8 C5/8 E5/8 C5/8 D5/8 B4/8 E5/4 | B4/8 D5/8 F5/8 D5/8 E5/8 C5/8 F5/4 | C5/8 E5/8 G5/8 E5/8 F5/8 D5/8 G5/4 | [D#5/16 F#5/16 A5/16 C6/16]x2 B5/8 C6/8 E6/4",
      harmony: "[A4/16 C5/16 E5/16 C5/16]x4 | [B4/16 D5/16 F5/16 D5/16]x4 | [C5/16 E5/16 G5/16 E5/16]x4 | [D#5/16 F#5/16 A5/16 F#5/16]x2 [E5/16 G#5/16 B5/16 G#5/16]x2",
      bass:    "[A2/8 A3/8]x4 | [B2/8 B3/8]x4 | [C3/8 C4/8]x4 | [D#3/8 D#2/8]x2 E2/8 E3/8 E2/8 B2/8",
      drums:   "[K/8 H/8 S/8 H/8]x6 | [S/16]x8 K/8 S/8 K/8 S/8",
    },

    // Heroic bridge in half-time: F – G – Em – Am
    C: {
      lead:    "F5/2 E5/4 C5/4 | D5/2. G4/4 | G5/4. F5/8 E5/4 B4/4 | C5/4 B4/4 A4/4 G#4/4",
      harmony: "[F4/16 A4/16 C5/16 A4/16]x4 | [G4/16 B4/16 D5/16 B4/16]x4 | [E4/16 G4/16 B4/16 G4/16]x4 | [A4/16 C5/16 E5/16 C5/16]x2 [E4/16 G#4/16 B4/16 G#4/16]x2",
      bass:    "[F2/8 C3/8]x4 | [G2/8 D3/8]x4 | [E2/8 B2/8]x4 | [A2/8 E3/8]x2 E2/8 E3/8 E2/8 G#2/8",
      drums:   "[K/4 H/8 H/8 S/4 H/8 H/8]x3 | K/8 K/8 S/8 K/8 [S/16]x8",
    },
  },
});
