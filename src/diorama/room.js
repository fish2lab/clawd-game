/* The lab every chapter happens in: base, floor, four cutaway walls, the column,
   the containment reactor with its two lamps, the wall clock and the exit door,
   plus a walk grid that already knows about all of them. A chapter's level file
   calls build() and then dresses the room for its night (pods, pipes, props),
   adding its own blockers to L.grid.

   World units: one unit is Opus's width. x runs along the back wall (0..RW),
   z from the back wall towards the camera (0..RD), y up. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const TX = CL.Tex;
  const { ink } = CL.Ink;
  const PI = Math.PI;

  const RW = 16, RD = 10, WALL_H = 9.5;
  const RX = 11.2;                       // reactor centre (x); its front face is at z = 3.4
  const COL_X = 7.05;                    // column between the bay and containment
  const PLINTH_Y = 0.56;                 // the hazard plinth in front of the reactor (z 3.85..4.4)

  // opt: { clock: [h, m], stencils: true }
  function build(world, opt) {
    opt = opt || {};
    const scene = world.scene;
    const L = {};

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
    // Each wall is a group in its own frame: local x along the wall, local z out of it.
    // To hang something on a wall, add it to that group (it hides with the wall), or add
    // it to the scene and list it in wall.userData.extra.
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
    [back, left, front, right].forEach(w => { w.userData.extra = w.userData.extra || []; });

    if (opt.stencils !== false) {
      const cryo = K.decal(4.2, 0.7, TX.stencil('CRYO  BAY', 4.2, 0.7), { useAlpha: true });
      cryo.position.set(3.6, 5.7, 0.02);
      back.add(cryo);
      L.cryoStencil = cryo;
    }
    const cont = K.decal(6.0, 0.9, TX.stencil('CONTAINMENT', 6.0, 0.9), { useAlpha: true });
    cont.position.set(5.0, 6.4, 0.02);
    right.add(cont);

    // column between the bay and containment
    back.add(K.box(0.64, WALL_H, 0.5, P.REACTOR, COL_X, WALL_H / 2, 0.25));
    back.add(K.box(0.84, 0.35, 0.6, P.NAVY, COL_X, 0.175, 0.3));

    // ---------------------------------------------------- reactor
    const R = K.reactor();
    R.root.position.set(RX, 0, 0);
    scene.add(R.root);
    L.reactor = R;
    L.reactorLamps = [RX - 2.6, RX + 2.6].map(x => {
      const lp = K.lamp(false);
      lp.position.set(x, 8.9, 4.2);
      lp.scale.setScalar(1.4);
      scene.add(lp);
      return lp;
    });

    // ---------------------------------------------------- wall clock (left wall) and the exit (right wall)
    const clock = new T.Group();
    clock.add(K.cyl(0.42, 0.42, 0.1, P.NAVY, 0, 0, 0, 24));
    clock.children[0].rotation.x = PI / 2;
    const cf = K.decal(0.8, 0.8, TX.clockFace(), { useAlpha: true });
    cf.position.z = 0.06;
    clock.add(cf);
    const hh = K.box(0.04, 0.2, 0.02, P.INK, 0, 0.1, 0.08, { flat: true });
    const mh = K.box(0.03, 0.3, 0.02, P.INK, 0, 0.15, 0.09, { flat: true });
    const hg = new T.Group(); hg.add(hh);
    const mg = new T.Group(); mg.add(mh);
    clock.add(hg, mg);
    clock.position.set(4.0, 4.8, 0.06);
    left.add(clock);
    // set(h, m): fractional hours are fine; the hour hand creeps with the minutes
    const setClock = (h, m) => { hg.rotation.z = -((h % 12) + m / 60) / 12 * 2 * PI; mg.rotation.z = -m / 60 * 2 * PI; };
    const [ch, cm] = opt.clock || [3, 12];
    setClock(ch, cm);
    L.clock = { root: clock, hour: hg, minute: mg, set: setClock };

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

    // ---------------------------------------------------- walk grid: walls, column, reactor, plinth
    const G = new CL.Engine.Grid(RW, RD, 0.25);
    world.grid = G;
    G.blockRect(0, 0, RW, 0.35, 0);
    G.blockRect(0, RD - 0.35, RW, RD, 0);
    G.blockRect(0, 0, 0.35, RD, 0);
    G.blockRect(RW - 0.35, 0, RW, RD, 0);
    G.blockRect(COL_X - 0.42, 0, COL_X + 0.42, 0.5);
    G.blockRect(RX - 3.3, 0, RX + 3.3, 3.4);
    G.blockRect(RX + 3.3, 2.2, RX + 3.65, 3.0, 0.2);
    G.blockRect(RX - 4.15, 3.4, RX + 4.15, 3.85, 0);
    G.height(RX - 4.15, 3.85, RX + 4.15, 4.4, PLINTH_Y);
    L.grid = G;

    world.rig.bounds = [3.5, 12.5, 3.0, 7.0];
    world.rig.zoomMin = 6;
    world.rig.zoomMax = 18;
    return L;
  }

  // a pipe run through a list of points, with a ball at each elbow
  function run(parent, pts, r, col) {
    r = r || 0.07;
    for (let i = 0; i < pts.length - 1; i++) parent.add(K.pipe(...pts[i], ...pts[i + 1], r, col));
    for (let i = 1; i < pts.length - 1; i++) parent.add(K.mesh(new T.SphereGeometry(r * 1.05, 10, 8), K.m(col || P.POD), ...pts[i]));
  }

  CL.Room = { build, run, RW, RD, WALL_H, RX, COL_X, PLINTH_Y };
})(window.CL = window.CL || {});
