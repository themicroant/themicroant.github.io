/*
 * "Ashen Horizon v2" — a second version of Ashen Horizon, to compare with the original.
 * The intro and the first twin-lead section are the original's, note for note; the original's
 * third part (the stop-start "heavy" riff) is replaced by 12 new bars, so the song runs
 * 24 bars instead of 16.
 *
 * The original: an original melodic death metal theme.
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
 *   rise    NEW: a soaring melody in D major's colours over held chords and arpeggios, half
 *           time; the twin lead joins for the second four bars: G – A – F#m – Bm – G – A – Em – F#
 *   build   NEW: tremolo chords and climbing triplets, Em – G – A – F#, into the last section
 *   twin2   the twin lead again; only the last bar changes, turning back into B
 * Loops from twin, so the intro plays once. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// The melody, bars 1–3, and its twin a diatonic third below. Bar 4 changes per section.
const THEME = "B4/8 D5/8 F#5/4. E5/8 D5/8 E5/8 | G5/4. F#5/8 E5/8 D5/8 B4/4 | A4/8 D5/8 F#5/4. E5/8 D5/8 F#5/8";
const THEME_TWIN = "F#4/8 B4/8 D5/4. C#5/8 B4/8 C#5/8 | E5/4. D5/8 C#5/8 B4/8 G4/4 | F#4/8 A4/8 D5/4. C#5/8 B4/8 D5/8";
// Galloping chugs under the twin leads.
const GALLOP = "[B2/16 B2/16 B2/8]x3 D3/8 C#3/8 | [G2/16 G2/16 G2/8]x3 A2/8 B2/8 | [D3/16 D3/16 D3/8]x3 E3/8 F#3/8 | [F#2/16 F#2/16 F#2/8]x3 A2/8 A#2/8";

// NEW. The rise: a long, stepwise climb answered by a falling phrase; the twin enters in bar 5.
const RISE = "D5/4. E5/8 F#5/4 G5/4 | A5/2 E5/4 C#5/4 | C#5/4. D5/8 E5/4 F#5/4 | D5/2. B4/4"
  + " | D5/4. E5/8 F#5/4 B5/4 | A5/4. G5/8 E5/4 C#6/4 | B5/4 G5/4 E5/4 G5/8 A5/8 | A#5/2 F#5/2";
const RISE_TWIN = "R/1 | R/1 | R/1 | R/1"
  + " | B4/4. C#5/8 D5/4 G5/4 | F#5/4. E5/8 C#5/4 A5/4 | G5/4 E5/4 B4/4 E5/8 F#5/8 | F#5/2 C#5/2";
const RISE_CHORDS = ["G", "A", "F#m", "Bm", "G", "A", "Em", "F#"];
const POWER = { G: "G2+D3", A: "A2+E3", "F#m": "F#2+C#3", Bm: "B2+F#3", Em: "E2+B2", "F#": "F#2+C#3" };
const ROOT = { G: "G1", A: "A1", "F#m": "F#1", Bm: "B1", Em: "E2", "F#": "F#1" };
const ARP = { G: "G4 B4 D5 B4", A: "A4 C#5 E5 C#5", "F#m": "F#4 A4 C#5 A4", Bm: "B4 D5 F#5 D5",
  Em: "E4 G4 B4 G4", "F#": "F#4 A#4 C#5 A#4" };
const held = (chords) => chords.map((c) => `${POWER[c]}/2. ${POWER[c]}/4`).join(" | ");
const arps = (chords) => chords.map((c) => `[${ARP[c].split(" ").map((n) => n + "/8").join(" ")}]x2`).join(" | ");
const roots = (chords) => chords.map((c) => `${ROOT[c]}/4 ${ROOT[c]}/4 ${transpose(ROOT[c], 12)}/4 ${ROOT[c]}/4`).join(" | ");

RetroSongs.register({
  id: "ashen-horizon-v2",
  title: "Ashen Horizon v2 (Title Screen)",
  bpm: 138,
  arrangement: ["intro", "twin", "rise", "build", "twin2"],
  loopFrom: "twin",
  instruments: {
    lead:   { wave: "sawtooth", volume: 0.055 },
    twin:   { wave: "sawtooth", volume: 0.035 },
    bell:   { wave: "sine",     volume: 0.12 },
    clean:  { wave: "triangle", volume: 0.12 },
    guitar: { wave: "sawtooth", volume: 0.045 },
    // Two-note power chords for the new sections, a little quieter than one-note guitar.
    chords: { wave: "sawtooth", volume: 0.038 },
  },
  sections: {
    // Quiet start: clean arpeggios and a soft bell playing the lead melody once.
    intro: {
      bell:  `${THEME} | E5/4 C#5/4 A#4/2`,
      clean: "B3/8 F#4/8 B4/8 D5/8 F#5/8 D5/8 B4/8 F#4/8 | G3/8 D4/8 G4/8 B4/8 D5/8 B4/8 G4/8 D4/8 | D4/8 A4/8 D5/8 F#5/8 A5/8 F#5/8 D5/8 A4/8 | F#3/8 C#4/8 F#4/8 A#4/8 C#5/8 A#4/8 F#4/8 C#4/8",
      bass:  "B1/1 | G2/1 | D2/1 | F#2/1",
      drums: "R/1 | R/1 | R/1 | R/2 [S/16]x8",
    },

    // Twin leads a diatonic third apart over Bm | G | D | F#; galloping chugs underneath.
    twin: {
      lead:   `${THEME} | E5/4 C#5/4 A#4/2`,
      twin:   `${THEME_TWIN} | C#5/4 A#4/4 F#4/2`,
      guitar: GALLOP,
      bass:   "[B1/8]x8 | [G2/8]x8 | [D2/8]x8 | [F#2/8]x6 A2/8 A#2/8",
      drums:  "[[K/16]x8 S/8 K/16 K/16 [K/16]x4]x3 | [K/16]x8 [S/16]x8",
    },

    // NEW. G | A | F#m | Bm | G | A | Em | F# — half time: held chords, arpeggios, a soaring melody.
    rise: {
      lead:    RISE,
      twin:    RISE_TWIN,
      chords:  held(RISE_CHORDS),
      harmony: arps(RISE_CHORDS),
      bass:    roots(RISE_CHORDS),
      drums:   "[K/8 H/8 H/8 H/8 S/8 H/8 K/8 H/8 |]x7 K/8 H/8 S/8 H/8 [S/16]x8",
    },

    // NEW. Em | G | A | F# — tremolo chords, climbing triplets, a rising keyboard line.
    build: {
      lead:    "[E5/8t F#5/8t G5/8t]x2 B5/2 | [G5/8t A5/8t B5/8t]x2 D6/2 | [A5/8t B5/8t C#6/8t]x2 E6/2 | F#6/4 E6/4 C#6/4 A#5/4",
      twin:    "R/1 | R/1 | R/1 | C#6/4 C#6/4 A#5/4 F#5/4",
      chords:  "[E2+B2/16]x16 | [G2+D3/16]x16 | [A2+E3/16]x16 | [F#2+C#3/16]x8 F#2+C#3/8 R/8 F#2+C#3/4",
      harmony: "E5/1 | G5/1 | A5/1 | A#5/1",
      bass:    "[E2/8]x8 | [G1/8]x8 | [A1/8]x8 | [F#1/8]x4 F#1/8 R/8 F#1/4",
      drums:   "[K/8 S/8]x4 | [K/8 S/8]x4 | [K/16 K/16 S/8]x4 | [S/16]x8 S/8 R/8 K/4",
    },

    // Twin lead again; the last bar climbs and falls back to B for the loop.
    twin2: {
      lead:    `${THEME} | E5/8 F#5/8 G5/8 F#5/8 E5/8 C#5/8 B4/4`,
      twin:    `${THEME_TWIN} | C#5/8 D5/8 E5/8 D5/8 C#5/8 A#4/8 F#4/4`,
      harmony: "[B4/16 D5/16 F#5/16 D5/16]x4 | [G4/16 B4/16 D5/16 B4/16]x4 | [A4/16 D5/16 F#5/16 D5/16]x4 | [F#4/16 A#4/16 C#5/16 A#4/16]x4",
      guitar:  GALLOP,
      bass:    "[B1/8 B2/8]x4 | [G1/8 G2/8]x4 | [D2/8 D3/8]x4 | [F#1/8 F#2/8]x3 A1/8 A#1/8",
      drums:   "[[K/16]x8 S/8 K/16 K/16 [K/16]x4]x3 | [K/16]x4 [S/16]x8 K/8 S/8",
    },
  },
});
}
