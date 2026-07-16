// Emojimon — procedural sound effects via the Web Audio API. No external audio files:
// every effect is a short sequence of oscillator blips/slides, kept dependency-free like
// the rest of the project. Call EmojimonSound.play('name') to trigger one.
"use strict";

const EmojimonSound = (function () {
  let ctx = null;
  let muted = false;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Play one tone: frequency (or [startFreq,endFreq] for a slide), duration in seconds,
  // waveform, start time offset (seconds from now), and peak volume.
  function tone(freq, dur, { type = "square", at = 0, vol = 0.12 } = {}) {
    const c = getCtx();
    if (!c || muted) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    const startTime = c.currentTime + at;
    if (Array.isArray(freq)) {
      osc.frequency.setValueAtTime(freq[0], startTime);
      osc.frequency.linearRampToValueAtTime(freq[1], startTime + dur);
    } else {
      osc.frequency.setValueAtTime(freq, startTime);
    }
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + Math.min(0.015, dur / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
  }

  const SFX = {
    footstep: () => tone(120, 0.05, { type: "square", vol: 0.05 }),

    menuMove: () => tone(440, 0.05, { type: "square", vol: 0.08 }),
    menuConfirm: () => {
      tone(520, 0.05, { at: 0, vol: 0.1 });
      tone(780, 0.08, { at: 0.05, vol: 0.1 });
    },
    menuCancel: () => tone([440, 220], 0.12, { type: "triangle", vol: 0.08 }),

    encounter: () => {
      tone(300, 0.1, { at: 0, type: "sawtooth", vol: 0.1 });
      tone(500, 0.1, { at: 0.1, type: "sawtooth", vol: 0.1 });
      tone(700, 0.15, { at: 0.2, type: "sawtooth", vol: 0.1 });
    },

    hit: (typeName) => {
      const base = { ember: 200, aqua: 500, volt: 900, frost: 350, stone: 120 }[typeName] || 300;
      tone([base * 1.5, base * 0.6], 0.12, { type: "square", vol: 0.14 });
    },
    miss: () => tone([300, 280], 0.15, { type: "triangle", vol: 0.06 }),
    faint: () => tone([500, 80], 0.5, { type: "sawtooth", vol: 0.1 }),
    statusApplied: () => {
      tone(660, 0.06, { at: 0, vol: 0.09 });
      tone(440, 0.08, { at: 0.07, vol: 0.09 });
    },

    ballThrow: () => tone([250, 600], 0.25, { type: "triangle", vol: 0.1 }),
    ballShake: () => tone(200, 0.06, { type: "square", vol: 0.09 }),
    captureSuccess: () => {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, { at: i * 0.12, vol: 0.11 }));
    },
    captureFail: () => tone([300, 140], 0.3, { type: "sawtooth", vol: 0.1 }),

    levelUp: () => {
      [392, 523, 659, 880].forEach((f, i) => tone(f, 0.12, { at: i * 0.09, vol: 0.12 }));
    },
    evolve: () => {
      const c = getCtx();
      if (!c || muted) return;
      for (let i = 0; i < 10; i++) tone(300 + i * 60, 0.1, { at: i * 0.05, type: "sine", vol: 0.08 });
      tone([600, 1200], 0.4, { at: 0.5, type: "sine", vol: 0.14 });
    },

    heal: () => {
      tone(440, 0.08, { at: 0, vol: 0.1 });
      tone(660, 0.12, { at: 0.08, vol: 0.1 });
    },
    coin: () => tone([880, 1320], 0.08, { type: "square", vol: 0.08 }),
    warp: () => tone([200, 900], 0.3, { type: "sine", vol: 0.1 }),
    save: () => {
      tone(700, 0.06, { at: 0, vol: 0.08 });
      tone(900, 0.1, { at: 0.08, vol: 0.08 });
    },
  };

  function play(name, arg) {
    const fn = SFX[name];
    if (fn) fn(arg);
  }

  function setMuted(value) {
    muted = value;
  }

  function isMuted() {
    return muted;
  }

  return { play, setMuted, isMuted };
})();
