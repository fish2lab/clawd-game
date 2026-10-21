/* Chapter 1 · 预训练 · the lab 90 days before release, 22:40.

   No cryo pods yet. Where they will stand there is a little library: shelving, a
   reading desk, and corpus on caster pallets (layout.js). The rest of the night's
   machinery, all on one breaker panel (left wall, five switches, limit 4 A):

     conveyor (2)  from the scale in the back corner up to the skip hoist
     magnet (1)    over the conveyor; pulls stapled SPAM flyers into the hazard bin
     hoist (2)     the skip climbs the tower and tips into the hopper on the reactor;
                   it only climbs with a heavy counterweight in the cage
     mixer (4)     the drive on top of the reactor; the paddle turns behind the glass
     desk lamp (1) the only light in the room

   On the reactor: a sight glass with a FULL mark, the skim valve at that height
   (drains whatever floats above it into the drum), the LOSS dial on the back wall. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const A = CL.Ch1Art;
  const LAY = CL.Ch1Layout;
  const { ink } = CL.Ink;
  const PI = Math.PI;
  const { RW, RD, WALL_H, RX } = CL.Room;

  // ---------------------------------------------------- where things are (world units)
  const SCALE = LAY.find('S');            // [2, 1]
  const DUP = LAY.find('D');              // [3, 2]
  const BELT = { x0: 2.55, x1: 5.45, y0: 0.27, y1: 0.95, z: 1.0, w: 0.9 };
  BELT.ang = Math.atan2(BELT.y1 - BELT.y0, BELT.x1 - BELT.x0);
  BELT.len = Math.hypot(BELT.x1 - BELT.x0, BELT.y1 - BELT.y0);
  BELT.at = s => [BELT.x0 + s * Math.cos(BELT.ang), BELT.y0 + s * Math.sin(BELT.ang), BELT.z];
  const MAGNET = { x: 4.0, y: 1.72, z: 1.0 };
  MAGNET.s = (MAGNET.x - BELT.x0) / Math.cos(BELT.ang);
  const BIN = { x: 4.85, y: 1.25, z: 0.3 };                 // SPAM bin on the wall
  const LIFT = { x: 6.0, zSkip: 1.0, zCage: 2.0, top: 9.4, sheaveY: 10.6, cageRest: 0.6, cageLow: 0.05 };
  const EMPTIES = { x: 4.75, z: 1.0 };                       // where empty pallets pile, under the belt
  const HOPPER = { x: 8.7, y: 9.2, z: 1.0 };
  const PANEL = { lx0: 4.6, lx1: 6.6, y0: 0.35, y1: 1.75 };  // on the left wall, local x (world z = 10 - lx)
  const SWITCHES = [                                         // left to right as you face the panel
    { id: 'mixer', load: 4, lx: 5.02 },
    { id: 'belt', load: 2, lx: 5.32 },
    { id: 'lamp', load: 1, lx: 5.62 },
    { id: 'lift', load: 2, lx: 5.92 },
    { id: 'magnet', load: 1, lx: 6.22 },
  ];
  const CTRL_Y = 0.84;
  const MAIN = { lx: 6.46, y: CTRL_Y };
  const AMMETER = { lx: 5.62, y: 1.45 };
  const LIMIT = 4;
  const DESK = [2, 6];
  const PC = { x: RX, y: 3.35, z: 3.4, r: 2.0 };              // porthole
  const LEVELS = [0, 0.27, 0.44, 0.6, 0.72, 0.8];             // liquid height (fraction of the porthole) by bundles
  const levelY = n => PC.y - PC.r + 2 * PC.r * LEVELS[Math.max(0, Math.min(5, n))];
  const SIGHT = { x: 8.05, y0: 1.2, y1: 5.2 };
  const SKIM = { x: 8.5, y: 1.3, z: 3.55, full: levelY(LAY.FULL) };
  const DRUM = { x: 7.42, z: 2.95, r: 0.3, h: 0.9 };

  function build(world) {
    const scene = world.scene;
    const L = CL.Room.build(world, { clock: [22, 40], stencils: false });
    const { back, left } = L.walls;
    const G = L.grid;
    L.reactorLamps.forEach(l => l.userData.set(0));
    L.reactor.sign.visible = false;

    // ---------------------------------------------------- back wall: stencil, LOSS dial
    const st = K.decal(4.2, 0.7, A.T1.stencil('CORPUS'), { useAlpha: true });
    st.position.set(3.4, 5.7, 0.02);
    back.add(st);
    L.loss = A.dial(0.72, A.T1.lossDial(), { lit: true });
    L.loss.position.set(3.0, 3.75, 0.1);
    back.add(L.loss);
    L.loss.userData.set(1);

    // ---------------------------------------------------- the scale in the corner, the DUP bay
    const [sx, sz] = SCALE;
    const plate = K.decal(0.96, 0.96, A.T1.plate(), {});
    plate.rotation.x = -PI / 2;
    plate.position.set(sx, 0.006, sz);
    scene.add(plate);
    // the load cell's data port on the west rim, and the feed lever beside it
    const port = new T.Group();
    port.add(K.box(0.14, 0.34, 0.2, P.NAVY_DARK, 0, 0.17, 0));
    port.add(K.box(0.02, 0.07, 0.1, P.INK, 0.075, 0.27, 0));
    const portLamp = A.pilot(P.SCREEN, 0.03);
    portLamp.rotation.y = PI / 2;
    portLamp.position.set(0.075, 0.18, 0);
    port.add(portLamp);
    port.position.set(sx - 0.56, 0, sz - 0.18);
    scene.add(port);
    const leverPost = new T.Group();
    leverPost.add(K.box(0.12, 0.5, 0.12, P.NAVY, 0, 0.25, 0));
    const feedLever = new T.Group();
    feedLever.position.set(0, 0.48, 0);
    feedLever.add(K.box(0.04, 0.38, 0.04, P.HOODIE_LIGHT, 0, 0.19, 0));
    feedLever.add(K.mesh(new T.SphereGeometry(0.06, 10, 8), K.m(P.WHEEL_RED), 0, 0.4, 0));
    leverPost.add(feedLever);
    leverPost.position.set(sx - 0.56, 0, sz + 0.3);
    scene.add(leverPost);
    L.scale = { plate, port, portLamp, leverPost, lever: feedLever, x: sx, z: sz };
    const [dx, dz] = DUP;
    const dupFloor = K.decal(0.96, 0.96, A.T1.dupFloor(), { useAlpha: true });
    dupFloor.rotation.x = -PI / 2;
    dupFloor.position.set(dx, 0.007, dz);
    scene.add(dupFloor);
    const dupSign = new T.Group();
    [-0.3, 0.3].forEach(o => dupSign.add(K.box(0.04, 1.1, 0.04, P.NAVY, o, 0.55, 0)));
    const ds = K.decal(0.7, 0.24, A.T1.dupSign(), {});
    ds.position.set(0, 1.0, 0.03);
    dupSign.add(ds);
    dupSign.position.set(dx, 0, 1.5);
    scene.add(dupSign);
    L.dup = { floor: dupFloor, sign: dupSign, x: dx, z: dz };

    // ---------------------------------------------------- conveyor: up the back wall to the skip
    const belt = new T.Group();
    belt.position.set(BELT.x0, BELT.y0, BELT.z);
    belt.rotation.z = BELT.ang;
    const bt = A.T1.belt().clone();
    bt.needsUpdate = true;
    bt.wrapS = bt.wrapT = T.RepeatWrapping;
    bt.repeat.set(BELT.len / 0.5, 1);
    const surf = A.faced(BELT.len, 0.05, BELT.w, [K.m(P.INK), K.m(P.INK), ink(P.PAPER, { map: bt, hatch: 0.05 }), K.m(P.INK), K.m(P.INK_SOFT), K.m(P.INK_SOFT)], BELT.len / 2, -0.025, 0);
    belt.add(surf);
    [-1, 1].forEach(s => belt.add(K.box(BELT.len + 0.1, 0.12, 0.05, P.NAVY, BELT.len / 2, -0.03, s * (BELT.w / 2 + 0.03))));
    [0, BELT.len].forEach(x => { const r = K.cyl(0.09, 0.09, BELT.w + 0.04, P.NAVY_LIGHT, x, -0.06, 0, 14); r.rotation.x = PI / 2; belt.add(r); });
    scene.add(belt);
    [2.75, 3.8, 5.3].forEach(x => {
      const top = BELT.y0 + (x - BELT.x0) * Math.tan(BELT.ang) - 0.08;
      [-1, 1].forEach(s => scene.add(K.box(0.06, top, 0.06, P.NAVY_DARK, x, top / 2, BELT.z + s * 0.42)));
    });
    // drive motor under the tail, with its pilot lamp
    scene.add(K.box(0.36, 0.22, 0.3, P.NAVY, 3.1, 0.11, 0.62));
    const beltPilot = A.pilot(P.CODE_GREEN, 0.035);
    beltPilot.position.set(3.1, 0.14, 0.78);
    scene.add(beltPilot);
    L.belt = { group: belt, tex: bt, pilot: beltPilot };

    // ---------------------------------------------------- magnet and the SPAM bin
    const mag = new T.Group();
    mag.add(K.box(0.5, 0.36, 0.06, P.NAVY_DARK, 0, 0.27, -MAGNET.z + 0.03));
    mag.add(K.box(0.08, 0.08, MAGNET.z, P.NAVY, 0, 0.27, -MAGNET.z / 2));
    mag.add(K.box(0.04, 0.2, 0.04, P.NAVY, 0, 0.17, 0));
    mag.add(K.cyl(0.27, 0.27, 0.16, P.NAVY, 0, 0, 0, 24));
    mag.add(K.cyl(0.28, 0.28, 0.07, P.WHEEL_RED, 0, 0.02, 0, 24));
    mag.add(K.cyl(0.2, 0.2, 0.02, P.HOODIE_LIGHT, 0, -0.085, 0, 20));
    const magPilot = A.pilot(P.SAFETY, 0.035);
    magPilot.position.set(0.12, 0.33, -MAGNET.z + 0.07);
    mag.add(magPilot);
    const field = new T.Group();
    [0, 1].forEach(i => {
      const ring = K.mesh(new T.TorusGeometry(0.22, 0.008, 6, 28), ink(P.SAFETY, { flat: true, lit: true, opacity: 0.0 }), 0, -0.12, 0);
      ring.rotation.x = PI / 2;
      ring.layers.set(1);
      field.add(ring);
    });
    mag.add(field);
    mag.position.set(MAGNET.x, MAGNET.y, MAGNET.z);
    scene.add(mag);
    L.magnet = { group: mag, pilot: magPilot, field };
    const bin = new T.Group();
    const hz = A.T1.hazard();
    bin.add(A.faced(0.62, 0.6, 0.42, [K.m(P.SAFETY), K.m(P.SAFETY), K.m(P.HAZARD_DARK), K.m(P.HAZARD_DARK), A.mapMat(hz), K.m(P.SAFETY)], 0, 0.3, 0));
    bin.add(K.box(0.66, 0.05, 0.46, P.NAVY_DARK, 0, 0.6, 0));
    bin.add(K.box(0.2, 0.25, 0.1, P.NAVY_DARK, 0, 0.1, -0.24));
    const binFill = new T.Group();
    bin.add(binFill);
    bin.position.set(BIN.x, BIN.y, BIN.z);
    scene.add(bin);
    L.bin = { group: bin, fill: binFill };

    // ---------------------------------------------------- the skip hoist and its counterweight cage
    const tower = new T.Group();
    [LIFT.x - 0.42, LIFT.x + 0.42].forEach(x => tower.add(K.box(0.08, LIFT.sheaveY + 0.4, 0.08, P.NAVY, x, (LIFT.sheaveY + 0.4) / 2, 0.42)));
    for (let y = 1.3; y < LIFT.sheaveY; y += 1.3) tower.add(K.box(0.84, 0.05, 0.05, P.NAVY_DARK, LIFT.x, y, 0.38));
    tower.add(K.box(0.96, 0.12, 2.0, P.NAVY, LIFT.x, LIFT.sheaveY + 0.62, 1.15));
    [-1, 1].forEach(s => tower.add(K.box(0.05, 0.75, 0.36, P.NAVY_DARK, LIFT.x + s * 0.18, LIFT.sheaveY + 0.25, 1.5)));
    const sheave = A.sheave(0.5);
    sheave.position.set(LIFT.x, LIFT.sheaveY, 1.5);
    tower.add(sheave);
    tower.add(K.box(0.34, 0.4, 0.4, P.NAVY_DARK, LIFT.x + 0.4, LIFT.sheaveY, 1.5));
    const liftPilot = A.pilot(P.CODE_GREEN, 0.04);
    liftPilot.position.set(LIFT.x + 0.4, LIFT.sheaveY + 0.08, 1.71);
    tower.add(liftPilot);
    // chute from the top of the tower to the hopper
    const chute = new T.Group();
    const cl = HOPPER.x - 0.2 - (LIFT.x + 0.45);
    chute.add(K.box(cl, 0.04, 0.5, P.NAVY_LIGHT, cl / 2, 0, 0));
    [-1, 1].forEach(s => chute.add(K.box(cl, 0.16, 0.04, P.NAVY, cl / 2, 0.06, s * 0.25)));
    chute.position.set(LIFT.x + 0.45, LIFT.top + 0.7, LIFT.zSkip);
    chute.rotation.z = -0.06;
    tower.add(chute);
    scene.add(tower);
    const skipPivot = new T.Group();      // pivots about the skip's east top edge to tip
    const skipBody = A.skip();
    skipBody.position.set(-0.4, -0.7, 0);
    skipPivot.add(skipBody);
    skipPivot.position.set(LIFT.x + 0.4, 0.05 + 0.7, LIFT.zSkip);
    scene.add(skipPivot);
    const cage = A.cage();
    cage.position.set(LIFT.x, LIFT.cageRest, LIFT.zCage);
    scene.add(cage);
    const rope = () => { const r = K.cyl(0.018, 0.018, 1, P.INK, 0, 0, 0, 6); scene.add(r); return r; };
    L.lift = { tower, sheave, pilot: liftPilot, skip: skipPivot, skipBody, cage, ropes: [rope(), rope()], chute };

    // hopper on the reactor's shoulder
    const hop = new T.Group();
    const funnel = K.mesh(new T.CylinderGeometry(0.62, 0.2, 0.62, 24, 1, true), K.m(P.NAVY, { side: T.DoubleSide }), 0, 0.31, 0);
    hop.add(funnel);
    hop.add(K.mesh(new T.TorusGeometry(0.62, 0.04, 6, 24), K.m(P.NAVY_DARK), 0, 0.62, 0).rotateX(PI / 2));
    hop.add(K.cyl(0.24, 0.24, 0.2, P.NAVY_DARK, 0, -0.05, 0, 16));
    hop.position.set(HOPPER.x, HOPPER.y, HOPPER.z);
    scene.add(hop);
    L.hopper = hop;

    // ---------------------------------------------------- the breaker panel (left wall)
    const panel = new T.Group();
    const pw = PANEL.lx1 - PANEL.lx0, ph = PANEL.y1 - PANEL.y0;
    panel.add(K.box(pw, ph, 0.16, P.NAVY, PANEL.lx0 + pw / 2, PANEL.y0 + ph / 2, 0.08));
    panel.add(K.box(pw - 0.1, ph - 0.1, 0.02, P.NAVY_LIGHT, PANEL.lx0 + pw / 2, PANEL.y0 + ph / 2, 0.17));
    const amm = A.dial(0.23, A.T1.ammeter(), { lit: true });
    amm.position.set(AMMETER.lx, AMMETER.y, 0.2);
    panel.add(amm);
    L.panel = { group: panel, switches: {}, ammeter: amm };
    SWITCHES.forEach(sw => {
      const tg = A.toggle();
      tg.position.set(sw.lx, CTRL_Y, 0.18);
      panel.add(tg);
      const pl = A.pilot(P.CODE_GREEN, 0.032);
      pl.position.set(sw.lx, CTRL_Y + 0.24, 0.19);
      panel.add(pl);
      const pic = K.decal(0.24, 0.24, A.pictoTex(sw.id), {});
      pic.position.set(sw.lx, CTRL_Y - 0.28, 0.185);
      panel.add(pic);
      L.panel.switches[sw.id] = Object.assign({ toggle: tg, pilot: pl, plate: pic }, sw);
    });
    // main breaker: a big red handle, up = on, down = tripped (a red flag shows)
    const mainG = new T.Group();
    mainG.add(K.box(0.2, 0.46, 0.06, P.SAFETY, 0, 0, 0.2));
    mainG.add(K.box(0.14, 0.4, 0.02, P.HAZARD_DARK, 0, 0, 0.235));
    const handle = new T.Group();
    handle.position.set(0, 0, 0.27);
    handle.add(K.box(0.05, 0.22, 0.05, P.HOODIE_LIGHT, 0, 0.11, 0));
    handle.add(K.box(0.2, 0.07, 0.08, P.WHEEL_RED, 0, 0.23, 0));
    mainG.add(handle);
    const flag = K.box(0.13, 0.09, 0.01, P.ALARM, 0, -0.13, 0.25, { flat: true });
    mainG.add(flag);
    mainG.position.set(MAIN.lx, MAIN.y, 0);
    panel.add(mainG);
    L.panel.main = { group: mainG, handle, flag };
    left.add(panel);
    // conduits from the panel to the machines: up the left wall, round the corner, along
    // the back wall, each at its own height and depth (they cross but never touch)
    const condL = new T.Group(), condB = new T.Group();
    scene.add(condL, condB);
    left.userData.extra.push(condL);
    back.userData.extra.push(condB);
    const crun = (grp, pts) => CL.Room.run(grp, pts, 0.03, P.NAVY_LIGHT);
    const sw = id => 10 - SWITCHES.find(s => s.id === id).lx;
    [
      ['mixer', 0, b => [[6.55, b[1], b[2]], [6.55, 9.4, b[2]]]],
      ['belt', 1, b => [[3.1, b[1], b[2]], [3.1, 0.3, b[2]], [3.1, 0.3, 0.47]]],
      ['lift', 2, b => [[5.45, b[1], b[2]], [5.45, 10.4, b[2]], [6.52, 10.4, b[2]], [6.52, 10.4, 1.3]]],
      ['magnet', 3, b => [[4.0, b[1], b[2]], [4.0, 2.17, b[2]]]],
    ].forEach(([id, i, tail]) => {
      const d = 0.07 + 0.045 * i, h = 2.25 + 0.15 * i;
      const corner = [d, h, d];
      crun(condL, [[d, PANEL.y1, sw(id)], [d, h, sw(id)], corner]);
      crun(condB, [corner, ...tail(corner)]);
    });
    // the lamp's cable runs along the floor to the desk
    crun(scene, [[0.4, PANEL.y0, sw('lamp')], [0.4, 0.03, sw('lamp')], [0.4, 0.03, DESK[1]], [DESK[0] - 0.35, 0.03, DESK[1]], [DESK[0] - 0.35, 0.76, DESK[1] - 0.1]]);

    // ---------------------------------------------------- desk and lamp; shelving
    const dk = A.desk();
    dk.position.set(DESK[0], 0, DESK[1]);
    dk.rotation.y = PI / 2;
    scene.add(dk);
    const pool = A.lightPool(2.4, P.GLOW_CORE);
    pool.position.set(DESK[0] + 0.2, 0.02, DESK[1] + 0.3);
    scene.add(pool);
    L.desk = { group: dk, lamp: dk.userData.lamp, bulb: dk.userData.bulb, pool, glow: K.glow(P.GLOW_CORE, 1.6) };
    L.desk.lamp.add(L.desk.glow);
    L.desk.glow.position.set(0, 0.3, 0.08);
    L.shelves = [];
    // runs of shelving: consecutive '#' cells in a row, except the desk
    LAY.MAP.forEach((row, j) => {
      let i = 0;
      while (i < row.length) {
        if (row[i] !== '#' || (i + 1 === DESK[0] && j + 1 === DESK[1])) { i++; continue; }
        let n = 0;
        while (row[i + n] === '#') n++;
        const sh = A.shelf(n);
        sh.position.set(i + 1 + (n - 1) / 2, 0, j + 1);
        scene.add(sh);
        L.shelves.push(sh);
        G.blockRect(i + 1 - 0.42, j + 1 - 0.42, i + n + 0.42, j + 1 + 0.42, 0.25);
        i += n;
      }
    });

    // ---------------------------------------------------- pallets
    L.pallets = {};
    Object.entries(LAY.PALLETS).forEach(([id, def]) => {
      const [x, z] = LAY.find(id);
      const pl = A.pallet();
      const bd = A.bundle(def.kind);
      bd.position.y = pl.userData.deckY;
      pl.add(bd);
      pl.position.set(x, 0, z);
      scene.add(pl);
      L.pallets[id] = { id, mesh: pl, bundle: bd, def };
    });
    // ---------------------------------------------------- reactor: inside the porthole, sight glass, skim valve
    const R = L.reactor;
    const RR = R.root;
    R.face.material.transparent = true;
    R.face.material.uniforms.uOpacity.value = 0;
    R.face.visible = false;
    R.eyes.forEach(e => { e.visible = false; });
    const inside = new T.Group();
    inside.position.set(0, PC.y, 0);
    RR.add(inside);
    const liquid = K.mesh(new T.BufferGeometry(), ink(P.MURK_LIGHT, { flat: true, opacity: 0.78, depthWrite: false }), 0, 0, 2.98);
    liquid.renderOrder = 1;
    inside.add(liquid);
    const surfLine = K.box(1, 0.03, 0.01, P.REACTOR_SHADE, 0, 0, 2.99, { flat: true, opacity: 0.8 });
    inside.add(surfLine);
    const tokens = new T.Group(), scraps = new T.Group();
    inside.add(tokens, scraps);
    // the paddle on its shaft, seen through the glass
    const imp = new T.Group();
    imp.add(K.cyl(0.07, 0.07, 3.0, P.NAVY_DARK, 0, 1.2, 0, 8));
    [0, PI].forEach(a => { const b = K.box(1.25, 0.42, 0.05, P.NAVY_DARK, Math.cos(a) * 0.62, -0.25, 0); imp.add(b); });
    imp.position.set(0, -0.8, 2.82);
    imp.scale.z = 0.3;
    inside.add(imp);
    const portGlow = K.glow(P.GLOW, 4.6);
    portGlow.position.set(0, 0, 2.7);
    inside.add(portGlow);
    // flywheel on the mixer drive
    const fly = K.wheel(0.36, P.NAVY_LIGHT);
    fly.position.set(0, 9.9, 1.7 + 0.62);
    RR.add(fly);
    // sight glass with its FULL mark
    const sight = new T.Group();
    const sx0 = SIGHT.x - RX;
    sight.add(K.cyl(0.075, 0.075, SIGHT.y1 - SIGHT.y0, P.GLASS, sx0, (SIGHT.y0 + SIGHT.y1) / 2, 3.47, 12, { opacity: 0.45, flat: true }));
    [SIGHT.y0, SIGHT.y1].forEach(y => sight.add(K.cyl(0.1, 0.1, 0.12, P.BRASS, sx0, y, 3.47, 12)));
    const fill = K.cyl(0.05, 0.05, 1, P.MURK_LIGHT, sx0, SIGHT.y0, 3.47, 10, { flat: true });
    sight.add(fill);
    sight.add(K.box(0.2, 0.025, 0.2, P.ALARM, sx0, SKIM.full, 3.47, { flat: true }));
    const fp = K.decal(0.28, 0.13, A.T1.fullPlate(), {});
    fp.position.set(sx0 + 0.22, SKIM.full + 0.02, 3.42);
    sight.add(fp);
    RR.add(sight);
    // skim pipe: in at the FULL height, down to the valve, round the corner to the drum
    const pipes = new T.Group();
    const run = (pts, r) => CL.Room.run(pipes, pts, r || 0.05, P.NAVY);
    run([[SKIM.x, SKIM.full, 3.4], [SKIM.x, SKIM.full, 3.55], [SKIM.x, SKIM.y + 0.14, 3.55]]);
    run([[SKIM.x, SKIM.y - 0.14, 3.55], [SKIM.x, 0.95, 3.55], [DRUM.x, 0.95, 3.55], [DRUM.x, 0.95, DRUM.z + 0.1]]);
    pipes.add(K.flange(SKIM.x, SKIM.full, 3.42, 0.05, 'z'));
    scene.add(pipes);
    const valve = A.ballValve(0.4);
    valve.position.set(SKIM.x, SKIM.y, SKIM.z);
    valve.userData.lever.rotation.z = PI / 2;
    scene.add(valve);
    const drum = new T.Group();
    drum.add(K.mesh(new T.CylinderGeometry(DRUM.r, DRUM.r, DRUM.h, 20, 1, true), K.m(P.WHEEL_RED, { side: T.DoubleSide }), 0, DRUM.h / 2, 0));
    drum.add(K.mesh(new T.TorusGeometry(DRUM.r, 0.025, 6, 20), K.m(P.NAVY), 0, DRUM.h, 0).rotateX(PI / 2));
    const sludge = K.mesh(new T.CircleGeometry(DRUM.r * 0.95, 20), ink(P.MURK, { flat: true }), 0, 0.2, 0);
    sludge.rotation.x = -PI / 2;
    drum.add(sludge);
    drum.position.set(DRUM.x, 0, DRUM.z);
    scene.add(drum);
    L.rx = { inside, liquid, surfLine, tokens, scraps, imp, portGlow, fly, sightFill: fill, valve, drum, sludge, pipes };

    // luminous clock: readable in the dark
    L.clock.root.children.forEach(o => {
      o.traverse(m => { if (m.isMesh && m.material.uniforms && m.material !== K.m(P.NAVY)) m.material.uniforms.uDark = { value: 0 }; });
    });

    // ---------------------------------------------------- a bit of overflow corpus around the room
    L.clutter = [];
    [[0.95, 9.05, 'parcel'], [0.95, 8.15, 'news'], [1.95, 9.1, 'parcel']].forEach(([x, z, kind], i) => {
      const b = A.bundle(kind);
      if (b.userData.flyers) b.userData.flyers.visible = false;
      b.position.set(x, 0, z);
      b.rotation.y = 0.2 * i;
      scene.add(b);
      const b2 = A.bundle('parcel');
      b2.position.set(x + 0.04, 0.5, z - 0.02);
      b2.rotation.y = -0.15;
      if (i !== 1) scene.add(b2);
      L.clutter.push(b, b2);
    });

    // ---------------------------------------------------- walk grid
    G.blockRect(BELT.x0 - 0.05, 0.5, BELT.x1, 1.45, 0.12);
    G.blockRect(LIFT.x - 0.5, 0.35, LIFT.x + 0.5, 1.45, 0.12);
    G.blockRect(LIFT.x - 0.47, LIFT.zCage - 0.47, LIFT.x + 0.47, LIFT.zCage + 0.47, 0.2);
    G.blockRect(DESK[0] - 0.4, DESK[1] - 0.42, DESK[0] + 0.4, DESK[1] + 0.42, 0.25);
    G.blockCircle(DRUM.x, DRUM.z, DRUM.r);
    G.blockRect(0.5, 7.7, 2.4, 9.5);

    world.rig.bounds = [3.0, 12.5, 3.0, 7.0];
    return L;
  }

  CL.Ch1Level = { build, SCALE, DUP, BELT, MAGNET, BIN, LIFT, EMPTIES, HOPPER, PANEL, SWITCHES, CTRL_Y, MAIN, AMMETER, LIMIT, DESK, PC, LEVELS, levelY, SIGHT, SKIM, DRUM };
})(window.CL = window.CL || {});
