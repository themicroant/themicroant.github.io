/*
 * "Willow Square" — an original, cheerful town theme, chip style.
 * C major, 116 BPM. A singable square-wave tune over gentle broken-chord accompaniment,
 * a walking root–fifth bass and a light beat, like an NES-era village.
 * Style references for technique only (8-bit RPG town music); the melody is original.
 *
 *   A    the tune: C – Am – F – G – C – Am – Dm/G – C
 *   B    it lifts to F and G and climbs to D6, turning back home on G7
 *   A2   the tune again, doubled an octave below by a soft sine
 * Loops from the top. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// Broken chords: four 8ths (two beats) per chord.
const ARP = { C: "C4 E4 G4 E4", Am: "A3 C4 E4 C4", F: "F3 A3 C4 A3", G: "G3 B3 D4 B3",
  Dm: "D4 F4 A4 F4", Em: "E4 G4 B4 G4" };
// Root and fifth, a quarter each, per half bar.
const BASS = { C: "C2 G2", Am: "A1 E2", F: "F1 C2", G: "G1 D2", Dm: "D2 A2", Em: "E2 B2" };
// A bar is "C" (the whole bar) or "Dm G" (two chords, half a bar each); each half bar
// plays the chord's notes from `table` at duration `dur`.
const play = (table, dur, bars) => bars.map((bar) => {
  const chords = bar.split(" ");
  return (chords.length === 1 ? [chords[0], chords[0]] : chords)
    .map((c) => table[c].split(" ").map((n) => `${n}/${dur}`).join(" ")).join(" ");
}).join(" | ");

const A_CHORDS = ["C", "Am", "F", "G", "C", "Am", "Dm G", "C"];
const B_CHORDS = ["F", "G", "Em", "Am", "F", "G", "Em Am", "G"];

const TUNE_A = "E5/4 G5/8 E5/8 D5/4 C5/4 | C5/4 A4/8 C5/8 E5/2 | F5/4 A5/8 F5/8 E5/4 D5/4 | D5/4 B4/8 D5/8 G5/2"
  + " | E5/4 G5/8 E5/8 D5/4 C5/4 | C5/4 E5/8 A5/8 G5/4 E5/4 | F5/4 E5/4 D5/4 B4/4 | C5/2. R/4";
const TUNE_B = "A5/4. G5/8 F5/4 C5/4 | D5/4 G5/4 B5/2 | G5/4. F5/8 E5/4 B4/4 | C5/2. R/4"
  + " | A5/4. G5/8 F5/4 A5/4 | B5/4 C6/4 D6/2 | C6/4 B5/4 A5/4 G5/4 | F5/2 D5/2";

const BEAT = "[K/4 H/4 S/4 H/4 |]x8";

RetroSongs.register({
  id: "willow-square",
  title: "Willow Square (Town)",
  bpm: 116,
  volume: 1.1,
  arrangement: ["A", "B", "A2"],
  instruments: {
    lead:    { wave: "square",   volume: 0.07 },
    harmony: { wave: "square",   volume: 0.022 },
    echo:    { wave: "sine",     volume: 0.07 },
    bass:    { wave: "triangle", volume: 0.26 },
    drums:   { drums: true,      volume: 0.22 },
  },
  sections: {
    A:  { lead: TUNE_A, harmony: play(ARP, 8, A_CHORDS), bass: play(BASS, 4, A_CHORDS), drums: BEAT },
    B:  { lead: TUNE_B, harmony: play(ARP, 8, B_CHORDS), bass: play(BASS, 4, B_CHORDS), drums: BEAT },
    A2: { lead: TUNE_A, echo: transpose(TUNE_A, -12), harmony: play(ARP, 8, A_CHORDS), bass: play(BASS, 4, A_CHORDS), drums: BEAT },
  },
});
}
