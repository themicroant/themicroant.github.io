/*
 * "Sky Harbor" — an original swing platformer level theme, N64-style.
 * F major, 4/4, 152 BPM, swung. A cheeky, bouncy stage theme for a floating harbour of
 * airships, voiced like a sample-based 64-bit platformer: a reedy sax lead, a brass section
 * playing chord stabs, an FM electric piano comping, walking upright bass and a jazz kit with
 * a ride cymbal. The last pass jumps up a whole step, to G.
 * Style references for the sound only (N64-era jazzy platformer level music); all melodic
 * material is original.
 *
 *   intro   brass fanfare with a triplet push, walking bass pickup
 *   A       the sax hook over F6 – D7 – Gm7 – C7, brass pushes into bars 4 and 8
 *   B       bridge: long sax lines with triplet turns, ending on D7 to set up G
 *   A_UP    the whole A section transposed up 2 semitones; its last bar pivots on C7 back to F
 * Swing is written out with triplets: a swung pair of eighths is X/4t Y/8t (see sw() below).
 * Loops from the intro. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// Swung eighths: "A4 C5 D5 F5" -> "A4/4t C5/8t D5/4t F5/8t" (long-short pairs, one beat each).
const sw = (notes) => notes.trim().split(/\s+/).map((n, i) => n + (i % 2 ? "/8t" : "/4t")).join(" ");

// Chord voicings for the piano; brass plays them an octave up.
const V = {
  F6: "F3+A3+C4+D4", D7: "F#3+A3+C4+D4", Gm7: "F3+G3+Bb3+D4", C7: "E3+G3+Bb3+C4",
  F7: "Eb3+F3+A3+C4", Bb: "F3+Bb3+D4", Bbm: "F3+Bb3+Db4", F: "F3+A3+C4+F4",
  Bb6: "F3+G3+Bb3+D4", Bbm6: "F3+G3+Bb3+Db4", Am7: "G3+A3+C4+E4",
};
const up = (chord) => transpose(chord, 12);
// Piano comp: chord on 1, again on the swung "and" of 2. comp2 splits the bar between two chords.
const comp = (c) => `${V[c]}/4 R/4t ${V[c]}/8t R/2`;
const comp2 = (a, b) => `${V[a]}/4 R/4t ${V[a]}/8t ${V[b]}/4 R/4t ${V[b]}/8t`;
// Brass push: a chord anticipating beat 4 on the swung "and" of 3, tied over.
const push = (c) => `R/2 R/4t ${up(V[c])}/8t~ ${up(V[c])}/4`;

const RIDE = "H/4 H/4t H/8t H/4 H/4t H/8t";
const GROOVE = "K/4 R/4 K/4 R/4t S/8t";
const FILL = "[S/4t S/8t]x2 S/4t S/4t T/4t";

const A = {
  lead: [
    `R/4 ${sw("A4 C5 D5 F5")} A5/4`,
    "G5/2t F#5/4t A5/4 F#5/4",
    `R/4 ${sw("Bb4 D5 F5 A5")} G5/4`,
    `E5/2 ${sw("C5 D5")} E5/4`,
    `R/4 ${sw("A4 C5 D5 F5")} C6/4~`,
    `C6/2 ${sw("Bb5 A5")} G5/4`,
    `${sw("F5 D5 Bb4 D5")} ${sw("F5 Db5 Bb4 Db5")}`,
    `C5/4 ${sw("A4 G4")} F4/2`,
  ].join(" | "),
  ep: [comp("F6"), comp("D7"), comp("Gm7"), comp("C7"), comp("F6"), comp("F7"), comp2("Bb", "Bbm"), comp2("F6", "C7")].join(" | "),
  brass: `R/1 | R/1 | R/1 | ${push("C7")} | R/1 | R/1 | R/1 | ${push("C7")}`,
  bass: "F2/4 A2/4 C3/4 D3/4 | D2/4 F#2/4 A2/4 C3/4 | G2/4 Bb2/4 D3/4 E3/4 | C3/4 Bb2/4 G2/4 E2/4"
    + " | F2/4 A2/4 C3/4 A2/4 | F2/4 Eb3/4 C3/4 A2/4 | Bb2/4 D3/4 Bb2/4 Db3/4 | F2/4 A2/4 C3/4 E2/4",
};

// A, a whole step up, with a new last bar: G6 then C7, which is IV7 in G and V7 back in F.
const lastBar = (text, bar) => [...text.split(" | ").slice(0, -1), bar].join(" | ");
const A_UP = {
  lead:  lastBar(transpose(A.lead, 2), `D5/4 ${sw("B4 A4")} G4/4 R/4`),
  ep:    lastBar(transpose(A.ep, 2), `${transpose(V.F6, 2)}/4 R/4t ${transpose(V.F6, 2)}/8t ${V.C7}/4 R/4t ${V.C7}/8t`),
  brass: lastBar(transpose(A.brass, 2), push("C7")),
  bass:  lastBar(transpose(A.bass, 2), "G2/4 B2/4 C3/4 E2/4"),
};

RetroSongs.register({
  id: "sky-harbor",
  title: "Sky Harbor (Platformer, N64-style)",
  bpm: 152,
  volume: 0.75,
  arrangement: ["intro", "A", "B", "A_UP"],
  reverb: { seconds: 1.8, decay: 3.2 },
  master: { lowpass: 12000, compress: true },
  instruments: {
    // Sax: reedy odd-leaning harmonics, a little breath on the attack, late vibrato.
    lead:    { harmonics: [1, 0.5, 0.6, 0.3, 0.25, 0.12, 0.08], volume: 0.12, pan: -0.1, reverb: 0.25,
               filter: { freq: 3200, q: 0.7 }, env: { a: 0.025, d: 0.15, s: 0.8, r: 0.08 }, gate: 0.93,
               vibrato: { rate: 5.8, depth: 14, delay: 0.3 } },
    // Brass section: detuned saws through a warm filter. Chords, so each voice is quiet.
    brass:   { wave: "sawtooth", voices: 2, detune: 8, volume: 0.03, pan: 0.3, reverb: 0.3,
               filter: { freq: 2000, q: 1 }, env: { a: 0.03, d: 0.2, s: 0.7, r: 0.12 }, gate: 0.9 },
    // FM electric piano: a gentle FM bell that softens as it rings.
    ep:      { wave: "sine", fm: { ratio: 1, index: 1.8, indexEnd: 0.3, decay: 0.5 }, volume: 0.03, pan: -0.35,
               reverb: 0.25, env: { a: 0.003, d: 1.2, s: 0.2, r: 0.25 }, gate: 0.95 },
    // Upright bass: round and woody, each note blooms and fades.
    bass:    { harmonics: [1, 0.45, 0.2, 0.08], volume: 0.28, filter: { freq: 650, q: 0.7 },
               env: { a: 0.006, d: 0.35, s: 0.35, r: 0.08 }, gate: 0.92 },
    drums:   { drums: true, kit: "studio", volume: 0.34, reverb: 0.12 },
    cymbals: { drums: true, kit: "studio", volume: 0.17, pan: 0.25, reverb: 0.15 },
  },
  sections: {
    // Fanfare: F – Am/F – Bb – C7, a triplet push into the groove.
    intro: {
      brass:   `${up(V.F)}/4 R/4t ${up(V.F)}/8t R/4t ${up(V.Gm7)}/8t~ ${up(V.Gm7)}/4 | ${up(V.Am7)}/2. R/4`
             + ` | ${up(V.Bb)}/4t ${up(V.Bb)}/4t ${up(V.Bb)}/4t ${up(V.C7)}/2 | R/1`,
      ep:      `R/1 | R/1 | R/1 | ${comp("C7")}`,
      bass:    "F2/4 R/4t F2/8t R/4t G2/8t~ G2/4 | A2/2. R/4 | Bb2/4t Bb2/4t Bb2/4t C3/2 | C2/4 E2/4 G2/4 Bb2/4",
      drums:   "K/4 R/4t K/8t R/4t K/8t R/4 | K/2. R/4 | S/4t S/4t S/4t K/2 | K/4 [S/4t S/8t]x2 S/4t T/8t",
      cymbals: `C/1 | R/1 | R/2 C/2 | ${RIDE}`,
    },

    A: {
      ...A,
      drums:   `[${GROOVE} |]x7 ${FILL}`,
      cymbals: `C/4 H/4t H/8t H/4 H/4t H/8t | [${RIDE} |]x7`,
    },

    // Bb6 | Bbm6 | Am7 | D7 | Gm7 | C7 | F | D7 — long lines, triplet turns, D7 sets up G.
    B: {
      lead:    "D5/2. C5/4~ | C5/2 Db5/4t C5/4t Bb4/4t | E5/2. G5/4~ | G5/2 F#5/4t A5/4t C6/4t"
             + ` | Bb5/2. A5/4 | G5/4 E5/4 C5/4 Bb4/4 | A4/2 R/4 C5/4 | ${sw("D5 F#5 A5 C6")} ${sw("D6 C6 A5 F#5")}`,
      ep:      [comp("Bb6"), comp("Bbm6"), comp("Am7"), comp("D7"), comp("Gm7"), comp("C7"), comp("F"), comp("D7")].join(" | "),
      brass:   `${up(V.Bb6)}/1 | ${up(V.Bbm6)}/1 | R/1 | ${push("D7")} | ${up(V.Gm7)}/1 | ${up(V.C7)}/2 R/2 | R/1 | ${up(V.D7)}/4t ${up(V.D7)}/4t ${up(V.D7)}/4t R/2`,
      bass:    "Bb1/4 D2/4 F2/4 G2/4 | Bb1/4 Db2/4 F2/4 G2/4 | A1/4 C2/4 E2/4 G2/4 | D2/4 F#2/4 A2/4 C3/4"
             + " | G2/4 Bb2/4 D3/4 F2/4 | C2/4 E2/4 G2/4 Bb2/4 | F2/4 A2/4 C3/4 C#3/4 | D3/4 C3/4 A2/4 F#2/4",
      drums:   `[K/4 R/4 R/4 R/4t S/8t |]x7 ${FILL}`,
      cymbals: `[${RIDE} |]x6 C/1 | ${RIDE}`,
    },

    A_UP: {
      ...A_UP,
      drums:   `[${GROOVE} |]x7 ${FILL}`,
      cymbals: `C/4 H/4t H/8t H/4 H/4t H/8t | [${RIDE} |]x6 C/2 H/4 C/4`,
    },
  },
});
}
