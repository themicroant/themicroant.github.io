/*
 * "Lanternwood" — an original forest overworld theme, N64-style.
 * D major, 6/8, 138 BPM (quarter notes; about 46 dotted-quarter beats a minute).
 * A lilting 6/8 walk through a lantern-lit wood, voiced like a sample-based 64-bit adventure
 * score: a breathy ocarina lead, harp arpeggios, pizzicato bass, a soft string pad, a
 * glockenspiel and a light studio kit, all in a warm hall reverb.
 * Style references for the sound only (N64-era fantasy overworld music); all melodic
 * material is original.
 *
 *   intro   harp and pad; the glockenspiel previews the hook an octave up
 *   A       the ocarina states the hook over D – Bm – G – A
 *   B       the tune lifts to the relative minor and climbs to D6
 *   A2      the hook again, glockenspiel doubling it an octave up, a counter-line in the strings
 * Loops from A. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// Harp arpeggios, one 6/8 bar (six eighths) per chord. "GA" splits the bar between G and A.
const ARP = {
  D:   "D3/8 A3/8 D4/8 F#4/8 A4/8 F#4/8",
  Bm:  "B2/8 F#3/8 B3/8 D4/8 F#4/8 D4/8",
  G:   "G2/8 D3/8 G3/8 B3/8 D4/8 B3/8",
  A:   "A2/8 E3/8 A3/8 C#4/8 E4/8 C#4/8",
  Em:  "E3/8 B3/8 E4/8 G4/8 B4/8 G4/8",
  "F#m": "F#3/8 C#4/8 F#4/8 A4/8 C#5/8 A4/8",
  GA:  "G2/8 D3/8 B3/8 A2/8 E3/8 C#4/8",
};
const arps = (...chords) => chords.map((c) => ARP[c]).join(" | ");

// Pizzicato bass: root on the first beat, fifth on the second (6/8 counts in two).
const PIZZ = { D: "D2/4 D2/8 A2/4 A2/8", Bm: "B1/4 B1/8 F#2/4 F#2/8", G: "G1/4 G1/8 D2/4 D2/8",
  A: "A1/4 A1/8 E2/4 E2/8", Em: "E2/4 E2/8 B2/4 B2/8", "F#m": "F#1/4 F#1/8 C#2/4 C#2/8",
  GA: "G1/4. A1/4." };
const pizz = (...chords) => chords.map((c) => PIZZ[c]).join(" | ");

const CHORDS_A = ["D", "Bm", "G", "A", "D", "Bm", "GA", "D"];
const CHORDS_B = ["Em", "A", "F#m", "Bm", "G", "A", "Bm", "A"];

// The hook: 8 bars of 6/8. Bar 4 breathes, bar 8 holds the tonic across the tie.
const HOOK = "A4/8 D5/8 E5/8 F#5/4 E5/8 | D5/8 B4/8 A4/8 B4/4. | G4/8 B4/8 D5/8 G5/4 F#5/8 | E5/4. C#5/8 B4/8 A4/8"
  + " | A4/8 D5/8 E5/8 F#5/4 A5/8 | B5/4 A5/8 F#5/8 E5/8 D5/8 | G5/8 F#5/8 E5/8 E5/8 D5/8 C#5/8 | D5/4.~ D5/4 R/8";

// Soft kit: kick on 1, rim-like snare on the second pulse, hats on every eighth.
const GROOVE = "K/8 R/8 R/8 S/8 R/8 R/8";
const HATS = "[H/8]x6";

RetroSongs.register({
  id: "lanternwood",
  title: "Lanternwood (Overworld, N64-style)",
  bpm: 138,
  timeSig: "6/8",
  volume: 0.85,
  arrangement: ["intro", "A", "B", "A2"],
  loopFrom: "A",
  reverb: { seconds: 2.4, decay: 3 },
  master: { lowpass: 11000, compress: true },
  instruments: {
    // Ocarina: nearly pure tone, a soft breathy attack, vibrato that blooms on long notes.
    lead:    { harmonics: [1, 0.12, 0.05, 0.02], volume: 0.11, reverb: 0.35,
               env: { a: 0.035, d: 0.2, s: 0.8, r: 0.12 }, gate: 0.94,
               vibrato: { rate: 5.2, depth: 18, delay: 0.25 } },
    // Harp: plucked, bright, decays on its own.
    harp:    { harmonics: [1, 0.4, 0.2, 0.1, 0.05], volume: 0.05, pan: -0.35, reverb: 0.45,
               env: { a: 0.002, d: 0.7, s: 0, r: 0.4 }, gate: 1 },
    // Glockenspiel.
    bell:    { harmonics: [1, 0, 0.25, 0, 0.12, 0, 0.05], volume: 0.045, pan: 0.35, reverb: 0.55,
               env: { a: 0.002, d: 0.5, s: 0, r: 0.3 }, gate: 1 },
    // String pad: detuned saws, dark, slow swell. Plays whole chords with "+".
    pad:     { wave: "sawtooth", voices: 3, detune: 12, volume: 0.012, reverb: 0.5,
               filter: { freq: 1200, q: 0.5 }, env: { a: 0.5, d: 0.6, s: 0.85, r: 0.8 }, gate: 1 },
    // Violin counter-line for the last pass.
    strings: { wave: "sawtooth", voices: 2, detune: 9, volume: 0.05, pan: 0.25, reverb: 0.45,
               filter: { freq: 2400, q: 0.6 }, env: { a: 0.12, d: 0.3, s: 0.85, r: 0.3 }, gate: 1,
               vibrato: { rate: 5.5, depth: 12, delay: 0.2 } },
    // Pizzicato bass: round and short.
    bass:    { harmonics: [1, 0.5, 0.25, 0.1], volume: 0.24, filter: { freq: 800, q: 0.6 },
               env: { a: 0.004, d: 0.22, s: 0.15, r: 0.1 }, gate: 0.9 },
    drums:   { drums: true, kit: "studio", volume: 0.3, reverb: 0.15 },
    cymbals: { drums: true, kit: "studio", volume: 0.22, pan: 0.2, reverb: 0.2 },
  },
  sections: {
    // D | Bm | G | A — harp and pad, the glockenspiel previews the hook's opening.
    intro: {
      harp: arps("D", "Bm", "G", "A"),
      bell: `${transpose(HOOK.split(" | ").slice(0, 3).join(" | "), 12)} | E6/4. R/4.`,
      pad:  "D4+F#4+A4/2.~ | D4+F#4+A4/2. | D4+G4+B4/2. | C#4+E4+A4/2.",
      bass: "D2/2.~ | D2/2. | G1/2. | A1/2.",
      cymbals: "R/2. | R/2. | R/2. | R/4. [H/8]x3",
    },

    // The hook.
    A: {
      lead:    HOOK,
      harp:    arps(...CHORDS_A),
      pad:     "D4+F#4+A4/2. | D4+F#4+B4/2. | D4+G4+B4/2. | C#4+E4+A4/2. | D4+F#4+A4/2. | D4+F#4+B4/2. | D4+G4+B4/4. C#4+E4+A4/4. | D4+F#4+A4/2.",
      bass:    pizz(...CHORDS_A),
      drums:   `[${GROOVE} |]x7 K/8 R/8 R/8 S/8 S/16 S/16 S/8`,
      cymbals: `[${HATS} |]x8`,
    },

    // Em | A | F#m | Bm | G | A | Bm | A — the lift, climbing to D6.
    B: {
      lead:    "G5/4. F#5/8 E5/8 D5/8 | C#5/4. A4/4. | A5/4. G5/8 F#5/8 E5/8 | F#5/4. D5/4. | B5/4 A5/8 G5/4 F#5/8 | E5/4 F#5/8 G5/4 A5/8 | B5/8 A5/8 F#5/8 D6/4. | C#6/4. A5/8 E5/8 C#5/8",
      harp:    arps(...CHORDS_B),
      bell:    "R/2. | R/2. | R/2. | R/2. | R/2. | R/2. | B6/8 A6/8 F#6/8 D7/4. | C#7/4. R/4.",
      pad:     "E4+G4+B4/2. | C#4+E4+A4/2. | C#4+F#4+A4/2. | D4+F#4+B4/2. | D4+G4+B4/2. | C#4+E4+A4/2. | D4+F#4+B4/2. | C#4+E4+G4+A4/2.",
      bass:    pizz(...CHORDS_B),
      drums:   `[${GROOVE} |]x6 K/8 R/8 K/8 S/8 R/8 R/8 | K/8 S/16 S/16 S/8 S/8 S/8 S/8`,
      cymbals: `[${HATS} |]x7 C/4. R/4.`,
    },

    // The hook again: glockenspiel doubles it an octave up, violins answer underneath.
    A2: {
      lead:    HOOK,
      bell:    transpose(HOOK, 12),
      strings: "F#4/2. | F#4/4. D4/4. | B3/2. | C#4/4. E4/4. | F#4/2. | D4/4. F#4/4. | B4/4. A4/4. | A4/4.~ A4/4 R/8",
      harp:    arps(...CHORDS_A),
      pad:     "D4+F#4+A4/2. | D4+F#4+B4/2. | D4+G4+B4/2. | C#4+E4+A4/2. | D4+F#4+A4/2. | D4+F#4+B4/2. | D4+G4+B4/4. C#4+E4+A4/4. | D4+F#4+A4/2.",
      bass:    pizz(...CHORDS_A),
      drums:   `[${GROOVE} |]x6 K/8 R/8 K/8 S/8 R/8 S/8 | K/8 R/8 R/8 [S/16]x6`,
      cymbals: `C/4. [H/8]x3 | [${HATS} |]x6 [H/8]x6`,
    },
  },
});
}
