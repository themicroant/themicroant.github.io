/*
 * "Ashen Crown" — an original final-boss theme in a Sega Genesis style.
 * B minor, 138 BPM. Inspired by two things: Ashen Horizon (its key, tempo and its own
 * twin-lead theme, quoted here) and the techniques of "Duel of the Fates" (Star Wars:
 * Episode I): a wordless choir chanting syncopated block chords, a relentless string ostinato,
 * brass fanfares answering the choir, timpani-style drums, a dark Neapolitan chord (C major in
 * B minor) and a section that climbs by half steps. Nothing from that piece is quoted; the
 * chant, ostinato and fanfares are original. FM voices throughout.
 *
 *   intro   the string ostinato and timpani; the choir enters on held chords: Bm – G – Em – F#
 *   chant   the choir chants, brass fanfares answer: Bm – G – Em – F# – Bm – G – C – F#
 *   theme   Ashen Horizon's twin lead over the ostinato and gallop, the choir holding chords
 *   climb   choir and brass stab over a half-step climb, the leads rising in triplets:
 *           Bm – C – Bm – C – D – Eb – E – F#
 *   finale  the twin lead again with the choir chanting on top, falling back to B
 * Loops from the chant. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// Ashen Horizon's theme (bars 1–3) and its twin a diatonic third below, as in that song.
const THEME = "B4/8 D5/8 F#5/4. E5/8 D5/8 E5/8 | G5/4. F#5/8 E5/8 D5/8 B4/4 | A4/8 D5/8 F#5/4. E5/8 D5/8 F#5/8";
const THEME_TWIN = "F#4/8 B4/8 D5/4. C#5/8 B4/8 C#5/8 | E5/4. D5/8 C#5/8 B4/8 G4/4 | F#4/8 A4/8 D5/4. C#5/8 B4/8 D5/8";
// Eight bars: the theme with its open ending, then with its closing ending (back to B).
const THEME_8 = `${THEME} | E5/4 C#5/4 A#4/2 | ${THEME} | E5/8 F#5/8 G5/8 F#5/8 E5/8 C#5/8 B4/4`;
const TWIN_8 = `${THEME_TWIN} | C#5/4 A#4/4 F#4/2 | ${THEME_TWIN} | C#5/8 D5/8 E5/8 D5/8 C#5/8 A#4/8 F#4/4`;
// Ashen Horizon's gallop, one bar per chord.
const GALLOP = "[B2/16 B2/16 B2/8]x3 D3/8 C#3/8 | [G2/16 G2/16 G2/8]x3 A2/8 B2/8 | [D3/16 D3/16 D3/8]x3 E3/8 F#3/8 | [F#2/16 F#2/16 F#2/8]x3 A2/8 A#2/8";

// Choir voicings (three voices) and the string ostinato's root, per chord.
const CHOIR = { Bm: "B3+D4+F#4", G: "B3+D4+G4", Em: "B3+E4+G4", "F#": "A#3+C#4+F#4", C: "C4+E4+G4",
  D: "A3+D4+F#4", Eb: "Bb3+Eb4+G4", E: "B3+E4+G#4" };
const ROOT = { Bm: "B2", G: "G2", Em: "E3", "F#": "F#2", C: "C3", D: "D3", Eb: "Eb3", E: "E3" };

// The ostinato: root, root, fifth, minor sixth, fifth, root, the half step above, root.
const ostinato = (chords) => chords.map((c) => {
  const r = transpose(ROOT[c], 12);
  const [f, s6, n] = [7, 8, 1].map((st) => transpose(r, st));
  return `${r}/8 ${r}/8 ${f}/8 ${s6}/8 ${f}/8 ${r}/8 ${n}/8 ${r}/8`;
}).join(" | ");
// The chant: a dotted accent, a pushed 8th, a breath, and a last hit.
const chant = (chords) => chords.map((c) => `${CHOIR[c]}/4. ${CHOIR[c]}/8 R/4 ${CHOIR[c]}/4`).join(" | ");
const held = (chords) => chords.map((c) => `${CHOIR[c]}/1`).join(" | ");
const stabs = (chords) => chords.map((c) => `${transpose(CHOIR[c], 12)}/8 R/8 R/2.`).join(" | ");
const bass = (chords) => chords.map((c) => `[${transpose(ROOT[c], -12)}/8]x8`).join(" | ");

const INTRO = ["Bm", "G", "Em", "F#"];
const CHANT = ["Bm", "G", "Em", "F#", "Bm", "G", "C", "F#"];
const THEME_CHORDS = ["Bm", "G", "D", "F#", "Bm", "G", "D", "F#"];
const CLIMB = ["Bm", "C", "Bm", "C", "D", "Eb", "E", "F#"];

// Brass fanfares answer the choir in every other bar.
const FANFARE = "R/1 | F#5/8 F#5/8 F#5/8 B5/4. A5/4 | R/1 | D6/8 C#6/8 B5/8 F#5/4. R/4"
  + " | R/1 | G5/8 G5/8 G5/8 E6/4. D6/4 | R/1 | C#6/8 B5/8 A#5/8 F#5/4. R/4";

// Timpani-style toms with the kick; a driving beat for the theme.
const TIMPANI = "K/4 R/4 T/4 T/8 T/8";
const DRIVE = "K/8 K/8 S/8 K/8 K/8 K/8 S/8 K/8";

RetroSongs.register({
  id: "ashen-crown",
  title: "Ashen Crown (Final Boss)",
  bpm: 138,
  volume: 0.42,
  arrangement: ["intro", "chant", "theme", "climb", "finale"],
  loopFrom: "chant",
  master: { compress: true },
  instruments: {
    // Wordless choir: a soft FM "aah" with a slow attack and vibrato.
    choir:   { wave: "sine", fm: { ratio: 1, index: 0.7, indexEnd: 0.5, decay: 0.4 }, volume: 0.032,
               env: { a: 0.12, d: 0.3, s: 0.85, r: 0.25 }, gate: 0.96,
               vibrato: { rate: 5, depth: 14, delay: 0.15 } },
    // String ostinato: a short, bright FM bow stroke, to the right.
    strings: { wave: "sine", fm: { ratio: 1, index: 2.5, indexEnd: 1.2, decay: 0.1 }, volume: 0.07, pan: 0.45,
               env: { a: 0.004, d: 0.12, s: 0.5, r: 0.05 }, gate: 0.85 },
    // FM brass for the fanfares and stabs, to the left.
    brass:   { wave: "sine", fm: { ratio: 1, index: 3.5, indexEnd: 2.2, decay: 0.15 }, volume: 0.06, pan: -0.35,
               env: { a: 0.01, d: 0.15, s: 0.75, r: 0.08 }, gate: 0.92, filter: { freq: 5000 } },
    // Twin leads, as in Iron Lament but with less drive.
    lead:    { wave: "sine", fm: { ratio: 1, index: 3.2, indexEnd: 2.2, decay: 0.25 }, drive: 0.2, volume: 0.09,
               env: { a: 0.006, d: 0.15, s: 0.85, r: 0.07 }, gate: 0.95, filter: { freq: 5000 },
               vibrato: { rate: 6, depth: 14, delay: 0.22 } },
    twin:    { wave: "sine", fm: { ratio: 1, index: 2.6, indexEnd: 1.8, decay: 0.25 }, drive: 0.2, volume: 0.06,
               env: { a: 0.006, d: 0.15, s: 0.85, r: 0.07 }, gate: 0.95, filter: { freq: 4500 },
               vibrato: { rate: 5.6, depth: 14, delay: 0.25 } },
    // The gallop: roots hard left, fifths hard right.
    gtrL:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4, decay: 0.08 }, drive: 0.75, volume: 0.045, pan: -1,
               filter: { freq: 4500, q: 0.8 }, env: { a: 0.002, d: 0.06, s: 0.7, r: 0.03 }, gate: 0.85 },
    gtrR:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4, decay: 0.08 }, drive: 0.75, volume: 0.04, pan: 1,
               filter: { freq: 4500, q: 0.8 }, env: { a: 0.002, d: 0.06, s: 0.7, r: 0.03 }, gate: 0.85 },
    bass:    { wave: "sine", fm: { ratio: 1, index: 4, indexEnd: 1.5, decay: 0.12 }, volume: 0.24,
               env: { a: 0.003, d: 0.25, s: 0.55, r: 0.05 }, gate: 0.88 },
    drums:   { drums: true, kit: "studio", bits: 7, volume: 0.42, filter: { freq: 7000 } },
    cymbals: { drums: true, kit: "studio", bits: 7, volume: 0.16, filter: { freq: 9000 } },
  },
  sections: {
    // The ostinato and timpani alone, then the choir on held chords.
    intro: {
      strings: ostinato(INTRO),
      choir:   `R/1 | R/1 | ${held(["Em", "F#"])}`,
      bass:    bass(INTRO),
      drums:   `[${TIMPANI} |]x3 [T/16]x16`,
      cymbals: "C/1 | R/1 | R/1 | R/2 C/2",
    },

    chant: {
      choir:   chant(CHANT),
      brass:   FANFARE,
      strings: ostinato(CHANT),
      bass:    bass(CHANT),
      drums:   `[${TIMPANI} |]x7 [T/16]x8 K/8 K/8 T/8 T/8`,
      cymbals: "[C/1 | R/1 |]x4",
    },

    theme: {
      lead:    THEME_8,
      twin:    TWIN_8,
      choir:   held(THEME_CHORDS),
      strings: ostinato(THEME_CHORDS),
      gtrL:    `${GALLOP} | ${GALLOP}`,
      gtrR:    transpose(`${GALLOP} | ${GALLOP}`, 7),
      bass:    bass(THEME_CHORDS),
      drums:   `[${DRIVE} |]x7 K/8 K/8 S/8 K/8 [S/16]x8`,
      cymbals: "[C/4 [H/8]x6 | [H/8]x8 |]x4",
    },

    // A half-step climb; the leads rise in triplets through its last four chords.
    climb: {
      choir:   chant(CLIMB),
      brass:   stabs(CLIMB),
      strings: ostinato(CLIMB),
      lead:    "R/1 | R/1 | R/1 | R/1 | [D5/8t F#5/8t A5/8t]x2 D6/2 | [Eb5/8t G5/8t Bb5/8t]x2 Eb6/2"
             + " | [E5/8t G#5/8t B5/8t]x2 E6/2 | F#6/4 E6/4 C#6/4 A#5/4",
      twin:    "R/1 | R/1 | R/1 | R/1 | [A4/8t D5/8t F#5/8t]x2 A5/2 | [Bb4/8t Eb5/8t G5/8t]x2 Bb5/2"
             + " | [B4/8t E5/8t G#5/8t]x2 B5/2 | C#6/4 C#6/4 A#5/4 F#5/4",
      bass:    bass(CLIMB),
      drums:   `[${TIMPANI} |]x4 [K/8 T/8]x4 | [K/8 T/8]x4 | [K/16 K/16 T/8]x4 | [T/16]x8 [S/16]x8`,
      cymbals: "C/1 | R/1 | C/1 | R/1 | C/1 | C/1 | C/1 | R/2 C/2",
    },

    // The twin lead with the choir chanting on top, back to B for the loop.
    finale: {
      lead:    THEME_8,
      twin:    TWIN_8,
      choir:   chant(THEME_CHORDS),
      brass:   stabs(THEME_CHORDS),
      strings: ostinato(THEME_CHORDS),
      gtrL:    `${GALLOP} | ${GALLOP}`,
      gtrR:    transpose(`${GALLOP} | ${GALLOP}`, 7),
      bass:    bass(THEME_CHORDS),
      drums:   `[${DRIVE} |]x7 K/8 K/8 S/8 K/8 [T/16]x8`,
      cymbals: "[C/4 [H/8]x6 | [H/8]x8 |]x4",
    },
  },
});
}
