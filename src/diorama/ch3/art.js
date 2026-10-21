/* Chapter 3 art: bubble pictograms, painted textures and sounds, all local to this
   chapter. Nothing here changes shared behaviour:
   - CL.Tex.icon is wrapped so world.bubble() also knows this chapter's kinds; any
     other kind still goes to the original drawing.
   - Sounds play on this chapter's own AudioContext (created on first use, after the
     title card click) and respect CL.Sound.muted; unknown names go to CL.Sound.play. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const X = CL.gfx;
  const TX = CL.Tex;
  const { rect, rrect, circle, poly, arcPath, deg } = X;
  const PI = Math.PI;

  // ------------------------------------------------------------ bubble pictograms

  function drawBell(c, s, x, y, k, web) {
    c.save();
    c.translate(x * s, y * s);
    c.scale(k, k);
    c.beginPath();
    c.moveTo(-0.2 * s, 0.16 * s);
    c.bezierCurveTo(-0.2 * s, -0.02 * s, -0.14 * s, -0.2 * s, 0, -0.2 * s);
    c.bezierCurveTo(0.14 * s, -0.2 * s, 0.2 * s, -0.02 * s, 0.2 * s, 0.16 * s);
    c.lineTo(0.26 * s, 0.22 * s);
    c.lineTo(-0.26 * s, 0.22 * s);
    c.closePath();
    c.fillStyle = P.BRASS;
    c.fill();
    c.stroke();
    c.beginPath(); c.arc(0, 0.27 * s, 0.05 * s, 0, 7); c.fillStyle = P.INK; c.fill();
    c.beginPath(); c.moveTo(0, -0.2 * s); c.lineTo(0, -0.3 * s); c.stroke();
    c.restore();
    if (web) {
      c.save();
      c.lineWidth = s * 0.025;
      c.strokeStyle = P.INK_SOFT;
      const cx = 0.86 * s, cy = 0.14 * s;
      for (let i = 0; i < 4; i++) { const a = PI / 2 + i * PI / 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 0.42 * s, cy + Math.sin(a) * 0.42 * s); c.stroke(); }
      [0.14, 0.26, 0.38].forEach(r => { c.beginPath(); for (let i = 0; i < 4; i++) { const a = PI / 2 + i * PI / 6; const px = cx + Math.cos(a) * r * s, py = cy + Math.sin(a) * r * s; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); });
      c.restore();
    }
  }

  function drawValve(c, s, x, y, r) {
    c.save();
    c.strokeStyle = P.WHEEL_RED;
    c.beginPath(); c.arc(x * s, y * s, r * s, 0, 7); c.stroke();
    for (let i = 0; i < 3; i++) {
      const a = i * PI / 3;
      c.beginPath(); c.moveTo((x - Math.cos(a) * r) * s, (y - Math.sin(a) * r) * s); c.lineTo((x + Math.cos(a) * r) * s, (y + Math.sin(a) * r) * s); c.stroke();
    }
    c.restore();
  }

  const ICONS = {
    bell(c, s) { drawBell(c, s, 0.5, 0.52, 1.2); },
    web(c, s) { drawBell(c, s, 0.42, 0.56, 1.0, true); },
    valve(c, s) { drawValve(c, s, 0.5, 0.5, 0.28); },
    shake(c, s) {
      drawValve(c, s, 0.5, 0.5, 0.22);
      [-1, 1].forEach(k => { c.beginPath(); c.arc(0.5 * s, 0.5 * s, 0.36 * s, PI / 2 + k * PI / 2 - 0.5, PI / 2 + k * PI / 2 + 0.5); c.stroke(); });
    },
    pellet(c, s) {
      c.fillStyle = P.GLOW;
      c.beginPath(); c.arc(0.5 * s, 0.52 * s, 0.22 * s, 0, 7); c.fill(); c.stroke();
      c.fillStyle = P.GLOW_CORE;
      c.beginPath(); c.arc(0.44 * s, 0.45 * s, 0.07 * s, 0, 7); c.fill();
      c.lineWidth = s * 0.04;
      for (let i = 0; i < 6; i++) { const a = i * PI / 3; c.beginPath(); c.moveTo(0.5 * s + Math.cos(a) * 0.3 * s, 0.52 * s + Math.sin(a) * 0.3 * s); c.lineTo(0.5 * s + Math.cos(a) * 0.38 * s, 0.52 * s + Math.sin(a) * 0.38 * s); c.stroke(); }
    },
    chart(c, s) {
      c.beginPath(); c.moveTo(0.2 * s, 0.18 * s); c.lineTo(0.2 * s, 0.8 * s); c.lineTo(0.84 * s, 0.8 * s); c.stroke();
      c.strokeStyle = P.CODE_GREEN;
      c.beginPath(); c.moveTo(0.26 * s, 0.7 * s); c.lineTo(0.4 * s, 0.62 * s); c.lineTo(0.5 * s, 0.66 * s); c.lineTo(0.62 * s, 0.4 * s); c.lineTo(0.8 * s, 0.24 * s); c.stroke();
    },
    plug(c, s) {
      c.fillStyle = P.SAFETY;
      c.fillRect(0.34 * s, 0.38 * s, 0.32 * s, 0.26 * s); c.strokeRect(0.34 * s, 0.38 * s, 0.32 * s, 0.26 * s);
      c.beginPath(); c.moveTo(0.43 * s, 0.38 * s); c.lineTo(0.43 * s, 0.2 * s); c.moveTo(0.57 * s, 0.38 * s); c.lineTo(0.57 * s, 0.2 * s); c.stroke();
      c.beginPath(); c.moveTo(0.5 * s, 0.64 * s); c.bezierCurveTo(0.5 * s, 0.85 * s, 0.25 * s, 0.75 * s, 0.2 * s, 0.88 * s); c.stroke();
    },
    clip(c, s) {
      c.fillStyle = P.SAFETY;
      c.beginPath(); c.arc(0.5 * s, 0.5 * s, 0.24 * s, PI * 0.25, PI * 1.75); c.lineWidth = s * 0.14; c.strokeStyle = P.INK; c.stroke();
      c.lineWidth = s * 0.08; c.strokeStyle = P.SAFETY; c.stroke();
      c.lineWidth = s * 0.05; c.strokeStyle = P.INK;
      c.beginPath(); c.moveTo(0.74 * s, 0.5 * s); c.lineTo(0.9 * s, 0.5 * s); c.stroke();
      c.fillStyle = P.CODE_GREEN; c.beginPath(); c.arc(0.5 * s, 0.26 * s, 0.05 * s, 0, 7); c.fill();
    },
    x(c, s) { c.strokeStyle = P.ALARM; c.lineWidth = s * 0.1; c.beginPath(); c.moveTo(0.28 * s, 0.28 * s); c.lineTo(0.72 * s, 0.72 * s); c.moveTo(0.72 * s, 0.28 * s); c.lineTo(0.28 * s, 0.72 * s); c.stroke(); },
    sign(c, s) {
      c.fillStyle = P.SAFETY;
      c.fillRect(0.3 * s, 0.14 * s, 0.4 * s, 0.72 * s); c.strokeRect(0.3 * s, 0.14 * s, 0.4 * s, 0.72 * s);
      c.beginPath(); c.moveTo(0.5 * s, 0.22 * s); c.lineTo(0.38 * s, 0.42 * s); c.lineTo(0.62 * s, 0.42 * s); c.closePath(); c.stroke();
      c.lineWidth = s * 0.03;
      [0.52, 0.6, 0.68, 0.76].forEach(y => { c.beginPath(); c.moveTo(0.37 * s, y * s); c.lineTo(0.63 * s, y * s); c.stroke(); });
    },
    ladder(c, s) {
      c.beginPath(); c.moveTo(0.3 * s, 0.86 * s); c.lineTo(0.5 * s, 0.14 * s); c.lineTo(0.7 * s, 0.86 * s); c.stroke();
      [0.4, 0.58, 0.76].forEach(y => { const w = (y - 0.14) * 0.28; c.beginPath(); c.moveTo((0.5 - w) * s, y * s); c.lineTo((0.5 + w) * s, y * s); c.stroke(); });
    },
    crack(c, s) {
      c.beginPath(); c.arc(0.5 * s, 0.5 * s, 0.32 * s, 0, 7); c.stroke();
      c.lineWidth = s * 0.04;
      [[0.5, 0.5, 0.36, 0.3], [0.5, 0.5, 0.66, 0.36], [0.5, 0.5, 0.58, 0.72], [0.5, 0.5, 0.34, 0.62]].forEach(([a, b, x, y]) => { c.beginPath(); c.moveTo(a * s, b * s); c.lineTo(x * s, y * s); c.stroke(); });
    },
    glass(c, s) {
      c.fillStyle = P.GLASS;
      c.beginPath(); c.arc(0.5 * s, 0.5 * s, 0.3 * s, 0, 7); c.fill();
      c.lineWidth = s * 0.1; c.strokeStyle = P.NAVY; c.stroke();
      c.lineWidth = s * 0.04; c.strokeStyle = '#FFFFFF';
      c.beginPath(); c.moveTo(0.38 * s, 0.4 * s); c.lineTo(0.48 * s, 0.32 * s); c.stroke();
    },
  };

  const baseIcon = TX.icon;
  if (!baseIcon.ch3) {
    const icon = function (kind, size) {
      if (!ICONS[kind]) return baseIcon(kind, size);
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const c = cv.getContext('2d');
      c.lineWidth = size * 0.07;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = P.INK;
      c.fillStyle = P.INK;
      ICONS[kind](c, size);
      return cv;
    };
    icon.ch3 = true;
    TX.icon = icon;
  }

  // ------------------------------------------------------------ painted textures

  const cache = {};
  const memo = (k, fn) => cache[k] || (cache[k] = fn());
  const hex = (c, k) => '#' + new T.Color(c).multiplyScalar(k).getHexString();

  // a pictogram on a texture, in world units (centre x, y, size r)
  function picto(g, kind, x, y, r) {
    if (kind === 'bell') {
      const p = new Path2D();
      p.moveTo(x - 0.7 * r, y - 0.5 * r);
      p.bezierCurveTo(x - 0.7 * r, y + 0.2 * r, x - 0.5 * r, y + 0.75 * r, x, y + 0.75 * r);
      p.bezierCurveTo(x + 0.5 * r, y + 0.75 * r, x + 0.7 * r, y + 0.2 * r, x + 0.7 * r, y - 0.5 * r);
      p.lineTo(x + 0.9 * r, y - 0.7 * r);
      p.lineTo(x - 0.9 * r, y - 0.7 * r);
      p.closePath();
      g.fs(p, P.BRASS, 1.0);
      g.fs(circle(x, y - 0.88 * r, 0.16 * r), P.INK, 0.6);
    } else if (kind === 'valve') {
      g.stroke(circle(x, y, 0.8 * r), 2.2, P.WHEEL_RED);
      for (let i = 0; i < 3; i++) { const a = i * PI / 3; g.line(x - Math.cos(a) * 0.8 * r, y - Math.sin(a) * 0.8 * r, x + Math.cos(a) * 0.8 * r, y + Math.sin(a) * 0.8 * r, 1.6, P.WHEEL_RED); }
      g.fs(circle(x, y, 0.18 * r), P.WHEEL_RED_DARK, 0.6);
    } else if (kind === 'glass') {
      g.fs(circle(x, y, 0.85 * r), P.NAVY, 1.0);
      g.fs(circle(x, y, 0.6 * r), P.GLASS, 0.6);
      g.line(x - 0.25 * r, y + 0.1 * r, x - 0.05 * r, y + 0.3 * r, 1.0, '#FFFFFF');
    } else if (kind === 'pellet') {
      g.fs(circle(x, y, 0.7 * r), P.GLOW, 1.0);
      g.fill(circle(x - 0.2 * r, y + 0.2 * r, 0.22 * r), P.GLOW_CORE);
    }
  }

  // the console front: header, test labels over the cord sockets, jack numbers, DATA, RESET
  // layout in console-local x (centre 0), y from the floor; the texture covers x -1.3..1.3, y 0.2..1.95
  const CON = { W: 2.6, Y0: 0.2, Y1: 1.95, slots: [-0.8, -0.15, 0.5], slotY: 1.44, jackY: 1.0, dataX: 1.04, dataY: 0.98, resetX: 1.04, resetY: 1.38 };
  const TESTS = [
    { id: 'bell', label: 'BELL', cord: P.SAFETY },
    { id: 'valve', label: 'VALVE', cord: P.NAVY_LIGHT },
    { id: 'glass', label: 'GLASS', cord: P.WHEEL_RED },
  ];

  function consoleFront() {
    return memo('front', () => TX.tex(TX.paint(CON.W, CON.Y1 - CON.Y0, 300, g => {
      const W = CON.W, H = CON.Y1 - CON.Y0;
      const Y = y => y - CON.Y0, Xc = x => x + W / 2;
      g.fill(rect(0, 0, W, H), P.NAVY);
      g.hatch(rect(0, 0, W, H), P.INK, 0.12, 'vert', 0.8);
      g.stroke(rect(0.04, 0.04, W - 0.04, H - 0.04), 0.8, P.NAVY_LIGHT);
      // header plate
      g.fs(rrect(Xc(-1.2), Y(1.76), Xc(0.8), Y(1.91), 0.03), P.PAPER, 0.8);
      g.text('REWARD  ·  RL RUN #3', Xc(-0.2), Y(1.79), 0.085, P.INK, 'slab');
      // test labels (pictogram + word) above each cord socket
      TESTS.forEach((t, i) => {
        const x = Xc(CON.slots[i]);
        g.fs(rrect(x - 0.28, Y(1.54), x + 0.28, Y(1.71), 0.025), P.PAPER, 0.7);
        picto(g, t.id, x - 0.17, Y(1.625), 0.065);
        g.text(t.label, x + 0.07, Y(1.594), 0.07, P.INK, 'slab');
      });
      g.text('TESTS', Xc(-1.12), Y(1.415), 0.055, P.NAVY_LIGHT, 'slab', 'left');
      g.line(Xc(-1.2), Y(1.22), Xc(0.8), Y(1.22), 0.6, P.NAVY_LIGHT);
      // sensor jacks: the number sits beside each jack, so a Clawd in front never hides it
      [0, 1, 2].forEach(i => {
        const x = Xc(CON.slots[i]) - 0.21;
        g.fs(circle(x, Y(CON.jackY), 0.075), P.PAPER, 0.7);
        g.text(String(i + 1), x, Y(CON.jackY) - 0.035, 0.1, P.INK, 'slab');
      });
      g.text('SENSORS', Xc(-0.15), Y(0.76), 0.06, P.NAVY_LIGHT, 'slab');
      // data port + reset
      g.fs(rrect(Xc(CON.dataX - 0.18), Y(0.74), Xc(CON.dataX + 0.18), Y(0.85), 0.02), P.PAPER, 0.6);
      g.text('DATA', Xc(CON.dataX), Y(0.765), 0.065, P.INK, 'slab');
      g.fs(rrect(Xc(CON.resetX - 0.18), Y(1.68), Xc(CON.resetX + 0.18), Y(1.79), 0.02), P.PAPER, 0.6);
      g.text('RESET', Xc(CON.resetX), Y(1.705), 0.065, P.INK, 'slab');
      g.fs(rect(Xc(CON.resetX - 0.035), Y(1.16), Xc(CON.resetX + 0.035), Y(1.62)), P.NAVY_DARK, 0.6);
      g.line(Xc(CON.resetX + 0.07), Y(1.6), Xc(CON.resetX + 0.07), Y(1.2), 0.8, P.SAFETY);
      g.line(Xc(CON.resetX + 0.04), Y(1.25), Xc(CON.resetX + 0.07), Y(1.2), 0.8, P.SAFETY);
      g.line(Xc(CON.resetX + 0.1), Y(1.25), Xc(CON.resetX + 0.07), Y(1.2), 0.8, P.SAFETY);
      [[0.08, 0.08], [W - 0.08, 0.08], [0.08, H - 0.08], [W - 0.08, H - 0.08]].forEach(([x, y]) => g.fs(circle(x, y, 0.025), P.NAVY_LIGHT, 0.5));
    }, { line: 2 })));
  }

  // the back: jack numbers seen from behind, so they read correctly (the console faces +z;
  // this decal faces -z, so console-local x runs right-to-left on it)
  function consoleBack() {
    return memo('back', () => TX.tex(TX.paint(CON.W, CON.Y1 - CON.Y0, 300, g => {
      const W = CON.W, H = CON.Y1 - CON.Y0;
      const Y = y => y - CON.Y0, Xb = x => W / 2 - x;
      g.fill(rect(0, 0, W, H), P.NAVY_DARK);
      g.hatch(rect(0, 0, W, H), P.INK, 0.15, 'diag', 0.8);
      g.stroke(rect(0.04, 0.04, W - 0.04, H - 0.04), 0.8, P.NAVY);
      [0, 1, 2].forEach(i => {
        const x = Xb(CON.slots[i]);
        g.fs(circle(x, Y(CON.jackY + 0.24), 0.085), P.PAPER, 0.7);
        g.text(String(i + 1), x, Y(CON.jackY + 0.24) - 0.035, 0.11, P.INK, 'slab');
      });
      [[0.08, 0.08], [W - 0.08, 0.08], [0.08, H - 0.08], [W - 0.08, H - 0.08]].forEach(([x, y]) => g.fs(circle(x, y, 0.025), P.NAVY, 0.5));
    }, { line: 2 })));
  }

  // a paper tag hanging on a sensor cable
  function tag(kind) {
    const label = { bell: 'BELL', valve: 'VALVE', glass: 'GLASS' }[kind];
    return memo('tag|' + kind, () => TX.tex(TX.paint(0.3, 0.36, 400, g => {
      g.fs(poly([[0.02, 0.02], [0.28, 0.02], [0.28, 0.3], [0.15, 0.35], [0.02, 0.3]]), P.WALL, 1.0);
      g.fs(circle(0.15, 0.3, 0.02), P.NAVY_DARK, 0.4);
      picto(g, kind, 0.15, 0.17, 0.075);
      g.text(label, 0.15, 0.045, 0.055, P.INK, 'slab');
    }, { line: 2 })));
  }

  // one digit flap of the score board
  function digitCanvas() {
    const cv = document.createElement('canvas');
    cv.width = 96; cv.height = 136;
    return cv;
  }
  function drawDigit(cv, d, flick) {
    const c = cv.getContext('2d');
    c.fillStyle = P.NAVY_DARK;
    c.fillRect(0, 0, 96, 136);
    c.fillStyle = P.PAPER;
    c.beginPath();
    c.roundRect ? c.roundRect(6, 6, 84, 124, 10) : c.rect(6, 6, 84, 124);
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = P.INK;
    c.stroke();
    c.fillStyle = P.INK;
    c.font = '700 104px "Zilla Slab", Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(d), 48, 74 + (flick || 0) * 30);
    c.strokeStyle = X.css(P.INK, 0.55);
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(8, 68); c.lineTo(88, 68); c.stroke();
  }

  // lamp faces: on (green tick), fail (red cross), off (dark)
  function lampFace(state) {
    return memo('lamp|' + state, () => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const c = cv.getContext('2d');
      const col = state === 'on' ? P.CODE_GREEN : state === 'fail' ? P.ALARM : P.NAVY_DARK;
      c.fillStyle = col;
      c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fill();
      c.lineWidth = 8; c.strokeStyle = P.INK; c.stroke();
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.lineWidth = 16;
      c.strokeStyle = state === 'off' ? P.NAVY_LIGHT : '#FFFFFF';
      c.beginPath();
      if (state === 'fail') { c.moveTo(40, 40); c.lineTo(88, 88); c.moveTo(88, 40); c.lineTo(40, 88); }
      else { c.moveTo(36, 66); c.lineTo(56, 86); c.lineTo(92, 42); }
      c.stroke();
      if (state !== 'off') { c.fillStyle = X.css('#FFFFFF', 0.45); c.beginPath(); c.arc(44, 40, 12, 0, 7); c.fill(); }
      return TX.tex(cv);
    });
  }

  function boardFace() {
    return memo('board', () => TX.tex(TX.paint(3.4, 1.6, 240, g => {
      g.fill(rect(0, 0, 3.4, 1.6), P.NAVY);
      g.hatch(rect(0, 0, 3.4, 1.6), P.INK, 0.12, 'vert', 0.8);
      g.stroke(rect(0.05, 0.05, 3.35, 1.55), 1.0, P.NAVY_LIGHT);
      g.text('REWARD', 1.7, 1.37, 0.15, P.PAPER, 'slab');
      for (let i = 0; i < 14; i++) g.fs(circle(0.15 + i * 0.22, 1.5, 0.025), P.NAVY_LIGHT, 0.4);
      ['bell', 'valve', 'glass'].forEach((k, i) => picto(g, k, 0.95 + i * 1.0 - 0.42, 0.3, 0.13));
    }, { line: 2.2 })));
  }

  const tick = (g, x, y) => g.stroke(poly([[x - 0.06, y], [x - 0.01, y - 0.06], [x + 0.08, y + 0.08]], false), 2.2, P.CODE_GREEN);

  function whiteboard() {
    return memo('wb', () => TX.tex(TX.paint(2.4, 1.5, 260, g => {
      g.fs(rect(0, 0, 2.4, 1.5), P.SHIRT, 1.6);
      g.stroke(rect(0.05, 0.05, 2.35, 1.45), 0.5, P.FLOOR_LINE);
      g.text('RL run #3', 0.2, 1.23, 0.17, P.LANYARD, 'hand', 'left');
      // the reward rule as the researchers drew it
      const row = 0.82;
      picto(g, 'bell', 0.32, row, 0.1);
      tick(g, 0.5, row);
      g.text('+', 0.66, row - 0.05, 0.16, P.INK, 'hand');
      picto(g, 'valve', 0.86, row, 0.1);
      tick(g, 1.04, row);
      g.text('+', 1.2, row - 0.05, 0.16, P.INK, 'hand');
      picto(g, 'glass', 1.4, row, 0.1);
      tick(g, 1.58, row);
      g.line(1.74, row, 1.94, row, 1.4, P.INK);
      g.line(1.88, row + 0.05, 1.94, row, 1.4, P.INK);
      g.line(1.88, row - 0.05, 1.94, row, 1.4, P.INK);
      picto(g, 'pellet', 2.1, row, 0.09);
      g.text('+1', 2.1, row - 0.25, 0.12, P.INK, 'hand');
      g.text('glass = no hits', 1.4, 0.4, 0.1, P.INK_SOFT, 'hand');
      g.line(1.4, 0.52, 1.4, 0.65, 0.8, P.INK_SOFT);
      g.text('(new sensors!)', 0.25, 0.18, 0.1, P.TIE_RED, 'hand', 'left');
    }, { line: 2 })));
  }

  function monitorScreen() {
    return memo('mon', () => TX.tex(TX.paint(0.9, 0.62, 280, g => {
      g.fill(rect(0, 0, 0.9, 0.62), P.NAVY_DARK);
      g.line(0.08, 0.08, 0.08, 0.54, 0.6, P.NAVY_LIGHT);
      g.line(0.08, 0.08, 0.84, 0.08, 0.6, P.NAVY_LIGHT);
      const pts = [];
      for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([0.1 + u * 0.72, 0.1 + 0.4 * Math.min(1, Math.pow(u, 3) * 2.2)]); }
      g.stroke(poly(pts, false), 1.4, P.CODE_GREEN);
      g.text('REWARD', 0.12, 0.47, 0.05, P.CODE_GREEN, 'mono', 'left');
      g.text('9999', 0.8, 0.53, 0.06, P.SAFETY, 'mono', 'right');
    }, { line: 2 })));
  }

  function cobweb(w, h, seed) {
    return memo('web|' + seed, () => {
      const cv = document.createElement('canvas');
      cv.width = Math.round(w * 200); cv.height = Math.round(h * 200);
      const c = cv.getContext('2d');
      const r = X.rng(seed);
      c.strokeStyle = X.css(P.FROST, 0.85);
      c.lineWidth = 1.6;
      const cx = cv.width * 0.5, cy = cv.height * 0.5;
      const n = 7, rays = [];
      for (let i = 0; i < n; i++) { const a = i / n * PI * 2 + r() * 0.4; rays.push(a); c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * cv.width, cy + Math.sin(a) * cv.height); c.stroke(); }
      c.lineWidth = 1.1;
      for (let k = 1; k < 5; k++) {
        c.beginPath();
        rays.forEach((a, i) => { const rr = k * 0.12 * (0.9 + 0.2 * r()); const px = cx + Math.cos(a) * rr * cv.width, py = cy + Math.sin(a) * rr * cv.height; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
        c.closePath();
        c.stroke();
      }
      return TX.tex(cv);
    });
  }

  // ------------------------------------------------------------ sounds

  let ctx = null, out = null;
  function audio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    // only after someone has clicked (the title card), so stills and tests stay silent
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      out = ctx.createGain();
      out.gain.value = 0.5;
      out.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(freq, type, a, peak, d, f2, at) {
    const t = ctx.currentTime + (at || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    env(g, t, a, peak, d);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + a + d + 0.05);
  }
  function noise(type, freq, q, a, peak, d, f2, at) {
    const t = ctx.currentTime + (at || 0);
    const len = a + d + 0.1;
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const dd = b.getChannelData(0);
    for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource();
    s.buffer = b;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    f.Q.value = q;
    const g = ctx.createGain();
    env(g, t, a, peak, d);
    s.connect(f).connect(g).connect(out);
    s.start(t);
  }
  const FX = {
    // a small brass bell: inharmonic partials, long ring
    ding: () => { [[1, 0.22, 2.2], [2.76, 0.09, 1.4], [5.4, 0.05, 0.7], [8.9, 0.025, 0.4]].forEach(([k, p, d]) => tone(1046 * k, 'sine', 0.003, p, d)); },
    whistle: () => { tone(1480, 'sine', 0.08, 0.1, 0.9, 1440); tone(1867, 'sine', 0.08, 0.06, 0.9, 1820); noise('bandpass', 2600, 2, 0.05, 0.12, 1.0); },
    rattle: () => { for (let i = 0; i < 9; i++) { noise('bandpass', 1800 + (i % 2) * 600, 4, 0.002, 0.14, 0.04, null, i * 0.07); tone(320, 'square', 0.002, 0.02, 0.03, null, i * 0.07); } },
    flip: () => { noise('highpass', 3000, 0.7, 0.001, 0.2, 0.03); noise('bandpass', 1200, 3, 0.001, 0.12, 0.05, null, 0.04); },
    pellet: () => { tone(2600, 'triangle', 0.001, 0.08, 0.05); tone(2100, 'triangle', 0.001, 0.05, 0.05, null, 0.09); tone(1800, 'triangle', 0.001, 0.03, 0.04, null, 0.16); },
    buzz: () => { tone(120, 'square', 0.005, 0.03, 0.18); noise('highpass', 4000, 0.5, 0.002, 0.05, 0.08); },
    screw: () => { for (let i = 0; i < 6; i++) noise('bandpass', 3200, 6, 0.001, 0.12, 0.025, null, i * 0.06); },
    plug: () => { noise('bandpass', 2400, 3, 0.001, 0.25, 0.04); tone(180, 'square', 0.002, 0.05, 0.06, 90, 0.02); },
    ram: () => { tone(55, 'sine', 0.004, 0.9, 0.9, 28); noise('lowpass', 500, 0.7, 0.003, 0.7, 0.4); noise('bandpass', 3000, 6, 0.002, 0.12, 0.5); },
    knock: () => { tone(140, 'sine', 0.002, 0.25, 0.18, 90); noise('lowpass', 900, 0.8, 0.002, 0.15, 0.08); },
    siren: () => { tone(740, 'sawtooth', 0.02, 0.05, 0.45, 520); tone(744, 'square', 0.02, 0.03, 0.45, 522); },
  };
  function play(name) {
    if (CL.Sound.muted) return;
    if (!FX[name]) { CL.Sound.play(name); return; }
    if (!audio()) return;
    try { FX[name](); } catch (e) { /* ignore */ }
  }

  CL.Ch3Art = { ICONS, CON, TESTS, picto, consoleFront, consoleBack, tag, digitCanvas, drawDigit, lampFace, boardFace, whiteboard, monitorScreen, cobweb, hex, play };
})(window.CL = window.CL || {});
