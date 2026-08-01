// Procedural Web Audio sound effects — no external audio files, keeps the game dependency-free.
"use strict";

const Sound = (() => {
  let ctx = null;
  let muted = false;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function tone({ freq = 440, duration = 0.12, type = "square", gain = 0.15, slideTo = null } = {}) {
    if (muted) return;
    const audioCtx = getCtx();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, audioCtx.currentTime + duration);
    gainNode.gain.setValueAtTime(gain, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function setMuted(value) {
    muted = value;
  }

  return {
    setMuted,
    select: () => tone({ freq: 660, duration: 0.07, type: "square" }),
    move: () => tone({ freq: 420, duration: 0.06, type: "triangle" }),
    hit: () => tone({ freq: 200, duration: 0.1, type: "sawtooth", slideTo: 90 }),
    miss: () => tone({ freq: 300, duration: 0.15, type: "sine", slideTo: 500, gain: 0.08 }),
    crit: () => tone({ freq: 900, duration: 0.18, type: "square", slideTo: 1400, gain: 0.18 }),
    heal: () => tone({ freq: 500, duration: 0.16, type: "sine", slideTo: 800, gain: 0.12 }),
    victory: () => tone({ freq: 660, duration: 0.5, type: "square", slideTo: 990, gain: 0.15 }),
    defeat: () => tone({ freq: 300, duration: 0.5, type: "sawtooth", slideTo: 100, gain: 0.15 }),
  };
})();
