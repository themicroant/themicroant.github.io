/*
 * "Iron Lament" — an original melodic metal theme, chip style.
 * E minor, 152 BPM. Galloping power chords, a singable twin-lead chorus harmonised in
 * thirds, a palm-muted verse riff and a triplet-run solo, voiced like an NES soundtrack:
 * sawtooth leads and guitar, triangle bass, noise drums.
 * Style references for technique only (twin-guitar melodic metal, NES-era rock soundtracks);
 * every melody and riff is original.
 *
 *   intro    clean arpeggios under held power chords, tom build-up
 *   verse    palm-muted riff answering itself, lead out
 *   chorus   the hook: E E — E up to B, twin lead in thirds, galloping chords
 *   solo     sextuplet arpeggio runs over C – D – Am – B
 *   outro    the hook once more, resolving to a held E
 * Loops from the verse. Design notes: docs/song-notes.md
 */
// The braces keep these names private to this file: every song shares one page.
{
// Power chords (root + fifth), one per chord name.
const PC = { Em: "E2+B2", C: "C3+G3", D: "D3+A3", B: "B2+F#3", Am: "A2+E3" };
const ROOT = { Em: "E2", C: "C2", D: "D2", B: "B1", Am: "A1" };
// 8th + two 16ths, four times a bar: the gallop.
const gallop = (...chords) => chords.map((c) => `[${PC[c]}/8 ${PC[c]}/16 ${PC[c]}/16]x4`).join(" | ");
const bassGallop = (...chords) => chords.map((c) => `[${ROOT[c]}/8 ${ROOT[c]}/16 ${ROOT[c]}/16]x4`).join(" | ");
const GALLOP_DRUMS = "[K/8 K/16 K/16 S/8 K/16 K/16]x2";

// The hook: repeated notes with a gap, then a leap of a fifth. Ties push bars 2 and 4.
const HOOK = "E5/8 E5/8 R/8 E5/8 B5/4. A5/8 | G5/8 F#5/8 E5/8 G5/8~ G5/2"
  + " | F#5/8 F#5/8 R/8 F#5/8 A5/4. G5/8 | F#5/8 E5/8 D#5/8 F#5/8~ F#5/2";
// The second guitar, a third (or a chord tone) under the hook.
const TWIN = "B4/8 B4/8 R/8 B4/8 G5/4. F#5/8 | E5/8 D5/8 C5/8 E5/8~ E5/2"
  + " | D5/8 D5/8 R/8 D5/8 F#5/4. E5/8 | D#5/8 C5/8 B4/8 D#5/8~ D#5/2";
const firstBars = (text, n) => text.split(" | ").slice(0, n).join(" | ");

RetroSongs.register({
  id: "iron-lament",
  title: "Iron Lament (Melodic Metal)",
  bpm: 152,
  arrangement: ["intro", "verse", "chorus", "verse", "chorus", "solo", "outro"],
  loopFrom: "verse",
  instruments: {
    lead:   { wave: "sawtooth", volume: 0.055 },
    twin:   { wave: "sawtooth", volume: 0.035 },
    clean:  { wave: "triangle", volume: 0.1 },
    // Two notes per chord, so each is quieter than a single-note guitar.
    guitar: { wave: "sawtooth", volume: 0.03 },
    bass:   { wave: "triangle", volume: 0.3 },
  },
  sections: {
    // Em | C | D | B — held chords ring over clean arpeggios.
    intro: {
      clean:  "[E4/16 G4/16 B4/16 E5/16]x4 | [C4/16 E4/16 G4/16 C5/16]x4 | [D4/16 F#4/16 A4/16 D5/16]x4 | [B3/16 D#4/16 F#4/16 B4/16]x4",
      guitar: "E2+B2/2.~ E2+B2/8 R/8 | C3+G3/2.~ C3+G3/8 R/8 | D3+A3/2.~ D3+A3/8 R/8 | B2+F#3/4 B2+F#3/4 R/2",
      bass:   "E2/1 | C2/1 | D2/1 | B1/4 B1/4 R/2",
      drums:  "K/1 | K/1 | K/1 | K/4 K/4 [T/16]x4 [S/16]x4",
    },

    // Em riff that answers itself: a low palm-muted pulse with a rising top note.
    verse: {
      guitar: "E2/16 E2/16 E3/8 E2/16 E2/16 D3/8 E2/16 E2/16 C3/8 E2/16 E2/16 B2/8"
            + " | E2/16 E2/16 E3/8 E2/16 E2/16 D3/8 E2/16 E2/16 C3/8 E2/16 E2/16 B2/8"
            + " | E2/16 E2/16 G3/8 E2/16 E2/16 F#3/8 E2/16 E2/16 E3/8 D3/8 B2/8"
            + " | [E2/16]x8 G2/8 A2/8 A#2/8 B2/8",
      bass:   "[E2/8]x8 | [E2/8]x8 | [E2/8]x8 | [E2/16]x8 G2/8 A2/8 A#2/8 B2/8",
      drums:  "[K/8 H/8 S/8 H/8]x6 | K/8 K/8 S/8 K/8 [S/16]x8",
    },

    // Em | C | D | B — the hook, twinned, over the gallop.
    chorus: {
      lead:   HOOK,
      twin:   TWIN,
      guitar: gallop("Em", "C", "D", "B"),
      bass:   bassGallop("Em", "C", "D", "B"),
      drums:  `[${GALLOP_DRUMS} |]x3 [K/16]x8 [S/16]x8`,
    },

    // C | D | Am | B — sextuplet arpeggios (three 16th-triplets = half a beat) and a climb to B5.
    solo: {
      lead:   "[G5/16t E5/16t C5/16t]x4 G5/8t A5/8t B5/8t C6/4t B5/8t"
            + " | [A5/16t F#5/16t D5/16t]x4 A5/8t B5/8t C6/8t D6/4t C6/8t"
            + " | [C6/16t A5/16t E5/16t]x4 C6/8t B5/8t A5/8t E5/4"
            + " | D#5/8t E5/8t F#5/8t A5/8t G5/8t F#5/8t B5/2",
      guitar: gallop("C", "D", "Am", "B"),
      bass:   bassGallop("C", "D", "Am", "B"),
      drums:  "[[K/16]x8 S/4 S/4 |]x3 [S/16]x8 K/8 S/8 K/8 S/8",
    },

    // The hook's first three bars, then everything lands on E and rings.
    outro: {
      lead:   `${firstBars(HOOK, 3)} | E5/1`,
      twin:   `${firstBars(TWIN, 3)} | B4/1`,
      guitar: `${gallop("Em", "C", "D")} | E2+B2/1`,
      bass:   `${bassGallop("Em", "C", "D")} | E2/1`,
      drums:  `[${GALLOP_DRUMS} |]x3 K/4 R/2.`,
    },
  },
});
}
