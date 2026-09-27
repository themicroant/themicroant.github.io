/*
 * "Neon Onslaught" — an original battle theme, first 20-bar arrangement.
 * Style notes (not borrowed melodies): heroic arcade fighting-game drive,
 * ominous JRPG battle tension, syncopated alt-metal riffing and melodic-metal
 * chromatic movement. E minor, 166 BPM.
 *
 * Built around the revised singable hook ("B B — B -> E — D B"):
 *   riff    the instrumental riff alone
 *   hook    the hook over light backing; the guitar answers in its gaps
 *   hook2   the hook again with heavier backing, only the ending changes
 *           (a chromatic climb that launches the battle section)
 *   battle  Em – F (Phrygian bII) stabs, motif climbing each bar
 *   climax  the hook an octave up — the first time B5/E6 are used
 * Design notes and checklist: docs/song-notes.md
 */
RetroSongs.register({
  id: "neon-onslaught",
  title: "Neon Onslaught (Battle, draft)",
  bpm: 166,
  arrangement: ["riff", "hook", "hook2", "battle", "climax"],
  loopFrom: "riff",
  instruments: {
    guitar: { wave: "sawtooth", volume: 0.05 },
  },
  sections: {
    riff: {
      guitar: "E3/8 E3/8 R/8 E3/8 G3/8 E3/8 A#3/8 A3/8 | E3/8 E3/8 R/8 E3/8 D3/8 E3/8 B2/4 | E3/8 E3/8 R/8 E3/8 G3/8 E3/8 A#3/8 A3/8 | E3/8 E3/8 R/8 E3/8 G3/8 F#3/8 F3/8 D#3/8",
      bass:   "E2/8 E2/8 R/8 E2/8 G2/8 E2/8 A#2/8 A2/8 | E2/8 E2/8 R/8 E2/8 D2/8 E2/8 B1/4 | E2/8 E2/8 R/8 E2/8 G2/8 E2/8 A#2/8 A2/8 | E2/8 E2/8 R/8 E2/8 G2/8 F#2/8 F2/8 D#2/8",
      drums:  "[H/8]x8 | [H/8]x8 | [K/8 H/8 S/8 H/8]x2 | K/8 K/8 S/8 K/8 [S/16]x4 S/8 S/8",
    },

    // The hook: Em | G | C | D – B. Moderate register (B4–G5).
    hook: {
      lead:   "B4/8 B4/8 R/8 B4/8 E5/4 D5/8 B4/8 | G4/8 G4/8 A4/8 B4/8 D5/4 B4/4 | B4/8 B4/8 R/8 B4/8 E5/4 F#5/8 G5/8 | F#5/8 E5/8 D5/8 B4/8 A4/4 B4/4",
      guitar: "R/4 E3/8 R/8 R/2 | R/2 G3/8 A3/8 B3/8 D4/8 | R/4 C4/8 R/8 R/2 | R/2 D3/8 F#3/8 B3/8 D#4/8",
      bass:   "E2/8 R/8 R/8 E2/8 R/4 E3/8 E2/8 | G2/8 R/8 R/8 G2/8 R/4 G3/8 G2/8 | C3/8 R/8 R/8 C3/8 R/4 G2/8 C3/8 | D2/8 R/8 R/8 D2/8 B1/8 B1/8 D#2/8 F#2/8",
      drums:  "[K/8 H/8 R/8 H/8 S/8 H/8 R/8 H/8]x3 | K/8 H/8 S/8 H/8 [S/16]x4 S/8 S/8",
    },

    // Same hook, heavier backing; only the last bar changes, climbing into E.
    hook2: {
      lead:    "B4/8 B4/8 R/8 B4/8 E5/4 D5/8 B4/8 | G4/8 G4/8 A4/8 B4/8 D5/4 B4/4 | B4/8 B4/8 R/8 B4/8 E5/4 F#5/8 G5/8 | F#5/8 E5/8 D5/8 B4/8 C5/8 C#5/8 D5/8 D#5/8",
      harmony: "[E4/16 G4/16 B4/16 G4/16]x4 | [G4/16 B4/16 D5/16 B4/16]x4 | [C4/16 E4/16 G4/16 E4/16]x4 | [B3/16 D#4/16 F#4/16 A4/16]x4",
      guitar:  "E3/8 E3/8 E3/8 R/8 R/2 | R/2 G3/8 A3/8 B3/8 D4/8 | C3/8 C3/8 C4/8 R/8 R/2 | B2/8 B2/8 R/8 B2/8 C3/8 C#3/8 D3/8 D#3/8",
      bass:    "[E2/8 E3/8]x4 | [G2/8 G3/8]x4 | [C3/8 C4/8]x4 | B1/8 B2/8 B1/8 B2/8 C2/8 C#2/8 D2/8 D#2/8",
      drums:   "[K/8 H/8 S/8 H/8 K/8 K/8 S/8 H/8]x3 | K/8 K/8 S/8 K/8 [S/16]x8",
    },

    // Ominous battle stabs: Em – F – Em – B7, motif climbing each bar.
    battle: {
      lead:    "E5/8 R/8 E5/8 F5/8 E5/8 R/8 B4/4 | F5/8 R/8 F5/8 G5/8 F5/8 R/8 C5/4 | G5/8 R/8 G5/8 A5/8 G5/8 R/8 E5/4 | F#5/8 G5/8 A5/8 G5/8 F#5/8 E5/8 D#5/8 B4/8",
      harmony: "[G4/16 B4/16]x8 | [A4/16 C5/16]x8 | [G4/16 B4/16]x8 | [F#4/16 A4/16]x4 [D#4/16 F#4/16]x4",
      guitar:  "E3/8 E3/8 R/8 E3/8 R/8 E3/8 F3/8 E3/8 | F3/8 F3/8 R/8 F3/8 R/8 F3/8 G3/8 F3/8 | E3/8 E3/8 R/8 E3/8 R/8 E3/8 F3/8 E3/8 | B2/8 B2/8 R/8 B2/8 C3/8 B2/8 A#2/8 A2/8",
      bass:    "E2/8 E2/8 R/8 E2/8 R/8 E2/8 F2/8 E2/8 | F2/8 F2/8 R/8 F2/8 R/8 F2/8 G2/8 F2/8 | E2/8 E2/8 R/8 E2/8 R/8 E2/8 F2/8 E2/8 | B1/8 B1/8 R/8 B1/8 A#1/8 B1/8 C2/8 D#2/8",
      drums:   "[K/8 K/8 S/8 K/8 R/8 K/8 S/8 H/8]x3 | [S/16]x8 K/8 S/8 K/8 S/8",
    },

    // Heroic finale: the hook an octave up, doubled at the original pitch.
    climax: {
      lead:    "B5/8 B5/8 R/8 B5/8 E6/4 D6/8 B5/8 | G5/8 G5/8 A5/8 B5/8 D6/4 B5/4 | B5/8 B5/8 R/8 B5/8 E6/4 F#6/8 G6/8 | F#6/8 E6/8 D6/8 B5/8 E6/2",
      harmony: "B4/8 B4/8 R/8 B4/8 E5/4 D5/8 B4/8 | G4/8 G4/8 A4/8 B4/8 D5/4 B4/4 | B4/8 B4/8 R/8 B4/8 E5/4 F#5/8 G5/8 | F#5/8 E5/8 D5/8 B4/8 E5/2",
      guitar:  "[E3/8]x8 | [G3/8]x8 | [C3/8]x8 | [B2/8]x4 E3/2",
      bass:    "[E2/8 E3/8]x4 | [G2/8 G3/8]x4 | [C3/8 C4/8]x4 | B1/8 B2/8 B1/8 B2/8 E2/2",
      drums:   "[K/8 H/8 S/8 H/8 K/8 K/8 S/8 H/8]x3 | [S/16]x8 K/4 S/4",
    },
  },
});
