/* Procedural sound effects (WebAudio), in the spirit of the short's numpy synth.
   Nothing plays until the first click unlocks audio. */
(function (CL) {
  'use strict';
  let ctx = null, master = null, hum = null, muted = false;

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      startHum();
    } catch (e) { ctx = null; }
  }

  function noiseBuf(sec) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone(freq, type, a, peak, d, f2) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    env(g, t, a, peak, d);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + a + d + 0.05);
  }

  function noise(filterType, freq, q, a, peak, d, f2) {
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf(a + d + 0.1);
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    f.Q.value = q;
    const g = ctx.createGain();
    env(g, t, a, peak, d);
    s.connect(f).connect(g).connect(master);
    s.start(t);
  }

  function startHum() {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = o2.type = 'sawtooth';
    o1.frequency.value = 55; o2.frequency.value = 55.4;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 140;
    hum = ctx.createGain();
    hum.gain.value = 0.035;
    o1.connect(f); o2.connect(f); f.connect(hum).connect(master);
    o1.start(); o2.start();
  }

  const FX = {
    pop: () => tone(880, 'sine', 0.005, 0.06, 0.08, 1200),
    click: () => noise('highpass', 2500, 0.7, 0.002, 0.25, 0.04),
    clunk: () => { tone(110, 'square', 0.003, 0.12, 0.12, 60); noise('lowpass', 900, 0.8, 0.002, 0.2, 0.08); },
    creak: () => { noise('bandpass', 700, 6, 0.05, 0.12, 0.7, 1100); tone(180, 'sawtooth', 0.05, 0.03, 0.6, 240); },
    hiss: () => noise('highpass', 3000, 0.5, 0.05, 0.22, 1.2, 1800),
    burst: () => { noise('lowpass', 2500, 0.6, 0.005, 0.5, 0.6, 400); tone(90, 'sine', 0.005, 0.4, 0.3, 40); },
    thud: () => { tone(70, 'sine', 0.004, 0.9, 0.7, 30); noise('lowpass', 600, 0.7, 0.003, 0.6, 0.35); noise('bandpass', 4200, 8, 0.002, 0.15, 0.4); },
    tap: () => { tone(2100, 'triangle', 0.001, 0.25, 0.09); tone(3400, 'sine', 0.001, 0.08, 0.05); },
    dull: () => tone(600, 'triangle', 0.001, 0.12, 0.06),
    chime: () => { tone(880, 'sine', 0.005, 0.2, 0.25); setTimeout(() => tone(1320, 'sine', 0.005, 0.2, 0.35), 110); },
    whoosh: () => noise('bandpass', 1200, 1.2, 0.05, 0.25, 0.35, 300),
    step: () => noise('lowpass', 500, 1, 0.002, 0.05, 0.05),
    lamp: () => { noise('highpass', 1800, 0.7, 0.001, 0.3, 0.03); tone(140, 'square', 0.002, 0.06, 0.08, 90); },
    alarm: () => { tone(660, 'square', 0.01, 0.07, 0.35); setTimeout(() => tone(520, 'square', 0.01, 0.07, 0.35), 380); },
    shatter: () => { noise('highpass', 3500, 0.5, 0.002, 0.6, 0.9, 1200); tone(60, 'sine', 0.003, 0.8, 1.0, 25); },
    melt: () => noise('bandpass', 1500, 2, 0.1, 0.12, 0.9, 900),
  };

  CL.Sound = {
    unlock,
    play(name) { if (!ctx || muted || !FX[name]) return; try { FX[name](); } catch (e) { /* ignore */ } },
    mute(v) { muted = v; if (master) master.gain.value = v ? 0 : 0.55; },
    get muted() { return muted; },
  };
})(window.CL = window.CL || {});
