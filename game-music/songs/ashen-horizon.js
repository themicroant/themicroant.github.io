/*
 * "Ashen Horizon" — an original melodic death metal theme.
 * Heavily inspired by the opening ~20 seconds of "The End" by In Flames (Foregone, 2023):
 * a melancholic, mid-tempo Gothenburg-style intro that goes from a quiet, atmospheric start
 * into a wall of palm-muted, galloping guitars, double-kick and a harmonised twin-guitar
 * lead. Style and structure only: every melody, riff and chord choice here is original.
 * B minor, 138 BPM.
 *
 *   intro   clean arpeggios over Bm – G – D – F#, a soft bell states the lead melody,
 *           snare roll into the band
 *   twin    the band crashes in: twin leads in diatonic thirds over galloping chugs
 *           and double-kick in a half-time feel
 *   heavy   no lead: syncopated stop-start riff under a sustained keyboard line
 *   twin2   the twin lead again; only the last bar changes, turning back into B
 * Loops from twin, so the intro plays once. Design notes: docs/song-notes.md
 */
RetroSongs.register({
  id: "ashen-horizon",
  title: "Ashen Horizon (Melodic Death Metal)",
  bpm: 138,
  arrangement: ["intro", "twin", "heavy", "twin2"],
  loopFrom: "twin",
  instruments: {
    lead:   { wave: "sawtooth", volume: 0.055 },
    twin:   { wave: "sawtooth", volume: 0.035 },
    bell:   { wave: "sine",     volume: 0.12 },
    clean:  { wave: "triangle", volume: 0.12 },
    guitar: { wave: "sawtooth", volume: 0.045 },
  },
  sections: {
    // Quiet start: clean arpeggios and a soft bell playing the lead melody once.
    intro: {
      bell:  "B4/8 D5/8 F#5/4. E5/8 D5/8 E5/8 | G5/4. F#5/8 E5/8 D5/8 B4/4 | A4/8 D5/8 F#5/4. E5/8 D5/8 F#5/8 | E5/4 C#5/4 A#4/2",
      clean: "B3/8 F#4/8 B4/8 D5/8 F#5/8 D5/8 B4/8 F#4/8 | G3/8 D4/8 G4/8 B4/8 D5/8 B4/8 G4/8 D4/8 | D4/8 A4/8 D5/8 F#5/8 A5/8 F#5/8 D5/8 A4/8 | F#3/8 C#4/8 F#4/8 A#4/8 C#5/8 A#4/8 F#4/8 C#4/8",
      bass:  "B1/1 | G2/1 | D2/1 | F#2/1",
      drums: "R/1 | R/1 | R/1 | R/2 [S/16]x8",
    },

    // Twin leads a diatonic third apart over Bm | G | D | F#; galloping chugs underneath.
    twin: {
      lead:   "B4/8 D5/8 F#5/4. E5/8 D5/8 E5/8 | G5/4. F#5/8 E5/8 D5/8 B4/4 | A4/8 D5/8 F#5/4. E5/8 D5/8 F#5/8 | E5/4 C#5/4 A#4/2",
      twin:   "F#4/8 B4/8 D5/4. C#5/8 B4/8 C#5/8 | E5/4. D5/8 C#5/8 B4/8 G4/4 | F#4/8 A4/8 D5/4. C#5/8 B4/8 D5/8 | C#5/4 A#4/4 F#4/2",
      guitar: "[B2/16 B2/16 B2/8]x3 D3/8 C#3/8 | [G2/16 G2/16 G2/8]x3 A2/8 B2/8 | [D3/16 D3/16 D3/8]x3 E3/8 F#3/8 | [F#2/16 F#2/16 F#2/8]x3 A2/8 A#2/8",
      bass:   "[B1/8]x8 | [G2/8]x8 | [D2/8]x8 | [F#2/8]x6 A2/8 A#2/8",
      drums:  "[[K/16]x8 S/8 K/16 K/16 [K/16]x4]x3 | [K/16]x8 [S/16]x8",
    },

    // Stop-start riff with the lead out; a held keyboard line keeps the melancholy.
    heavy: {
      harmony: "F#5/1 | D5/1 | F#5/1 | E5/2 C#5/2",
      guitar:  "B2/8 B2/8 R/16 B2/16 B2/8 D3/8 R/16 B2/16 C#3/8 D3/8 | G2/8 G2/8 R/16 G2/16 G2/8 B2/8 R/16 G2/16 A2/8 B2/8 | D3/8 D3/8 R/16 D3/16 D3/8 F#3/8 R/16 D3/16 E3/8 F#3/8 | F#2/8 F#2/8 R/16 F#2/16 F#2/8 [F#2/16]x4 A2/8 A#2/8",
      bass:    "B1/8 B1/8 R/16 B1/16 B1/8 D2/8 R/16 B1/16 C#2/8 D2/8 | G1/8 G1/8 R/16 G1/16 G1/8 B1/8 R/16 G1/16 A1/8 B1/8 | D2/8 D2/8 R/16 D2/16 D2/8 F#2/8 R/16 D2/16 E2/8 F#2/8 | F#1/8 F#1/8 R/16 F#1/16 F#1/8 [F#1/16]x4 A1/8 A#1/8",
      drums:   "[K/8 K/16 K/16 S/8 K/8]x6 | K/8 K/16 K/16 S/8 K/8 [S/16]x8",
    },

    // Twin lead again; the last bar climbs and falls back to B for the loop.
    twin2: {
      lead:    "B4/8 D5/8 F#5/4. E5/8 D5/8 E5/8 | G5/4. F#5/8 E5/8 D5/8 B4/4 | A4/8 D5/8 F#5/4. E5/8 D5/8 F#5/8 | E5/8 F#5/8 G5/8 F#5/8 E5/8 C#5/8 B4/4",
      twin:    "F#4/8 B4/8 D5/4. C#5/8 B4/8 C#5/8 | E5/4. D5/8 C#5/8 B4/8 G4/4 | F#4/8 A4/8 D5/4. C#5/8 B4/8 D5/8 | C#5/8 D5/8 E5/8 D5/8 C#5/8 A#4/8 F#4/4",
      harmony: "[B4/16 D5/16 F#5/16 D5/16]x4 | [G4/16 B4/16 D5/16 B4/16]x4 | [A4/16 D5/16 F#5/16 D5/16]x4 | [F#4/16 A#4/16 C#5/16 A#4/16]x4",
      guitar:  "[B2/16 B2/16 B2/8]x3 D3/8 C#3/8 | [G2/16 G2/16 G2/8]x3 A2/8 B2/8 | [D3/16 D3/16 D3/8]x3 E3/8 F#3/8 | [F#2/16 F#2/16 F#2/8]x3 A2/8 A#2/8",
      bass:    "[B1/8 B2/8]x4 | [G1/8 G2/8]x4 | [D2/8 D3/8]x4 | [F#1/8 F#2/8]x3 A1/8 A#1/8",
      drums:   "[[K/16]x8 S/8 K/16 K/16 [K/16]x4]x3 | [K/16]x4 [S/16]x8 K/8 S/8",
    },
  },
});
