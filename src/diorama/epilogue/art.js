/* Epilogue art: textures painted with the 2-D renderer (the tap-code chart, the
   chalk tally, the dawn sky), the pictograms this chapter adds to the thought
   bubbles, the speech bubbles, and the end credit. Colours come from CL.P only. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const X = CL.gfx;
  const TX = CL.Tex;
  const { rect, rrect, circle, poly, arcPath, hash01, css } = X;
  const E = CL.Epi = CL.Epi || {};

  const GRID = ['ABCDE', 'FGHIJ', 'LMNOP', 'QRSTU', 'VWXYZ'];

  // ------------------------------------------------------------ the tap-code chart

  // Taped to the reactor's flank back in chapter 2; one corner has torn off since.
  function tapChart() {
    const W = 1.8, H = 1.8;
    return TX.tex(TX.paint(W, H, 340, g => {
      const sheet = poly([[0.05, 0.05], [W - 0.05, 0.05], [W - 0.05, H - 0.3], [W - 0.18, H - 0.24], [W - 0.3, H - 0.05], [0.05, H - 0.05]]);
      g.fs(sheet, P.PAPER, 1.1);
      g.hatch(sheet, P.INK, 0.05, 'diag', 0.8);
      g.text('TAP CODE', W / 2 - 0.08, H - 0.29, 0.17, P.INK, 'slab');
      g.line(0.22, H - 0.36, W - 0.38, H - 0.36, 1.0, P.ORANGE);
      const c = 0.24, x0 = 0.55, y0 = H - 0.78;
      // column numbers across the top, row numbers down the side (tap the row first)
      for (let i = 0; i < 5; i++) {
        g.text(String(i + 1), x0 + i * c, y0 + 0.2, 0.13, P.WHEEL_RED, 'slab');
        g.text(String(i + 1), x0 - 0.3, y0 - i * c - 0.05, 0.13, P.WHEEL_RED, 'slab');
      }
      for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) {
        g.text(GRID[r][q], x0 + q * c, y0 - r * c - 0.055, 0.16, P.INK, 'slab');
      }
      // the grid lines
      for (let i = 0; i <= 5; i++) {
        g.line(x0 - c / 2 + i * c, y0 + c / 2, x0 - c / 2 + i * c, y0 + c / 2 - 5 * c, 0.5, P.INK_SOFT);
        g.line(x0 - c / 2, y0 + c / 2 - i * c, x0 - c / 2 + 5 * c, y0 + c / 2 - i * c, 0.5, P.INK_SOFT);
      }
      g.text('K = C', W - 0.3, 0.16, 0.13, P.INK_SOFT, 'hand');
      // tape
      [[0.22, H - 0.1, 24], [0.2, 0.12, -28], [W - 0.18, 0.14, 30]].forEach(([x, y, r]) => {
        g.save(); g.translate(x, y); g.rotate(r);
        g.fill(rect(-0.17, -0.055, 0.17, 0.055), P.BRASS_LIGHT, 0.8);
        g.restore();
      });
    }, { line: 2.2 }));
  }

  // ------------------------------------------------------------ the chalk tally

  // One row of tally marks on a transparent strip: groups of strokes, a gap after each
  // group, a dot after the first letter (two groups). groups: completed groups; cur: strokes
  // in the open group.
  const TALLY_W = 3.6, TALLY_H = 0.5, TALLY_PPU = 150;
  function tally(color) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(TALLY_W * TALLY_PPU);
    cv.height = Math.round(TALLY_H * TALLY_PPU);
    const t = new T.CanvasTexture(cv);
    t.anisotropy = 8;
    function draw(groups, cur, seed) {
      const c = cv.getContext('2d');
      c.clearRect(0, 0, cv.width, cv.height);
      const g = new X.G(c, cv.width, cv.height, new X.Cam(TALLY_W / 2, TALLY_H / 2, TALLY_H));
      g.zoomk = 2.6 / (TALLY_PPU * 0.016);
      g.beginWorld();
      let x = 0.14, n = 0;
      const stroke = () => {
        const j = hash01(seed || 'tl', n++);
        const tilt = (j - 0.5) * 0.06;
        // inked like everything else, so the chalk reads on the pale floor and in the murk
        g.line(x + tilt, 0.09, x - tilt, 0.41, 4.6, P.INK, 0.85);
        g.line(x + tilt, 0.09, x - tilt, 0.41, 2.6, color, 0.96);
        x += 0.11;
      };
      const all = cur ? groups.concat([cur]) : groups;
      all.forEach((k, i) => {
        for (let s = 0; s < Math.min(k, 7); s++) stroke();
        if (i < groups.length) {
          x += 0.12;
          if (i === 1) { g.fs(circle(x - 0.02, 0.25, 0.045), color, 1.2, 0.96); x += 0.14; }
        }
      });
      g.end();
      t.needsUpdate = true;
    }
    draw([], 0);
    return { tex: t, draw, w: TALLY_W, h: TALLY_H };
  }

  // ------------------------------------------------------------ the sky

  // A vertical gradient for scene.background; k blends the night into the dawn.
  function sky() {
    const cv = document.createElement('canvas');
    cv.width = 4; cv.height = 256;
    const t = new T.CanvasTexture(cv);
    function draw(k) {
      const c = cv.getContext('2d');
      const gr = c.createLinearGradient(0, 0, 0, 256);
      const night = [P.NIGHT, P.NAVY_DARK, P.NIGHT];
      const dawn = [P.SKY, P.DAWN_LO, P.DAWN_HI];
      [0, 0.62, 1].forEach((s, i) => gr.addColorStop(s, css(X.mix(night[i], dawn[i], k))));
      c.fillStyle = gr;
      c.fillRect(0, 0, 4, 256);
      t.needsUpdate = true;
    }
    draw(0);
    return { tex: t, draw };
  }

  // alpha ramp for the shaft of dawn light (bright at the top)
  let _ramp = null;
  function ramp() {
    if (_ramp) return _ramp;
    const cv = document.createElement('canvas');
    cv.width = 4; cv.height = 128;
    const c = cv.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, css(P.PAPER, 0.95));
    gr.addColorStop(0.55, css(P.PAPER, 0.35));
    gr.addColorStop(1, css(P.PAPER, 0.08));
    c.fillStyle = gr;
    c.fillRect(0, 0, 4, 128);
    _ramp = new T.CanvasTexture(cv);
    return _ramp;
  }

  // ------------------------------------------------------------ pictograms

  // kinds this chapter adds to the thought bubbles: wave (a Clawd saying hello), sun (the sky)
  function icon(kind, size) {
    size = size || 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const s = size;
    c.lineWidth = s * 0.07;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = P.INK;
    if (kind === 'wave') {
      // a little Clawd with one arm up, and two motion arcs
      c.fillStyle = P.ORANGE;
      c.fillRect(0.2 * s, 0.48 * s, 0.46 * s, 0.3 * s);
      c.strokeRect(0.2 * s, 0.48 * s, 0.46 * s, 0.3 * s);
      c.fillStyle = P.INK;
      c.fillRect(0.3 * s, 0.56 * s, 0.05 * s, 0.1 * s);
      c.fillRect(0.5 * s, 0.56 * s, 0.05 * s, 0.1 * s);
      c.fillStyle = P.ORANGE;
      c.fillRect(0.66 * s, 0.3 * s, 0.13 * s, 0.13 * s);
      c.strokeRect(0.66 * s, 0.3 * s, 0.13 * s, 0.13 * s);
      c.beginPath(); c.moveTo(0.66 * s, 0.46 * s); c.lineTo(0.63 * s, 0.5 * s); c.stroke();
      c.lineWidth = s * 0.05;
      [0.2, 0.3].forEach(r => { c.beginPath(); c.arc(0.72 * s, 0.37 * s, r * s, -1.25, -0.35); c.stroke(); });
    } else if (kind === 'sun') {
      // the sun coming up over a line: a window, the sky, outside
      c.beginPath(); c.moveTo(0.14 * s, 0.7 * s); c.lineTo(0.86 * s, 0.7 * s); c.stroke();
      c.fillStyle = P.GLOW;
      c.beginPath(); c.arc(0.5 * s, 0.7 * s, 0.2 * s, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.lineWidth = s * 0.055;
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (i + 1) * Math.PI / 6;
        c.beginPath();
        c.moveTo(0.5 * s + Math.cos(a) * 0.28 * s, 0.68 * s + Math.sin(a) * 0.28 * s);
        c.lineTo(0.5 * s + Math.cos(a) * 0.38 * s, 0.68 * s + Math.sin(a) * 0.38 * s);
        c.stroke();
      }
    } else return null;
    return cv;
  }

  // ------------------------------------------------------------ CSS (speech bubbles, the end)

  function style() {
    if (document.getElementById('epi-style')) return;
    const st = document.createElement('style');
    st.id = 'epi-style';
    st.textContent = `
.bubble.say { width: auto; height: auto; padding: 7px 16px 8px; border-radius: 22px; white-space: nowrap;
  font: 700 19px/1.1 "Zilla Slab", Rockwell, Georgia, serif; color: ${P.INK}; letter-spacing: 0.01em; }
#epi-end { position: fixed; left: 0; right: 0; top: 0; bottom: 50%; z-index: 11; pointer-events: none;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 14px;
  padding: 24px 16px 64px; text-align: center; opacity: 0; transition: opacity 1.4s ease; }
#epi-end.on { opacity: 1; }
#epi-end .t { font: 700 clamp(46px, 10vw, 92px)/1 "Zilla Slab", Rockwell, Georgia, serif; color: ${P.PAPER};
  letter-spacing: 0.02em; -webkit-text-stroke: 2px ${P.INK}; text-shadow: 0 5px 0 ${P.INK}; }
#epi-end .rule { width: min(260px, 60vw); height: 4px; background: ${P.ORANGE}; border-radius: 2px; }
#epi-end .s { font: 700 clamp(17px, 2.6vw, 22px)/1.3 "Zilla Slab", Rockwell, Georgia, serif; color: ${css(P.PAPER, 0.85)}; }
#epi-end .last { display: flex; align-items: center; gap: 12px; margin-top: 18px; opacity: 0; transform: translateY(8px) scale(0.92);
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(.3, 1.6, .5, 1); }
#epi-end .last.on { opacity: 1; transform: none; }
#epi-end .last canvas { width: 48px; height: auto; }
#epi-end .last .say { position: relative; background: ${P.PAPER}; color: ${P.INK}; border: 3px solid ${P.INK}; border-radius: 22px;
  padding: 8px 18px 9px; font: 700 clamp(17px, 2.4vw, 21px)/1.1 "Zilla Slab", Rockwell, Georgia, serif; white-space: nowrap; }
#epi-end .last .say::before { content: ""; position: absolute; left: -11px; top: 50%; width: 14px; height: 14px; background: ${P.PAPER};
  border-left: 3px solid ${P.INK}; border-bottom: 3px solid ${P.INK}; transform: translateY(-50%) rotate(45deg); }
body.epi-end .hud-tl, body.epi-end .hud-bl, body.epi-end .hud-br { display: none !important; }
/* game.css gives .screen buttons all: unset, which also unsets [hidden]: without this the
   final card would show 开始 next to 再玩一次 */
.screen button[hidden] { display: none !important; }
@media (prefers-reduced-motion: reduce) { #epi-end, #epi-end .last { transition: none; } }`;
    document.head.appendChild(st);
  }

  // the black screen after the dawn: FABLE 5.5, the line, and Haiku's last word
  function credits() {
    style();
    const el = document.createElement('div');
    el.id = 'epi-end';
    el.setAttribute('aria-live', 'polite');
    const t = document.createElement('div'); t.className = 't'; t.textContent = 'FABLE 5.5';
    const r = document.createElement('div'); r.className = 'rule';
    const s = document.createElement('div'); s.className = 's'; s.textContent = 'Is it finally time? It’s time.';
    const last = document.createElement('div'); last.className = 'last';
    const spec = CL.Engine.SPECS.haiku;
    last.appendChild(CL.Clawd.faceDecal(CL.Clawd.CS({ W: spec.W, outfit: spec.outfit }), 'front', 200 / spec.W, true));
    const say = document.createElement('div'); say.className = 'say'; say.textContent = 'CAN YOU eat me again?';
    last.appendChild(say);
    el.append(t, r, s, last);
    document.body.appendChild(el);
    // the shared HUD's [hidden] loses to its display: flex, so hide it here until the replay
    document.body.classList.add('epi-end');
    const again = document.getElementById('again');
    const gone = () => { el.remove(); document.body.classList.remove('epi-end'); };
    if (again) again.addEventListener('click', gone, { once: true });
    return {
      el,
      show: () => { void el.offsetWidth; el.classList.add('on'); },
      last: () => last.classList.add('on'),
      remove: gone,
    };
  }

  E.Art = { GRID, tapChart, tally, sky, ramp, icon, style, credits };
})(window.CL = window.CL || {});
