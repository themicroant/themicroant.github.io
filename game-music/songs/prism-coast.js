/*
 * "Prism Coast" — an original, upbeat 16-bit action stage theme in a Sega Genesis style.
 * F major, 150 BPM. Inspired by the sound of Sonic 3: a funky FM slap bass popping octaves
 * in 16ths, a bright FM brass lead whose notes land just before the beat (syncopated
 * anticipations), offbeat synth-brass chord stabs on jazzy seventh chords, a borrowed minor
 * chord for colour, and a crunchy sampled breakbeat.
 * Style references for technique only (Mega Drive platformer stage music); every melody
 * and riff is original.
 *
 *   intro  breakbeat, slap bass and stabs on the A chords; a pickup run into the tune
 *   A      the hook, pushed ahead of the beat: Bbmaj7 – C – Am7 – Dm7 – Bbmaj7 – C – Gm7 – C7
 *   B      longer notes and a run up to E6: Dm – Gm – C – F – Bb – Bbm – C – C7
 *   A2     the hook twinned in thirds, PSG arpeggios on top
 *   break  call and response: the lead plays half the hook, the slap bass answers
 * Loops from A. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
// Each tied 8th starts a note half a beat early, so it "pushes" ahead of beat 3.
const HOOK = "R/8 D5/8 F5/8 A5/8~ A5/4 G5/8 F5/8 | G5/8 E5/8 C5/8 E5/8~ E5/2"
  + " | R/8 C5/8 E5/8 G5/8~ G5/4 A5/8 G5/8 | F5/8 E5/8 D5/8 F5/8~ F5/2"
  + " | R/8 D5/8 F5/8 A5/8~ A5/4 C6/8 D6/8 | E6/8 D6/8 C6/8 G5/8~ G5/2"
  + " | R/8 Bb5/8 A5/8 G5/8~ G5/4 F5/8 G5/8 | G5/8 A5/8 Bb5/8 E5/8~ E5/2";
// A third below, kept to the chord.
const HOOK_TWIN = "R/8 Bb4/8 D5/8 F5/8~ F5/4 E5/8 D5/8 | E5/8 C5/8 G4/8 C5/8~ C5/2"
  + " | R/8 A4/8 C5/8 E5/8~ E5/4 F5/8 E5/8 | D5/8 C5/8 A4/8 D5/8~ D5/2"
  + " | R/8 Bb4/8 D5/8 F5/8~ F5/4 A5/8 Bb5/8 | C6/8 Bb5/8 A5/8 E5/8~ E5/2"
  + " | R/8 G5/8 F5/8 D5/8~ D5/4 D5/8 E5/8 | E5/8 F5/8 G5/8 C5/8~ C5/2";
const TUNE_B = "A5/4. G5/8 F5/4 A5/4 | Bb5/4. A5/8 G5/2 | E5/4t F5/4t G5/4t C6/2 | A5/2 F5/4 C5/4"
  + " | D5/4. F5/8 Bb5/4 D6/4 | Db6/4. C6/8 Bb5/4 F5/4"
  + " | E5/8 F5/8 G5/8 A5/8 Bb5/8 C6/8 D6/8 E6/8 | Bb5/4 G5/4 E5/4 C5/4";

const CHORD = {
  Bbmaj7: "Bb3+D4+F4+A4", C: "C4+E4+G4", Am7: "A3+C4+E4+G4", Dm7: "A3+C4+D4+F4", Gm7: "Bb3+D4+F4+G4",
  C7: "Bb3+C4+E4+G4", Dm: "A3+D4+F4", Gm: "Bb3+D4+G4", F: "A3+C4+F4", Bb: "Bb3+D4+F4", Bbm: "Bb3+Db4+F4",
};
// Slap bass: low root, octave pops and ghosted 16ths, then an approach note into the next bar.
const BASS = {
  Bbmaj7: ["Bb1", "Bb2", "B1"], C: ["C2", "C3", "G1"], Am7: ["A1", "A2", "C2"], Dm7: ["D2", "D3", "A1"],
  Gm7: ["G1", "G2", "B1"], C7: ["C2", "C3", "E2"], Dm: ["D2", "D3", "F2"], Gm: ["G1", "G2", "B1"],
  F: ["F1", "F2", "A1"], Bb: ["Bb1", "Bb2", "Bb1"], Bbm: ["Bb1", "Bb2", "B1"],
};
const ARP = {
  Bbmaj7: "D5 F5 A5 F5", C: "E5 G5 C6 G5", Am7: "C5 E5 G5 E5", Dm7: "D5 F5 A5 F5",
  Gm7: "D5 F5 G5 F5", C7: "E5 G5 Bb5 G5",
};

const slap = (c) => {
  const [lo, hi, step] = BASS[c];
  return `${lo}/8 ${hi}/16 ${lo}/16 R/16 ${lo}/16 ${hi}/8 ${lo}/8 R/16 ${lo}/16 ${hi}/16 ${lo}/16 ${step}/8`;
};
// Synth-brass stabs on the offbeats.
const stab = (c) => `R/8 ${CHORD[c]}/8 R/8 ${CHORD[c]}/16 R/16 R/8 ${CHORD[c]}/8 R/4`;
const arp = (c) => `[${ARP[c].split(" ").map((n) => n + "/16").join(" ")}]x4`;
const each = (fn, chords) => chords.map(fn).join(" | ");

const A = ["Bbmaj7", "C", "Am7", "Dm7", "Bbmaj7", "C", "Gm7", "C7"];
const B = ["Dm", "Gm", "C", "F", "Bb", "Bbm", "C", "C7"];

// A breakbeat: kick, snare, a ghosted kick before the second snare.
const BREAK = "K/8 R/8 S/8 R/16 K/16 R/8 K/8 S/8 R/8";
const BEAT = `[${BREAK} |]x7 K/8 R/8 S/8 K/16 S/16 [S/16]x4 S/8 S/8`;
const HATS = "C/8 [H/8]x6 O/8 | [[H/8]x7 O/8 |]x7";

RetroSongs.register({
  id: "prism-coast",
  title: "Prism Coast (Stage Theme)",
  bpm: 150,
  volume: 0.42,
  arrangement: ["intro", "A", "B", "A2", "break"],
  loopFrom: "A",
  master: { compress: true },
  instruments: {
    // Bright FM brass lead.
    lead:    { wave: "sine", fm: { ratio: 1, index: 3, indexEnd: 1.8, decay: 0.15 }, volume: 0.1,
               env: { a: 0.008, d: 0.15, s: 0.75, r: 0.06 }, gate: 0.92, filter: { freq: 5500 },
               vibrato: { rate: 6, depth: 12, delay: 0.2 } },
    twin:    { wave: "sine", fm: { ratio: 1, index: 2.4, indexEnd: 1.5, decay: 0.15 }, volume: 0.055, pan: 1,
               env: { a: 0.008, d: 0.15, s: 0.75, r: 0.06 }, gate: 0.92, filter: { freq: 4500 } },
    // Short synth-brass chords, slightly left.
    stab:    { wave: "sine", fm: { ratio: 1, index: 2.2, indexEnd: 0.8, decay: 0.1 }, volume: 0.026, pan: -1,
               env: { a: 0.003, d: 0.12, s: 0.4, r: 0.05 }, gate: 0.8 },
    psg:     { wave: "square", volume: 0.016, gate: 0.6, pan: 1 },
    // FM slap bass: a metallic pop on each note.
    bass:    { wave: "sine", fm: { ratio: 1, index: 6.5, indexEnd: 1.6, decay: 0.12 }, volume: 0.25,
               env: { a: 0.002, d: 0.22, s: 0.45, r: 0.04 }, gate: 0.85 },
    drums:   { drums: true, kit: "studio", bits: 6, volume: 0.42, filter: { freq: 7000 } },
    cymbals: { drums: true, kit: "studio", bits: 6, volume: 0.15, filter: { freq: 9000 } },
  },
  sections: {
    // Bbmaj7 | C | Am7 | Dm7 — the band without the tune; the lead runs up into the hook.
    intro: {
      lead:    "R/1 | R/1 | R/1 | R/2 A4/8t Bb4/8t C5/8t R/4",
      stab:    each(stab, A.slice(0, 4)),
      bass:    each(slap, A.slice(0, 4)),
      drums:   `[${BREAK} |]x3 K/8 R/8 S/8 R/8 [S/16]x8`,
      cymbals: "C/8 [H/8]x6 O/8 | [[H/8]x7 O/8 |]x2 [H/8]x4 C/2",
    },

    A:  { lead: HOOK, stab: each(stab, A), bass: each(slap, A), drums: BEAT, cymbals: HATS },
    B:  { lead: TUNE_B, stab: each(stab, B), bass: each(slap, B), drums: BEAT, cymbals: HATS },
    A2: { lead: HOOK, twin: HOOK_TWIN, psg: each(arp, A), stab: each(stab, A), bass: each(slap, A), drums: BEAT, cymbals: HATS },

    // Bbmaj7 | C | Dm7 | C7 — half the hook, then the bass answers; a triplet pickup back into A.
    break: {
      lead:    "R/8 D5/8 F5/8 A5/8~ A5/4 R/4 | R/1 | R/8 F5/8 A5/8 C6/8~ C6/4 R/4 | R/2 G5/8t A5/8t Bb5/8t C6/4",
      stab:    `${CHORD.Bbmaj7}/8 R/8 R/2. | R/1 | ${CHORD.Dm7}/8 R/8 R/2. | R/1`,
      bass:    `Bb1/4 R/4 R/2 | ${slap("C")} | D2/4 R/4 R/2 | ${slap("C7")}`,
      drums:   `K/4 R/4 S/4 R/4 | ${BREAK} | K/4 R/4 S/4 R/4 | K/8 R/8 S/8 R/8 [S/16]x4 [T/16]x4`,
      cymbals: "C/4 R/2. | [H/8]x8 | C/4 R/2. | [H/8]x4 R/4 C/4",
    },
  },
});
}
