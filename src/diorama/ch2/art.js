/* Chapter 2 · 监督微调 (SFT): the 2-D side of the chapter. Pictograms (the demo
   cards, the tape window, the Clawds' thought bubbles and Sonnet's laptop all
   use the same little drawings), canvas textures painted with the short's 2-D
   renderer, and this chapter's sounds.

   Everything here extends the shared modules at runtime and only adds:
     CL.Tex.icon(kind)  gains the bubble kinds in ICONS (other kinds fall through)
     CL.Sound.play(n)   gains the sounds in FX (other names fall through) */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const X = CL.gfx;
  const TX = CL.Tex;
  const { rect, rrect, circle, poly, ellipse, arcPath } = X;
  const PI = Math.PI;

  // ------------------------------------------------------------ pictograms
  // picto(g, kind, x, y, s, opt): one pictogram centred on (x, y), about s across,
  // drawn with the 2-D renderer (y up). opt.ink: outline colour, opt.glow: for dark screens.
  function picto(g, kind, x, y, s, opt) {
    opt = opt || {};
    const ink = opt.ink || P.INK;
    const w = opt.w || 1.2;
    const fill = (c) => (opt.mono ? opt.mono : c);
    if (kind === 'bell') {
      const b = new Path2D();
      b.moveTo(x - 0.34 * s, y - 0.24 * s);
      b.quadraticCurveTo(x - 0.24 * s, y - 0.18 * s, x - 0.22 * s, y + 0.06 * s);
      b.quadraticCurveTo(x - 0.2 * s, y + 0.34 * s, x, y + 0.34 * s);
      b.quadraticCurveTo(x + 0.2 * s, y + 0.34 * s, x + 0.22 * s, y + 0.06 * s);
      b.quadraticCurveTo(x + 0.24 * s, y - 0.18 * s, x + 0.34 * s, y - 0.24 * s);
      b.closePath();
      g.fs(b, fill(P.BRASS), w, 1, ink);
      g.fs(circle(x, y - 0.33 * s, 0.075 * s), fill(P.BRASS_LIGHT), w * 0.8, 1, ink);
      g.stroke(arcPath(x, y + 0.4 * s, 0.07 * s, 0, 360), w * 0.8, ink);
      if (!opt.still) {
        g.stroke(arcPath(x - 0.36 * s, y + 0.05 * s, 0.14 * s, 140, 80), w * 0.8, ink);
        g.stroke(arcPath(x + 0.36 * s, y + 0.05 * s, 0.14 * s, -40, 80), w * 0.8, ink);
      }
    } else if (kind === 'big') {
      // the big bell, high up, with its rope
      const b = new Path2D();
      const yy = y + 0.12 * s;
      b.moveTo(x - 0.4 * s, yy - 0.18 * s);
      b.quadraticCurveTo(x - 0.28 * s, yy - 0.12 * s, x - 0.26 * s, yy + 0.08 * s);
      b.quadraticCurveTo(x - 0.24 * s, yy + 0.32 * s, x, yy + 0.32 * s);
      b.quadraticCurveTo(x + 0.24 * s, yy + 0.32 * s, x + 0.26 * s, yy + 0.08 * s);
      b.quadraticCurveTo(x + 0.28 * s, yy - 0.12 * s, x + 0.4 * s, yy - 0.18 * s);
      b.closePath();
      g.fs(b, fill(P.COPPER), w, 1, ink);
      g.line(x - 0.3 * s, yy + 0.38 * s, x + 0.3 * s, yy + 0.38 * s, w * 1.3, ink);
      g.line(x, yy - 0.18 * s, x, y - 0.38 * s, w, ink);
      g.fs(rrect(x - 0.05 * s, y - 0.48 * s, x + 0.05 * s, y - 0.34 * s, 0.02 * s), fill(P.COPPER_LIGHT), w * 0.8, 1, ink);
      // up arrow: it hangs high
      g.line(x + 0.42 * s, y - 0.3 * s, x + 0.42 * s, y + 0.14 * s, w, ink);
      g.stroke(poly([[x + 0.33 * s, y + 0.04 * s], [x + 0.42 * s, y + 0.15 * s], [x + 0.51 * s, y + 0.04 * s]], false), w, ink);
    } else if (kind === 'lamp') {
      g.fs(circle(x, y + 0.08 * s, 0.22 * s), fill(P.GLOW_CORE), w, 1, ink);
      g.fs(rect(x - 0.1 * s, y - 0.3 * s, x + 0.1 * s, y - 0.12 * s), fill(P.NAVY_LIGHT), w, 1, ink);
      g.line(x - 0.08 * s, y - 0.2 * s, x + 0.08 * s, y - 0.2 * s, w * 0.6, ink);
      for (let i = 0; i < 5; i++) {
        const a = PI * (0.1 + 0.2 * i);
        g.line(x + Math.cos(a) * 0.3 * s, y + 0.08 * s + Math.sin(a) * 0.3 * s, x + Math.cos(a) * 0.42 * s, y + 0.08 * s + Math.sin(a) * 0.42 * s, w, opt.mono || P.BRASS);
      }
    } else if (kind === 'flag') {
      g.line(x - 0.2 * s, y - 0.42 * s, x - 0.2 * s, y + 0.42 * s, w * 1.2, ink);
      g.fs(poly([[x - 0.2 * s, y + 0.4 * s], [x + 0.34 * s, y + 0.27 * s], [x - 0.2 * s, y + 0.1 * s]]), fill(P.WHEEL_RED), w, 1, ink);
      // up arrow beside the pole: raise it
      g.line(x + 0.2 * s, y - 0.38 * s, x + 0.2 * s, y - 0.02 * s, w, ink);
      g.stroke(poly([[x + 0.11 * s, y - 0.11 * s], [x + 0.2 * s, y], [x + 0.29 * s, y - 0.11 * s]], false), w, ink);
    } else if (kind === 'click' || kind === 'tile') {
      // a floor tile seen from above, rocking: one corner up, a crack, a click
      const q = [[x - 0.38 * s, y - 0.22 * s], [x + 0.22 * s, y - 0.3 * s], [x + 0.38 * s, y + 0.04 * s], [x - 0.2 * s, y + 0.14 * s]];
      g.fs(poly(q), fill(P.POD), w, 1, ink);
      g.stroke(poly([[x - 0.14 * s, y - 0.22 * s], [x - 0.06 * s, y - 0.1 * s], [x - 0.12 * s, y - 0.02 * s], [x + 0.0 * s, y + 0.08 * s]], false), w * 0.8, ink);
      [[0.3, 0.22, 0.42, 0.38], [0.42, 0.14, 0.56, 0.22], [0.18, 0.26, 0.2, 0.44]].forEach(([x0, y0, x1, y1]) => g.line(x + x0 * s, y + y0 * s, x + x1 * s, y + y1 * s, w, opt.mono || P.ALARM));
    } else if (kind === 'taptap' || kind === 'clip') {
      // the clipboard and Opus's pen: tok, tok
      g.fs(rrect(x - 0.3 * s, y - 0.4 * s, x + 0.14 * s, y + 0.3 * s, 0.04 * s), fill(P.COPPER), w, 1, ink);
      g.fs(rect(x - 0.25 * s, y - 0.34 * s, x + 0.09 * s, y + 0.2 * s), fill(P.PAPER), w * 0.6, 1, ink);
      g.fs(rect(x - 0.15 * s, y + 0.24 * s, x - 0.01 * s, y + 0.34 * s), fill(P.NAVY_LIGHT), w * 0.6, 1, ink);
      g.line(x + 0.36 * s, y + 0.42 * s, x + 0.06 * s, y - 0.06 * s, w * 1.6, ink);
      g.fs(circle(x + 0.05 * s, y - 0.08 * s, 0.035 * s), fill(P.TIE_RED), w * 0.5, 1, ink);
      g.stroke(arcPath(x + 0.05 * s, y - 0.08 * s, 0.12 * s, 200, 60), w, opt.mono || P.ALARM);
      g.stroke(arcPath(x + 0.05 * s, y - 0.08 * s, 0.2 * s, 200, 60), w, opt.mono || P.ALARM);
    } else if (kind === 'frame') {
      // out of the camera's frame: four corner marks, a little box outside
      const c = opt.mono || P.ALARM;
      const k = 0.13 * s;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        const cx = x - 0.08 * s + sx * 0.24 * s, cy = y + sy * 0.26 * s;
        g.stroke(poly([[cx - sx * k, cy], [cx, cy], [cx, cy - sy * k]], false), w * 1.3, c);
      });
      g.fs(rect(x + 0.3 * s, y - 0.1 * s, x + 0.46 * s, y + 0.04 * s), fill(P.ORANGE), w * 0.8, 1, ink);
      g.stroke(poly([[x + 0.26 * s, y + 0.22 * s], [x + 0.12 * s, y + 0.22 * s]], false), w, ink);
      g.stroke(poly([[x + 0.17 * s, y + 0.28 * s], [x + 0.11 * s, y + 0.22 * s], [x + 0.17 * s, y + 0.16 * s]], false), w, ink);
    } else if (kind === 'knock') {
      // a knuckle tap on glass: one dot and its ring
      g.fill(circle(x, y, 0.1 * s), opt.mono || ink);
      g.stroke(circle(x, y, 0.24 * s), w, opt.mono || ink);
    } else if (kind === 'card') {
      g.fs(rrect(x - 0.38 * s, y - 0.26 * s, x + 0.38 * s, y + 0.26 * s, 0.04 * s), fill(P.PAPER), w, 1, ink);
      g.stroke(rrect(x - 0.32 * s, y - 0.2 * s, x + 0.32 * s, y + 0.2 * s, 0.03 * s), w * 0.6, P.WHEEL_RED);
      g.fill(circle(x - 0.14 * s, y, 0.06 * s), ink);
      g.fill(circle(x + 0.02 * s, y, 0.06 * s), ink);
      g.fill(circle(x + 0.18 * s, y, 0.06 * s), ink);
    }
  }

  // ------------------------------------------------------------ bubble icons
  const ICONS = { click: 1, taptap: 1, frame: 1, bell: 1, big: 1, lamp: 1, flag: 1, knock: 1, card: 1, tile: 1, clip: 1, clock: 1, laptop: 1 };
  function drawIcon(kind, size) {
    return TX.paint(1, 1, size, g => {
      if (kind === 'clock') {
        g.stroke(circle(0.5, 0.5, 0.32), 1.3);
        g.line(0.5, 0.5, 0.5, 0.74, 1.3);
        g.line(0.5, 0.5, 0.66, 0.42, 1.3);
        return;
      }
      if (kind === 'laptop') {
        // Sonnet's laptop and its plug: "this needs the laptop"
        g.fs(rrect(0.22, 0.4, 0.74, 0.8, 0.03), P.NAVY_DARK, 1.2);
        [0.7, 0.62, 0.54].forEach((y, i) => g.line(0.3, y, 0.48 + 0.1 * i, y, 1.0, P.SCREEN));
        g.fs(poly([[0.14, 0.4], [0.82, 0.4], [0.9, 0.3], [0.06, 0.3]]), P.HOODIE_LIGHT, 1.2);
        g.stroke(poly([[0.86, 0.34], [0.94, 0.26], [0.9, 0.14]], false), 1.2);
        g.fs(rect(0.84, 0.06, 0.96, 0.14), P.INK, 0.8);
        return;
      }
      picto(g, kind, 0.5, 0.5, 0.86, { w: 1.4 });
    }, { line: 3.2 });
  }
  if (!TX.icon.ch2) {
    const base = TX.icon;
    TX.icon = function (kind, size) { return ICONS[kind] ? drawIcon(kind, size) : base(kind, size); };
    TX.icon.ch2 = true;
  }

  // ------------------------------------------------------------ textures

  const memo = {};
  const once = (k, fn) => memo[k] || (memo[k] = fn());

  // demo cards: 0.9 x 0.64, pictograms in a row; the last one is two letters
  const CARD_W = 0.9, CARD_H = 0.64;
  function cardTex(card, i) {
    return once('card' + i, () => TX.tex(TX.paint(CARD_W, CARD_H, 420, g => {
      g.fs(rrect(0.005, 0.005, CARD_W - 0.005, CARD_H - 0.005, 0.03), P.PAPER, 1.2);
      g.stroke(rrect(0.04, 0.04, CARD_W - 0.04, CARD_H - 0.04, 0.025), 0.7, P.WHEEL_RED);
      g.text(String(i + 1), 0.08, CARD_H - 0.12, 0.07, P.INK_SOFT, 'slab', 'left');
      g.text('/4', 0.12, CARD_H - 0.12, 0.05, P.INK_SOFT, 'slab', 'left');
      if (card.seq) {
        const n = card.seq.length, s = n > 2 ? 0.24 : 0.32, gap = n > 2 ? 0.27 : 0.34;
        card.seq.forEach((k, j) => {
          const x = CARD_W / 2 + (j - (n - 1) / 2) * gap;
          picto(g, k, x, CARD_H / 2 - 0.03, s, { w: 1.3, still: true });
          if (j < n - 1) g.fill(circle(x + gap / 2, CARD_H / 2 - 0.03, 0.008), P.INK_SOFT);
        });
      } else {
        g.text(card.tap.join(' · '), CARD_W / 2, CARD_H / 2 - 0.12, 0.3, P.INK, 'hand');
      }
    }, { line: 2.2 })));
  }

  function cardBackTex() {
    return once('cardback', () => TX.tex(TX.paint(CARD_W, CARD_H, 300, g => {
      const p = rrect(0.005, 0.005, CARD_W - 0.005, CARD_H - 0.005, 0.03);
      g.fs(p, P.REACTOR, 1.2);
      g.hatch(p, P.INK, 0.12, 'cross', 0.3);
      g.text('SFT', CARD_W / 2, CARD_H / 2 - 0.06, 0.18, P.INK_SOFT, 'slab');
    }, { line: 2.2 })));
  }

  // the tape window on the recorder: a dark strip that lists what was recorded
  const TAPE_W = 0.84, TAPE_H = 0.24, TAPE_SLOTS = 6;
  function tapeCanvas() {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = Math.round(512 * TAPE_H / TAPE_W);
    return cv;
  }
  // draw(cv, events, opt): events = ['bell', ...]; opt.rec: recording, opt.play: index being played
  function drawTape(cv, events, opt) {
    opt = opt || {};
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    const g = new X.G(c, cv.width, cv.height, new X.Cam(TAPE_W / 2, TAPE_H / 2, TAPE_H));
    g.zoomk = 2.0 / ((cv.height / TAPE_H) * 0.016);
    g.beginWorld();
    g.fs(rrect(0.004, 0.004, TAPE_W - 0.004, TAPE_H - 0.004, 0.02), P.NAVY_DARK, 1.4);
    const sw = (TAPE_W - 0.06) / TAPE_SLOTS;
    const first = Math.max(0, events.length - TAPE_SLOTS);
    for (let i = 0; i < TAPE_SLOTS; i++) {
      const x = 0.03 + sw * (i + 0.5), y = TAPE_H / 2 - 0.005;
      const k = events[first + i];
      g.stroke(rrect(x - sw / 2 + 0.006, 0.03, x + sw / 2 - 0.006, TAPE_H - 0.03, 0.012), 0.5, P.NAVY_LIGHT);
      if (!k) continue;
      const hot = opt.play === first + i;
      if (hot) g.fill(rrect(x - sw / 2 + 0.006, 0.03, x + sw / 2 - 0.006, TAPE_H - 0.03, 0.012), P.SCREEN, 0.35);
      picto(g, k, x, y, sw * 0.86, { ink: P.SCREEN, mono: k === 'click' || k === 'taptap' ? P.ALARM : null, w: 0.9, still: true });
    }
    if (first > 0) g.text('…', 0.018, 0.07, 0.06, P.SCREEN, 'slab');
    if (opt.rec) g.fill(circle(TAPE_W - 0.025, TAPE_H - 0.03, 0.012), P.ALARM);
    g.end();
  }

  // the tap-code chart on the reactor (5 x 5, K = C): rows first, then columns
  const CHART_W = 0.96, CHART_H = 1.15;
  const GRID = ['ABCDE', 'FGHIJ', 'LMNOP', 'QRSTU', 'VWXYZ'];
  const chartRowY = r => 0.79 - r * 0.135;
  const chartColX = c => 0.3 + c * 0.135;
  function chartTex() {
    return once('chart', () => TX.tex(TX.paint(CHART_W, CHART_H, 520, g => {
      g.fs(rect(0.005, 0.005, CHART_W - 0.005, CHART_H - 0.005), P.PAPER, 1.2);
      g.hatch(rect(0, 0, CHART_W, CHART_H), P.INK, 0.05, 'diag', 0.5);
      g.text('TAP CODE', CHART_W / 2, CHART_H - 0.12, 0.085, P.INK, 'slab');
      g.line(0.08, CHART_H - 0.15, CHART_W - 0.08, CHART_H - 0.15, 0.6);
      for (let i = 0; i < 5; i++) {
        g.text(String(i + 1), chartColX(i), 0.9, 0.075, P.WHEEL_RED, 'slab');
        g.text(String(i + 1), 0.14, chartRowY(i) - 0.03, 0.075, P.WHEEL_RED, 'slab');
        for (let j = 0; j < 5; j++) g.text(GRID[i][j], chartColX(j), chartRowY(i) - 0.035, 0.095, P.INK, 'slab');
      }
      g.line(0.2, 0.86, CHART_W - 0.06, 0.86, 0.5, P.WHEEL_RED);
      g.line(0.21, 0.86, 0.21, 0.14, 0.5, P.WHEEL_RED);
      // a worked example in dots: one knock, a pause, two knocks = B (row 1, column 2)
      g.text('B', 0.14, 0.04, 0.08, P.INK, 'slab');
      g.text('=', 0.24, 0.045, 0.06, P.INK_SOFT, 'slab');
      [0.34, 0.47, 0.52].forEach(x => g.fill(circle(x, 0.07, 0.018), P.INK));
      g.text('K = C', CHART_W - 0.15, 0.045, 0.06, P.INK_SOFT, 'hand');
      [[0.04, CHART_H - 0.04], [CHART_W - 0.04, CHART_H - 0.04]].forEach(([x, y]) => g.fs(rect(x - 0.05, y - 0.02, x + 0.05, y + 0.02), P.GLASS, 0.4, 0.6));
    }, { line: 2.0 })));
  }

  // the poster on its stand: a lab poster for the new training week
  const POSTER_W = 0.96, POSTER_H = 0.66;
  function posterTex() {
    return once('poster', () => TX.tex(TX.paint(POSTER_W, POSTER_H, 420, g => {
      g.fs(rect(0.005, 0.005, POSTER_W - 0.005, POSTER_H - 0.005), P.SAFETY, 1.2);
      g.fill(rect(0.04, 0.04, POSTER_W - 0.04, POSTER_H - 0.04), P.PAPER);
      g.text('LEARN BY', POSTER_W / 2, POSTER_H - 0.17, 0.1, P.INK, 'slab');
      g.text('EXAMPLE', POSTER_W / 2, POSTER_H - 0.28, 0.1, P.WHEEL_RED, 'slab');
      // two Clawds: a big one shows a card, a small one copies it
      const clawd = (x, y, w) => {
        g.fs(rrect(x - w / 2, y, x + w / 2, y + w * 0.62, w * 0.04), P.ORANGE, 1);
        g.fill(rect(x - w * 0.24, y + w * 0.24, x - w * 0.16, y + w * 0.42), P.INK);
        g.fill(rect(x + w * 0.16, y + w * 0.24, x + w * 0.24, y + w * 0.42), P.INK);
        [-0.36, -0.2, 0.2, 0.36].forEach(l => g.fill(rect(x + l * w - w * 0.04, y - w * 0.14, x + l * w + w * 0.04, y), P.ORANGE_DARK));
      };
      clawd(0.3, 0.1, 0.26);
      clawd(0.68, 0.1, 0.17);
      picto(g, 'card', 0.3, 0.33, 0.2, { w: 0.8 });
      picto(g, 'card', 0.68, 0.27, 0.15, { w: 0.8 });
    }, { line: 2.0 })));
  }

  // demo tiles: cream, with a thin inset; the loose one has a crack
  function tileTex(loose) {
    return once('tile' + loose, () => TX.tex(TX.paint(1, 1, 256, g => {
      g.fill(rect(0, 0, 1, 1), P.POD);
      g.hatch(rect(0, 0, 1, 1), P.INK, 0.05, 'diag', 1.0);
      g.stroke(rect(0.06, 0.06, 0.94, 0.94), 0.8, P.POD_SHADE);
      [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]].forEach(([x, y]) => g.fill(circle(x, y, 0.018), P.POD_DEEP));
      if (loose) {
        g.stroke(poly([[0.62, 0.94], [0.58, 0.8], [0.66, 0.7], [0.6, 0.58], [0.7, 0.48]], false), 0.9, P.INK_SOFT);
        g.stroke(poly([[0.66, 0.7], [0.78, 0.66]], false), 0.6, P.INK_SOFT);
        g.fill(circle(0.9, 0.1, 0.03), P.POD_DEEP);
      }
    }, { line: 2.4 })));
  }

  // tool board: painted outlines; the clipboard's shape waits beside an empty hook
  const PEG_W = 0.96, PEG_H = 0.78;
  function pegTex() {
    return once('peg', () => TX.tex(TX.paint(PEG_W, PEG_H, 360, g => {
      g.fs(rect(0.005, 0.005, PEG_W - 0.005, PEG_H - 0.005), P.REACTOR, 1.2);
      for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) g.fill(circle(0.06 + i * 0.105, 0.07 + j * 0.107, 0.012), P.REACTOR_DEEP);
      // wrench, scissors (hanging), the clipboard outline (empty)
      g.stroke(poly([[0.12, 0.16], [0.12, 0.58]], false), 3.2, P.INK_SOFT);
      g.stroke(circle(0.12, 0.62, 0.05), 1.6, P.INK_SOFT);
      g.stroke(circle(0.25, 0.2, 0.04), 1.2, P.INK_SOFT);
      g.stroke(circle(0.33, 0.2, 0.04), 1.2, P.INK_SOFT);
      g.stroke(poly([[0.26, 0.24], [0.31, 0.58]], false), 1.2, P.INK_SOFT);
      g.stroke(poly([[0.32, 0.24], [0.27, 0.58]], false), 1.2, P.INK_SOFT);
      g.stroke(rrect(0.5, 0.08, 0.86, 0.6, 0.03), 1.0, P.INK_SOFT);
      g.stroke(rect(0.62, 0.56, 0.74, 0.64), 0.8, P.INK_SOFT);
      g.text('OPUS', 0.68, 0.3, 0.07, P.INK_SOFT, 'hand');
    }, { line: 2.0 })));
  }

  function smallPlate(text, w, h, bg, fg) {
    return once('plate|' + text + w + h + bg, () => TX.tex(TX.paint(w, h, 380, g => {
      g.fs(rect(0.004, 0.004, w - 0.004, h - 0.004), bg || P.PAPER, 1.0);
      g.text(text, w / 2, h * 0.28, h * 0.5, fg || P.INK, 'slab');
    }, { line: 1.6 })));
  }

  // Sonnet's laptop on the stage's junction box: a weight map of the nine tiles.
  // w[i]: load on tile i (0..1.6), shake: the loose tile's rattle (0..1)
  function drawTileMap(cv, w, looseIdx, shake, t) {
    const c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = P.NAVY_DARK;
    c.fillRect(0, 0, W, H);
    const cell = Math.min(W, H) * 0.27, ox = (W - cell * 3) / 2, oy = (H - cell * 3) / 2 + 4;
    c.lineWidth = 2;
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
      const i = r * 3 + q, x = ox + q * cell, y = oy + r * cell;
      c.strokeStyle = P.NAVY_LIGHT;
      c.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
      const v = Math.min(1, (w[i] || 0) / 1.6);
      if (v > 0.01) { c.fillStyle = P.SCREEN; c.globalAlpha = 0.25 + 0.6 * v; c.fillRect(x + 8, y + cell - 8 - (cell - 16) * v, cell - 16, (cell - 16) * v); c.globalAlpha = 1; }
      if (i === looseIdx) {
        // its sensor reads a jagged line, sharper while it rattles
        c.strokeStyle = P.ALARM;
        c.lineWidth = 2.5;
        c.beginPath();
        for (let k = 0; k <= 8; k++) {
          const xx = x + 8 + (cell - 16) * k / 8;
          const amp = (0.12 + 0.3 * shake) * cell * (k % 2 ? 1 : -1) * (0.6 + 0.4 * Math.sin(t * 13 + k));
          if (k === 0) c.moveTo(xx, y + cell / 2 + amp); else c.lineTo(xx, y + cell / 2 + amp);
        }
        c.stroke();
        c.lineWidth = 2;
      }
    }
    // the camera frame marks around the stage
    c.strokeStyle = P.ALARM;
    c.lineWidth = 3;
    const k = 10, x0 = ox - 4, y0 = oy - 4, x1 = ox + cell * 3 + 4, y1 = oy + cell * 3 + 4;
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => { c.beginPath(); c.moveTo(x + sx * k, y); c.lineTo(x, y); c.lineTo(x, y + sy * k); c.stroke(); });
  }

  // ------------------------------------------------------------ sounds
  // Own little synth: the shared one keeps its context private. It follows the
  // shared mute switch and falls through for every other sound name.
  let ctx = null, master = null;
  const activated = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;
  function audio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    if (!activated()) return null;
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
    const len = a + d + 0.1;
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const data = b.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
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
  const bell = (f, peak, d, detune) => { tone(f, 'sine', 0.002, peak, d); tone(f * 2.4 * (detune || 1), 'sine', 0.002, peak * 0.4, d * 0.6); tone(f * 4.1, 'sine', 0.002, peak * 0.15, d * 0.3); };
  const FX = {
    ding: () => bell(1180, 0.22, 1.3),
    dingF: () => bell(1112, 0.2, 1.6, 0.985),             // Fable's bell: a little lower, a little off
    bong: () => { bell(196, 0.38, 3.0); tone(98, 'sine', 0.01, 0.18, 2.2); },
    bongF: () => { bell(185, 0.34, 3.4, 0.98); tone(92, 'sine', 0.01, 0.16, 2.6); },
    clack: () => { noise('bandpass', 2400, 3, 0.001, 0.4, 0.05); tone(160, 'square', 0.001, 0.12, 0.08, 90); noise('lowpass', 500, 0.8, 0.002, 0.25, 0.12, null, 0.06); },
    tok: () => { noise('bandpass', 1300, 5, 0.001, 0.35, 0.06); tone(420, 'triangle', 0.001, 0.12, 0.05, 300); },
    flick: () => { noise('highpass', 2200, 0.7, 0.001, 0.3, 0.03); tone(120, 'square', 0.002, 0.05, 0.25); },
    crank: () => { for (let i = 0; i < 6; i++) noise('bandpass', 1800 + i * 90, 6, 0.001, 0.18, 0.03, null, i * 0.08); },
    key: () => { tone(140, 'square', 0.002, 0.1, 0.08, 80); noise('highpass', 1800, 0.6, 0.001, 0.2, 0.03); },
    whirr: () => noise('bandpass', 420, 2, 0.15, 0.06, 1.2, 380),
    buzz: () => { tone(110, 'sawtooth', 0.01, 0.1, 0.45); tone(116, 'sawtooth', 0.01, 0.08, 0.45); },
    flip: () => noise('bandpass', 2600, 1.5, 0.02, 0.18, 0.22, 1200),
    yes: () => { tone(660, 'sine', 0.005, 0.16, 0.25); tone(990, 'sine', 0.005, 0.16, 0.4, null, 0.12); tone(1320, 'sine', 0.005, 0.14, 0.6, null, 0.24); },
    knock: () => { tone(1900, 'triangle', 0.001, 0.22, 0.08); tone(3100, 'sine', 0.001, 0.06, 0.05); },
    knockF: () => { tone(880, 'triangle', 0.001, 0.2, 0.12); noise('lowpass', 700, 0.8, 0.001, 0.1, 0.1); },
    thump: () => { tone(90, 'sine', 0.003, 0.3, 0.2, 60); noise('lowpass', 400, 0.7, 0.002, 0.15, 0.1); },
    lift: () => noise('bandpass', 900, 1.5, 0.02, 0.12, 0.2, 600),
  };
  if (!CL.Sound.play.ch2) {
    const base = CL.Sound.play;
    CL.Sound.play = function (name) {
      if (!FX[name]) return base.call(CL.Sound, name);
      if (CL.Sound.muted || !audio()) return;
      try { FX[name](); } catch (e) { /* ignore */ }
    };
    CL.Sound.play.ch2 = true;
  }

  CL.Ch2Art = {
    picto, cardTex, cardBackTex, CARD_W, CARD_H, tapeCanvas, drawTape, TAPE_W, TAPE_H,
    chartTex, CHART_W, CHART_H, GRID, posterTex, POSTER_W, POSTER_H, tileTex, pegTex, PEG_W, PEG_H, smallPlate, drawTileMap,
  };
})(window.CL = window.CL || {});
