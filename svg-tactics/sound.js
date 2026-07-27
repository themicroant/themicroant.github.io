// Arcanum Tactics — procedural sound effects via the Web Audio API. No external audio files.
// Call ArcanumSound.play('name') to trigger one.
"use strict";

const ArcanumSound = (function () {
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
    menuMove: () => tone(440, 0.05, { type: "square", vol: 0.08 }),
    menuConfirm: () => { tone(520, 0.05, { at: 0, vol: 0.1 }); tone(780, 0.08, { at: 0.05, vol: 0.1 }); },
    menuCancel: () => tone([440, 220], 0.12, { type: "triangle", vol: 0.08 }),

    move: () => tone(180, 0.05, { type: "square", vol: 0.05 }),
    select: () => tone(660, 0.04, { type: "square", vol: 0.07 }),

    hitPhysical: () => tone([500, 180], 0.12, { type: "square", vol: 0.14 }),
    hitFire: () => tone([700, 200], 0.18, { type: "sawtooth", vol: 0.13 }),
    hitIce: () => tone([1200, 500], 0.16, { type: "sine", vol: 0.12 }),
    hitLightning: () => { tone(1400, 0.05, { at: 0, vol: 0.14 }); tone(900, 0.08, { at: 0.05, vol: 0.12 }); },
    crit: () => { tone(300, 0.06, { at: 0, vol: 0.14 }); tone(900, 0.1, { at: 0.05, vol: 0.16 }); },
    miss: () => tone([300, 280], 0.15, { type: "triangle", vol: 0.06 }),
    ko: () => tone([500, 80], 0.5, { type: "sawtooth", vol: 0.1 }),

    heal: () => { tone(440, 0.08, { at: 0, vol: 0.1 }); tone(660, 0.12, { at: 0.08, vol: 0.1 }); },
    buff: () => { tone(660, 0.06, { at: 0, vol: 0.09 }); tone(880, 0.08, { at: 0.06, vol: 0.09 }); },
    debuff: () => { tone(440, 0.08, { at: 0, vol: 0.09 }); tone(300, 0.1, { at: 0.06, vol: 0.09 }); },
    revive: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, { at: i * 0.1, vol: 0.11 })),

    turnStart: () => tone(392, 0.08, { type: "triangle", vol: 0.08 }),
    victory: () => [392, 523, 659, 880, 1046].forEach((f, i) => tone(f, 0.14, { at: i * 0.11, vol: 0.12 })),
    defeat: () => tone([300, 80], 0.6, { type: "sawtooth", vol: 0.1 }),
    unlock: () => { tone(700, 0.06, { at: 0, vol: 0.08 }); tone(1050, 0.14, { at: 0.08, vol: 0.09 }); },
  };

  function play(name, arg) {
    const fn = SFX[name];
    if (fn) fn(arg);
  }

  function setMuted(value) { muted = value; }
  function isMuted() { return muted; }

  return { play, setMuted, isMuted };
})();
