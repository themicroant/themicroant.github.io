/*
 * "Last Light" — an original, bittersweet ending theme in a Sega Genesis style.
 * D minor, 128 BPM. Inspired by In Flames (the Gothenburg sound): a harmonised twin-lead
 * intro in 8th notes, a singing verse, a big chorus twinned in thirds, galloping rhythm and a
 * synth layer, but voiced to sound pleasant rather than harsh: no distortion anywhere. The
 * leads are soft, rounded FM voices, the gallop is a muted FM pluck, clean arpeggios ring
 * underneath, and the drums keep a steady, moderate beat with no double-kick.
 * Style references for technique only; every melody is original.
 *
 *   intro  the twin lead, harmonised in thirds: Dm – Bb – F – C
 *   verse  a singing melody over clean arpeggios: Dm – Bb – F – C, twice
 *   chorus the hook twinned in thirds over the gallop: Bb – F – C – Dm – Bb – F – Gm – A
 *   inter  the intro's twin lead again, now with the band
 *   outro  the twin lead's first three bars, landing on a held D
 * Loops from the verse. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const bars = (text, from, to) => text.split(" | ").slice(from, to).join(" | ");

// The twin lead: a running 8th-note line and its harmony a diatonic third below.
const TWIN_LEAD = "A4/8 D5/8 F5/8 E5/8 D5/8 F5/8 A5/8 G5/8 | F5/8 D5/8 Bb4/8 D5/8 F5/4 E5/8 D5/8"
  + " | C5/8 F5/8 A5/8 G5/8 F5/8 A5/8 C6/8 Bb5/8 | A5/4. G5/8 E5/2";
const TWIN_HARMONY = "F4/8 Bb4/8 D5/8 C5/8 Bb4/8 D5/8 F5/8 E5/8 | D5/8 Bb4/8 G4/8 Bb4/8 D5/4 C5/8 Bb4/8"
  + " | A4/8 D5/8 F5/8 E5/8 D5/8 F5/8 A5/8 G5/8 | F5/4. E5/8 C5/2";

const VERSE = "D5/4 D5/8 E5/8 F5/4 A4/4 | Bb4/4. A4/8 G4/2 | A4/4 A4/8 Bb4/8 C5/4 F5/4 | E5/2. R/4"
  + " | D5/4 D5/8 E5/8 F5/4 A5/4 | G5/4. F5/8 D5/2 | C5/4 F5/4 A5/4 G5/4 | E5/2 C5/4 E5/4";

const CHORUS = "F5/4. D5/8 F5/4 Bb5/4 | A5/2 C6/4 A5/4 | G5/4. E5/8 G5/4 C6/4 | A5/2. R/4"
  + " | F5/4. D5/8 F5/4 Bb5/4 | A5/4 C6/4 F6/4 E6/4 | D6/4. C6/8 Bb5/4 G5/4 | C#6/2 A5/2";
const CHORUS_TWIN = "D5/4. Bb4/8 D5/4 F5/4 | F5/2 A5/4 F5/4 | E5/4. C5/8 E5/4 G5/4 | F5/2. R/4"
  + " | D5/4. Bb4/8 D5/4 F5/4 | F5/4 A5/4 D6/4 C6/4 | Bb5/4. A5/8 G5/4 D5/4 | A5/2 E5/2";

const ARP = {
  Dm: "D4 A4 D5 F5", Bb: "Bb3 F4 Bb4 D5", F: "F4 A4 C5 F5", C: "C4 G4 C5 E5",
  Gm: "G3 D4 G4 Bb4", A: "A3 E4 A4 C#5",
};
const CHORD = { Dm: "D3+A3", Bb: "Bb2+F3", F: "F3+C4", C: "C3+G3", Gm: "G2+D3", A: "A2+E3" };
const PAD = { Dm: "D4+F4+A4", Bb: "D4+F4+Bb4", F: "C4+F4+A4", C: "C4+E4+G4", Gm: "D4+G4+Bb4", A: "C#4+E4+A4" };
const ROOT = { Dm: "D2", Bb: "Bb1", F: "F2", C: "C2", Gm: "G1", A: "A1" };

// Clean arpeggios: the chord up and back in 8ths.
const arps = (...chords) => chords.map((c) => {
  const [a, b, d, e] = ARP[c].split(" ");
  return `${a}/8 ${b}/8 ${d}/8 ${e}/8 ${d}/8 ${b}/8 ${d}/8 ${b}/8`;
}).join(" | ");
// The gallop (8th + two 16ths) on a soft, muted two-note chord.
const gallop = (...chords) => chords.map((c) => `[${CHORD[c]}/8 ${CHORD[c]}/16 ${CHORD[c]}/16]x4`).join(" | ");
const pads = (...chords) => chords.map((c) => `${PAD[c]}/1`).join(" | ");
const bass = (...chords) => chords.map((c) => `[${ROOT[c]}/8]x8`).join(" | ");

const INTRO_CHORDS = ["Dm", "Bb", "F", "C"];
const VERSE_CHORDS = [...INTRO_CHORDS, ...INTRO_CHORDS];
const CHORUS_CHORDS = ["Bb", "F", "C", "Dm", "Bb", "F", "Gm", "A"];

// A steady beat: kick on 1 and 3 (and the "and" of 3), snare on 2 and 4.
const BEAT = "K/4 S/4 K/8 K/8 S/4";

RetroSongs.register({
  id: "last-light",
  title: "Last Light (Ending)",
  bpm: 128,
  volume: 0.5,
  arrangement: ["intro", "verse", "chorus", "inter", "verse", "chorus", "outro"],
  loopFrom: "verse",
  master: { compress: true },
  instruments: {
    // Soft, singing FM leads: low modulation, no drive, gentle vibrato. The twin sits right.
    lead:    { wave: "sine", fm: { ratio: 1, index: 1.6, indexEnd: 1, decay: 0.25 }, volume: 0.1, pan: -0.3,
               env: { a: 0.012, d: 0.2, s: 0.8, r: 0.1 }, gate: 0.95, filter: { freq: 4000 },
               vibrato: { rate: 5.4, depth: 14, delay: 0.25 } },
    twin:    { wave: "sine", fm: { ratio: 1, index: 1.4, indexEnd: 0.9, decay: 0.25 }, volume: 0.07, pan: 0.3,
               env: { a: 0.012, d: 0.2, s: 0.8, r: 0.1 }, gate: 0.95, filter: { freq: 3600 },
               vibrato: { rate: 5.1, depth: 14, delay: 0.3 } },
    // Clean guitar arpeggios: a plucked FM tone that fades on its own.
    clean:   { wave: "sine", fm: { ratio: 2, index: 1.2, indexEnd: 0.2, decay: 0.2 }, volume: 0.045, pan: 0.5,
               env: { a: 0.002, d: 0.5, s: 0.1, r: 0.2 }, gate: 1 },
    // The gallop: a muted, rounded pluck instead of a distorted guitar.
    gallop:  { wave: "sine", fm: { ratio: 1, index: 2, indexEnd: 0.8, decay: 0.06 }, volume: 0.03, pan: -0.5,
               filter: { freq: 2200, q: 0.7 }, env: { a: 0.002, d: 0.1, s: 0.3, r: 0.05 }, gate: 0.8 },
    // The synth layer: a soft pad.
    pad:     { wave: "sine", fm: { ratio: 2, index: 0.8, indexEnd: 0.5, decay: 0.5 }, volume: 0.016,
               env: { a: 0.3, d: 0.4, s: 0.8, r: 0.4 }, gate: 1 },
    bass:    { wave: "sine", fm: { ratio: 1, index: 2.2, indexEnd: 0.9, decay: 0.15 }, volume: 0.24,
               env: { a: 0.004, d: 0.3, s: 0.6, r: 0.06 }, gate: 0.9 },
    drums:   { drums: true, kit: "studio", bits: 8, volume: 0.36, filter: { freq: 7000 } },
    cymbals: { drums: true, kit: "studio", bits: 8, volume: 0.13, filter: { freq: 9000 } },
  },
  sections: {
    // The twin lead over arpeggios and the pad; the drums wait.
    intro: {
      lead:    TWIN_LEAD,
      twin:    TWIN_HARMONY,
      clean:   arps(...INTRO_CHORDS),
      pad:     pads(...INTRO_CHORDS),
      bass:    "D2/1 | Bb1/1 | F2/1 | C2/2 C2/8 C2/8 C2/8 C2/8",
      cymbals: "R/1 | R/1 | R/1 | R/2 [H/8]x4",
    },

    verse: {
      lead:    VERSE,
      clean:   arps(...VERSE_CHORDS),
      bass:    bass(...VERSE_CHORDS),
      drums:   `[${BEAT} |]x7 K/4 S/4 K/8 S/8 S/8 S/8`,
      cymbals: "C/4 [H/8]x6 | [[H/8]x8 |]x7",
    },

    chorus: {
      lead:    CHORUS,
      twin:    CHORUS_TWIN,
      gallop:  gallop(...CHORUS_CHORDS),
      pad:     pads(...CHORUS_CHORDS),
      bass:    bass(...CHORUS_CHORDS),
      drums:   `[${BEAT} |]x7 K/8 K/8 S/8 K/8 [S/16]x4 [T/16]x4`,
      cymbals: "[C/4 [H/8]x6 | [H/8]x8 |]x4",
    },

    // The intro's twin lead again, with the band.
    inter: {
      lead:    TWIN_LEAD,
      twin:    TWIN_HARMONY,
      gallop:  gallop(...INTRO_CHORDS),
      pad:     pads(...INTRO_CHORDS),
      bass:    bass(...INTRO_CHORDS),
      drums:   `[${BEAT} |]x3 K/4 S/4 [S/16]x4 [T/16]x4`,
      cymbals: "C/4 [H/8]x6 | [[H/8]x8 |]x3",
    },

    // The twin lead's first three bars, then a held D: the twin ends on the third, F.
    outro: {
      lead:    `${bars(TWIN_LEAD, 0, 3)} | D5/1`,
      twin:    `${bars(TWIN_HARMONY, 0, 3)} | F4/1`,
      clean:   `${arps("Dm", "Bb", "F")} | D4/8 A4/8 D5/8 F5/8 A5/2`,
      pad:     pads("Dm", "Bb", "F", "Dm"),
      bass:    `${bass("Dm", "Bb", "F")} | D2/1`,
      drums:   `[${BEAT} |]x3 K/1`,
      cymbals: "C/4 [H/8]x6 | [[H/8]x8 |]x2 C/1",
    },
  },
});
}
