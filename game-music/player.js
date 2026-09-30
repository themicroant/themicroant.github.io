/*
 * player.js — the retro game music engine.
 * Knows nothing about any particular song. It reads a song *data* object
 * (see songs/*.js) and schedules it on the Web Audio API.
 *
 * Song notation (one string per track, per section):
 *   A4/8    note A4, eighth note        (/1 whole, /2 half, /4 quarter, /8, /16, /32)
 *   C#5/4.  dotted quarter              (trailing "." = x1.5)
 *   A4/8t   triplet eighth              (trailing "t" = x2/3; three /8t = one beat)
 *   B2+F#3/8  chord: notes joined by "+", one duration
 *   A4/2~   tie: the note carries on into the next token, which must be the same note(s)
 *   R/4     rest
 *   K S H   drums: kick, snare, hi-hat  (drum tracks only; K+C/4 hits both)
 *   O C T   drums: open hi-hat, crash, tom
 *   [ ... ]x4   repeat the bracketed tokens 4 times
 *   |       bar line. Checked: every bar line must fall on a bar boundary
 *           (4 beats, or the song's / section's timeSig)
 *
 * Instruments default to raw chip voices (NES-like). Songs can opt into a richer,
 * N64-like sound per instrument: envelopes, detuned voices, custom harmonics,
 * vibrato, drive, filters, stereo pan, reverb and a "studio" drum kit, or a
 * Sega Genesis-like one: 2-operator FM synthesis and bit-crushed (lo-fi) tracks.
 *
 * Full reference: docs/song-format.md
 */
(function (global) {
  "use strict";

  const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const DRUMS = new Set(["K", "S", "H", "O", "C", "T"]);
  const WAVES = new Set(["square", "sawtooth", "triangle", "sine"]);
  const KITS = new Set(["chip", "studio"]);
  const FILTERS = new Set(["lowpass", "highpass", "bandpass"]);

  // Default instrument per track name. A song can override via song.instruments.
  const DEFAULT_INSTRUMENTS = {
    lead:    { wave: "square",   volume: 0.10 },
    harmony: { wave: "square",   volume: 0.035 },
    bass:    { wave: "triangle", volume: 0.30 },
    drums:   { drums: true,      volume: 0.45 },
  };

  function noteToFreq(name) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) throw new Error(`Bad note "${name}"`);
    const semi = NOTE_INDEX[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    const midi = (Number(m[3]) + 1) * 12 + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function expandRepeats(str) {
    let prev;
    do {
      prev = str;
      str = str.replace(/\[([^\[\]]*)\]x(\d+)/g, (_, body, n) =>
        Array(Number(n)).fill(body.trim()).join(" "));
    } while (str !== prev);
    if (/[\[\]]/.test(str)) throw new Error(`Unbalanced or unexpanded repeat in "${str}"`);
    return str;
  }

  const EPSILON = 1e-6; // triplets make beat counts like 1/3, so compare with a tolerance
  const fmtBeats = (b) => String(Math.round(b * 1000) / 1000);

  // Tokens and bar lines, before ties are joined:
  // [{ bar: true } | { notes: ["B2", "F#3"], beats, tie }]. A rest has no notes.
  function lexTrack(str) {
    return expandRepeats(str)
      .replace(/\|/g, " | ")
      .replace(/~/g, "~ ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((tok) => {
        if (tok === "|") return { bar: true };
        const m = /^([^/]+)\/(1|2|4|8|16|32)([.t]?)(~?)$/.exec(tok);
        if (!m) throw new Error(`Bad token "${tok}"`);
        let beats = 4 / Number(m[2]);
        if (m[3] === ".") beats *= 1.5;
        if (m[3] === "t") beats *= 2 / 3;
        const notes = m[1] === "R" ? [] : m[1].split("+");
        if (notes.some((n) => !n)) throw new Error(`Bad chord "${tok}"`);
        if (m[4] && !notes.length) throw new Error(`Can't tie a rest ("${tok}")`);
        return { notes, beats, tie: Boolean(m[4]) };
      });
  }

  // Joins tied tokens into one longer note and drops bar lines.
  function joinTies(items) {
    const events = [];
    let tied = false;
    for (const { bar, notes, beats, tie } of items) {
      if (bar) continue;
      const prev = events[events.length - 1];
      if (tied) {
        const from = prev.notes.join("+");
        if (notes.join("+") !== from) {
          throw new Error(`Tie "~" from ${from} must go into the same note, not ${notes.join("+") || "R"}`);
        }
        prev.beats += beats;
      } else {
        events.push({ notes, beats });
      }
      tied = tie;
    }
    if (tied) throw new Error(`Tie "~" at the end of the track has nothing to tie into`);
    return events;
  }

  // Track text -> [{ notes, beats }], with repeats expanded and ties joined.
  function parseTrack(str) {
    return joinTies(lexTrack(str));
  }

  // Every bar line must land on a bar boundary, and the track must end on one.
  // A stretch between bar lines may hold several whole bars (e.g. "[K/8 S/8]x8"),
  // never a bar and a half. Returns an error message, or null.
  function checkBars(items, barBeats) {
    let pos = 0;
    let start = 0;
    let bar = 1;
    const close = () => {
      const len = pos - start;
      if (len < EPSILON) return null;
      const count = Math.max(1, Math.round(len / barBeats));
      if (Math.abs(len - count * barBeats) > EPSILON) {
        return count === 1
          ? `bar ${bar} is ${fmtBeats(len)} beats, expected ${fmtBeats(barBeats)}`
          : `bars ${bar}–${bar + count - 1} are ${fmtBeats(len)} beats, expected ${fmtBeats(count * barBeats)} (${fmtBeats(barBeats)} per bar); is a "|" missing or misplaced?`;
      }
      bar += count;
      start = pos;
      return null;
    };
    for (const item of items) {
      if (item.bar) {
        const err = close();
        if (err) return err;
      } else {
        pos += item.beats;
      }
    }
    return close();
  }

  // Beats (quarter notes) per bar from a time signature: "3/4" -> 3, "6/8" -> 3, "7/8" -> 3.5.
  function barLength(timeSig) {
    if (timeSig === undefined) return 4;
    const m = /^(\d+)\/(1|2|4|8|16|32)$/.exec(String(timeSig));
    if (!m || Number(m[1]) < 1) throw new Error(`timeSig "${timeSig}" should look like "4/4", "3/4" or "6/8"`);
    return (Number(m[1]) * 4) / Number(m[2]);
  }

  const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const FLATS  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

  // Shifts every note in track text by `semitones`, leaving durations, rests and
  // drums alone: transpose("A4/8 C#5/4", 12) -> "A5/8 C#6/4". Flats stay flats. Bare notes
  // and chords without a duration work too: transpose("C4+E4+G4", 2) -> "D4+F#4+A4".
  function transpose(str, semitones) {
    if (!Number.isInteger(semitones)) throw new Error(`transpose: semitones must be a whole number, got ${semitones}`);
    return str.replace(/(^|[\s\[|+~])([A-G])([#b]?)(-?\d)(?=$|[/+~|\]\s])/g, (_, before, letter, acc, octave) => {
      const semi = NOTE_INDEX[letter] + (acc === "#" ? 1 : acc === "b" ? -1 : 0);
      const midi = (Number(octave) + 1) * 12 + semi + semitones;
      const name = (acc === "b" ? FLATS : SHARPS)[((midi % 12) + 12) % 12];
      return `${before}${name}${Math.floor(midi / 12) - 1}`;
    });
  }

  // Defaults merged with the song's per-track overrides.
  function resolveInstruments(song) {
    const instruments = { ...DEFAULT_INSTRUMENTS };
    for (const [k, v] of Object.entries(song.instruments || {})) {
      instruments[k] = { ...(instruments[k] || DEFAULT_INSTRUMENTS.lead), ...v };
    }
    return instruments;
  }

  function checkNumber(value, lo, hi, what, bad) {
    if (value !== undefined && !(typeof value === "number" && value >= lo && value <= hi)) {
      bad(`${what} must be a number from ${lo} to ${hi}`);
    }
  }

  function checkInstrument(name, inst, fail) {
    const bad = (msg) => fail(`instrument "${name}": ${msg}`);
    if (inst.drums) {
      if (inst.kit !== undefined && !KITS.has(inst.kit)) bad(`unknown kit "${inst.kit}"`);
    } else if (inst.harmonics !== undefined) {
      if (!Array.isArray(inst.harmonics) || !inst.harmonics.length
          || inst.harmonics.some((h) => typeof h !== "number")) {
        bad("harmonics must be a non-empty array of numbers");
      }
    } else if (!WAVES.has(inst.wave)) {
      bad(`unknown wave "${inst.wave}"`);
    }
    checkNumber(inst.volume, 0, 2, "volume", bad);
    checkNumber(inst.pan, -1, 1, "pan", bad);
    checkNumber(inst.reverb, 0, 1, "reverb", bad);
    checkNumber(inst.drive, 0, 1, "drive", bad);
    checkNumber(inst.detune, 0, 100, "detune", bad);
    checkNumber(inst.gate, 0.05, 1, "gate", bad);
    if (inst.bits !== undefined && !(Number.isInteger(inst.bits) && inst.bits >= 2 && inst.bits <= 16)) {
      bad("bits must be a whole number from 2 to 16");
    }
    if (inst.fm) {
      checkNumber(inst.fm.ratio, 0.01, 32, "fm.ratio", bad);
      checkNumber(inst.fm.index, 0, 50, "fm.index", bad);
      checkNumber(inst.fm.indexEnd, 0, 50, "fm.indexEnd", bad);
      checkNumber(inst.fm.decay, 0.001, 10, "fm.decay", bad);
    }
    if (inst.voices !== undefined && !(Number.isInteger(inst.voices) && inst.voices >= 1 && inst.voices <= 6)) {
      bad("voices must be a whole number from 1 to 6");
    }
    if (inst.filter) {
      if (!FILTERS.has(inst.filter.type || "lowpass")) bad(`unknown filter type "${inst.filter.type}"`);
      checkNumber(inst.filter.freq, 20, 20000, "filter.freq", bad);
      checkNumber(inst.filter.q, 0, 30, "filter.q", bad);
    }
    if (inst.env) {
      for (const k of ["a", "d", "r"]) checkNumber(inst.env[k], 0, 10, `env.${k}`, bad);
      checkNumber(inst.env.s, 0, 1, "env.s", bad);
    }
    if (inst.vibrato) {
      checkNumber(inst.vibrato.rate, 0, 20, "vibrato.rate", bad);
      checkNumber(inst.vibrato.depth, 0, 100, "vibrato.depth", bad);
      checkNumber(inst.vibrato.delay, 0, 10, "vibrato.delay", bad);
    }
  }

  // Turns song data into { sectionName: { tracks: { trackName: [events] }, beats, barBeats } }.
  // Throws on anything that would play wrong: bars of the wrong length, tracks of
  // different lengths within a section, unknown sections, bad notes, drum hits on a
  // melodic track, etc.
  function compileSong(song) {
    const label = song.title || song.id || "(untitled song)";
    const fail = (msg) => { throw new Error(`${label}: ${msg}`); };
    if (!song.id) fail("missing id");
    if (!song.title) fail("missing title");
    if (!(song.bpm > 0)) fail("bpm must be a positive number");
    if (!Array.isArray(song.arrangement) || !song.arrangement.length) fail("arrangement is empty");
    if (song.reverb) {
      checkNumber(song.reverb.seconds, 0.1, 10, "reverb.seconds", fail);
      checkNumber(song.reverb.decay, 0.1, 20, "reverb.decay", fail);
      checkNumber(song.reverb.send, 0, 1, "reverb.send", fail);
    }
    if (song.master) checkNumber(song.master.lowpass, 20, 20000, "master.lowpass", fail);
    let songBar;
    try { songBar = barLength(song.timeSig); } catch (e) { fail(e.message); }

    const instruments = resolveInstruments(song);
    for (const [name, inst] of Object.entries(instruments)) checkInstrument(name, inst, fail);

    const sections = {};
    for (const [name, { timeSig, ...tracks }] of Object.entries(song.sections || {})) {
      let barBeats = songBar;
      if (timeSig !== undefined) {
        try { barBeats = barLength(timeSig); } catch (e) { fail(`section "${name}": ${e.message}`); }
      }
      const parsed = {};
      let beats = null;
      for (const [track, text] of Object.entries(tracks)) {
        const where = `section "${name}" track "${track}"`;
        let items, events;
        try {
          items = lexTrack(text);
          events = joinTies(items);
        } catch (e) { fail(`${where}: ${e.message}`); }
        const inst = instruments[track] || DEFAULT_INSTRUMENTS.lead;
        if (inst.drums && items.some((it) => it.tie)) fail(`${where}: drum hits can't be tied with "~"`);
        for (const ev of events) {
          for (const note of ev.notes) {
            if (inst.drums) {
              if (!DRUMS.has(note)) fail(`${where}: "${note}" is not a drum (K, S, H, O, C, T)`);
            } else {
              try { noteToFreq(note); } catch (e) { fail(`${where}: ${e.message}`); }
            }
          }
        }
        const barError = checkBars(items, barBeats);
        if (barError) fail(`${where}: ${barError}`);
        const len = events.reduce((s, e) => s + e.beats, 0);
        if (beats === null) beats = len;
        else if (Math.abs(len - beats) > EPSILON) {
          fail(`${where} is ${fmtBeats(len)} beats, expected ${fmtBeats(beats)}`);
        }
        parsed[track] = events;
      }
      sections[name] = { tracks: parsed, beats: Math.round((beats || 0) * 1e6) / 1e6, barBeats };
    }
    for (const s of song.arrangement) {
      if (!sections[s]) fail(`unknown section "${s}"`);
    }
    if (song.loopFrom !== undefined && !song.arrangement.includes(song.loopFrom)) {
      fail(`loopFrom "${song.loopFrom}" is not in the arrangement`);
    }
    return sections;
  }

  // Beat counts and lengths, handy for the UI and command-line tools.
  function describeSong(song) {
    const sections = compileSong(song);
    const beats = song.arrangement.reduce((b, n) => b + sections[n].beats, 0);
    const bars = song.arrangement.reduce((b, n) => b + sections[n].beats / sections[n].barBeats, 0);
    return {
      sections: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.beats])),
      beats,
      bars: Math.round(bars * 1000) / 1000,
      seconds: (beats * 60) / song.bpm,
    };
  }

  // ---------------------------------------------------------------------------
  // Sound. Everything below takes an AudioContext (real-time or offline).

  const noiseCache = new WeakMap();
  function noiseBuffer(ctx) {
    if (!noiseCache.has(ctx)) {
      // Two seconds of white noise, reused for snares, hi-hats and cymbals.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      noiseCache.set(ctx, buf);
    }
    return noiseCache.get(ctx);
  }

  // Stereo impulse response: decaying noise, a cheap but convincing room/hall.
  function impulseResponse(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // Soft-clipping curve for guitar-like distortion.
  function driveCurve(drive) {
    const k = 1 + drive * 30;
    const n = 2048;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    return curve;
  }

  // Staircase curve: reduces the signal to 2^bits levels, like a low-bit sample.
  function crushCurve(bits) {
    const steps = Math.pow(2, bits - 1);
    const n = 4096;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    return curve;
  }

  // Builds the mixer for one song: a chain per track (drive, filter, pan, reverb
  // send) feeding a master bus (optional lowpass and compressor) into `destination`.
  // Tracks with no extra options get a plain gain, so chip songs sound as before.
  function buildRig(ctx, song, destination) {
    const instruments = resolveInstruments(song);
    const master = ctx.createGain();
    master.gain.value = song.volume ?? 0.8;
    let node = master;
    const m = song.master || {};
    if (m.lowpass) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = m.lowpass;
      node.connect(lp);
      node = lp;
    }
    if (m.compress) {
      const c = ctx.createDynamicsCompressor();
      c.threshold.value = -16;
      c.knee.value = 12;
      c.ratio.value = 4;
      c.attack.value = 0.004;
      c.release.value = 0.2;
      node.connect(c);
      node = c;
    }
    node.connect(destination);

    let reverbIn = null;
    if (song.reverb) {
      reverbIn = ctx.createConvolver();
      reverbIn.buffer = impulseResponse(ctx, song.reverb.seconds ?? 2, song.reverb.decay ?? 3);
      reverbIn.connect(master);
    }

    const tracks = {};
    const trackFor = (name) => {
      if (tracks[name]) return tracks[name];
      const inst = instruments[name] || DEFAULT_INSTRUMENTS.lead;
      const input = ctx.createGain();
      let out = input;
      // Drive and bit-crushing work on a full-level signal, so notes on those tracks
      // play at a fixed base level and a gain after the effect sets the track volume.
      const drive = !inst.drums && inst.drive > 0;
      const unit = drive || inst.bits > 0;
      const base = inst.drums ? 0.5 : 1;
      if (drive) {
        const shaper = ctx.createWaveShaper();
        shaper.curve = driveCurve(inst.drive);
        shaper.oversample = "2x";
        out.connect(shaper);
        out = shaper;
      }
      if (inst.bits) {
        const crush = ctx.createWaveShaper();
        crush.curve = crushCurve(inst.bits);
        out.connect(crush);
        out = crush;
      }
      if (unit) {
        const post = ctx.createGain();
        post.gain.value = inst.volume / base;
        out.connect(post);
        out = post;
      }
      if (inst.filter) {
        const f = ctx.createBiquadFilter();
        f.type = inst.filter.type || "lowpass";
        f.frequency.value = inst.filter.freq ?? 3000;
        f.Q.value = inst.filter.q ?? 0.7;
        out.connect(f);
        out = f;
      }
      if (inst.pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = inst.pan;
        out.connect(p);
        out = p;
      }
      out.connect(master);
      const send = inst.reverb ?? (song.reverb && song.reverb.send) ?? 0;
      if (reverbIn && send > 0) {
        const g = ctx.createGain();
        g.gain.value = send;
        out.connect(g).connect(reverbIn);
      }
      let wave = null;
      if (!inst.drums && inst.harmonics) {
        const imag = new Float32Array([0, ...inst.harmonics]);
        wave = ctx.createPeriodicWave(new Float32Array(imag.length), imag);
      }
      const level = (unit ? base : inst.volume) / Math.sqrt(inst.voices || 1);
      const drumLevel = unit ? base : inst.volume;
      return (tracks[name] = { inst, input, wave, level, drumLevel });
    };

    return { ctx, master, trackFor, noise: noiseBuffer(ctx), reverbTail: song.reverb ? (song.reverb.seconds ?? 2) : 0 };
  }

  function playTone(rig, track, freq, start, dur) {
    const { ctx } = rig;
    const { inst, input, wave, level } = track;
    const gate = inst.gate ?? 0.92;
    const g = ctx.createGain();
    let stopAt;
    if (inst.env) {
      const { a = 0.005, d = 0.1, s = 0.7, r = 0.1 } = inst.env;
      const off = start + Math.max(a + 0.002, dur * gate);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(level, start + a);
      g.gain.setTargetAtTime(level * s, start + a, Math.max(d, 0.001) / 3);
      // Fade to silence (under -80 dB) before the oscillators stop. Stopping any earlier cuts
      // long pads and choirs off at ~1.5% level, a click at every chord change.
      g.gain.setTargetAtTime(0, off, Math.max(r, 0.001) / 5);
      stopAt = off + 2 * r + 0.03;
    } else {
      // The original chip envelope: quick attack, short decay, fade over the note.
      const end = start + dur * gate;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(level, start + 0.005);
      g.gain.linearRampToValueAtTime(level * 0.7, start + Math.min(0.06, dur * 0.3));
      g.gain.linearRampToValueAtTime(0.0001, end);
      stopAt = end + 0.02;
    }
    g.connect(input);

    let lfoGain = null;
    if (inst.vibrato) {
      const { rate = 5.5, depth = 15, delay = 0.2 } = inst.vibrato;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0, start + delay);
      lfoGain.gain.linearRampToValueAtTime(depth, start + delay + 0.25);
      lfo.connect(lfoGain);
      lfo.start(start);
      lfo.stop(stopAt);
    }

    // 2-operator FM: a sine modulator wobbles the carrier's frequency. The index
    // (modulation depth) can fall from `index` to `indexEnd`, the classic FM
    // "pluck" that makes Genesis slap bass and brass.
    let modGain = null;
    if (inst.fm) {
      const { ratio = 1, index = 2, decay = 0.2 } = inst.fm;
      const indexEnd = inst.fm.indexEnd ?? index;
      const modFreq = freq * ratio;
      const mod = ctx.createOscillator();
      mod.frequency.value = modFreq;
      modGain = ctx.createGain();
      modGain.gain.setValueAtTime(index * modFreq, start);
      if (indexEnd !== index) modGain.gain.setTargetAtTime(indexEnd * modFreq, start, decay / 3);
      mod.connect(modGain);
      mod.start(start);
      mod.stop(stopAt);
    }

    const voices = inst.voices || 1;
    for (let v = 0; v < voices; v++) {
      const osc = ctx.createOscillator();
      if (wave) osc.setPeriodicWave(wave);
      else osc.type = inst.wave;
      osc.frequency.value = freq;
      if (voices > 1) osc.detune.value = (inst.detune || 0) * ((2 * v) / (voices - 1) - 1);
      if (lfoGain) lfoGain.connect(osc.detune);
      if (modGain) modGain.connect(osc.frequency);
      osc.connect(g);
      osc.start(start);
      osc.stop(stopAt);
    }
  }

  // Filtered noise burst. `filters` is a list of [type, freq, q].
  function noiseHit(rig, out, start, len, gain, filters) {
    const { ctx } = rig;
    const src = ctx.createBufferSource();
    src.buffer = rig.noise;
    let node = src;
    for (const [type, freq, q] of filters) {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      if (q !== undefined) f.Q.value = q;
      node.connect(f);
      node = f;
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + len);
    node.connect(g).connect(out);
    src.start(start, Math.random() * (rig.noise.duration - len - 0.1));
    src.stop(start + len + 0.01);
  }

  // Sine (or triangle) with a pitch drop: kicks, toms, snare bodies.
  function sweep(rig, out, start, from, to, sweepTime, len, gain, type = "sine") {
    const { ctx } = rig;
    const osc = ctx.createOscillator();
    osc.type = type;
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + sweepTime);
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + len);
    osc.connect(g).connect(out);
    osc.start(start);
    osc.stop(start + len + 0.01);
  }

  function playDrum(rig, track, type, start) {
    const out = track.input;
    const vol = track.drumLevel;
    if (track.inst.kit === "studio") {
      // Fuller, sample-like kit: layered bodies, clicks and longer cymbals.
      switch (type) {
        case "K":
          sweep(rig, out, start, 115, 44, 0.08, 0.26, vol * 1.8);
          noiseHit(rig, out, start, 0.015, vol * 0.5, [["lowpass", 4000]]);
          return;
        case "S":
          sweep(rig, out, start, 210, 155, 0.08, 0.13, vol * 0.9, "triangle");
          noiseHit(rig, out, start, 0.22, vol * 1.1, [["bandpass", 2600, 0.8]]);
          noiseHit(rig, out, start, 0.1, vol * 0.35, [["highpass", 5500]]);
          return;
        case "H": noiseHit(rig, out, start, 0.045, vol * 0.35, [["highpass", 9000]]); return;
        case "O": noiseHit(rig, out, start, 0.35, vol * 0.28, [["highpass", 8000]]); return;
        case "C":
          noiseHit(rig, out, start, 1.8, vol * 0.4, [["highpass", 4500]]);
          noiseHit(rig, out, start, 0.6, vol * 0.2, [["bandpass", 7500, 1.2]]);
          return;
        case "T":
          sweep(rig, out, start, 165, 95, 0.15, 0.45, vol * 1.3);
          noiseHit(rig, out, start, 0.05, vol * 0.25, [["lowpass", 900]]);
          return;
      }
      return;
    }
    // Chip kit: pitch-dropping sine kick, high-passed white noise for the rest.
    switch (type) {
      case "K": sweep(rig, out, start, 150, 40, 0.12, 0.15, vol * 1.6); return;
      case "S": noiseHit(rig, out, start, 0.12, vol, [["highpass", 1200]]); return;
      case "H": noiseHit(rig, out, start, 0.04, vol * 0.4, [["highpass", 7000]]); return;
      case "O": noiseHit(rig, out, start, 0.25, vol * 0.35, [["highpass", 7000]]); return;
      case "C": noiseHit(rig, out, start, 1.2, vol * 0.45, [["highpass", 5000]]); return;
      case "T": sweep(rig, out, start, 180, 80, 0.2, 0.25, vol * 1.2); return;
    }
  }

  function scheduleSection(rig, sec, t, spb) {
    for (const [name, events] of Object.entries(sec.tracks)) {
      const track = rig.trackFor(name);
      let et = t;
      for (const ev of events) {
        const dur = ev.beats * spb;
        for (const note of ev.notes) {
          if (track.inst.drums) playDrum(rig, track, note, et);
          else playTone(rig, track, noteToFreq(note), et, dur);
        }
        et += dur;
      }
    }
    return t + sec.beats * spb;
  }

  const LOOKAHEAD = 2.5; // seconds of audio scheduled ahead of the play head

  class RetroPlayer {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.timer = null;
      this.playId = 0;
    }

    _init() {
      if (this.ctx) return;
      const AC = global.AudioContext || global.webkitAudioContext;
      // "playback" asks for larger audio buffers: a little more start-up delay, but far fewer
      // dropouts (heard as crackle or static) when a dense song strains the audio thread.
      try { this.ctx = new AC({ latencyHint: "playback" }); } catch (e) { this.ctx = new AC(); }
    }

    get playing() { return this.master !== null; }

    async play(song, { loop = false, onEnd } = {}) {
      this.stop();
      const id = ++this.playId;
      this._init();
      await this.ctx.resume();
      // Another play() or stop() happened while we were waiting.
      if (id !== this.playId) return;

      const sections = compileSong(song);
      const rig = buildRig(this.ctx, song, this.ctx.destination);
      this.master = rig.master;
      const master = this.master;

      const spb = 60 / song.bpm; // seconds per beat
      const loopIndex = Math.max(0, song.arrangement.indexOf(song.loopFrom));
      let index = 0;
      let t = this.ctx.currentTime + 0.1;

      // Schedules a section at a time, a little ahead of the play head, so
      // long or dense songs don't create thousands of nodes up front.
      const step = () => {
        if (this.master !== master) return;
        while (t < this.ctx.currentTime + LOOKAHEAD) {
          if (index >= song.arrangement.length) {
            if (!loop) {
              const ms = (t + rig.reverbTail - this.ctx.currentTime) * 1000;
              this.timer = setTimeout(() => {
                if (this.master === master) { this.stop(); onEnd && onEnd(); }
              }, Math.max(0, ms));
              return;
            }
            index = loopIndex;
          }
          t = scheduleSection(rig, sections[song.arrangement[index++]], t, spb);
        }
        this.timer = setTimeout(step, 250);
      };
      step();
    }

    stop() {
      this.playId++;
      clearTimeout(this.timer);
      if (this.master) {
        this.master.gain.setValueAtTime(0, this.ctx.currentTime);
        this.master.disconnect();
        this.master = null;
      }
    }

    // Renders the song offline to a stereo AudioBuffer: one full pass, plus
    // `passes - 1` more from loopFrom, plus the reverb tail.
    static async render(song, { passes = 1, sampleRate = 44100 } = {}) {
      const sections = compileSong(song);
      const spb = 60 / song.bpm;
      const loopIndex = Math.max(0, song.arrangement.indexOf(song.loopFrom));
      const order = [...song.arrangement];
      for (let p = 1; p < passes; p++) order.push(...song.arrangement.slice(loopIndex));
      const seconds = order.reduce((s, n) => s + sections[n].beats * spb, 0);
      const tail = song.reverb ? (song.reverb.seconds ?? 2) : 0.3;

      const OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
      const ctx = new OAC(2, Math.ceil((seconds + tail + 0.1) * sampleRate), sampleRate);
      const rig = buildRig(ctx, song, ctx.destination);
      let t = 0.05;
      for (const name of order) t = scheduleSection(rig, sections[name], t, spb);
      return ctx.startRendering();
    }
  }

  // 16-bit PCM WAV file from an AudioBuffer.
  function encodeWav(buffer) {
    const channels = buffer.numberOfChannels;
    const frames = buffer.length;
    const bytes = new ArrayBuffer(44 + frames * channels * 2);
    const view = new DataView(bytes);
    const text = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    text(0, "RIFF");
    view.setUint32(4, 36 + frames * channels * 2, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, frames * channels * 2, true);
    const data = [];
    for (let c = 0; c < channels; c++) data.push(buffer.getChannelData(c));
    let off = 44;
    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < channels; c++) {
        const s = Math.max(-1, Math.min(1, data[c][i]));
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        off += 2;
      }
    }
    return bytes;
  }

  // Simple registry so song files can add themselves.
  // Song files can use the helpers too: const { transpose } = RetroSongs;
  const RetroSongs = {
    list: [],
    transpose,
    register(song) {
      compileSong(song);
      if (this.list.some((s) => s.id === song.id)) throw new Error(`Duplicate song id "${song.id}"`);
      this.list.push(song);
    },
  };

  RetroPlayer.compileSong = compileSong;
  RetroPlayer.describeSong = describeSong;
  RetroPlayer.encodeWav = encodeWav;
  global.RetroPlayer = RetroPlayer;
  global.RetroSongs = RetroSongs;
  if (typeof module !== "undefined") {
    module.exports = { RetroPlayer, RetroSongs, compileSong, describeSong, parseTrack, transpose, noteToFreq, encodeWav };
  }
})(typeof window !== "undefined" ? window : globalThis);
