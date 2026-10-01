/*
 * "Static Hollow" — an original nu metal / rap rock theme.
 * F minor, 104 BPM. Inspired by the sound of early Linkin Park (the Hybrid Theory and
 * Meteora era): a short, sad piano motif that carries the song, a quiet verse over a hip-hop
 * beat, then a chorus that explodes into low, driving power chords under a soaring, doubled
 * vocal-style melody. A half-time breakdown builds into the last chorus; the piano ends alone.
 * Style references for technique only (nu metal, rap rock); every melody is original.
 *
 *   intro   the piano motif alone: Fm – Db – Ab – Eb
 *   verse   motif twice under a low, sparse melody and a hip-hop beat
 *   chorus  driving guitars, the melody leaps to Eb6: Db – Ab – Eb – Fm – Db – Ab – Eb – C
 *   bridge  half-time stop-start chugs; a chant-like line climbs to E6 over C major
 *   final   the chorus again, the piano playing the motif's rhythm on each chord
 *   outro   the piano motif alone, then an F minor chord
 * Loops from the verse. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// The motif: four 8ths up a broken chord, then two quarters. It ends on G over Eb so it pulls back to Fm.
const MOTIF = "C5/8 F5/8 Ab5/8 F5/8 G5/4 Eb5/4 | C5/8 F5/8 Ab5/8 F5/8 Bb5/4 Ab5/4"
  + " | C5/8 Eb5/8 Ab5/8 Eb5/8 G5/4 F5/8 Eb5/8 | Bb4/8 Eb5/8 G5/8 Eb5/8 F5/2";

// Verse: short phrases in the gaps of the motif, low like a half-spoken vocal.
const VERSE = "R/2 F4/8 Ab4/8 C5/4 | Bb4/4. Ab4/8 F4/2 | R/2 Eb4/8 F4/8 Ab4/4 | G4/2. R/4"
  + " | R/2 F4/8 Ab4/8 C5/4 | Db5/4. C5/8 Ab4/2 | R/4 Ab4/8 Bb4/8 C5/4 Eb5/4 | Bb4/4 Eb5/4 G5/2";

// Chorus: repeated notes off the beat, then a leap of a fifth (Ab – Eb6). Ends on E over C, back to F.
const CHORUS = "R/8 Ab5/8 Ab5/8 Ab5/8 Ab5/4 F5/4 | Eb6/4. C6/8 Ab5/2 | R/8 G5/8 G5/8 G5/8 G5/4 Bb5/4 | C6/2. R/4"
  + " | R/8 Ab5/8 Ab5/8 Ab5/8 Ab5/4 F5/4 | Eb6/4. Db6/8 C6/4 Ab5/4 | Bb5/4. Ab5/8 G5/4 Eb5/4 | G5/4. F5/8 E5/2";

// Bridge: a chant that climbs a chord each two bars.
const BRIDGE = "F5/4 R/8 F5/8 Ab5/4 G5/4 | F5/2 C5/2 | F5/4 R/8 F5/8 Ab5/4 Bb5/4 | Ab5/2 F5/2"
  + " | Eb5/4 R/8 Eb5/8 Ab5/4 C6/4 | Eb6/2 C6/2 | E6/4. D6/8 C6/4 G5/4 | E5/2 G5/2";

const CHORUS_CHORDS = ["Db", "Ab", "Eb", "Fm", "Db", "Ab", "Eb", "C"];
const ROOT = { Fm: "F1", Db: "Db2", Ab: "Ab1", Eb: "Eb2", C: "C2" };
const FIFTH = { Fm: "C2", Db: "Ab2", Ab: "Eb2", Eb: "Bb2", C: "G2" };
const PAD = { Fm: "F4+Ab4+C5", Db: "F4+Ab4+Db5", Ab: "Eb4+Ab4+C5", Eb: "Eb4+G4+Bb4", C: "E4+G4+C5" };

// Driving eighths with a gap before beat 3: the nu metal push.
const drive = (notes, ...chords) => chords.map((c) => `[${notes[c]}/8]x3 R/8 [${notes[c]}/8]x4`).join(" | ");
const pads = (...chords) => chords.map((c) => `${PAD[c]}/1`).join(" | ");
// The motif's rhythm (four 8ths, two quarters) on a chord's notes.
const motifArps = (...chords) => chords.map((c) => {
  const [a, b, d] = PAD[c].split("+");
  return `${a}/8 ${b}/8 ${d}/8 ${b}/8 ${d}/4 ${a}/4`;
}).join(" | ");
// Bridge chugs: stop-start, the rests are the riff.
const stab = (n) => `${n}/8 ${n}/8 R/8 ${n}/8 R/8 ${n}/8 ${n}/8 R/8`;
const STAB_DRUMS = "K/8 K/8 R/8 K/8 S/8 K/8 K/8 R/8";

// Hip-hop beat: a pushed kick, snare on 2 and 4; and a rock beat for the chorus.
const HIPHOP = "K/8 R/16 K/16 S/4 R/8 K/8 S/4";
const ROCK = "K/8 K/8 S/4 R/8 K/8 S/4";

const CHORUS_BAND = {
  gtrL:    drive(ROOT, ...CHORUS_CHORDS),
  gtrR:    drive(FIFTH, ...CHORUS_CHORDS),
  bass:    drive(ROOT, ...CHORUS_CHORDS),
  pad:     pads(...CHORUS_CHORDS),
  drums:   `[${ROCK} |]x7 K/8 K/8 S/8 K/8 [S/16]x8`,
  cymbals: "[C/4 [H/8]x6 | [H/8]x8 |]x4",
};

RetroSongs.register({
  id: "static-hollow",
  title: "Static Hollow (Nu Metal)",
  bpm: 104,
  volume: 0.42,
  arrangement: ["intro", "verse", "chorus", "verse", "chorus", "bridge", "final", "outro"],
  loopFrom: "verse",
  reverb: { seconds: 2.2, decay: 3, send: 0 },
  master: { compress: true },
  instruments: {
    // Piano: an FM bell that rings and mellows, a touch of reverb.
    piano:   { wave: "sine", fm: { ratio: 1, index: 2.2, indexEnd: 0.4, decay: 0.4 }, volume: 0.08,
               env: { a: 0.002, d: 1.4, s: 0.15, r: 0.4 }, gate: 0.98, reverb: 0.3 },
    // Vocal-style lead: a soft, singing FM voice with slow vibrato; "dub" doubles it an octave down.
    lead:    { wave: "sine", fm: { ratio: 1, index: 1.8, indexEnd: 1.2, decay: 0.3 }, drive: 0.2, volume: 0.1,
               env: { a: 0.015, d: 0.2, s: 0.85, r: 0.12 }, gate: 0.96, filter: { freq: 4200 },
               vibrato: { rate: 5, depth: 18, delay: 0.25 }, reverb: 0.25 },
    dub:     { wave: "sine", fm: { ratio: 1, index: 1.4, indexEnd: 1, decay: 0.3 }, drive: 0.2, volume: 0.06,
               env: { a: 0.015, d: 0.2, s: 0.85, r: 0.12 }, gate: 0.96, filter: { freq: 3200 }, reverb: 0.2 },
    // Low, heavy guitars: roots hard left, fifths hard right.
    gtrL:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4.5, decay: 0.08 }, drive: 0.82, volume: 0.05, pan: -1,
               filter: { freq: 3600, q: 0.8 }, env: { a: 0.002, d: 0.08, s: 0.75, r: 0.04 }, gate: 0.88 },
    gtrR:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4.5, decay: 0.08 }, drive: 0.82, volume: 0.045, pan: 1,
               filter: { freq: 3600, q: 0.8 }, env: { a: 0.002, d: 0.08, s: 0.75, r: 0.04 }, gate: 0.88 },
    // Soft synth pad, chorus only.
    pad:     { wave: "sine", fm: { ratio: 2, index: 0.8, indexEnd: 0.5, decay: 0.5 }, volume: 0.018,
               env: { a: 0.3, d: 0.4, s: 0.8, r: 0.4 }, gate: 1, reverb: 0.4 },
    bass:    { wave: "sine", fm: { ratio: 1, index: 3, indexEnd: 1.2, decay: 0.15 }, volume: 0.26,
               env: { a: 0.003, d: 0.3, s: 0.6, r: 0.06 }, gate: 0.9 },
    drums:   { drums: true, kit: "studio", bits: 8, volume: 0.45, filter: { freq: 8000 } },
    cymbals: { drums: true, kit: "studio", bits: 8, volume: 0.16, filter: { freq: 9500 } },
  },
  sections: {
    // The motif alone, then a kick and snare pickup into the verse.
    intro: {
      piano:   MOTIF,
      bass:    "F1/1 | Db2/1 | Ab1/1 | Eb2/2. R/4",
      drums:   "R/1 | R/1 | R/1 | R/2 K/8 K/8 S/4",
    },

    // Fm | Db | Ab | Eb, twice — quiet: the motif, the low melody and a hip-hop beat.
    verse: {
      piano:   `${MOTIF} | ${MOTIF}`,
      lead:    VERSE,
      bass:    "[F1/4. F1/8 R/2 | Db2/4. Db2/8 R/2 | Ab1/4. Ab1/8 R/2 | Eb2/4. Eb2/8 R/2 |]x2",
      drums:   `[${HIPHOP} |]x7 K/8 R/16 K/16 S/4 R/8 K/8 [S/16]x4`,
      cymbals: "[[H/8]x6 H/16 H/16 H/8 |]x8",
    },

    chorus: { lead: CHORUS, dub: transpose(CHORUS, -12), ...CHORUS_BAND },

    // Fm | Fm | Db | Db | Ab | Ab | C | C — half time, stop-start, building to the last chorus.
    bridge: {
      lead:    BRIDGE,
      gtrL:    [stab("F1"), stab("F1"), stab("Db2"), stab("Db2"), stab("Ab1"), stab("Ab1"), "[C2/8]x8", "[C2/16]x16"].join(" | "),
      gtrR:    [stab("C2"), stab("C2"), stab("Ab2"), stab("Ab2"), stab("Eb2"), stab("Eb2"), "[G2/8]x8", "[G2/16]x16"].join(" | "),
      bass:    [stab("F1"), stab("F1"), stab("Db2"), stab("Db2"), stab("Ab1"), stab("Ab1"), "[C2/8]x8", "[C2/8]x8"].join(" | "),
      drums:   `[${STAB_DRUMS} |]x6 K/4 S/4 K/4 S/4 | [S/16]x16`,
      cymbals: "[C/4 R/4 R/2 |]x6 [H/8]x8 | R/1",
    },

    // The last chorus: the piano joins, playing the motif's rhythm on each chord.
    final:   { lead: CHORUS, dub: transpose(CHORUS, -12), piano: motifArps(...CHORUS_CHORDS), ...CHORUS_BAND },

    // The motif alone, landing on F.
    outro: {
      piano:   `${MOTIF} | F4+Ab4+C5/1`,
      bass:    "F1/1 | Db2/1 | Ab1/1 | Eb2/1 | F1/1",
    },
  },
});
}
