/* Chapter 5 art: everything this chapter draws for itself.

   - textures painted with the 2-D renderer (CL.Tex.paint): the lab blueprint, the
     tap-code chart, tomorrow's TO-DO page, the fog on the inside of the porthole
     (Fable writes in it), the small crack
   - Sonnet's laptop readouts (a DOM panel, like the bubbles and the badge)
   - extra bubble pictograms, registered by wrapping CL.Tex.icon (kinds start "ch5-")
   - small models: drafting table, desk lamp, data port, rising-stem vent valve,
     hatch, roof cowl, and a gauge whose needle reads the right way round

   Colours come from CL.P only. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const TX = CL.Tex;
  const X = CL.gfx;
  const { rect, rrect, circle, ellipse, poly, arcPath } = X;
  const { ink } = CL.Ink;
  const PI = Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const TAP = ['ABCDE', 'FGHIJ', 'LMNOP', 'QRSTU', 'VWXYZ'];
  // letter -> [row, col] (1-based); K shares C's cell
  function tapOf(ch) {
    ch = ch === 'K' ? 'C' : ch;
    for (let r = 0; r < 5; r++) { const c = TAP[r].indexOf(ch); if (c >= 0) return [r + 1, c + 1]; }
    return null;
  }

  // ------------------------------------------------------------ the blueprint
  // Plan of the room (as it should be), the left-wall pipework in elevation, the
  // reactor front in elevation, and a title block. It shows what the lab is meant
  // to be: no copper line, the A branch running to Sonnet's pod, an expansion loop
  // on the B branch, the roof vent normally closed, all sixteen porthole bolts.
  const BP = { W: 3.2, H: 2.1 };
  const PODS = { opus: [1.5, 1.15, 1.0, 'OPUS'], sonnet: [3.85, 0.95, 0.78, 'SONNET'], haiku: [5.85, 0.75, 0.56, 'HAIKU'] };

  function blueprint() {
    const NAVY = P.NAVY, FAINT = P.GLASS_DEEP;
    return TX.tex(TX.paint(BP.W, BP.H, 620, g => {
      // paper, grid, border
      g.fill(rect(0, 0, BP.W, BP.H), P.PAPER);
      for (let x = 0.05; x < BP.W; x += 0.1) g.line(x, 0, x, BP.H, 0.25, FAINT, 0.35);
      for (let y = 0.05; y < BP.H; y += 0.1) g.line(0, y, BP.W, y, 0.25, FAINT, 0.35);
      g.stroke(rect(0.04, 0.04, BP.W - 0.04, BP.H - 0.04), 1.6, NAVY);
      g.stroke(rect(0.07, 0.07, BP.W - 0.07, BP.H - 0.07), 0.6, NAVY);

      // ---- plan (x along the back wall, z towards the front: down the sheet)
      const s = 0.092, ox = 0.17, oy = 1.95;
      const px = x => ox + x * s, py = z => oy - z * s;
      const R = (x0, z0, x1, z1) => rect(px(x0), py(z0), px(x1), py(z1));
      g.text('PLAN', px(0), oy + 0.05, 0.05, NAVY, 'slab', 'left');
      g.fill(R(0, 0, 16, 10), P.PAPER);
      g.stroke(R(0, 0, 16, 10), 2.4, NAVY);
      // exit (right wall)
      g.line(px(16), py(5.8), px(16), py(7.4), 3.2, P.PAPER);
      g.stroke(arcPath(px(16), py(5.8), 1.6 * s, 90, 90), 0.7, NAVY);
      g.line(px(16), py(5.8), px(14.4), py(5.8), 0.7, NAVY);
      g.text('EXIT', px(15.1), py(6.9), 0.03, NAVY, 'slab');
      // column, reactor, plinth, ladder
      g.fs(R(6.73, 0, 7.37, 0.5), NAVY, 0.6);
      g.fs(R(7.9, 0, 14.5, 3.4), P.REACTOR, 1.0, 1, NAVY);
      g.hatch(R(7.9, 0, 14.5, 3.4), NAVY, 0.25, 'diag', 0.35);
      g.text('FABLE', px(11.2), py(1.9), 0.06, NAVY, 'slab');
      g.line(px(9.2), py(3.4), px(13.2), py(3.4), 3.0, NAVY);
      g.text('PORTHOLE', px(11.2), py(3.2), 0.026, NAVY, 'slab');
      g.fs(R(7.05, 3.85, 15.35, 4.4), P.SAFETY, 0.6);
      for (let x = 7.3; x < 15.3; x += 0.5) g.line(px(x), py(4.4), px(x + 0.3), py(3.85), 0.5, NAVY, 0.7);
      for (let z = 2.4; z < 2.85; z += 0.1) g.line(px(14.55), py(z), px(14.85), py(z), 0.4, NAVY);
      // the alley beside the reactor: a low pipe across it, the hatch at the back
      g.line(px(14.5), py(2.0), px(16), py(2.0), 1.0, NAVY);
      g.fs(R(14.5, 0.65, 14.62, 1.15), NAVY, 0.4);
      g.text('HATCH', px(15.25), py(0.95), 0.022, NAVY, 'slab');
      // pods
      Object.values(PODS).forEach(([x, z, k, name]) => {
        g.fs(circle(px(x), py(z), 0.98 * k * s), P.POD, 0.9, 1, NAVY);
        g.stroke(circle(px(x), py(z), 0.82 * k * s), 0.5, NAVY);
        g.line(px(x - 0.5 * k), py(z + 0.98 * k), px(x + 0.5 * k), py(z + 0.98 * k), 1.2, NAVY);
        g.text(name, px(x), py(z + 1.35 * k + 0.2), 0.026, NAVY, 'slab');
      });
      // locker, crate spot, clutter
      g.fs(R(0, 5.45, 0.6, 6.55), P.NAVY_LIGHT, 0.6, 0.35, NAVY);
      g.text('LOCKER', px(1.0), py(6.05), 0.024, NAVY, 'slab', 'left');
      const cs = new Path2D(); cs.rect(px(1.85), py(8.45), 0.9 * s, 0.9 * s);
      g.c.save(); g.c.setLineDash([0.012, 0.01]); g.stroke(cs, 0.8, NAVY); g.c.restore();
      g.text('LN₂', px(2.3), py(8.1), 0.026, NAVY, 'slab');
      g.stroke(R(14.45, 7.5, 15.35, 9.35), 0.6, NAVY);
      g.stroke(circle(px(13.4), py(9.1), 0.38 * s), 0.6, NAVY);
      // steam: feed along the back wall, down the corner, header along the left wall
      g.line(px(7.9), py(0.3), px(0.3), py(0.3), 1.4, P.REACTOR_DEEP);
      g.line(px(0.3), py(0.3), px(0.3), py(4.6), 1.4, P.REACTOR_DEEP);
      // branches up the left wall and along the back wall to their pods
      [[0.9, 0.9, 3.85], [0.65, 0.7, 1.5], [0.4, 0.55, 5.85]].forEach(([dx, dz, podx]) => {
        g.line(px(dx), py(dz), px(dx), py(3.0), 0.6, NAVY);
        g.line(px(dx), py(dz), px(podx), py(dz), 0.6, NAVY);
      });
      // valves: main (gate), three branch valves, the vent riser
      g.fs(R(0.15, 1.95, 0.45, 2.25), P.PAPER, 0.8, 1, NAVY);
      [3.15, 3.75, 4.35].forEach(z => {
        g.stroke(poly([[px(0.5), py(z - 0.12)], [px(0.8), py(z + 0.12)], [px(0.8), py(z - 0.12)], [px(0.5), py(z + 0.12)]]), 0.7, NAVY);
      });
      g.line(px(0.3), py(4.6), px(0.3), py(5.3), 0.9, NAVY);
      g.fs(circle(px(0.3), py(5.3), 0.009), NAVY, 0.6);
      g.text('VENT', px(0.9), py(5.0), 0.024, NAVY, 'slab', 'left');

      // ---- left wall, elevation (seen from inside: the back corner on the right)
      const es = 0.19, ex1 = 1.62, ey0 = 0.13;
      const ex = z => ex1 - z * es, ey = y => ey0 + y * es;
      g.text('LEFT WALL', ex(7.0), ey(4.3), 0.05, NAVY, 'slab', 'left');
      g.stroke(rect(ex(7.0), ey(0), ex(0), ey(4.2)), 0.6, NAVY);
      g.line(ex(7.0), ey(0), ex(0), ey(0), 1.4, NAVY);
      // locker (dashed)
      const lk = new Path2D(); lk.rect(ex(6.55), ey(0), 1.1 * es, 2.2 * es);
      g.c.save(); g.c.setLineDash([0.012, 0.01]); g.stroke(lk, 0.6, NAVY); g.c.restore();
      // header + main gate valve (handwheel on top)
      g.line(ex(0.3), ey(0.45), ex(4.6), ey(0.45), 2.2, P.REACTOR_DEEP);
      g.line(ex(0.3), ey(0.45), ex(0.3), ey(4.2), 2.2, P.REACTOR_DEEP);
      g.fs(rect(ex(2.3), ey(0.3), ex(1.9), ey(0.6)), P.PAPER, 0.8, 1, NAVY);
      g.line(ex(2.1), ey(0.6), ex(2.1), ey(1.0), 0.7, NAVY);
      g.stroke(ellipse(ex(2.1), ey(1.0), 0.22 * es, 0.06 * es), 0.8, P.WHEEL_RED);
      // the branches; depth order A (front), B, C (back): the farther pipe breaks at a crossing
      const A = [[3.15, 0.45], [3.15, 2.3], [2.0, 2.3], [2.0, 3.3], [0, 3.3]];
      const B = [[3.75, 0.45], [3.75, 2.05], [2.6, 2.05], [2.6, 2.55], [3.15, 2.55], [3.15, 3.25], [2.6, 3.25], [2.6, 3.9], [0, 3.9]];
      const C = [[4.35, 0.45], [4.35, 2.7], [1.7, 2.7], [1.7, 3.6], [0, 3.6]];
      const segs = pts => pts.slice(1).map((p, i) => [pts[i], p]);
      const cross = (s1, s2) => {
        const [[ax, ay], [bx, by]] = s1, [[cx2, cy2], [dx, dy]] = s2;
        const d = (bx - ax) * (dy - cy2) - (by - ay) * (dx - cx2);
        if (Math.abs(d) < 1e-9) return null;
        const t = ((cx2 - ax) * (dy - cy2) - (cy2 - ay) * (dx - cx2)) / d;
        const u = ((cx2 - ax) * (by - ay) - (cy2 - ay) * (bx - ax)) / d;
        return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999 ? [ax + (bx - ax) * t, ay + (by - ay) * t] : null;
      };
      const drawRun = (pts, nearer) => {
        segs(pts).forEach(sg => {
          const hits = [];
          nearer.forEach(o => segs(o).forEach(os => { const h = cross(sg, os); if (h) hits.push(h); }));
          const [[x0, y0], [x1, y1]] = sg;
          const len = Math.hypot(x1 - x0, y1 - y0);
          const ts = hits.map(([hx, hy]) => Math.hypot(hx - x0, hy - y0) / len).sort((a, b) => a - b);
          let t0 = 0;
          const gap = 0.13 / len;
          [...ts, 2].forEach(tc => {
            const t1 = Math.min(1, tc - gap);
            if (t1 > t0) g.line(ex(x0 + (x1 - x0) * t0), ey(y0 + (y1 - y0) * t0), ex(x0 + (x1 - x0) * t1), ey(y0 + (y1 - y0) * t1), 2.4, NAVY);
            t0 = tc + gap;
          });
        });
      };
      drawRun(C, [A, B]);
      drawRun(B, [A]);
      drawRun(A, []);
      // branch valves (bowties) and their gauges
      [3.15, 3.75, 4.35].forEach(z => {
        g.fs(poly([[ex(z - 0.14), ey(0.75)], [ex(z + 0.14), ey(0.75)], [ex(z - 0.14), ey(1.05)], [ex(z + 0.14), ey(1.05)]]), P.PAPER, 0.8, 1, NAVY);
        g.line(ex(z), ey(1.05), ex(z - 0.22), ey(1.5), 0.5, NAVY);
        g.fs(circle(ex(z - 0.22), ey(1.5), 0.11 * es), P.PAPER, 0.6, 1, NAVY);
      });
      // where each branch goes
      [['SONNET', 3.3], ['OPUS', 3.9], ['HAIKU', 3.6]].forEach(([n, y], i) => {
        g.text('→ ' + n, ex(-0.06), ey(y) - 0.014, 0.036, NAVY, 'slab', 'left');
      });
      // the roof vent: normally closed, its own small handwheel
      g.line(ex(4.6), ey(0.45), ex(5.3), ey(0.45), 0.9, NAVY);
      g.line(ex(5.3), ey(0.45), ex(5.3), ey(4.2), 0.9, NAVY);
      g.fs(poly([[ex(5.3) - 0.025, ey(2.5)], [ex(5.3) + 0.025, ey(2.5)], [ex(5.3) - 0.025, ey(2.8)], [ex(5.3) + 0.025, ey(2.8)]]), NAVY, 0.6);
      g.stroke(circle(ex(5.3) - 0.06, ey(2.65), 0.085 * es), 0.7, P.WHEEL_RED);
      g.line(ex(5.3), ey(2.65), ex(5.3) - 0.05, ey(2.65), 0.6, NAVY);
      g.text('NC', ex(5.3) - 0.09, ey(2.4), 0.036, NAVY, 'slab', 'right');
      g.text('ROOF', ex(5.3) + 0.08, ey(4.05), 0.03, NAVY, 'slab', 'left');
      g.fs(poly([[ex(5.3), ey(4.2) + 0.03], [ex(5.3) - 0.02, ey(4.2)], [ex(5.3) + 0.02, ey(4.2)]]), NAVY, 0.4);

      // ---- reactor front, elevation
      const fs2 = 0.074, fx0 = 1.98, fy0 = 1.18;
      const fx = x => fx0 + (x - 7.4) * fs2, fy = y => fy0 + y * fs2;
      g.text('REACTOR · FRONT', fx(7.4), fy(8.2), 0.04, NAVY, 'slab', 'left');
      g.stroke(rect(fx(7.9), fy(0.5), fx(14.5), fy(7.8)), 0.9, NAVY);
      g.stroke(arcPath(fx(11.2), fy(7.8), 3.3 * fs2, 0, 180), 0.9, NAVY);
      g.fs(rect(fx(7.05), fy(0), fx(15.35), fy(0.56)), P.SAFETY, 0.6);
      g.fs(circle(fx(11.2), fy(3.35), 2.55 * fs2), P.NAVY_LIGHT, 0.8, 0.35, NAVY);
      g.fs(circle(fx(11.2), fy(3.35), 2.0 * fs2), P.PAPER, 0.8, 1, NAVY);
      for (let i = 0; i < 16; i++) {
        const a = PI / 2 + i * PI / 8;
        g.fs(circle(fx(11.2 + Math.cos(a) * 2.27), fy(3.35 + Math.sin(a) * 2.27), 0.012), NAVY, 0.4);
      }
      g.text('16 BOLTS', fx(11.2), fy(3.2), 0.03, NAVY, 'slab');
      g.stroke(rect(fx(9.75), fy(6.6), fx(12.65), fy(7.45)), 0.6, NAVY);
      [8.9, 13.5].forEach(x => g.stroke(circle(fx(x), fy(7.0), 0.36 * fs2), 0.6, NAVY));
      g.stroke(rect(fx(13.75), fy(2.1), fx(14.41), fy(3.3)), 0.6, NAVY);

      // ---- title block
      const tb = [2.38, 0.14, 3.06, 0.64];
      g.fs(rect(tb[0], tb[1], tb[2], tb[3]), P.PAPER, 1.0, 1, NAVY);
      g.line(tb[0], 0.47, tb[2], 0.47, 0.6, NAVY);
      g.line(tb[0], 0.33, tb[2], 0.33, 0.6, NAVY);
      g.text('CONTAINMENT LAB', 2.72, 0.53, 0.038, NAVY, 'slab');
      g.text('LAYOUT · REV 7', 2.72, 0.385, 0.032, NAVY, 'slab');
      g.text('DO NOT MODIFY', 2.72, 0.245, 0.034, P.WHEEL_RED, 'slab');
      g.text('WITHOUT REVIEW', 2.72, 0.175, 0.026, P.WHEEL_RED, 'slab');
    }, { line: 2.0 }));
  }

  // ------------------------------------------------------------ tap-code chart (as chapter 2 hung it)
  function tapChart() {
    return TX.tex(TX.paint(1, 1, 640, g => {
      g.fs(rect(0.02, 0.02, 0.98, 0.98), P.PAPER, 1.4);
      g.text('TAP CODE', 0.5, 0.86, 0.085, P.INK, 'slab');
      const c = 0.12, x0 = 0.3, y0 = 0.7;
      for (let r = 0; r < 5; r++) {
        g.text(String(r + 1), x0 - 0.12, y0 - r * c - 0.025, 0.06, P.WHEEL_RED, 'slab');
        g.text(String(r + 1), x0 + r * c, y0 + 0.07, 0.06, P.WHEEL_RED, 'slab');
        for (let q = 0; q < 5; q++) g.text(TAP[r][q], x0 + q * c, y0 - r * c - 0.03, 0.07, P.INK, 'slab');
      }
      g.line(x0 - 0.07, y0 + 0.05, x0 + 4.5 * c, y0 + 0.05, 0.6);
      g.line(x0 - 0.07, y0 + 0.05, x0 - 0.07, y0 - 4.6 * c, 0.6);
      // an example: H is row 2, column 3
      g.text('H =', 0.2, 0.06, 0.055, P.INK_SOFT, 'hand', 'left');
      [0, 1].forEach(i => g.fill(circle(0.36 + i * 0.045, 0.08, 0.014), P.INK));
      [0, 1, 2].forEach(i => g.fill(circle(0.52 + i * 0.045, 0.08, 0.014), P.INK));
      g.text('K = C', 0.8, 0.06, 0.05, P.INK_SOFT, 'hand');
    }, { line: 2.2 }));
  }

  // ------------------------------------------------------------ tomorrow's TO-DO page, written line by line
  // returns { tex, set(n, u) }: n lines fully written, the next one u (0..1) of the way
  const TOMORROW = ['Exit pod', 'Wake Sonnet 5.5', 'Wake Haiku 5.5', 'Check on Fable 5.5'];
  function listPage() {
    const W = 1.5, H = 1.95, ppu = 520;
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * ppu); cv.height = Math.round(H * ppu);
    const t = TX.tex(cv);
    function set(n, u) {
      const c = cv.getContext('2d');
      c.clearRect(0, 0, cv.width, cv.height);
      const g = new X.G(c, cv.width, cv.height, new X.Cam(W / 2, H / 2, H));
      g.zoomk = 2.0 / (ppu * 0.016);
      g.beginWorld();
      const board = rrect(0.02, 0.02, W - 0.02, H - 0.02, 0.07);
      g.fs(board, P.ORANGE_DEEP, 1.6);
      g.fs(rect(0.12, 0.1, W - 0.12, H - 0.24), P.PAPER, 1.0);
      for (let i = 0; i < 10; i++) g.line(0.17, H - 0.62 - i * 0.12, W - 0.17, H - 0.62 - i * 0.12, 0.5, P.GLASS_DEEP, 0.6);
      g.fs(rrect(W / 2 - 0.3, H - 0.3, W / 2 + 0.3, H - 0.05, 0.05), P.POD_SHADE, 1.2);
      g.text('TO-DO', W / 2, H - 0.5, 0.17, P.INK, 'hand');
      TOMORROW.forEach((txt, i) => {
        const y = H - 0.82 - i * 0.24, bx = 0.24;
        if (i > n) return;
        g.stroke(rect(bx, y - 0.01, bx + 0.1, y + 0.09), 1.1);
        const k = i < n ? 1 : u;
        if (k <= 0) return;
        const tw = g.textWidth(txt, 0.13, 'hand');
        g.save();
        if (k < 1) g.clip(rect(bx + 0.14, y - 0.08, bx + 0.16 + tw * k, y + 0.2));
        g.text(txt, bx + 0.16, y, 0.13, P.INK, 'hand', 'left');
        g.restore();
      });
      g.end();
      t.needsUpdate = true;
    }
    set(-1, 0);
    return { tex: t, set, W, H };
  }

  // ------------------------------------------------------------ fog on the inside of the porthole
  // Fable draws in it with a finger: the wiped lines show the dark inside. Keeps a list
  // of marks and repaints; letters are written stroke by stroke (u: 0..1 per word).
  function fog() {
    const S = 512, R = 2.0;            // texture covers the glass circle, radius 2
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const t = TX.tex(cv);
    const st = { picture: 1, words: [], density: 1, crack: 0 };
    const hash = X.hash01;
    function paintFog(c) {
      c.clearRect(0, 0, S, S);
      if (st.density <= 0.01) return;
      const g = new X.G(c, S, S, new X.Cam(0, 0, 2 * R));
      g.zoomk = 2.6 / (S / (2 * R) * 0.016);
      g.beginWorld();
      g.fill(circle(0, 0, R), P.FROST, 0.42 * st.density);
      g.fillShader(circle(0, 0, R), g.radGrad(0, -0.4, 2.2, [P.FROST, P.FROST], [0, 1], [0.25 * st.density, 0]));
      for (let i = 0; i < 90; i++) {
        const a = hash('fa', i) * 6.283, r = Math.sqrt(hash('fr', i)) * 1.9;
        g.fill(circle(Math.cos(a) * r, Math.sin(a) * r, 0.01 + 0.025 * hash('fs', i)), P.FROST, 0.5 * st.density);
      }
      // finger lines: cut the fog away
      c.save();
      c.globalCompositeOperation = 'destination-out';
      const fl = (pts, w) => g.stroke(poly(pts, false), w || 3.4, '#000000', 1);
      if (st.picture > 0) {
        const k = st.picture;
        c.globalAlpha = k;
        // a small Clawd
        const clawd = (cx, cy, s) => {
          fl([[cx - 0.5 * s, cy], [cx + 0.5 * s, cy], [cx + 0.5 * s, cy + 0.66 * s], [cx - 0.5 * s, cy + 0.66 * s], [cx - 0.5 * s, cy]]);
          [-0.38, -0.21, 0.21, 0.38].forEach(lx => fl([[cx + lx * s, cy], [cx + lx * s, cy - 0.17 * s]]));
          [-1, 1].forEach(sd => fl([[cx + sd * 0.29 * s, cy + 0.34 * s], [cx + sd * 0.29 * s, cy + 0.48 * s]], 4.2));
        };
        clawd(-1.05, 0.45, 0.42);
        fl([[-0.55, 0.7], [0.05, 0.7]]);
        fl([[-0.1, 0.82], [0.07, 0.7], [-0.1, 0.58]]);
        clawd(0.75, 0.25, 0.95);
        c.font = '400 100px "Caveat", cursive';
        g.text('5.6?', 0.3, 1.25, 0.42, '#000000', 'hand', 'center', 1, -6);
        c.globalAlpha = 1;
      }
      // words, each { text, x, y, size, u (0..1 written), a (fade) }
      st.words.forEach(w => {
        if (w.u <= 0 || w.a <= 0) return;
        c.globalAlpha = w.a;
        const tw = g.textWidth(w.text, w.size, 'hand');
        g.save();
        g.clip(rect(w.x - tw / 2 - 0.05, w.y - w.size, w.x - tw / 2 + tw * w.u + 0.02, w.y + w.size * 1.2));
        g.text(w.text, w.x, w.y, w.size, '#000000', 'hand', 'center', 1);
        g.restore();
        c.globalAlpha = 1;
      });
      c.restore();
      // drips under the lines
      g.end();
    }
    function redraw() { paintFog(cv.getContext('2d')); t.needsUpdate = true; }
    redraw();
    return { tex: t, st, redraw };
  }

  // the first crack (the reward-hacking chapter put it there)
  function crack(level) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 512;
    const c = cv.getContext('2d');
    const g = new X.G(c, 512, 512, new X.Cam(CL.Lab.PORT_C[0], CL.Lab.PORT_C[1], 4.0));
    g.zoomk = 1.6;
    g.beginWorld();
    CL.Lab.drawCracks(g, level);
    g.end();
    return TX.tex(cv);
  }

  // ------------------------------------------------------------ Sonnet's laptop readouts (DOM)
  let cssDone = false;
  function css() {
    if (cssDone) return;
    cssDone = true;
    const st = document.createElement('style');
    st.textContent = `
      .ch5-screen { position: absolute; left: 0; top: 0; pointer-events: none; z-index: 5; padding: 5px 5px 9px;
        background: ${P.HOODIE_LIGHT}; border: 3px solid ${P.INK}; border-radius: 10px; box-shadow: 0 5px 0 rgba(0,0,0,0.28); }
      .ch5-screen canvas { display: block; width: 200px; height: 125px; border-radius: 4px; }
      .ch5-screen::after { content: ""; position: absolute; left: 14px; bottom: -13px; width: 14px; height: 14px; background: ${P.HOODIE_LIGHT};
        border-right: 3px solid ${P.INK}; border-bottom: 3px solid ${P.INK}; transform: rotate(45deg); }
    `;
    document.head.appendChild(st);
  }

  // paint one readout. kind: vent | feed | route | seal | test | plug(no data). d: values
  function readout(kind, d) {
    const Wp = 472, Hp = 296;
    const cv = document.createElement('canvas');
    cv.width = Wp; cv.height = Hp;
    const c = cv.getContext('2d');
    const S = P.SCREEN, G = P.CODE_GREEN, RD = P.ALARM, Y = P.SAFETY, BG = P.NAVY_DARK;
    c.fillStyle = BG; c.fillRect(0, 0, Wp, Hp);
    for (let y = 0; y < Hp; y += 4) { c.fillStyle = 'rgba(155,226,255,0.05)'; c.fillRect(0, y, Wp, 1); }
    c.lineCap = 'round'; c.lineJoin = 'round';
    const mono = s => `700 ${s}px ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", monospace`;
    const txt = (s, x, y, size, col, al) => { c.font = mono(size); c.fillStyle = col || S; c.textAlign = al || 'left'; c.fillText(s, x, y); };
    const ln = (pts, col, w) => { c.strokeStyle = col || S; c.lineWidth = w || 5; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => c.lineTo(p[0], p[1])); c.stroke(); };
    const arrow = (x0, y0, x1, y1, col) => {
      ln([[x0, y0], [x1, y1]], col, 6);
      const a = Math.atan2(y1 - y0, x1 - x0);
      ln([[x1 - 16 * Math.cos(a - 0.5), y1 - 16 * Math.sin(a - 0.5)], [x1, y1], [x1 - 16 * Math.cos(a + 0.5), y1 - 16 * Math.sin(a + 0.5)]], col, 6);
    };
    const bar = (x, y, w, h, v, col) => { c.strokeStyle = S; c.lineWidth = 3; c.strokeRect(x, y, w, h); c.fillStyle = col; c.fillRect(x + 3, y + 3, Math.max(0, (w - 6) * clamp(v, 0, 1)), h - 6); };
    const mark = (ok, x, y, s) => {
      s = s || 1;
      if (ok === true) ln([[x - 14 * s, y], [x - 4 * s, y + 11 * s], [x + 16 * s, y - 13 * s]], G, 7 * s);
      else if (ok === false) { ln([[x - 12 * s, y - 12 * s], [x + 12 * s, y + 12 * s]], RD, 7 * s); ln([[x + 12 * s, y - 12 * s], [x - 12 * s, y + 12 * s]], RD, 7 * s); }
      else if (ok === 'ice') { for (let i = 0; i < 3; i++) { const a = i * PI / 3; ln([[x - Math.cos(a) * 13 * s, y - Math.sin(a) * 13 * s], [x + Math.cos(a) * 13 * s, y + Math.sin(a) * 13 * s]], S, 5 * s); } }
    };
    const pct = v => Math.round(v * 100) + '%';
    if (kind === 'plug') {
      txt('NO DATA', Wp / 2, Hp / 2 + 10, 34, S, 'center');
    } else if (kind === 'vent') {
      // a pipe through the roof, steam going out under the night sky
      ln([[60, 250], [60, 110], [60, 70]], S, 10);
      ln([[20, 110], [140, 110]], P.HOODIE, 6);
      c.fillStyle = S; c.beginPath(); c.arc(170, 52, 18, 0, 7); c.fill();
      c.fillStyle = BG; c.beginPath(); c.arc(180, 46, 16, 0, 7); c.fill();
      if (d.flow > 0.005) { arrow(60, 160, 60, 40, Y); [0, 1, 2].forEach(i => { c.strokeStyle = S; c.lineWidth = 3; c.beginPath(); c.arc(92 + i * 22, 52 - i * 8, 10 + i * 3, 0, 7); c.stroke(); }); }
      txt('VENT → ROOF', 230, 70, 28);
      txt('FLOW', 230, 140, 26);
      bar(230, 156, 210, 34, d.flow / 0.6, d.flow > 0.005 ? Y : G);
      txt(pct(d.flow), 440, 140, 26, d.flow > 0.005 ? Y : G, 'right');
      txt(d.flow > 0.005 ? 'OPEN' : 'SHUT', 230, 250, 34, d.flow > 0.005 ? Y : G);
      mark(d.flow <= 0.005, 420, 238);
    } else if (kind === 'feed') {
      // a pipe going into a box with two eyes
      c.strokeStyle = S; c.lineWidth = 5; c.strokeRect(150, 60, 150, 120);
      c.fillStyle = d.flow > 0.005 ? Y : P.NAVY_LIGHT; c.fillRect(196, 100, 14, 30); c.fillRect(240, 100, 14, 30);
      arrow(20, 120, 140, 120, d.flow > 0.005 ? Y : P.HOODIE);
      txt('FEED', 330, 90, 30);
      txt(pct(d.flow), 330, 140, 40, d.flow > 0.005 ? Y : G);
      txt('→ FABLE', 20, 250, 28);
      bar(200, 222, 250, 34, d.flow, d.flow > 0.005 ? Y : G);
    } else if (kind === 'route') {
      // two drawings of the same branch: straight, and with the loop; their pressure loss
      const pipe = (x, loop, on) => {
        const col = on ? S : P.HOODIE;
        if (loop) ln([[x, 210], [x, 160], [x + 50, 160], [x + 50, 100], [x, 100], [x, 50]], col, 7);
        else ln([[x, 210], [x, 50]], col, 7);
      };
      pipe(50, false, !d.loop); pipe(250, true, d.loop);
      txt('NOW', d.loop ? 250 : 50, 36, 22, Y, 'left');
      txt('ΔP', 110, 120, 24); bar(110, 132, 110, 30, 0.08, G); txt('0.03', 110, 196, 24, G);
      txt('ΔP', 330, 120, 24); bar(330, 132, 110, 30, 0.6, Y); txt('0.35', 330, 196, 24, Y);
      txt('BRANCH B', Wp / 2, 270, 26, S, 'center');
    } else if (kind === 'seal') {
      // the porthole ring and its sixteen bolts; the loose one red
      const cx = 140, cy = 150, r = 100;
      c.strokeStyle = S; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
      c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r - 26, 0, 7); c.stroke();
      for (let i = 0; i < 16; i++) {
        const a = -(PI / 2 + i * PI / 8);
        const bad = i === 5 && d.loose;
        c.fillStyle = bad ? RD : S;
        c.beginPath(); c.arc(cx + Math.cos(a) * (r - 13), cy + Math.sin(a) * (r - 13), bad ? 11 : 7, 0, 7); c.fill();
      }
      txt('SEAL', 280, 110, 30);
      txt(d.loose ? '94%' : '100%', 280, 170, 44, d.loose ? RD : G);
      mark(!d.loose, 420, 240);
    } else if (kind === 'test') {
      // one row per check: pictogram, then a mark
      const rows = d.rows;
      txt(d.running ? 'RUNNING' : (d.pass ? 'TESTS PASS' : 'TESTS FAIL'), Wp / 2, 36, 28, d.running ? S : d.pass ? G : RD, 'center');
      const cols = 3, cw = Wp / cols, rh = 118;
      rows.forEach((rw, i) => {
        const x = (i % cols) * cw + cw / 2, y = 60 + Math.floor(i / cols) * rh;
        c.save(); c.translate(x - 40, y + 40); icon(rw.icon, c, rw.state); c.restore();
        if (!d.running || i < d.shown) mark(rw.ok, x + 38, y + 44, 0.9);
      });
    }
    return cv;
  }

  // the small pictograms in the test grid (drawn about 0..60 px, centred on 0)
  function icon(kind, c, state) {
    const S = P.SCREEN;
    c.strokeStyle = S; c.fillStyle = S; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
    const L2 = pts => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => c.lineTo(p[0], p[1])); c.stroke(); };
    if (kind === 'feed') { c.strokeRect(-6, -22, 34, 34); c.fillRect(2, -12, 5, 10); c.fillRect(16, -12, 5, 10); L2([[-30, -5], [-8, -5]]); L2([[-14, -11], [-8, -5], [-14, 1]]); }
    else if (kind === 'vent') { L2([[-10, 26], [-10, -20]]); L2([[-30, -2], [10, -2]]); L2([[-18, -12], [-10, -20], [-2, -12]]); }
    else if (kind === 'seal') { c.beginPath(); c.arc(0, 0, 24, 0, 7); c.stroke(); for (let i = 0; i < 8; i++) { const a = i * PI / 4; c.beginPath(); c.arc(Math.cos(a) * 24, Math.sin(a) * 24, 3.5, 0, 7); c.fill(); } }
    else if (kind === 'pods') {
      [-22, 0, 22].forEach((x, i) => {
        c.strokeRect(x - 8, -16, 16, 30);
        const s = state && state[i];
        if (s === 'ice') { c.lineWidth = 3; for (let k = 0; k < 3; k++) { const an = k * PI / 3; L2([[x - Math.cos(an) * 8, -30 - Math.sin(an) * 8], [x + Math.cos(an) * 8, -30 + Math.sin(an) * 8]]); } c.lineWidth = 4; }
        else if (s === 'cut') { c.strokeStyle = P.ALARM; L2([[x - 8, -26], [x + 8, -20]]); c.strokeStyle = S; }
        else { c.fillRect(x - 2, -30, 4, 10); }
      });
    }
    else if (kind === 'route') { L2([[-24, 26], [-24, -26]]); L2([[8, 26], [8, 6], [24, 6], [24, -8], [8, -8], [8, -26]]); }
  }

  // ------------------------------------------------------------ bubble pictograms
  // ch5-gauge:<v>  a dial reading v (0..1.05), red zone at the top end
  // ch5-vent       a valve with an arrow up: it belongs by the vent
  // ch5-list       a clipboard
  // ch5-laptop     a laptop (only Sonnet can read this)
  // ch5-weld       a welded joint: it does not come apart
  const EXTRA = {
    gauge(c, s, v) {
      const cx = 0.5 * s, cy = 0.56 * s, r = 0.34 * s;
      c.fillStyle = P.PAPER; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = P.ALARM; c.lineWidth = s * 0.08;
      c.beginPath(); c.arc(cx, cy, r * 0.72, -deg(1), deg(58), false); c.stroke();
      c.strokeStyle = P.INK; c.lineWidth = s * 0.03;
      for (let i = 0; i < 9; i++) { const a = deg(225 - i * 33.75); c.beginPath(); c.moveTo(cx + Math.cos(a) * r * 0.62, cy - Math.sin(a) * r * 0.62); c.lineTo(cx + Math.cos(a) * r * 0.85, cy - Math.sin(a) * r * 0.85); c.stroke(); }
      const a = deg(225 - 270 * clamp(v, 0, 1.06));
      c.strokeStyle = P.TIE_RED; c.lineWidth = s * 0.07;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * r * 0.8, cy - Math.sin(a) * r * 0.8); c.stroke();
      c.fillStyle = P.INK; c.beginPath(); c.arc(cx, cy, s * 0.05, 0, 7); c.fill();
    },
    vent(c, s) {
      const L2 = pts => { c.beginPath(); c.moveTo(pts[0][0] * s, pts[0][1] * s); pts.slice(1).forEach(p => c.lineTo(p[0] * s, p[1] * s)); c.stroke(); };
      L2([[0.5, 0.92], [0.5, 0.12]]);
      L2([[0.35, 0.27], [0.5, 0.12], [0.65, 0.27]]);
      c.fillStyle = P.NAVY; c.fillRect(0.38 * s, 0.5 * s, 0.24 * s, 0.22 * s); c.strokeRect(0.38 * s, 0.5 * s, 0.24 * s, 0.22 * s);
      c.strokeStyle = P.WHEEL_RED; c.beginPath(); c.arc(0.8 * s, 0.61 * s, 0.11 * s, 0, 7); c.stroke();
    },
    list(c, s) {
      c.fillStyle = P.ORANGE_DEEP; c.fillRect(0.24 * s, 0.14 * s, 0.52 * s, 0.74 * s); c.strokeRect(0.24 * s, 0.14 * s, 0.52 * s, 0.74 * s);
      c.fillStyle = P.PAPER; c.fillRect(0.3 * s, 0.24 * s, 0.4 * s, 0.58 * s);
      c.lineWidth = s * 0.04;
      [0.38, 0.52, 0.66].forEach(y => { c.strokeRect(0.34 * s, (y - 0.04) * s, 0.07 * s, 0.07 * s); c.beginPath(); c.moveTo(0.46 * s, y * s); c.lineTo(0.64 * s, y * s); c.stroke(); });
    },
    laptop(c, s) {
      c.fillStyle = P.NAVY_DARK; c.fillRect(0.24 * s, 0.22 * s, 0.52 * s, 0.36 * s); c.strokeRect(0.24 * s, 0.22 * s, 0.52 * s, 0.36 * s);
      c.fillStyle = P.SCREEN; c.fillRect(0.3 * s, 0.28 * s, 0.4 * s, 0.24 * s);
      c.beginPath(); c.moveTo(0.16 * s, 0.72 * s); c.lineTo(0.84 * s, 0.72 * s); c.lineTo(0.76 * s, 0.6 * s); c.lineTo(0.24 * s, 0.6 * s); c.closePath(); c.fillStyle = P.HOODIE_LIGHT; c.fill(); c.stroke();
      c.font = `700 ${s * 0.36}px "Zilla Slab", serif`; c.fillStyle = P.INK; c.fillText('?', 0.74 * s, 0.3 * s);
    },
    weld(c, s) {
      c.fillStyle = P.COPPER; c.fillRect(0.12 * s, 0.42 * s, 0.76 * s, 0.18 * s); c.strokeRect(0.12 * s, 0.42 * s, 0.76 * s, 0.18 * s);
      c.strokeStyle = P.SAFETY;
      for (let i = 0; i < 5; i++) { const a = -PI / 2 + (i - 2) * 0.45; c.beginPath(); c.moveTo(0.5 * s + Math.cos(a) * 0.12 * s, 0.4 * s + Math.sin(a) * 0.12 * s); c.lineTo(0.5 * s + Math.cos(a) * 0.3 * s, 0.4 * s + Math.sin(a) * 0.3 * s); c.stroke(); }
      c.strokeStyle = P.INK;
      c.beginPath(); c.moveTo(0.36 * s, 0.68 * s); c.lineTo(0.64 * s, 0.88 * s); c.moveTo(0.64 * s, 0.68 * s); c.lineTo(0.36 * s, 0.88 * s); c.stroke();
    },
  };
  function deg(d) { return d * PI / 180; }

  let iconsDone = false;
  function registerIcons() {
    if (iconsDone) return;
    iconsDone = true;
    const base = CL.Tex.icon;
    CL.Tex.icon = function (kind, size) {
      if (typeof kind !== 'string' || !kind.startsWith('ch5-')) return base(kind, size);
      const [name, arg] = kind.slice(4).split(':');
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const c = cv.getContext('2d');
      c.lineWidth = size * 0.07; c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = P.INK; c.fillStyle = P.INK;
      if (EXTRA[name]) EXTRA[name](c, size, parseFloat(arg));
      return cv;
    };
  }

  // ------------------------------------------------------------ models

  // the shared gauge, with its needle reading 0 at lower left, 1 at lower right (red zone at the top end)
  function gauge(r) {
    const g = K.gauge(r);
    fixGauge(g);
    return g;
  }
  function fixGauge(g) {
    const needle = g.children[2];
    g.userData.set = v => { needle.rotation.z = (135 - 270 * clamp(v, 0, 1.06)) * PI / 180; };
    g.userData.set(0);
    return g;
  }

  function table() {
    const g = new T.Group();
    const top = K.box(1.5, 0.06, 0.95, P.REACTOR_DEEP, 0, 0.92, 0);
    top.rotation.x = 0.12;
    g.add(top);
    g.userData.top = top;
    [[-0.68, -0.4], [0.68, -0.4], [-0.68, 0.4], [0.68, 0.4]].forEach(([x, z]) => g.add(K.box(0.06, 0.92, 0.06, P.NAVY_DARK, x, 0.46, z)));
    g.add(K.box(1.4, 0.05, 0.05, P.NAVY_DARK, 0, 0.3, -0.4));
    g.add(K.box(0.05, 0.05, 0.85, P.NAVY_DARK, -0.68, 0.3, 0));
    g.add(K.box(0.05, 0.05, 0.85, P.NAVY_DARK, 0.68, 0.3, 0));
    return g;
  }

  // desk lamp: base, two arms, shade, a bulb that glows and a cone of light
  function deskLamp() {
    const g = new T.Group();
    g.add(K.cyl(0.13, 0.15, 0.05, P.NAVY, 0, 0.025, 0, 16));
    const a1 = K.box(0.04, 0.5, 0.04, P.NAVY_DARK, 0, 0.27, 0.05); a1.rotation.x = 0.2; g.add(a1);
    const a2 = K.box(0.04, 0.42, 0.04, P.NAVY_DARK, 0, 0.6, 0.22); a2.rotation.x = 1.15; g.add(a2);
    const shade = K.mesh(new T.ConeGeometry(0.15, 0.2, 18, 1, true), K.m(P.WHEEL_RED, { side: T.DoubleSide }), 0, 0.62, 0.42);
    shade.rotation.x = -0.5;
    g.add(shade);
    const bulb = K.mesh(new T.SphereGeometry(0.055, 10, 8), ink(P.GLOW_CORE, { flat: true, lit: true, emissive: '#3A3020' }), 0, 0.57, 0.45);
    g.add(bulb);
    const glow = K.glow(P.GLOW_CORE, 0.9);
    glow.position.set(0, 0.55, 0.47);
    g.add(glow);
    const cone = new T.Mesh(new T.ConeGeometry(0.7, 1.0, 20, 1, true), new T.MeshBasicMaterial({ color: new T.Color(P.GLOW_CORE), transparent: true, opacity: 0.1, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
    cone.position.set(0, 0.12, 0.62);
    cone.rotation.x = -0.35;
    cone.layers.set(1);
    g.add(cone);
    g.userData.set = v => {
      bulb.material.uniforms.uColor.value.set(v > 0.5 ? P.GLOW_CORE : P.POD_DEEP);
      bulb.material.uniforms.uEmissive.value.set(v > 0.5 ? '#3A3020' : '#000000');
      glow.material.opacity = 0.55 * v;
      cone.material.opacity = 0.1 * v;
    };
    g.userData.set(1);
    return g;
  }

  // a data port: a navy box with a socket and a small light. Faces +z.
  function port() {
    const g = new T.Group();
    g.add(K.box(0.2, 0.24, 0.06, P.NAVY_DARK, 0, 0, 0));
    g.add(K.box(0.12, 0.05, 0.02, P.INK, 0, -0.04, 0.035, { flat: true }));
    const led = K.box(0.04, 0.04, 0.02, P.SCREEN, 0, 0.07, 0.035, { flat: true, lit: true, emissive: '#1A3440' });
    g.add(led);
    g.userData.led = led;
    g.userData.set = col => { led.material.uniforms.uColor.value.set(col); led.material.uniforms.uEmissive.value.set(col === P.CODE_GREEN ? '#14381F' : col === P.SAFETY ? '#3A2E08' : '#1A3440'); };
    return g;
  }

  // gate valve on a vertical pipe, stem pointing +x: the yellow stem sticks out when open.
  // Its handwheel is missing; a square spindle is all there is to turn.
  function ventValve() {
    const g = new T.Group();
    g.add(K.box(0.2, 0.26, 0.2, P.NAVY, 0, 0, 0));
    [-0.15, 0.15].forEach(y => g.add(K.flange(0, y, 0, 0.055, 'y')));
    const bonnet = K.cyl(0.07, 0.07, 0.18, P.NAVY, 0.19, 0, 0, 12);
    bonnet.rotation.z = PI / 2;
    g.add(bonnet);
    const stem = new T.Group();            // slides along +x
    const rod = K.cyl(0.03, 0.03, 0.44, P.SAFETY, -0.22 + 0.0, 0, 0, 8);
    rod.rotation.z = PI / 2;
    stem.add(rod);
    const spindle = K.box(0.07, 0.05, 0.05, P.INK, 0.02, 0, 0);
    stem.add(spindle);
    const mount = new T.Group();
    mount.position.set(0.04, 0, 0);
    mount.rotation.y = PI / 2;             // a wheel added here faces +x
    stem.add(mount);
    g.add(stem);
    g.userData = { stem, spindle, mount };
    g.userData.setOpen = k => { stem.position.x = 0.3 + 0.32 * clamp(k, 0, 1); };
    g.userData.setOpen(0);
    return g;
  }

  // inspection hatch for the reactor's side: riveted plate with a grille. Faces +z.
  function hatch() {
    const g = new T.Group();
    g.add(K.box(0.5, 0.42, 0.04, P.NAVY, 0, 0, 0));
    g.add(K.box(0.4, 0.32, 0.02, P.NAVY_LIGHT, 0, 0, 0.025));
    for (let i = 0; i < 4; i++) g.add(K.box(0.3, 0.025, 0.02, P.NAVY_DARK, 0, -0.09 + i * 0.06, 0.04));
    [[-0.21, -0.17], [0.21, -0.17], [-0.21, 0.17], [0.21, 0.17]].forEach(([x, y]) => g.add(K.cyl(0.018, 0.018, 0.02, P.BRASS, x, y, 0.03, 8).rotateX(PI / 2)));
    return g;
  }

  function cowl() {
    const g = new T.Group();
    g.add(K.cyl(0.07, 0.07, 0.25, P.POD, 0, 0.12, 0, 12));
    g.add(K.cyl(0.03, 0.2, 0.12, P.NAVY, 0, 0.3, 0, 14));
    return g;
  }

  // a flat plane with a texture, double-sided, unshaded (for close-ups held near the camera)
  function sheet(w, h, texture) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), ink('#FFFFFF', { map: texture, flat: true, lit: true, depthWrite: true }));
    m.renderOrder = 10;
    return m;
  }

  CL.Ch5Art = {
    TAP, tapOf, BP, TOMORROW,
    blueprint, tapChart, listPage, fog, crack, readout, css, registerIcons,
    gauge, fixGauge, table, deskLamp, port, ventValve, hatch, cowl, sheet,
  };
})(window.CL = window.CL || {});
