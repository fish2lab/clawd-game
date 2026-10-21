/* Epilogue sounds, synthesised like src/diorama/sound.js: Fable's growl and breath,
   its knocks, a heartbeat, the chomp, the clock in the dark, a puzzled hum, the
   wind through the hatch, a dawn chord and a whale-ish song.

   sound.js keeps its AudioContext private, so this chapter runs its own small one
   (made on the first sound, after the player has clicked) and follows the shared
   mute button. */
(function (CL) {
  'use strict';
  const E = CL.Epi = CL.Epi || {};
  let ctx = null, out = null;

  function ac() {
    if (CL.Sound.muted) return null;
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        out = ctx.createGain();
        out.gain.value = 0.5;
        out.connect(ctx.destination);
      } catch (e) { ctx = null; return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  // o: { f, type, a, peak, d, f2, at, lp }
  function tone(o) {
    const t = ctx.currentTime + (o.at || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + o.a + o.d);
    env(g, t, o.a, o.peak, o.d);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
    node.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + o.a + o.d + 0.05);
  }

  // o: { type, f, q, a, peak, d, f2, at }
  function noise(o) {
    const t = ctx.currentTime + (o.at || 0);
    const len = o.a + o.d + 0.1;
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource();
    s.buffer = b;
    const f = ctx.createBiquadFilter();
    f.type = o.type;
    f.frequency.setValueAtTime(o.f, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.a + o.d);
    f.Q.value = o.q || 0.7;
    const g = ctx.createGain();
    env(g, t, o.a, o.peak, o.d);
    s.connect(f).connect(g).connect(out);
    s.start(t);
  }

  const FX = {
    // a low, wet growl from something very big
    growl: () => {
      tone({ f: 46, type: 'sawtooth', a: 0.18, peak: 0.32, d: 1.3, f2: 38, lp: 220 });
      tone({ f: 69, type: 'sawtooth', a: 0.25, peak: 0.14, d: 1.1, f2: 55, lp: 260 });
      noise({ type: 'lowpass', f: 380, q: 1.2, a: 0.2, peak: 0.12, d: 1.2, f2: 160 });
    },
    breath: () => noise({ type: 'lowpass', f: 420, q: 0.8, a: 0.7, peak: 0.07, d: 1.3, f2: 180 }),
    // Fable knocking back: a big soft knuckle on the floor
    knock: () => {
      tone({ f: 120, type: 'sine', a: 0.003, peak: 0.7, d: 0.35, f2: 55 });
      noise({ type: 'lowpass', f: 900, q: 0.8, a: 0.002, peak: 0.35, d: 0.12 });
    },
    // the chalk scratching a tally mark
    chalk: () => noise({ type: 'bandpass', f: 3800, q: 2.5, a: 0.004, peak: 0.07, d: 0.09, f2: 2600 }),
    heart: () => {
      tone({ f: 58, type: 'sine', a: 0.006, peak: 0.8, d: 0.2, f2: 40 });
      tone({ f: 54, type: 'sine', a: 0.006, peak: 0.55, d: 0.22, f2: 38, at: 0.24 });
    },
    chomp: () => {
      noise({ type: 'lowpass', f: 2200, q: 0.8, a: 0.003, peak: 0.9, d: 0.4, f2: 180 });
      tone({ f: 85, type: 'square', a: 0.003, peak: 0.45, d: 0.3, f2: 32, lp: 600 });
      noise({ type: 'bandpass', f: 700, q: 3, a: 0.002, peak: 0.5, d: 0.16, at: 0.13 });
    },
    tick: () => tone({ f: 2900, type: 'square', a: 0.001, peak: 0.05, d: 0.025 }),
    // a puzzled "hm?": low and rising
    hm: () => tone({ f: 95, type: 'triangle', a: 0.1, peak: 0.32, d: 0.55, f2: 150, lp: 700 }),
    // a pleased "mm" when a letter lands
    mm: () => tone({ f: 82, type: 'triangle', a: 0.06, peak: 0.22, d: 0.35, f2: 88, lp: 500 }),
    rumble: () => noise({ type: 'lowpass', f: 160, q: 0.9, a: 0.15, peak: 0.3, d: 0.9, f2: 90 }),
    latch: () => {
      tone({ f: 260, type: 'square', a: 0.002, peak: 0.1, d: 0.08, f2: 140 });
      noise({ type: 'bandpass', f: 1800, q: 4, a: 0.001, peak: 0.2, d: 0.06, at: 0.05 });
    },
    wind: () => noise({ type: 'bandpass', f: 700, q: 0.6, a: 1.2, peak: 0.12, d: 3.2, f2: 350 }),
    // first light: a soft major chord, one voice after another
    chord: () => [261.6, 329.6, 392.0, 523.3, 659.3].forEach((f, i) => tone({ f, type: 'sine', a: 0.9, peak: 0.06, d: 4.5, at: i * 0.16 })),
    whale: () => {
      tone({ f: 170, type: 'sine', a: 0.7, peak: 0.2, d: 2.4, f2: 120 });
      tone({ f: 240, type: 'triangle', a: 0.9, peak: 0.08, d: 2.6, f2: 330, at: 0.9, lp: 900 });
      tone({ f: 120, type: 'sine', a: 0.6, peak: 0.16, d: 2.0, f2: 160, at: 2.6 });
    },
  };

  E.Sound = {
    play(name) {
      if (!FX[name] || !ac()) return;
      try { FX[name](); } catch (e) { /* ignore */ }
    },
  };
})(window.CL = window.CL || {});
