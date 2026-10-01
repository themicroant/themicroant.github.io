/*
 * "Hearthfire Jig" — an original, lively festival jig, chip style.
 * G major, 6/8, 160 BPM (quarter notes; about 107 dotted-quarter beats a minute).
 * A running square-wave tune in jig rhythm over "oom-pah" offbeat chords, a root–fifth
 * bass and a soft frame-drum pattern on toms. On the last pass a second voice doubles the
 * tune an octave down, like a whistle and fiddle playing together.
 * Style references for technique only (Celtic jigs, 8-bit tavern and festival music);
 * the tune is original.
 *
 *   A    G – C – G – D – G – C – D – G
 *   B    Em – C – G – D – Em – C – D – G, up to E6
 *   A2   the tune again, doubled an octave down
 * Loops from the top. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

const CHORD = { G: "B3+D4+G4", C: "C4+E4+G4", D: "A3+D4+F#4", Em: "B3+E4+G4" };
const BASS = { G: ["G2", "D2"], C: ["C2", "G2"], D: ["D2", "A2"], Em: ["E2", "B2"] };
// 6/8 counts in two: the bass on each pulse, the chord on the offbeats ("oom-pah-pah").
const pah = (chords) => chords.map((c) => `[R/8 ${CHORD[c]}/8 ${CHORD[c]}/8]x2`).join(" | ");
const oom = (chords) => chords.map((c) => `${BASS[c][0]}/4 R/8 ${BASS[c][1]}/4 R/8`).join(" | ");

const A = ["G", "C", "G", "D", "G", "C", "D", "G"];
const B = ["Em", "C", "G", "D", "Em", "C", "D", "G"];

const TUNE_A = "D5/8 B4/8 G4/8 D5/8 B4/8 G4/8 | E5/8 C5/8 E5/8 G5/4 E5/8 | D5/8 B4/8 D5/8 G5/8 F#5/8 G5/8 | A5/4. F#5/4."
  + " | D5/8 B4/8 G4/8 D5/8 B4/8 G4/8 | E5/8 G5/8 E5/8 C5/8 E5/8 C5/8 | A4/8 B4/8 C5/8 D5/8 E5/8 F#5/8 | G5/4. G4/4.";
const TUNE_B = "B5/8 G5/8 E5/8 B5/8 G5/8 E5/8 | C6/4 B5/8 A5/8 G5/8 E5/8 | D5/8 G5/8 B5/8 D6/4 B5/8 | A5/4. D5/4."
  + " | E5/8 G5/8 B5/8 E6/4 D6/8 | C6/8 B5/8 A5/8 G5/8 E5/8 C5/8 | D5/8 F#5/8 A5/8 C6/8 B5/8 A5/8 | G5/4. R/4.";

// A frame drum: low tom on each pulse, light kick and rim between.
const DRUM = "[T/8 R/8 K/8 T/8 R/8 S/8 |]x7 T/8 S/8 S/8 T/4.";

RetroSongs.register({
  id: "hearthfire-jig",
  title: "Hearthfire Jig (Festival)",
  bpm: 160,
  timeSig: "6/8",
  volume: 1.1,
  arrangement: ["A", "B", "A2"],
  instruments: {
    lead:    { wave: "square",   volume: 0.065 },
    low:     { wave: "triangle", volume: 0.12 },
    harmony: { wave: "square",   volume: 0.012, gate: 0.6 },
    bass:    { wave: "triangle", volume: 0.26 },
    drums:   { drums: true,      volume: 0.22 },
  },
  sections: {
    A:  { lead: TUNE_A, harmony: pah(A), bass: oom(A), drums: DRUM },
    B:  { lead: TUNE_B, harmony: pah(B), bass: oom(B), drums: DRUM },
    A2: { lead: TUNE_A, low: transpose(TUNE_A, -12), harmony: pah(A), bass: oom(A), drums: DRUM },
  },
});
}
