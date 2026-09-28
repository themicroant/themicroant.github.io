/*
 * "Ashen Horizon II" — the sequel to Ashen Horizon, in a fuller N64-style sound.
 * Same world (B minor, 138 BPM, Gothenburg-style twin leads, galloping guitars), but
 * voiced like a sample-based 64-bit soundtrack instead of a chip: detuned string pads,
 * a vibrato "choir", a glockenspiel, overdriven guitars panned hard left and right,
 * a round finger bass, a studio drum kit and a big hall reverb over everything.
 * Style references for the sound, not the notes: N64-era rock and orchestral scores
 * (sampled distorted guitars, string pads, heavy reverb). All melodic material is original;
 * the finale quotes Part 1's own twin lead.
 *
 *   dawn    strings, choir and glockenspiel state Part 1's opening motif slowly; tom swell
 *   charge  the band enters: a new lead, twinned in thirds, gallop and double-kick
 *   twin    brighter VI – III – VII – V progression, a higher twin melody, hard stop
 *   bridge  half-time breakdown: choir over sparse chugs, snare/tom build-up
 *   finale  Part 1's twin lead returns with the full band and a choir on top
 * Loops from charge. Design notes: docs/song-notes.md
 */
RetroSongs.register({
  id: "ashen-horizon-ii",
  title: "Ashen Horizon II (N64-style)",
  bpm: 138,
  volume: 0.55,
  arrangement: ["dawn", "charge", "twin", "bridge", "finale"],
  loopFrom: "charge",
  reverb: { seconds: 2.6, decay: 2.8 },
  master: { lowpass: 12000, compress: true },
  instruments: {
    // Twin leads: two detuned saws each, soft drive, a "cab" lowpass, delayed vibrato.
    lead:    { wave: "sawtooth", voices: 2, detune: 7, drive: 0.25, volume: 0.075, pan: -0.2, reverb: 0.3,
               filter: { freq: 3400, q: 0.8 }, env: { a: 0.01, d: 0.2, s: 0.8, r: 0.12 }, gate: 0.97,
               vibrato: { rate: 5.5, depth: 16, delay: 0.22 } },
    twin:    { wave: "sawtooth", voices: 2, detune: 7, drive: 0.25, volume: 0.055, pan: 0.2, reverb: 0.3,
               filter: { freq: 3000, q: 0.8 }, env: { a: 0.01, d: 0.2, s: 0.8, r: 0.12 }, gate: 0.97,
               vibrato: { rate: 5.2, depth: 16, delay: 0.25 } },
    // Rhythm guitars: heavily driven, panned hard left (root) and right (fifth).
    gtrL:    { wave: "sawtooth", drive: 0.85, volume: 0.05, pan: -0.7, reverb: 0.08,
               filter: { freq: 2400, q: 0.9 }, env: { a: 0.003, d: 0.08, s: 0.75, r: 0.04 }, gate: 0.85 },
    gtrR:    { wave: "sawtooth", drive: 0.85, volume: 0.045, pan: 0.7, reverb: 0.08,
               filter: { freq: 2400, q: 0.9 }, env: { a: 0.003, d: 0.08, s: 0.75, r: 0.04 }, gate: 0.85 },
    // String pad: three detuned saws, dark filter, slow swell.
    pad:     { wave: "sawtooth", voices: 3, detune: 14, volume: 0.03, pan: -0.45, reverb: 0.5,
               filter: { freq: 1300, q: 0.5 }, env: { a: 0.45, d: 0.6, s: 0.85, r: 0.9 }, gate: 1 },
    pad2:    { wave: "sawtooth", voices: 3, detune: 14, volume: 0.026, pan: 0.45, reverb: 0.5,
               filter: { freq: 1300, q: 0.5 }, env: { a: 0.45, d: 0.6, s: 0.85, r: 0.9 }, gate: 1 },
    // "Choir": soft harmonics, chorus and vibrato, lots of reverb.
    choir:   { harmonics: [1, 0.35, 0.18, 0.06, 0.03], voices: 3, detune: 11, volume: 0.07, reverb: 0.6,
               filter: { freq: 2200 }, env: { a: 0.22, d: 0.3, s: 0.85, r: 0.5 }, gate: 1,
               vibrato: { rate: 5, depth: 13, delay: 0.3 } },
    // Glockenspiel: bright, fast decay, no sustain.
    bell:    { harmonics: [1, 0, 0.25, 0, 0.12, 0, 0.05], volume: 0.05, pan: 0.3, reverb: 0.55,
               env: { a: 0.002, d: 0.5, s: 0, r: 0.3 }, gate: 1 },
    // Arpeggio keys, quiet, off to the right.
    harmony: { harmonics: [1, 0.45, 0.2, 0.1], volume: 0.035, pan: 0.35, reverb: 0.4,
               env: { a: 0.004, d: 0.18, s: 0.3, r: 0.15 } },
    // Finger bass: round, filtered, centred, dry.
    bass:    { harmonics: [1, 0.6, 0.3, 0.15, 0.08], volume: 0.26, filter: { freq: 900, q: 0.6 },
               env: { a: 0.006, d: 0.25, s: 0.6, r: 0.07 }, gate: 0.9 },
    drums:   { drums: true, kit: "studio", volume: 0.5, reverb: 0.12 },
    cymbals: { drums: true, kit: "studio", volume: 0.32, pan: 0.2, reverb: 0.18 },
  },
  sections: {
    // Bm | G | D | F# — Part 1's motif, slowly, over strings.
    dawn: {
      choir:   "B4/2 D5/2 | F#5/2. E5/4 | D5/2 E5/4 F#5/4 | C#5/1",
      bell:    "[B5/8 F#6/8 D6/8 F#6/8]x2 | [B5/8 G6/8 D6/8 G6/8]x2 | [A5/8 F#6/8 D6/8 F#6/8]x2 | [A#5/8 F#6/8 C#6/8 F#6/8]x2",
      pad:     "B3/1 | B3/1 | A3/1 | A#3/1",
      pad2:    "F#4/1 | G4/1 | F#4/1 | F#4/1",
      bass:    "B1/1 | G1/1 | D2/1 | F#1/1",
      drums:   "R/1 | R/1 | T/4 R/4 T/4 R/4 | T/8 T/8 T/8 T/8 [S/16]x8",
      cymbals: "C/1 | R/1 | R/1 | R/1",
    },

    // Bm | G | A | F# — the band crashes in with a new lead, twinned in thirds.
    charge: {
      lead:    "F#5/4 B5/8 A5/8 F#5/4 D5/8 E5/8 | D5/4 B4/8 D5/8 G5/4 F#5/8 E5/8 | E5/4 A4/8 C#5/8 E5/4 A5/8 G5/8 | F#5/2 E5/8 C#5/8 A#4/8 C#5/8",
      twin:    "D5/4 F#5/8 F#5/8 D5/4 B4/8 C#5/8 | B4/4 G4/8 B4/8 E5/4 D5/8 C#5/8 | C#5/4 E4/8 A4/8 C#5/4 E5/8 E5/8 | A#4/2 C#5/8 A#4/8 F#4/8 A#4/8",
      gtrL:    "[B2/16 B2/16 B2/8]x3 B2/8 A2/8 | [G2/16 G2/16 G2/8]x3 G2/8 A2/8 | [A2/16 A2/16 A2/8]x3 A2/8 B2/8 | [F#2/16 F#2/16 F#2/8]x2 F#2/8 G2/8 A2/8 A#2/8",
      gtrR:    "[F#3/16 F#3/16 F#3/8]x3 F#3/8 E3/8 | [D3/16 D3/16 D3/8]x3 D3/8 E3/8 | [E3/16 E3/16 E3/8]x3 E3/8 F#3/8 | [C#3/16 C#3/16 C#3/8]x2 C#3/8 D3/8 E3/8 F3/8",
      pad:     "B3/1 | B3/1 | C#4/1 | A#3/1",
      pad2:    "F#4/1 | G4/1 | A4/1 | F#4/1",
      bass:    "[B1/8]x8 | [G1/8]x8 | [A1/8]x8 | [F#1/8]x4 F#1/8 G1/8 A1/8 A#1/8",
      drums:   "[[K/16]x8 S/8 K/16 K/16 [K/16]x4]x3 | [K/16]x8 [S/16]x4 [T/16]x4",
      cymbals: "C/4 [H/8]x6 | [H/8]x8 | C/4 [H/8]x6 | [H/8]x4 O/4 C/4",
    },

    // G | D | A | F# — brighter and higher, ending in a hard stop.
    twin: {
      lead:    "B5/4. A5/8 G5/4 F#5/8 G5/8 | A5/4. F#5/8 D5/2 | E5/8 F#5/8 G5/8 A5/8 C#6/4 B5/8 A5/8 | A#5/2. R/4",
      twin:    "G5/4. F#5/8 D5/4 D5/8 E5/8 | F#5/4. D5/8 A4/2 | C#5/8 D5/8 E5/8 F#5/8 A5/4 G5/8 E5/8 | F#5/2. R/4",
      harmony: "[G4/16 B4/16 D5/16 B4/16]x4 | [D4/16 F#4/16 A4/16 F#4/16]x4 | [A4/16 C#5/16 E5/16 C#5/16]x4 | [F#4/16 A#4/16 C#5/16 A#4/16]x3 R/4",
      gtrL:    "[G2/16 G2/16 G2/8]x4 | [D2/16 D2/16 D2/8]x4 | [A2/16 A2/16 A2/8]x4 | [F#2/16 F#2/16 F#2/8]x2 F#2/4 R/4",
      gtrR:    "[D3/16 D3/16 D3/8]x4 | [A2/16 A2/16 A2/8]x4 | [E3/16 E3/16 E3/8]x4 | [C#3/16 C#3/16 C#3/8]x2 C#3/4 R/4",
      pad:     "B3/1 | A3/1 | C#4/1 | A#3/1",
      pad2:    "D4/1 | F#4/1 | E4/1 | C#4/1",
      bass:    "[G1/8 G2/8]x4 | [D2/8 D3/8]x4 | [A1/8 A2/8]x4 | [F#1/8 F#2/8]x2 F#1/4 R/4",
      drums:   "[K/8 K/8 S/8 K/8 K/8 K/8 S/8 K/8]x3 | K/8 K/8 S/8 K/8 S/4 R/4",
      cymbals: "C/4 [H/8]x6 | C/4 [H/8]x6 | C/4 [H/8]x6 | C/2. R/4",
    },

    // Bm | G | Em | F# — half-time breakdown, building back up.
    bridge: {
      choir:   "F#5/2 E5/4 D5/4 | D5/2 B4/2 | G5/2 F#5/4 E5/4 | F#5/1",
      bell:    "[B5/8 F#6/8 D6/8 F#6/8]x2 | [B5/8 G6/8 D6/8 G6/8]x2 | [B5/8 G6/8 E6/8 G6/8]x2 | [A#5/8 F#6/8 C#6/8 F#6/8]x2",
      pad:     "B3/1 | B3/1 | B3/1 | A#3/1",
      pad2:    "D4/1 | D4/1 | E4/1 | C#4/1",
      gtrL:    "B2/8 R/8 R/4 B2/8 B2/8 R/4 | G2/8 R/8 R/4 G2/8 G2/8 R/4 | E2/8 R/8 R/4 E2/8 E2/8 R/4 | [F#2/16]x16",
      gtrR:    "F#3/8 R/8 R/4 F#3/8 F#3/8 R/4 | D3/8 R/8 R/4 D3/8 D3/8 R/4 | B2/8 R/8 R/4 B2/8 B2/8 R/4 | [C#3/16]x16",
      bass:    "B1/2. B1/4 | G1/2. G1/4 | E2/2. E2/4 | F#1/2 F#1/8 G1/8 A1/8 A#1/8",
      drums:   "K/4 R/4 S/2 | K/4 K/8 K/8 S/2 | K/4 R/4 S/2 | [S/16]x12 [T/16]x4",
      cymbals: "O/2 O/2 | O/2 O/2 | O/2 O/2 | R/1",
    },

    // Bm | G | D | F# → Bm — Part 1's twin lead returns with everything.
    finale: {
      lead:    "B4/8 D5/8 F#5/4. E5/8 D5/8 E5/8 | G5/4. F#5/8 E5/8 D5/8 B4/4 | A4/8 D5/8 F#5/4. E5/8 D5/8 F#5/8 | E5/8 F#5/8 G5/8 F#5/8 E5/8 C#5/8 B4/4",
      twin:    "F#4/8 B4/8 D5/4. C#5/8 B4/8 C#5/8 | E5/4. D5/8 C#5/8 B4/8 G4/4 | F#4/8 A4/8 D5/4. C#5/8 B4/8 D5/8 | C#5/8 D5/8 E5/8 D5/8 C#5/8 A#4/8 F#4/4",
      choir:   "F#5/1 | G5/1 | F#5/1 | E5/2 F#5/2",
      gtrL:    "[B2/16 B2/16 B2/8]x3 D3/8 C#3/8 | [G2/16 G2/16 G2/8]x3 A2/8 B2/8 | [D3/16 D3/16 D3/8]x3 E3/8 F#3/8 | [F#2/16 F#2/16 F#2/8]x3 A2/8 A#2/8",
      gtrR:    "[F#3/16 F#3/16 F#3/8]x3 A3/8 G#3/8 | [D3/16 D3/16 D3/8]x3 E3/8 F#3/8 | [A3/16 A3/16 A3/8]x3 B3/8 C#4/8 | [C#3/16 C#3/16 C#3/8]x3 E3/8 F3/8",
      pad:     "B3/1 | B3/1 | A3/1 | A#3/1",
      pad2:    "D4/1 | D4/1 | D4/1 | C#4/1",
      bass:    "[B1/8 B2/8]x4 | [G1/8 G2/8]x4 | [D2/8 D3/8]x4 | [F#1/8 F#2/8]x3 A1/8 A#1/8",
      drums:   "[[K/16]x8 S/8 K/16 K/16 [K/16]x4]x3 | [K/16]x4 [S/16]x8 K/8 S/8",
      cymbals: "C/4 [H/8]x6 | C/4 [H/8]x6 | C/4 [H/8]x6 | C/4 [H/8]x4 C/4",
    },
  },
});
