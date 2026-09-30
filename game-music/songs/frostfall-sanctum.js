/*
 * "Frostfall Sanctum" — an original ice temple dungeon theme, N64-style.
 * E minor, 3/4, 88 BPM. A slow, echoing waltz for a frozen shrine, voiced like a sample-based
 * 64-bit adventure score: a music-box melody, harp arpeggios, a wordless choir, low strings,
 * a deep sub bass, timpani, and a very long cathedral reverb.
 * Style references for the sound only (N64-era temple and dungeon music: sparse, cold,
 * cavernous); all melodic material is original.
 *
 *   veil    harp and choir drone on Em; timpani rolls far away
 *   chant   the music box states the melody over Em – C – Am – B, with suspensions tied over
 *           the bar lines
 *   heart   the choir takes a new line over C – D – Bm – Em – Am – D – G – B, timpani pulse
 *   chant2  the melody an octave up on the music box, the choir holding it underneath
 * Loops from chant. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// Harp: one 3/4 bar (six eighths) per chord.
const ARP = {
  Em: "E3/8 B3/8 E4/8 G4/8 B4/8 G4/8",
  C:  "C3/8 G3/8 C4/8 E4/8 G4/8 E4/8",
  Am: "A2/8 E3/8 A3/8 C4/8 E4/8 C4/8",
  B:  "B2/8 F#3/8 B3/8 D#4/8 F#4/8 D#4/8",
  G:  "G2/8 D3/8 G3/8 B3/8 D4/8 B3/8",
  D:  "D3/8 A3/8 D4/8 F#4/8 A4/8 F#4/8",
  Bm: "B2/8 F#3/8 B3/8 D4/8 F#4/8 D4/8",
};
const arps = (chords) => chords.map((c) => ARP[c]).join(" | ");

// Low strings, one sustained chord per bar.
const PAD = {
  Em: "E3+B3+G4", C: "E3+C4+G4", Am: "E3+A3+C4", B: "D#3+B3+F#4", G: "D3+B3+G4",
  D: "D3+A3+F#4", Bm: "D3+B3+F#4",
};
const pads = (chords) => chords.map((c) => `${PAD[c]}/2.`).join(" | ");

const CHANT = ["Em", "C", "Am", "B", "Em", "G", "Am", "B"];
const HEART = ["C", "D", "Bm", "Em", "Am", "D", "G", "B"];

// The melody. The D#5 in bar 4 hangs over into bar 5 before resolving up to E.
const MELODY = "B4/4 E5/4 F#5/4 | G5/2 E5/4 | A5/4 G5/8 F#5/8 E5/4 | F#5/4 D#5/2~"
  + " | D#5/4 E5/2 | G5/4 F#5/4 D5/4 | E5/4. C5/8 A4/4 | B4/2.";

const BASS_CHANT = "E2/2.~ | E2/4 C2/2 | A1/2. | B1/2. | E2/2. | G1/2. | A1/2. | B1/2.";

RetroSongs.register({
  id: "frostfall-sanctum",
  title: "Frostfall Sanctum (Dungeon, N64-style)",
  bpm: 88,
  timeSig: "3/4",
  volume: 0.8,
  arrangement: ["veil", "chant", "heart", "chant2"],
  loopFrom: "chant",
  reverb: { seconds: 4.5, decay: 2.2, send: 0.3 },
  master: { lowpass: 10000, compress: true },
  instruments: {
    // Music box: a thin, glassy tine with a quick decay and a long ring in the reverb.
    lead:    { harmonics: [1, 0, 0.5, 0, 0.3, 0, 0.12, 0, 0.06], volume: 0.13, pan: 0.15, reverb: 0.6,
               env: { a: 0.002, d: 0.9, s: 0, r: 0.6 }, gate: 1 },
    // Harp.
    harp:    { harmonics: [1, 0.4, 0.2, 0.1, 0.05], volume: 0.045, pan: -0.4, reverb: 0.5,
               env: { a: 0.002, d: 0.8, s: 0, r: 0.5 }, gate: 1 },
    // Wordless choir: soft harmonics, chorus, slow attack, vibrato.
    choir:   { harmonics: [1, 0.35, 0.18, 0.06, 0.03], voices: 3, detune: 11, volume: 0.06, pan: 0.1, reverb: 0.7,
               filter: { freq: 2000 }, env: { a: 0.35, d: 0.3, s: 0.85, r: 0.8 }, gate: 1,
               vibrato: { rate: 4.8, depth: 12, delay: 0.35 } },
    // Low strings: chords, so each voice is quiet.
    pad:     { wave: "sawtooth", voices: 3, detune: 13, volume: 0.011, pan: -0.15, reverb: 0.55,
               filter: { freq: 900, q: 0.5 }, env: { a: 0.6, d: 0.5, s: 0.9, r: 1.2 }, gate: 1 },
    // Sub bass: almost a sine, long and soft.
    bass:    { harmonics: [1, 0.25, 0.06], volume: 0.16, filter: { freq: 400 }, reverb: 0.15,
               env: { a: 0.05, d: 0.6, s: 0.7, r: 0.5 }, gate: 0.97 },
    // Timpani and a distant kick, drenched in reverb.
    drums:   { drums: true, kit: "studio", volume: 0.32, reverb: 0.5 },
    cymbals: { drums: true, kit: "studio", volume: 0.1, reverb: 0.7 },
  },
  sections: {
    // Em drone: harp alone, the choir fades in, a timpani roll swells at the end.
    veil: {
      harp:    arps(["Em", "Em", "C", "B"]),
      choir:   "R/2. | E4+B4/2.~ | E4+B4/2. | D#4+B4/2.",
      bass:    "E2/2.~ | E2/2.~ | E2/2. | B1/2.",
      drums:   "R/2. | R/2. | T/4 R/2 | [T/16]x8 T/4",
      cymbals: "C/2. | R/2. | R/2. | R/2.",
    },

    // Em | C | Am | B | Em | G | Am | B — the melody.
    chant: {
      lead:    MELODY,
      harp:    arps(CHANT),
      pad:     pads(CHANT),
      bass:    BASS_CHANT,
      drums:   "T/4 R/2 | R/2. | R/2. | T/4 R/4 T/4 | T/4 R/2 | R/2. | R/2. | T/8 T/8 T/4 T/4",
    },

    // C | D | Bm | Em | Am | D | G | B — the choir's line, rising to D#6 over B.
    heart: {
      choir:   "E5/2 G5/4 | F#5/2 A5/4 | B5/2 A5/8 F#5/8 | G5/2.~ | G5/4 E5/4 C6/4 | B5/4 A5/4 F#5/4 | G5/2 B5/4 | D#6/2 F#5/4",
      lead:    "R/2. | R/2. | R/2. | B5/4 G5/4 E5/4 | R/2. | R/2. | R/2. | F#5/4 A5/4 D#6/4",
      harp:    arps(HEART),
      pad:     pads(HEART),
      bass:    "C2/2. | D2/2. | B1/2. | E2/2. | A1/2. | D2/2. | G1/2. | B1/2.",
      drums:   "[K/4 R/4 T/4 |]x7 [T/16]x4 T/8 T/8 T/8 T/8",
      cymbals: "C/2. | R/2. | R/2. | R/2. | C/2. | R/2. | R/2. | R/2.",
    },

    // The melody an octave up, the choir holding it at pitch underneath.
    chant2: {
      lead:    transpose(MELODY, 12),
      choir:   MELODY,
      harp:    arps(CHANT),
      pad:     pads(CHANT),
      bass:    BASS_CHANT,
      drums:   "[K/4 R/4 T/4 |]x7 T/8 T/8 T/4 T/4",
      cymbals: "C/2. | R/2. | R/2. | R/2. | C/2. | R/2. | R/2. | R/2.",
    },
  },
});
}
