/*
 * "Ember Requiem" — an original melodic death metal theme, a companion to Ashen Horizon.
 * Same inspiration: the melancholic Gothenburg sound of the opening of "The End" by
 * In Flames (Foregone, 2023): harmonised twin-guitar leads over galloping palm-mutes and
 * double-kick, with a quiet, keyboard-led break. Style and structure only: every melody,
 * riff and chord choice here is original. D minor, 146 BPM.
 *
 *   intro   the lead riff alone over held bass notes and a hi-hat count
 *   twin    the band enters: the riff harmonised a third below, d-beat with double-kick
 *           (played twice)
 *   break   half-time: clean arpeggios, held guitar chords and a slow bell counter-melody
 *           over Dm – Bb – Gm – A
 *   climax  the twin lead again, peaking at D6 in bar 3, with 16th arpeggios; the last
 *           bar runs down onto E so the loop lands back on D
 * Loops from twin, so the intro plays once. Design notes: docs/song-notes.md
 */
RetroSongs.register({
  id: "ember-requiem",
  title: "Ember Requiem (Melodic Death Metal)",
  bpm: 146,
  arrangement: ["intro", "twin", "twin", "break", "climax"],
  loopFrom: "twin",
  instruments: {
    lead:   { wave: "sawtooth", volume: 0.055 },
    twin:   { wave: "sawtooth", volume: 0.035 },
    bell:   { wave: "sine",     volume: 0.12 },
    clean:  { wave: "triangle", volume: 0.12 },
    guitar: { wave: "sawtooth", volume: 0.045 },
  },
  sections: {
    // The lead riff alone: one cell over Dm | Bb | F | A, top note moving each bar.
    intro: {
      lead:  "D5/16 E5/16 F5/8 A5/8 F5/8 E5/16 F5/16 E5/8 D5/8 A4/8 | D5/16 E5/16 F5/8 Bb5/8 F5/8 E5/16 F5/16 E5/8 D5/8 Bb4/8 | C5/16 D5/16 F5/8 A5/8 F5/8 G5/16 A5/16 G5/8 F5/8 C5/8 | E5/4. D5/8 C#5/2",
      bass:  "D2/1 | Bb1/1 | F2/1 | A1/1",
      drums: "[H/8]x8 | [H/8]x8 | [H/8]x8 | [S/16]x8 K/8 S/8 K/8 S/8",
    },

    // Twin leads a third apart; galloping chugs, d-beat with double-kick.
    twin: {
      lead:   "D5/16 E5/16 F5/8 A5/8 F5/8 E5/16 F5/16 E5/8 D5/8 A4/8 | D5/16 E5/16 F5/8 Bb5/8 F5/8 E5/16 F5/16 E5/8 D5/8 Bb4/8 | C5/16 D5/16 F5/8 A5/8 F5/8 G5/16 A5/16 G5/8 F5/8 C5/8 | E5/4. D5/8 C#5/2",
      twin:   "A4/16 C5/16 D5/8 F5/8 D5/8 C5/16 D5/16 C5/8 A4/8 F4/8 | Bb4/16 C5/16 D5/8 F5/8 D5/8 C5/16 D5/16 C5/8 Bb4/8 F4/8 | A4/16 Bb4/16 C5/8 F5/8 C5/8 E5/16 F5/16 E5/8 C5/8 A4/8 | C#5/4. B4/8 A4/2",
      guitar: "[D3/16 D3/16 D3/8]x2 F3/8 D3/8 E3/8 F3/8 | [Bb2/16 Bb2/16 Bb2/8]x2 D3/8 Bb2/8 C3/8 D3/8 | [F2/16 F2/16 F2/8]x2 A2/8 F2/8 G2/8 A2/8 | [A2/16 A2/16 A2/8]x2 E3/8 A2/8 B2/8 C#3/8",
      bass:   "[D2/8]x8 | [Bb1/8]x8 | [F2/8]x8 | [A1/8]x6 B1/8 C#2/8",
      drums:  "[K/16 K/16 S/8]x12 | [K/16 K/16 S/8]x2 [S/16]x8",
    },

    // Half-time break: the band drops back, a slow bell line over clean arpeggios.
    break: {
      bell:   "A5/2 F5/2 | F5/2 D5/2 | D5/2 Bb4/2 | C#5/1",
      clean:  "D4/8 A4/8 D5/8 F5/8 A5/8 F5/8 D5/8 A4/8 | Bb3/8 F4/8 Bb4/8 D5/8 F5/8 D5/8 Bb4/8 F4/8 | G3/8 D4/8 G4/8 Bb4/8 D5/8 Bb4/8 G4/8 D4/8 | A3/8 E4/8 A4/8 C#5/8 E5/8 C#5/8 A4/8 E4/8",
      guitar: "D3/1 | Bb2/1 | G2/1 | A2/2 [A2/16]x8",
      bass:   "D2/1 | Bb1/1 | G1/1 | A1/2 A1/8 B1/8 C#2/8 D2/8",
      drums:  "[K/4 H/8 H/8 S/4 H/8 H/8]x3 | K/4 H/8 H/8 [S/16]x8",
    },

    // Finale: bar 3 climbs to D6 for the first time; bar 4 turns back toward D.
    climax: {
      lead:    "D5/16 E5/16 F5/8 A5/8 F5/8 E5/16 F5/16 E5/8 D5/8 A4/8 | D5/16 E5/16 F5/8 Bb5/8 F5/8 E5/16 F5/16 E5/8 D5/8 Bb4/8 | C5/16 D5/16 F5/8 C6/8 A5/8 Bb5/16 C6/16 D6/8 C6/8 A5/8 | E5/8 F5/8 G5/8 A5/8 Bb5/8 A5/8 G5/8 E5/8",
      twin:    "A4/16 C5/16 D5/8 F5/8 D5/8 C5/16 D5/16 C5/8 A4/8 F4/8 | Bb4/16 C5/16 D5/8 F5/8 D5/8 C5/16 D5/16 C5/8 Bb4/8 F4/8 | A4/16 Bb4/16 C5/8 A5/8 F5/8 G5/16 A5/16 Bb5/8 A5/8 F5/8 | C#5/8 D5/8 E5/8 F5/8 G5/8 F5/8 E5/8 C#5/8",
      harmony: "[D4/16 F4/16 A4/16 F4/16]x4 | [Bb3/16 D4/16 F4/16 D4/16]x4 | [F4/16 A4/16 C5/16 A4/16]x4 | [A3/16 C#4/16 E4/16 G4/16]x4",
      guitar:  "[D3/16 D3/16 D3/8]x2 F3/8 D3/8 E3/8 F3/8 | [Bb2/16 Bb2/16 Bb2/8]x2 D3/8 Bb2/8 C3/8 D3/8 | [F2/16 F2/16 F2/8]x2 A2/8 F2/8 G2/8 A2/8 | [A2/16 A2/16 A2/8]x2 E3/8 A2/8 B2/8 C#3/8",
      bass:    "[D2/8 D3/8]x4 | [Bb1/8 Bb2/8]x4 | [F2/8 F3/8]x4 | [A1/8 A2/8]x4",
      drums:   "[K/16 K/16 S/8]x12 | [K/16 K/16 S/8]x2 [S/16]x4 K/8 S/8",
    },
  },
});
