/* Chapter 1 · models, textures, pictogram bubbles and sounds of its own.
   Everything is painted with the short's 2-D renderer (CL.Tex.paint) and inked with
   CL.Ink, in the palette's colours only. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const TX = CL.Tex;
  const X = CL.gfx;
  const { ink } = CL.Ink;
  const { rect, rrect, circle, poly, arcPath, deg, hash01 } = X;
  const PI = Math.PI;

  const cache = {};
  const memo = (k, fn) => cache[k] || (cache[k] = fn());
  const paintTex = (w, h, ppu, fn, opt) => TX.tex(TX.paint(w, h, ppu, fn, opt));
  // a box with one material per face: [+x, -x, +y, -y, +z, -z]
  const faced = (w, h, d, mats, x, y, z) => K.mesh(new T.BoxGeometry(w, h, d), mats, x, y, z);
  const mapMat = (t, opt) => ink(P.PAPER, Object.assign({ map: t }, opt || {}));

  // ------------------------------------------------------------ textures

  const T1 = {
    kraft: () => memo('kraft', () => paintTex(1, 0.66, 256, g => {
      g.fill(rect(0, 0, 1, 0.66), P.BRASS_LIGHT);
      g.hatch(rect(0, 0, 1, 0.66), P.ORANGE_DARK, 0.12, 'diag', 0.5);
      [[0.18, 0.1, 0.32, 0.55], [0.7, 0.05, 0.86, 0.6]].forEach(([x0, y0, x1, y1]) => g.line(x0, y0, x1, y1, 0.5, P.BRASS, 0.8));
      g.line(0, 0.34, 1, 0.34, 1.4, P.ORANGE_DEEP);
      g.line(0.5, 0, 0.5, 0.66, 1.4, P.ORANGE_DEEP);
      g.fs(rrect(0.6, 0.42, 0.88, 0.58, 0.02), P.PAPER, 0.6);
      [0.53, 0.48].forEach(y => g.line(0.64, y, 0.84, y, 0.5, P.INK_SOFT, 0.7));
      g.stroke(rect(0, 0, 1, 0.66), 1.2);
    }, { line: 2 })),
    kraftTop: () => memo('kraftTop', () => paintTex(1, 1, 256, g => {
      g.fill(rect(0, 0, 1, 1), P.BRASS_LIGHT);
      g.hatch(rect(0, 0, 1, 1), P.ORANGE_DARK, 0.1, 'diag', 0.5);
      g.line(0, 0.5, 1, 0.5, 1.4, P.ORANGE_DEEP);
      g.line(0.5, 0, 0.5, 1, 1.4, P.ORANGE_DEEP);
      g.fs(circle(0.5, 0.5, 0.05), P.ORANGE_DEEP, 0.8);
      g.stroke(poly([[0.5, 0.5], [0.62, 0.66], [0.58, 0.7]], false), 1.0, P.ORANGE_DEEP);
      g.stroke(rect(0, 0, 1, 1), 1.2);
    }, { line: 2 })),
    newsSide: () => memo('newsSide', () => paintTex(1, 0.66, 256, g => {
      for (let i = 0; i < 22; i++) {
        const y = i * 0.03;
        g.fill(rect(0.01 * (i % 3), y, 1 - 0.012 * ((i + 1) % 2), y + 0.028), i % 2 ? P.PAPER : P.WALL_SHADE);
      }
      g.hatch(rect(0, 0, 1, 0.66), P.INK, 0.08, 'vert', 0.4);
      g.line(0, 0.34, 1, 0.34, 1.2, P.ORANGE_DEEP);
      g.line(0.3, 0, 0.3, 0.66, 1.2, P.ORANGE_DEEP);
      g.stroke(rect(0, 0, 1, 0.66), 1.2);
    }, { line: 2 })),
    newsTop: () => memo('newsTop', () => paintTex(1, 1, 256, g => {
      g.fill(rect(0, 0, 1, 1), P.PAPER);
      g.text('NEWS', 0.5, 0.82, 0.13, P.INK, 'slab');
      g.line(0.06, 0.79, 0.94, 0.79, 0.8);
      g.fs(rect(0.08, 0.46, 0.46, 0.74), P.WALL_SHADE, 0.6);
      g.hatch(rect(0.08, 0.46, 0.46, 0.74), P.INK, 0.25, 'diag', 0.5);
      for (let i = 0; i < 6; i++) g.line(0.52, 0.72 - i * 0.05, 0.92, 0.72 - i * 0.05, 0.5, P.INK_SOFT, 0.7);
      for (let i = 0; i < 6; i++) { g.line(0.08, 0.38 - i * 0.055, 0.46, 0.38 - i * 0.055, 0.5, P.INK_SOFT, 0.7); g.line(0.52, 0.38 - i * 0.055, 0.92, 0.38 - i * 0.055, 0.5, P.INK_SOFT, 0.7); }
      g.line(0, 0.5, 1, 0.5, 1.2, P.ORANGE_DEEP);
      g.line(0.3, 0, 0.3, 1, 1.2, P.ORANGE_DEEP);
      g.stroke(rect(0, 0, 1, 1), 1.2);
    }, { line: 2 })),
    flyer: () => memo('flyer', () => paintTex(0.3, 0.22, 600, g => {
      g.fs(rect(0, 0, 0.3, 0.22), P.DAWN_LO, 1.0);
      g.text('SPAM', 0.15, 0.1, 0.075, P.ALARM, 'slab', 'center', 1, -6);
      g.text('!!!', 0.15, 0.035, 0.05, P.INK, 'slab');
      g.fill(rect(0.02, 0.185, 0.07, 0.195), P.HOODIE_LIGHT);
    }, { line: 2 })),
    slats: () => memo('slats', () => paintTex(1, 1, 128, g => {
      g.fill(rect(0, 0, 1, 1), P.ORANGE_DEEP);
      for (let i = 0; i < 5; i++) g.fs(rect(0.02, i * 0.2 + 0.02, 0.98, i * 0.2 + 0.17), P.BRASS, 0.8);
      g.hatch(rect(0, 0, 1, 1), P.INK, 0.12, 'diag', 0.6);
    }, { line: 2 })),
    books: () => memo('books', () => paintTex(1.8, 0.95, 200, g => {
      const cols = [P.NAVY, P.ORANGE, P.BRASS, P.WHEEL_RED, P.HOODIE, P.CODE_GREEN, P.BLAZER, P.ORANGE_DARK, P.COPPER, P.NAVY_LIGHT, P.TIE_RED];
      g.fill(rect(0, 0, 1.8, 0.95), P.NAVY_DARK);
      [0.08, 0.51].forEach((y0, row) => {
        let x = 0.05, i = 0;
        while (x < 1.72) {
          const w = 0.04 + 0.05 * hash01('bw', row, i), h = 0.27 + 0.09 * hash01('bh', row, i);
          const lean = hash01('bl', row, i) > 0.92 ? 0.03 : 0;
          if (x + w > 1.75) break;
          g.fs(poly([[x, y0], [x + w, y0], [x + w + lean, y0 + h], [x + lean, y0 + h]]), cols[Math.floor(hash01('bc', row, i) * cols.length)], 0.6);
          g.line(x + 0.008, y0 + h * 0.75, x + w - 0.008, y0 + h * 0.75, 0.5, P.PAPER, 0.6);
          x += w + 0.004; i++;
        }
        g.fs(rect(0, y0 - 0.05, 1.8, y0), P.NAVY, 0.6);
      });
      g.stroke(rect(0, 0, 1.8, 0.95), 1.6);
    }, { line: 2 })),
    belt: () => memo('belt', () => {
      const t = paintTex(1, 1, 128, g => {
        g.fill(rect(0, 0, 1, 1), P.INK_SOFT);
        for (let i = 0; i < 4; i++) g.fill(rect(0, i * 0.25 + 0.02, 1, i * 0.25 + 0.07), P.INK);
      }, { line: 2 });
      t.wrapS = t.wrapT = T.RepeatWrapping;
      return t;
    }),
    plate: () => memo('plate', () => paintTex(1, 1, 128, g => {
      g.fill(rect(0, 0, 1, 1), P.NAVY_LIGHT);
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
        const x = 0.08 + i * 0.14, y = 0.08 + j * 0.14;
        g.fill(poly([[x - 0.035, y - 0.01], [x + 0.035, y + 0.01], [x + 0.03, y + 0.02], [x - 0.04, y]]), P.NAVY, 0.7);
      }
      g.stroke(rect(0.01, 0.01, 0.99, 0.99), 1.4, P.SAFETY);
    }, { line: 2 })),
    dupFloor: () => memo('dupFloor', () => paintTex(1, 1, 256, g => {
      g.hatch(rect(0.04, 0.04, 0.96, 0.96), P.INK_SOFT, 0.25, 'diag', 1.0);
      g.stroke(rect(0.04, 0.04, 0.96, 0.96), 2.2, P.INK_SOFT, 0.8);
      g.text('DUP', 0.5, 0.42, 0.24, P.INK_SOFT, 'slab', 'center', 0.85);
    }, { line: 2 })),
    hazard: () => memo('hz1', () => paintTex(1, 0.6, 200, g => {
      g.fill(rect(0, 0, 1, 0.6), P.SAFETY);
      for (let i = -2; i < 6; i++) g.fill(poly([[i * 0.25, 0], [i * 0.25 + 0.12, 0], [i * 0.25 + 0.42, 0.6], [i * 0.25 + 0.3, 0.6]]), P.HAZARD_DARK);
      g.fs(rrect(0.2, 0.18, 0.8, 0.44, 0.03), P.PAPER, 0.8);
      g.text('SPAM', 0.5, 0.235, 0.15, P.ALARM, 'slab');
      g.stroke(rect(0, 0, 1, 0.6), 1.4);
    }, { line: 2 })),
    dupSign: () => memo('dupSign', () => paintTex(0.7, 0.24, 400, g => {
      g.fs(rect(0, 0, 0.7, 0.24), P.HOODIE_LIGHT, 1.0);
      g.text('DUP', 0.35, 0.065, 0.14, P.INK, 'slab');
      g.stroke(rect(0.02, 0.02, 0.68, 0.22), 0.6);
    }, { line: 2 })),
    fullPlate: () => memo('fullPlate', () => paintTex(0.36, 0.16, 400, g => {
      g.fs(rect(0, 0, 0.36, 0.16), P.PAPER, 1.0);
      g.text('FULL', 0.18, 0.045, 0.085, P.ALARM, 'slab');
    }, { line: 2 })),
    // the breaker panel: ammeter dial, 0..6 with the red zone past 4
    ammeter: () => memo('ammeter', () => paintTex(1, 1, 256, g => {
      const x = 0.5, y = 0.5;
      g.fs(circle(x, y, 0.48), P.BRASS, 1.2);
      g.fs(circle(x, y, 0.4), P.PAPER, 0.7);
      g.stroke(arcPath(x, y, 0.31, 225 - 270 * 4 / 6, -270 * 2 / 6), 5, P.ALARM);
      for (let i = 0; i <= 6; i++) {
        const a = deg(225 - 270 * i / 6);
        g.line(x + Math.cos(a) * 0.27, y + Math.sin(a) * 0.27, x + Math.cos(a) * 0.35, y + Math.sin(a) * 0.35, i === 4 ? 1.6 : 0.9, i >= 4 ? P.ALARM : P.INK);
        g.text(String(i), x + Math.cos(a) * 0.2, y + Math.sin(a) * 0.2 - 0.035, 0.09, i > 4 ? P.ALARM : P.INK, 'slab');
      }
      g.text('A', x, y - 0.25, 0.09, P.INK_SOFT, 'slab');
    }, { line: 3 })),
    lossDial: () => memo('lossDial', () => paintTex(1, 1, 400, g => {
      const x = 0.5, y = 0.5;
      g.fs(circle(x, y, 0.49), P.BRASS, 1.4);
      g.fs(circle(x, y, 0.42), P.PAPER, 0.8);
      g.stroke(arcPath(x, y, 0.34, 225, -270 * 0.12), 6, P.CODE_GREEN);
      for (let i = 0; i <= 20; i++) {
        const a = deg(225 - 270 * i / 20), big = i % 5 === 0;
        g.line(x + Math.cos(a) * (big ? 0.27 : 0.31), y + Math.sin(a) * (big ? 0.27 : 0.31), x + Math.cos(a) * 0.37, y + Math.sin(a) * 0.37, big ? 1.4 : 0.7);
      }
      ['0', '', '', '', '1.0'].forEach((s, i) => { if (!s) return; const a = deg(225 - 270 * i / 4); g.text(s, x + Math.cos(a) * 0.2, y + Math.sin(a) * 0.2 - 0.03, 0.07, P.INK, 'slab'); });
      g.text('LOSS', x, y - 0.2, 0.1, P.INK, 'slab');
      g.fill(circle(x - 0.17, y + 0.17, 0.08), P.PAPER, 0.35);
    }, { line: 3 })),
    stencil: text => TX.stencil(text, 4.2, 0.7),
  };

  // Pictograms under the five switches: a little drawing each, half lost under a slap
  // of wall paint. What is left is a clue, not an answer.
  const PICTO = {
    mixer(g) { g.line(0.5, 0.86, 0.5, 0.34, 1.6); g.fs(poly([[0.5, 0.34], [0.2, 0.24], [0.22, 0.4]]), P.INK, 0.6); g.fs(poly([[0.5, 0.34], [0.8, 0.24], [0.78, 0.4]]), P.INK, 0.6); g.stroke(arcPath(0.5, 0.3, 0.38, 200, 140), 1.0); },
    belt(g) { g.stroke(rrect(0.1, 0.32, 0.9, 0.62, 0.15), 1.4); [0.25, 0.75].forEach(x => g.fs(circle(x, 0.47, 0.09), P.INK, 0.6)); g.fs(rect(0.38, 0.62, 0.62, 0.8), P.INK, 0.6); },
    lamp(g) { g.fs(poly([[0.3, 0.55], [0.7, 0.55], [0.6, 0.78], [0.4, 0.78]]), P.INK, 0.6); g.line(0.5, 0.55, 0.5, 0.25, 1.2); g.line(0.35, 0.22, 0.65, 0.22, 1.4); [[0.25, 0.45], [0.75, 0.45], [0.5, 0.38]].forEach(([x, y]) => g.line(0.5, 0.52, x, y, 0.8)); },
    lift(g) { g.line(0.3, 0.15, 0.3, 0.88, 1.2); g.line(0.7, 0.15, 0.7, 0.88, 1.2); g.fs(rect(0.36, 0.5, 0.64, 0.7), P.INK, 0.6); g.stroke(poly([[0.5, 0.18], [0.5, 0.42]], false), 1.4); g.stroke(poly([[0.42, 0.34], [0.5, 0.44], [0.58, 0.34]], false), 1.4); },
    magnet(g) { g.stroke(arcPath(0.5, 0.52, 0.22, 180, 180), 3.2); g.line(0.28, 0.52, 0.28, 0.8, 3.2); g.line(0.72, 0.52, 0.72, 0.8, 3.2); g.fill(rect(0.22, 0.72, 0.34, 0.82), P.ALARM); g.fill(rect(0.66, 0.72, 0.78, 0.82), P.ALARM); },
  };
  // which part of each plate is still readable (the rest is under the paint)
  const SMEAR = { mixer: [0.48, 1.05, 'r'], belt: [0.0, 0.5, 'l'], lamp: [0.0, 0.55, 'l'], lift: [0.5, 1.05, 'r'], magnet: [0.42, 1.05, 'r'] };
  function pictoTex(kind) {
    return memo('picto|' + kind, () => paintTex(1, 1, 192, g => {
      g.fs(rrect(0.02, 0.02, 0.98, 0.98, 0.08), P.PAPER, 1.4);
      PICTO[kind](g);
      const [x0, x1] = SMEAR[kind];
      // the slap of paint, with a ragged edge and drips
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const y = 1.02 - i * 0.09;
        const edge = (SMEAR[kind][2] === 'l' ? x1 : x0) + (hash01('sm', kind, i) - 0.5) * 0.12;
        pts.push([edge, y]);
      }
      const side = SMEAR[kind][2] === 'l' ? [[-0.05, -0.05], [-0.05, 1.05]] : [[1.05, -0.05], [1.05, 1.05]];
      const shape = SMEAR[kind][2] === 'l' ? [side[1], ...pts, side[0]] : [side[1], ...pts, side[0]];
      g.fill(poly(shape), P.WALL);
      g.hatch(poly(shape), P.WALL_LINE, 0.5, 'vert', 0.6);
      for (let i = 0; i < 3; i++) {
        const dx = (SMEAR[kind][2] === 'l' ? x1 : x0) + (hash01('dr', kind, i) - 0.5) * 0.3;
        g.fill(rrect(dx - 0.025, 0.05 + 0.3 * hash01('dl', kind, i), dx + 0.025, 0.7, 0.025), P.WALL);
      }
    }, { line: 2 }));
  }

  // words that drift in the reactor once there is corpus in it
  const WORDS = ['the', 'and', 'of', 'a', 'to', 'in', 'is', 'it', 'was', 'he', 'she', 'that', 'what', 'could', 'only', 'know', 'make', 'had', 'more', 'have'];
  function wordTex(w, tint) {
    return memo('word|' + w + tint, () => {
      const cw = 0.12 + 0.09 * w.length;
      return paintTex(cw, 0.3, 256, g => g.text(w, cw / 2, 0.08, 0.2, tint || P.PAPER, 'slab'), { line: 2 });
    });
  }
  function scrapTex() {
    return memo('scrap', () => paintTex(0.2, 0.14, 400, g => {
      g.fs(poly([[0.01, 0.02], [0.19, 0.0], [0.18, 0.13], [0.03, 0.12]]), P.DAWN_LO, 0.8);
      g.text('SP', 0.1, 0.04, 0.06, P.ALARM, 'slab');
    }, { line: 2 }));
  }

  // ------------------------------------------------------------ models

  // a pallet on four casters; origin on the floor at its centre, deck top at 0.23
  function pallet() {
    const g = new T.Group();
    [[-0.33, -0.33], [0.33, -0.33], [-0.33, 0.33], [0.33, 0.33]].forEach(([x, z]) => {
      const w = K.cyl(0.055, 0.055, 0.05, P.INK, x, 0.055, z, 10);
      w.rotation.z = PI / 2;
      g.add(w);
      g.add(K.box(0.04, 0.05, 0.08, P.NAVY_DARK, x, 0.1, z));
    });
    g.add(K.box(0.9, 0.08, 0.9, P.NAVY, 0, 0.15, 0));
    const deck = faced(0.9, 0.05, 0.9, [K.m(P.ORANGE_DARK), K.m(P.ORANGE_DARK), mapMat(T1.slats()), K.m(P.ORANGE_DEEP), K.m(P.ORANGE_DARK), K.m(P.ORANGE_DARK)], 0, 0.205, 0);
    g.add(deck);
    g.userData.deckY = 0.23;
    return g;
  }

  // the load on a pallet: 'parcel' (brown paper, twine) or 'news' (a bale with SPAM flyers)
  function bundle(kind) {
    const g = new T.Group();
    const W = 0.74, H = 0.5, D = 0.66;
    if (kind === 'parcel') {
      const side = mapMat(T1.kraft(), { hatch: 0.12 }), top = mapMat(T1.kraftTop(), { hatch: 0.08 });
      g.add(faced(W, H, D, [side, side, top, K.m(P.ORANGE_DEEP), side, side], 0, H / 2, 0));
    } else {
      const side = mapMat(T1.newsSide(), { hatch: 0.1 }), top = mapMat(T1.newsTop(), { hatch: 0.06 });
      g.add(faced(W, H, D, [side, side, top, K.m(P.WALL_SHADE), side, side], 0, H / 2, 0));
      const flyers = new T.Group();
      // pink flyers stapled into the bale, sticking out on every side
      [[0.26, 0.52, 0.2, 0.5, 0.18], [-0.3, 0.36, 0.26, -0.4, -0.2], [0.05, 0.53, -0.1, 1.9, -0.12], [0.34, 0.24, -0.12, 1.4, 0.35], [-0.2, 0.5, -0.24, 2.6, 0.1]].forEach(([x, y, z, ry, rz], i) => {
        const f = new T.Group();
        const fm = K.m(P.DAWN_LO);
        f.add(faced(0.36, 0.014, 0.26, [fm, fm, mapMat(T1.flyer(), { flat: true }), fm, fm, fm], 0, 0, 0));
        f.add(K.box(0.06, 0.022, 0.014, P.HOODIE_LIGHT, -0.13, 0.012, -0.1));
        f.position.set(x, y, z);
        f.rotation.set(0.22 * (i % 2 ? 1 : -1), ry, rz);
        flyers.add(f);
      });
      g.add(flyers);
      g.userData.flyers = flyers;
    }
    g.userData.H = H;
    return g;
  }

  // a run of library shelving along x, books on both long faces
  function shelf(cells) {
    const g = new T.Group();
    const W = cells - 0.16, H = 0.95, D = 0.84;
    const bt = T1.books().clone();
    bt.needsUpdate = true;
    bt.wrapS = T.RepeatWrapping;
    bt.repeat.set(W / 1.8, 1);
    const books = mapMat(bt, { hatch: 0.1 }), end = K.m(P.NAVY);
    g.add(faced(W, H, D, [end, end, K.m(P.NAVY_LIGHT), end, books, books], 0, H / 2, 0));
    g.add(K.box(W + 0.06, 0.06, D + 0.06, P.NAVY, 0, H + 0.03, 0));
    // a few loose books lying on top
    g.add(K.box(0.3, 0.05, 0.22, P.WHEEL_RED, -W / 2 + 0.3, H + 0.085, 0.1));
    g.add(K.box(0.24, 0.04, 0.3, P.PAPER, W / 2 - 0.35, H + 0.08, -0.12));
    return g;
  }

  // a reading desk with a banker's lamp; the lamp's light is its own object
  function desk() {
    const g = new T.Group();
    g.add(K.box(0.86, 0.06, 0.8, P.ORANGE_DEEP, 0, 0.74, 0));
    [[-0.38, -0.34], [0.38, -0.34], [-0.38, 0.34], [0.38, 0.34]].forEach(([x, z]) => g.add(K.box(0.06, 0.72, 0.06, P.NAVY_DARK, x, 0.36, z)));
    g.add(K.box(0.3, 0.3, 0.7, P.ORANGE_DARK, -0.25, 0.55, 0));
    // papers and a mug
    const pp = K.box(0.3, 0.012, 0.22, P.PAPER, 0.12, 0.775, 0.12);
    pp.rotation.y = 0.3;
    g.add(pp);
    g.add(K.cyl(0.05, 0.045, 0.1, P.NAVY_LIGHT, 0.28, 0.82, -0.2, 12));
    const lamp = new T.Group();
    lamp.add(K.cyl(0.11, 0.13, 0.04, P.BRASS, 0, 0.02, 0, 16));
    lamp.add(K.cyl(0.015, 0.015, 0.3, P.BRASS, 0, 0.18, 0, 8));
    const shade = K.cyl(0.07, 0.17, 0.12, P.CODE_GREEN, 0, 0.36, 0.04, 20);
    shade.rotation.x = 0.35;
    lamp.add(shade);
    const bulb = K.mesh(new T.SphereGeometry(0.05, 10, 8), ink(P.GLOW_CORE, { flat: true, lit: true }), 0, 0.31, 0.07);
    lamp.add(bulb);
    lamp.position.set(-0.15, 0.77, -0.15);
    g.add(lamp);
    g.userData.lamp = lamp;
    g.userData.bulb = bulb;
    return g;
  }

  // a radial pool of additive light on the floor (lamps), layer 1 so it isn't inked
  let poolTex = null;
  function lightPool(r, color) {
    if (!poolTex) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const c = cv.getContext('2d');
      const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,0.85)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, 128, 128);
      poolTex = new T.CanvasTexture(cv);
    }
    const m = new T.Mesh(new T.PlaneGeometry(r * 2, r * 2), new T.MeshBasicMaterial({ map: poolTex, color: new T.Color(color || P.GLOW_CORE), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }));
    m.rotation.x = -PI / 2;
    m.layers.set(1);
    return m;
  }

  // a dial of radius r facing +z; set(v) with v in 0..1 sweeps 225 deg -> -45 deg
  function dial(r, face, opt) {
    opt = opt || {};
    const g = new T.Group();
    const body = K.cyl(r, r, r * 0.3, P.BRASS, 0, 0, 0, 28);
    body.rotation.x = PI / 2;
    g.add(body);
    const f = K.decal(r * 2, r * 2, face, { useAlpha: true, lit: !!opt.lit, emissive: opt.lit ? new T.Color(P.GLOW).multiplyScalar(0.05) : undefined });
    f.position.z = r * 0.16;
    g.add(f);
    const needle = new T.Group();
    needle.position.z = r * 0.19;
    needle.add(K.box(r * 0.06, r * 0.7, r * 0.03, P.TIE_RED, 0, r * 0.32, 0, { flat: true, lit: !!opt.lit }));
    needle.add(K.cyl(r * 0.07, r * 0.07, r * 0.04, P.INK, 0, 0, 0.01, 10).rotateX(PI / 2));
    g.add(needle);
    g.userData.set = v => { needle.rotation.z = deg(225 - 270 * Math.max(-0.02, Math.min(1.04, v))) - PI / 2; };
    g.userData.set(0);
    g.userData.face = f;
    return g;
  }

  // a small pilot lamp; set(on)
  function pilot(color, r) {
    r = r || 0.045;
    const g = new T.Group();
    g.add(K.cyl(r * 1.4, r * 1.4, r * 0.8, P.NAVY_DARK, 0, 0, 0, 12).rotateX(PI / 2));
    const lens = K.mesh(new T.SphereGeometry(r, 10, 8), ink(P.INK_SOFT, { flat: true, lit: true }), 0, 0, r * 0.5);
    g.add(lens);
    const glow = K.glow(color, r * 9);
    glow.position.z = r;
    g.add(glow);
    g.userData.set = on => {
      lens.material.uniforms.uColor.value.set(on ? color : P.INK_SOFT);
      lens.material.uniforms.uEmissive.value.set(on ? color : P.INK).multiplyScalar(on ? 0.5 : 0);
      glow.material.opacity = on ? 0.55 : 0;
    };
    g.userData.set(false);
    return g;
  }

  // a toggle switch: lever up = on, down = off; face towards +z
  function toggle() {
    const g = new T.Group();
    g.add(K.box(0.16, 0.22, 0.04, P.NAVY_DARK, 0, 0, 0.02));
    g.add(K.cyl(0.035, 0.035, 0.05, P.INK, 0, 0, 0.06, 10).rotateX(PI / 2));
    const lever = new T.Group();
    lever.position.z = 0.07;
    lever.add(K.box(0.03, 0.13, 0.03, P.HOODIE_LIGHT, 0, 0.065, 0));
    lever.add(K.box(0.06, 0.05, 0.05, P.WHEEL_RED, 0, 0.13, 0));
    g.add(lever);
    g.userData.lever = lever;
    g.userData.set = on => { lever.rotation.x = on ? 0.55 : PI - 0.55; };
    g.userData.set(false);
    return g;
  }

  // a big ball-valve body with a lever: along the pipe (here: vertical) = open
  function ballValve(len) {
    const g = new T.Group();
    g.add(K.cyl(0.11, 0.11, 0.26, P.NAVY, 0, 0, 0, 14));
    g.add(K.cyl(0.03, 0.03, 0.14, P.NAVY, 0, 0, 0.08, 8).rotateX(PI / 2));
    const lever = new T.Group();
    lever.position.z = 0.15;
    lever.add(K.box(0.04, len || 0.42, 0.06, P.WHEEL_RED, 0, (len || 0.42) * 0.45, 0));
    lever.add(K.box(0.06, 0.1, 0.08, P.WHEEL_RED_DARK, 0, (len || 0.42) * 0.9, 0));
    g.add(lever);
    g.userData.lever = lever;
    return g;
  }

  // the counterweight cage: bars on three sides, open to the south; origin at its floor
  function cage() {
    const g = new T.Group();
    const W = 0.94, H = 1.2;
    g.add(K.box(W, 0.06, W, P.NAVY_DARK, 0, 0.03, 0));
    g.add(K.box(W, 0.06, W, P.NAVY, 0, H, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(K.box(0.06, H, 0.06, P.NAVY, sx * W / 2, H / 2, sz * W / 2)));
    for (let i = 1; i < 5; i++) {
      const u = -W / 2 + i * W / 5;
      g.add(K.box(0.025, H, 0.025, P.NAVY_LIGHT, u, H / 2, -W / 2));
      g.add(K.box(0.025, H, 0.025, P.NAVY_LIGHT, -W / 2, H / 2, u));
      g.add(K.box(0.025, H, 0.025, P.NAVY_LIGHT, W / 2, H / 2, u));
    }
    [0.45, 0.85].forEach(y => { g.add(K.box(W, 0.03, 0.03, P.NAVY, 0, y, -W / 2)); g.add(K.box(0.03, 0.03, W, P.NAVY, -W / 2, y, 0)); g.add(K.box(0.03, 0.03, W, P.NAVY, W / 2, y, 0)); });
    // the hook and the plate that says what it is for: a weight
    g.add(K.box(0.18, 0.12, 0.18, P.NAVY_DARK, 0, H + 0.09, 0));
    const tag = K.decal(0.3, 0.3, memo('kgTag', () => paintTex(0.3, 0.3, 400, gg => {
      gg.fs(rect(0, 0, 0.3, 0.3), P.SAFETY, 1.0);
      gg.fs(poly([[0.07, 0.05], [0.23, 0.05], [0.2, 0.19], [0.1, 0.19]]), P.INK, 0.6);
      gg.stroke(circle(0.15, 0.225, 0.035), 1.0);
    }, { line: 2 })));
    tag.position.set(0, H - 0.22, W / 2 + 0.02);
    g.add(tag);
    // an invisible box over the whole cage, so a click on its open front still lands on it
    const hit = K.mesh(new T.BoxGeometry(W, H, W), new T.MeshBasicMaterial({ visible: false }), 0, H / 2, 0);
    g.add(hit);
    g.userData.H = H;
    return g;
  }

  // the skip: an open bucket, hazard yellow; origin at its bottom centre
  function skip() {
    const g = new T.Group();
    const W = 0.8, H = 0.7, D = 0.78, t = 0.05;
    const hz = TX.hazard().clone();
    hz.needsUpdate = true;
    hz.wrapS = T.RepeatWrapping;
    hz.repeat.set(1.2, 1);
    const sideM = ink(P.PAPER, { map: hz });
    g.add(K.box(W, t, D, P.NAVY_DARK, 0, t / 2, 0));
    g.add(faced(W, H, t, [K.m(P.SAFETY), K.m(P.SAFETY), K.m(P.SAFETY), K.m(P.SAFETY), sideM, K.m(P.SAFETY)], 0, H / 2, D / 2 - t / 2));
    g.add(K.box(W, H, t, P.SAFETY, 0, H / 2, -D / 2 + t / 2));
    g.add(K.box(t, H, D, P.SAFETY, -W / 2 + t / 2, H / 2, 0));
    g.add(K.box(t, H, D, P.SAFETY, W / 2 - t / 2, H / 2, 0));
    [-1, 1].forEach(s => g.add(K.box(0.04, 0.5, 0.04, P.NAVY, s * (W / 2 + 0.02), H + 0.1, 0)));
    g.add(K.box(W + 0.08, 0.05, 0.05, P.NAVY, 0, H + 0.34, 0));
    g.userData.H = H;
    return g;
  }

  // a spoked wheel for the sheave (axis along x)
  function sheave(r) {
    const g = new T.Group();
    const w = K.wheel(r, P.NAVY);
    w.rotation.y = PI / 2;
    g.add(w);
    return g;
  }

  // ------------------------------------------------------------ bubbles (pictograms only)

  const ICONS = {
    // needs a computer: a laptop
    laptop(c, s) {
      c.strokeRect(0.24 * s, 0.26 * s, 0.52 * s, 0.34 * s);
      c.beginPath(); c.moveTo(0.14 * s, 0.72 * s); c.lineTo(0.86 * s, 0.72 * s); c.lineTo(0.78 * s, 0.62 * s); c.lineTo(0.22 * s, 0.62 * s); c.closePath(); c.stroke();
      c.fillStyle = P.SCREEN; c.fillRect(0.3 * s, 0.32 * s, 0.4 * s, 0.22 * s);
    },
    // too light: a feather
    feather(c, s) {
      c.beginPath(); c.moveTo(0.25 * s, 0.82 * s); c.quadraticCurveTo(0.42 * s, 0.4 * s, 0.78 * s, 0.18 * s); c.stroke();
      c.beginPath(); c.moveTo(0.36 * s, 0.6 * s); c.quadraticCurveTo(0.42 * s, 0.24 * s, 0.78 * s, 0.18 * s); c.quadraticCurveTo(0.72 * s, 0.52 * s, 0.36 * s, 0.6 * s); c.stroke();
    },
    // overload: a lightning bolt
    bolt(c, s) {
      c.fillStyle = P.SAFETY;
      c.beginPath(); c.moveTo(0.56 * s, 0.12 * s); c.lineTo(0.28 * s, 0.54 * s); c.lineTo(0.48 * s, 0.54 * s); c.lineTo(0.4 * s, 0.88 * s); c.lineTo(0.74 * s, 0.42 * s); c.lineTo(0.53 * s, 0.42 * s); c.closePath(); c.fill(); c.stroke();
    },
    // not enough in it: an empty beaker
    empty(c, s) {
      c.beginPath(); c.moveTo(0.3 * s, 0.2 * s); c.lineTo(0.3 * s, 0.8 * s); c.lineTo(0.7 * s, 0.8 * s); c.lineTo(0.7 * s, 0.2 * s); c.stroke();
      c.setLineDash([0.06 * s, 0.06 * s]); c.beginPath(); c.moveTo(0.3 * s, 0.5 * s); c.lineTo(0.7 * s, 0.5 * s); c.stroke(); c.setLineDash([]);
    },
  };
  if (!TX.icon.__ch1) {
    const base = TX.icon;
    TX.icon = function (kind, size) {
      if (!ICONS[kind]) return base(kind, size);
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const c = cv.getContext('2d');
      c.lineWidth = size * 0.07; c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = P.INK; c.fillStyle = P.INK;
      ICONS[kind](c, size);
      return cv;
    };
    TX.icon.__ch1 = true;
  }

  // ------------------------------------------------------------ sounds (own WebAudio context)

  const SND = (() => {
    let ctx = null, master = null;
    const loops = {};
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
    const live = () => ctx && ctx.state === 'running' && !CL.Sound.muted;
    function env(g, t, a, peak, d) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    }
    function tone(f, type, a, peak, d, f2, delay) {
      const t = ctx.currentTime + (delay || 0);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
      env(g, t, a, peak, d);
      o.connect(g).connect(master); o.start(t); o.stop(t + a + d + 0.05);
    }
    function noise(type, f, q, a, peak, d, f2) {
      const t = ctx.currentTime;
      const n = Math.floor(ctx.sampleRate * (a + d + 0.1));
      const b = ctx.createBuffer(1, n, ctx.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(); s.buffer = b;
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + d); fl.Q.value = q;
      const g = ctx.createGain(); env(g, t, a, peak, d);
      s.connect(fl).connect(g).connect(master); s.start(t);
    }
    const FX = {
      trip: () => { noise('lowpass', 3000, 0.7, 0.002, 0.7, 0.25, 300); tone(140, 'sawtooth', 0.01, 0.12, 1.2, 30); },
      spark: () => { noise('highpass', 4000, 0.6, 0.001, 0.4, 0.12); noise('bandpass', 2400, 4, 0.001, 0.2, 0.2); },
      powerup: () => tone(50, 'sawtooth', 0.3, 0.06, 0.6, 120),
      beep: () => { tone(1320, 'square', 0.002, 0.05, 0.08); tone(1760, 'square', 0.002, 0.04, 0.08, null, 0.1); },
      stall: () => { tone(70, 'sawtooth', 0.05, 0.18, 0.9, 45); noise('bandpass', 300, 3, 0.05, 0.2, 0.8); },
      gurgle: () => { for (let i = 0; i < 5; i++) tone(160 + Math.random() * 200, 'sine', 0.01, 0.08, 0.12, 80 + Math.random() * 60, i * 0.18); noise('lowpass', 500, 1, 0.1, 0.12, 1.2); },
      dry: () => noise('bandpass', 900, 2, 0.02, 0.06, 0.3),
      pour: () => noise('lowpass', 1200, 0.8, 0.05, 0.25, 1.0, 300),
      heart: () => { tone(55, 'sine', 0.01, 0.5, 0.25); tone(50, 'sine', 0.01, 0.35, 0.25, null, 0.22); },
      dawn: () => [392, 494, 587, 740].forEach((f, i) => tone(f, 'sine', 0.4, 0.05, 2.2, null, i * 0.12)),
      thrum: () => tone(41, 'sine', 0.6, 0.4, 2.2, 36),
    };
    // continuous sounds: belt rattle, magnet buzz, mixer churn, lift whine
    const LOOPS = {
      belt: () => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 9; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3; o.connect(f); return [o, f, 0.05]; },
      magnet: () => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; o.connect(f); return [o, f, 0.035]; },
      mixer: () => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 38; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; o.connect(f); return [o, f, 0.12]; },
      lift: () => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 180; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; o.connect(f); return [o, f, 0.05]; },
      drone: () => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 46; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 200; o.connect(f); return [o, f, 0.12]; },
    };
    return {
      ensure,
      play(name) { if (!live() || !FX[name]) return; try { FX[name](); } catch (e) { /* ignore */ } },
      // loop(name, on): start or stop a continuous sound (idempotent)
      loop(name, on) {
        if (!on) { if (loops[name]) { const l = loops[name]; delete loops[name]; try { l.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08); l.o.stop(ctx.currentTime + 0.4); } catch (e) { /* ignore */ } } return; }
        if (loops[name] || !live()) return;
        try {
          const [o, f, vol] = LOOPS[name]();
          const g = ctx.createGain(); g.gain.value = 0.0001;
          f.connect(g).connect(master);
          g.gain.setTargetAtTime(vol, ctx.currentTime, 0.1);
          o.start();
          loops[name] = { o, g };
        } catch (e) { /* ignore */ }
      },
      stopAll() { Object.keys(loops).forEach(n => this.loop(n, false)); },
      mute(v) { if (master) master.gain.value = v ? 0 : 0.5; },
    };
  })();

  CL.Ch1Art = { T1, memo, paintTex, faced, mapMat, pictoTex, wordTex, scrapTex, WORDS, pallet, bundle, shelf, desk, lightPool, dial, pilot, toggle, ballValve, cage, skip, sheave, ICONS, SND };
})(window.CL = window.CL || {});
