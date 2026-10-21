/* Chapter 4 sounds (WebAudio, synthesised like sound.js). The shared CL.Sound keeps its
   context private, so this chapter runs its own small one; it is created on the first
   sound, which is always after a click, and it follows the shared mute button.

     CL.Ch4Sound.play('bell') / play('song', [5 loudnesses 0..1]) / play('reply', [...])
   Anything not defined here falls through to CL.Sound.play(name). */
(function (CL) {
  'use strict';
  let ctx = null, master = null;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    // no sound before the first click (stills, previews)
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone(freq, type, a, peak, d, f2, delay, filter) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    env(g, t, a, peak, d);
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      o.connect(f).connect(g).connect(master);
    } else o.connect(g).connect(master);
    o.start(t);
    o.stop(t + a + d + 0.05);
  }

  function noise(type, freq, q, a, peak, d, f2, delay) {
    const t = ctx.currentTime + (delay || 0);
    const len = Math.floor(ctx.sampleRate * (a + d + 0.1));
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const dd = b.getChannelData(0);
    for (let i = 0; i < len; i++) dd[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource();
    s.buffer = b;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    f.Q.value = q;
    const g = ctx.createGain();
    env(g, t, a, peak, d);
    s.connect(f).connect(g).connect(master);
    s.start(t);
  }

  // the whale's five notes (a low pentatonic chord) and the fish's, an octave up
  const NOTES = [130.8, 146.8, 164.8, 196.0, 220.0];

  const FX = {
    bell: () => { tone(1318, 'sine', 0.002, 0.28, 1.6); tone(2637, 'sine', 0.002, 0.08, 0.9); tone(3950, 'sine', 0.002, 0.03, 0.4); },
    // loud: five loudnesses 0..1; each note glides up a little, like a whale call
    song: loud => (loud || [1, 1, 1, 1, 1]).forEach((v, i) => {
      if (v < 0.03) return;
      tone(NOTES[i] * 0.94, 'triangle', 0.25, 0.09 * v + 0.005, 1.3, NOTES[i], i * 0.06, 900);
    }),
    reply: loud => (loud || [1, 1, 1, 1, 1]).forEach((v, i) => {
      if (v < 0.03) return;
      tone(NOTES[i] * 2, 'sine', 0.05, 0.07 * v + 0.004, 0.8, null, i * 0.05);
    }),
    gulp: () => { tone(110, 'sine', 0.01, 0.6, 0.45, 38); noise('lowpass', 500, 1, 0.01, 0.4, 0.3, 120); },
    drone: () => tone(46, 'sine', 1.2, 0.18, 2.4, 40),
    spout: () => { noise('bandpass', 400, 0.9, 0.05, 0.5, 1.0, 2400); tone(70, 'sine', 0.01, 0.4, 0.4, 140); },
    sputter: () => { for (let i = 0; i < 5; i++) noise('bandpass', 900 + 300 * i, 2, 0.005, 0.25, 0.09, null, i * 0.11); FX.gurgle(); },
    splash: () => { noise('lowpass', 2200, 0.7, 0.005, 0.45, 0.5, 300); },
    gurgle: () => { for (let i = 0; i < 6; i++) tone(260 + Math.random() * 520, 'sine', 0.004, 0.12, 0.07, 900, i * 0.09 + Math.random() * 0.04); },
    key: () => { tone(2600, 'triangle', 0.001, 0.25, 0.25); tone(3900, 'sine', 0.001, 0.12, 0.18, null, 0.05); tone(2300, 'triangle', 0.001, 0.12, 0.2, null, 0.16); },
    drip: () => tone(1700 + Math.random() * 500, 'sine', 0.002, 0.07, 0.12, 1100),
    tapDeep: () => { tone(820, 'triangle', 0.001, 0.22, 0.14, 700); noise('lowpass', 500, 0.8, 0.002, 0.25, 0.18); },
    crawl: () => { for (let i = 0; i < 4; i++) noise('bandpass', 1400, 1.4, 0.01, 0.12, 0.12, 700, i * 0.22); },
    warm: () => tone(220, 'sawtooth', 0.05, 0.03, 0.5, 330, 0, 700),
    boil: () => { for (let i = 0; i < 5; i++) tone(500 + Math.random() * 600, 'sine', 0.003, 0.05, 0.05, 1200, i * 0.12 + Math.random() * 0.05); },
    hum: () => tone(98, 'triangle', 0.3, 0.06, 1.2, 92, 0, 500),
    rise: () => { tone(330, 'sine', 0.4, 0.08, 1.4, 990); tone(495, 'sine', 0.5, 0.05, 1.3, 1480, 0.1); },
  };

  CL.Ch4Sound = {
    play(name, arg) {
      if (!FX[name]) { CL.Sound.play(name); return; }
      if (CL.Sound.muted) return;
      if (!ensure()) return;
      try { FX[name](arg); } catch (e) { /* ignore */ }
    },
  };
})(window.CL = window.CL || {});
