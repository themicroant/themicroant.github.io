/*
 * "Cinder Crown" — an original melodic metal theme in a Sega Genesis style.
 * D minor, 12/8, 150 BPM (quarter notes; the dotted-quarter pulse is 100 a minute).
 * A triplet "shuffle gallop" like epic heavy metal, voiced on YM2612-style FM: twin FM
 * leads, driven FM power chords split hard left (root) and right (fifth), slap bass, orchestra-hit
 * chords, PSG arpeggios and bit-crushed drums. The bridge switches to straight 4/4 double time.
 * Style references for technique only (NWOBHM-style shuffle gallops, Mega Drive action
 * soundtracks); every melody and riff is original.
 *
 *   intro   orchestra-hit chords and slap bass, toms
 *   riff    the shuffle gallop: Dm – Bb – C – A
 *   hook    the melody on the lead alone
 *   hook2   the melody twinned, PSG arpeggios on top
 *   bridge  4/4 double time: tremolo chords, blast beat, a twin lead climbing to D6
 *   finale  the melody once more, landing on a held D minor chord
 * Loops from riff. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const PC = { Dm: "D2+A2", Bb: "Bb1+F2", C: "C2+G2", A: "A1+E2", Gm: "G1+D2", F: "F2+C3" };
const ROOT = { Dm: "D2", Bb: "Bb1", C: "C2", A: "A1", Gm: "G1", F: "F2" };
const ARP = { Dm: "D4/8 F4/8 A4/8", Bb: "Bb3/8 D4/8 F4/8", C: "C4/8 E4/8 G4/8", A: "A3/8 C#4/8 E4/8" };

// The shuffle gallop: long-short in each dotted-quarter pulse (a 12/8 bar has four).
// Genesis-style power chords are split across the stereo field: root hard left, fifth hard
// right. It sounds like a chord in the middle at half the cost of two full chords.
const shuffle = (side, ...chords) => chords.map((c) => {
  const note = PC[c].split("+")[side === "L" ? 0 : 1];
  return `[${note}/4 ${note}/8]x4`;
}).join(" | ");
const slap = (...chords) => chords.map((c) => `[${ROOT[c]}/4 ${ROOT[c]}/8]x3 ${ROOT[c]}/8 ${ROOT[c]}/8 ${ROOT[c]}/8`).join(" | ");
const arps = (...chords) => chords.map((c) => `[${ARP[c]}]x4`).join(" | ");
const SHUFFLE_DRUMS = "K/4 K/8 S/4 K/8 K/4 K/8 S/4 K/8";
const RIDE = "[H/4 H/8]x4";

// The melody: rises through the chord, falls back by step. Bar 3 is bar 1's shape on C.
const HOOK = "D5/4 F5/8 A5/4. G5/4 F5/8 E5/4 D5/8 | F5/4. D5/4 Bb4/8 F5/4 G5/8 F5/4 D5/8"
  + " | E5/4 G5/8 C6/4. Bb5/4 A5/8 G5/4 E5/8 | C#5/4. E5/4. A5/2.";
const TWIN = "Bb4/4 D5/8 F5/4. E5/4 D5/8 C#5/4 Bb4/8 | D5/4. Bb4/4 G4/8 D5/4 E5/8 D5/4 Bb4/8"
  + " | C5/4 E5/8 A5/4. G5/4 F5/8 E5/4 C5/8 | A4/4. C#5/4. E5/2.";
const firstBars = (text, n) => text.split(" | ").slice(0, n).join(" | ");

RetroSongs.register({
  id: "cinder-crown",
  title: "Cinder Crown (Genesis-style Metal)",
  bpm: 150,
  timeSig: "12/8",
  volume: 0.4,
  arrangement: ["intro", "riff", "hook", "hook2", "bridge", "finale"],
  loopFrom: "riff",
  master: { compress: true },
  instruments: {
    // FM leads, as in Obsidian Tide: bright, slightly driven, vibrato after the attack.
    lead:    { wave: "sine", fm: { ratio: 1, index: 3.2, indexEnd: 2.2, decay: 0.25 }, drive: 0.3, volume: 0.09,
               env: { a: 0.006, d: 0.15, s: 0.85, r: 0.07 }, gate: 0.95, filter: { freq: 5000 },
               vibrato: { rate: 6, depth: 14, delay: 0.22 } },
    twin:    { wave: "sine", fm: { ratio: 1, index: 2.6, indexEnd: 1.8, decay: 0.25 }, drive: 0.3, volume: 0.06,
               env: { a: 0.006, d: 0.15, s: 0.85, r: 0.07 }, gate: 0.95, filter: { freq: 4500 },
               vibrato: { rate: 5.6, depth: 14, delay: 0.25 } },
    // FM rhythm guitars: roots hard left, fifths hard right.
    gtrL:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4, decay: 0.08 }, drive: 0.75, volume: 0.05, pan: -1,
               filter: { freq: 4500, q: 0.8 }, env: { a: 0.002, d: 0.06, s: 0.7, r: 0.03 }, gate: 0.85 },
    gtrR:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4, decay: 0.08 }, drive: 0.75, volume: 0.045, pan: 1,
               filter: { freq: 4200, q: 0.8 }, env: { a: 0.002, d: 0.06, s: 0.7, r: 0.03 }, gate: 0.85 },
    bass:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 1.8, decay: 0.15 }, volume: 0.26,
               env: { a: 0.002, d: 0.3, s: 0.55, r: 0.05 }, gate: 0.9 },
    psg:     { wave: "square", volume: 0.02, gate: 0.6 },
    // Orchestra hit: whole triads in one token.
    hit:     { wave: "sine", fm: { ratio: 3.5, index: 7, indexEnd: 0.5, decay: 0.2 }, volume: 0.045,
               env: { a: 0.002, d: 0.35, s: 0.15, r: 0.12 } },
    drums:   { drums: true, kit: "studio", bits: 6, volume: 0.5, filter: { freq: 7000 } },
    cymbals: { drums: true, kit: "studio", bits: 5, volume: 0.22, filter: { freq: 9000 } },
  },
  sections: {
    // Dm | Bb | C | A — stabbed orchestra chords over slap bass.
    intro: {
      hit:     "D4+F4+A4/4 R/8 R/4. R/2. | Bb3+D4+F4/4 R/8 R/4. R/2. | C4+E4+G4/4 R/8 R/4. C4+E4+G4/4 R/8 R/4. | A3+C#4+E4/4. A3+C#4+E4/4. A3+C#4+E4/4 R/8 R/4.",
      bass:    slap("Dm", "Bb", "C", "A"),
      drums:   "K/2. R/2. | K/2. R/2. | K/2. K/4. R/4. | [T/8]x6 [S/16]x12",
      cymbals: "C/2. R/2. | R/1. | C/2. R/2. | R/1.",
    },

    // The shuffle gallop, PSG arpeggios on top.
    riff: {
      gtrL:    shuffle("L", "Dm", "Bb", "C", "A"),
      gtrR:    shuffle("R", "Dm", "Bb", "C", "A"),
      psg:     arps("Dm", "Bb", "C", "A"),
      bass:    slap("Dm", "Bb", "C", "A"),
      drums:   `[${SHUFFLE_DRUMS} |]x3 K/4 K/8 S/4 K/8 [S/16]x6 T/8 T/8 T/8`,
      cymbals: `C/1. | [${RIDE} |]x3`,
    },

    hook: {
      lead:    HOOK,
      gtrL:    shuffle("L", "Dm", "Bb", "C", "A"),
      gtrR:    shuffle("R", "Dm", "Bb", "C", "A"),
      bass:    slap("Dm", "Bb", "C", "A"),
      drums:   `[${SHUFFLE_DRUMS} |]x4`,
      cymbals: `C/4 H/8 [H/4 H/8]x3 | [${RIDE} |]x3`,
    },

    hook2: {
      lead:    HOOK,
      twin:    TWIN,
      psg:     arps("Dm", "Bb", "C", "A"),
      gtrL:    shuffle("L", "Dm", "Bb", "C", "A"),
      gtrR:    shuffle("R", "Dm", "Bb", "C", "A"),
      bass:    slap("Dm", "Bb", "C", "A"),
      drums:   `[${SHUFFLE_DRUMS} |]x3 [S/16]x12 [T/8]x6`,
      cymbals: `C/4 H/8 [H/4 H/8]x3 | [${RIDE} |]x2 R/1.`,
    },

    // Straight 4/4 double time: Gm | Bb | F | A, twin lead climbing to D6.
    bridge: {
      timeSig: "4/4",
      lead:    "G5/4 A5/4 Bb5/4 D6/4 | C6/4 Bb5/8 A5/8 F5/2 | A5/4 Bb5/4 C6/4 F6/4 | E6/2 C#6/4 A5/4",
      twin:    "D5/4 F5/4 G5/4 Bb5/4 | A5/4 G5/8 F5/8 D5/2 | F5/4 G5/4 A5/4 C6/4 | C#6/2 A5/4 E5/4",
      gtrL:    "[G1/16]x16 | [Bb1/16]x16 | [F2/16]x16 | [A1/16]x16",
      gtrR:    "[D2/16]x16 | [F2/16]x16 | [C3/16]x16 | [E2/16]x16",
      bass:    "[G1/8]x8 | [Bb1/8]x8 | [F2/8]x8 | [A1/8]x8",
      drums:   "[[K/16 K/16 S/16 K/16]x4 |]x3 [S/16]x8 [T/16]x8",
      cymbals: "C/4 [H/8]x6 | [H/8]x8 | C/4 [H/8]x6 | [H/8]x6 C/4",
    },

    // The melody's first three bars, then a held D minor for the loop to answer.
    finale: {
      lead:    `${firstBars(HOOK, 3)} | D5/1.`,
      twin:    `${firstBars(TWIN, 3)} | A4/1.`,
      hit:     "R/1. | R/1. | R/1. | D4+F4+A4/2. R/2.",
      gtrL:    `${shuffle("L", "Dm", "Bb", "C")} | D2/1.`,
      gtrR:    `${shuffle("R", "Dm", "Bb", "C")} | A2/1.`,
      bass:    `${slap("Dm", "Bb", "C")} | D2/1.`,
      drums:   `[${SHUFFLE_DRUMS} |]x3 K/2. [T/8]x6`,
      cymbals: `C/4 H/8 [H/4 H/8]x3 | [${RIDE} |]x2 C/1.`,
    },
  },
});
}
