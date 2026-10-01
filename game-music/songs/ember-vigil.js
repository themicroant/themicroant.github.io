/*
 * "Ember Vigil" — an original melodic metal power ballad in a Sega Genesis style.
 * A minor, 84 BPM. Light on drums: the verse has only a kick on the downbeat and a soft
 * hi-hat, the chorus a slow half-time beat. FM electric-piano arpeggios carry the verse;
 * held FM power chords (root left, fifth right) lift the chorus under a singing FM lead.
 * Style references for technique only (80s/90s metal power ballads, Mega Drive soundtracks);
 * every melody is original.
 *
 *   intro    piano arpeggios on Am – F – C – G, a pickup into the verse
 *   verse    a quiet stepwise melody: Am – F – C – G – Am – F – Dm – E
 *   chorus   held power chords, the melody soars to C6: F – G – C – Am – F – G – E – Am
 *   bridge   a short triplet solo over Dm – Am – F – E
 *   chorus2  the chorus again with a twin lead in thirds
 * Loops from the verse. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
// Piano arpeggios, one bar (eight 8ths) per chord.
const ARP = {
  Am: "A3/8 E4/8 A4/8 C5/8 E5/8 C5/8 A4/8 E4/8",
  F:  "F3/8 C4/8 F4/8 A4/8 C5/8 A4/8 F4/8 C4/8",
  C:  "C4/8 G4/8 C5/8 E5/8 G5/8 E5/8 C5/8 G4/8",
  G:  "G3/8 D4/8 G4/8 B4/8 D5/8 B4/8 G4/8 D4/8",
  Dm: "D4/8 A4/8 D5/8 F5/8 A5/8 F5/8 D5/8 A4/8",
  E:  "E3/8 B3/8 E4/8 G#4/8 B4/8 G#4/8 E4/8 B3/8",
};
const ROOT = { Am: "A1", F: "F1", C: "C2", G: "G1", Dm: "D2", E: "E1" };
const FIFTH = { Am: "E2", F: "C2", C: "G2", G: "D2", Dm: "A2", E: "B1" };
const arps = (...chords) => chords.map((c) => ARP[c]).join(" | ");
const held = (notes, ...chords) => chords.map((c) => `${notes[c]}/1`).join(" | ");

const VERSE_CHORDS = ["Am", "F", "C", "G", "Am", "F", "Dm", "E"];
const CHORUS_CHORDS = ["F", "G", "C", "Am", "F", "G", "E", "Am"];

const VERSE = "E5/4. D5/8 C5/4 B4/4 | A4/2. C5/4 | G4/4. A4/8 G4/4 E4/4 | B4/2 D5/2"
  + " | E5/4. D5/8 C5/4 B4/4 | A4/4 C5/4 F5/4 E5/4 | D5/4. E5/8 F5/4 A5/4 | G#5/2. R/4";
const CHORUS = "A5/4. G5/8 A5/4 C6/4 | B5/2 G5/2 | G5/4. F5/8 E5/4 G5/4 | A5/2. E5/4"
  + " | F5/4. E5/8 F5/4 A5/4 | G5/4 B5/4 D6/4 C6/4 | B5/2 G#5/2 | A5/1";
const CHORUS_TWIN = "F5/4. E5/8 F5/4 A5/4 | G5/2 D5/2 | E5/4. D5/8 C5/4 E5/4 | E5/2. C5/4"
  + " | C5/4. C5/8 C5/4 F5/4 | D5/4 G5/4 B5/4 A5/4 | G#5/2 E5/2 | E5/1";

const CHORUS_BAND = {
  ep:      arps(...CHORUS_CHORDS),
  gtrL:    held(ROOT, ...CHORUS_CHORDS),
  gtrR:    held(FIFTH, ...CHORUS_CHORDS),
  bass:    held(ROOT, ...CHORUS_CHORDS),
  // Half time: kick on 1, snare on 3, a quiet ride; a small tom fill into the last bar.
  drums:   "[K/2 S/2 |]x6 K/2 S/4 T/8 T/8 | K/1",
  cymbals: "C/4 [H/4]x3 | [[H/4]x4 |]x3 C/4 [H/4]x3 | [[H/4]x4 |]x2 C/1",
};

RetroSongs.register({
  id: "ember-vigil",
  title: "Ember Vigil (Metal Ballad)",
  bpm: 84,
  volume: 0.45,
  arrangement: ["intro", "verse", "chorus", "verse", "bridge", "chorus2"],
  loopFrom: "verse",
  master: { compress: true },
  instruments: {
    // A singing FM lead: less drive than the fast songs, slower vibrato.
    lead:    { wave: "sine", fm: { ratio: 1, index: 2.6, indexEnd: 1.6, decay: 0.3 }, drive: 0.15, volume: 0.1,
               env: { a: 0.01, d: 0.2, s: 0.85, r: 0.15 }, gate: 0.97, filter: { freq: 4500 },
               vibrato: { rate: 5.2, depth: 16, delay: 0.25 } },
    twin:    { wave: "sine", fm: { ratio: 1, index: 2.2, indexEnd: 1.4, decay: 0.3 }, drive: 0.15, volume: 0.06,
               env: { a: 0.01, d: 0.2, s: 0.85, r: 0.15 }, gate: 0.97, filter: { freq: 4000 },
               vibrato: { rate: 5, depth: 16, delay: 0.3 } },
    // FM electric piano: a soft bell that mellows as it rings.
    ep:      { wave: "sine", fm: { ratio: 1, index: 1.8, indexEnd: 0.3, decay: 0.5 }, volume: 0.05,
               env: { a: 0.003, d: 1.2, s: 0.2, r: 0.3 }, gate: 0.95 },
    // Held FM power chords: root hard left, fifth hard right.
    gtrL:    { wave: "sine", fm: { ratio: 1, index: 5, indexEnd: 3.5, decay: 0.1 }, drive: 0.7, volume: 0.045, pan: -1,
               filter: { freq: 3800, q: 0.8 }, env: { a: 0.004, d: 0.3, s: 0.75, r: 0.2 }, gate: 0.96 },
    gtrR:    { wave: "sine", fm: { ratio: 1, index: 5, indexEnd: 3.5, decay: 0.1 }, drive: 0.7, volume: 0.04, pan: 1,
               filter: { freq: 3800, q: 0.8 }, env: { a: 0.004, d: 0.3, s: 0.75, r: 0.2 }, gate: 0.96 },
    // Soft FM bass, long notes.
    bass:    { wave: "sine", fm: { ratio: 1, index: 2, indexEnd: 0.8, decay: 0.2 }, volume: 0.24,
               env: { a: 0.005, d: 0.5, s: 0.7, r: 0.2 }, gate: 0.95 },
    drums:   { drums: true, kit: "studio", bits: 8, volume: 0.4, filter: { freq: 7000 } },
    cymbals: { drums: true, kit: "studio", bits: 8, volume: 0.16, filter: { freq: 9000 } },
  },
  sections: {
    intro: {
      ep:      arps("Am", "F", "C", "G"),
      bass:    held(ROOT, "Am", "F", "C", "G"),
      lead:    "R/1 | R/1 | R/1 | R/2. B4/4",
      cymbals: "R/1 | R/1 | R/1 | R/2 H/4 H/4",
    },

    // Barely any drums: a kick on each downbeat, a soft hat on the beats.
    verse: {
      lead:    VERSE,
      ep:      arps(...VERSE_CHORDS),
      bass:    held(ROOT, ...VERSE_CHORDS),
      drums:   "[K/1 |]x7 K/2 S/8 S/8 S/4",
      cymbals: "[[H/4]x4 |]x8",
    },

    chorus: { lead: CHORUS, ...CHORUS_BAND },

    // Dm | Am | F | E — a short triplet solo over the piano, no guitars.
    bridge: {
      lead:    "D5/4t E5/4t F5/4t A5/2 | C6/4t B5/4t A5/4t E5/2 | F5/4t G5/4t A5/4t C6/4 D6/4 | B5/2 G#5/4 E5/4",
      ep:      arps("Dm", "Am", "F", "E"),
      bass:    held(ROOT, "Dm", "Am", "F", "E"),
      drums:   "K/1 | K/1 | K/1 | K/2 T/8 T/8 T/8 T/8",
      cymbals: "[[H/4]x4 |]x4",
    },

    chorus2: { lead: CHORUS, twin: CHORUS_TWIN, ...CHORUS_BAND },
  },
});
}
