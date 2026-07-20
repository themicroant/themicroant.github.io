// Procedural Web Audio sound effects — no external audio files.
"use strict";

const Sound = (() => {
  let ctx = null;
  let muted = false;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function tone({ freq = 440, duration = 0.12, type = "square", gain = 0.15, slideTo = null, delay = 0 } = {}) {
    if (muted) return;
    const audioCtx = getCtx();
    const start = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, start + duration);
    gainNode.gain.setValueAtTime(gain, start);
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  function setMuted(value) {
    muted = value;
  }

  return {
    setMuted,
    isMuted: () => muted,
    move: () => tone({ freq: 340, duration: 0.08, type: "triangle", gain: 0.12 }),
    capture: () => tone({ freq: 220, duration: 0.14, type: "sawtooth", gain: 0.16, slideTo: 120 }),
    check: () => { tone({ freq: 500, duration: 0.1, type: "square", gain: 0.14 }); tone({ freq: 650, duration: 0.12, type: "square", gain: 0.12, delay: 0.09 }); },
    illegal: () => tone({ freq: 120, duration: 0.15, type: "sawtooth", gain: 0.1 }),
    upgrade: () => { tone({ freq: 520, duration: 0.1, type: "sine", gain: 0.14 }); tone({ freq: 780, duration: 0.16, type: "sine", gain: 0.14, delay: 0.1 }); },
    phase: () => {
      tone({ freq: 300, duration: 0.16, type: "sawtooth", gain: 0.14 });
      tone({ freq: 450, duration: 0.18, type: "sawtooth", gain: 0.14, delay: 0.14 });
      tone({ freq: 600, duration: 0.24, type: "sawtooth", gain: 0.14, delay: 0.28 });
    },
    gameOver: () => {
      tone({ freq: 440, duration: 0.2, type: "sine", gain: 0.15 });
      tone({ freq: 330, duration: 0.2, type: "sine", gain: 0.15, delay: 0.18 });
      tone({ freq: 220, duration: 0.4, type: "sine", gain: 0.15, delay: 0.36 });
    },
  };
})();
