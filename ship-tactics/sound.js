'use strict';
/* SOUND — synthesized via the Web Audio API (no asset files, works offline) */
const Sound = (() => {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('sst-muted') === '1'; } catch (e) { /* ignore */ }

  function context() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    return ctx;
  }

  function unlock() { const c = context(); if (c && c.state === 'suspended') c.resume(); }

  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const c = context();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain || 0.14, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env);
    env.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function noiseBurst(dur, gain) {
    if (muted) return;
    const c = context();
    if (!c) return;
    const t = c.currentTime;
    const bufSize = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = c.createBufferSource();
    src.buffer = buf;
    const env = c.createGain();
    env.gain.setValueAtTime(gain || 0.18, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(env);
    env.connect(c.destination);
    src.start(t);
  }

  function arp(freqs, dur, type, gain) {
    freqs.forEach((f, i) => setTimeout(() => tone(f, dur, type, gain), i * 80));
  }

  return {
    unlock,
    toggleMute() { muted = !muted; try { localStorage.setItem('sst-muted', muted ? '1' : '0'); } catch (e) {} return muted; },
    isMuted() { return muted; },
    click() { tone(320, 0.05, 'square', 0.07); },
    rotate() { tone(260, 0.06, 'triangle', 0.08, 340); },
    move() { tone(180, 0.12, 'sine', 0.1, 260); },
    fire() { tone(140, 0.09, 'sawtooth', 0.15, 60); noiseBurst(0.08, 0.08); },
    hit() { tone(200, 0.1, 'square', 0.14, 90); },
    miss() { tone(500, 0.05, 'sine', 0.06, 400); },
    crit() { arp([700, 500, 300], 0.12, 'sawtooth', 0.16); noiseBurst(0.15, 0.12); },
    explosion() { noiseBurst(0.4, 0.22); tone(90, 0.4, 'sawtooth', 0.18, 30); },
    vent() { tone(600, 0.08, 'sine', 0.08, 300); },
    missile() { tone(220, 0.16, 'sawtooth', 0.12, 500); },
    victory() { arp([523, 659, 784, 1047], 0.3, 'triangle', 0.15); },
    defeat() { arp([392, 330, 262, 174], 0.34, 'sawtooth', 0.14); },
    deploy() { arp([330, 440, 550], 0.14, 'triangle', 0.12); },
  };
})();
