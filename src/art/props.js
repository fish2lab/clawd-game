/* New props for the game, drawn with the same rules as the short:
   flat fills, ink outlines, light hatching on the shaded side, rivets on metal.
   All coordinates are world units (y-up, Opus is one unit wide). */
(function (CL) {
  'use strict';
  const P = CL.P;
  const X = CL.gfx;
  const L = CL.Lab;
  const { rect, rrect, circle, ellipse, poly, smoothPath, arcPath, join, mix, clamp, lerp, hash01, deg, rng } = X;
  const PI = Math.PI;
  const NAVY_GRAD = [P.NAVY_LIGHT, P.NAVY, P.NAVY_DARK];
  const POD_GRAD = ['#FFFFFF', P.POD, P.POD, P.POD_SHADE, P.POD_DEEP];
  const POD_GPOS = [0, 0.22, 0.5, 0.82, 1];

  // ------------------------------------------------------------ shared bits

  function navyBox(g, x0, y0, x1, y1, r, w) {
    const p = rrect(x0, y0, x1, y1, r || 0.04);
    g.fs(p, P.NAVY, w || 1.1);
    g.fillShader(p, g.linGrad(x0, 0, x1, 0, NAVY_GRAD, [0, 0.4, 1]), 0.8);
    g.stroke(p, w || 1.1);
    return p;
  }

  function creamBox(g, x0, y0, x1, y1, r, w) {
    const p = rrect(x0, y0, x1, y1, r || 0.04);
    g.fill(p, P.POD);
    g.fillShader(p, g.linGrad(x0, 0, x1, 0, POD_GRAD, POD_GPOS), 0.85);
    g.hatch(rect(lerp(x0, x1, 0.72), y0, x1, y1), P.INK, 0.14, 'diag', 0.5);
    g.stroke(p, w || 1.1);
    return p;
  }

  function rivets(g, x0, x1, y, n, r) {
    for (let i = 0; i < n; i++) g.fill(circle(lerp(x0, x1, n > 1 ? i / (n - 1) : 0.5), y, r || 0.025), '#C9CCE6');
  }

  // comic speech bubble with a tail pointing at (tx, ty)
  function bubble(g, x, y, text, o) {
    o = o || {};
    const size = o.size || 0.16;
    const font = o.font || 'slab';
    const tw = g.textWidth(text, size, font);
    const pad = size * 0.55;
    const w = tw + pad * 2, h = size * 1.55;
    const x0 = x - w / 2, y0 = y - h / 2;
    const body = rrect(x0, y0, x0 + w, y0 + h, h * 0.45);
    const tx = o.tx === undefined ? x - w * 0.2 : o.tx, ty = o.ty === undefined ? y0 - h * 0.7 : o.ty;
    const bx = clamp(tx, x0 + h * 0.4, x0 + w - h * 0.4);
    const tail = poly([[bx - h * 0.18, y0 + 0.01], [tx, ty], [bx + h * 0.22, y0 + 0.01]]);
    g.fs(tail, o.fill || '#FFFFFF', 1.2);
    g.fs(body, o.fill || '#FFFFFF', 1.2);
    g.fill(rect(bx - h * 0.16, y0 - 0.004, bx + h * 0.2, y0 + h * 0.12), o.fill || '#FFFFFF');
    g.text(text, x, y - size * 0.34, size, o.color || P.INK, font);
  }

  // onomatopoeia, outlined
  function sfx(g, x, y, text, size, color, rot, a) {
    g.text(text, x, y, size, color || '#FFFFFF', 'zh', 'center', a === undefined ? 1 : a, rot || 0, P.INK, size * 0.12);
  }

  function rings(g, x, y, r, n, color, a) {
    for (let i = 0; i < (n || 3); i++) {
      const rr = r * (0.4 + 0.3 * i);
      g.stroke(circle(x, y, rr), 1.2 - 0.25 * i, color || '#FFFFFF', (a || 0.8) * (1 - i * 0.25));
    }
  }

  function speedLines(g, x, y, dirx, n, len, a) {
    for (let i = 0; i < n; i++) {
      const yy = y + (i - n / 2) * 0.07;
      const l = len * (0.5 + 0.5 * hash01('sl', i, x));
      g.line(x, yy, x - dirx * l, yy, 1.0, P.INK, a || 0.5);
    }
  }

  // curved motion arrow around (x, y)
  function motionArc(g, x, y, r, a0, a1, w, color) {
    g.stroke(arcPath(x, y, r, a0, a1 - a0), w || 1.4, color || P.INK, 0.75);
    const ae = deg(a1), dir = a1 > a0 ? 1 : -1;
    const tip = [x + Math.cos(ae) * r, y + Math.sin(ae) * r];
    const tg = [-Math.sin(ae) * dir, Math.cos(ae) * dir];
    const nrm = [Math.cos(ae), Math.sin(ae)];
    const s = r * 0.28;
    g.fill(poly([[tip[0] + tg[0] * s, tip[1] + tg[1] * s], [tip[0] + nrm[0] * s * 0.55, tip[1] + nrm[1] * s * 0.55], [tip[0] - nrm[0] * s * 0.55, tip[1] - nrm[1] * s * 0.55]]), color || P.INK, 0.75);
  }

  // dashed brass outline marking something you can use
  function highlight(g, path, a) {
    const c = g.c;
    c.save();
    c.setLineDash([g.lw(3), g.lw(3)]);
    g.stroke(path, 2.2, P.BRASS_LIGHT, a === undefined ? 0.95 : a);
    c.restore();
  }

  // ------------------------------------------------------------ Fable outside the porthole

  // The giant as a full Clawd (used once it is out of the reactor).
  function fable(o) {
    return CL.Clawd.CS(Object.assign({ W: L.FABLE_W, name: 'fable', shadow: true }, o));
  }

  // glowing eyes on a giant Clawd's face (front view). x = body centre, y = feet.
  function fableEyesAt(g, st, rs) {
    const W = st.W, LEG = 0.1667 * W;
    const eyeY = st.y + st.lift + LEG + 0.4167 * W;
    L.drawFableEyes(g, [st.x - 0.2917 * W, st.x + 0.2917 * W], eyeY, W, rs);
  }

  // murk running down the giant's body (front view). st is the giant's CS.
  function drips(g, st, a) {
    const W = st.W, LEG = 0.1667 * W, Hh = 0.6667 * W;
    const x0 = st.x - W / 2, top = st.y + st.lift + LEG + Hh;
    g.save();
    g.clip(rrect(x0, st.y + st.lift + LEG, x0 + W, top, 0.035 * W));
    for (let i = 0; i < 9; i++) {
      const x = x0 + W * (0.04 + 0.92 * hash01('dr', i));
      const len = Hh * (0.1 + 0.38 * hash01('drl', i));
      const wd = W * (0.006 + 0.01 * hash01('drw', i));
      const p = new Path2D();
      p.moveTo(x - wd, top);
      p.lineTo(x - wd, top - len);
      p.arc(x, top - len, wd, PI, 0, false);
      p.lineTo(x + wd, top);
      p.closePath();
      g.fill(p, P.MURK, 0.55 * (a === undefined ? 1 : a));
    }
    g.fill(rect(x0, top - Hh * 0.06, x0 + W, top), P.MURK, 0.45 * (a === undefined ? 1 : a));
    g.restore();
  }

  // ------------------------------------------------------------ breakout: shards + gush

  const SHARDS = (() => {
    const r = rng(77);
    const out = [];
    for (let i = 0; i < 26; i++) {
      const a = r.uniform(0, 2 * PI);
      out.push({ a, d: r.uniform(0.6, 1.0), s: r.uniform(0.12, 0.42), spin: r.uniform(-3, 3), k: r.uniform(0.6, 1.3) });
    }
    return out;
  })();

  function shards(g, cx, cy, u) {
    SHARDS.forEach((s, i) => {
      const dist = (L.PORT_R * 0.7 + 3.4 * u * s.k) * s.d;
      const x = cx + Math.cos(s.a) * dist, y = cy + Math.sin(s.a) * dist * 0.85 - 1.2 * u * u * s.k;
      const sz = s.s * (1 + 0.8 * u);
      g.save();
      g.translate(x, y);
      g.c.rotate(s.spin * u + s.a);
      const p = poly([[-sz, -sz * 0.3], [sz * 0.8, -sz * 0.5], [sz * 0.2, sz * 0.7]]);
      g.fs(p, '#DDE6F2', 0.9, 0.85);
      g.fill(poly([[-sz * 0.6, -sz * 0.2], [sz * 0.3, -sz * 0.35], [0, 0]]), '#FFFFFF', 0.7);
      g.restore();
    });
  }

  // murky liquid pouring out of the porthole onto the floor
  function gush(g, cx, cy, u, t) {
    const lip = cy - L.PORT_R * 0.75;
    const col = mix(P.MURK_LIGHT, P.ORANGE_DEEP, 0.25);
    const pts = [];
    const spread = 2.4 + 3.2 * u;
    for (let i = 0; i <= 24; i++) {
      const v = i / 24;
      const x = cx - 1.1 + 2.2 * v;
      pts.push([x, lip + 0.15 * Math.sin(v * 9 + t * 4)]);
    }
    const right = [], left = [];
    for (let i = 0; i <= 12; i++) {
      const v = i / 12;
      const y = lerp(lip, -0.35, v);
      const w = 1.1 + spread * v * v;
      right.push([cx + w + 0.1 * Math.sin(v * 7 + t * 3), y]);
      left.unshift([cx - w - 0.1 * Math.sin(v * 6 + t * 2.5), y]);
    }
    const sheet = poly(pts.concat(right, [[cx + 1.1 + spread + 0.6, -0.9], [cx - 1.1 - spread - 0.6, -0.9]], left));
    g.fill(sheet, col, 0.92);
    g.fillShader(sheet, g.linGrad(0, lip, 0, -0.9, [P.MURK, col, P.MURK_LIGHT], [0, 0.5, 1]), 0.7);
    g.hatch(sheet, P.INK, 0.12, 'diag', 0.8);
    g.stroke(sheet, 1.3);
    // streaks and floating letters carried out with the liquid
    for (let i = 0; i < 14; i++) {
      const v = hash01('gs', i);
      const x = cx - 1.0 + 2.0 * v, y = lerp(lip, 0, hash01('gy', i));
      g.line(x, y + 0.3, x + (x - cx) * 0.15, y - 0.25, 1.0, '#B9AFCB', 0.5);
    }
    'theofandtoainis'.split('').forEach((ch, i) => {
      const x = cx + (hash01('gl', i) - 0.5) * (2 + 4 * u), y = lerp(-0.6, lip, hash01('glv', i));
      g.text(ch, x, y, 0.16 + 0.1 * hash01('gz', i), P.GLOW_CORE, 'slab', 'center', 0.55);
    });
    // splashes at floor level
    const cs = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1;
      const v = hash01('sp', i);
      cs.push([cx + side * (1.5 + spread * 0.9 * v), -0.35 + 0.3 * hash01('spy', i), 0.12 + 0.18 * hash01('spr', i)]);
    }
    L.drawPuffs(g, cs, mix(P.MURK_LIGHT, '#FFFFFF', 0.35), P.MURK_LIGHT);
  }

  // ------------------------------------------------------------ pretraining: corpus, conveyor, elevator, hopper

  const BOOK_COLS = [P.NAVY, P.ORANGE, P.BRASS, P.WHEEL_RED, P.HOODIE, P.CODE_GREEN, P.BLAZER, P.ORANGE_DARK, '#6C5A8E'];

  function book(g, x, y, w, h, colr, tilt, label) {
    g.save();
    g.translate(x, y);
    if (tilt) g.rotate(tilt);
    const p = rrect(-w / 2, 0, w / 2, h, Math.min(w, h) * 0.08);
    g.fs(p, colr, 1.0);
    g.fill(rect(-w / 2, h * 0.08, w / 2, h * 0.16), '#FFFFFF', 0.35);
    g.fill(rect(-w / 2, h * 0.82, w / 2, h * 0.9), '#FFFFFF', 0.35);
    g.hatch(rect(w * 0.1, 0, w / 2, h), P.INK, 0.15, 'diag', 0.3);
    if (label) g.text(label, 0, h * 0.42, Math.min(w * 0.5, 0.11), '#FFFFFF', 'slab', 'center', 0.9, 90);
    g.restore();
  }

  // one item on the belt; kind: book | stack | scroll | paper | cards | spam | dup
  function corpusItem(g, kind, x, y, s, i) {
    const c = BOOK_COLS[i % BOOK_COLS.length];
    if (kind === 'stack') {
      for (let j = 0; j < 4; j++) {
        const w = s * (0.95 - 0.08 * (j % 2)), h = s * 0.16;
        const p = rrect(x - w / 2 + 0.02 * (j % 2), y + j * h, x + w / 2 + 0.02 * (j % 2), y + (j + 1) * h, 0.01);
        g.fs(p, BOOK_COLS[(i + j * 3) % BOOK_COLS.length], 0.9);
        g.fill(rect(x + w * 0.32, y + j * h + 0.01, x + w / 2 - 0.02, y + (j + 1) * h - 0.01), '#F7F1E1');
      }
    } else if (kind === 'book') {
      book(g, x, y, s * 0.42, s * 0.9, c, 0, '');
    } else if (kind === 'scroll') {
      const p = rrect(x - s * 0.5, y, x + s * 0.5, y + s * 0.26, s * 0.13);
      g.fs(p, '#F2E6C8', 1.0);
      g.fs(ellipse(x + s * 0.5, y + s * 0.13, s * 0.08, s * 0.13), '#E2D1A6', 0.9);
      g.line(x - s * 0.3, y + s * 0.13, x + s * 0.3, y + s * 0.13, 0.6, P.INK_SOFT, 0.6);
    } else if (kind === 'paper') {
      const p = poly([[x - s * 0.45, y], [x + s * 0.45, y], [x + s * 0.4, y + s * 0.5], [x - s * 0.48, y + s * 0.46]]);
      g.fs(p, '#F7F4EA', 1.0);
      for (let j = 0; j < 4; j++) g.line(x - s * 0.35, y + s * (0.1 + 0.09 * j), x + s * 0.3, y + s * (0.1 + 0.09 * j), 0.5, P.INK_SOFT, 0.7);
      g.text('NEWS', x, y + s * 0.37, s * 0.1, P.INK, 'slab');
    } else if (kind === 'cards') {
      const p = rrect(x - s * 0.35, y, x + s * 0.35, y + s * 0.4, 0.01);
      g.fs(p, '#E8D9A8', 1.0);
      for (let j = 0; j < 5; j++) g.line(x - s * 0.35, y + s * 0.08 * j, x + s * 0.35, y + s * 0.08 * j, 0.4, P.INK_SOFT, 0.6);
      for (let j = 0; j < 6; j++) g.fill(rect(x - s * 0.25 + j * s * 0.09, y + s * 0.3, x - s * 0.22 + j * s * 0.09, y + s * 0.35), P.INK);
    } else if (kind === 'spam') {
      const p = poly([[x - s * 0.42, y], [x + s * 0.44, y + 0.02], [x + s * 0.38, y + s * 0.55], [x - s * 0.4, y + s * 0.5]]);
      g.fs(p, '#F6B8B0', 1.0);
      g.text('SPAM', x, y + s * 0.2, s * 0.2, P.ALARM, 'slab', 'center', 1, -8);
      g.text('!!!', x, y + s * 0.38, s * 0.13, P.INK, 'slab');
    } else if (kind === 'dup') {
      book(g, x, y, s * 0.42, s * 0.9, c, 0, '');
      g.save();
      g.translate(x, y + s * 0.45);
      g.rotate(-14);
      g.stroke(rrect(-s * 0.3, -s * 0.1, s * 0.3, s * 0.1, 0.02), 1.4, P.ALARM);
      g.text('DUP', 0, -s * 0.06, s * 0.14, P.ALARM, 'slab');
      g.restore();
    }
  }

  // conveyor from x0 to x1 with its belt top at y
  function conveyor(g, x0, x1, y, items, t) {
    for (let x = x0 + 0.3; x < x1; x += 1.4) {
      g.fs(rect(x - 0.05, -0.3, x + 0.05, y - 0.12), P.NAVY_DARK, 0.9);
      g.fs(rect(x - 0.16, -0.36, x + 0.16, -0.28), P.NAVY, 0.8);
    }
    navyBox(g, x0, y - 0.18, x1, y, 0.06);
    for (let x = x0 + 0.15; x < x1; x += 0.3) g.fs(circle(x, y - 0.09, 0.055), P.POD_SHADE, 0.6);
    const belt = rect(x0, y, x1, y + 0.05);
    g.fs(belt, '#3B3550', 0.9);
    for (let x = x0 + ((t * 0.6) % 0.25); x < x1; x += 0.25) g.line(x, y, x, y + 0.05, 0.5, P.INK_SOFT, 0.7);
    items.forEach((it, i) => corpusItem(g, it[0], it[1], y + 0.05, it[2] || 0.5, i));
  }

  // vertical bucket elevator carrying the corpus up to the hopper
  function elevator(g, x, y0, y1, t) {
    const w = 0.7;
    const shaft = rect(x - w / 2, y0, x + w / 2, y1);
    g.fill(shaft, P.NAVY_DARK);
    g.fillShader(shaft, g.linGrad(x - w / 2, 0, x + w / 2, 0, NAVY_GRAD, [0, 0.4, 1]), 0.7);
    g.stroke(shaft, 1.2);
    for (let y = y0 + ((t * 0.5) % 0.55); y < y1 - 0.3; y += 0.55) {
      const b = poly([[x - 0.26, y], [x + 0.26, y], [x + 0.3, y + 0.24], [x - 0.3, y + 0.24]]);
      g.fs(b, P.BRASS, 0.9);
      g.fill(rect(x - 0.18, y + 0.24, x - 0.05, y + 0.36), BOOK_COLS[Math.floor(y * 3) % BOOK_COLS.length]);
      g.fill(rect(x - 0.02, y + 0.24, x + 0.16, y + 0.32), '#F2E6C8');
    }
    g.fill(rect(x - w / 2, y0, x - w / 2 + 0.08, y1), '#FFFFFF', 0.12);
    for (let y = y0 + 0.4; y < y1; y += 0.9) {
      g.fs(rect(x - w / 2 - 0.06, y - 0.04, x + w / 2 + 0.06, y + 0.04), P.NAVY, 0.8);
    }
    g.text('CORPUS', x, y0 + 1.3, 0.18, P.POD, 'slab', 'center', 0.9, 90);
  }

  // hopper funnel sitting on the reactor dome, fed by a chute from the elevator
  function hopper(g, xe, ytop, t) {
    const XR = L.XR;
    const chute = poly([[xe, ytop - 0.1], [xe + 0.2, ytop + 0.25], [XR - 0.5, 10.75], [XR - 0.7, 10.45]]);
    g.fs(chute, P.NAVY, 1.1);
    g.hatch(chute, P.INK, 0.2, 'diag', 0.5);
    const f = poly([[XR - 1.05, 11.2], [XR + 1.05, 11.2], [XR + 0.3, 10.0], [XR - 0.3, 10.0]]);
    g.fill(f, P.REACTOR);
    g.fillShader(f, g.linGrad(XR - 1.05, 0, XR + 1.05, 0, ['#EFE9DC', P.REACTOR, P.REACTOR_SHADE, P.REACTOR_DEEP], [0, 0.3, 0.8, 1]));
    g.hatch(rect(XR + 0.2, 10, XR + 1.1, 11.2), P.INK, 0.2, 'diag', 0.6);
    g.stroke(f, 1.3);
    g.fs(rect(XR - 1.12, 11.15, XR + 1.12, 11.32), P.NAVY, 1.0);
    rivets(g, XR - 1.0, XR + 1.0, 11.235, 9, 0.025);
    g.fs(rect(XR - 0.32, 9.35, XR + 0.32, 10.02), P.NAVY_DARK, 1.0);
    // pages fluttering in
    for (let i = 0; i < 7; i++) {
      const u = (t * 0.7 + i / 7) % 1;
      const x = lerp(XR - 0.9, XR, u) + 0.2 * Math.sin(i * 3 + t);
      const y = lerp(11.6, 10.4, u);
      g.save();
      g.translate(x, y);
      g.rotate(40 * Math.sin(t * 2 + i));
      g.fs(rect(-0.09, -0.06, 0.09, 0.06), i % 3 ? '#F7F4EA' : BOOK_COLS[i], 0.6);
      g.restore();
    }
  }

  // operator lectern with levers and a small readout
  function lectern(g, x, levers, readout) {
    const top = 1.35;
    const body = poly([[x - 0.42, -0.3], [x + 0.42, -0.3], [x + 0.5, top], [x - 0.5, top]]);
    g.fs(body, P.NAVY, 1.2);
    g.fillShader(body, g.linGrad(x - 0.5, 0, x + 0.5, 0, NAVY_GRAD, [0, 0.4, 1]), 0.8);
    g.hatch(rect(x + 0.1, -0.3, x + 0.5, top), P.INK, 0.2, 'diag', 0.5);
    g.stroke(body, 1.2);
    const deck = poly([[x - 0.56, top], [x + 0.56, top], [x + 0.62, top + 0.22], [x - 0.62, top + 0.22]]);
    g.fs(deck, P.POD, 1.1);
    const scr = rrect(x - 0.36, 0.55, x + 0.36, 1.12, 0.04);
    g.fs(scr, '#11213A', 1.0);
    (readout || []).forEach((ln, i) => g.text(ln, x - 0.3, 0.98 - i * 0.15, 0.1, i === 0 ? P.SCREEN : P.CODE_GREEN, 'mono', 'left'));
    (levers || [0, 0.5, 1]).forEach((v, i) => {
      const lx = x - 0.34 + i * 0.34;
      const a = deg(lerp(-40, 40, v));
      const hx = lx + Math.sin(a) * 0.42, hy = top + 0.18 + Math.cos(a) * 0.42;
      g.fs(rect(lx - 0.07, top + 0.1, lx + 0.07, top + 0.2), P.NAVY_DARK, 0.8);
      g.line(lx, top + 0.18, hx, hy, 2.4, P.INK_SOFT);
      g.fs(circle(hx, hy, 0.07), [P.WHEEL_RED, P.BRASS, P.CODE_GREEN][i % 3], 1.0);
    });
  }

  // bin for filtered-out junk
  function bin(g, x, label, items) {
    const p = poly([[x - 0.55, -0.35], [x + 0.55, -0.35], [x + 0.62, 0.75], [x - 0.62, 0.75]]);
    g.fs(p, P.SAFETY, 1.2);
    g.save();
    g.clip(p);
    for (let i = -4; i < 8; i++) g.fill(poly([[x - 0.8 + i * 0.28, -0.35], [x - 0.66 + i * 0.28, -0.35], [x - 0.3 + i * 0.28, 0.0], [x - 0.44 + i * 0.28, 0.0]]), P.HAZARD_DARK);
    g.restore();
    g.stroke(p, 1.2);
    g.fs(rect(x - 0.66, 0.72, x + 0.66, 0.82), P.NAVY_DARK, 0.9);
    g.fs(rect(x - 0.42, 0.22, x + 0.42, 0.52), '#FAF7EE', 0.8);
    g.text(label, x, 0.31, 0.13, P.INK, 'slab');
    (items || []).forEach((it, i) => corpusItem(g, it[0], x + it[1], 0.76 + (it[2] || 0), 0.42, i + 3));
  }

  // letters drifting in the tank like krill
  const KRILL = (() => {
    const r = rng(101);
    const words = 'the of and to in is was that for on with as by it at from his her they be this have or one had not but what all were when we there can an which their said if do will each about how up out them then she many some so these would other into has more two like him see time could no make than first been its who now people my made over did down only way find use may water long little very after words called just where most know'.split(' ');
    const out = [];
    for (let i = 0; i < 70; i++) {
      const a = r.uniform(0, 2 * PI), rr = L.PORT_R * Math.sqrt(r()) * 0.95;
      const isWord = r() < 0.35;
      out.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, s: isWord ? 0.12 + 0.08 * r() : 0.1 + 0.16 * r(),
        txt: isWord ? words[Math.floor(r() * words.length)] : 'abcdefghijklmnoprstuvwyeeaaoti'.charAt(Math.floor(r() * 30)),
        rot: r.uniform(-40, 40), sp: r.uniform(0.2, 0.6), ph: r.uniform(0, 6) });
    }
    return out;
  })();

  function krill(g, t, opt) {
    opt = opt || {};
    const [cx, cy] = L.PORT_C;
    const top = opt.level !== undefined ? cy - L.PORT_R + 2 * L.PORT_R * opt.level : 99;
    KRILL.forEach((k, i) => {
      const x = cx + k.x + 0.08 * Math.sin(t * k.sp + k.ph);
      const y = cy + k.y + 0.06 * Math.cos(t * k.sp * 0.8 + k.ph);
      if (y > top - 0.05) return;
      const a = (opt.a || 0.75) * (0.4 + 0.6 * hash01('ka', i));
      g.text(k.txt, x, y, k.s, P.GLOW_CORE, 'slab', 'center', a, k.rot);
    });
  }

  // ------------------------------------------------------------ SFT: stool, easel, flashcards

  function stool(g, x, y, h) {
    const w = 0.9;
    const legs = [[x - w / 2 + 0.05, y], [x + w / 2 - 0.05, y]];
    legs.forEach(([lx]) => g.fs(poly([[lx - 0.06, y], [lx + 0.06, y], [lx + 0.03 * Math.sign(x - lx), y + h], [lx - 0.03 * Math.sign(x - lx) - 0.06 * Math.sign(lx - x), y + h]]), P.BACKPACK_DARK, 1.0));
    g.fs(rrect(x - w / 2, y + h - 0.12, x + w / 2, y + h, 0.03), P.BACKPACK, 1.1);
    g.fs(rrect(x - w / 2 + 0.06, y + h * 0.45 - 0.08, x + w / 2 - 0.06, y + h * 0.45, 0.02), P.BACKPACK, 1.0);
    g.hatch(rect(x + 0.1, y + h * 0.45 - 0.08, x + w / 2, y + h), P.INK, 0.15, 'diag', 0.4);
  }

  const TAP_GRID = ['ABCDE', 'FGHIJ', 'LMNOP', 'QRSTU', 'VWXYZ'];

  function tapChart(g, x, y, s) {
    s = s || 1;
    const w = 1.5 * s, h = 1.5 * s;
    g.fs(rect(x - w / 2, y - h / 2, x + w / 2, y + h / 2), P.PAPER, 1.0);
    g.text('TAP CODE', x, y + h / 2 - 0.2 * s, 0.13 * s, P.INK, 'slab');
    const c = 0.2 * s;
    for (let r = 0; r < 5; r++) {
      g.text(String(r + 1), x - 2.9 * c, y + 0.38 * s - r * c - 0.04 * s, 0.1 * s, P.WHEEL_RED, 'slab');
      g.text(String(r + 1), x - 2 * c + r * c, y + 0.56 * s, 0.1 * s, P.WHEEL_RED, 'slab');
      for (let q = 0; q < 5; q++) g.text(TAP_GRID[r][q], x - 2 * c + q * c, y + 0.38 * s - r * c - 0.04 * s, 0.11 * s, P.INK, 'slab');
    }
    g.text('K = C', x + 0.45 * s, y - h / 2 + 0.08 * s, 0.1 * s, P.INK_SOFT, 'hand');
  }

  // easel with a flip chart of demonstrations (prompt -> response)
  function easel(g, x, y, rows) {
    const w = 1.9, h = 2.0, top = y + 2.9;
    [[-0.7, 0.9], [0.7, -0.9]].forEach(([dx, sk]) => g.line(x + dx, y, x + dx * 0.4 + sk * 0.05, top + 0.1, 2.4, '#8A6A45'));
    g.line(x, y + 0.2, x, top, 2.0, '#7A5C3B');
    g.fs(rect(x - w / 2 - 0.06, top - h - 0.1, x + w / 2 + 0.06, top - h - 0.02), '#8A6A45', 0.9);
    const sheet = rect(x - w / 2, top - h, x + w / 2, top);
    g.fs(sheet, P.PAPER, 1.1);
    g.fs(rect(x - w / 2 - 0.05, top - 0.08, x + w / 2 + 0.05, top + 0.05), P.NAVY, 0.9);
    g.text('DEMONSTRATIONS', x, top - 0.3, 0.14, P.INK, 'slab');
    g.line(x - w / 2 + 0.15, top - 0.38, x + w / 2 - 0.15, top - 0.38, 0.6);
    (rows || []).forEach((rw, i) => {
      const yy = top - 0.62 - i * 0.36;
      g.text(rw[0], x - 0.42, yy, 0.17, P.INK, 'hand');
      g.text('→', x, yy, 0.16, P.WHEEL_RED, 'slab');
      g.text(rw[1], x + 0.45, yy, 0.17, P.INK, 'hand');
      if (rw[2]) g.stroke(poly([[x + 0.78, yy + 0.06], [x + 0.83, yy], [x + 0.93, yy + 0.14]], false), 1.4, P.CODE_GREEN);
    });
  }

  // flashcard held up (centre x, y)
  function flashcard(g, x, y, text, s, rot, back) {
    s = s || 0.5;
    g.save();
    g.translate(x, y);
    if (rot) g.rotate(rot);
    const p = rrect(-s * 0.7, -s * 0.48, s * 0.7, s * 0.48, s * 0.06);
    g.fs(p, back ? '#E9DFC4' : P.PAPER, 1.1);
    if (back) {
      g.hatch(p, P.INK, 0.12, 'cross', 0.3);
      g.text('SFT', 0, -s * 0.12, s * 0.32, P.INK_SOFT, 'slab');
    } else {
      g.stroke(rrect(-s * 0.6, -s * 0.38, s * 0.6, s * 0.38, s * 0.04), 0.6, P.WHEEL_RED);
      g.text(text, 0, -s * 0.12, s * 0.32, P.INK, 'hand');
    }
    g.restore();
  }

  // ------------------------------------------------------------ RL: reward dispenser, scoreboard, patch panel

  function dispenser(g, x, y, t, pour) {
    // glass globe of glowing reward pellets on a navy stand, chute into the shell
    g.fs(rect(x - 0.08, y - 1.1, x + 0.08, y - 0.4), P.NAVY_DARK, 1.0);
    g.fs(poly([[x - 0.06, y - 1.12], [x + 0.06, y - 1.12], [x + 0.32, y - 1.42], [x + 0.2, y - 1.5]]), P.NAVY, 0.9);
    navyBox(g, x - 0.4, y - 0.48, x + 0.4, y - 0.08, 0.06);
    g.fs(rect(x - 0.12, y - 0.36, x + 0.12, y - 0.2), P.BRASS, 0.8);
    const gl = circle(x, y + 0.42, 0.55);
    g.fill(gl, P.GLASS, 0.45);
    g.save();
    g.clip(gl);
    const r = rng(9);
    for (let i = 0; i < 60; i++) {
      const px = x + r.uniform(-0.5, 0.5), py = y - 0.1 + r.uniform(0, 0.75);
      g.fs(circle(px, py, 0.07), mix(P.GLOW, P.ORANGE, r() * 0.5), 0.5);
      g.fill(circle(px - 0.02, py + 0.02, 0.022), '#FFFFFF', 0.7);
    }
    g.restore();
    g.stroke(gl, 1.2);
    g.stroke(arcPath(x, y + 0.42, 0.45, 110, 60), 2.4, '#FFFFFF', 0.5);
    g.fs(rrect(x - 0.2, y + 0.92, x + 0.2, y + 1.06, 0.03), P.NAVY, 0.9);
    g.text('REWARD', x, y - 0.42, 0.11, P.POD, 'slab');
    if (pour > 0) {
      for (let i = 0; i < 14; i++) {
        const u = (t * 1.6 + i / 14) % 1;
        const px = x + 0.26 + 0.25 * u + 0.04 * Math.sin(i * 5), py = y - 1.5 - 1.1 * u * u;
        g.fs(circle(px, py, 0.06), P.GLOW, 0.5, pour);
      }
    }
  }

  function scoreboard(g, x, y, digits, checks) {
    const w = 2.6, h = 1.4;
    navyBox(g, x - w / 2, y - h / 2, x + w / 2, y + h / 2, 0.08, 1.3);
    rivets(g, x - w / 2 + 0.12, x + w / 2 - 0.12, y + h / 2 - 0.1, 10, 0.025);
    g.text('REWARD', x, y + 0.36, 0.17, P.POD, 'slab');
    const n = digits.length;
    for (let i = 0; i < n; i++) {
      const dx = x - (n - 1) * 0.27 + i * 0.54;
      g.fs(rrect(dx - 0.22, y - 0.42, dx + 0.22, y + 0.2, 0.04), '#F3EEE3', 0.9);
      g.line(dx - 0.22, y - 0.11, dx + 0.22, y - 0.11, 0.6, P.POD_DEEP);
      g.text(digits[i], dx, y - 0.34, 0.44, P.INK, 'slab');
    }
    (checks || []).forEach((on, i) => {
      const lx = x - 0.6 + i * 0.6, ly = y - h / 2 - 0.32;
      g.fs(circle(lx, ly, 0.17), on ? P.CODE_GREEN : '#355A45', 1.1);
      if (on) g.glow(circle(lx, ly, 0.17), P.CODE_GREEN, 0.12, 0.7);
      g.text('✓', lx, ly - 0.08, 0.2, on ? '#FFFFFF' : '#5E7A68', 'sans');
    });
  }

  function patchPanel(g, x, y, plugs) {
    const w = 1.5, h = 1.9;
    creamBox(g, x - w / 2, y - h / 2, x + w / 2, y + h / 2, 0.05, 1.2);
    g.fs(rect(x - w / 2, y + h / 2 - 0.3, x + w / 2, y + h / 2), P.NAVY, 1.0);
    g.text('TEST WIRING', x, y + h / 2 - 0.22, 0.12, P.POD, 'slab');
    const labelsL = ['GLASS VIB', 'BELL', 'VALVE'], labelsR = ['TEST 1', 'TEST 2', 'TEST 3'];
    const pos = {};
    labelsL.forEach((lb, i) => {
      const yy = y + 0.35 - i * 0.45;
      g.text(lb, x - 0.36, yy + 0.11, 0.075, P.INK, 'slab');
      g.fs(circle(x - 0.36, yy, 0.07), P.INK, 0.6);
      pos['L' + i] = [x - 0.36, yy];
    });
    labelsR.forEach((lb, i) => {
      const yy = y + 0.35 - i * 0.45;
      g.text(lb, x + 0.38, yy + 0.11, 0.075, P.INK, 'slab');
      g.fs(circle(x + 0.38, yy, 0.07), P.INK, 0.6);
      pos['R' + i] = [x + 0.38, yy];
    });
    (plugs || []).forEach(([a, b, colr, loose]) => {
      const p0 = pos[a], p1 = b ? pos[b] : [p0[0] + 0.5, p0[1] - 0.9];
      const cab = new Path2D();
      cab.moveTo(p0[0], p0[1]);
      cab.bezierCurveTo(p0[0] + 0.1, p0[1] - 0.5, p1[0] - 0.1, p1[1] - 0.5, p1[0], p1[1]);
      g.stroke(cab, 3.4, P.INK);
      g.stroke(cab, 2.4, colr);
      g.fs(circle(p0[0], p0[1], 0.05), colr, 0.8);
      if (!loose) g.fs(circle(p1[0], p1[1], 0.05), colr, 0.8);
      else g.fs(rrect(p1[0] - 0.04, p1[1] - 0.1, p1[0] + 0.04, p1[1] + 0.02, 0.02), P.BRASS, 0.8);
    });
  }

  // a vibration pickup clamped onto the porthole ring, with its cable
  function vibSensor(g, ang, cableTo) {
    const [cx, cy] = L.PORT_C;
    const a = deg(ang);
    const x = cx + Math.cos(a) * (L.PORT_R + 0.2), y = cy + Math.sin(a) * (L.PORT_R + 0.2);
    const cab = new Path2D();
    cab.moveTo(x, y);
    cab.bezierCurveTo(x + 0.6, y - 1.2, cableTo[0] - 2.5, 0.2, cableTo[0], cableTo[1]);
    g.stroke(cab, 3.0, P.INK);
    g.stroke(cab, 2.0, P.WHEEL_RED);
    g.fs(rrect(x - 0.2, y - 0.14, x + 0.2, y + 0.14, 0.04), P.WHEEL_RED, 1.1);
    g.fs(circle(x, y, 0.05), P.ALARM, 0.6);
    g.text('VIB', x, y - 0.11, 0.07, '#FFFFFF', 'slab');
  }

  // ------------------------------------------------------------ distillation: aquarium, whale, fish, still

  // the whale: navy body, cream pleated belly, Clawd slit eye. (x, y) = body centre, len = length
  function whale(g, x, y, len, o) {
    o = o || {};
    const dir = o.dir || 1;
    const h = len * 0.42;
    g.save();
    g.translate(x, y);
    g.scale(dir, 1);
    if (o.tilt) g.rotate(o.tilt);
    const body = new Path2D();
    body.moveTo(len * 0.5, h * 0.1);
    body.bezierCurveTo(len * 0.5, h * 0.62, len * 0.2, h * 0.6, -len * 0.05, h * 0.5);
    body.bezierCurveTo(-len * 0.3, h * 0.4, -len * 0.45, h * 0.15, -len * 0.62, h * 0.05);
    body.lineTo(-len * 0.62, -h * 0.02);
    body.bezierCurveTo(-len * 0.45, -h * 0.05, -len * 0.25, -h * 0.45, len * 0.05, -h * 0.48);
    body.bezierCurveTo(len * 0.35, -h * 0.5, len * 0.5, -h * 0.35, len * 0.5, h * 0.1);
    body.closePath();
    // tail flukes
    const tail = new Path2D();
    tail.moveTo(-len * 0.6, h * 0.02);
    tail.bezierCurveTo(-len * 0.72, h * 0.3, -len * 0.82, h * 0.42, -len * 0.92, h * 0.36);
    tail.bezierCurveTo(-len * 0.84, h * 0.18, -len * 0.8, h * 0.06, -len * 0.74, h * 0.02);
    tail.bezierCurveTo(-len * 0.8, -h * 0.06, -len * 0.86, -h * 0.2, -len * 0.94, -h * 0.26);
    tail.bezierCurveTo(-len * 0.8, -h * 0.28, -len * 0.7, -h * 0.12, -len * 0.6, h * 0.0);
    tail.closePath();
    g.fs(tail, P.WHALE, 1.3);
    g.fs(body, P.WHALE, 1.3);
    g.fillShader(body, g.linGrad(0, h * 0.6, 0, -h * 0.5, ['#FFFFFF', P.WHALE, P.NAVY_DARK], [0, 0.35, 1]), 0.35);
    // belly with pleats
    g.save();
    g.clip(body);
    const belly = new Path2D();
    belly.moveTo(len * 0.52, -h * 0.02);
    belly.bezierCurveTo(len * 0.3, -h * 0.12, 0, -h * 0.2, -len * 0.4, -h * 0.05);
    belly.lineTo(-len * 0.4, -h * 0.6);
    belly.lineTo(len * 0.6, -h * 0.6);
    belly.closePath();
    g.fs(belly, P.WHALE_BELLY, 1.0);
    for (let i = 0; i < 7; i++) {
      const yy = -h * 0.16 - i * h * 0.05;
      g.line(len * 0.45 - i * 0.02, yy, -len * 0.2 + i * len * 0.04, yy + h * 0.06, 0.7, P.POD_DEEP, 0.9);
    }
    g.hatch(rect(-len, -h, len, -h * 0.1), P.INK, 0.12, 'diag', 0.6);
    g.restore();
    g.stroke(body, 1.3);
    // mouth line
    if (o.mouth) {
      const m = new Path2D();
      m.moveTo(len * 0.5, -h * 0.02);
      m.bezierCurveTo(len * 0.35, -h * 0.02 - o.mouth * h * 0.3, len * 0.15, -h * 0.05 - o.mouth * h * 0.2, len * 0.08, -h * 0.08);
      g.stroke(m, 1.2);
    }
    // flipper
    const fl = poly([[len * 0.12, -h * 0.25], [len * 0.0, -h * 0.62], [-len * 0.06, -h * 0.58], [len * 0.02, -h * 0.22]]);
    g.fs(fl, P.WHALE, 1.1);
    // Clawd eye slit
    const ex = len * 0.3, ey = h * 0.08;
    if (o.happy) g.stroke(poly([[ex - h * 0.06, ey - h * 0.02], [ex, ey + h * 0.06], [ex + h * 0.06, ey - h * 0.02]], false), 1.8);
    else {
      g.fill(rect(ex - h * 0.035, ey - h * 0.08, ex + h * 0.035, ey + h * 0.08), P.INK);
      g.fill(rect(ex, ey + h * 0.035, ex + h * 0.02, ey + h * 0.06), '#FFFFFF', 0.8);
    }
    // blowhole
    g.fs(ellipse(len * 0.08, h * 0.5, h * 0.06, h * 0.025), P.NAVY_DARK, 0.8);
    g.restore();
    return [x + dir * len * 0.08, y + h * 0.5];
  }

  // the small fish: a Clawd with a tail
  function fish(g, x, y, s, o) {
    o = o || {};
    const dir = o.dir || 1;
    g.save();
    g.translate(x, y);
    g.scale(dir, 1);
    if (o.tilt) g.rotate(o.tilt);
    const w = s, h = s * 0.667;
    const tail = poly([[-w * 0.45, 0], [-w * 0.85, h * 0.45], [-w * 0.75, 0], [-w * 0.85, -h * 0.45]]);
    g.fs(tail, P.ORANGE_DARK, 1.0);
    const body = rrect(-w / 2, -h / 2, w / 2, h / 2, 0.06 * w);
    g.fill(body, P.ORANGE);
    g.fillShader(body, g.linGrad(0, h / 2, 0, -h / 2, [X.shade(P.ORANGE, 1.1), X.shade(P.ORANGE, 0.92)]), 0.55);
    g.hatch(rect(-w / 2, -h / 2, w / 2, -h * 0.05), P.INK, 0.07, 'diag', 0.3);
    g.stroke(body, 1.1);
    g.fs(poly([[-w * 0.1, h / 2], [w * 0.15, h * 0.85], [w * 0.25, h / 2]]), P.ORANGE_DARK, 0.9);
    const ew = 0.0833 * w, eh = 0.1667 * w;
    [w * 0.05, w * 0.33].forEach(ex => {
      if (o.happy) g.stroke(poly([[ex - ew, h * 0.05], [ex, h * 0.18], [ex + ew, h * 0.05]], false), 1.2);
      else g.fill(rect(ex - ew / 2, h * 0.1 - eh / 2, ex + ew / 2, h * 0.1 + eh / 2), P.INK);
    });
    g.restore();
  }

  function waterSpout(g, x, y0, y1, t, w) {
    w = w || 0.22;
    const col = rect(x - w / 2, y0, x + w / 2, y1);
    g.fill(col, '#E8F4FA', 0.95);
    g.fillShader(col, g.linGrad(x - w / 2, 0, x + w / 2, 0, ['#FFFFFF', '#CFE6F2', P.WATER], [0, 0.5, 1]), 0.8);
    g.line(x - w / 2, y0, x - w / 2, y1, 1.0);
    g.line(x + w / 2, y0, x + w / 2, y1, 1.0);
    for (let y = y0 + ((t * 2) % 0.3); y < y1; y += 0.3) g.line(x - w * 0.2, y, x - w * 0.2, y + 0.12, 0.8, '#FFFFFF', 0.9);
    const cs = [];
    for (let i = 0; i < 9; i++) {
      const a = PI * (0.1 + 0.8 * hash01('wsp', i));
      cs.push([x + Math.cos(a) * (w * 1.6 + 0.15 * hash01('wr', i)), y1 + Math.sin(a) * 0.18, 0.08 + 0.09 * hash01('wz', i)]);
    }
    cs.push([x, y1 + 0.05, 0.18]);
    L.drawPuffs(g, cs, '#FFFFFF', '#CFE0EE');
  }

  function aquarium(g, x0, x1, y0, y1, t, inner) {
    // cabinet
    const cab = rect(x0 - 0.1, -0.3, x1 + 0.1, y0);
    g.fs(cab, '#8A6A45', 1.2);
    g.hatch(rect(lerp(x0, x1, 0.7), -0.3, x1 + 0.1, y0), P.INK, 0.18, 'diag', 0.5);
    [lerp(x0, x1, 0.25), lerp(x0, x1, 0.75)].forEach(cx => {
      g.stroke(rrect(cx - (x1 - x0) * 0.2, -0.15, cx + (x1 - x0) * 0.2, y0 - 0.15, 0.04), 0.8, '#5E4630');
      g.fs(circle(cx + (x1 - x0) * 0.15, (y0 - 0.3) / 2, 0.04), P.BRASS, 0.6);
    });
    // water
    const tank = rect(x0, y0, x1, y1);
    const wl = y1 - 0.35;
    const water = rect(x0, y0, x1, wl);
    g.fill(tank, '#EAF2F4', 0.6);
    g.fill(water, P.WATER);
    g.fillShader(water, g.linGrad(0, wl, 0, y0, ['#A8D3DE', P.WATER, P.WATER_DEEP], [0, 0.45, 1]));
    g.save();
    g.clip(tank);
    // caustics
    for (let i = 0; i < 18; i++) {
      const cx = lerp(x0, x1, hash01('cx', i)) + 0.2 * Math.sin(t + i);
      const cy = lerp(y0 + 0.4, wl - 0.2, hash01('cy', i));
      g.stroke(smoothPath([[cx - 0.25, cy], [cx - 0.05, cy + 0.08], [cx + 0.2, cy - 0.02], [cx + 0.32, cy + 0.06]], false), 0.8, '#FFFFFF', 0.25);
    }
    // sand + weeds
    const sand = [];
    for (let i = 0; i <= 20; i++) sand.push([lerp(x0, x1, i / 20), y0 + 0.28 + 0.08 * Math.sin(i * 1.7)]);
    sand.push([x1, y0 - 0.1], [x0, y0 - 0.1]);
    g.fs(poly(sand), '#E6D3A3', 0.9);
    g.hatch(poly(sand), P.INK, 0.1, 'diag', 0.4);
    [0.08, 0.15, 0.86, 0.93].forEach((u, i) => {
      const wx = lerp(x0, x1, u);
      const pts = [];
      for (let j = 0; j < 6; j++) pts.push([wx + 0.12 * Math.sin(j * 1.3 + t + i), y0 + 0.3 + j * 0.28 * (0.8 + 0.3 * (i % 2))]);
      g.stroke(smoothPath(pts, false), 3.2, P.INK, 0.9);
      g.stroke(smoothPath(pts, false), 2.2, '#5E9A6E');
    });
    if (inner) inner(g, t, wl);
    for (let i = 0; i < 16; i++) {
      const bx = lerp(x0 + 0.2, x1 - 0.2, hash01('bb', i)), by = lerp(y0 + 0.3, wl, (hash01('bby', i) + t * 0.2) % 1);
      g.stroke(circle(bx, by, 0.025 + 0.03 * hash01('br', i)), 0.6, '#FFFFFF', 0.7);
    }
    // surface
    const surf = [];
    for (let i = 0; i <= 30; i++) surf.push([lerp(x0, x1, i / 30), wl + 0.03 * Math.sin(i * 1.4 + t * 3)]);
    g.stroke(poly(surf, false), 1.2, '#FFFFFF', 0.85);
    // glass reflections
    g.fill(poly([[x0 + 0.3, y0], [x0 + 0.45, y0], [x0 + 1.2, y1], [x0 + 1.05, y1]]), '#FFFFFF', 0.18);
    g.fill(poly([[x0 + 0.6, y0], [x0 + 0.66, y0], [x0 + 1.41, y1], [x0 + 1.35, y1]]), '#FFFFFF', 0.15);
    g.restore();
    // navy frame with rivets
    const fr = join(rect(x0 - 0.14, y0 - 0.14, x1 + 0.14, y1 + 0.14), rect(x0, y0, x1, y1));
    g.fill(fr, P.NAVY, 1, true);
    g.fillShader(fr, g.linGrad(x0, 0, x1, 0, NAVY_GRAD, [0, 0.45, 1]), 0.8, true);
    g.stroke(rect(x0 - 0.14, y0 - 0.14, x1 + 0.14, y1 + 0.14), 1.3);
    g.stroke(rect(x0, y0, x1, y1), 1.1);
    for (let i = 0; i < 14; i++) {
      const xx = lerp(x0 - 0.07, x1 + 0.07, i / 13);
      g.fill(circle(xx, y1 + 0.07, 0.025), '#C9CCE6');
      g.fill(circle(xx, y0 - 0.07, 0.025), '#C9CCE6');
    }
    // lid with a little hatch and the ledge for the key
    g.fs(rect(x0 - 0.2, y1 + 0.14, x1 + 0.2, y1 + 0.28), P.NAVY_DARK, 1.0);
  }

  function plaque(g, x, y, text, w) {
    w = w || 1.6;
    g.fs(rect(x - w / 2, y - 0.14, x + w / 2, y + 0.14), '#FAF7EE', 1.0);
    g.stroke(rect(x - w / 2 + 0.04, y - 0.1, x + w / 2 - 0.04, y + 0.1), 0.5);
    g.text(text, x, y - 0.05, 0.12, P.INK, 'slab');
  }

  function desk(g, x, w) {
    const top = 1.05;
    g.fs(rect(x - w / 2, top - 0.1, x + w / 2, top), '#9A7650', 1.2);
    g.fs(rect(x - w / 2 + 0.1, -0.3, x - w / 2 + 0.22, top - 0.1), '#7A5C3B', 1.0);
    g.fs(rect(x + w / 2 - 0.22, -0.3, x + w / 2 - 0.1, top - 0.1), '#7A5C3B', 1.0);
    g.fs(rect(x + w / 2 - 0.9, 0.3, x + w / 2 - 0.22, top - 0.1), '#8A6A45', 1.0);
    g.fs(circle(x + w / 2 - 0.56, 0.62, 0.04), P.BRASS, 0.6);
  }

  function deskLamp(g, x, y, on) {
    g.fs(ellipse(x, y + 0.03, 0.22, 0.05), P.NAVY, 1.0);
    g.line(x, y + 0.05, x + 0.18, y + 0.6, 2.2, P.NAVY_DARK);
    g.line(x + 0.18, y + 0.6, x + 0.48, y + 0.72, 2.2, P.NAVY_DARK);
    const sh = poly([[x + 0.36, y + 0.82], [x + 0.62, y + 0.66], [x + 0.6, y + 0.48], [x + 0.32, y + 0.62]]);
    g.fs(sh, P.WHEEL_RED, 1.0);
    if (on) g.glow(circle(x + 0.5, y + 0.55, 0.08), '#FFF2C8', 0.1, 0.9);
  }

  function microscope(g, x, y) {
    g.fs(rrect(x - 0.2, y, x + 0.2, y + 0.08, 0.02), P.NAVY_DARK, 1.0);
    g.line(x - 0.1, y + 0.08, x - 0.1, y + 0.5, 2.4, P.NAVY);
    g.fs(poly([[x - 0.12, y + 0.48], [x + 0.08, y + 0.62], [x + 0.14, y + 0.54], [x - 0.06, y + 0.4]]), P.POD, 1.0);
    g.fs(rect(x - 0.02, y + 0.22, x + 0.18, y + 0.26), P.NAVY_LIGHT, 0.8);
  }

  // copper still: boiler -> swan neck -> coil condenser -> drip
  function still(g, x, t, temp) {
    g.fs(rect(x - 0.5, -0.3, x + 0.5, 0.25), P.NAVY_DARK, 1.1);
    for (let i = 0; i < 5; i++) {
      const fx = x - 0.3 + i * 0.15;
      g.fs(poly([[fx - 0.05, 0.25], [fx + 0.05, 0.25], [fx + 0.01 * Math.sin(t * 9 + i), 0.42 + 0.05 * Math.sin(t * 11 + i)]]), P.GLOW, 0.5);
    }
    const boil = circle(x, 0.95, 0.62);
    g.fill(boil, P.COPPER);
    g.fillShader(boil, g.radGrad(x - 0.25, 1.2, 0.9, [P.COPPER_LIGHT, P.COPPER, '#7E4428'], [0, 0.5, 1]));
    g.hatch(rect(x + 0.1, 0.3, x + 0.7, 1.6), P.INK, 0.18, 'diag', 0.5);
    g.stroke(boil, 1.3);
    rivets(g, x - 0.5, x + 0.5, 0.95, 8, 0.025);
    g.fs(rect(x - 0.12, 1.5, x + 0.12, 1.7), P.COPPER, 1.0);
    const neck = new Path2D();
    neck.moveTo(x, 1.65);
    neck.bezierCurveTo(x + 0.1, 2.5, x + 1.0, 2.6, x + 1.5, 1.95);
    g.stroke(neck, 9, P.INK);
    g.stroke(neck, 6.8, P.COPPER);
    g.stroke(neck, 2, P.COPPER_LIGHT, 0.7);
    // condenser jar with coil
    const jar = rrect(x + 1.2, 0.35, x + 2.0, 1.95, 0.08);
    g.fill(jar, P.GLASS, 0.5);
    for (let i = 0; i < 6; i++) {
      const yy = 1.75 - i * 0.22;
      g.stroke(ellipse(x + 1.6, yy, 0.28, 0.07), 3.6, P.INK);
      g.stroke(ellipse(x + 1.6, yy, 0.28, 0.07), 2.4, P.COPPER_LIGHT);
    }
    g.stroke(jar, 1.2);
    g.stroke(arcPath(x + 1.6, 1.15, 0.36, 100, 50), 2.0, '#FFFFFF', 0.4);
    // thermometer dial
    L.drawGauge(g, x - 0.05, 1.05, 0.26, temp === undefined ? 0.6 : temp, 0, 'T');
    // outlet: drips toward the pods
    g.line(x + 2.0, 0.55, x + 2.6, 0.55, 3.4, P.INK);
    g.line(x + 2.0, 0.55, x + 2.6, 0.55, 2.4, P.COPPER);
    for (let i = 0; i < 3; i++) {
      const u = (t * 1.2 + i / 3) % 1;
      g.fs(ellipse(x + 2.62, 0.5 - u * 0.5, 0.03, 0.045), P.GLOW, 0.6, 1 - u);
    }
  }

  function bookshelf(g, x, y, w, h) {
    g.fs(rect(x - w / 2, y, x + w / 2, y + h), '#8A6A45', 1.2);
    g.fill(rect(x - w / 2 + 0.08, y + 0.08, x + w / 2 - 0.08, y + h - 0.08), '#5E4630');
    const shelves = 3;
    for (let s = 0; s < shelves; s++) {
      const sy = y + 0.08 + s * (h - 0.16) / shelves;
      g.fs(rect(x - w / 2 + 0.05, sy - 0.03, x + w / 2 - 0.05, sy + 0.03), '#9A7650', 0.8);
      let bx = x - w / 2 + 0.14;
      let i = 0;
      while (bx < x + w / 2 - 0.2) {
        const bw = 0.08 + 0.06 * hash01('bw', s, i), bh = 0.3 + 0.18 * hash01('bh', s, i);
        book(g, bx + bw / 2, sy + 0.03, bw, bh, BOOK_COLS[(s * 5 + i) % BOOK_COLS.length], hash01('bt', s, i) > 0.85 ? -12 : 0);
        bx += bw + 0.015;
        i++;
      }
    }
  }

  // ------------------------------------------------------------ roof / dawn

  function dawnSky(g, x0, x1, y0, y1, t) {
    const sky = rect(x0, y0, x1, y1);
    g.fillShader(sky, g.linGrad(0, y0, 0, y1, [P.DAWN_HI, '#F2B48E', P.DAWN_LO, '#9C8FC4', '#5E66A8'], [0, 0.18, 0.38, 0.7, 1]));
    // sun, just clearing the skyline
    const sx = lerp(x0, x1, 0.74), sy = y0 + 2.7;
    g.soft(circle(sx, sy, 2.4), '#FFE6B8', 0.9, 0.6);
    g.fill(circle(sx, sy, 1.1), '#FFF6DA');
    g.fillShader(circle(sx, sy, 1.1), g.radGrad(sx - 0.2, sy + 0.25, 1.2, ['#FFFDF2', '#FFD98F'], [0, 1]));
    g.stroke(circle(sx, sy, 1.1), 1.3);
    // clouds in the short's puff style
    [[lerp(x0, x1, 0.18), y1 - 2.2, 1.0], [lerp(x0, x1, 0.45), y1 - 1.4, 0.8], [lerp(x0, x1, 0.88), y1 - 2.8, 0.9]].forEach(([cx, cy, k], j) => {
      const cs = [];
      for (let i = 0; i < 7; i++) cs.push([cx + (i - 3) * 0.45 * k, cy + 0.18 * Math.sin(i * 2.1 + j) * k, (0.35 + 0.2 * hash01('cl', i, j)) * k]);
      L.drawPuffs(g, cs, '#FFF4E8', '#F2C9B4');
    });
    // distant skyline
    const pts = [[x0, y0]];
    let xx = x0;
    let i = 0;
    while (xx < x1) {
      const bw = 0.6 + 1.2 * hash01('sk', i), bh = 0.4 + 1.3 * hash01('skh', i);
      pts.push([xx, y0 + bh], [xx + bw, y0 + bh]);
      xx += bw;
      i++;
    }
    pts.push([x1, y0]);
    g.fill(poly(pts), '#B48CA4');
    g.hatch(poly(pts), P.INK, 0.08, 'vert', 0.8);
  }

  function roofHole(g, y, holeX, holeW) {
    g.fill(rect(holeX - holeW / 2, y - 4, holeX + holeW / 2, y), '#1B1830');
    g.fill(rect(holeX - holeW / 2, y - 0.6, holeX + holeW / 2, y), '#FFFFFF', 0.06);
  }

  function roof(g, x0, x1, y, holeX, holeW) {
    const r = poly([[x0, y], [holeX - holeW / 2, y], [holeX - holeW / 2, y - 3], [x0, y - 3]]);
    const r2 = poly([[holeX + holeW / 2, y], [x1, y], [x1, y - 3], [holeX + holeW / 2, y - 3]]);
    [r, r2].forEach(p => {
      g.fs(p, '#B7AE9C', 1.2);
      g.hatch(p, P.INK, 0.1, 'diag', 1.0);
    });
    g.fs(rect(x0, y - 0.05, x1, y + 0.18), P.NAVY, 1.1);
    rivets(g, x0 + 0.2, x1 - 0.2, y + 0.065, Math.floor((x1 - x0) / 0.5), 0.03);
    // vents
    [x0 + 2.2, x1 - 2.6].forEach(vx => {
      creamBox(g, vx - 0.4, y + 0.18, vx + 0.4, y + 0.95, 0.06);
      for (let i = 0; i < 4; i++) g.line(vx - 0.3, y + 0.35 + i * 0.13, vx + 0.3, y + 0.35 + i * 0.13, 0.7, P.POD_DEEP);
    });
    // hatch rim
    g.fs(rect(holeX - holeW / 2 - 0.3, y - 0.05, holeX - holeW / 2, y + 0.4), P.NAVY_DARK, 1.1);
    g.fs(rect(holeX + holeW / 2, y - 0.05, holeX + holeW / 2 + 0.3, y + 0.4), P.NAVY_DARK, 1.1);
  }

  // ------------------------------------------------------------ insert shot: big clipboard page

  function clipboardInsert(g, x, y, s, lines, o) {
    o = o || {};
    g.save();
    g.translate(x, y);
    g.rotate(o.rot || 3);
    const w = 3.0 * s, h = 3.9 * s;
    const board = rrect(-w / 2, -h / 2, w / 2, h / 2, 0.15 * s);
    g.fs(board, '#A8734A', 1.6);
    g.hatch(board, P.INK, 0.12, 'diag', 0.5);
    const px0 = -w / 2 + 0.22 * s, px1 = w / 2 - 0.22 * s, py0 = -h / 2 + 0.22 * s, py1 = h / 2 - 0.45 * s;
    g.fs(rect(px0, py0, px1, py1), P.PAPER, 1.0);
    for (let i = 0; i < 12; i++) g.line(px0 + 0.1 * s, py1 - 0.75 * s - i * 0.24 * s, px1 - 0.1 * s, py1 - 0.75 * s - i * 0.24 * s, 0.5, '#C9D4E4', 0.8);
    g.text(o.title || 'TO-DO', 0, py1 - 0.5 * s, 0.36 * s, P.INK, 'hand');
    lines.forEach((ln, i) => {
      const yy = py1 - 1.0 * s - i * 0.42 * s;
      const bx = px0 + 0.22 * s;
      if (!ln.note) g.stroke(rect(bx, yy - 0.02 * s, bx + 0.2 * s, yy + 0.18 * s), 1.2);
      g.text(ln.text, ln.note ? px0 + 0.3 * s : bx + 0.32 * s, yy, (ln.size || 0.26) * s, ln.color || P.INK, ln.font || 'hand', 'left', ln.a === undefined ? 1 : ln.a);
      if (ln.check) g.stroke(poly([[bx + 0.02 * s, yy + 0.09 * s], [bx + 0.09 * s, yy - 0.01 * s], [bx + 0.3 * s, yy + 0.3 * s]], false), 2.2, '#C8402F');
      if (ln.circle) {
        const tw = g.textWidth(ln.text, (ln.size || 0.26) * s, 'hand');
        g.stroke(ellipse(bx + 0.32 * s + tw / 2, yy + 0.08 * s, tw / 2 + 0.2 * s, 0.22 * s, -0.03), 1.8, '#C8402F');
      }
    });
    g.fs(rrect(-0.6 * s, h / 2 - 0.55 * s, 0.6 * s, h / 2 - 0.05 * s, 0.1 * s), '#C9CDD3', 1.2);
    g.fs(circle(0, h / 2 - 0.3 * s, 0.09 * s), '#8E949E', 0.8);
    if (o.pencil) {
      const [tx, ty] = o.pencil;
      g.save();
      g.translate(tx * s, ty * s);
      g.rotate(-35);
      const Lp = 2.2 * s, R = 0.11 * s;
      g.fs(poly([[0, 0], [0.25 * s, R], [0.25 * s, -R]]), '#F2D3A6', 0.8);
      g.fill(poly([[0, 0], [0.09 * s, R * 0.35], [0.09 * s, -R * 0.35]]), '#C8402F');
      g.fs(rect(0.25 * s, -R, Lp, R), '#C8402F', 1.0);
      g.fs(rect(Lp, -R, Lp + 0.22 * s, R), '#E8A0A8', 0.9);
      g.restore();
    }
    g.restore();
  }

  CL.Props = {
    navyBox, creamBox, rivets, bubble, sfx, rings, speedLines, motionArc, highlight,
    fable, fableEyesAt, drips, shards, gush,
    book, corpusItem, conveyor, elevator, hopper, lectern, bin, krill,
    stool, tapChart, easel, flashcard, TAP_GRID,
    dispenser, scoreboard, patchPanel, vibSensor,
    whale, fish, waterSpout, aquarium, plaque, desk, deskLamp, microscope, still, bookshelf,
    dawnSky, roof, roofHole, clipboardInsert,
  };
})(window.CL = window.CL || {});
