/*
 * "Ravenscourt" — an original melodic heavy metal theme in a Sega Genesis style.
 * E minor, 138 BPM. Inspired by the sound of Avenged Sevenfold: a twin-guitar intro in the
 * exotic Phrygian dominant scale (E F G# A B C D), a sung verse over palm-muted chugs, a huge
 * chorus with wide leaps twinned in thirds, and a harmonic-minor solo that starts as a melody
 * and turns into neoclassical arpeggios. Voiced on the Iron Lament FM sound set.
 * Style references for technique only (twin-lead heavy metal, Mega Drive soundtracks); every
 * melody and riff is original.
 *
 *   intro  twin leads in Phrygian dominant over a galloping E pedal: E – E – F – E
 *   verse  a sung melody, low and calm: Em – C – Am – B – Em – C – D – B
 *   chorus the hook: E – G – C6 leaps twinned in thirds, C – D – Em – B – C – D – B – Em
 *   solo   a melodic half, then 16th-note arpeggios and triplet runs: Am – B – Em – C – Am – B – C – B
 *   outro  the intro's twin lead again, landing on E major
 * Loops from the verse. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// Intro: a triplet pickup into each phrase, Phrygian dominant colour (F and G# over E).
const INTRO = "E5/8t F5/8t G#5/8t B5/4 A5/8 G#5/8 F5/4 | E5/8t F5/8t G#5/8t A5/4 G#5/8 F5/8 E5/4"
  + " | E5/8t F5/8t G#5/8t B5/4 C6/8 B5/8 A5/4 | G#5/4 F5/4 E5/2";
// Its twin, a scale third below; it ends on G#, so the last chord is E major.
const INTRO_TWIN = "C5/8t D5/8t E5/8t G#5/4 F5/8 E5/8 D5/4 | C5/8t D5/8t E5/8t F5/4 E5/8 D5/8 C5/4"
  + " | C5/8t D5/8t E5/8t G#5/4 A5/8 G#5/8 F5/4 | E5/4 D5/4 G#4/2";

// Verse: repeated notes after a rest, like a singer coming in; ends on D# to lead into the chorus.
const VERSE = "R/8 B4/8 E5/8 E5/8 E5/4 D5/8 E5/8 | G5/4 E5/8 D5/8 C5/4. B4/8"
  + " | R/8 A4/8 C5/8 C5/8 C5/4 B4/8 C5/8 | D#5/4. C5/8 B4/2"
  + " | R/8 B4/8 E5/8 E5/8 E5/4 F#5/8 G5/8 | A5/4 G5/8 E5/8 C5/4. E5/8"
  + " | F#5/8 E5/8 D5/8 C5/8 D5/4 A4/4 | B4/2 D#5/2";

// Chorus: long, long, dotted, short; the leap E – G – C6 is the hook. The second half climbs higher.
const CHORUS = "E5/4 G5/4 C6/4. B5/8 | A5/2 F#5/4 D5/4 | G5/4 B5/4 E6/4. D6/8 | B5/2 A5/8 G5/8 F#5/4"
  + " | E5/4 G5/4 C6/4. B5/8 | A5/4. B5/8 C6/4 D6/4 | B5/4. A5/8 F#5/4 D#5/4 | E5/1";
const CHORUS_TWIN = "C5/4 E5/4 G5/4. G5/8 | F#5/2 D5/4 A4/4 | E5/4 G5/4 B5/4. B5/8 | F#5/2 F#5/8 E5/8 D#5/4"
  + " | C5/4 E5/4 G5/4. G5/8 | F#5/4. G5/8 A5/4 B5/4 | F#5/4. F#5/8 D#5/4 B4/4 | B4/1";

// Solo: four bars of melody (twinned for the first two), then arpeggios and a triplet sequence.
const SOLO = "A5/4. B5/8 C6/4 E6/4 | D#6/4. C6/8 B5/2"
  + " | E6/16 B5/16 G5/16 E5/16 G5/16 B5/16 E6/16 B5/16 G5/16 E5/16 G5/16 B5/16 E6/4"
  + " | C6/16 G5/16 E5/16 C5/16 E5/16 G5/16 C6/16 G5/16 E5/16 C5/16 E5/16 G5/16 C6/4"
  + " | A5/16 C6/16 B5/16 A5/16 G#5/16 A5/16 B5/16 C6/16 D6/16 C6/16 B5/16 A5/16 E6/4"
  + " | D#6/16 E6/16 D#6/16 C6/16 B5/16 A5/16 G5/16 F#5/16 D#5/4 F#5/4"
  + " | [E6/8t D6/8t C6/8t B5/8t A5/8t G5/8t]x2 | F#5/8t G5/8t A5/8t B5/4 D#6/2";
const SOLO_TWIN = "E5/4. G#5/8 A5/4 C6/4 | B5/4. A5/8 F#5/2 | [R/1 |]x5 R/1";

// The gallop (8th + two 16ths) on one note per bar; chugs palm-mute a root with a walk-off.
const gallop = (...notes) => notes.map((n) => `[${n}/8 ${n}/16 ${n}/16]x4`).join(" | ");
const chug = (root, a, b) => `[${root}/16 ${root}/16 ${root}/8]x2 ${a}/8 ${root}/8 ${b}/8 ${root}/8`;
// Eighth-note power chords, a bar each.
const eighths = (...notes) => notes.map((n) => `[${n}/8]x8`).join(" | ");

const VERSE_GTR = [chug("E2", "G2", "F#2"), chug("C2", "E2", "D2"), chug("A1", "C2", "B1"), chug("B1", "D#2", "F#2"),
  chug("E2", "G2", "F#2"), chug("C2", "E2", "D2"), chug("D2", "F#2", "E2"), chug("B1", "D#2", "F#2")].join(" | ");
const CHORUS_ROOTS = ["C2", "D2", "E2", "B1", "C2", "D2", "B1", "E2"];
const CHORUS_FIFTHS = ["G2", "A2", "B2", "F#2", "G2", "A2", "F#2", "B2"];
const SOLO_ROOTS = ["A1", "B1", "E2", "C2", "A1", "B1", "C2", "B1"];
const SOLO_FIFTHS = ["E2", "F#2", "B2", "G2", "E2", "F#2", "G2", "F#2"];

const ROCK = "K/8 K/8 S/4 K/8 K/8 S/4";
const GALLOP_DRUMS = "K/8 K/16 K/16 S/8 K/16 K/16 K/8 K/16 K/16 S/8 K/16 K/16";
const FILL = "K/8 K/8 S/8 K/8 [S/16]x4 [T/16]x4";

RetroSongs.register({
  id: "ravenscourt",
  title: "Ravenscourt (Castle)",
  bpm: 138,
  volume: 0.4,
  arrangement: ["intro", "verse", "chorus", "verse", "chorus", "solo", "chorus", "outro"],
  loopFrom: "verse",
  master: { compress: true },
  instruments: {
    lead:    { wave: "sine", fm: { ratio: 1, index: 3, indexEnd: 2, decay: 0.25 }, drive: 0.35, volume: 0.09,
               env: { a: 0.006, d: 0.15, s: 0.85, r: 0.08 }, gate: 0.95, filter: { freq: 5000 },
               vibrato: { rate: 6, depth: 18, delay: 0.2 }, pan: -0.15 },
    twin:    { wave: "sine", fm: { ratio: 1, index: 2.6, indexEnd: 1.8, decay: 0.25 }, drive: 0.35, volume: 0.06,
               env: { a: 0.006, d: 0.15, s: 0.85, r: 0.08 }, gate: 0.95, filter: { freq: 4500 },
               vibrato: { rate: 5.6, depth: 18, delay: 0.24 }, pan: 0.15 },
    gtrL:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4, decay: 0.08 }, drive: 0.78, volume: 0.05, pan: -1,
               filter: { freq: 4200, q: 0.8 }, env: { a: 0.002, d: 0.06, s: 0.7, r: 0.03 }, gate: 0.85 },
    gtrR:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4, decay: 0.08 }, drive: 0.78, volume: 0.045, pan: 1,
               filter: { freq: 4200, q: 0.8 }, env: { a: 0.002, d: 0.06, s: 0.7, r: 0.03 }, gate: 0.85 },
    bass:    { wave: "sine", fm: { ratio: 1, index: 5, indexEnd: 1.6, decay: 0.15 }, volume: 0.25,
               env: { a: 0.002, d: 0.3, s: 0.55, r: 0.05 }, gate: 0.9 },
    drums:   { drums: true, kit: "studio", bits: 7, volume: 0.42, filter: { freq: 7500 } },
    cymbals: { drums: true, kit: "studio", bits: 6, volume: 0.2, filter: { freq: 9000 } },
  },
  sections: {
    // E | E | F | E — twin leads over a galloping pedal; the F bar is the Phrygian "menace".
    intro: {
      lead:    INTRO,
      twin:    INTRO_TWIN,
      gtrL:    gallop("E2", "E2", "F2", "E2"),
      gtrR:    gallop("B2", "B2", "C3", "B2"),
      bass:    gallop("E1", "E1", "F1", "E1"),
      drums:   `[${GALLOP_DRUMS} |]x3 ${FILL}`,
      cymbals: "C/4 [H/8]x6 | [H/8]x8 | C/4 [H/8]x6 | [H/8]x6 C/4",
    },

    verse: {
      lead:    VERSE,
      gtrL:    VERSE_GTR,
      gtrR:    transpose(VERSE_GTR, 7),
      bass:    "[E2/8]x8 | [C2/8]x8 | [A1/8]x8 | [B1/8]x8 | [E2/8]x8 | [C2/8]x8 | [D2/8]x8 | [B1/8]x8",
      drums:   `[${ROCK} |]x7 ${FILL}`,
      cymbals: "C/4 [H/8]x6 | [[H/8]x8 |]x7",
    },

    // Big and open: eighth-note power chords, a crash every two bars.
    chorus: {
      lead:    CHORUS,
      twin:    CHORUS_TWIN,
      gtrL:    eighths(...CHORUS_ROOTS),
      gtrR:    eighths(...CHORUS_FIFTHS),
      bass:    eighths(...CHORUS_ROOTS),
      drums:   `[${ROCK} |]x7 K/4 S/4 [S/16]x4 [T/16]x4`,
      cymbals: "[C/4 [H/8]x6 | [H/8]x8 |]x3 C/4 [H/8]x6 | [H/8]x6 C/4",
    },

    // Galloping double kick under the solo.
    solo: {
      lead:    SOLO,
      twin:    SOLO_TWIN,
      gtrL:    gallop(...SOLO_ROOTS),
      gtrR:    gallop(...SOLO_FIFTHS),
      bass:    gallop(...SOLO_ROOTS),
      drums:   `[${GALLOP_DRUMS} |]x7 ${FILL}`,
      cymbals: "[C/4 [H/8]x6 | [H/8]x8 |]x4",
    },

    // The intro lead over the full band, ending on a held E major chord.
    outro: {
      lead:    INTRO,
      twin:    INTRO_TWIN,
      gtrL:    "[E2/8 E2/16 E2/16]x4 | [E2/8 E2/16 E2/16]x4 | [F2/8 F2/16 F2/16]x4 | E2/1",
      gtrR:    "[B2/8 B2/16 B2/16]x4 | [B2/8 B2/16 B2/16]x4 | [C3/8 C3/16 C3/16]x4 | B2/1",
      bass:    "[E1/8 E1/16 E1/16]x4 | [E1/8 E1/16 E1/16]x4 | [F1/8 F1/16 F1/16]x4 | E1/1",
      drums:   `[${GALLOP_DRUMS} |]x3 K/2 R/2`,
      cymbals: "C/4 [H/8]x6 | [H/8]x8 | C/4 [H/8]x6 | C/1",
    },
  },
});
}
