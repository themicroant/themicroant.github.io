/*
 * "Sunward Road" — an original, bright adventure overworld theme in a Sega Genesis style.
 * D major, 138 BPM. An open-road melody on an FM brass lead, PSG arpeggios, a soft FM pad,
 * a bouncing FM bass and a light beat. On the last pass the melody is doubled an octave down.
 * Style references for technique only (16-bit adventure overworld music); the melody is original.
 *
 *   intro  two bars of arpeggios and pad on D – A
 *   A      the tune: D – Bm – G – A – D – Bm – Em/A – D
 *   B      the lift: G – A – F#m – Bm – G – A – Bm – A, peaking on D6
 *   A2     the tune again, doubled an octave below
 * Loops from A. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

const ARP = { D: "D4 F#4 A4 F#4", Bm: "B3 D4 F#4 D4", G: "G3 B3 D4 B3", A: "A3 C#4 E4 C#4",
  Em: "E4 G4 B4 G4", "F#m": "F#4 A4 C#5 A4" };
const PAD = { D: "D4+F#4+A4", Bm: "D4+F#4+B4", G: "D4+G4+B4", A: "C#4+E4+A4", Em: "E4+G4+B4", "F#m": "C#4+F#4+A4" };
const BASS = { D: ["D2", "A1"], Bm: ["B1", "F#2"], G: ["G1", "D2"], A: ["A1", "E2"], Em: ["E2", "B1"], "F#m": ["F#2", "C#2"] };

// Each bar is one chord, or two ("Em A") for half a bar each.
const perBar = (bars, one) => bars.map((bar) => {
  const chords = bar.split(" ");
  return chords.length === 1 ? one(chords[0], 4) : chords.map((c) => one(c, 2)).join(" ");
}).join(" | ");
// Arpeggio: 8th notes, repeated to fill `beats`.
const arps = (bars) => perBar(bars, (c, beats) => `[${ARP[c].split(" ").map((n) => n + "/8").join(" ")}]x${beats / 2}`);
const pads = (bars) => perBar(bars, (c, beats) => `${PAD[c]}/${beats === 4 ? 1 : 2}`);
// Bass: root, root, fifth, root (or root, fifth for half a bar).
const bass = (bars) => perBar(bars, (c, beats) => {
  const [r, f] = BASS[c];
  return beats === 4 ? `${r}/4 ${r}/8 ${f}/8 ${r}/4 ${f}/4` : `${r}/4 ${f}/4`;
});

const A = ["D", "Bm", "G", "A", "D", "Bm", "Em A", "D"];
const B = ["G", "A", "F#m", "Bm", "G", "A", "Bm", "A"];

const TUNE_A = "A4/4 D5/8 E5/8 F#5/4. E5/8 | D5/4 B4/4 F#5/2 | G5/4. F#5/8 E5/4 D5/4 | E5/2. A4/4"
  + " | A4/4 D5/8 E5/8 F#5/4. A5/8 | B5/4 A5/8 F#5/8 D5/2 | G5/4 F#5/4 E5/4 C#5/4 | D5/2. R/4";
const TUNE_B = "B5/4. A5/8 G5/4 D5/4 | C#5/4 E5/4 A5/2 | A5/4. G5/8 F#5/4 C#5/4 | D5/2. R/4"
  + " | B5/4. A5/8 G5/4 B5/4 | C#6/4 B5/4 A5/2 | D6/4 C#6/8 B5/8 A5/4 F#5/4 | E5/2. A4/4";

const BEAT = "[K/4 S/4 K/8 K/8 S/4 |]x7 K/4 S/4 K/8 S/8 S/8 S/8";
const HATS = "C/4 [H/8]x6 | [[H/8]x8 |]x7";

RetroSongs.register({
  id: "sunward-road",
  title: "Sunward Road (Overworld)",
  bpm: 138,
  volume: 0.45,
  arrangement: ["intro", "A", "B", "A2"],
  loopFrom: "A",
  master: { compress: true },
  instruments: {
    // FM brass lead: warm, rounded, a little vibrato.
    lead:    { wave: "sine", fm: { ratio: 1, index: 2.4, indexEnd: 1.6, decay: 0.2 }, volume: 0.1,
               env: { a: 0.012, d: 0.15, s: 0.8, r: 0.08 }, gate: 0.93, filter: { freq: 4500 },
               vibrato: { rate: 5.5, depth: 12, delay: 0.25 } },
    low:     { wave: "sine", fm: { ratio: 1, index: 2, indexEnd: 1.2, decay: 0.2 }, volume: 0.06,
               env: { a: 0.012, d: 0.15, s: 0.8, r: 0.08 }, gate: 0.93, filter: { freq: 3500 } },
    // Soft FM pad: a gentle swell under everything.
    pad:     { wave: "sine", fm: { ratio: 2, index: 0.8, indexEnd: 0.5, decay: 0.5 }, volume: 0.022,
               env: { a: 0.25, d: 0.4, s: 0.8, r: 0.3 }, gate: 1 },
    psg:     { wave: "square", volume: 0.018, gate: 0.6 },
    bass:    { wave: "sine", fm: { ratio: 1, index: 4, indexEnd: 1.5, decay: 0.12 }, volume: 0.24,
               env: { a: 0.003, d: 0.25, s: 0.5, r: 0.05 }, gate: 0.88 },
    drums:   { drums: true, kit: "studio", bits: 8, volume: 0.32, filter: { freq: 7500 } },
    cymbals: { drums: true, kit: "studio", bits: 8, volume: 0.13, filter: { freq: 9000 } },
  },
  sections: {
    intro: {
      psg:  arps(["D", "A"]),
      pad:  pads(["D", "A"]),
      bass: bass(["D", "A"]),
      lead: "R/1 | R/2. E4/4",
      cymbals: "R/1 | R/2 H/4 H/4",
    },
    A:  { lead: TUNE_A, psg: arps(A), pad: pads(A), bass: bass(A), drums: BEAT, cymbals: HATS },
    B:  { lead: TUNE_B, psg: arps(B), pad: pads(B), bass: bass(B), drums: BEAT, cymbals: HATS },
    A2: { lead: TUNE_A, low: transpose(TUNE_A, -12), psg: arps(A), pad: pads(A), bass: bass(A), drums: BEAT, cymbals: HATS },
  },
});
}
