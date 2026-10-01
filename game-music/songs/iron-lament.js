/*
 * "Iron Lament" — an original melodic metal theme in a Sega Genesis style.
 * E minor, then F# minor, 152 BPM. One melody carries the whole song: the guitars play it
 * as the opening riff, the twin leads sing it in the chorus, the bridge slows it to half
 * speed, and the last chorus lifts it a whole step before the band plays it in unison.
 * Voiced on YM2612-style FM like Obsidian Tide: twin FM leads, driven FM guitars with roots
 * hard left and fifths hard right, slap bass, orchestra hits, PSG arpeggios, crushed drums.
 * Style references for technique only (twin-guitar melodic metal, Mega Drive action
 * soundtracks); every melody and riff is original.
 *
 *   intro    the hook as a riff: guitars in fifths and bass, two octaves down, drums on its rhythm
 *   verse    palm-muted chugs on Em – C – Em – B, PSG arpeggios, lead out
 *   chorus   the hook on twin leads over the gallop, Em – C – D – B
 *   bridge   half time: the hook's first half at half speed over Em – C – Am – B
 *   chorusUp the chorus transposed up 2 semitones, to F# minor
 *   outro    everyone plays the hook in unison octaves, landing on F#
 * Loops from the verse. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// The melody. Repeated notes with a gap, a leap of a fifth, and ties that push bars 2 and 4.
const HOOK = "E5/8 E5/8 R/8 E5/8 B5/4. A5/8 | G5/8 F#5/8 E5/8 G5/8~ G5/2"
  + " | F#5/8 F#5/8 R/8 F#5/8 A5/4. G5/8 | F#5/8 E5/8 D#5/8 F#5/8~ F#5/2";
// Its harmony: a third (or a chord tone) under each note.
const TWIN = "B4/8 B4/8 R/8 B4/8 G5/4. F#5/8 | E5/8 D5/8 C5/8 E5/8~ E5/2"
  + " | D5/8 D5/8 R/8 D5/8 F#5/4. E5/8 | D#5/8 C5/8 B4/8 D#5/8~ D#5/2";

const bars = (text, from, to) => text.split(" | ").slice(from, to).join(" | ");
const lastBar = (text, bar) => [...text.split(" | ").slice(0, -1), bar].join(" | ");
// Every note twice as long: /8 -> /4, /4. -> /2., /2 -> /1.
const augment = (text) => text.replace(/\/(2|4|8|16|32)/g, (_, n) => `/${n / 2}`);

// Palm-muted chug for one bar: root pulses, then a little walk off the root.
const chug = (root, a, b) => `[${root}/16 ${root}/16 ${root}/8]x2 ${a}/8 ${root}/8 ${b}/8 ${root}/8`;
const VERSE_GTR = [chug("E2", "G2", "F#2"), chug("C2", "E2", "D2"), chug("E2", "G2", "A2"), chug("B1", "D#2", "F#2")].join(" | ");

// The gallop (8th + two 16ths) on one note per bar.
const gallop = (...notes) => notes.map((n) => `[${n}/8 ${n}/16 ${n}/16]x4`).join(" | ");
const GALLOP_DRUMS = "K/8 K/16 K/16 S/8 K/16 K/16 K/8 K/16 K/16 S/8 K/16 K/16";

const CHORUS = {
  lead:    HOOK,
  twin:    TWIN,
  gtrL:    gallop("E2", "C2", "D2", "B1"),
  gtrR:    gallop("B2", "G2", "A2", "F#2"),
  bass:    gallop("E2", "C2", "D2", "B1"),
  hit:     "E4+G4+B4/8 R/8 R/2. | R/1 | D4+F#4+A4/8 R/8 R/2. | R/1",
  drums:   `[${GALLOP_DRUMS} |]x3 [K/16]x8 [S/16]x8`,
  cymbals: "C/4 [H/8]x6 | [H/8]x8 | C/4 [H/8]x6 | [H/8]x6 C/4",
};

RetroSongs.register({
  id: "iron-lament",
  title: "Iron Lament (Melodic Metal)",
  bpm: 152,
  volume: 0.4,
  arrangement: ["intro", "verse", "chorus", "verse", "chorus", "bridge", "chorusUp", "outro"],
  loopFrom: "verse",
  master: { compress: true },
  instruments: {
    lead:    { wave: "sine", fm: { ratio: 1, index: 3.2, indexEnd: 2.2, decay: 0.25 }, drive: 0.3, volume: 0.09,
               env: { a: 0.006, d: 0.15, s: 0.85, r: 0.07 }, gate: 0.95, filter: { freq: 5000 },
               vibrato: { rate: 6, depth: 14, delay: 0.22 } },
    twin:    { wave: "sine", fm: { ratio: 1, index: 2.6, indexEnd: 1.8, decay: 0.25 }, drive: 0.3, volume: 0.06,
               env: { a: 0.006, d: 0.15, s: 0.85, r: 0.07 }, gate: 0.95, filter: { freq: 4500 },
               vibrato: { rate: 5.6, depth: 14, delay: 0.25 } },
    // FM rhythm guitars: roots hard left, fifths hard right, so together they're power chords.
    gtrL:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4, decay: 0.08 }, drive: 0.75, volume: 0.05, pan: -1,
               filter: { freq: 4500, q: 0.8 }, env: { a: 0.002, d: 0.06, s: 0.7, r: 0.03 }, gate: 0.85 },
    gtrR:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4, decay: 0.08 }, drive: 0.75, volume: 0.045, pan: 1,
               filter: { freq: 4500, q: 0.8 }, env: { a: 0.002, d: 0.06, s: 0.7, r: 0.03 }, gate: 0.85 },
    bass:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 1.8, decay: 0.15 }, volume: 0.26,
               env: { a: 0.002, d: 0.3, s: 0.55, r: 0.05 }, gate: 0.9 },
    psg:     { wave: "square", volume: 0.022, gate: 0.6 },
    // Orchestra hit: whole triads in one token.
    hit:     { wave: "sine", fm: { ratio: 3.5, index: 7, indexEnd: 0.5, decay: 0.2 }, volume: 0.045,
               env: { a: 0.002, d: 0.35, s: 0.15, r: 0.12 } },
    drums:   { drums: true, kit: "studio", bits: 6, volume: 0.5, filter: { freq: 7000 } },
    cymbals: { drums: true, kit: "studio", bits: 5, volume: 0.24, filter: { freq: 9000 } },
  },
  sections: {
    // The hook as a riff, two octaves down: left guitar on the melody, right a fifth above
    // it (power-chord melody), bass doubling. The drums hit on the hook's own rhythm.
    intro: {
      gtrL:    transpose(HOOK, -24),
      gtrR:    transpose(HOOK, -17),
      bass:    transpose(HOOK, -36),
      hit:     "E4+G4+B4/8 R/8 R/2. | R/1 | R/1 | R/1",
      drums:   "K/8 K/8 R/8 K/8 K/4. S/8 | K/8 S/8 K/8 K/8 R/2 | K/8 K/8 R/8 K/8 K/4. S/8 | K/8 S/8 K/8 K/8 R/4 [S/16]x4",
      cymbals: "C/2 R/2 | R/2 C/2 | C/2 R/2 | R/2 R/4 C/4",
    },

    // Em | C | Em | B — chugs, fifths on the right, arpeggios on top. No lead: room for the chorus.
    verse: {
      gtrL:    VERSE_GTR,
      gtrR:    transpose(VERSE_GTR, 7),
      bass:    "[E2/8]x8 | [C2/8]x8 | [E2/8]x8 | [B1/8]x8",
      psg:     "[E4/16 G4/16 B4/16 G4/16]x4 | [C4/16 E4/16 G4/16 E4/16]x4 | [E4/16 G4/16 B4/16 G4/16]x4 | [B3/16 D#4/16 F#4/16 D#4/16]x4",
      drums:   "[K/8 K/8 S/8 K/8]x7 S/8 S/8 [S/16]x4",
      cymbals: "C/4 [H/8]x6 | [[H/8]x8 |]x3",
    },

    chorus: CHORUS,

    // Em | C | Am | B — half time. The hook's first two bars at half speed, twinned; the held
    // G over B major at the end is the song's most tense moment, before the key change.
    bridge: {
      lead:    augment(bars(HOOK, 0, 2)),
      twin:    augment(bars(TWIN, 0, 2)),
      gtrL:    "E2/2 E2/2 | C2/1 | A1/1 | B1/4 B1/4 B1/4 B1/4",
      gtrR:    "B2/2 B2/2 | G2/1 | E2/1 | F#2/4 F#2/4 F#2/4 F#2/4",
      bass:    "E1/2 E1/2 | C2/1 | A1/1 | B1/4 B1/4 B1/4 B1/4",
      psg:     "[E4/8 G4/8 B4/8 G4/8]x2 | [C4/8 E4/8 G4/8 E4/8]x2 | [A3/8 C4/8 E4/8 C4/8]x2 | [B3/8 D#4/8 F#4/8 D#4/8]x2",
      drums:   "K/4 R/4 S/4 R/4 | K/4 K/8 K/8 S/4 R/4 | K/4 R/4 S/4 R/4 | K/8 K/8 S/8 K/8 [S/16]x4 [T/16]x4",
      cymbals: "C/2 H/4 H/4 | [H/4]x4 | C/2 H/4 H/4 | [H/4]x2 C/2",
    },

    // The whole chorus a whole step up, to F# minor.
    chorusUp: Object.fromEntries(Object.entries(CHORUS).map(([track, text]) =>
      [track, track === "drums" || track === "cymbals" ? text : transpose(text, 2)])),

    // F# minor: lead, guitars and bass all play the hook together, then hold F#.
    outro: {
      lead:    lastBar(transpose(HOOK, 2), "F#5/1"),
      twin:    lastBar(transpose(HOOK, -10), "F#4/1"),
      gtrL:    lastBar(transpose(HOOK, -22), "F#3/1"),
      gtrR:    lastBar(transpose(HOOK, -15), "C#4/1"),
      bass:    lastBar(transpose(HOOK, -34), "F#1/1"),
      hit:     "R/1 | R/1 | R/1 | F#4+A4+C#5/2 R/2",
      drums:   "K/8 K/8 R/8 K/8 K/4. S/8 | K/8 S/8 K/8 K/8 R/2 | K/8 K/8 R/8 K/8 K/4. S/8 | K/2 R/2",
      cymbals: "C/2 R/2 | R/2 C/2 | C/2 R/2 | C/1",
    },
  },
});
}
