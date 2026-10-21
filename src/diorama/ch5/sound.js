/* Chapter 5 sounds (WebAudio, synthesised like sound.js). The shared synth keeps its
   context private, so this chapter has its own; it is created on the first sound,
   after the title card's click, and follows the shared mute button.

     CL.Ch5Sound.play('scribble')

   Anything not listed here is passed on to CL.Sound.play. */
(function (CL) {
  'use strict';
  let ctx = null, master = null;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return !!ctx; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return !!ctx;
  }

  function noiseBuf(sec) {
    const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * sec)), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(freq, type, a, peak, d, f2, delay) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    env(g, t, a, peak, d);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + a + d + 0.05);
  }
  function noise(type, freq, q, a, peak, d, f2, delay) {
    const t = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf(a + d + 0.1);
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

  const FX = {
    // a knock from inside the reactor: lower and duller than Haiku's tap
    knock: () => { tone(180, 'sine', 0.002, 0.45, 0.16, 90); noise('lowpass', 700, 1, 0.002, 0.25, 0.08); },
    // pencil on paper
    scribble: () => { for (let i = 0; i < 5; i++) noise('bandpass', 2600 + Math.random() * 1500, 3, 0.01, 0.07, 0.05 + Math.random() * 0.06, null, i * 0.09); },
    // the reactor groans (metal under load, very low)
    groan: () => { tone(48, 'sawtooth', 0.4, 0.12, 1.6, 36); noise('lowpass', 220, 4, 0.3, 0.1, 1.4, 120); },
    // laptop: plug in, boot beep
    plug: () => { noise('highpass', 3000, 0.7, 0.002, 0.18, 0.03); tone(1760, 'square', 0.004, 0.05, 0.06, null, 0.08); },
    ok: () => { tone(988, 'square', 0.004, 0.06, 0.08); tone(1318, 'square', 0.004, 0.06, 0.12, null, 0.1); },
    fail: () => { tone(330, 'square', 0.004, 0.07, 0.16); tone(247, 'square', 0.004, 0.07, 0.26, null, 0.18); },
    tick: () => tone(2200, 'square', 0.002, 0.04, 0.03),
    // thin whistle of steam leaving through a crack
    whistle: () => { noise('bandpass', 3400, 18, 0.15, 0.06, 0.9); tone(3400, 'sine', 0.2, 0.015, 0.8); },
    // a bolt turning in its thread
    screw: () => { for (let i = 0; i < 6; i++) noise('bandpass', 900 + i * 60, 9, 0.004, 0.08, 0.05, null, i * 0.07); },
    // pipe section lifted on or off: heavy metal clank
    clank: () => { tone(160, 'triangle', 0.003, 0.2, 0.35, 120); tone(510, 'triangle', 0.003, 0.08, 0.5, 480); noise('bandpass', 1800, 4, 0.002, 0.12, 0.2); },
    // breath behind the glass
    breath: () => noise('lowpass', 400, 0.8, 0.6, 0.06, 1.2, 160),
  };

  CL.Ch5Sound = {
    play(name) {
      if (!FX[name]) { CL.Sound.play(name); return; }
      if (CL.Sound.muted) return;
      if (!ensure()) return;
      try { FX[name](); } catch (e) { /* ignore */ }
    },
  };
})(window.CL = window.CL || {});
