/* "Bright Victory" — a short original win jingle, to show swapping songs. */
RetroSongs.register({
  id: "bright-victory",
  title: "Bright Victory (Jingle)",
  bpm: 160,
  arrangement: ["main"],
  instruments: { lead: { wave: "sawtooth", volume: 0.07 } },
  sections: {
    main: {
      lead:    "G4/16 C5/16 E5/16 G5/16 C6/4 B5/8 G5/8 A5/8 B5/8 | C6/2. R/4",
      harmony: "[C5/16 E5/16 G5/16 E5/16]x4 | R/1",
      bass:    "C3/4 G2/4 E2/4 G2/4 | C2/2. R/4",
      drums:   "K/4 S/4 K/4 S/4 | K/8 S/8 S/8 S/8 K/2",
    },
  },
});
