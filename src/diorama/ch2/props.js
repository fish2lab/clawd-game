/* Chapter 2 · 监督微调 (SFT): models. Each function returns a group built in its own
   frame (y up, front towards +z) plus handles for the parts the rules animate.
   Colours come from CL.P; emissive glows are palette colours scaled down. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const A2 = CL.Ch2Art;
  const { ink } = CL.Ink;
  const PI = Math.PI;
  const { box, cyl, mesh, decal } = K;
  const dim = (c, k) => '#' + new T.Color(c).multiplyScalar(k).getHexString();

  // a bell shape (open at the bottom), radius r at the lip, origin at the crown
  function bellMesh(r, color) {
    const k = r / 0.26;
    const pts = [[0.0, 0.0], [0.07, -0.006], [0.12, -0.04], [0.15, -0.12], [0.165, -0.24], [0.18, -0.34], [0.23, -0.41], [0.26, -0.44]]
      .map(([x, y]) => new T.Vector2(x * k, y * k));
    const m = new T.Mesh(new T.LatheGeometry(pts, 20), K.m(color, { side: T.DoubleSide }));
    return m;
  }

  // ------------------------------------------------------------ the demo stage: 3 x 3 pressure tiles
  // st = { x0, z0, t }; returns { root, tiles: [{ mesh, c, r, x, z }], frameMat }
  function stage(st, looseIdx) {
    const root = new T.Group();
    const n = 3, t = st.t, W = n * t;
    root.add(box(W + 0.1, 0.03, W + 0.1, P.NAVY_DARK, st.x0 + W / 2, 0.015, st.z0 + W / 2));
    const side = K.m(P.POD_SHADE);
    const tiles = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c;
      const top = ink('#FFFFFF', { map: A2.tileTex(i === looseIdx), hatch: 0.05, shadeMin: 0.9 });
      const m = new T.Mesh(new T.BoxGeometry(t - 0.05, 0.035, t - 0.05), [side, side, top, side, side, side]);
      const x = st.x0 + t * (c + 0.5), z = st.z0 + t * (r + 0.5);
      m.position.set(x, 0.0475, z);
      m.userData.y0 = 0.0475;
      root.add(m);
      tiles.push({ mesh: m, c, r, x, z, i });
    }
    // the camera's frame: red tape along the edges with corner marks; it glows while recording
    const frameMat = ink(P.ALARM, { flat: true });
    const e = 0.09, y = 0.012;
    const x0 = st.x0 - e, x1 = st.x0 + W + e, z0 = st.z0 - e, z1 = st.z0 + W + e;
    const strip = (w, d, x, z) => { const s = new T.Mesh(new T.BoxGeometry(w, 0.02, d), frameMat); s.position.set(x, y, z); root.add(s); };
    strip(x1 - x0, 0.035, (x0 + x1) / 2, z0); strip(x1 - x0, 0.035, (x0 + x1) / 2, z1);
    strip(0.035, z1 - z0, x0, (z0 + z1) / 2); strip(0.035, z1 - z0, x1, (z0 + z1) / 2);
    [[x0, z0, 1, 1], [x1, z0, -1, 1], [x0, z1, 1, -1], [x1, z1, -1, -1]].forEach(([x, z, sx, sz]) => {
      strip(0.4, 0.09, x + sx * 0.2, z - sz * 0.03);
      strip(0.09, 0.4, x - sx * 0.03, z + sz * 0.2);
    });
    return { root, tiles, frameMat };
  }

  // ------------------------------------------------------------ recorder on its trolley
  // front (+z) faces the operator; returns { root, keys, lamps, reels, tape, cv, tex }
  function recorder() {
    const root = new T.Group();
    const H = 0.62, W = 1.36;
    // trolley
    [[-0.64, -0.3], [0.64, -0.3], [-0.64, 0.3], [0.64, 0.3]].forEach(([x, z]) => {
      root.add(box(0.05, H, 0.05, P.NAVY, x, H / 2 + 0.06, z));
      root.add(cyl(0.05, 0.05, 0.04, P.INK, x, 0.05, z, 10).rotateZ(PI / 2));
    });
    root.add(box(W + 0.05, 0.04, 0.68, P.NAVY, 0, 0.2, 0));
    root.add(box(W + 0.05, 0.04, 0.68, P.NAVY, 0, H + 0.04, 0));
    // spare tapes on the shelf
    [-0.35, -0.1, 0.15].forEach((x, i) => root.add(box(0.2, 0.04 + 0.02 * i, 0.16, P.NAVY_DARK, x, 0.24 + 0.01 * i, 0.05)));
    // the deck
    const deckY = H + 0.06;
    root.add(box(W, 0.22, 0.64, P.POD, 0, deckY + 0.11, 0));
    root.add(box(W + 0.02, 0.04, 0.66, P.NAVY_DARK, 0, deckY + 0.02, 0));
    const top = deckY + 0.22;
    // reels on the back half of the top
    const reels = [-0.42, 0.06].map(x => {
      const g = new T.Group();
      g.position.set(x, top + 0.02, -0.14);
      const disc = cyl(0.16, 0.16, 0.025, P.NAVY_DARK, 0, 0, 0, 24);
      g.add(disc);
      g.add(cyl(0.1, 0.1, 0.03, P.INK_SOFT, 0, 0.002, 0, 20));
      for (let i = 0; i < 3; i++) { const s = box(0.28, 0.012, 0.035, P.NAVY_LIGHT, 0, 0.02, 0); s.rotation.y = i * PI / 3; g.add(s); }
      g.add(cyl(0.025, 0.025, 0.05, P.BRASS, 0, 0.02, 0, 8));
      root.add(g);
      return g;
    });
    // the tape between the reels
    root.add(box(0.48, 0.012, 0.012, P.INK, -0.18, top + 0.035, -0.3));
    // the tape window on a panel sloping up towards the back, facing the operator
    const panel = new T.Group();
    panel.position.set(-0.2, top + 0.1, 0.16);
    panel.rotation.x = 0.62;
    panel.add(box(A2.TAPE_W + 0.06, 0.03, A2.TAPE_H + 0.06, P.NAVY, 0, 0, 0));
    root.add(box(A2.TAPE_W + 0.06, 0.12, 0.2, P.NAVY, -0.2, top + 0.04, 0.12));
    const cv = A2.tapeCanvas();
    const tex = new T.CanvasTexture(cv);
    A2.drawTape(cv, []);
    const tape = decal(A2.TAPE_W, A2.TAPE_H, tex, { emissive: dim(P.SCREEN, 0.08) });
    tape.rotation.x = -PI / 2;
    tape.position.y = 0.017;
    panel.add(tape);
    root.add(panel);
    // the two piano keys, with a lamp behind each
    const keys = {}, lamps = {};
    [['rec', 0.39, P.ALARM, 'REC'], ['play', 0.55, P.CODE_GREEN, 'PLAY']].forEach(([k, x, col, label]) => {
      const key = new T.Group();
      key.position.set(x, top, 0.16);
      key.add(box(0.13, 0.06, 0.26, col, 0, 0.03, 0));
      const lab = decal(0.12, 0.055, A2.smallPlate(label, 0.12, 0.055, P.PAPER), {});
      lab.rotation.x = -PI / 2;
      lab.position.set(0, 0.062, 0.05);
      key.add(lab);
      root.add(key);
      key.userData.y0 = top;
      keys[k] = key;
      const lamp = mesh(new T.SphereGeometry(0.04, 10, 8), ink(dim(col, 0.45), { flat: true, lit: true }), x, top + 0.05, -0.08);
      lamp.userData.on = v => { lamp.material.uniforms.uColor.value.set(v ? col : dim(col, 0.45)); lamp.material.uniforms.uEmissive.value.set(v ? dim(col, 0.5) : '#000000'); };
      root.add(lamp);
      lamps[k] = lamp;
    });
    root.add(box(0.4, 0.02, 0.4, P.NAVY_LIGHT, 0.47, top + 0.005, 0.08));
    return { root, keys, lamps, reels, tape, cv, tex, top };
  }

  // ------------------------------------------------------------ video camera on a tripod
  function tripodCam() {
    const root = new T.Group();
    const hy = 1.25;
    [0, 2.1, 4.2].forEach(a => {
      const leg = K.pipe(0, hy, 0, Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38, 0.022, P.NAVY_DARK);
      root.add(leg);
    });
    root.add(cyl(0.05, 0.05, 0.12, P.NAVY_DARK, 0, hy + 0.04, 0, 10));
    const head = new T.Group();
    head.position.set(0, hy + 0.2, 0);
    head.add(box(0.22, 0.2, 0.42, P.NAVY, 0, 0, 0));
    head.add(box(0.2, 0.06, 0.2, P.NAVY_DARK, 0, 0.13, -0.05));
    const lens = cyl(0.08, 0.09, 0.14, P.INK, 0, 0, 0.27, 16);
    lens.rotation.x = PI / 2;
    head.add(lens);
    const glass = cyl(0.062, 0.062, 0.01, P.GLASS_DEEP, 0, 0, 0.345, 16, { flat: true });
    glass.rotation.x = PI / 2;
    head.add(glass);
    const tally = mesh(new T.SphereGeometry(0.035, 10, 8), ink(dim(P.ALARM, 0.45), { flat: true, lit: true }), 0.0, 0.19, 0.12);
    tally.userData.on = v => { tally.material.uniforms.uColor.value.set(v ? P.ALARM : dim(P.ALARM, 0.45)); tally.material.uniforms.uEmissive.value.set(v ? dim(P.ALARM, 0.55) : '#000000'); };
    head.add(tally);
    root.add(head);
    return { root, head, tally };
  }

  // ------------------------------------------------------------ easel with the stack of demo cards
  // front (+z); the current card sits on the board, the rest lie on the ledge
  function easel(cards) {
    const root = new T.Group();
    const wood = P.COPPER;
    root.add(K.pipe(-0.42, 0, 0.18, -0.12, 2.0, 0.0, 0.03, wood));
    root.add(K.pipe(0.42, 0, 0.18, 0.12, 2.0, 0.0, 0.03, wood));
    root.add(K.pipe(0, 0, -0.5, 0, 1.9, -0.04, 0.03, wood));
    const board = new T.Group();
    board.position.set(0, 1.38, 0.08);
    board.rotation.x = -0.12;
    board.add(box(1.08, 0.82, 0.04, P.ORANGE_DEEP, 0, 0, -0.03));
    board.add(box(1.14, 0.06, 0.16, wood, 0, -0.44, 0.04));
    // stack on the ledge (card backs, a little ragged)
    const stack = [];
    for (let i = 0; i < 3; i++) {
      const s = decal(A2.CARD_W * 0.94, A2.CARD_H * 0.94, A2.cardBackTex(), {});
      s.rotation.x = -PI / 2 + 0.25;
      s.position.set(0.02 * (i - 1), -0.4 + 0.012 * i, 0.06 + 0.002 * i);
      s.scale.setScalar(0.42);
      stack.push(s);
    }
    // the current card, hinged at its top edge so it can flip over
    const hinge = new T.Group();
    hinge.position.set(0, 0.36, 0.0);
    board.add(hinge);
    const front = decal(A2.CARD_W, A2.CARD_H, A2.cardTex(cards[0], 0), {});
    front.position.set(0, -A2.CARD_H / 2 - 0.02, 0.012);
    hinge.add(front);
    const back = decal(A2.CARD_W, A2.CARD_H, A2.cardBackTex(), {});
    back.rotation.y = PI;
    back.position.set(0, -A2.CARD_H / 2 - 0.02, 0.008);
    hinge.add(back);
    // the next card, waiting underneath
    const under = decal(A2.CARD_W, A2.CARD_H, A2.cardTex(cards[1] || cards[0], 1), {});
    under.position.set(0, 0.36 - A2.CARD_H / 2 - 0.02, 0.004);
    board.add(under);
    // two clips at the top
    [-0.28, 0.28].forEach(x => board.add(box(0.08, 0.06, 0.04, P.NAVY_LIGHT, x, 0.37, 0.02)));
    root.add(board);
    return { root, board, hinge, front, back, under, stack };
  }

  // ------------------------------------------------------------ yellow step stool (only small Clawds fit on it)
  const STOOL_H = 0.4;
  function stool() {
    const root = new T.Group();
    root.add(box(0.5, 0.045, 0.38, P.SAFETY, 0, STOOL_H - 0.022, 0));
    [-0.22, 0.22].forEach(x => {
      root.add(box(0.045, STOOL_H - 0.04, 0.34, P.BACKPACK_DARK, x, (STOOL_H - 0.04) / 2, 0));
    });
    root.add(box(0.42, 0.035, 0.12, P.SAFETY, 0, 0.19, 0.12));
    root.add(box(0.34, 0.012, 0.3, P.HAZARD_DARK, 0, STOOL_H + 0.002, 0, { flat: true }));
    return root;
  }

  // ------------------------------------------------------------ small CRT on the plinth, facing the glass (-z)
  function monitor() {
    const root = new T.Group();
    root.add(box(0.52, 0.42, 0.46, P.POD, 0, 0.27, 0.02));
    root.add(box(0.36, 0.32, 0.18, P.POD_SHADE, 0, 0.27, 0.3));
    root.add(box(0.3, 0.06, 0.3, P.NAVY_DARK, 0, 0.03, 0.05));
    const screen = mesh(new T.PlaneGeometry(0.4, 0.3), ink(P.NAVY_DARK, { flat: true, lit: true }), 0, 0.28, -0.211);
    screen.rotation.y = PI;
    root.add(screen);
    screen.userData.on = v => { screen.material.uniforms.uColor.value.set(v ? P.SCREEN : P.NAVY_DARK); screen.material.uniforms.uEmissive.value.set(v ? dim(P.SCREEN, 0.4) : '#000000'); };
    // a cable down the back of the plinth to the recorder
    root.add(K.pipe(0.15, 0.1, 0.35, 0.3, -0.5, 0.6, 0.015, P.INK));
    const glow = K.glow(P.SCREEN, 1.6);
    glow.position.set(0, 0.3, -0.5);
    root.add(glow);
    return { root, screen, glow };
  }

  // ------------------------------------------------------------ the demo set on the stage
  // small bell on a post; arm points along +x; the cord hangs within reach of a small Clawd
  function bellPost() {
    const root = new T.Group();
    root.add(box(0.26, 0.04, 0.26, P.NAVY_DARK, 0, 0.02, 0));
    root.add(cyl(0.035, 0.035, 1.2, P.NAVY, 0, 0.6, 0, 10));
    root.add(box(0.36, 0.04, 0.04, P.NAVY, 0.17, 1.18, 0));
    const pivot = new T.Group();
    pivot.position.set(0.32, 1.16, 0);
    const b = bellMesh(0.15, P.BRASS);
    pivot.add(b);
    pivot.add(mesh(new T.SphereGeometry(0.035, 8, 6), K.m(P.BRASS_LIGHT), 0, -0.27, 0));
    const cord = cyl(0.008, 0.008, 0.5, P.WHEEL_RED, 0, -0.5, 0, 6);
    pivot.add(cord);
    pivot.add(cyl(0.025, 0.025, 0.09, P.WHEEL_RED_DARK, 0, -0.77, 0, 8));
    root.add(pivot);
    return { root, pivot };
  }

  // lamp on a post with a push button facing the stage (+z)
  function lampPost() {
    const root = new T.Group();
    root.add(box(0.26, 0.04, 0.26, P.NAVY_DARK, 0, 0.02, 0));
    root.add(cyl(0.035, 0.035, 0.95, P.NAVY, 0, 0.48, 0, 10));
    root.add(cyl(0.09, 0.07, 0.06, P.NAVY, 0, 0.98, 0, 14));
    const globe = mesh(new T.SphereGeometry(0.13, 16, 12), ink(P.GLOW_CORE, { lit: true, shadeMin: 0.85 }), 0, 1.12, 0);
    root.add(globe);
    for (let i = 0; i < 3; i++) { const r = new T.Mesh(new T.TorusGeometry(0.135, 0.008, 4, 20), K.m(P.NAVY)); r.position.y = 1.12; r.rotation.y = i * PI / 3; root.add(r); }
    root.add(box(0.14, 0.14, 0.1, P.NAVY_LIGHT, 0, 0.55, 0.06));
    const button = cyl(0.045, 0.045, 0.05, P.ALARM, 0, 0.55, 0.13, 12);
    button.rotation.x = PI / 2;
    root.add(button);
    const glow = K.glow(P.GLOW, 1.1);
    glow.position.set(0, 1.12, 0.05);
    root.add(glow);
    const set = v => {
      globe.material.uniforms.uColor.value.set(v > 0.5 ? P.GLOW : P.GLOW_CORE);
      globe.material.uniforms.uEmissive.value.set(v > 0.5 ? dim(P.GLOW, 0.55) : '#000000');
      glow.material.opacity = 0.9 * v;
    };
    set(0);
    return { root, globe, button, set };
  }

  // flag on a pole: a crank at the bottom raises it; it falls back on its own.
  // The crank faces -x (towards the stage when the pole stands on its right edge).
  const FLAG_LO = 0.42, FLAG_HI = 1.42;
  function flagPole() {
    const root = new T.Group();
    root.add(box(0.26, 0.04, 0.26, P.NAVY_DARK, 0, 0.02, 0));
    root.add(cyl(0.03, 0.03, 1.62, P.NAVY, 0, 0.81, 0, 10));
    root.add(mesh(new T.SphereGeometry(0.05, 10, 8), K.m(P.BRASS), 0, 1.64, 0));
    const flag = new T.Group();
    flag.position.y = FLAG_LO;
    const cloth = box(0.4, 0.26, 0.012, P.WHEEL_RED, -0.22, 0.0, 0);
    flag.add(cloth);
    flag.add(box(0.4, 0.05, 0.014, P.PAPER, -0.22, 0.0, 0));
    root.add(flag);
    const crank = K.wheel(0.11);
    crank.rotation.y = -PI / 2;
    crank.position.set(-0.07, 0.5, 0);
    root.add(crank);
    return { root, flag, crank };
  }

  // the big bell: a tall post with an arm along -x; the rope hangs from the bell
  function bigBellPost(h, arm, ropeEnd) {
    const root = new T.Group();
    root.add(box(0.36, 0.05, 0.36, P.NAVY_DARK, 0, 0.025, 0));
    root.add(box(0.1, h, 0.1, P.NAVY, 0, h / 2, 0));
    root.add(box(arm + 0.12, 0.1, 0.1, P.NAVY, -arm / 2, h - 0.05, 0));
    root.add(K.pipe(0, h - 0.6, 0, -0.5, h - 0.05, 0, 0.03, P.NAVY));
    const pivot = new T.Group();
    pivot.position.set(-arm, h - 0.12, 0);
    pivot.add(cyl(0.06, 0.06, 0.08, P.NAVY_DARK, 0, 0.0, 0, 10));
    const b = bellMesh(0.3, P.COPPER);
    b.position.y = -0.04;
    pivot.add(b);
    pivot.add(mesh(new T.SphereGeometry(0.06, 10, 8), K.m(P.COPPER_LIGHT), 0, -0.52, 0));
    const ropeTop = -0.55, ropeLen = (h - 0.12) - ropeEnd + ropeTop;
    const rope = new T.Group();
    rope.position.y = ropeTop;
    rope.add(cyl(0.028, 0.028, ropeLen, P.BRASS_LIGHT, 0, -ropeLen / 2, 0, 8));
    const handle = cyl(0.05, 0.05, 0.32, P.COPPER, 0, -ropeLen, 0, 10);
    handle.rotation.z = PI / 2;
    rope.add(handle);
    pivot.add(rope);
    root.add(pivot);
    return { root, pivot, rope, handle };
  }

  // ------------------------------------------------------------ Fable's half: the same set on a bar above the porthole
  // bar along x at the origin; offsets in xs = { bell, lamp, flag, big }
  function mirrorBar(x0, x1, xs) {
    const root = new T.Group();
    root.add(box(x1 - x0, 0.08, 0.08, P.NAVY, (x0 + x1) / 2, 0, 0));
    [x0 + 0.2, x1 - 0.2].forEach(x => root.add(box(0.06, 0.06, 0.5, P.NAVY_DARK, x, 0, -0.25)));
    // bell
    const bell = new T.Group();
    bell.position.set(xs.bell, -0.04, 0);
    bell.add(bellMesh(0.12, P.BRASS));
    bell.add(mesh(new T.SphereGeometry(0.03, 8, 6), K.m(P.BRASS_LIGHT), 0, -0.22, 0));
    root.add(bell);
    // lamp
    root.add(cyl(0.07, 0.06, 0.05, P.NAVY, xs.lamp, 0.06, 0, 12));
    const globe = mesh(new T.SphereGeometry(0.1, 14, 10), ink(P.GLOW_CORE, { lit: true, shadeMin: 0.85 }), xs.lamp, 0.17, 0);
    root.add(globe);
    const glow = K.glow(P.GLOW, 1.0);
    glow.position.set(xs.lamp, 0.17, 0.05);
    root.add(glow);
    const lampSet = v => {
      globe.material.uniforms.uColor.value.set(v > 0.5 ? P.GLOW : P.GLOW_CORE);
      globe.material.uniforms.uEmissive.value.set(v > 0.5 ? dim(P.GLOW, 0.55) : '#000000');
      glow.material.opacity = 0.9 * v;
    };
    lampSet(0);
    // flag: a short pole standing on the bar
    root.add(cyl(0.022, 0.022, 0.8, P.NAVY, xs.flag, 0.4, 0, 8));
    const flag = new T.Group();
    flag.position.set(xs.flag, 0.14, 0);
    flag.add(box(0.28, 0.18, 0.01, P.WHEEL_RED, 0.15, 0, 0));
    flag.add(box(0.28, 0.035, 0.012, P.PAPER, 0.15, 0, 0));
    root.add(flag);
    // big bell, at the right end
    const big = new T.Group();
    big.position.set(xs.big, -0.04, 0);
    big.add(bellMesh(0.22, P.COPPER));
    big.add(mesh(new T.SphereGeometry(0.045, 8, 6), K.m(P.COPPER_LIGHT), 0, -0.4, 0));
    root.add(big);
    return { root, bell, lampSet, lamp: globe, flag, big, flagLo: 0.14, flagHi: 0.62 };
  }

  // ------------------------------------------------------------ the tap chart and the poster on its stand
  function chart() {
    return decal(A2.CHART_W, A2.CHART_H, A2.chartTex(), { hatch: 0 });
  }
  // stand on the floor at the origin, poster centred at height py
  function posterStand(py) {
    const root = new T.Group();
    root.add(cyl(0.16, 0.18, 0.04, P.NAVY_DARK, 0, 0.02, 0, 16));
    root.add(cyl(0.025, 0.025, py - A2.POSTER_H / 2, P.NAVY, 0, (py - A2.POSTER_H / 2) / 2, 0, 8));
    root.add(box(A2.POSTER_W + 0.06, A2.POSTER_H + 0.06, 0.03, P.NAVY, 0, py, -0.02));
    const poster = decal(A2.POSTER_W, A2.POSTER_H, A2.posterTex(), {});
    poster.position.set(0, py, 0.0);
    root.add(poster);
    return { root, poster };
  }

  // ------------------------------------------------------------ tool board with the clipboard's hook (on a wall, facing +z)
  function pegboard() {
    const root = new T.Group();
    root.add(box(A2.PEG_W + 0.06, A2.PEG_H + 0.06, 0.04, P.NAVY_DARK, 0, 0, 0.02));
    const face = decal(A2.PEG_W, A2.PEG_H, A2.pegTex(), {});
    face.position.z = 0.045;
    root.add(face);
    // a wrench and scissors that are actually there
    const wr = box(0.035, 0.42, 0.02, P.NAVY_LIGHT, -A2.PEG_W / 2 + 0.12, -A2.PEG_H / 2 + 0.37, 0.06);
    root.add(wr);
    root.add(new T.Mesh(new T.TorusGeometry(0.045, 0.012, 6, 14), K.m(P.NAVY_LIGHT)).translateX(-A2.PEG_W / 2 + 0.12).translateY(-A2.PEG_H / 2 + 0.62).translateZ(0.06));
    // the hook, above the clipboard outline
    const hookX = -A2.PEG_W / 2 + 0.68, hookY = -A2.PEG_H / 2 + 0.66;
    root.add(cyl(0.012, 0.012, 0.08, P.BRASS, hookX, hookY, 0.08, 6).rotateX(PI / 2));
    root.add(cyl(0.012, 0.012, 0.04, P.BRASS, hookX, hookY + 0.02, 0.12, 6));
    return { root, hook: new T.Vector3(hookX, hookY, 0.1) };
  }

  // ------------------------------------------------------------ junction box (the tiles' data port)
  function jbox() {
    const root = new T.Group();
    root.add(box(0.44, 0.52, 0.3, P.NAVY_LIGHT, 0, 0.26, 0));
    root.add(box(0.46, 0.04, 0.32, P.NAVY, 0, 0.53, 0));
    root.add(box(0.3, 0.2, 0.02, P.NAVY, 0, 0.34, 0.16));
    const port = box(0.08, 0.05, 0.02, P.INK, 0.08, 0.3, 0.17);
    root.add(port);
    const led = mesh(new T.SphereGeometry(0.025, 8, 6), ink(P.CODE_GREEN, { flat: true, lit: true, emissive: dim(P.CODE_GREEN, 0.4) }), -0.08, 0.3, 0.17);
    root.add(led);
    const lab = decal(0.3, 0.07, A2.smallPlate('DATA', 0.3, 0.07, P.PAPER), {});
    lab.position.set(0, 0.42, 0.172);
    root.add(lab);
    return { root, port, led };
  }

  CL.Ch2Props = { bellMesh, stage, recorder, tripodCam, easel, stool, STOOL_H, monitor, bellPost, lampPost, flagPole, FLAG_LO, FLAG_HI, bigBellPost, mirrorBar, chart, posterStand, pegboard, jbox, dim };
})(window.CL = window.CL || {});
