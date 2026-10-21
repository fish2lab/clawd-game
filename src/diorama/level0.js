/* Prologue diorama: the cryo bay and containment, release night 03:12.

   The short, made into a puzzle level. Nothing on screen tells you what to do:
   the pipes, gauges, steam, labels and the Clawds' own pictogram bubbles do.

   Puzzles (in the order they usually fall):
     1. Inside the pod: wipe the frost, then turn the wheel to get out.
     2. Sonnet's pod is frozen shut. Steam comes from the reactor down the
        corner into a header on the left wall: one main gate valve (its stem
        rises when open), then three unlabelled branch ball valves (lever along
        the pipe = open, across = closed), each with its own gauge. The branch
        pipes climb the wall at three depths, cross, and run along the back wall
        to the pods. Pressure splits between open branches, so Sonnet's pod
        only thaws when its branch is the only one open. Steam weeps from the
        joints of a live branch, so its route can be followed.
     3. Haiku's rattling pod has lost its wheel. Haiku keeps looking at it:
        it is on top of the locker, 2.2 high. Push the caster crate under it,
        Opus climbs the crate, Sonnet climbs Opus.
     4. The clear patch of the porthole is high. Only the full stack on the
        hazard plinth (Opus, then Sonnet, then Haiku) reaches it. Bigger
        Clawds cannot stand on smaller ones.
     5. The sign says PLEASE DO NOT TAP THE GLASS. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const TX = CL.Tex;
  const { ink } = CL.Ink;
  const PI = Math.PI;

  const RW = 16, RD = 10, WALL_H = 9.5;
  const PODS = {
    opus: { x: 1.5, z: 1.15, k: 1.0, label: 'OPUS 5.5' },
    sonnet: { x: 3.85, z: 0.95, k: 0.78, label: 'SONNET 5.5' },
    haiku: { x: 5.85, z: 0.75, k: 0.56, label: 'HAIKU 5.5' },
  };
  const RX = 11.2;                       // reactor centre
  const COL_X = 7.05;                    // column between the bay and containment
  const VALVE_Y = 0.9;                   // the three branch valves sit in a row on the left wall
  const VALVE_X = 0.65;
  const VALVES = [                       // which pod each one feeds (the pipes say so, nothing else does)
    { id: 'A', z: 3.15, depth: 0.9, pod: 'sonnet' },
    { id: 'B', z: 3.75, depth: 0.65, pod: 'opus' },
    { id: 'C', z: 4.35, depth: 0.4, pod: 'haiku' },
  ];
  const MAIN = { x: 0.3, y: 1.0, z: 2.1 };  // gate valve in the header, wheel on top
  const LOCKER = { x: 0.3, z: 6.0, h: 2.2 };
  const CRATE0 = [2.3, 8.0];

  function build(world) {
    const scene = world.scene;
    const L = {};   // everything the logic needs

    // ---------------------------------------------------- base, floor, walls
    scene.add(K.box(RW + 0.6, 0.5, RD + 0.6, P.NAVY_DARK, RW / 2, -0.25, RD / 2));
    const ft = TX.floorTile().clone();
    ft.needsUpdate = true;
    ft.wrapS = ft.wrapT = T.RepeatWrapping;
    ft.repeat.set(RW / 1.8, RD / 1.8);
    const floor = K.mesh(new T.PlaneGeometry(RW, RD), ink('#FFFFFF', { map: ft, hatch: 0.05, shadeMin: 0.92 }), RW / 2, 0.001, RD / 2);
    floor.rotation.x = -PI / 2;
    scene.add(floor);
    L.floor = floor;
    // safety lines
    scene.add(K.box(RW - 0.6, 0.004, 0.07, P.SAFETY, RW / 2, 0.004, 0.42, { flat: true }));
    scene.add(K.box(0.07, 0.004, RD - 0.6, P.SAFETY, 0.42, 0.004, RD / 2, { flat: true }));

    function wall(len, normal) {
      const g = new T.Group();
      const t = TX.wallPanel(false).clone();
      t.needsUpdate = true;
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.repeat.set(len / 2.4, WALL_H / 2.4);
      const face = K.mesh(new T.PlaneGeometry(len, WALL_H), ink('#FFFFFF', { map: t, hatch: 0.08 }), len / 2, WALL_H / 2, 0);
      g.add(face);
      g.add(K.box(len, 0.18, 0.08, P.NAVY, len / 2, 0.07, 0.04));
      g.add(K.box(len + 0.3, 0.14, 0.3, P.NAVY_DARK, len / 2, WALL_H + 0.07, -0.15));
      g.add(K.box(len + 0.3, WALL_H, 0.3, P.WALL_SHADE, len / 2, WALL_H / 2, -0.15 - 0.001));
      world.addWall(g, normal);
      return g;
    }
    const back = wall(RW, new T.Vector3(0, 0, 1));
    const left = wall(RD, new T.Vector3(1, 0, 0));
    left.rotation.y = PI / 2;
    left.position.set(0, 0, RD);
    const front = wall(RW, new T.Vector3(0, 0, -1));
    front.rotation.y = PI;
    front.position.set(RW, 0, RD);
    const right = wall(RD, new T.Vector3(-1, 0, 0));
    right.rotation.y = -PI / 2;
    right.position.set(RW, 0, 0);
    L.walls = { back, left, front, right };

    // stencils
    const cryo = K.decal(4.2, 0.7, TX.stencil('CRYO  BAY', 4.2, 0.7), { useAlpha: true });
    cryo.position.set(3.6, 5.7, 0.02);
    back.add(cryo);
    const cont = K.decal(6.0, 0.9, TX.stencil('CONTAINMENT', 6.0, 0.9), { useAlpha: true });
    cont.position.set(5.0, 6.4, 0.02);
    right.add(cont);

    // column between the bay and containment
    back.add(K.box(0.64, WALL_H, 0.5, P.REACTOR, COL_X, WALL_H / 2, 0.25));
    back.add(K.box(0.84, 0.35, 0.6, P.NAVY, COL_X, 0.175, 0.3));

    // ---------------------------------------------------- pods
    L.pods = {};
    Object.entries(PODS).forEach(([name, c], i) => {
      const pd = K.pod(c.k, c.label, 11 + i);
      pd.root.position.set(c.x, 0, c.z);
      scene.add(pd.root);
      pd.x = c.x; pd.z = c.z;
      L.pods[name] = pd;
      // riser from the dome to the branch pipes
      const top = 2.05 * c.k + 0.82 * c.k * 0.9 + 0.09 * c.k;
      pd.riserTop = top;
      // lamp above
      const lp = K.lamp(false);
      lp.position.set(c.x, 4.65, c.z * 0.6);
      back.add(lp);
      back.add(K.box(0.02, WALL_H - 4.9, 0.02, P.INK, c.x, 4.9 + (WALL_H - 4.9) / 2, c.z * 0.6));
      pd.lamp = lp;
    });

    // ---------------------------------------------------- reactor
    const R = K.reactor();
    R.root.position.set(RX, 0, 0);
    scene.add(R.root);
    L.reactor = R;
    // two lamps over the reactor
    L.reactorLamps = [RX - 2.6, RX + 2.6].map(x => {
      const lp = K.lamp(false);
      lp.position.set(x, 8.9, 4.2);
      lp.scale.setScalar(1.4);
      scene.add(lp);
      return lp;
    });

    // ---------------------------------------------------- steam pipes
    // Feed: out of the reactor, along the top of the back wall, down the corner,
    // along the left wall to a header with the main valve and three branch valves.
    // The branches climb the left wall, cross each other, and run back to the pods.
    // World coordinates; the back-wall runs hide with the back wall, the left-wall
    // runs with the left wall.
    const PR = 0.07;
    const run = (parent, pts, r, col) => {
      for (let i = 0; i < pts.length - 1; i++) parent.add(K.pipe(...pts[i], ...pts[i + 1], r || PR, col));
      for (let i = 1; i < pts.length - 1; i++) parent.add(K.mesh(new T.SphereGeometry((r || PR) * 1.05, 10, 8), K.m(col || P.POD), ...pts[i]));
    };
    const backPipes = new T.Group(), leftPipes = new T.Group();
    scene.add(backPipes, leftPipes);
    L.pipeGroups = { back: backPipes, left: leftPipes };
    // feed (thicker, reactor-coloured)
    run(backPipes, [[RX - 3.3, 6.2, 1.2], [RX - 3.3 - 0.4, 6.2, 1.2], [RX - 3.7, 6.2, 0.3], [0.3, 6.2, 0.3]], 0.1, P.REACTOR);
    run(leftPipes, [[0.3, 6.2, 0.3], [0.3, 0.45, 0.3], [0.3, 0.45, 4.3]], 0.1, P.REACTOR);
    [2.0, 4.0].forEach(x => backPipes.add(K.flange(x, 6.2, 0.3, 0.1, 'x')));
    leftPipes.add(K.flange(0.3, 3.0, 0.3, 0.1, 'y'));
    // header along the left wall, capped at the far end
    leftPipes.add(K.cyl(0.13, 0.13, 0.06, P.NAVY, 0.3, 0.45, 4.6, 14).rotateX(PI / 2));
    // main gate valve, inline in the header; the yellow stem rises out of the wheel when open
    leftPipes.add(K.box(0.3, 0.3, 0.36, P.NAVY, 0.3, 0.45, MAIN.z));
    [MAIN.z - 0.2, MAIN.z + 0.2].forEach(z => leftPipes.add(K.flange(0.3, 0.45, z, 0.1, 'z')));
    leftPipes.add(K.cyl(0.07, 0.09, 0.4, P.NAVY, 0.3, 0.78, MAIN.z, 12));
    const mainW = K.wheel(0.22);
    mainW.position.set(MAIN.x, MAIN.y, MAIN.z);
    mainW.rotation.x = -PI / 2;
    leftPipes.add(mainW);
    const stemG = new T.Group();
    stemG.position.set(MAIN.x, MAIN.y, MAIN.z);
    stemG.add(K.cyl(0.045, 0.045, 1, P.SAFETY, 0, 0.5, 0, 8));
    stemG.scale.y = 0.06;
    leftPipes.add(stemG);
    L.main = { mesh: mainW, stem: stemG, open: false };

    // branches: a tee off the header, up through a ball valve and a gauge (all three in
    // one row), then each steps out to its own depth and runs across the left wall and
    // the back wall to its pod. Different depths and heights: they cross in view but
    // never touch.
    const b = (x, y, z) => [x, y, z];
    const topOf = n => L.pods[n].riserTop;
    const VX = VALVE_X;
    const branch = {
      A: { left: [b(0.3, 0.45, 3.15), b(VX, 0.45, 3.15), b(VX, 1.85, 3.15), b(0.9, 1.85, 3.15), b(0.9, 2.3, 3.15), b(0.9, 2.3, 2.0), b(0.9, 3.3, 2.0), b(0.9, 3.3, 0.9)],
           back: [b(0.9, 3.3, 0.9), b(3.85, 3.3, 0.9), b(3.85, 3.3, 0.95), b(3.85, topOf('sonnet'), 0.95)] },
      B: { left: [b(0.3, 0.45, 3.75), b(VX, 0.45, 3.75), b(VX, 2.05, 3.75), b(VX, 2.05, 2.6), b(VX, 3.9, 2.6), b(VX, 3.9, 0.7)],
           back: [b(VX, 3.9, 0.7), b(1.5, 3.9, 0.7), b(1.5, 3.9, 1.15), b(1.5, topOf('opus'), 1.15)] },
      C: { left: [b(0.3, 0.45, 4.35), b(VX, 0.45, 4.35), b(VX, 1.85, 4.35), b(0.4, 1.85, 4.35), b(0.4, 2.7, 4.35), b(0.4, 2.7, 1.7), b(0.4, 3.6, 1.7), b(0.4, 3.6, 0.55)],
           back: [b(0.4, 3.6, 0.55), b(5.85, 3.6, 0.55), b(5.85, 3.6, 0.75), b(5.85, topOf('haiku'), 0.75)] },
    };
    Object.values(branch).forEach(br => { run(leftPipes, br.left); run(backPipes, br.back); });
    // where steam weeps from a live branch: its elbows above the valve, on whichever wall they hang
    L.weeps = {};
    Object.entries(branch).forEach(([id, br]) => {
      L.weeps[id] = [
        ...br.left.slice(2).map(p => ({ p, wall: 'left' })),
        ...br.back.slice(1, -1).map(p => ({ p, wall: 'back' })),
      ];
    });

    // ball valves: lever along the pipe (up) = open, across the pipe = closed
    L.valves = {};
    VALVES.forEach(v => {
      const d = VALVE_X;
      const body = K.cyl(0.1, 0.1, 0.24, P.NAVY, d, VALVE_Y, v.z, 12);
      leftPipes.add(body);
      leftPipes.add(K.cyl(0.03, 0.03, 0.14, P.NAVY, d + 0.07, VALVE_Y, v.z, 8).rotateZ(PI / 2));
      const lever = new T.Group();
      lever.position.set(d + 0.14, VALVE_Y, v.z);
      lever.add(K.box(0.035, 0.4, 0.07, P.WHEEL_RED, 0, 0.18, 0));
      lever.add(K.box(0.05, 0.1, 0.09, P.WHEEL_RED_DARK, 0, 0.36, 0));
      leftPipes.add(lever);
      const g = K.gauge(0.13);
      g.position.set(d + 0.1, VALVE_Y + 0.6, v.z);
      g.rotation.y = PI / 2;
      leftPipes.add(K.pipe(d, VALVE_Y + 0.6, v.z, d + 0.06, VALVE_Y + 0.6, v.z, 0.025, P.NAVY));
      leftPipes.add(g);
      const open = v.id !== 'A';
      lever.rotation.x = open ? 0 : PI / 2;
      L.valves[v.id] = Object.assign({ mesh: lever, body, lever, gauge: g, open, y: VALVE_Y }, v);
    });
    back.userData.extra = [backPipes];
    left.userData.extra = [leftPipes];

    // ---------------------------------------------------- props on the floor
    const locker = new T.Group();
    locker.add(K.box(0.6, LOCKER.h, 1.1, P.NAVY, 0, LOCKER.h / 2, 0));
    locker.add(K.box(0.04, LOCKER.h - 0.3, 0.02, P.NAVY_DARK, 0.3, LOCKER.h / 2, 0));
    [-0.27, 0.27].forEach(dz => {
      for (let i = 0; i < 4; i++) locker.add(K.box(0.02, 0.03, 0.32, P.NAVY_LIGHT, 0.31, 1.75 + i * 0.08, dz));
      locker.add(K.box(0.04, 0.16, 0.05, P.BRASS, 0.32, 1.05, dz * 0.25));
    });
    locker.position.set(LOCKER.x, 0, LOCKER.z);
    scene.add(locker);
    L.locker = locker;
    const lw = K.wheel(0.56 * 0.15);
    lw.rotation.x = -PI / 2;
    lw.position.set(LOCKER.x + 0.05, LOCKER.h + 0.03, LOCKER.z - 0.15);
    scene.add(lw);
    L.looseWheel = lw;

    const crate = K.crate('LN₂');
    crate.position.set(CRATE0[0], 0.45, CRATE0[1]);
    scene.add(crate);
    L.crate = crate;
    // casters
    [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]].forEach(([dx, dz]) => crate.add(K.cyl(0.06, 0.06, 0.04, P.INK, dx, -0.45, dz, 8)));

    // static clutter
    L.clutter = [];
    [[14.9, 8.9, 'LN₂'], [14.9, 7.95, 'TOOLS'], [14.95, 8.9, null]].forEach(([x, z, lab], i) => {
      const c = K.crate(lab);
      c.position.set(x, i === 2 ? 1.35 : 0.45, z);
      scene.add(c);
      L.clutter.push(c);
    });
    const barrel = K.cyl(0.38, 0.38, 1.0, P.WHEEL_RED, 13.4, 0.5, 9.1, 20);
    scene.add(barrel);
    scene.add(K.cyl(0.4, 0.4, 0.06, P.NAVY, 13.4, 0.98, 9.1, 20));
    L.clutter.push(barrel);

    // wall clock (left wall) and the exit (right wall)
    const clock = new T.Group();
    clock.add(K.cyl(0.42, 0.42, 0.1, P.NAVY, 0, 0, 0, 24));
    clock.children[0].rotation.x = PI / 2;
    const cf = K.decal(0.8, 0.8, TX.clockFace(), { useAlpha: true });
    cf.position.z = 0.06;
    clock.add(cf);
    const hh = K.box(0.04, 0.2, 0.02, P.INK, 0, 0.1, 0.08, { flat: true });
    const mh = K.box(0.03, 0.3, 0.02, P.INK, 0, 0.15, 0.09, { flat: true });
    const hg = new T.Group(); hg.add(hh); hg.position.z = 0; hg.rotation.z = -(3 + 12 / 60) / 12 * 2 * PI;
    const mg = new T.Group(); mg.add(mh); mg.rotation.z = -12 / 60 * 2 * PI;
    clock.add(hg, mg);
    clock.position.set(4.0, 4.8, 0.06);
    left.add(clock);
    L.clock = { root: clock, hour: hg, minute: mg };

    const exit = new T.Group();
    exit.add(K.box(1.6, 2.6, 0.1, P.NAVY, 0, 1.3, 0.05));
    exit.add(K.box(1.3, 2.4, 0.06, P.NAVY_LIGHT, 0, 1.2, 0.1));
    exit.add(K.box(0.5, 0.36, 0.04, '#1B2A44', 0.0, 1.8, 0.14));
    exit.add(K.box(0.08, 0.3, 0.08, P.BRASS, 0.5, 1.15, 0.16));
    const es = K.decal(0.9, 0.3, TX.tex(TX.paint(0.9, 0.3, 256, g => {
      g.fs(CL.gfx.rect(0, 0, 0.9, 0.3), P.CODE_GREEN, 1.0);
      g.text('EXIT', 0.45, 0.08, 0.17, '#FFFFFF', 'slab');
    })), { emissive: '#103018' });
    es.position.set(0, 2.85, 0.06);
    exit.add(es);
    exit.position.set(6.6, 0, 0.0);
    right.add(exit);
    L.exit = exit;

    // ---------------------------------------------------- walk grid
    const G = new CL.Engine.Grid(RW, RD, 0.25);
    world.grid = G;
    G.blockRect(0, 0, RW, 0.35, 0);
    G.blockRect(0, RD - 0.35, RW, RD, 0);
    G.blockRect(0, 0, 0.35, RD, 0);
    G.blockRect(RW - 0.35, 0, RW, RD, 0);
    Object.values(PODS).forEach(c => G.blockCircle(c.x, c.z, 0.98 * c.k));
    G.blockRect(COL_X - 0.42, 0, COL_X + 0.42, 0.5);
    G.blockRect(RX - 3.3, 0, RX + 3.3, 3.4);
    G.blockRect(0, 1.8, 1.0, 4.75, 0.2);
    G.blockRect(RX + 3.3, 2.2, RX + 3.65, 3.0, 0.2);
    G.blockRect(RX - 4.15, 3.4, RX + 4.15, 3.85, 0);
    G.height(RX - 4.15, 3.85, RX + 4.15, 4.4, 0.56);
    G.blockRect(LOCKER.x - 0.3, LOCKER.z - 0.55, LOCKER.x + 0.3, LOCKER.z + 0.55);
    G.blockRect(14.45, 7.5, 15.35, 9.35);
    G.blockCircle(13.4, 9.1, 0.38);
    L.crateBlock = { x: CRATE0[0], z: CRATE0[1], hw: 0.45, hd: 0.45, on: true };
    G.dyn.push(L.crateBlock);

    return L;
  }

  CL.Level0 = { build, RW, RD, PODS, RX, VALVES, VALVE_Y, VALVE_X, MAIN, LOCKER, CRATE0, COL_X };
})(window.CL = window.CL || {});
