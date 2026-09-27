/*
 * player.js — the retro chiptune engine.
 * Knows nothing about any particular song. It reads a song *data* object
 * (see songs/*.js) and schedules it on the Web Audio API.
 *
 * Song notation (one string per track, per section):
 *   A4/8    note A4, eighth note        (/1 whole, /2 half, /4 quarter, /8, /16, /32)
 *   C#5/4.  dotted quarter              (trailing "." = x1.5)
 *   R/4     rest
 *   K S H   drums: kick, snare, hi-hat  (drum tracks only)
 *   [ ... ]x4   repeat the bracketed tokens 4 times
 *   |       bar line (ignored, just for readability)
 *
 * Full reference: docs/song-format.md
 */
(function (global) {
  "use strict";

  const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const DRUMS = new Set(["K", "S", "H"]);
  const WAVES = new Set(["square", "sawtooth", "triangle", "sine"]);

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

  function parseTrack(str) {
    return expandRepeats(str)
      .replace(/\|/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((tok) => {
        const m = /^([^/]+)\/(1|2|4|8|16|32)(\.?)$/.exec(tok);
        if (!m) throw new Error(`Bad token "${tok}"`);
        let beats = 4 / Number(m[2]);
        if (m[3]) beats *= 1.5;
        return { pitch: m[1], beats };
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

  // Turns song data into { sectionName: { tracks: { trackName: [events] }, beats } }.
  // Throws on anything that would play wrong: tracks of different lengths within
  // a section, unknown sections, bad notes, drum hits on a melodic track, etc.
  function compileSong(song) {
    const label = song.title || song.id || "(untitled song)";
    const fail = (msg) => { throw new Error(`${label}: ${msg}`); };
    if (!song.id) fail("missing id");
    if (!song.title) fail("missing title");
    if (!(song.bpm > 0)) fail("bpm must be a positive number");
    if (!Array.isArray(song.arrangement) || !song.arrangement.length) fail("arrangement is empty");

    const instruments = resolveInstruments(song);
    for (const [name, inst] of Object.entries(instruments)) {
      if (!inst.drums && !WAVES.has(inst.wave)) fail(`instrument "${name}" has unknown wave "${inst.wave}"`);
    }

    const sections = {};
    for (const [name, tracks] of Object.entries(song.sections || {})) {
      const parsed = {};
      let beats = null;
      for (const [track, text] of Object.entries(tracks)) {
        let events;
        try { events = parseTrack(text); } catch (e) { fail(`section "${name}" track "${track}": ${e.message}`); }
        const inst = instruments[track] || DEFAULT_INSTRUMENTS.lead;
        for (const ev of events) {
          if (ev.pitch === "R") continue;
          if (inst.drums) {
            if (!DRUMS.has(ev.pitch)) fail(`section "${name}" track "${track}": "${ev.pitch}" is not a drum (K, S, H)`);
          } else {
            try { noteToFreq(ev.pitch); } catch (e) { fail(`section "${name}" track "${track}": ${e.message}`); }
          }
        }
        const len = events.reduce((s, e) => s + e.beats, 0);
        if (beats === null) beats = len;
        else if (Math.abs(len - beats) > 1e-6) {
          fail(`section "${name}" track "${track}" is ${len} beats, expected ${beats}`);
        }
        parsed[track] = events;
      }
      sections[name] = { tracks: parsed, beats: beats || 0 };
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
    return {
      sections: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.beats])),
      beats,
      bars: beats / 4,
      seconds: (beats * 60) / song.bpm,
    };
  }

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
      this.ctx = new AC();
      // One second of white noise, reused for snare / hi-hat.
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
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
      const instruments = resolveInstruments(song);

      this.master = this.ctx.createGain();
      this.master.gain.value = song.volume ?? 0.8;
      this.master.connect(this.ctx.destination);
      const master = this.master;

      const spb = 60 / song.bpm; // seconds per beat
      const loopIndex = Math.max(0, song.arrangement.indexOf(song.loopFrom));

      const schedulePass = (fromIndex, startTime) => {
        let t = startTime;
        for (const name of song.arrangement.slice(fromIndex)) {
          const sec = sections[name];
          for (const [track, events] of Object.entries(sec.tracks)) {
            const inst = instruments[track] || DEFAULT_INSTRUMENTS.lead;
            let et = t;
            for (const ev of events) {
              const dur = ev.beats * spb;
              if (ev.pitch !== "R") {
                if (inst.drums) this._drum(master, ev.pitch, et, inst.volume);
                else this._tone(master, noteToFreq(ev.pitch), et, dur, inst.wave, inst.volume);
              }
              et += dur;
            }
          }
          t += sec.beats * spb;
        }
        return t;
      };

      const runFrom = (index, start) => {
        const end = schedulePass(index, start);
        const msUntilEnd = (end - this.ctx.currentTime) * 1000;
        if (loop) {
          // Queue the next pass shortly before this one finishes.
          this.timer = setTimeout(() => {
            if (this.master === master) runFrom(loopIndex, end);
          }, Math.max(0, msUntilEnd - 1000));
        } else {
          this.timer = setTimeout(() => {
            if (this.master === master) { this.stop(); onEnd && onEnd(); }
          }, msUntilEnd);
        }
      };

      runFrom(0, this.ctx.currentTime + 0.1);
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

    _tone(out, freq, start, dur, wave, vol) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      const end = start + dur * 0.92;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.005);
      g.gain.linearRampToValueAtTime(vol * 0.7, start + Math.min(0.06, dur * 0.3));
      g.gain.linearRampToValueAtTime(0.0001, end);
      osc.connect(g).connect(out);
      osc.start(start);
      osc.stop(end + 0.02);
    }

    _drum(out, type, start, vol) {
      const ctx = this.ctx;
      if (type === "K") {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.setValueAtTime(150, start);
        osc.frequency.exponentialRampToValueAtTime(40, start + 0.12);
        g.gain.setValueAtTime(vol * 1.6, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
        osc.connect(g).connect(out);
        osc.start(start);
        osc.stop(start + 0.16);
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = type === "H" ? 7000 : 1200;
      const g = ctx.createGain();
      const len = type === "H" ? 0.04 : 0.12;
      g.gain.setValueAtTime(type === "H" ? vol * 0.4 : vol, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + len);
      src.connect(hp).connect(g).connect(out);
      src.start(start);
      src.stop(start + len + 0.01);
    }
  }

  // Simple registry so song files can add themselves.
  const RetroSongs = {
    list: [],
    register(song) {
      compileSong(song);
      if (this.list.some((s) => s.id === song.id)) throw new Error(`Duplicate song id "${song.id}"`);
      this.list.push(song);
    },
  };

  RetroPlayer.compileSong = compileSong;
  RetroPlayer.describeSong = describeSong;
  global.RetroPlayer = RetroPlayer;
  global.RetroSongs = RetroSongs;
  if (typeof module !== "undefined") {
    module.exports = { RetroPlayer, RetroSongs, compileSong, describeSong, parseTrack, noteToFreq };
  }
})(typeof window !== "undefined" ? window : globalThis);
