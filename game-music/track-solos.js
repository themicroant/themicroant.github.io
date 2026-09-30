/*
 * Track solos — a listening aid, not songs. For every N64-style song (the ones with reverb)
 * this adds one jukebox entry per track, with only that track playing: same instrument,
 * reverb and master chain as in the full mix, so a sound can be traced to its track.
 * Load it after the songs. Remove its <script> tag from index.html to hide the solos.
 */
(function () {
  "use strict";
  const songs = RetroSongs.list.filter((song) => song.reverb);
  for (const song of songs) {
    const compiled = RetroPlayer.compileSong(song);
    const tracks = [...new Set(Object.values(song.sections)
      .flatMap((sec) => Object.keys(sec).filter((k) => k !== "timeSig")))];
    for (const track of tracks) {
      // Every section keeps its length; where this track is silent it plays rests.
      const sections = Object.fromEntries(Object.entries(song.sections).map(([name, sec]) => [name, {
        ...(sec.timeSig ? { timeSig: sec.timeSig } : {}),
        [track]: sec[track] ?? `[R/16]x${Math.round(compiled[name].beats * 4)}`,
      }]));
      RetroSongs.register({
        ...song,
        id: `${song.id}--${track}`,
        title: `${song.title.replace(/ \(.*\)$/, "")} › ${track} (solo)`,
        sections,
      });
      if (song.id === "lanternwood" && track === "pad") addLadder(song, track, sections);
    }
  }

  // The same solo with one more piece of the sound chain removed at each step. Whichever
  // step the static disappears at is its cause; if it never does, it's the playback itself.
  function addLadder(song, track, sections) {
    const inst = song.instruments[track];
    const steps = [
      ["no reverb", { ...inst }],
      ["no reverb, 1 voice", { ...inst, voices: 1, detune: 0 }],
      ["no reverb, 1 voice, no filter", { ...inst, voices: 1, detune: 0, filter: undefined }],
      ["plain sine", { wave: "sine", volume: 0.008, env: inst.env, gate: inst.gate }],
    ];
    // Tests 5-8 each change one thing from test 3 (a bare sawtooth), to tell apart aliasing,
    // chords, the envelope and loudness as the source of static.
    const bare = { ...inst, voices: 1, detune: 0, filter: undefined };
    const topNote = (text) => text.replace(/(^|\s)([^\s+\/|\[\]]+)(?:\+[^\s\/]+)+\//g, "$1$2/");
    const oneNote = Object.fromEntries(Object.entries(sections).map(([n, sec]) =>
      [n, { ...sec, [track]: topNote(sec[track]) }]));
    steps.push(
      ["sawtooth with only 12 harmonics", { ...bare, wave: undefined,
        harmonics: Array.from({ length: 12 }, (_, i) => 1 / (i + 1)) }],
      ["one note instead of a chord", bare, oneNote],
      ["chip envelope instead of the N64 one", { ...bare, env: undefined, gate: 0.97 }],
      ["4x louder", { ...bare, volume: bare.volume * 4 }],
    );
    steps.forEach(([label, override, secs], i) => RetroSongs.register({
      ...song,
      reverb: undefined,
      master: undefined,
      instruments: { ...song.instruments, [track]: override },
      id: `${song.id}--${track}--test${i + 1}`,
      title: `${song.title.replace(/ \(.*\)$/, "")} › ${track} test ${i + 1}: ${label}`,
      sections: secs || sections,
    }));
  }
})();
