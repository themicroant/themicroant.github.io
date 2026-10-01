/*
 * "Moonlit Pond" — an original, calm night theme, chip style.
 * A minor, 88 BPM, no drums. A soft sine melody over gently rocking triangle arpeggios and
 * long bass notes. A quiet square-wave echo follows the melody an 8th note behind, like a
 * delay pedal, on the second half.
 * Style references for technique only (8-bit night and rest-area music); the melody is original.
 *
 *   A    Am – F – C – G – Am – F – G – E
 *   B    F – G – Em – Am – F – G – E – E, climbing through an E7 arpeggio
 *   A2   the tune again, with the echo
 * Loops from the top. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const ARP = { Am: "A3 E4 A4 C5", F: "F3 C4 F4 A4", C: "C4 G4 C5 E5", G: "G3 D4 G4 B4",
  Em: "E3 B3 E4 G4", E: "E3 B3 E4 G#4" };
const ROOT = { Am: "A1", F: "F1", C: "C2", G: "G1", Em: "E2", E: "E1" };
const arps = (chords) => chords.map((c) => `[${ARP[c].split(" ").map((n) => n + "/8").join(" ")}]x2`).join(" | ");
const roots = (chords) => chords.map((c) => `${ROOT[c]}/1`).join(" | ");

const A = ["Am", "F", "C", "G", "Am", "F", "G", "E"];
const B = ["F", "G", "Em", "Am", "F", "G", "E", "E"];

const TUNE_A = "C5/4. B4/8 A4/4 E5/4 | D5/4. C5/8 A4/2 | G4/4 C5/4 E5/4 G5/4 | F5/4. E5/8 D5/2"
  + " | C5/4. B4/8 A4/4 E5/4 | F5/4 E5/4 D5/4 C5/4 | B4/4 D5/4 G5/4 F5/4 | E5/2. R/4";
const TUNE_B = "A5/2 G5/4 F5/4 | E5/4 D5/4 B4/2 | G5/2 E5/4 B4/4 | C5/2. R/4"
  + " | A5/2 C6/4 A5/4 | B5/4 A5/4 G5/4 D5/4 | E5/4 G#5/4 B5/4 D6/4 | B5/2. R/4";

// An echo: the tune again, an 8th note late. Its notes now straddle the bar lines, so the
// bar lines come out and the shifted line is checked as one long stretch of whole bars.
const echo = (tune) => `R/8 ${tune.replace(/\|/g, "").replace(/R\/4$/, "R/8")}`;

RetroSongs.register({
  id: "moonlit-pond",
  title: "Moonlit Pond (Night)",
  bpm: 88,
  volume: 1.2,
  arrangement: ["A", "B", "A2"],
  instruments: {
    lead:  { wave: "sine",     volume: 0.16 },
    echo:  { wave: "square",   volume: 0.014 },
    arp:   { wave: "triangle", volume: 0.09 },
    bass:  { wave: "triangle", volume: 0.24, gate: 0.97 },
  },
  sections: {
    A:  { lead: TUNE_A, arp: arps(A), bass: roots(A) },
    B:  { lead: TUNE_B, arp: arps(B), bass: roots(B) },
    A2: { lead: TUNE_A, echo: echo(TUNE_A), arp: arps(A), bass: roots(A) },
  },
});
}
