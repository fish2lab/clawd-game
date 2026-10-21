/* The lab set: wall, floor, pipes, lamps, cryo pods and the Fable reactor.
   Port of clawdlab/scene.py.

   Everything lives in one world coordinate system (y-up, floor at y=0 against
   the back wall), so the Fable porthole has exactly one size no matter how the
   camera frames it. */
(function (CL) {
  'use strict';
  const P = CL.P;
  const X = CL.gfx;
  const { rect, rrect, circle, ellipse, poly, smoothPath, arcPath, join, mix, clamp, lerp, hash01, easeOut, smooth, deg, rng } = X;
  const PI = Math.PI;

  // ------------------------------------------------------------ layout

  const PODS = {
    opus: { x: 0.0, k: 1.0, label: 'OPUS 5.5' },
    sonnet: { x: 2.95, k: 0.78, label: 'SONNET 5.5' },
    haiku: { x: 5.30, k: 0.56, label: 'HAIKU 5.5' },
  };
  const XR = 12.8;            // reactor centre
  const PORT_C = [XR, 3.35];  // porthole centre
  const PORT_R = 2.0;         // glass radius
  const RING_R = 2.55;        // flange outer radius
  const FABLE_W = 4.8;
  const MANIFOLD_Y = 3.38;
  const CEIL = 15.0;
  const COLUMNS = [-3.6, 8.05, 17.6];

  const podDoor = (k, Xc) => ({ x0: Xc - 0.56 * k, x1: Xc + 0.56 * k, y0: 0.46 * k, y1: 1.88 * k });

  // ------------------------------------------------------------ wall & floor

  function drawWall(g, st) {
    const x0 = g.cam.cx - g.view_w / 2 - 1, x1 = g.cam.cx + g.view_w / 2 + 1;
    const y1 = g.cam.cy + g.cam.h / 2 + 1;
    g.fill(rect(x0, 0, x1, Math.min(y1, CEIL + 3)), P.WALL);
    const pw = 2.4;
    const i0 = Math.floor(x0 / pw) - 1, i1 = Math.ceil(x1 / pw) + 1;
    const bands = [[0, 2.7], [2.7, 6.2], [6.2, 10.0], [10.0, CEIL]];
    for (let i = i0; i < i1; i++) {
      const px = i * pw;
      bands.forEach(([py0, py1], j) => {
        if (!g.visible(px, py0, px + pw, py1, 0.1)) return;
        const r = rect(px, py0, px + pw, py1);
        if ((((i + j) % 2) + 2) % 2 === 0) g.fill(r, P.WALL_SHADE, 0.35);
        g.hatch(r, P.INK, 0.035, 'vert', 1.2);
        g.stroke(r, 0.45, P.WALL_LINE);
        [[px + 0.1, py0 + 0.1], [px + pw - 0.1, py0 + 0.1], [px + 0.1, py1 - 0.1], [px + pw - 0.1, py1 - 0.1]]
          .forEach(([sx, sy]) => g.fill(circle(sx, sy, 0.018), P.WALL_LINE));
      });
    }
    g.fs(rect(x0, -0.02, x1, 0.16), P.NAVY, 0.9);
    g.fill(rect(x0, 0.12, x1, 0.16), P.NAVY_LIGHT, 0.6);
    if (y1 > CEIL - 0.6 && !(st && st.roofOpen)) drawCeiling(g, x0, x1);
    COLUMNS.concat((st && st.columns) || []).forEach(cxx => {
      if (!g.visible(cxx - 0.4, 0, cxx + 0.4, CEIL)) return;
      g.fs(rect(cxx - 0.32, 0, cxx + 0.32, CEIL), P.REACTOR, 1.0);
      g.fillShader(rect(cxx - 0.32, 0, cxx + 0.32, CEIL), g.linGrad(cxx - 0.32, 0, cxx + 0.32, 0, ['#FFFFFF', P.REACTOR_SHADE], null, 0.5));
      g.hatch(rect(cxx + 0.05, 0, cxx + 0.32, CEIL), P.INK, 0.18, 'diag', 0.7);
      g.fs(rect(cxx - 0.42, 0, cxx + 0.42, 0.35), P.NAVY, 1.0);
      for (let yy = 0.9; yy < CEIL; yy += 1.3) {
        g.fill(circle(cxx - 0.2, yy, 0.03), P.INK_SOFT);
        g.fill(circle(cxx + 0.2, yy, 0.03), P.INK_SOFT);
      }
      g.stroke(rect(cxx - 0.32, 0, cxx + 0.32, CEIL), 1.0);
    });
    if (g.visible(-2, 5.2, 7, 6.4)) {
      g.text('CRYO  BAY', 2.65, 5.55, 0.62, P.WALL_LINE, 'slab', 'center', 0.9);
      g.fill(rect(-1.2, 5.37, 6.5, 5.42), P.WALL_LINE, 0.9);
    }
    if (g.visible(XR - 4, 11.0, XR + 4, 12.4)) {
      g.text('CONTAINMENT', XR, 11.15, 0.95, P.WALL_LINE, 'slab', 'center', 0.9);
      [-1, 1].forEach(s => g.fill(rect(XR + s * 4.0, 11.4, XR + s * 3.55, 11.5), P.WALL_LINE));
    }
    ((st && st.stencils) || []).forEach(sn => {
      if (!g.visible(sn.x - 4, sn.y - 0.5, sn.x + 4, sn.y + 1)) return;
      g.text(sn.text, sn.x, sn.y, sn.size || 0.62, P.WALL_LINE, 'slab', 'center', 0.9);
      if (sn.rule) g.fill(rect(sn.x - sn.rule, sn.y - 0.18, sn.x + sn.rule, sn.y - 0.13), P.WALL_LINE, 0.9);
    });
  }

  function drawCeiling(g, x0, x1) {
    g.fs(rect(x0, CEIL - 0.45, x1, CEIL + 3), P.NAVY_DARK, 1.0);
    for (let i = Math.floor(x0 / 1.2) - 1; i < Math.floor(x1 / 1.2) + 2; i++) {
      const xx = i * 1.2;
      g.stroke(poly([[xx, CEIL - 0.45], [xx + 0.6, CEIL + 0.3]], false), 1.2, P.NAVY_LIGHT);
    }
  }

  // floor point at world-x X and depth d (toward camera) -> drawing coords
  const floorXY = (Xw, d, cx) => [Xw + (Xw - cx) * d * 0.16, -d * (1.0 + 0.10 * d)];

  function drawFloor(g) {
    const cx = g.cam.cx;
    const x0 = cx - g.view_w / 2 - 2, x1 = cx + g.view_w / 2 + 2;
    const ybot = g.cam.cy - g.cam.h / 2 - 1;
    if (ybot > 0) return;
    const fr = rect(x0, ybot, x1, 0);
    g.fill(fr, P.FLOOR);
    g.fillShader(fr, g.linGrad(0, 0, 0, -3.0, [P.FLOOR_DARK, P.FLOOR], null, 0.7));
    const dmax = 6.0;
    let d = 0, k = 0;
    while (d < dmax) {
      const y = floorXY(0, d, cx)[1];
      if (y < ybot) break;
      g.line(x0, y, x1, y, 0.5, P.FLOOR_LINE);
      k += 1;
      d = 0.42 * k * (1 + 0.05 * k);
    }
    const tile = 0.9;
    for (let i = Math.floor((cx - g.view_w) / tile) - 2; i < Math.ceil((cx + g.view_w) / tile) + 2; i++) {
      const a = floorXY(i * tile, 0, cx), b = floorXY(i * tile, dmax, cx);
      g.line(a[0], a[1], b[0], b[1], 0.5, P.FLOOR_LINE);
    }
    g.hatch(fr, P.INK, 0.04, 'diag', 1.4);
    [[0.10, 0.15], [1.55, 1.63]].forEach(([d0, d1]) => {
      const ya = floorXY(0, d0, cx)[1], yb = floorXY(0, d1, cx)[1];
      g.fill(rect(x0, yb, x1, ya), P.SAFETY, 0.95);
    });
    g.soft(rect(x0, -0.06, x1, 0), P.INK, 0.05, 0.25);
  }

  // ------------------------------------------------------------ pipes / lamps

  function pipeH(g, x0, x1, y, r, color, flangeEvery) {
    color = color || P.POD;
    if (flangeEvery === undefined) flangeEvery = 1.6;
    const p = rect(x0, y - r, x1, y + r);
    g.fill(p, color);
    g.fillShader(p, g.linGrad(0, y + r, 0, y - r, ['#FFFFFF', color, P.POD_DEEP], [0, 0.35, 1], 0.8));
    g.stroke(poly([[x0, y + r], [x1, y + r]], false), 1.0);
    g.stroke(poly([[x0, y - r], [x1, y - r]], false), 1.0);
    if (flangeEvery) {
      for (let i = Math.ceil(x0 / flangeEvery); i <= Math.floor(x1 / flangeEvery); i++) {
        const fx = i * flangeEvery;
        g.fs(rect(fx - 0.04, y - r * 1.4, fx + 0.04, y + r * 1.4), P.NAVY, 0.8);
      }
    }
  }

  function pipeV(g, x, y0, y1, r, color) {
    color = color || P.POD;
    const p = rect(x - r, y0, x + r, y1);
    g.fill(p, color);
    g.fillShader(p, g.linGrad(x - r, 0, x + r, 0, ['#FFFFFF', color, P.POD_DEEP], [0, 0.35, 1], 0.8));
    g.stroke(poly([[x - r, y0], [x - r, y1]], false), 1.0);
    g.stroke(poly([[x + r, y0], [x + r, y1]], false), 1.0);
  }

  function drawPipes(g, st) {
    const left = (st && st.manifoldFrom !== undefined) ? st.manifoldFrom : -8.0;
    if (g.visible(left, 2.9, XR, 4.2)) {
      pipeH(g, left, XR - 3.2, MANIFOLD_Y, 0.10);
      pipeH(g, left, XR - 3.2, MANIFOLD_Y + 0.42, 0.065, P.REACTOR, 2.3);
    }
    [XR - 1.6, XR + 1.6].forEach(xx => {
      if (!g.visible(xx - 0.3, 9, xx + 0.3, CEIL)) return;
      pipeV(g, xx, 9.0, CEIL, 0.16, P.REACTOR);
      [10.5, 12.5, 14.2].forEach(yy => g.fs(rect(xx - 0.22, yy - 0.05, xx + 0.22, yy + 0.05), P.NAVY, 0.8));
    });
  }

  const LAMPS = [
    { id: 'opus', x: 0.0, y: 4.65, k: 1.0 },
    { id: 'sonnet', x: 2.95, y: 4.65, k: 0.9 },
    { id: 'haiku', x: 5.3, y: 4.65, k: 0.8 },
    { id: 'fable_l', x: XR - 2.6, y: 12.2, k: 1.6 },
    { id: 'fable_r', x: XR + 2.6, y: 12.2, k: 1.6 },
  ];

  function drawLamp(g, L, on, sway) {
    const { x, y, k } = L;
    const c = g.c;
    c.save();
    c.translate(x, CEIL);
    c.rotate(deg(-(sway || 0)));
    const ly = y - CEIL;
    g.line(0, 0, 0, ly + 0.25 * k, 1.0, P.INK);
    const sh = new Path2D();
    sh.moveTo(-0.08 * k, ly + 0.28 * k);
    sh.lineTo(0.08 * k, ly + 0.28 * k);
    sh.lineTo(0.12 * k, ly + 0.18 * k);
    sh.bezierCurveTo(0.30 * k, ly + 0.10 * k, 0.36 * k, ly + 0.02 * k, 0.38 * k, ly);
    sh.lineTo(-0.38 * k, ly);
    sh.bezierCurveTo(-0.36 * k, ly + 0.02 * k, -0.30 * k, ly + 0.10 * k, -0.12 * k, ly + 0.18 * k);
    sh.closePath();
    g.fs(ellipse(0, ly - 0.02 * k, 0.13 * k, 0.07 * k), mix('#FFF7DE', '#9A9384', 1 - on), 0.9);
    g.fs(sh, P.NAVY, 1.0);
    g.fillShader(sh, g.linGrad(-0.38 * k, 0, 0.38 * k, 0, ['#FFFFFF', P.NAVY, P.NAVY_DARK], [0, 0.4, 1], 0.35));
    c.restore();
  }

  function lampPos(L, sway) {
    const r = CEIL - L.y, a = deg(sway || 0);
    return [L.x + Math.sin(a) * r, CEIL - Math.cos(a) * r];
  }

  function lampsOf(st) { return LAMPS.concat(st.extraLamps || []); }

  function drawLightCones(g, st) {
    lampsOf(st).forEach(L => {
      const on = st.lamps[L.id] || 0;
      if (on <= 0.01) return;
      const [x, y] = lampPos(L, st.lamp_sway);
      const k = L.k, floorY = -0.6;
      const spread = 1.15 * k + (y - floorY) * 0.32;
      const p = poly([[x - 0.33 * k, y], [x + 0.33 * k, y], [x + spread, floorY], [x - spread, floorY]]);
      const gr = g.c.createLinearGradient(0, y, 0, floorY);
      gr.addColorStop(0, X.css(L.tint || '#FFF4D6', 0.22 * on));
      gr.addColorStop(1, X.css(L.tint || '#FFF4D6', 0));
      g.fillShader(p, gr);
    });
  }

  // ------------------------------------------------------------ pods

  const POD_GRAD = ['#FFFFFF', P.POD, P.POD, P.POD_SHADE, P.POD_DEEP];
  const POD_GPOS = [0, 0.22, 0.5, 0.82, 1];

  function drawPodBody(g, Xc, k, label, gauge, jiggle) {
    const c = g.c;
    jiggle = jiggle || [0, 0];
    c.save();
    c.translate(Xc + jiggle[0], 0);
    c.rotate(deg(-jiggle[1]));
    c.translate(-Xc, 0);
    const xl = Xc - 0.82 * k, xr = Xc + 0.82 * k;
    pipeV(g, Xc, 2.6 * k, MANIFOLD_Y, 0.065);
    g.fs(rect(Xc - 0.11, MANIFOLD_Y - 0.17, Xc + 0.11, MANIFOLD_Y + 0.17), P.NAVY, 0.8);
    g.fs(rect(Xc - 0.12 * k, 2.56 * k, Xc + 0.12 * k, 2.74 * k), P.NAVY, 1.0);
    const dome = new Path2D();
    dome.moveTo(xl, 2.05 * k);
    dome.bezierCurveTo(xl, 2.8 * k, xr, 2.8 * k, xr, 2.05 * k);
    dome.closePath();
    g.fill(dome, P.POD);
    g.fillShader(dome, g.linGrad(xl, 0, xr, 0, POD_GRAD, POD_GPOS), 0.9);
    c.save();
    c.clip(rect(Xc + 0.25 * k, 0, xr + 1, 4 * k));
    g.hatch(dome, P.INK, 0.15, 'diag', 0.5);
    c.restore();
    g.stroke(dome, 1.2);
    const body = rect(xl, 0.30 * k, xr, 2.05 * k);
    g.fill(body, P.POD);
    g.fillShader(body, g.linGrad(xl, 0, xr, 0, POD_GRAD, POD_GPOS), 0.9);
    g.hatch(rect(Xc + 0.35 * k, 0.30 * k, xr, 2.05 * k), P.INK, 0.18, 'diag', 0.5);
    g.stroke(body, 1.2);
    [[0.30 * k, 0.42 * k], [1.94 * k, 2.06 * k]].forEach(([b0, b1]) => {
      const bp = rect(xl - 0.02 * k, b0, xr + 0.02 * k, b1);
      g.fs(bp, P.NAVY, 1.0);
      g.fillShader(bp, g.linGrad(xl, 0, xr, 0, [P.NAVY_LIGHT, P.NAVY, P.NAVY_DARK], [0, 0.4, 1]), 0.8);
      const n = Math.floor(1.64 * k / 0.13);
      for (let i = 0; i <= n; i++) g.fill(circle(xl + 0.06 * k + i * (1.52 * k) / n, (b0 + b1) / 2, 0.016 * k), '#C9CCE6');
    });
    const gx = Xc + 0.52 * k, gy = 2.28 * k, gr = 0.10 * k;
    g.fs(circle(gx, gy, gr), P.BRASS, 1.0);
    g.fs(circle(gx, gy, gr * 0.75), '#FFFFFF', 0.6);
    for (let i = 0; i < 7; i++) {
      const a = deg(210 - i * 40);
      g.line(gx + Math.cos(a) * gr * 0.55, gy + Math.sin(a) * gr * 0.55, gx + Math.cos(a) * gr * 0.7, gy + Math.sin(a) * gr * 0.7, 0.4);
    }
    const ga = deg(210 - 240 * clamp(gauge === undefined ? 0.2 : gauge));
    g.line(gx, gy, gx + Math.cos(ga) * gr * 0.62, gy + Math.sin(ga) * gr * 0.62, 1.0, P.TIE_RED);
    g.soft(ellipse(Xc, -0.02, 1.05 * k, 0.09), P.INK, 0.06, 0.28);
    const ped = rrect(Xc - 0.98 * k, 0, Xc + 0.98 * k, 0.32 * k, 0.05 * k);
    g.fs(ped, P.POD, 1.2);
    g.fillShader(ped, g.linGrad(Xc - k, 0, Xc + k, 0, POD_GRAD, POD_GPOS), 0.7);
    g.fs(rect(Xc - 0.98 * k, 0.27 * k, Xc + 0.98 * k, 0.32 * k), P.NAVY, 0.8);
    g.fs(rect(Xc - 0.66 * k, 0.05 * k, Xc + 0.66 * k, 0.23 * k), '#FAF7EE', 1.0);
    g.stroke(rect(Xc - 0.63 * k, 0.07 * k, Xc + 0.63 * k, 0.21 * k), 0.5);
    g.text(label, Xc, 0.093 * k, 0.118 * k, P.INK, 'slab');
    c.restore();
  }

  // Perspective map for a door hinged on its right edge, swinging toward the camera.
  function doorMap(g, k, Xc, phi) {
    if (phi <= 1e-4) return null;
    const d = podDoor(k, Xc);
    const xh = d.x1, cx = g.cam.cx, cy = g.cam.cy;
    const F = Math.max(4.5, 1.7 * g.cam.h);
    const cp = Math.cos(phi), sp = Math.sin(phi);
    return (x, y) => {
      const dd = xh - x;
      const f = F / (F - dd * sp);
      return [cx + (xh - dd * cp - cx) * f, cy + (y - cy) * f];
    };
  }

  const mapPoly = (pts, m) => poly(m ? X.mapPts(pts, m) : pts);

  function drawPodInterior(g, Xc, k, occupant, t, light) {
    const d = podDoor(k, Xc);
    const cav = rrect(d.x0 + 0.02 * k, d.y0, d.x1 - 0.02 * k, d.y1, 0.16 * k);
    g.fill(cav, P.POD_INSIDE);
    g.fillShader(cav, g.radGrad(Xc, d.y0 + 0.1 * k, 1.3 * k, [P.POD_INSIDE_GLOW, P.POD_INSIDE], [0, 1], [0.55 * light, 0]));
    for (let i = 1; i < 4; i++) {
      const yy = d.y0 + i * (d.y1 - d.y0) / 4;
      g.line(d.x0 + 0.08 * k, yy, d.x1 - 0.08 * k, yy, 0.6, P.NAVY_LIGHT, 0.6);
    }
    g.save();
    g.clip(cav);
    if (occupant) CL.Clawd.draw(g, occupant, t);
    for (let i = 0; i < 7; i++) {
      const mx = d.x0 + (i + 0.5) * (d.x1 - d.x0) / 7 + 0.04 * k * Math.sin(t * 1.3 + i);
      g.fill(circle(mx, d.y0 + 0.02 * k, (0.12 + 0.05 * hash01(i, Xc)) * k), '#BFD9F0', 0.55);
    }
    g.restore();
    g.stroke(cav, 1.0);
  }

  const BEADS = (() => {
    const r = rng(19);
    const out = [];
    for (let i = 0; i < 28; i++) out.push([r.uniform(-0.42, 0.42), 0.98 + Math.pow(r(), 1.5) * 0.76, 0.008 + 0.014 * r()]);
    return out;
  })();

  function drawDoor(g, Xc, k, phi, wheelAng, frost, wipe, m) {
    const d = podDoor(k, Xc);
    const outerP = X.ptsRRect(d.x0, d.y0, d.x1, d.y1, 0.16 * k, 8);
    const winP = X.ptsRRect(Xc - 0.45 * k, 0.95 * k, Xc + 0.45 * k, 1.78 * k, 0.12 * k, 8);
    const panelP = X.ptsRRect(Xc - 0.45 * k, 0.56 * k, Xc + 0.45 * k, 0.88 * k, 0.06 * k, 4);
    const outer = mapPoly(outerP, m), win = mapPoly(winP, m), panel = mapPoly(panelP, m);
    const mp = m || ((x, y) => [x, y]);
    const mx0 = mp(d.x0, 1)[0], mx1 = mp(d.x1, 1)[0];
    const inside = Math.cos(phi) < 0;
    if (inside) {
      g.fs(outer, P.NAVY_DARK, 1.2);
      g.fs(mapPoly(X.ptsRRect(d.x0 + 0.08 * k, d.y0 + 0.08 * k, d.x1 - 0.08 * k, d.y1 - 0.08 * k, 0.12 * k, 6), m), P.NAVY, 0.8);
      g.fs(mapPoly(X.ptsCircle(Xc, 0.72 * k, 0.06 * k, 16), m), P.NAVY_LIGHT, 0.8);
      g.fill(win, P.GLASS, 0.85);
      g.fill(win, P.FROST, 0.6);
      return;
    }
    const frame = join(outer, win);
    g.fill(frame, P.NAVY, 1, true);
    g.fillShader(frame, g.linGrad(Math.min(mx0, mx1), 0, Math.max(mx0, mx1), 0, [P.NAVY_LIGHT, P.NAVY, P.NAVY_DARK], [0, 0.45, 1]), 0.8, true);
    g.stroke(outer, 1.2);
    g.fs(panel, P.POD, 1.0);
    g.hatch(panel, P.INK, 0.15, 'diag', 0.4);
    for (let i = 0; i < 6; i++) {
      const yy = 0.62 * k + i * 0.22 * k;
      [d.x0 + 0.05 * k, d.x1 - 0.05 * k].forEach(xx => g.fill(mapPoly(X.ptsCircle(xx, yy, 0.014 * k, 10), m), '#C9CCE6'));
    }
    [0.62 * k, 1.68 * k].forEach(yy => g.fs(mapPoly(X.ptsRRect(d.x1 - 0.02 * k, yy - 0.09 * k, d.x1 + 0.07 * k, yy + 0.09 * k, 0.02 * k, 3), m), P.NAVY_DARK, 0.8));
    g.fs(mapPoly(X.ptsRRect(d.x0 - 0.05 * k, 1.15 * k, d.x0 + 0.05 * k, 1.42 * k, 0.03 * k, 3), m), P.BRASS, 0.9);
    if (phi > 0.05) {
      g.fill(win, P.GLASS, 0.9);
      g.fill(win, P.FROST, 0.55);
    } else if (frost > 0) {
      g.save();
      if (wipe) {
        // frost everywhere except the wiped strokes
        const inv = join(rect(-1e3, -1e3, 1e3, 1e3), wipe);
        g.clip(inv, true);
      }
      g.fill(win, P.FROST, 0.78 * frost);
      g.fill(win, P.GLASS, 0.18 * frost);
      BEADS.forEach(([bu, bv, br]) => {
        const bc = circle(Xc + bu * k, bv * k, br * k);
        g.fill(bc, '#FFFFFF', 0.6 * frost);
        g.stroke(bc, 0.35, P.GLASS_DEEP, 0.5 * frost);
      });
      g.restore();
      if (wipe) {
        g.save();
        g.clip(win);
        g.fill(wipe, P.GLASS, 0.12);
        g.restore();
      }
    }
    g.save();
    g.clip(win);
    [[-0.18, 0.06], [-0.02, 0.025]].forEach(([off, wd]) => {
      const x = Xc + off * k;
      g.fill(mapPoly([[x - 0.3 * k, 0.95 * k], [x - 0.3 * k + wd * k, 0.95 * k], [x + 0.25 * k + wd * k, 1.78 * k], [x + 0.25 * k, 1.78 * k]], m), '#FFFFFF', 0.35);
    });
    g.restore();
    g.stroke(win, 1.2);
    drawWheel(g, Xc, 0.72 * k, 0.15 * k, wheelAng, m);
  }

  function drawWheel(g, x, y, r, ang, m) {
    const mp = pts => mapPoly(pts, m);
    g.fs(mp(X.ptsCircle(x, y, r, 32)), P.WHEEL_RED, 1.0);
    g.fill(mp(X.ptsCircle(x, y, r * 0.74, 32)), P.POD);
    g.stroke(mp(X.ptsCircle(x, y, r * 0.74, 32)), 0.9);
    for (let i = 0; i < 6; i++) {
      const a = (ang || 0) + i * PI / 3;
      const ca = Math.cos(a), sa = Math.sin(a);
      const rot = (u, v) => [x + u * ca - v * sa, y + u * sa + v * ca];
      g.fs(mp([rot(0, -r * 0.08), rot(r * 0.8, -r * 0.08), rot(r * 0.8, r * 0.08), rot(0, r * 0.08)]), P.WHEEL_RED, 0.7);
      const [hx, hy] = rot(r * 0.92, 0);
      g.fs(mp(X.ptsCircle(hx, hy, r * 0.11, 12)), P.WHEEL_RED_DARK, 0.6);
    }
    g.fs(mp(X.ptsCircle(x, y, r * 0.22, 16)), P.WHEEL_RED_DARK, 0.8);
    g.fill(mp(X.ptsCircle(x - r * 0.05, y + r * 0.06, r * 0.07, 10)), '#FFFFFF', 0.6);
  }

  // ps: {phi, wheel, frost, wipe(Path2D|null), occupant(CS|null), jiggle, gauge, light, screen, jets}
  function drawPod(g, name, ps, t) {
    const cfg = PODS[name];
    const Xc = cfg.x, k = cfg.k;
    if (!g.visible(Xc - 1.1 * k, 0, Xc + 2.3 * k, 3.0 * k)) return;
    ps = ps || {};
    const jig = ps.jiggle || [0, 0];
    drawPodBody(g, Xc, k, ps.label || cfg.label, ps.gauge, jig);
    const c = g.c;
    c.save();
    c.translate(Xc + jig[0], 0);
    c.rotate(deg(-jig[1]));
    c.translate(-Xc, 0);
    const phi = ps.phi || 0;
    const light = ps.light === undefined ? 1 : ps.light;
    if (phi > 0.01) drawPodInterior(g, Xc, k, ps.occupant, t, light);
    else {
      const win = rrect(Xc - 0.45 * k, 0.95 * k, Xc + 0.45 * k, 1.78 * k, 0.12 * k);
      g.save();
      g.clip(win);
      drawPodInterior(g, Xc, k, ps.occupant, t, light);
      if (ps.screen > 0) g.fillShader(win, g.radGrad(Xc, 1.05 * k, 0.6 * k, [P.SCREEN, P.SCREEN], [0, 1], [0.55 * ps.screen, 0]));
      g.restore();
    }
    drawDoor(g, Xc, k, phi, ps.wheel || 0, ps.frost === undefined ? 1 : ps.frost, ps.wipe, doorMap(g, k, Xc, phi));
    const jets = ps.jets || 0;
    if (jets > 0 && phi < 0.01) {
      const d = podDoor(k, Xc);
      for (let i = 0; i < 5; i++) {
        const ph = (t * 3.1 + hash01('jet', i)) % 1;
        const jx = d.x0 - 0.02 * k - ph * 0.35 * k;
        const jy = d.y0 + (0.2 + 0.15 * i) * (d.y1 - d.y0) + ph * 0.12 * k;
        g.fill(circle(jx, jy, (0.03 + 0.08 * ph) * k), '#FFFFFF', jets * (1 - ph) * 0.8);
      }
    }
    c.restore();
  }

  // ------------------------------------------------------------ reactor

  const R_GRAD = ['#EFE9DC', P.REACTOR, P.REACTOR, P.REACTOR_SHADE, P.REACTOR_DEEP];
  const R_GPOS = [0, 0.2, 0.55, 0.85, 1];
  const NAVY_GRAD = [P.NAVY_LIGHT, P.NAVY, P.NAVY_DARK];

  function reactorPaths() {
    const vx0 = XR - 3.3, vx1 = XR + 3.3;
    const shell = rect(vx0, 0.5, vx1, 7.8);
    const dome = new Path2D();
    dome.moveTo(vx0 - 0.1, 8.0);
    dome.bezierCurveTo(vx0 + 0.2, 9.75, vx1 - 0.2, 9.75, vx1 + 0.1, 8.0);
    dome.closePath();
    return [shell, dome];
  }

  // rs: {alarm, gauges, eyes, eye_open, angry, lunge, face_off, face_vis, flash, cracks, popped, vapour,
  //      sign (bool, default true), hatch (0..1 top hatch open), noDrive, signMount}
  function drawReactor(g, rs, t) {
    if (!g.visible(XR - 4.6, -0.2, XR + 4.6, CEIL)) return;
    const vx0 = XR - 3.3, vx1 = XR + 3.3;
    const [shell, dome] = reactorPaths();
    g.fill(dome, P.REACTOR);
    g.fillShader(dome, g.linGrad(vx0, 0, vx1, 0, R_GRAD, R_GPOS));
    g.hatch(dome, P.INK, 0.12, 'diag', 0.9);
    g.stroke(dome, 1.3);
    if (!rs.noDrive) {
      const gx0 = XR - 0.8, gx1 = XR + 0.8;
      g.fs(rect(XR - 0.25, 9.0, XR + 0.25, 9.6), P.NAVY_DARK, 1.0);
      const gb = rrect(gx0, 9.45, gx1, 10.35, 0.08);
      g.fs(gb, P.NAVY, 1.2);
      g.fillShader(gb, g.linGrad(gx0, 0, gx1, 0, NAVY_GRAD, [0, 0.4, 1]), 0.8);
      const mot = rrect(XR - 0.55, 10.35, XR + 0.55, 11.5, 0.12);
      g.fs(mot, P.REACTOR, 1.2);
      g.fillShader(mot, g.linGrad(XR - 0.55, 0, XR + 0.55, 0, R_GRAD, R_GPOS));
      for (let i = 0; i < 7; i++) g.line(XR - 0.5, 10.5 + i * 0.14, XR + 0.5, 10.5 + i * 0.14, 0.6, P.REACTOR_DEEP);
      g.stroke(mot, 1.2);
      const bx = XR + 0.55, by = 10.35;
      const on = rs.alarm || 0;
      g.fs(rect(bx - 0.1, by - 0.03, bx + 0.1, by + 0.06), P.NAVY_DARK, 0.8);
      g.fs(rrect(bx - 0.09, by + 0.06, bx + 0.09, by + 0.32, 0.08), mix('#7A3A3A', P.ALARM, on), 1.0);
    }
    const fl = rect(vx0 - 0.2, 7.75, vx1 + 0.2, 8.1);
    g.fs(fl, P.NAVY, 1.2);
    g.fillShader(fl, g.linGrad(vx0, 0, vx1, 0, NAVY_GRAD, [0, 0.4, 1]), 0.8);
    for (let i = 0; i < 23; i++) g.fill(circle(vx0 - 0.05 + i * (6.7 / 22), 7.925, 0.045), '#C9CCE6');
    g.fill(shell, P.REACTOR);
    g.fillShader(shell, g.linGrad(vx0, 0, vx1, 0, R_GRAD, R_GPOS));
    g.hatch(rect(XR + 1.6, 0.5, vx1, 7.8), P.INK, 0.2, 'diag', 0.9);
    g.hatch(rect(vx0, 0.5, vx0 + 0.5, 7.8), P.INK, 0.08, 'diag', 0.9);
    g.stroke(shell, 1.3);
    [[0.5, 0.9], [6.15, 6.42]].forEach(([y0, y1]) => {
      const b = rect(vx0 - 0.06, y0, vx1 + 0.06, y1);
      g.fs(b, P.NAVY, 1.1);
      g.fillShader(b, g.linGrad(vx0, 0, vx1, 0, NAVY_GRAD, [0, 0.4, 1]), 0.8);
      for (let i = 0; i < 31; i++) g.fill(circle(vx0 + 0.1 + i * 0.2133, (y0 + y1) / 2, 0.028), '#C9CCE6');
    });
    [2.0, 4.6].forEach(yy => [-1, 1].forEach(side => {
      const xin = XR + side * (RING_R + 0.05), xout = side < 0 ? vx0 : vx1;
      g.line(Math.min(xin, xout), yy, Math.max(xin, xout), yy, 0.6, P.REACTOR_DEEP);
    }));
    const np0 = XR - 1.45, np1 = XR + 1.45;
    g.fs(rect(np0, 6.62, np1, 7.45), '#FAF7EE', 1.3);
    g.stroke(rect(np0 + 0.07, 6.69, np1 - 0.07, 7.38), 0.7);
    [np0 + 0.14, np1 - 0.14].forEach(sx => [6.76, 7.31].forEach(sy => g.fill(circle(sx, sy, 0.03), P.INK_SOFT)));
    g.text(rs.plate || 'FABLE 5.5', XR, 6.84, 0.48, P.INK, 'slab');
    const gv = rs.gauges || [0.2, 0.25];
    [XR - 2.3, XR + 2.3].forEach((gx, i) => drawGauge(g, gx, 7.0, 0.36, gv[i], rs.alarm || 0, rs.gaugeLabels && rs.gaugeLabels[i]));
    g.fs(rect(vx0 - 0.28, MANIFOLD_Y - 0.2, vx0 + 0.02, MANIFOLD_Y + 0.2), P.NAVY, 1.0);
    const lx0 = vx1 + 0.22, lx1 = vx1 + 0.62;
    g.line(lx0, 0.5, lx0, 8.4, 1.6, P.NAVY);
    g.line(lx1, 0.5, lx1, 8.4, 1.6, P.NAVY);
    for (let i = 0; i < 27; i++) g.line(lx0, 0.8 + i * 0.28, lx1, 0.8 + i * 0.28, 1.1, P.NAVY);
    g.soft(rect(XR - 4.3, -0.16, XR + 4.3, 0), P.INK, 0.08, 0.3);
    const pl = rect(XR - 4.15, 0, XR + 4.15, 0.52);
    g.fs(pl, P.SAFETY, 1.2);
    g.save();
    g.clip(pl);
    for (let i = -2; i < 40; i++) {
      const x = XR - 4.4 + i * 0.42;
      g.fill(poly([[x, 0], [x + 0.21, 0], [x + 0.73, 0.52], [x + 0.52, 0.52]]), P.HAZARD_DARK);
    }
    g.restore();
    g.stroke(pl, 1.2);
    g.fs(rect(XR - 4.15, 0.48, XR + 4.15, 0.56), P.NAVY_DARK, 0.8);

    drawPorthole(g, rs, t);
    const sx = XR + 2.88, sy = 2.7;
    if (rs.sign === false) {
      if (rs.signMount !== false) {
        // empty bracket: the sign has not been put up yet
        [[sx - 0.25, sy + 0.55], [sx + 0.25, sy + 0.55], [sx - 0.25, sy - 0.55], [sx + 0.25, sy - 0.55]].forEach(([bx, by]) => {
          g.fs(circle(bx, by, 0.045), P.REACTOR_SHADE, 0.6);
          g.fill(circle(bx, by, 0.015), P.INK_SOFT);
        });
      }
    } else drawSign(g, sx, sy, rs.signText);
  }

  function drawSign(g, sx, sy, lines) {
    g.fs(rect(sx - 0.33, sy - 0.62, sx + 0.33, sy + 0.62), P.SAFETY, 1.0);
    g.stroke(rect(sx - 0.28, sy - 0.57, sx + 0.28, sy + 0.57), 0.6);
    g.fs(poly([[sx, sy + 0.48], [sx - 0.16, sy + 0.2], [sx + 0.16, sy + 0.2]]), P.SAFETY, 0.9);
    g.text('!', sx, sy + 0.235, 0.2, P.INK, 'slab');
    (lines || ['PLEASE', 'DO NOT', 'TAP', 'THE', 'GLASS']).forEach((ln, i) => g.text(ln, sx, sy + 0.06 - i * 0.135, 0.105, P.INK, 'slab'));
  }

  function drawGauge(g, x, y, r, v, alarm, label) {
    g.fs(circle(x, y, r), P.BRASS, 1.2);
    g.fs(circle(x, y, r * 0.8), '#FFFFFF', 0.7);
    g.stroke(arcPath(x, y, r * 0.62, -60, 60), 2.2, P.ALARM);
    for (let i = 0; i < 9; i++) {
      const a = deg(225 - i * 33.75);
      g.line(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, 0.6);
    }
    if (label) g.text(label, x, y - r * 0.42, r * 0.2, P.INK, 'slab');
    const a = deg(225 - 270 * clamp(v, 0, 1.02));
    g.line(x, y, x + Math.cos(a) * r * 0.64, y + Math.sin(a) * r * 0.64, 1.6, P.TIE_RED);
    g.fs(circle(x, y, r * 0.09), P.INK, 0.5);
    g.fill(circle(x - r * 0.35, y + r * 0.35, r * 0.18), '#FFFFFF', 0.35);
  }

  // ------------------------------------------------------------ porthole + Fable

  const CURLS = [], DROPS = [];
  (() => {
    const r = rng(21);
    for (let i = 0; i < 18; i++) {
      const a = r.uniform(0, 2 * PI);
      const rr = PORT_R * Math.sqrt(r.uniform(0.02, 1.0)) * 0.95;
      CURLS.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, r: 0.16 + 0.32 * r(), a0: r.uniform(0, 6.28),
        sp: (0.15 + 0.25 * r()) * (i % 2 ? 1 : -1), drift: 0.05 + 0.08 * r() });
    }
    for (let i = 0; i < 80; i++) {
      const a = r.uniform(0, 2 * PI);
      const rr = PORT_R * Math.sqrt(r()) * 0.97;
      DROPS.push([Math.cos(a) * rr, Math.sin(a) * rr, 0.012 + 0.03 * Math.pow(r(), 2)]);
    }
  })();

  function drawCurl(g, cx, cy, r, a0, color, a, w) {
    const pts = [];
    const n = 26;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const ang = a0 + u * 4.2, rad = r * (1 - 0.75 * u);
      pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.75]);
    }
    const tail = [0.3, 0.7].map(j => [cx + Math.cos(a0) * r + r * 0.8 * j, cy + Math.sin(a0) * r * 0.75 - 0.05 * j]);
    g.stroke(smoothPath(tail.reverse().concat(pts), false), w, color, a);
  }

  // The giant: a Clawd scaled to FABLE_W, lit by its own eyes.
  // Also used outside the porthole (breakout, finale) with {x, y, W} overrides.
  function fableFace(g, rs, t, opt) {
    opt = opt || {};
    const glow = rs.eyes || 0;
    const lunge = rs.lunge || 0;
    const W = (opt.W || FABLE_W) * (1 + 0.32 * lunge);
    const off = rs.face_off || [0, 0];
    const fx = (opt.x !== undefined ? opt.x : PORT_C[0]) + off[0];
    const fy = (opt.y !== undefined ? opt.y : PORT_C[1] - 0.28) + off[1];
    const H = 0.667 * W;
    const top = fy + 0.25 * W;
    const body = rrect(fx - W / 2, top - H, fx + W / 2, top, 0.06 * W);
    const vis = rs.face_vis !== undefined ? rs.face_vis : 0.25 + 0.75 * glow;
    g.fill(body, mix(P.MURK, P.ORANGE_DEEP, 0.55 * vis));
    const exs = [fx - 0.2917 * W, fx + 0.2917 * W];
    exs.forEach(ex => g.fillShader(body, g.radGrad(ex, fy, 1.6 * W / FABLE_W, [P.ORANGE, P.ORANGE_DEEP], [0, 1], [0.9 * glow * vis, 0])));
    g.hatch(body, P.INK, 0.12 * vis, 'diag', 1.0);
    g.stroke(body, 1.4, P.INK, 0.5 * vis);
    drawFableEyes(g, exs, fy, W, rs);
  }

  function drawFableEyes(g, exs, eyeY, W, rs) {
    const glow = rs.eyes || 0;
    const ew = 0.0833 * W, eh = 0.1667 * W;
    const op = rs.eye_open === undefined ? 1 : rs.eye_open;
    const angry = rs.angry || 0;
    const k = W / FABLE_W;
    exs.forEach((ex, i) => {
      if (rs.happy > 0.5) {
        const pts = [[ex - ew * 0.9, eyeY - eh * 0.1], [ex, eyeY + eh * 0.3], [ex + ew * 0.9, eyeY - eh * 0.1]];
        const p = poly(pts, false);
        if (glow > 0.02) g.soft(p, P.GLOW, 0.3 * k, 0.6 * glow, 'lighter');
        g.stroke(p, 5.5 * k / Math.max(g.zoomk, 0.3), glow > 0.02 ? mix(P.INK, '#F59A3A', glow) : P.INK);
        return;
      }
      const hh = eh * Math.max(op, 0.05) / 2, hw = ew / 2;
      const inner = i === 0 ? 1 : -1;
      const tl = [ex - hw, eyeY + hh - (inner < 0 ? angry * eh * 0.3 : 0)];
      const tr = [ex + hw, eyeY + hh - (inner > 0 ? angry * eh * 0.3 : 0)];
      const ep = poly([[ex - hw, eyeY - hh], [ex + hw, eyeY - hh], tr, tl]);
      if (glow > 0.02) {
        g.glow(ep, P.GLOW, 0.55 * k, 0.55 * glow);
        g.glow(ep, '#FF7A2E', 0.22 * k, 0.6 * glow);
        g.fill(ep, mix(P.INK, '#F59A3A', glow));
        g.save();
        g.clip(ep);
        g.fillShader(ep, g.linGrad(0, eyeY + hh, 0, eyeY - hh, [P.GLOW_CORE, P.GLOW, '#F28A33'], [0, 0.55, 1]), glow);
        g.soft(rect(ex - hw * 0.35, eyeY - hh * 0.6, ex + hw * 0.35, eyeY + hh * 0.5), '#FFFFFF', 0.05 * k, 0.75 * glow);
        const ty = inner < 0 ? tl[1] : tr[1];
        g.fill(rect(ex - hw * 0.45, ty - hh * 0.22, ex - hw * 0.1, ty - hh * 0.08), '#FFFFFF', 0.8 * glow);
        g.restore();
        g.stroke(ep, 1.0, '#7A3418', 0.5 * glow);
      } else g.fill(ep, P.INK, 0.6);
    });
  }

  function drawPorthole(g, rs, t) {
    const [cx, cy] = PORT_C;
    if (!g.visible(cx - RING_R, cy - RING_R, cx + RING_R, cy + RING_R)) return;
    const glassp = circle(cx, cy, PORT_R);
    if (!rs.shattered) {
      g.save();
      g.clip(glassp);
      if (rs.interior) rs.interior(g, t);
      else {
        g.fill(glassp, P.MURK);
        g.fillShader(glassp, g.radGrad(cx, cy - 0.3, PORT_R * 1.1, [P.MURK_LIGHT, P.MURK], [0, 1]));
        if (rs.level !== undefined) drawTankLevel(g, rs, t);
        if (rs.face !== false) fableFace(g, rs, t);
        if (rs.krill) rs.krill(g, t);
        const glow = rs.eyes || 0;
        CURLS.forEach((c, i) => {
          const a0 = c.a0 + t * c.sp;
          const x = cx + c.x + Math.sin(t * 0.4 + i) * c.drift * 2;
          const y = cy + c.y + Math.cos(t * 0.33 + i * 1.7) * c.drift;
          drawCurl(g, x, y, c.r, a0, mix('#B9AFCB', P.GLOW_CORE, glow * 0.6), (0.32 + 0.2 * glow) * (rs.vapour === undefined ? 1 : rs.vapour), 0.8);
        });
        g.fillShader(glassp, g.radGrad(cx, cy - 0.6, PORT_R, ['#8A7C95', '#8A7C95'], [0, 1], [0, 0.35]));
      }
      if (rs.flash > 0) g.fill(glassp, '#FFE8C0', 0.55 * rs.flash);
      if (rs.extraGlass) rs.extraGlass(g, t);
      DROPS.forEach(([dx, dy, r]) => {
        g.fill(circle(cx + dx, cy + dy, r), '#E8E4F0', 0.25);
        g.fill(circle(cx + dx - r * 0.3, cy + dy + r * 0.3, r * 0.35), '#FFFFFF', 0.4);
      });
      drawCracks(g, rs.cracks || 0);
      g.stroke(arcPath(cx, cy, PORT_R * 0.9, 110, 70), 4.0, '#FFFFFF', 0.22);
      g.stroke(poly([[cx - 0.95, cy + 0.15], [cx - 0.35, cy + 1.05]], false), 5.0, '#FFFFFF', 0.35);
      g.stroke(poly([[cx - 0.72, cy - 0.05], [cx - 0.55, cy + 0.22]], false), 3.0, '#FFFFFF', 0.25);
      g.restore();
    } else if (rs.hole) rs.hole(g, t);
    drawRing(g, rs);
  }

  function drawRing(g, rs) {
    const [cx, cy] = PORT_C;
    const ring = join(circle(cx, cy, RING_R), circle(cx, cy, PORT_R));
    g.fill(ring, P.NAVY, 1, true);
    g.fillShader(ring, g.linGrad(cx - RING_R, cy + RING_R, cx + RING_R, cy - RING_R, NAVY_GRAD, [0, 0.45, 1]), 1, true);
    g.save();
    g.clip(rect(cx, cy - RING_R, cx + RING_R, cy + RING_R));
    g.hatch(ring, P.INK, 0.25, 'diag', 0.8, 0, true);
    g.restore();
    g.stroke(circle(cx, cy, PORT_R + 0.07), 2.0, P.NAVY_DARK);
    g.stroke(circle(cx, cy, PORT_R + 0.03), 1.0, P.NAVY_LIGHT, 0.7);
    g.stroke(arcPath(cx, cy, RING_R - 0.12, 120, 60), 3.0, '#FFFFFF', 0.35);
    const popped = rs.popped || [];
    for (let i = 0; i < 16; i++) {
      const a = deg(90 + i * 22.5);
      const bx = cx + Math.cos(a) * (PORT_R + 0.27), by = cy + Math.sin(a) * (PORT_R + 0.27);
      if (popped.indexOf(i) >= 0) { g.fill(circle(bx, by, 0.06), P.INK); continue; }
      g.fs(circle(bx, by, 0.09), P.NAVY_DARK, 0.9);
      g.fill(circle(bx - 0.025, by + 0.025, 0.03), '#C9CCE6', 0.8);
    }
    g.stroke(circle(cx, cy, RING_R), 1.4);
    g.stroke(circle(cx, cy, PORT_R), 1.4);
  }

  // liquid level inside the tank (pretraining: the reactor fills up)
  function drawTankLevel(g, rs, t) {
    const [cx, cy] = PORT_C;
    const lvl = cy - PORT_R + 2 * PORT_R * clamp(rs.level);
    g.fill(rect(cx - PORT_R, lvl, cx + PORT_R, cy + PORT_R), '#1A1626', 0.85);
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const x = cx - PORT_R + (i / 40) * 2 * PORT_R;
      pts.push([x, lvl + 0.04 * Math.sin(x * 3 + t * 2)]);
    }
    pts.push([cx + PORT_R, cy - PORT_R - 1], [cx - PORT_R, cy - PORT_R - 1]);
    g.fill(poly(pts), P.MURK_LIGHT, 0.95);
    g.stroke(poly(pts.slice(0, 41), false), 1.2, '#B9AFCB', 0.6);
  }

  // ------------------------------------------------------------ cracks

  const CRACK = (() => {
    const r = rng(55);
    const c0 = [0.18, 0.28];
    const segs = [];
    const n = 11;
    for (let i = 0; i < n; i++) {
      let ang = i / n * 2 * PI + r.uniform(-0.2, 0.2);
      let x = c0[0], y = c0[1], length = 0;
      const pts = [[x, y]];
      for (;;) {
        const step = r.uniform(0.12, 0.26);
        ang += r.uniform(-0.35, 0.35);
        x += Math.cos(ang) * step;
        y += Math.sin(ang) * step;
        length += step;
        pts.push([x, y]);
        if (Math.hypot(x, y) > PORT_R * 1.05 || length > 2.8) break;
      }
      let acc = 0;
      for (let j = 0; j < pts.length - 1; j++) {
        const a = pts[j], b = pts[j + 1];
        const d0 = acc;
        acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
        let lvl = d0 < 0.45 ? 1 : d0 < 1.15 ? 2 : 3;
        if (i % 3 === 2 && lvl === 1) lvl = 2;
        segs.push({ a, b, lvl, d: d0, w: Math.max(0.5, 1.9 - acc * 0.55) });
      }
    }
    [[0.35, 1], [0.7, 2], [1.2, 3], [1.55, 3]].forEach(([ring, lvl]) => {
      let prev = null;
      const m = 18;
      for (let i = 0; i <= m; i++) {
        if (r() < 0.35 && i) { prev = null; continue; }
        const ang = i / m * 2 * PI, rr = ring * r.uniform(0.85, 1.15);
        const p = [c0[0] + Math.cos(ang) * rr, c0[1] + Math.sin(ang) * rr * 0.95];
        if (prev) segs.push({ a: prev, b: p, lvl, d: ring, w: 0.8 });
        prev = p;
      }
    });
    const chips = [];
    for (let i = 0; i < 18; i++) {
      const a = r.uniform(0, 2 * PI), rr = r.uniform(0.02, 0.2);
      chips.push([c0[0] + Math.cos(a) * rr, c0[1] + Math.sin(a) * rr, r.uniform(0.015, 0.04), r.uniform(0, 6)]);
    }
    return { c0, segs, chips };
  })();

  function drawCracks(g, level) {
    if (level <= 0) return;
    const [cx, cy] = PORT_C;
    const span = { 1: 0.45, 2: 1.15, 3: 2.8 }, start = { 1: 0, 2: 0.45, 3: 1.15 };
    CRACK.segs.forEach(s => {
      const p = clamp(level - (s.lvl - 1));
      if (p <= 0) return;
      const len = Math.max(Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]), 1e-3);
      const frac = clamp((p * 1.25 * (span[s.lvl] - start[s.lvl]) + start[s.lvl] - s.d) / len);
      if (frac <= 0) return;
      const ax = cx + s.a[0], ay = cy + s.a[1];
      const bx = cx + lerp(s.a[0], s.b[0], frac), by = cy + lerp(s.a[1], s.b[1], frac);
      g.line(ax + 0.012, ay - 0.012, bx + 0.012, by - 0.012, s.w * 1.1, '#1A1424', 0.55);
      g.line(ax, ay, bx, by, s.w, '#F4F1FA', 0.9);
    });
    const k = clamp(level);
    g.fill(circle(cx + CRACK.c0[0], cy + CRACK.c0[1], 0.07 + 0.08 * clamp(level - 1, 0, 2)), '#FFFFFF', 0.75 * k);
    CRACK.chips.forEach(([x, y, r, a]) => {
      g.save();
      g.translate(cx + x, cy + y);
      g.c.rotate(a);
      g.fill(poly([[-r, -r * 0.4], [r, -r * 0.6], [r * 0.3, r]]), '#FFFFFF', 0.6 * k);
      g.restore();
    });
  }

  // ------------------------------------------------------------ steam & dust

  // A cartoon steam/dust cloud made of puffs, spawned at t0.
  class Burst {
    constructor(o) {
      const r = rng(o.seed || 1);
      this.front = !!o.front;
      this.t0 = o.t0 || 0;
      this.color = o.color || '#FFFFFF';
      this.shade = o.shade || '#C9D4E4';
      const size = o.size, spread = o.spread, vel = o.vel || [0, 0], up = o.up === undefined ? 0.35 : o.up;
      this.puffs = [];
      for (let i = 0; i < o.n; i++) {
        const ang = r.uniform(0, 2 * PI), sp = r.uniform(0.3, 1.0);
        this.puffs.push({
          x: o.x + r.uniform(-0.1, 0.1) * size * 2, y: o.y + r.uniform(-0.1, 0.1) * size * 2,
          vx: vel[0] + Math.cos(ang) * spread * sp, vy: vel[1] + Math.sin(ang) * spread * sp * 0.7,
          r: size * r.uniform(0.55, 1.15), life: o.life * r.uniform(0.7, 1.15),
          delay: r.uniform(0, 0.12), up: up * r.uniform(0.6, 1.3),
        });
      }
    }
    circles(t) {
      const out = [];
      this.puffs.forEach(p => {
        const age = t - this.t0 - p.delay;
        if (age <= 0 || age >= p.life) return;
        const u = age / p.life;
        const mv = 1 - Math.pow(1 - Math.min(1, age / 0.6), 3);
        const x = p.x + p.vx * 0.6 * mv + p.vx * 0.08 * age;
        const y = p.y + p.vy * 0.6 * mv + p.up * age * age * 0.6;
        const grow = easeOut(Math.min(1, age / 0.35));
        const shrink = 1 - smooth(clamp((u - 0.55) / 0.45));
        const r = p.r * (0.35 + 0.65 * grow) * (0.25 + 0.75 * shrink) * (1 + 0.4 * u);
        if (r > 0.004) out.push([x, y, r]);
      });
      return out;
    }
    draw(g, t) {
      const cs = this.circles(t);
      drawPuffs(g, cs, this.color, this.shade);
    }
  }

  function drawPuffs(g, cs, color, shadeCol) {
    if (!cs.length) return;
    const c = g.c;
    c.lineWidth = g.lw(2.4);
    c.strokeStyle = X.css(P.INK);
    cs.forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 2 * PI); c.stroke(); });
    c.fillStyle = X.css(color || '#FFFFFF');
    cs.forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 2 * PI); c.fill(); });
    cs.forEach(([x, y, r]) => {
      g.fill(circle(x + r * 0.22, y - r * 0.25, r * 0.62), shadeCol || '#C9D4E4', 0.55);
      g.fill(circle(x - r * 0.3, y + r * 0.32, r * 0.25), '#FFFFFF', 0.8);
    });
    c.fillStyle = X.css(color || '#FFFFFF');
    cs.forEach(([x, y, r]) => { c.beginPath(); c.arc(x - r * 0.1, y + r * 0.1, r * 0.55, 0, 2 * PI); c.fill(); });
  }

  CL.Lab = {
    PODS, XR, PORT_C, PORT_R, RING_R, FABLE_W, MANIFOLD_Y, CEIL, COLUMNS, LAMPS,
    podDoor, drawWall, drawCeiling, drawFloor, floorXY, pipeH, pipeV, drawPipes, drawLamp, lampPos, lampsOf, drawLightCones,
    drawPodBody, drawPod, drawWheel, drawReactor, drawSign, drawGauge, drawPorthole, drawRing, fableFace, drawFableEyes,
    drawCracks, drawCurl, Burst, drawPuffs, CURLS, CRACK,
  };
})(window.CL = window.CL || {});
