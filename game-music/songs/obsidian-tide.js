/*
 * "Obsidian Tide" — an original melodic death metal theme in a Sega Genesis style.
 * F# minor, 164 BPM. Gothenburg-style twin leads in parallel thirds and galloping
 * riffs, voiced like a Mega Drive soundtrack (think 16-bit shooters with FM metal
 * guitars): YM2612-style FM for every melodic part, square-wave PSG arpeggios,
 * lo-fi bit-crushed drum samples, hard left/right panning and no reverb.
 * Style references for the sound only; all melodic material is original.
 *
 *   intro   the twin lead alone over pulsing FM bass and hi-hats
 *   riff    galloping FM guitars hard left/right, PSG arpeggios, double-kick
 *   lead    the main theme on FM brass-like leads, twinned in thirds
 *   lead2   the theme again, climbing higher in bars 3–4
 *   break   FM slap bass riff with orchestra-hit stabs, snare/tom build-up
 *   finale  the intro melody over the full band, resolving onto F#
 * Loops from riff. Design notes: docs/song-notes.md
 */
RetroSongs.register({
  id: "obsidian-tide",
  title: "Obsidian Tide (Genesis-style)",
  bpm: 164,
  volume: 0.4,
  arrangement: ["intro", "riff", "lead", "lead2", "break", "finale"],
  loopFrom: "riff",
  master: { compress: true },
  instruments: {
    // FM lead guitar: bright, slightly driven, vibrato after the attack. Centre, like the hardware.
    lead:    { wave: "sine", fm: { ratio: 1, index: 3.2, indexEnd: 2.2, decay: 0.25 }, drive: 0.3, volume: 0.09,
               env: { a: 0.006, d: 0.15, s: 0.85, r: 0.07 }, gate: 0.95, filter: { freq: 5000 },
               vibrato: { rate: 6, depth: 14, delay: 0.22 } },
    twin:    { wave: "sine", fm: { ratio: 1, index: 2.6, indexEnd: 1.8, decay: 0.25 }, drive: 0.3, volume: 0.065,
               env: { a: 0.006, d: 0.15, s: 0.85, r: 0.07 }, gate: 0.95, filter: { freq: 4500 },
               vibrato: { rate: 5.6, depth: 14, delay: 0.25 } },
    // FM rhythm guitars: high modulation index plus drive, panned hard left and right.
    gtrL:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4, decay: 0.08 }, drive: 0.75, volume: 0.05, pan: -1,
               filter: { freq: 4500, q: 0.8 }, env: { a: 0.002, d: 0.06, s: 0.7, r: 0.03 }, gate: 0.85 },
    gtrR:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 4, decay: 0.08 }, drive: 0.75, volume: 0.045, pan: 1,
               filter: { freq: 4500, q: 0.8 }, env: { a: 0.002, d: 0.06, s: 0.7, r: 0.03 }, gate: 0.85 },
    // FM slap bass: the modulation index snaps down right after the attack.
    bass:    { wave: "sine", fm: { ratio: 1, index: 6, indexEnd: 1.8, decay: 0.15 }, volume: 0.26,
               env: { a: 0.002, d: 0.3, s: 0.55, r: 0.05 }, gate: 0.9 },
    // PSG square arpeggios, quiet and staccato (the SN76489 chip is mono).
    psg:     { wave: "square", volume: 0.022, gate: 0.6 },
    // FM "orchestra hit": inharmonic ratio, fast-falling index. Two tracks make the chord.
    hit:     { wave: "sine", fm: { ratio: 3.5, index: 7, indexEnd: 0.5, decay: 0.2 }, volume: 0.07, pan: -0.5,
               env: { a: 0.002, d: 0.35, s: 0.15, r: 0.12 } },
    hit2:    { wave: "sine", fm: { ratio: 3.5, index: 7, indexEnd: 0.5, decay: 0.2 }, volume: 0.06, pan: 0.5,
               env: { a: 0.002, d: 0.35, s: 0.15, r: 0.12 } },
    // Drum "samples": the studio kit crushed to 6 bits and dulled like a low sample rate.
    drums:   { drums: true, kit: "studio", bits: 6, volume: 0.5, filter: { freq: 7000 } },
    cymbals: { drums: true, kit: "studio", bits: 5, volume: 0.24, filter: { freq: 9000 } },
  },
  sections: {
    // F#m | D | A | C# — the twin lead alone.
    intro: {
      lead:    "C#5/8 F#5/8 A5/8 G#5/8 F#5/8 E5/8 F#5/8 C#5/8 | D5/8 F#5/8 A5/8 F#5/8 B5/4 A5/8 F#5/8 | E5/8 A5/8 C#6/8 B5/8 A5/8 G#5/8 A5/8 E5/8 | F5/8 G#5/8 C#6/8 B5/8 G#5/4 F5/4",
      twin:    "A4/8 D5/8 F#5/8 E5/8 D5/8 C#5/8 D5/8 A4/8 | B4/8 D5/8 F#5/8 D5/8 F#5/4 F#5/8 D5/8 | C#5/8 F#5/8 A5/8 G#5/8 F#5/8 E5/8 F#5/8 C#5/8 | C#5/8 F5/8 G#5/8 G#5/8 F5/4 C#5/4",
      bass:    "[F#1/4]x4 | [D2/4]x4 | [A1/4]x4 | [C#2/4]x4",
      drums:   "K/4 R/4 K/4 R/4 | K/4 R/4 K/4 R/4 | K/4 R/4 K/4 R/4 | [S/16]x8 S/8 S/8 S/8 S/8",
      cymbals: "[H/8]x8 | [H/8]x8 | [H/8]x8 | R/1",
    },

    // F#m | E | D | C# — galloping riff, lead out.
    riff: {
      gtrL:    "[F#2/16 F#2/16 F#2/8]x3 A2/8 G#2/8 | [E2/16 E2/16 E2/8]x3 G#2/8 F#2/8 | [D2/16 D2/16 D2/8]x3 F#2/8 E2/8 | [C#2/16 C#2/16 C#2/8]x2 C#2/8 D2/8 E2/8 F2/8",
      gtrR:    "[C#3/16 C#3/16 C#3/8]x3 E3/8 D#3/8 | [B2/16 B2/16 B2/8]x3 D#3/8 C#3/8 | [A2/16 A2/16 A2/8]x3 C#3/8 B2/8 | [G#2/16 G#2/16 G#2/8]x2 G#2/8 A2/8 B2/8 C3/8",
      psg:     "[F#4/16 A4/16 C#5/16 A4/16]x4 | [E4/16 G#4/16 B4/16 G#4/16]x4 | [D4/16 F#4/16 A4/16 F#4/16]x4 | [C#4/16 F4/16 G#4/16 F4/16]x4",
      bass:    "[F#1/8 F#2/8]x4 | [E1/8 E2/8]x4 | [D2/8 D3/8]x4 | [C#2/8 C#3/8]x2 C#2/8 D2/8 E2/8 F2/8",
      drums:   "[[K/16]x4 S/8 K/16 K/16]x6 | [K/16]x4 S/8 K/16 K/16 [S/16]x4 [T/16]x4",
      cymbals: "C/4 [H/8]x6 | [H/8]x8 | C/4 [H/8]x6 | [H/8]x6 C/4",
    },

    // F#m | D | E | C# — the main theme.
    lead: {
      lead:    "F#5/4. G#5/8 A5/4 C#6/4 | B5/8 A5/8 F#5/4 D5/2 | E5/8 F#5/8 G#5/8 A5/8 B5/4. A5/8 | G#5/2 F5/4 C#5/4",
      twin:    "C#5/4. E5/8 F#5/4 A5/4 | F#5/8 F#5/8 D5/4 A4/2 | C#5/8 D5/8 E5/8 F#5/8 G#5/4. F#5/8 | F5/2 C#5/4 G#4/4",
      gtrL:    "[F#2/8]x8 | [D2/8]x8 | [E2/8]x8 | [C#2/8]x8",
      gtrR:    "[C#3/8]x8 | [A2/8]x8 | [B2/8]x8 | [G#2/8]x8",
      bass:    "[F#1/8 F#2/8]x4 | [D2/8 D3/8]x4 | [E1/8 E2/8]x4 | [C#2/8 C#3/8]x4",
      drums:   "[K/8 K/8 S/8 K/8]x7 [S/16]x4 T/8 T/8",
      cymbals: "C/4 [H/8]x6 | C/4 [H/8]x6 | C/4 [H/8]x6 | C/4 [H/8]x6",
    },

    // The theme again with galloping backing; bars 3–4 climb to C#6.
    lead2: {
      lead:    "F#5/4. G#5/8 A5/4 C#6/4 | B5/8 A5/8 F#5/4 D5/2 | E5/8 F#5/8 G#5/8 A5/8 C#6/4. B5/8 | C#6/4 B5/8 A5/8 G#5/8 F5/8 G#5/4",
      twin:    "C#5/4. E5/8 F#5/4 A5/4 | F#5/8 F#5/8 D5/4 A4/2 | C#5/8 D5/8 E5/8 F#5/8 A5/4. G#5/8 | G#5/4 G#5/8 F#5/8 F5/8 C#5/8 F5/4",
      gtrL:    "[F#2/16 F#2/16 F#2/8]x4 | [D2/16 D2/16 D2/8]x4 | [E2/16 E2/16 E2/8]x4 | [C#2/16 C#2/16 C#2/8]x4",
      gtrR:    "[C#3/16 C#3/16 C#3/8]x4 | [A2/16 A2/16 A2/8]x4 | [B2/16 B2/16 B2/8]x4 | [G#2/16 G#2/16 G#2/8]x4",
      psg:     "[F#4/16 A4/16 C#5/16 A4/16]x4 | [D4/16 F#4/16 A4/16 F#4/16]x4 | [E4/16 G#4/16 B4/16 G#4/16]x4 | [C#4/16 F4/16 G#4/16 F4/16]x4",
      bass:    "[F#1/8 F#2/8]x4 | [D2/8 D3/8]x4 | [E1/8 E2/8]x4 | [C#2/8 C#3/8]x4",
      drums:   "[[K/16]x4 S/8 K/16 K/16]x6 | [K/16]x4 S/8 K/16 K/16 [S/16]x4 [T/16]x4",
      cymbals: "C/4 [H/8]x6 | C/4 [H/8]x6 | C/4 [H/8]x6 | [H/8]x6 C/4",
    },

    // D | E | F#m | C# — FM slap bass riff, orchestra-hit stabs.
    break: {
      bass:    "D2/8 D3/16 D2/16 R/8 D2/8 A2/8 D3/8 C3/8 A2/8 | E2/8 E3/16 E2/16 R/8 E2/8 B2/8 E3/8 D3/8 B2/8 | F#2/8 F#3/16 F#2/16 R/8 F#2/8 C#3/8 F#3/8 E3/8 C#3/8 | C#2/8 C#3/16 C#2/16 R/8 C#2/8 G#2/8 C#3/8 F2/8 G#2/8",
      hit:     "D4/8 R/8 R/4 R/2 | E4/8 R/8 R/4 R/2 | F#4/8 R/8 R/4 R/4 F#4/8 R/8 | C#4/8 R/8 C#4/8 R/8 F4/4 G#4/4",
      hit2:    "F#4/8 R/8 R/4 R/2 | G#4/8 R/8 R/4 R/2 | A4/8 R/8 R/4 R/4 A4/8 R/8 | F4/8 R/8 F4/8 R/8 G#4/4 C5/4",
      gtrL:    "D2/8 R/8 R/4 R/2 | E2/8 R/8 R/4 R/2 | F#2/8 R/8 R/4 R/4 F#2/8 R/8 | [C#2/16]x16",
      gtrR:    "A2/8 R/8 R/4 R/2 | B2/8 R/8 R/4 R/2 | C#3/8 R/8 R/4 R/4 C#3/8 R/8 | [G#2/16]x16",
      psg:     "[D5/16 F#5/16 A5/16 F#5/16]x4 | [E5/16 G#5/16 B5/16 G#5/16]x4 | [F#5/16 A5/16 C#6/16 A5/16]x4 | [C#5/16 F5/16 G#5/16 F5/16]x4",
      drums:   "K/4 R/8 K/8 S/4 R/4 | K/4 R/8 K/8 S/4 R/4 | K/4 R/8 K/8 S/4 K/8 K/8 | [S/16]x12 [T/16]x4",
      cymbals: "C/4 [H/8]x6 | [H/8]x8 | [H/8]x8 | R/1",
    },

    // F#m | D | A | C# — the intro melody with everything, resolving onto F#.
    finale: {
      lead:    "C#5/8 F#5/8 A5/8 G#5/8 F#5/8 E5/8 F#5/8 C#5/8 | D5/8 F#5/8 A5/8 F#5/8 B5/4 A5/8 F#5/8 | E5/8 A5/8 C#6/8 B5/8 A5/8 G#5/8 A5/8 E5/8 | F5/8 G#5/8 C#6/8 B5/8 A5/8 G#5/8 F#5/4",
      twin:    "A4/8 D5/8 F#5/8 E5/8 D5/8 C#5/8 D5/8 A4/8 | B4/8 D5/8 F#5/8 D5/8 F#5/4 F#5/8 D5/8 | C#5/8 F#5/8 A5/8 G#5/8 F#5/8 E5/8 F#5/8 C#5/8 | C#5/8 F5/8 G#5/8 G#5/8 F#5/8 F5/8 C#5/4",
      gtrL:    "[F#2/16 F#2/16 F#2/8]x4 | [D2/16 D2/16 D2/8]x4 | [A2/16 A2/16 A2/8]x4 | [C#2/16 C#2/16 C#2/8]x2 C#2/8 D2/8 E2/8 F2/8",
      gtrR:    "[C#3/16 C#3/16 C#3/8]x4 | [A2/16 A2/16 A2/8]x4 | [E3/16 E3/16 E3/8]x4 | [G#2/16 G#2/16 G#2/8]x2 G#2/8 A2/8 B2/8 C3/8",
      psg:     "[F#4/16 A4/16 C#5/16 A4/16]x4 | [D4/16 F#4/16 A4/16 F#4/16]x4 | [A4/16 C#5/16 E5/16 C#5/16]x4 | [C#4/16 F4/16 G#4/16 F4/16]x4",
      bass:    "[F#1/8 F#2/8]x4 | [D2/8 D3/8]x4 | [A1/8 A2/8]x4 | [C#2/8 C#3/8]x2 C#2/8 D2/8 E2/8 F2/8",
      drums:   "[[K/16]x4 S/8 K/16 K/16]x6 | [K/16]x4 S/8 K/16 K/16 [S/16]x4 [T/16]x4",
      cymbals: "C/4 [H/8]x6 | C/4 [H/8]x6 | C/4 [H/8]x6 | [H/8]x6 C/4",
    },
  },
});
