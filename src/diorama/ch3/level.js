/* Chapter 3 · 强化学习: the room, 30 days before release, 14:00, under strip lights.

   Same lab. Two cryo pods are in (doors open, nobody sleeps at 14:00); Haiku's spot is
   a bare pedestal ring. The sign bracket on the reactor is empty. New for this run:

   - On the reactor top: the REWARD board (four flip digits, three test lamps:
     BELL / VALVE / GLASS) and a glass globe of glowing reward pellets. Each point
     rolls one pellet down a rail into a bin on the plinth; the bin is full, so
     they spill across the floor.
   - Behind the porthole, Fable's tasks: a bell (with a pull rope) and an inner
     valve wheel, both under cobwebs. Two big orange arms can reach them.
   - Outside, the inner valve's body: an inlet out of the reactor, the valve (its
     yellow stem rises when it really opens), an outlet that climbs a riser to a
     steam whistle, a flow gauge. Two empty sensor brackets: one on the inlet (low),
     one high on the riser. The valve sensor clip sits on the valve's bonnet.
   - Three sensors (glass vibration on the porthole ring, bell mic, valve clip)
     run in a tray along the plinth and across the floor to the REWARD console.
   - The console (free-standing, faces +z): three test sockets with fixed patch
     cords (BELL yellow, VALVE blue, GLASS red), three numbered sensor jacks, a DATA
     port and a RESET lever. Behind it the sensor cables come up from the floor,
     each with a paper tag, and cross over to the jacks: glass -> 1, valve -> 2,
     bell -> 3. Only the back shows that.
   - A whiteboard with the reward rule, a desk monitor with the reward curve, a
     pallet by the door with a boxed sign and a folded stepladder. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const TX = CL.Tex;
  const AR = CL.Ch3Art;
  const { ink } = CL.Ink;
  const PI = Math.PI;

  const { RW, RD, WALL_H, RX, COL_X } = CL.Room;
  const DP = 3.4, PCY = 3.35;
  const C = AR.CON;
  const CONS = { x: 4.0, z: 5.4, d: 0.5 };                 // console centre; front face at z + d/2
  const FRONT = CONS.z + CONS.d / 2;
  const VB = { x: 13.75, y: 1.15, z: 3.72 };               // the inner valve's body outside
  const RISER_X = 14.78;
  const SPOTS = {                                          // where the valve sensor clip can sit
    stem: { x: VB.x, y: 1.4, z: VB.z, axis: 'y' },
    up: { x: 13.2, y: VB.y, z: VB.z, axis: 'x' },
    down: { x: RISER_X, y: 2.12, z: VB.z, axis: 'y' },
  };
  const JUNCTION = new T.Vector3(14.3, 0.74, 3.56);
  const BIN = { x: 7.45, z: 3.98 };
  const DATA_R = { x: 8.8, y: 1.2 };                       // the reactor's own data port
  const SIGN_AT = { x: RX + 2.88, y: 2.7 };
  const PALLET = { x: 14.75, z: 8.6 };
  const PODS = {
    opus: { x: 1.5, z: 1.15, k: 1.0, label: 'OPUS 5.5' },
    sonnet: { x: 3.85, z: 0.95, k: 0.78, label: 'SONNET 5.5' },
  };
  const HAIKU_SPOT = { x: 5.85, z: 0.75, k: 0.56 };
  const BELL = { x: RX - 1.15, y: PCY + 1.05, z: DP - 0.12 };
  const WHEEL = { x: RX + 1.0, y: PCY - 1.15, z: DP - 0.1 };
  const CABLE = { bell: P.COAT, glass: P.BRASS, valve: P.HOODIE_LIGHT };   // sensor cable colours, reactor to console

  // ------------------------------------------------------------ helpers
  function curve(pts, tension) {
    return new T.CatmullRomCurve3(pts.map(p => (p.isVector3 ? p : new T.Vector3(...p))), false, 'catmullrom', tension === undefined ? 0.2 : tension);
  }
  function tube(pts, r, color, opt) {
    const cv = curve(pts, opt && opt.tension);
    const m = new T.Mesh(new T.TubeGeometry(cv, (opt && opt.seg) || Math.max(8, pts.length * 10), r, 8, false), K.m(color));
    m.userData.curve = cv;
    return m;
  }
  // a cable that sags between two points
  function sagPts(a, b, sag, lift) {
    const A = a.isVector3 ? a : new T.Vector3(...a), B = b.isVector3 ? b : new T.Vector3(...b);
    const m = A.clone().lerp(B, 0.5);
    m.y = Math.min(A.y, B.y) - sag + (lift || 0);
    return [A, A.clone().lerp(m, 0.5).setY((A.y + m.y) / 2 - sag * 0.2), m, B.clone().lerp(m, 0.5).setY((B.y + m.y) / 2 - sag * 0.2), B];
  }
  function led(color, r) {
    const m = K.mesh(new T.SphereGeometry(r || 0.035, 10, 8), ink(color, { flat: true }), 0, 0, 0);
    const on = new T.Color(color), off = new T.Color(P.INK_SOFT);
    m.userData.set = v => {
      m.material.uniforms.uColor.value.copy(v ? on : off);
      m.material.uniforms.uEmissive.value.copy(on).multiplyScalar(v ? 0.45 : 0);
    };
    m.userData.set(0);
    return m;
  }

  // ------------------------------------------------------------ build
  function build(world) {
    const scene = world.scene;
    const L = CL.Room.build(world, { clock: [14, 0] });
    const { back, left, right } = L.walls;
    const R = L.reactor;
    const G = L.grid;
    L.extra = [];

    // ---------------------------------------------------- pods: two in, doors open; Haiku's is only a pedestal
    L.pods = {};
    Object.entries(PODS).forEach(([name, c], i) => {
      const pd = K.pod(c.k, c.label, 21 + i);
      pd.root.position.set(c.x, 0, c.z);
      pd.hinge.rotation.y = -2.0;
      pd.frost.clear();
      scene.add(pd.root);
      pd.x = c.x; pd.z = c.z;
      L.pods[name] = pd;
      G.blockCircle(c.x, c.z, 0.98 * c.k);
    });
    const hk = new T.Group();
    hk.add(K.cyl(0.98 * HAIKU_SPOT.k, 0.98 * HAIKU_SPOT.k, 0.04, P.POD_SHADE, 0, 0.02, 0, 32));
    hk.add(K.cyl(0.98 * HAIKU_SPOT.k * 0.8, 0.98 * HAIKU_SPOT.k * 0.8, 0.045, P.FLOOR_DARK, 0, 0.022, 0, 32));
    for (let i = 0; i < 8; i++) { const a = i * PI / 4; hk.add(K.cyl(0.03, 0.03, 0.06, P.NAVY, Math.cos(a) * 0.48, 0.03, Math.sin(a) * 0.48, 8)); }
    hk.add(K.cyl(0.05, 0.05, 0.14, P.NAVY, 0, 0.07, -0.3, 8));
    hk.position.set(HAIKU_SPOT.x, 0, HAIKU_SPOT.z);
    scene.add(hk);
    L.haikuSpot = hk;

    // strip lights on the walls (one of them flickers)
    L.strips = [];
    const strip = (wall, x, z) => {
      const g = new T.Group();
      g.add(K.box(1.7, 0.1, 0.3, P.POD, 0, 0.05, 0.15));
      const tubeM = K.box(1.55, 0.07, 0.07, P.PAPER, 0, -0.03, 0.2, { flat: true });
      g.add(tubeM);
      g.position.set(x, 6.6, z || 0);
      wall.add(g);
      tubeM.userData.set = v => {
        tubeM.material.uniforms.uColor.value.set(v ? P.PAPER : P.POD_SHADE);
        tubeM.material.uniforms.uEmissive.value.set(v ? AR.hex(P.PAPER, 0.25) : '#000000');
      };
      tubeM.userData.set(1);
      L.strips.push(tubeM);
      return g;
    };
    strip(back, 2.6); strip(back, 5.4); strip(left, 5.2); strip(left, 2.4);

    // ---------------------------------------------------- reactor top: the REWARD board and the pellet globe
    const board = new T.Group();
    board.add(K.box(3.5, 1.7, 0.16, P.NAVY_DARK, 0, 0, 0));
    const bf = K.decal(3.4, 1.6, AR.boardFace(), {});
    bf.position.z = 0.085;
    board.add(bf);
    board.position.set(RX, 8.95, 3.58);
    scene.add(board);
    [-1.2, 1.2].forEach(x => scene.add(K.box(0.12, 0.3, 0.3, P.NAVY, RX + x, 8.15, 3.45)));
    L.board = board;
    L.digits = [0, 1, 2, 3].map(i => {
      const cv = AR.digitCanvas();
      AR.drawDigit(cv, 9);
      const t = TX.tex(cv);
      const d = K.decal(0.5, 0.72, t, {});
      d.position.set(-0.93 + i * 0.62, 0.12, 0.09);
      board.add(d);
      return { cv, tex: t, mesh: d, v: 9 };
    });
    L.lamps = [0, 1, 2].map(i => {
      const g = new T.Group();
      g.add(K.cyl(0.2, 0.2, 0.08, P.NAVY, 0, 0, 0, 20).rotateX(PI / 2));
      const face = K.decal(0.36, 0.36, AR.lampFace('on'), { useAlpha: true });
      face.position.z = 0.045;
      g.add(face);
      const gl = K.glow(P.CODE_GREEN, 0.9);
      gl.position.z = 0.1;
      g.add(gl);
      g.position.set(-1.7 + 0.95 + i * 1.0, -0.5, 0.1);
      board.add(g);
      return { g, face, glow: gl, state: 'on' };
    });

    // globe on the front-left corner of the top, on a bracket from the band
    const GL = new T.Vector3(8.3, 9.05, 3.9);
    L.globeAt = GL;
    const globe = new T.Group();
    globe.add(K.box(0.18, 0.12, 0.7, P.NAVY, 0, -0.95, -0.45));
    globe.add(K.cyl(0.24, 0.3, 0.22, P.BRASS, 0, -0.6, 0, 16));
    globe.add(K.box(0.36, 0.26, 0.36, P.NAVY, 0, -0.84, 0));
    globe.add(K.cyl(0.14, 0.18, 0.1, P.BRASS, 0, 0.56, 0, 14));
    // pellets inside (merged), then the glass
    globe.add(pelletHeap(36, 0.42, 0.06, 7, (r) => {
      const a = r() * 2 * PI, rr = Math.sqrt(r()) * 0.38, y = -0.42 + r() * 0.62;
      const lim = Math.sqrt(Math.max(0, 0.46 * 0.46 - y * y));
      return [Math.cos(a) * Math.min(rr, lim), y, Math.sin(a) * Math.min(rr, lim)];
    }));
    const glass = K.mesh(new T.SphereGeometry(0.52, 24, 16), ink(P.GLASS, { opacity: 0.28, depthWrite: false, hatch: 0 }), 0, 0, 0);
    glass.renderOrder = 2;
    globe.add(glass);
    globe.position.copy(GL);
    scene.add(globe);
    L.globe = globe;
    G.blockRect(BIN.x - 0.35, BIN.z - 0.32, BIN.x + 0.35, BIN.z + 0.32, 0.1);

    // the pellet rail: down the reactor's front-left corner into a bin on the plinth
    const railPath = [[GL.x, GL.y - 0.97, GL.z], [7.95, 7.9, 3.86], [7.72, 7.2, 3.8], [7.72, 1.6, 3.8], [7.6, 1.15, 3.9], [BIN.x, 0.98, BIN.z]];
    L.railCurve = curve(railPath, 0.1);
    [-0.05, 0.05].forEach(dx => scene.add(tube(railPath.map(p => [p[0] + dx, p[1], p[2] + (dx > 0 ? 0.03 : -0.03)]), 0.018, P.BRASS, { tension: 0.1, seg: 90 })));
    for (let y = 1.8; y < 7.2; y += 1.3) scene.add(K.box(0.06, 0.04, 0.42, P.NAVY, 7.72, y, 3.6));
    const bin = new T.Group();
    bin.add(K.box(0.62, 0.05, 0.56, P.NAVY, 0, 0.025, 0));
    [[-0.29, 0, 0.04, 0.56], [0.29, 0, 0.04, 0.56], [0, -0.26, 0.62, 0.04], [0, 0.26, 0.62, 0.04]].forEach(([x, z, w, d]) => bin.add(K.box(w, 0.36, d, P.NAVY_LIGHT, x, 0.18, z)));
    bin.add(K.box(0.3, 0.2, 0.3, P.NAVY, 0, 0.15, -0.38));
    bin.add(pelletHeap(26, 0.27, 0.055, 9, r => [(r() - 0.5) * 0.5, 0.36 + r() * 0.12 * (1 - Math.abs(r() - 0.5)), (r() - 0.5) * 0.44]));
    bin.position.set(BIN.x, 0.56, BIN.z);
    scene.add(bin);
    L.bin = bin;
    // pellets spilled across the floor (static, merged) and a pool for the ones that drop later
    L.spill = pelletHeap(46, 0, 0.07, 13, r => {
      const a = -0.3 + r() * 2.0, d = 0.6 + Math.pow(r(), 0.7) * 2.6;
      return [BIN.x - 0.2 - Math.cos(a) * d * 0.9, 0.07, 4.6 + Math.sin(a) * d * 0.55 + r() * 0.5];
    });
    scene.add(L.spill);

    // ---------------------------------------------------- behind the porthole: the bell, the inner wheel, the arms
    const bell = new T.Group();
    bell.add(K.cyl(0.025, 0.025, 0.8, P.NAVY_DARK, 0, 0.75, 0, 6));
    const swing = new T.Group();
    swing.position.y = 0.35;
    const prof = [[0.0, 0.0], [0.27, 0.0], [0.25, 0.05], [0.2, 0.18], [0.17, 0.34], [0.12, 0.42], [0.0, 0.44]].map(([x, y]) => new T.Vector2(x, y));
    const shell = K.mesh(new T.LatheGeometry(prof, 20), K.m(P.BRASS, { side: T.DoubleSide }), 0, -0.44, 0);
    swing.add(shell);
    swing.add(K.mesh(new T.SphereGeometry(0.06, 10, 8), K.m(P.INK), 0, -0.48, 0));
    swing.add(K.box(0.2, 0.04, 0.04, P.NAVY, 0.17, -0.02, 0));
    const rope = K.cyl(0.018, 0.018, 1, P.PAPER, 0, 0, 0, 6);
    const ropeG = new T.Group();
    ropeG.position.set(0.27, -0.02, 0);
    rope.position.y = -0.5;
    ropeG.add(rope);
    swing.add(ropeG);
    ropeG.scale.y = 0.95;
    bell.add(swing);
    bell.position.set(BELL.x, BELL.y, BELL.z);
    scene.add(bell);
    const bellWeb = K.decal(0.95, 0.85, AR.cobweb(0.95, 0.85, 4), { useAlpha: true, depthWrite: false, opacity: 0.9 });
    bellWeb.position.set(BELL.x - 0.3, BELL.y + 0.45, BELL.z - 0.03);
    scene.add(bellWeb);
    L.bell = { root: bell, swing, rope: ropeG, web: bellWeb, ropeEnd: new T.Vector3(BELL.x + 0.27, BELL.y + 0.35 - 0.97, BELL.z) };

    const wheelG = new T.Group();
    wheelG.add(K.cyl(0.07, 0.07, 0.5, P.NAVY, 0, 0, -0.25, 10).rotateX(PI / 2));
    const ww = K.wheel(0.34);
    wheelG.add(ww);
    wheelG.position.set(WHEEL.x, WHEEL.y, WHEEL.z);
    scene.add(wheelG);
    const wheelWeb = K.decal(0.7, 0.62, AR.cobweb(0.7, 0.62, 8), { useAlpha: true, depthWrite: false, opacity: 0.9 });
    wheelWeb.position.set(WHEEL.x + 0.12, WHEEL.y + 0.05, WHEEL.z + 0.06);
    scene.add(wheelWeb);
    L.wheel = { root: wheelG, wheel: ww, web: wheelWeb };

    // Fable's arms: big orange blocks that swing up from below the rim
    // at rest they hang down behind the face plate, out of sight
    const arm = (px, py, side) => {
      const pv = new T.Group();
      pv.position.set(px, py, DP - 0.22);
      const len = new T.Group();
      len.add(K.box(0.46, 1, 0.38, P.ORANGE, 0, 0.5, 0));
      len.add(K.box(0.5, 0.1, 0.42, P.ORANGE_DARK, 0, 0.97, 0));
      pv.add(len);
      pv.rotation.z = PI;
      len.scale.y = 0.8;
      scene.add(pv);
      return { pv, len, rest: PI, restLen: 0.8, side };
    };
    L.arms = { left: arm(RX - 2.15, PCY - 1.95, -1), right: arm(RX + 2.15, PCY - 1.95, 1) };

    // ---------------------------------------------------- sensors on the reactor
    // glass vibration pickup on the porthole ring (lower left)
    const vib = new T.Group();
    vib.add(K.box(0.26, 0.18, 0.1, P.NAVY_DARK, 0, 0, 0));
    const vibLed = led(P.ALARM, 0.035);
    vibLed.position.set(0.07, 0.03, 0.06);
    vib.add(vibLed);
    vib.add(K.box(0.1, 0.04, 0.02, P.SAFETY, -0.06, 0.03, 0.055, { flat: true }));
    const va = 215 * PI / 180;
    vib.position.set(RX + Math.cos(va) * 2.3, PCY + Math.sin(va) * 2.3, DP + 0.31);
    vib.rotation.z = va + PI / 2;
    scene.add(vib);
    L.vib = { root: vib, led: vibLed };
    // bell mic: a box where its cable leaves the reactor (upper left)
    const mic = new T.Group();
    mic.add(K.box(0.24, 0.24, 0.1, P.NAVY_DARK, 0, 0, 0));
    mic.add(K.cyl(0.06, 0.06, 0.04, P.INK_SOFT, 0, 0.02, 0.06, 12).rotateX(PI / 2));
    const micLed = led(P.CODE_GREEN, 0.03);
    micLed.position.set(0.08, -0.08, 0.06);
    mic.add(micLed);
    mic.position.set(8.55, 5.35, DP + 0.05);
    scene.add(mic);
    L.mic = { root: mic, led: micLed };

    // the reactor's own data port (Sonnet reads Fable's expectations here)
    const dport = new T.Group();
    dport.add(K.box(0.3, 0.24, 0.06, P.NAVY_DARK, 0, 0, 0));
    dport.add(K.box(0.14, 0.07, 0.03, P.INK, 0, 0.02, 0.04, { flat: true }));
    dport.add(K.box(0.2, 0.04, 0.02, P.SCREEN, 0, -0.07, 0.035, { flat: true }));
    dport.position.set(DATA_R.x, DATA_R.y, DP + 0.03);
    scene.add(dport);
    L.dataR = dport;

    // empty sign bracket: four bolts and a faint outline where the sign will go
    R.sign.visible = false;
    const bracket = new T.Group();
    bracket.add(K.decal(0.7, 1.28, TX.tex(TX.paint(0.7, 1.28, 200, g => {
      g.stroke(CL.gfx.rect(0.03, 0.03, 0.67, 1.25), 0.9, P.REACTOR_DEEP, 0.7);
    })), { useAlpha: true }));
    [[-0.25, 0.55], [0.25, 0.55], [-0.25, -0.55], [0.25, -0.55]].forEach(([x, y]) => bracket.add(K.cyl(0.035, 0.035, 0.05, P.NAVY_DARK, x, y, 0.02, 8).rotateX(PI / 2)));
    bracket.position.set(SIGN_AT.x, SIGN_AT.y, DP + 0.02);
    scene.add(bracket);
    L.bracket = bracket;

    // ---------------------------------------------------- the inner valve, outside
    const vg = new T.Group();
    scene.add(vg);
    const run = (pts, r, col) => CL.Room.run(vg, pts, r || 0.07, col || P.POD);
    run([[12.95, VB.y, DP], [12.95, VB.y, VB.z], [VB.x - 0.17, VB.y, VB.z]]);
    run([[VB.x + 0.17, VB.y, VB.z], [RISER_X, VB.y, VB.z], [RISER_X, 3.5, VB.z]]);
    vg.add(K.flange(12.95, VB.y, DP + 0.08, 0.07, 'z'));
    vg.add(K.box(0.34, 0.3, 0.3, P.NAVY, VB.x, VB.y, VB.z));
    [VB.x - 0.19, VB.x + 0.19].forEach(x => vg.add(K.flange(x, VB.y, VB.z, 0.07, 'x')));
    vg.add(K.cyl(0.07, 0.09, 0.2, P.NAVY, VB.x, VB.y + 0.25, VB.z, 12));
    vg.add(K.cyl(0.05, 0.05, 0.12, P.NAVY_DARK, VB.x, VB.y + 0.41, VB.z, 10));
    const stem = new T.Group();
    stem.position.set(VB.x, VB.y + 0.46, VB.z);
    stem.add(K.cyl(0.032, 0.032, 1, P.SAFETY, 0, 0.5, 0, 8));
    stem.scale.y = 0.08;
    vg.add(stem);
    L.stem = stem;
    // whistle on top of the riser
    const wh = new T.Group();
    wh.add(K.cyl(0.08, 0.08, 0.12, P.NAVY, 0, 0.06, 0, 12));
    wh.add(K.cyl(0.09, 0.09, 0.42, P.BRASS, 0, 0.33, 0, 16));
    wh.add(K.box(0.04, 0.1, 0.12, P.INK, 0, 0.22, 0.09, { flat: true }));
    wh.add(K.cyl(0.1, 0.06, 0.06, P.BRASS_LIGHT, 0, 0.57, 0, 16));
    wh.position.set(RISER_X, 3.5, VB.z);
    vg.add(wh);
    L.whistle = wh;
    L.whistleTop = new T.Vector3(RISER_X, 4.1, VB.z);
    // flow gauge on the riser
    const fg = K.gauge(0.15);
    fg.position.set(RISER_X, 2.88, VB.z + 0.16);
    vg.add(K.pipe(RISER_X, 2.88, VB.z, RISER_X, 2.88, VB.z + 0.1, 0.03, P.NAVY));
    vg.add(fg);
    fg.userData.set(0.02);
    L.flowGauge = fg;
    // two empty sensor brackets: on the inlet (low) and high on the riser
    L.saddles = {};
    ['up', 'down'].forEach(k => {
      const s = SPOTS[k];
      const g = new T.Group();
      const ring = new T.Mesh(new T.TorusGeometry(0.1, 0.022, 6, 18), K.m(P.NAVY_DARK));
      if (s.axis === 'y') ring.rotation.x = PI / 2; else ring.rotation.y = PI / 2;
      g.add(ring);
      g.add(K.box(0.14, 0.1, 0.05, P.NAVY_DARK, 0, 0, 0.12));
      [-0.04, 0.04].forEach(x => g.add(K.cyl(0.015, 0.015, 0.03, P.BRASS, x, 0, 0.15, 6).rotateX(PI / 2)));
      g.position.set(s.x, s.y, s.z);
      vg.add(g);
      L.saddles[k] = g;
    });
    // the sensor clip: a yellow clamp with a head and an LED (placed by the rules)
    const clip = new T.Group();
    const jaw = new T.Mesh(new T.TorusGeometry(0.11, 0.035, 6, 16, PI * 1.5), K.m(P.SAFETY));
    jaw.rotation.z = PI * 0.25;
    const jawG = new T.Group();
    jawG.add(jaw);
    clip.add(jawG);
    clip.add(K.box(0.16, 0.14, 0.1, P.SAFETY, 0, 0, 0.15));
    clip.add(K.box(0.17, 0.04, 0.11, P.HAZARD_DARK, 0, 0.05, 0.15));
    const clipLed = led(P.CODE_GREEN, 0.03);
    clipLed.position.set(0, -0.02, 0.21);
    clip.add(clipLed);
    scene.add(clip);
    L.clip = { root: clip, jaw: jawG, led: clipLed };
    L.junction = JUNCTION;
    vg.add(K.box(0.24, 0.2, 0.14, P.NAVY, JUNCTION.x, JUNCTION.y, JUNCTION.z));
    L.valveGroup = vg;

    // ---------------------------------------------------- cable tray along the plinth and across the floor
    const trayPts = [[14.42, 0.6, 3.56], [7.2, 0.6, 3.56], [6.98, 0.45, 3.56], [6.98, 0.035, 3.7], [6.98, 0.035, 4.85], [CONS.x + 1.1, 0.035, 4.85]];
    const tray = new T.Group();
    for (let i = 0; i < trayPts.length - 1; i++) {
      const a = new T.Vector3(...trayPts[i]), b = new T.Vector3(...trayPts[i + 1]);
      const len = a.distanceTo(b);
      const m = K.box(0.2, 0.06, len, P.NAVY_DARK, 0, 0, 0);
      m.position.copy(a).lerp(b, 0.5);
      m.lookAt(b);
      tray.add(m);
    }
    // yellow-black edges on the floor run so it reads as a cable cover
    tray.add(K.box(0.03, 0.065, 1.15, P.SAFETY, 6.87, 0.035, 4.28));
    tray.add(K.box(0.03, 0.065, 1.15, P.SAFETY, 7.09, 0.035, 4.28));
    scene.add(tray);
    L.tray = tray;
    // cables from the sensors down to the tray (the clip's follows the clip; see the rules)
    const vibP = vib.position;
    scene.add(tube([[vibP.x + 0.1, vibP.y - 0.06, DP + 0.3], [vibP.x + 0.2, vibP.y - 0.3, DP + 0.12], [vibP.x + 0.2, 1.2, DP + 0.04], [vibP.x + 0.2, 0.62, 3.5]], 0.024, CABLE.glass));
    scene.add(tube([[8.55, 5.22, DP + 0.05], [8.15, 5.0, DP + 0.04], [8.12, 3.0, DP + 0.04], [8.12, 0.62, 3.5]], 0.024, CABLE.bell));
    scene.add(tube([[JUNCTION.x - 0.1, JUNCTION.y - 0.05, JUNCTION.z], [14.1, 0.64, 3.56]], 0.024, CABLE.valve));

    // ---------------------------------------------------- the REWARD console
    const con = new T.Group();
    con.position.set(CONS.x, 0, CONS.z);
    scene.add(con);
    con.add(K.box(C.W + 0.1, 0.12, CONS.d + 0.1, P.NAVY_DARK, 0, 0.06, 0));
    con.add(K.box(C.W, C.Y1, CONS.d, P.NAVY, 0, C.Y1 / 2, 0));
    con.add(K.box(C.W + 0.08, 0.08, CONS.d + 0.08, P.NAVY_DARK, 0, C.Y1 + 0.04, 0));
    const ff = K.decal(C.W - 0.02, C.Y1 - C.Y0, AR.consoleFront(), {});
    ff.position.set(0, (C.Y0 + C.Y1) / 2, CONS.d / 2 + 0.006);
    con.add(ff);
    const fb = K.decal(C.W - 0.02, C.Y1 - C.Y0, AR.consoleBack(), {});
    fb.position.set(0, (C.Y0 + C.Y1) / 2, -CONS.d / 2 - 0.006);
    fb.rotation.y = PI;
    con.add(fb);
    L.console = con;
    L.consoleFront = ff;
    L.consoleBack = fb;
    // test sockets (cord ends are fixed here)
    L.sockets = C.slots.map((x, i) => {
      const s = K.cyl(0.075, 0.075, 0.1, P.NAVY_DARK, x, C.slotY, CONS.d / 2 + 0.05, 14).rotateX(PI / 2);
      con.add(s);
      con.add(K.cyl(0.05, 0.05, 0.12, AR.TESTS[i].cord, x, C.slotY, CONS.d / 2 + 0.07, 12).rotateX(PI / 2));
      return new T.Vector3(CONS.x + x, C.slotY, FRONT + 0.12);
    });
    // sensor jacks: brass rings with a dark mouth
    L.jacks = C.slots.map((x, i) => {
      const g = new T.Group();
      g.add(new T.Mesh(new T.TorusGeometry(0.085, 0.028, 8, 20), K.m(P.BRASS)));
      g.add(K.mesh(new T.CircleGeometry(0.065, 16), ink(P.INK, { flat: true }), 0, 0, -0.005));
      const hit = K.mesh(new T.CircleGeometry(0.24, 16), ink(P.NAVY, { flat: true, opacity: 0.0, depthWrite: false }), 0, 0, 0.01);
      g.add(hit);
      g.position.set(x, C.jackY, CONS.d / 2 + 0.02);
      con.add(g);
      return { g, at: new T.Vector3(CONS.x + x, C.jackY, FRONT + 0.02), n: i + 1 };
    });
    // DATA port and RESET lever
    const dp = new T.Group();
    dp.add(K.box(0.24, 0.18, 0.05, P.NAVY_DARK, 0, 0, 0));
    dp.add(K.box(0.12, 0.06, 0.02, P.INK, 0, 0, 0.03, { flat: true }));
    dp.position.set(C.dataX, C.dataY, CONS.d / 2 + 0.025);
    con.add(dp);
    L.dataC = dp;
    L.dataCAt = new T.Vector3(CONS.x + C.dataX, C.dataY, FRONT + 0.05);
    const lever = new T.Group();
    lever.position.set(C.resetX, 1.2, CONS.d / 2 + 0.04);
    lever.add(K.box(0.05, 0.36, 0.05, P.NAVY_LIGHT, 0, 0.18, 0.02));
    lever.add(K.box(0.22, 0.07, 0.07, P.WHEEL_RED, 0, 0.38, 0.04));
    // a generous click target, flush with the face so the ink pass draws no edge for it
    L.leverHit = K.mesh(new T.PlaneGeometry(0.4, 0.62), ink(P.NAVY, { opacity: 0, depthWrite: false }), C.resetX, 1.42, CONS.d / 2 + 0.01);
    con.add(L.leverHit);
    lever.rotation.x = 0;
    con.add(lever);
    L.lever = lever;
    // the cords' plugs (positions and cords are driven by the rules)
    L.plugs = AR.TESTS.map((t, i) => {
      const g = new T.Group();
      g.add(K.cyl(0.05, 0.05, 0.16, t.cord, 0, 0, 0.08, 12).rotateX(PI / 2));
      g.add(K.cyl(0.026, 0.026, 0.08, P.BRASS, 0, 0, -0.03, 8).rotateX(PI / 2));
      g.add(K.cyl(0.055, 0.055, 0.03, P.INK, 0, 0, 0.17, 12).rotateX(PI / 2));
      scene.add(g);
      const cord = new T.Mesh(new T.BufferGeometry(), K.m(t.cord));
      scene.add(cord);
      return { g, cord, color: t.cord, test: t.id, i };
    });
    // the back: the sensor cables come out of the tray end along the floor, each rises behind
    // a jack with its paper tag on it, then crosses over to the jack it really feeds
    const BACK = CONS.z - CONS.d / 2;
    const tagX = { bell: C.slots[0], glass: C.slots[1], valve: C.slots[2] };
    const toJack = { glass: 0, valve: 1, bell: 2 };
    L.backTags = {};
    L.backCables = new T.Group();
    scene.add(L.backCables);
    Object.keys(tagX).forEach((k, i) => {
      const tx = CONS.x + tagX[k], jx = CONS.x + C.slots[toJack[k]];
      const zr = BACK - 0.26 - i * 0.07;
      const pts = [[CONS.x + 1.1, 0.05, 4.85 - i * 0.02], [CONS.x + 1.1, 0.05, zr], [tx, 0.05, zr], [tx, 0.66 + i * 0.05, zr], [jx, C.jackY - 0.05, BACK - 0.1], [jx, C.jackY, BACK - 0.02]];
      CL.Room.run(L.backCables, pts, 0.032, CABLE[k]);
      scene.add(K.cyl(0.055, 0.055, 0.08, P.BRASS, jx, C.jackY, BACK - 0.03, 10).rotateX(PI / 2));
      const tg = K.decal(0.4, 0.48, AR.tag(k), { useAlpha: true, side: T.DoubleSide });
      tg.position.set(tx, 0.36, zr - 0.05);
      tg.rotation.y = PI;
      tg.rotation.z = (i - 1) * 0.06;
      scene.add(tg);
      L.backTags[k] = tg;
    });
    G.blockRect(CONS.x - C.W / 2, CONS.z - CONS.d / 2, CONS.x + C.W / 2, CONS.z + CONS.d / 2);

    // ---------------------------------------------------- left wall: whiteboard and the run's desk
    const wb = new T.Group();
    wb.add(K.box(2.56, 1.64, 0.06, P.NAVY_LIGHT, 0, 0, 0.03));
    const wbf = K.decal(2.4, 1.5, AR.whiteboard(), {});
    wbf.position.z = 0.065;
    wb.add(wbf);
    wb.add(K.box(2.0, 0.05, 0.12, P.NAVY_LIGHT, 0, -0.84, 0.08));
    wb.position.set(RD - 4.9, 2.25, 0.02);
    left.add(wb);
    L.whiteboard = wb;
    const desk = new T.Group();
    desk.add(K.box(0.8, 0.06, 1.1, P.REACTOR_SHADE, 0, 0.74, 0));
    [[-0.34, -0.48], [0.34, -0.48], [-0.34, 0.48], [0.34, 0.48]].forEach(([x, z]) => desk.add(K.box(0.05, 0.72, 0.05, P.NAVY, x, 0.36, z)));
    const mon = new T.Group();
    mon.add(K.box(0.5, 0.42, 0.62, P.POD_SHADE, 0, 0.21, 0));
    mon.add(K.box(0.12, 0.06, 0.2, P.POD_SHADE, 0, -0.02, 0));
    const ms = K.decal(0.5, 0.36, AR.monitorScreen(), { emissive: AR.hex(P.NAVY_DARK, 0.4) });
    ms.position.set(0.251, 0.22, 0);
    ms.rotation.y = PI / 2;
    mon.add(ms);
    mon.position.set(-0.05, 0.8, 0.05);
    desk.add(mon);
    desk.add(K.cyl(0.06, 0.05, 0.12, P.COAT, 0.22, 0.83, -0.38, 10));
    desk.position.set(0.75, 0, 2.85);
    scene.add(desk);
    L.desk = desk;
    L.monitor = mon;
    G.blockRect(0.35, 2.3, 1.15, 3.4);

    // ---------------------------------------------------- by the door: the boxed sign and a folded stepladder
    const pal = new T.Group();
    pal.add(K.box(1.05, 0.12, 1.7, P.COPPER, 0, 0.06, 0));
    [-0.4, 0, 0.4].forEach(x => pal.add(K.box(0.12, 0.1, 1.7, P.ORANGE_DEEP, x, 0.05, 0)));
    const box = new T.Mesh(new T.BoxGeometry(0.86, 0.14, 1.42), ink('#FFFFFF', { map: TX.crate('SIGN') }));
    box.position.y = 0.19;
    pal.add(box);
    L.signBox = box;
    const ladder = stepladder();
    ladder.root.rotation.set(-PI / 2, 0, 0);
    ladder.root.position.set(0, 0.32, 0.72);
    pal.add(ladder.root);
    // a strap over both
    pal.add(K.box(1.0, 0.02, 0.06, P.TIE_RED, 0, 0.34, 0.0));
    pal.position.set(PALLET.x, 0, PALLET.z);
    scene.add(pal);
    L.pallet = pal;
    L.ladder = ladder;
    G.blockRect(PALLET.x - 0.55, PALLET.z - 0.85, PALLET.x + 0.55, PALLET.z + 0.85);

    // the mounted sign is the reactor's own (R.sign); the rules reveal it at the end
    world.rig.bounds = [3.0, 13.2, 3.0, 7.0];
    return L;
  }

  // merged little spheres: n pellets, glowing amber
  function pelletHeap(n, spread, r, seed, place) {
    const rng = CL.gfx.rng(seed);
    const base = new T.SphereGeometry(r, 8, 6);
    const bp = base.attributes.position.array, bn = base.attributes.normal.array, bi = base.index.array;
    const pos = new Float32Array(bp.length * n), nor = new Float32Array(bn.length * n), idx = [];
    for (let k = 0; k < n; k++) {
      const [x, y, z] = place(rng);
      for (let i = 0; i < bp.length; i += 3) {
        pos[k * bp.length + i] = bp[i] + x; pos[k * bp.length + i + 1] = bp[i + 1] + y; pos[k * bp.length + i + 2] = bp[i + 2] + z;
        nor[k * bn.length + i] = bn[i]; nor[k * bn.length + i + 1] = bn[i + 1]; nor[k * bn.length + i + 2] = bn[i + 2];
      }
      for (let i = 0; i < bi.length; i++) idx.push(bi[i] + k * (bp.length / 3));
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    g.setAttribute('uv', new T.BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
    g.setIndex(idx);
    return new T.Mesh(g, pelletMat());
  }
  let _pm = null;
  function pelletMat() { return _pm || (_pm = ink(P.GLOW, { emissive: AR.hex(P.GLOW, 0.32), shadeMin: 0.75, hatch: 0.05 })); }

  // an A-frame stepladder; open(v) spreads the legs (0 folded .. 1 open), top step at about 0.95
  function stepladder() {
    const root = new T.Group();
    const front = new T.Group(), backL = new T.Group();
    const H = 1.05;
    [-0.24, 0.24].forEach(x => front.add(K.box(0.06, H, 0.06, P.NAVY_LIGHT, x, -H / 2, 0)));
    for (let i = 1; i <= 3; i++) front.add(K.box(0.5, 0.04, 0.14, P.SAFETY, 0, -H * i / 3.6, 0.04));
    [-0.24, 0.24].forEach(x => backL.add(K.box(0.05, H, 0.05, P.NAVY_LIGHT, x, -H / 2, 0)));
    backL.add(K.box(0.5, 0.04, 0.04, P.NAVY_LIGHT, 0, -H * 0.6, 0));
    const top = K.box(0.58, 0.06, 0.32, P.SAFETY, 0, 0.02, -0.06);
    root.add(front, backL, top);
    const hinge = new T.Group();
    hinge.add(root);
    root.position.y = H;
    function open(v) {
      front.rotation.x = -0.36 * v;
      backL.rotation.x = 0.36 * v;
      root.position.y = H * (0.94 + 0.06 * (1 - v));
    }
    open(0);
    return { root: hinge, open, H, step: 0.95 };
  }

  CL.Ch3Level = { CABLE, build, DP, PCY, CONS, FRONT, VB, RISER_X, SPOTS, JUNCTION, BIN, DATA_R, SIGN_AT, PALLET, PODS, BELL, WHEEL, HAIKU_SPOT, stepladder, pelletMat, tube, sagPts, curve, led };
})(window.CL = window.CL || {});
