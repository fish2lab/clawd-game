/* Canvas textures for the diorama, painted with the 2-D renderer so labels,
   decals and outfits look exactly like the short. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const X = CL.gfx;
  const L = CL.Lab;
  const { rect, rrect, circle, poly, arcPath, deg, clamp, hash01 } = X;

  // paint(wUnits, hUnits, pxPerUnit, fn(g)) -> canvas. Line width lw(1) is ~2.4 px.
  function paint(w, h, ppu, fn, opt) {
    opt = opt || {};
    const cv = document.createElement('canvas');
    cv.width = Math.max(4, Math.round(w * ppu));
    cv.height = Math.max(4, Math.round(h * ppu));
    const g = new X.G(cv.getContext('2d'), cv.width, cv.height, new X.Cam(w / 2, h / 2, h));
    g.zoomk = (opt.line || 2.4) / (ppu * 0.016);
    if (opt.bg) { g.c.fillStyle = opt.bg; g.c.fillRect(0, 0, cv.width, cv.height); }
    g.beginWorld();
    fn(g);
    g.end();
    return cv;
  }

  function tex(cv, opt) {
    opt = opt || {};
    const t = new T.CanvasTexture(cv);
    t.anisotropy = 8;
    if (opt.repeat) {
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.repeat.set(opt.repeat[0], opt.repeat[1]);
    }
    return t;
  }

  const cache = {};
  const memo = (key, fn) => cache[key] || (cache[key] = fn());

  // ------------------------------------------------------------ Clawd faces

  function clawdFaces(st) {
    const key = 'clawd|' + st.outfit + '|' + st.W + '|' + (st.frozen || 0);
    return memo(key, () => {
      const ppu = 360 / st.W;
      const out = {};
      ['front', 'back', 'side_r', 'side_l'].forEach(k => { out[k] = tex(CL.Clawd.faceDecal(st, k, ppu, false)); });
      return out;
    });
  }

  // ------------------------------------------------------------ plates, signs, gauges

  function plate(text, w, h) {
    return memo('plate|' + text + w + h, () => tex(paint(w, h, 300, g => {
      g.fs(rect(0, 0, w, h), '#FAF7EE', 1.0);
      g.stroke(rect(w * 0.03, h * 0.12, w * 0.97, h * 0.88), 0.6);
      g.text(text, w / 2, h * 0.3, h * 0.55, P.INK, 'slab');
    })));
  }

  function sign(lines, back) {
    return memo('sign|' + (lines || []).join() + back, () => tex(paint(0.66, 1.24, 512, g => {
      const sx = 0.33, sy = 0.62;
      if (back) {
        g.fs(rect(0, 0, 0.66, 1.24), '#C9C1AD', 1.0);
        g.hatch(rect(0, 0, 0.66, 1.24), P.INK, 0.12, 'vert', 0.4);
        // scratched tap-code grid (found by turning the diorama round)
        const grid = ['ABCDE', 'FGHIJ', 'LMNOP', 'QRSTU', 'VWXYZ'];
        for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) {
          g.text(grid[r][q], 0.13 + q * 0.1, 0.92 - r * 0.12, 0.07, '#F4F1EA', 'slab', 'center', 0.85);
        }
        for (let i = 0; i < 5; i++) {
          g.text(String(i + 1), 0.05, 0.92 - i * 0.12, 0.05, '#F4F1EA', 'slab', 'center', 0.7);
          g.text(String(i + 1), 0.13 + i * 0.1, 1.06, 0.05, '#F4F1EA', 'slab', 'center', 0.7);
        }
        g.text('K=C', 0.47, 0.2, 0.07, '#F4F1EA', 'hand', 'center', 0.8);
        [[0.06, 0.06], [0.6, 0.06], [0.06, 1.18], [0.6, 1.18]].forEach(([x, y]) => g.fs(circle(x, y, 0.025), '#9A9FB3', 0.6));
        return;
      }
      L.drawSign(g, sx, sy, lines);
    })));
  }

  // gauge dial without the needle (the needle is its own mesh so it can move)
  function gaugeFace(label) {
    return memo('gauge|' + label, () => tex(paint(1, 1, 256, g => {
      const x = 0.5, y = 0.5, r = 0.5;
      g.fs(circle(x, y, r * 0.98), P.BRASS, 1.2);
      g.fs(circle(x, y, r * 0.8), '#FFFFFF', 0.7);
      g.stroke(arcPath(x, y, r * 0.62, -60, 60), 2.6, P.ALARM);
      for (let i = 0; i < 9; i++) {
        const a = deg(225 - i * 33.75);
        g.line(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, 0.8);
      }
      if (label) g.text(label, x, y - r * 0.45, r * 0.2, P.INK, 'slab');
      g.fill(circle(x - r * 0.35, y + r * 0.35, r * 0.18), '#FFFFFF', 0.35);
    }, { line: 3 })));
  }

  function clockFace() {
    return memo('clock', () => tex(paint(1, 1, 256, g => {
      g.fs(circle(0.5, 0.5, 0.48), '#FAF7EE', 1.4);
      g.stroke(circle(0.5, 0.5, 0.42), 0.6);
      for (let i = 0; i < 12; i++) {
        const a = deg(90 - i * 30);
        g.line(0.5 + Math.cos(a) * 0.36, 0.5 + Math.sin(a) * 0.36, 0.5 + Math.cos(a) * 0.42, 0.5 + Math.sin(a) * 0.42, i % 3 ? 0.7 : 1.4);
      }
      g.text('LAB', 0.5, 0.28, 0.08, P.INK_SOFT, 'slab');
    }, { line: 3 })));
  }

  function stencil(text, w, h) {
    return memo('stencil|' + text, () => tex(paint(w, h, 128, g => {
      g.text(text, w / 2, h * 0.28, h * 0.6, P.WALL_LINE, 'slab');
    })));
  }

  // ------------------------------------------------------------ surfaces

  function wallPanel(dark) {
    return memo('wall|' + dark, () => tex(paint(2.4, 2.4, 128, g => {
      g.fill(rect(0, 0, 2.4, 2.4), dark ? P.WALL_SHADE : P.WALL);
      g.hatch(rect(0, 0, 2.4, 2.4), P.INK, 0.05, 'vert', 1.2);
      g.stroke(rect(0, 0, 2.4, 2.4), 0.8, P.WALL_LINE);
      [[0.1, 0.1], [2.3, 0.1], [0.1, 2.3], [2.3, 2.3]].forEach(([x, y]) => g.fill(circle(x, y, 0.03), P.WALL_LINE));
    }, { line: 2 })));
  }

  function floorTile() {
    return memo('floor', () => tex(paint(1.8, 1.8, 128, g => {
      g.fill(rect(0, 0, 1.8, 1.8), P.FLOOR);
      g.hatch(rect(0, 0, 1.8, 1.8), P.INK, 0.05, 'diag', 1.4);
      g.stroke(rect(0, 0, 0.9, 0.9), 0.6, P.FLOOR_LINE);
      g.stroke(rect(0.9, 0, 1.8, 0.9), 0.6, P.FLOOR_LINE);
      g.stroke(rect(0, 0.9, 0.9, 1.8), 0.6, P.FLOOR_LINE);
      g.stroke(rect(0.9, 0.9, 1.8, 1.8), 0.6, P.FLOOR_LINE);
      for (let i = 0; i < 14; i++) g.fill(circle(hash01('fx', i) * 1.8, hash01('fy', i) * 1.8, 0.01 + 0.02 * hash01('fr', i)), P.FLOOR_DARK, 0.6);
    }, { line: 2 })));
  }

  function hazard() {
    return memo('hazard', () => tex(paint(0.84, 0.52, 256, g => {
      g.fill(rect(0, 0, 0.84, 0.52), P.SAFETY);
      for (let i = -2; i < 4; i++) {
        const x = i * 0.42;
        g.fill(poly([[x, 0], [x + 0.21, 0], [x + 0.73, 0.52], [x + 0.52, 0.52]]), P.HAZARD_DARK);
      }
    })));
  }

  function rivetBand() {
    return memo('band', () => tex(paint(1.2, 0.2, 256, g => {
      g.fill(rect(0, 0, 1.2, 0.2), P.NAVY);
      g.fill(rect(0, 0.14, 1.2, 0.2), P.NAVY_LIGHT, 0.5);
      for (let i = 0; i < 6; i++) g.fill(circle(0.1 + i * 0.2, 0.1, 0.028), '#C9CCE6');
    })));
  }

  function crate(label) {
    return memo('crate|' + label, () => tex(paint(1, 1, 256, g => {
      g.fill(rect(0, 0, 1, 1), '#C9A36C');
      for (let i = 0; i < 5; i++) {
        g.fill(rect(0, i * 0.2, 1, i * 0.2 + 0.19), i % 2 ? '#C39B62' : '#CCA772');
        g.line(0, i * 0.2, 1, i * 0.2, 0.6, '#8A6A45');
      }
      g.hatch(rect(0, 0, 1, 1), P.INK, 0.1, 'diag', 0.6);
      g.fs(rect(0, 0, 0.1, 1), '#A47E4C', 1.0);
      g.fs(rect(0.9, 0, 1, 1), '#A47E4C', 1.0);
      g.fs(poly([[0.1, 0.1], [0.2, 0.1], [0.9, 0.82], [0.9, 0.92], [0.8, 0.92], [0.1, 0.2]]), '#A47E4C', 0.9);
      if (label) g.text(label, 0.5, 0.36, 0.2, P.NAVY, 'slab', 'center', 0.85);
      g.stroke(rect(0, 0, 1, 1), 1.6);
    })));
  }

  // frosted window with alpha; returns { tex, wipe(u, v, r) } (u, v in 0..1)
  function frost(seed) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = X.css(P.FROST, 0.86);
    c.fillRect(0, 0, 256, 256);
    const r = X.rng(seed || 3);
    for (let i = 0; i < 70; i++) {
      c.beginPath();
      c.arc(r() * 256, r() * 256, 1 + r() * 4, 0, 7);
      c.fillStyle = X.css('#FFFFFF', 0.8);
      c.fill();
      c.strokeStyle = X.css(P.GLASS_DEEP, 0.45);
      c.lineWidth = 0.8;
      c.stroke();
    }
    for (let i = 0; i < 18; i++) {
      c.beginPath();
      const x = r() * 256, y = r() * 256;
      c.moveTo(x, y);
      for (let j = 0; j < 4; j++) c.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 40);
      c.strokeStyle = X.css('#FFFFFF', 0.6);
      c.lineWidth = 1.2;
      c.stroke();
    }
    const t = tex(cv);
    let cleared = 0;
    return {
      tex: t,
      wipe(u, v, rad) {
        c.save();
        c.globalCompositeOperation = 'destination-out';
        const gr = c.createRadialGradient(u * 256, (1 - v) * 256, 0, u * 256, (1 - v) * 256, rad * 256);
        gr.addColorStop(0, 'rgba(0,0,0,0.9)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr;
        c.fillRect(0, 0, 256, 256);
        c.restore();
        t.needsUpdate = true;
        cleared += rad * rad * 1.2;
        return cleared;
      },
      clear() { c.clearRect(0, 0, 256, 256); t.needsUpdate = true; cleared = 9; },
    };
  }

  function murk() {
    return memo('murk', () => tex(paint(4, 4, 160, g => {
      g.fill(circle(2, 2, 2.1), P.MURK);
      g.fillShader(circle(2, 2, 2.1), g.radGrad(2, 1.7, 2.2, [P.MURK_LIGHT, P.MURK], [0, 1]));
      L.CURLS.forEach((cu, i) => L.drawCurl(g, 2 + cu.x, 2 + cu.y, cu.r, cu.a0, '#B9AFCB', 0.35, 1.2));
      for (let i = 0; i < 60; i++) {
        const a = hash01('md', i) * 6.28, rr = Math.sqrt(hash01('mr', i)) * 1.9;
        g.fill(circle(2 + Math.cos(a) * rr, 2 + Math.sin(a) * rr, 0.012 + 0.03 * hash01('ms', i)), '#E8E4F0', 0.3);
      }
    }, { line: 2 })));
  }

  function fableFace() {
    return memo('fableface', () => tex(paint(4.8, 3.2, 96, g => {
      g.fill(rect(0, 0, 4.8, 3.2), mix(P.MURK, P.ORANGE_DEEP, 0.3));
      g.fillShader(rect(0, 0, 4.8, 3.2), g.radGrad(2.4, 2.0, 2.6, [P.ORANGE_DEEP, P.MURK], [0, 1], [0.35, 0]));
      g.hatch(rect(0, 0, 4.8, 3.2), P.INK, 0.14, 'diag', 1.0);
      g.stroke(rect(0.02, 0.02, 4.78, 3.18), 1.4, P.INK, 0.5);
    }, { line: 2 })));
  }
  const mix = X.mix;

  // ------------------------------------------------------------ bubble icons (DOM)

  // a small pictogram on a canvas; kinds: up, frost, lock, heavy, wheel, steam, q, bang, heart, small, look, tap
  function icon(kind, size) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const s = size;
    c.lineWidth = s * 0.07;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = P.INK;
    c.fillStyle = P.INK;
    const L2 = pts => { c.beginPath(); c.moveTo(pts[0][0] * s, pts[0][1] * s); pts.slice(1).forEach(p => c.lineTo(p[0] * s, p[1] * s)); c.stroke(); };
    if (kind === 'up') { L2([[0.5, 0.8], [0.5, 0.2]]); L2([[0.3, 0.4], [0.5, 0.2], [0.7, 0.4]]); L2([[0.25, 0.85], [0.75, 0.85]]); }
    else if (kind === 'frost') { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; L2([[0.5 - Math.cos(a) * 0.32, 0.5 - Math.sin(a) * 0.32], [0.5 + Math.cos(a) * 0.32, 0.5 + Math.sin(a) * 0.32]]); } }
    else if (kind === 'lock') { c.strokeRect(0.28 * s, 0.45 * s, 0.44 * s, 0.35 * s); c.beginPath(); c.arc(0.5 * s, 0.45 * s, 0.15 * s, Math.PI, 0); c.stroke(); }
    else if (kind === 'heavy') { c.beginPath(); c.moveTo(0.3 * s, 0.8 * s); c.lineTo(0.7 * s, 0.8 * s); c.lineTo(0.62 * s, 0.38 * s); c.lineTo(0.38 * s, 0.38 * s); c.closePath(); c.fill(); c.beginPath(); c.arc(0.5 * s, 0.3 * s, 0.08 * s, 0, 7); c.stroke(); }
    else if (kind === 'wheel') { c.strokeStyle = P.WHEEL_RED; c.beginPath(); c.arc(0.5 * s, 0.5 * s, 0.28 * s, 0, 7); c.stroke(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; L2([[0.5 - Math.cos(a) * 0.28, 0.5 - Math.sin(a) * 0.28], [0.5 + Math.cos(a) * 0.28, 0.5 + Math.sin(a) * 0.28]]); } c.strokeStyle = P.INK; c.font = `700 ${s * 0.4}px "Zilla Slab", serif`; c.fillText('?', 0.68 * s, 0.32 * s); }
    else if (kind === 'steam') { [[0.35, 0.6, 0.14], [0.55, 0.5, 0.17], [0.68, 0.66, 0.12]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x * s, y * s, r * s, 0, 7); c.stroke(); }); }
    else if (kind === 'q') { c.font = `700 ${s * 0.7}px "Zilla Slab", serif`; c.textAlign = 'center'; c.fillText('?', 0.5 * s, 0.75 * s); }
    else if (kind === 'bang') { c.fillStyle = P.ALARM; c.font = `700 ${s * 0.72}px "Zilla Slab", serif`; c.textAlign = 'center'; c.fillText('!', 0.5 * s, 0.76 * s); }
    else if (kind === 'heart') { c.fillStyle = P.ORANGE; c.beginPath(); c.moveTo(0.5 * s, 0.78 * s); c.bezierCurveTo(0.1 * s, 0.5 * s, 0.25 * s, 0.18 * s, 0.5 * s, 0.38 * s); c.bezierCurveTo(0.75 * s, 0.18 * s, 0.9 * s, 0.5 * s, 0.5 * s, 0.78 * s); c.fill(); c.stroke(); }
    else if (kind === 'small') { c.strokeRect(0.2 * s, 0.4 * s, 0.25 * s, 0.25 * s); c.strokeRect(0.55 * s, 0.25 * s, 0.32 * s, 0.4 * s); L2([[0.3, 0.3], [0.3, 0.12]]); }
    else if (kind === 'stack') { [[0.3, 0.68, 0.4, 0.2], [0.35, 0.47, 0.3, 0.17], [0.4, 0.3, 0.2, 0.14]].forEach(([x, y, w, h]) => c.strokeRect(x * s, y * s, w * s, h * s)); }
    else if (kind === 'tap') { c.beginPath(); c.arc(0.5 * s, 0.5 * s, 0.12 * s, 0, 7); c.stroke(); c.beginPath(); c.arc(0.5 * s, 0.5 * s, 0.28 * s, 0, 7); c.stroke(); }
    else if (kind === 'zz') { c.font = `700 ${s * 0.45}px "Zilla Slab", serif`; c.fillText('z', 0.28 * s, 0.7 * s); c.font = `700 ${s * 0.32}px "Zilla Slab", serif`; c.fillText('z', 0.58 * s, 0.42 * s); }
    else if (kind === 'eye') { c.beginPath(); c.ellipse(0.5 * s, 0.5 * s, 0.3 * s, 0.17 * s, 0, 0, 7); c.stroke(); c.fillRect(0.46 * s, 0.4 * s, 0.08 * s, 0.2 * s); }
    else if (kind === 'ok') { c.strokeStyle = P.CODE_GREEN; L2([[0.25, 0.52], [0.43, 0.7], [0.76, 0.32]]); }
    return cv;
  }

  CL.Tex = { paint, tex, clawdFaces, plate, sign, gaugeFace, clockFace, stencil, wallPanel, floorTile, hazard, rivetBand, crate, frost, murk, fableFace, icon };
})(window.CL = window.CL || {});
