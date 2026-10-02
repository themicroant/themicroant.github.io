/*
 * "Runway Duel" — an original fighting-game stage theme in an arcade FM style.
 * G minor, then A minor, 144 BPM. Inspired by the techniques that make Guile's Theme
 * (Street Fighter II) work, not its notes: an octave-pumping bass that never stops, a
 * laid-back hook of long held notes each answered by a quick turn, tied notes that land just
 * ahead of the beat, syncopated brass chord pushes, a steady rock beat, and a last pass that
 * lifts the whole tune a whole step. Voiced on FM like an early-90s arcade board.
 * Style references for technique only; every melody is original.
 *
 *   intro  bass, drums and brass pushes: Gm – Eb – F – D; a pickup into the hook
 *   A      the hook: Gm – Eb – F – Gm – Gm – Eb – F – D
 *   B      a call-and-answer middle that climbs: Eb – F – Dm – Gm – Eb – F – D – D
 *   A_UP   the hook a whole step up, in A minor; its last bar turns back to D for the loop
 * Loops from A. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// Long notes with a quick turn after them; the ties push the next phrase ahead of the beat.
const HOOK = "G5/2~ G5/8 F5/8 D5/8 F5/8 | G5/4. Bb5/8~ Bb5/2 | A5/2~ A5/8 G5/8 F5/8 G5/8 | D5/2. R/4"
  + " | G5/2~ G5/8 A5/8 Bb5/8 C6/8 | D6/4. C6/8~ C6/4 Bb5/4 | A5/4. Bb5/8~ Bb5/4 C6/4 | A5/2 F#5/2";
// Call and answer: a pushed phrase, then a reply a step lower; then a climb to D6.
const TUNE_B = "Bb5/4 Bb5/8 C6/8~ C6/4 Bb5/4 | A5/4 A5/8 Bb5/8~ Bb5/4 A5/4 | F5/4 F5/8 G5/8~ G5/4 A5/4 | Bb5/2. R/4"
  + " | G5/4 Bb5/4 Eb6/4 D6/4 | C6/4 A5/4 F5/4 A5/4 | F#5/4. G5/8 A5/4 C6/4 | D6/2 A5/4 F#5/4";

const CHORD = { Gm: "G3+Bb3+D4", Eb: "G3+Bb3+Eb4", F: "A3+C4+F4", D: "A3+D4+F#4", Dm: "A3+D4+F4" };
const ROOT = { Gm: "G1", Eb: "Eb2", F: "F1", D: "D2", Dm: "D2" };

// The bass: root and octave in 8ths, every bar, all the way through.
const pump = (chords) => chords.map((c) => `[${ROOT[c]}/8 ${transpose(ROOT[c], 12)}/8]x4`).join(" | ");
// Brass: a chord on 1 and a push on the "and" of 2, tied over beat 3.
const pushes = (chords) => chords.map((c) => `${CHORD[c]}/4 R/8 ${CHORD[c]}/8~ ${CHORD[c]}/4 R/4`).join(" | ");
// A soft FM bell plays the chord tones in 16ths, quietly, for shimmer.
const shimmer = (chords) => chords.map((c) => {
  const notes = transpose(CHORD[c], 12).split("+");
  return `[${notes.map((n) => n + "/16").join(" ")} ${notes[1]}/16]x4`;
}).join(" | ");

const A = ["Gm", "Eb", "F", "Gm", "Gm", "Eb", "F", "D"];
const B = ["Eb", "F", "Dm", "Gm", "Eb", "F", "D", "D"];
const INTRO = ["Gm", "Eb", "F", "D"];

const BEAT = "K/4 S/4 K/8 K/8 S/4";
const DRUMS_8 = `[${BEAT} |]x7 K/8 K/8 S/8 K/8 [S/16]x4 [T/16]x4`;
const HATS_8 = "[C/4 [H/8]x6 | [[H/8]x8 |]x3]x2";

const SECTION_A = { lead: HOOK, brass: pushes(A), bell: shimmer(A), bass: pump(A), drums: DRUMS_8, cymbals: HATS_8 };

// A whole step up, with the last bar swapped for D major so the loop falls back to G minor.
const lastBar = (text, bar) => [...text.split(" | ").slice(0, -1), bar].join(" | ");
const up = (text) => transpose(text, 2);
const SECTION_UP = {
  lead:    lastBar(up(HOOK), "A5/2 F#5/2"),
  brass:   lastBar(up(SECTION_A.brass), pushes(["D"])),
  bell:    lastBar(up(SECTION_A.bell), shimmer(["D"])),
  bass:    lastBar(up(SECTION_A.bass), pump(["D"])),
  drums:   DRUMS_8,
  cymbals: HATS_8,
};

RetroSongs.register({
  id: "runway-duel",
  title: "Runway Duel (Battle)",
  bpm: 144,
  volume: 0.45,
  arrangement: ["intro", "A", "B", "A_UP"],
  loopFrom: "A",
  master: { compress: true },
  instruments: {
    // Brassy FM lead with a slow vibrato on the long notes.
    lead:  { wave: "sine", fm: { ratio: 1, index: 2.8, indexEnd: 1.8, decay: 0.2 }, volume: 0.1,
             env: { a: 0.01, d: 0.15, s: 0.8, r: 0.08 }, gate: 0.95, filter: { freq: 5000 },
             vibrato: { rate: 5.5, depth: 16, delay: 0.3 } },
    // Synth-brass chords, a little to the left.
    brass: { wave: "sine", fm: { ratio: 1, index: 2.2, indexEnd: 1, decay: 0.12 }, volume: 0.025, pan: -0.5,
             env: { a: 0.006, d: 0.15, s: 0.6, r: 0.08 }, gate: 0.9 },
    // FM bell shimmer, quiet, to the right.
    bell:  { wave: "sine", fm: { ratio: 3.5, index: 1.5, indexEnd: 0.2, decay: 0.3 }, volume: 0.016, pan: 0.5,
             env: { a: 0.002, d: 0.3, s: 0, r: 0.15 }, gate: 1 },
    // Synth bass: a firm FM pluck that pumps octaves.
    bass:  { wave: "sine", fm: { ratio: 1, index: 4, indexEnd: 1.5, decay: 0.1 }, volume: 0.25,
             env: { a: 0.003, d: 0.2, s: 0.55, r: 0.05 }, gate: 0.85 },
    drums:   { drums: true, kit: "studio", bits: 7, volume: 0.42, filter: { freq: 7500 } },
    cymbals: { drums: true, kit: "studio", bits: 7, volume: 0.14, filter: { freq: 9000 } },
  },
  sections: {
    intro: {
      lead:    "R/1 | R/1 | R/1 | R/2. D5/4",
      brass:   pushes(INTRO),
      bass:    pump(INTRO),
      drums:   `[${BEAT} |]x3 K/8 K/8 S/8 K/8 [S/16]x8`,
      cymbals: "C/4 [H/8]x6 | [[H/8]x8 |]x3",
    },
    A:    SECTION_A,
    B:    { lead: TUNE_B, brass: pushes(B), bell: shimmer(B), bass: pump(B), drums: DRUMS_8, cymbals: HATS_8 },
    A_UP: SECTION_UP,
  },
});
}
