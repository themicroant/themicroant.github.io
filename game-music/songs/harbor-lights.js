/*
 * "Harbor Lights" — an original, gentle evening waltz in a Sega Genesis style.
 * F major, 3/4, 96 BPM, no drums. A soft FM flute melody over an "oom-pah-pah" of FM bass
 * and electric-piano chords; on the last pass an FM bell joins an octave above.
 * Style references for technique only (calm 16-bit town and harbour themes); the melody
 * is original.
 *
 *   A    the tune: F – C – Dm – Bb – F – C – Bb – C
 *   B    the middle: Dm – Bb – F – C – Dm – Bb – Gm – C, rising to C6
 *   A2   the tune again with the bell doubling it
 * Loops from the top. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// Waltz accompaniment: bass on 1, the chord on 2 and 3.
const CHORD = { F: "A3+C4+F4", C: "G3+C4+E4", Dm: "A3+D4+F4", Bb: "Bb3+D4+F4", Gm: "Bb3+D4+G4" };
const ROOT = { F: "F2", C: "C2", Dm: "D2", Bb: "Bb1", Gm: "G1" };
const pah = (...chords) => chords.map((c) => `R/4 ${CHORD[c]}/4 ${CHORD[c]}/4`).join(" | ");
const oom = (...chords) => chords.map((c) => `${ROOT[c]}/4 R/2`).join(" | ");

const A = ["F", "C", "Dm", "Bb", "F", "C", "Bb", "C"];
const B = ["Dm", "Bb", "F", "C", "Dm", "Bb", "Gm", "C"];

const TUNE_A = "A4/4 C5/4 F5/4 | E5/2 D5/4 | D5/4 C5/4 A4/4 | Bb4/2."
  + " | A4/4 C5/4 F5/4 | G5/2 F5/8 E5/8 | D5/4 E5/4 F5/4 | G5/2.";
const TUNE_B = "A5/2 F5/4 | G5/4 F5/4 D5/4 | C5/2 F5/4 | E5/2."
  + " | A5/2 C6/4 | Bb5/4 A5/4 G5/4 | F5/4 D5/4 E5/4 | G5/4 E5/4 C5/4";

RetroSongs.register({
  id: "harbor-lights",
  title: "Harbor Lights (Waltz)",
  bpm: 96,
  timeSig: "3/4",
  volume: 0.75,
  arrangement: ["A", "B", "A2"],
  master: { compress: true },
  instruments: {
    // FM flute: barely any modulation, a breathy attack, gentle vibrato.
    lead:  { wave: "sine", fm: { ratio: 1, index: 0.5, indexEnd: 0.25, decay: 0.3 }, volume: 0.12,
             env: { a: 0.04, d: 0.2, s: 0.8, r: 0.15 }, gate: 0.93,
             vibrato: { rate: 5, depth: 14, delay: 0.25 } },
    // FM bell: inharmonic ratio, the classic glassy chime.
    bell:  { wave: "sine", fm: { ratio: 3.5, index: 2, indexEnd: 0.2, decay: 0.6 }, volume: 0.04,
             env: { a: 0.002, d: 0.9, s: 0, r: 0.4 }, gate: 1 },
    ep:    { wave: "sine", fm: { ratio: 1, index: 1.4, indexEnd: 0.3, decay: 0.4 }, volume: 0.03,
             env: { a: 0.004, d: 0.6, s: 0.25, r: 0.2 }, gate: 0.9 },
    bass:  { wave: "sine", fm: { ratio: 1, index: 1.5, indexEnd: 0.5, decay: 0.2 }, volume: 0.24,
             env: { a: 0.005, d: 0.5, s: 0.4, r: 0.15 }, gate: 0.95 },
  },
  sections: {
    A:  { lead: TUNE_A, ep: pah(...A), bass: oom(...A) },
    B:  { lead: TUNE_B, ep: pah(...B), bass: oom(...B) },
    A2: { lead: TUNE_A, bell: transpose(TUNE_A, 12), ep: pah(...A), bass: oom(...A) },
  },
});
}
