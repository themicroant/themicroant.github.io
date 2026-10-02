/*
 * "Static Hollow" — an original nu metal / rap rock theme.
 * F minor, 104 BPM. The song shape of early Linkin Park (the Hybrid Theory and Meteora era):
 * a short, sad motif that carries the song, a quiet verse over a hip-hop beat, then a chorus
 * that bursts open under a soaring, doubled melody; a stop-start breakdown builds into the last
 * chorus and the motif ends alone. Voiced like a Sonic the Hedgehog stage on the Sega Genesis:
 * a bright FM electric piano, FM brass, offbeat synth-brass stabs, a slap bass popping octaves,
 * PSG arpeggios, orchestra hits and a crunchy sampled breakbeat, dry, with no reverb.
 * Style references for technique only (nu metal, rap rock); every melody is original.
 *
 *   intro   the motif alone on FM electric piano: Fm – Db – Ab – Eb
 *   verse   motif twice under a low, sparse melody and a hip-hop beat
 *   chorus  brass stabs, slap bass, breakbeat; the melody leaps to Eb6: Db – Ab – Eb – Fm – Db – Ab – Eb – C
 *   bridge  stop-start orchestra hits and PSG arpeggios; a chant-like line climbs to E6 over C major
 *   final   the chorus again, the piano playing the motif's rhythm on each chord
 *   outro   the motif alone, then an F minor chord
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
const PAD = { Fm: "F4+Ab4+C5", Db: "F4+Ab4+Db5", Ab: "Eb4+Ab4+C5", Eb: "Eb4+G4+Bb4", C: "E4+G4+C5" };
// Slap bass per chord: low root, the octave pop, and a fifth leading into the next bar.
const SLAP = { Fm: ["F1", "F2", "C2"], Db: ["Db2", "Db3", "Ab1"], Ab: ["Ab1", "Ab2", "Eb2"],
  Eb: ["Eb2", "Eb3", "Bb1"], C: ["C2", "C3", "G1"] };

// Sonic-style slap bass: root, octave pops and ghosted 16ths in one bar.
const slap = (...chords) => chords.map((c) => {
  const [lo, hi, step] = SLAP[c];
  return `${lo}/8 ${hi}/16 ${lo}/16 R/16 ${lo}/16 ${hi}/8 ${lo}/8 R/16 ${lo}/16 ${hi}/16 ${lo}/16 ${step}/8`;
}).join(" | ");
// Synth-brass chord stabs on the offbeats.
const stabs = (...chords) => chords.map((c) => `R/8 ${PAD[c]}/8 R/8 ${PAD[c]}/16 R/16 R/8 ${PAD[c]}/8 R/4`).join(" | ");
const pads = (...chords) => chords.map((c) => `${PAD[c]}/1`).join(" | ");
// The motif's rhythm (four 8ths, two quarters) on a chord's notes.
const motifArps = (...chords) => chords.map((c) => {
  const [a, b, d] = PAD[c].split("+");
  return `${a}/8 ${b}/8 ${d}/8 ${b}/8 ${d}/4 ${a}/4`;
}).join(" | ");
// Bridge: stop-start hits, the rests are the riff.
const stop = (n) => `${n}/8 ${n}/8 R/8 ${n}/8 R/8 ${n}/8 ${n}/8 R/8`;
const STOP_DRUMS = "K/8 K/8 R/8 K/8 S/8 K/8 K/8 R/8";

// Hip-hop beat for the verse; a breakbeat (a ghosted kick before the second snare) for the chorus.
const HIPHOP = "K/8 R/16 K/16 S/4 R/8 K/8 S/4";
const BREAK = "K/8 R/8 S/8 R/16 K/16 R/8 K/8 S/8 R/8";

const CHORUS_BAND = {
  stab:    stabs(...CHORUS_CHORDS),
  bass:    slap(...CHORUS_CHORDS),
  pad:     pads(...CHORUS_CHORDS),
  drums:   `[${BREAK} |]x7 K/8 R/8 S/8 K/16 S/16 [S/16]x4 S/8 S/8`,
  cymbals: "[C/8 [H/8]x6 O/8 | [H/8]x7 O/8 |]x4",
};

RetroSongs.register({
  id: "static-hollow",
  title: "Static Hollow (Boss)",
  bpm: 104,
  volume: 0.42,
  arrangement: ["intro", "verse", "chorus", "verse", "chorus", "bridge", "final", "outro"],
  loopFrom: "verse",
  master: { compress: true },
  // The Sonic sound set: dry (the Genesis had no reverb), hard-panned, crunchy samples.
  instruments: {
    // FM electric piano: a bright, glassy tine that rings and mellows.
    piano:   { wave: "sine", fm: { ratio: 1, index: 2.8, indexEnd: 0.6, decay: 0.3 }, volume: 0.075, pan: 1,
               env: { a: 0.002, d: 1.1, s: 0.15, r: 0.3 }, gate: 0.98 },
    // Bright FM brass lead; "dub" doubles it an octave down, hard left.
    lead:    { wave: "sine", fm: { ratio: 1, index: 3, indexEnd: 1.8, decay: 0.15 }, volume: 0.1,
               env: { a: 0.008, d: 0.15, s: 0.75, r: 0.06 }, gate: 0.92, filter: { freq: 5500 },
               vibrato: { rate: 6, depth: 12, delay: 0.2 } },
    dub:     { wave: "sine", fm: { ratio: 1, index: 2.4, indexEnd: 1.5, decay: 0.15 }, volume: 0.055, pan: -1,
               env: { a: 0.008, d: 0.15, s: 0.75, r: 0.06 }, gate: 0.92, filter: { freq: 4500 } },
    // Short synth-brass chords, hard left.
    stab:    { wave: "sine", fm: { ratio: 1, index: 2.2, indexEnd: 0.8, decay: 0.1 }, volume: 0.026, pan: -1,
               env: { a: 0.003, d: 0.12, s: 0.4, r: 0.05 }, gate: 0.8 },
    // FM orchestra hit for the bridge.
    hit:     { wave: "sine", fm: { ratio: 3.5, index: 7, indexEnd: 0.5, decay: 0.2 }, volume: 0.04,
               env: { a: 0.002, d: 0.35, s: 0.15, r: 0.12 } },
    // Soft FM pad under the chorus.
    pad:     { wave: "sine", fm: { ratio: 2, index: 0.8, indexEnd: 0.5, decay: 0.5 }, volume: 0.016,
               env: { a: 0.3, d: 0.4, s: 0.8, r: 0.4 }, gate: 1 },
    psg:     { wave: "square", volume: 0.016, gate: 0.6, pan: 1 },
    // FM slap bass: a snapping pop on each note.
    bass:    { wave: "sine", fm: { ratio: 1, index: 6.5, indexEnd: 1.6, decay: 0.12 }, volume: 0.25,
               env: { a: 0.002, d: 0.22, s: 0.45, r: 0.04 }, gate: 0.85 },
    drums:   { drums: true, kit: "studio", bits: 6, volume: 0.42, filter: { freq: 7000 } },
    cymbals: { drums: true, kit: "studio", bits: 6, volume: 0.15, filter: { freq: 9000 } },
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

    // Fm | Fm | Db | Db | Ab | Ab | C | C — stop-start orchestra hits, building to the last chorus.
    bridge: {
      lead:    BRIDGE,
      hit:     [stop(PAD.Fm), stop(PAD.Fm), stop(PAD.Db), stop(PAD.Db), stop(PAD.Ab), stop(PAD.Ab), `${PAD.C}/2 ${PAD.C}/2`, `[${PAD.C}/8]x8`].join(" | "),
      psg:     "[C6/16 Ab5/16 F5/16 Ab5/16]x8 | [Db6/16 Ab5/16 F5/16 Ab5/16]x8 | [C6/16 Ab5/16 Eb5/16 Ab5/16]x8 | [C6/16 G5/16 E5/16 G5/16]x8",
      bass:    [stop("F1"), stop("F1"), stop("Db2"), stop("Db2"), stop("Ab1"), stop("Ab1"), "[C2/8 C3/8]x4", "[C2/8 C3/8]x4"].join(" | "),
      drums:   `[${STOP_DRUMS} |]x6 K/4 S/4 K/4 S/4 | [S/16]x12 [T/16]x4`,
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
