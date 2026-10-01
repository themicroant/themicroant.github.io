/*
 * "Stormwake" — an original fast melodic metal theme, chip style.
 * G minor, 176 BPM. Thrash-speed tremolo-picked power chords and a driving rock beat under a
 * heroic square-wave lead; the last chorus jumps up a whole step to A minor.
 * Style references for technique only (melodic thrash and power metal, NES action-game
 * soundtracks); every melody and riff is original.
 *
 *   intro    the verse hook alone over a pedal note and toms
 *   verse    the hook over tremolo chords: Gm – Eb – Bb – F
 *   chorus   a soaring line twinned in thirds: Eb – F – Gm – D
 *   break    half-time: stabbed chords, bass and drums trade triplets
 *   chorusUp the chorus transposed up 2 semitones; its last bar pivots to D, back to G minor
 * Loops from the verse. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
const { transpose } = RetroSongs;

// Tremolo power chord for a bar: eight 16ths, then four punched eighths.
const trem = (chord) => `[${chord}/16]x8 ${chord}/8 R/8 ${chord}/8 ${chord}/8`;
const TREM_BASS = (root) => `[${root}/8]x5 R/8 ${root}/8 ${root}/8`;
// A driving rock beat: kick on 1, 3 and the "and" of 3, snare on 2 and 4; hats on their own track.
const BEAT = "K/8 R/8 S/8 R/8 K/8 K/8 S/8 R/8";
const HATS = "[[H/8]x8 |]x4";

const VERSE_HOOK = "G4/4 D5/8 D5/8 D5/4 C5/8 Bb4/8 | C5/4 Bb4/8 G4/8 Bb4/2"
  + " | F4/4 D5/8 D5/8 D5/4 Eb5/8 F5/8 | G5/4. F5/8 Eb5/8 D5/8 C5/4";

const CHORUS = {
  lead:   "Bb5/2 G5/4 Eb5/4 | A5/2 F5/4 C5/4 | Bb5/4 A5/8 G5/8 D6/4 Bb5/4 | A5/4. G5/8 F#5/2",
  twin:   "G5/2 Eb5/4 Bb4/4 | F5/2 C5/4 A4/4 | G5/4 F5/8 D5/8 Bb5/4 G5/4 | F#5/4. D5/8 D5/2",
  guitar: [trem("Eb3+Bb3"), trem("F3+C4"), trem("G2+D3"), trem("D3+A3")].join(" | "),
  bass:   [TREM_BASS("Eb2"), TREM_BASS("F2"), TREM_BASS("G2"), TREM_BASS("D2")].join(" | "),
  drums:  `K+C/8 R/8 S/8 R/8 K/8 K/8 S/8 R/8 | [${BEAT} |]x2 K/8 K/8 S/8 K/8 [S/16]x8`,
  cymbals: HATS,
};

// A whole step up, except the last bar, which turns to D (V of G minor) for the loop.
const lastBar = (text, bar) => [...text.split(" | ").slice(0, -1), bar].join(" | ");
const CHORUS_UP = {
  lead:   lastBar(transpose(CHORUS.lead, 2), "B5/4. A5/8 F#5/2"),
  twin:   lastBar(transpose(CHORUS.twin, 2), "G5/4. F#5/8 D5/2"),
  guitar: lastBar(transpose(CHORUS.guitar, 2), trem("D3+A3")),
  bass:   lastBar(transpose(CHORUS.bass, 2), TREM_BASS("D2")),
  drums:  CHORUS.drums,
  cymbals: CHORUS.cymbals,
};

RetroSongs.register({
  id: "stormwake",
  title: "Stormwake (Melodic Metal)",
  bpm: 176,
  arrangement: ["intro", "verse", "chorus", "verse", "break", "chorusUp"],
  loopFrom: "verse",
  instruments: {
    lead:   { wave: "square",   volume: 0.08 },
    twin:   { wave: "square",   volume: 0.035 },
    guitar: { wave: "sawtooth", volume: 0.028 },
    bass:   { wave: "triangle", volume: 0.3 },
    cymbals: { drums: true, volume: 0.3 },
  },
  sections: {
    // The hook alone over a G pedal, toms rolling in.
    intro: {
      lead:  VERSE_HOOK,
      bass:  "[G1/4]x4 | [G1/4]x4 | [G1/4]x4 | [G1/8]x4 D2/8 D2/8 F#2/8 F#2/8",
      drums: "K/4 R/4 K/4 R/4 | K/4 R/4 K/4 R/4 | K/4 T/8 T/8 K/4 T/8 T/8 | [T/16]x8 [S/16]x8",
    },

    // Gm | Eb | Bb | F
    verse: {
      lead:   VERSE_HOOK,
      guitar: [trem("G2+D3"), trem("Eb3+Bb3"), trem("Bb2+F3"), trem("F3+C4")].join(" | "),
      bass:   [TREM_BASS("G2"), TREM_BASS("Eb2"), TREM_BASS("Bb1"), TREM_BASS("F2")].join(" | "),
      drums:  `K+C/8 R/8 S/8 R/8 K/8 K/8 S/8 R/8 | [${BEAT} |]x2 K/8 R/8 S/8 R/8 S/8 S/8 S/8 S/8`,
      cymbals: HATS,
    },

    chorus: CHORUS,

    // Gm | Eb | Cm | D — half-time stabs; bass and toms answer in quarter-note triplets.
    break: {
      lead:   "R/1 | R/1 | R/1 | A5/4t G5/4t F#5/4t D5/2",
      guitar: "G2+D3/8 R/8 R/4 G2+D3/8 R/8 R/4 | Eb3+Bb3/8 R/8 R/4 Eb3+Bb3/8 R/8 R/4"
            + " | C3+G3/8 R/8 R/4 C3+G3/8 R/8 R/4 | D3+A3/4t D3+A3/4t D3+A3/4t D3+A3/2",
      bass:   "G1/2 G2/4t F2/4t D2/4t | Eb2/2 Eb2/4t D2/4t Bb1/4t | C2/2 C2/4t D2/4t Eb2/4t | D2/4t D2/4t D2/4t D2/2",
      drums:  "K/4 R/4 S/4 R/4 | K/4 R/4 S/4t T/4t T/4t | K/4 R/4 S/4 R/4 | S/4t S/4t S/4t [S/16]x8",
    },

    chorusUp: CHORUS_UP,
  },
});
}
