/* Chapter 5 room: the prologue's room (CL.Level0.build), one night earlier, 23:50.

   Built on top of it, the things that have changed by themselves, and a few props:
     - a copper line teed into branch A just above its valve, dropping into a fresh
       trench in the floor and coming up again on the far side of the reactor, where it
       feeds Fable (that end is only seen with the diorama turned round)
     - branch A's crossing section (the piece that takes it over branch B and on to
       Sonnet's pod) unbolted and left leaning on the left wall
     - branch B's expansion loop swapped for a straight piece; the loop leans next to it
     - a roof vent off the end of the header, its gate valve open a crack, handwheel gone
     - porthole bolt 5 backed out
     - fog on the inside of the glass, with a drawing in it; the first crack
   and a drafting table with the blueprint and a desk lamp, a hatch with the tap-code
   chart in the alley beside the reactor (a low pipe across it only Haiku fits under),
   and Sonnet's data ports.

   The end state of this chapter is the prologue's start: see play.js. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const AR = CL.Ch5Art;
  const LV = CL.Level0;
  const PI = Math.PI;
  const { RX } = CL.Room;
  const VX = LV.VALVE_X;
  const run = CL.Room.run;

  const POS = {
    table: [10.7, 7.1],
    lamp: [10.15, 6.78],
    feedPort: [7.87, 0.8, 1.55],
    vent: [0.3, 2.65, 5.3],
    hatch: [14.53, 0.27, 0.9],
    chart: [14.52, 1.5, 1.32],
    testPort: [14.53, 0.75, 3.3],
    sealPort: [13.25, 0.95, 3.43],
    routePort: [VX + 0.07, 0.62, 3.75],
    barrierZ: 2.0,
    // removable pipe pieces: where they bolt in, and where they lean against the left wall
    sectionAt: [VX, 1.85, 3.15], sectionLean: [0.36, 0.03, 8.15],
    insertAt: [VX, 2.55, 2.6], loopLean: [0.3, 0.06, 8.5], straightLean: [0.3, 0.06, 9.4],
    crateHome: LV.CRATE0,
    bolt: 5,
  };

  // hide one of the prologue's pipe meshes (a run segment by its two ends, or an elbow ball)
  function hideIn(group, pos, type) {
    const v = new T.Vector3(...pos);
    let n = 0;
    group.traverse(o => {
      if (!o.isMesh || !o.geometry || o.geometry.type !== type) return;
      if (o.position.distanceTo(v) < 0.002) { o.visible = false; o.userData.ch5Hidden = true; n++; }
    });
    return n;
  }
  const mid = (a, b) => a.map((v, i) => (v + b[i]) / 2);

  function build(world) {
    const scene = world.scene;
    const L = CL.Level0.build(world);
    L.clock.set(23, 50);
    const { back, left } = L.walls;
    const R = L.reactor;
    const G = L.grid;
    const C5 = L.ch5 = { POS };

    // our own wall groups (they hide with their wall)
    const leftG = new T.Group(), backG = new T.Group();
    scene.add(leftG, backG);
    left.userData.extra.push(leftG);
    back.userData.extra.push(backG);
    C5.leftG = leftG;

    // ---------------------------------------------------- branch A: the crossing section comes out
    const A0 = [VX, 1.85, 3.15], A1 = [0.9, 1.85, 3.15], A2 = [0.9, 2.3, 3.15], A3 = [0.9, 2.3, 2.0], A4 = [0.9, 3.3, 2.0];
    const lp = L.pipeGroups.left;
    [[A0, A1], [A1, A2], [A2, A3], [A3, A4]].forEach(([a, b]) => hideIn(lp, mid(a, b), 'CylinderGeometry'));
    [A1, A2, A3].forEach(p => hideIn(lp, p, 'SphereGeometry'));
    // fixed stubs and the flanges the section bolts to
    leftG.add(K.pipe(VX, 1.85, 3.15, VX + 0.08, 1.85, 3.15, 0.07, P.POD));
    leftG.add(K.flange(VX + 0.08, 1.85, 3.15, 0.07, 'x'));
    leftG.add(K.pipe(0.9, 3.22, 2.0, 0.9, 3.3, 2.0, 0.07, P.POD));
    leftG.add(K.flange(0.9, 3.22, 2.0, 0.07, 'y'));
    // the section itself, in its own frame (origin at A0)
    const section = new T.Group();
    run(section, [[0.09, 0, 0], [0.25, 0, 0], [0.25, 0.45, 0], [0.25, 0.45, -1.15], [0.25, 1.36, -1.15]], 0.07, P.POD);
    section.add(K.flange(0.1, 0, 0, 0.07, 'x'));
    section.add(K.flange(0.25, 1.35, -1.15, 0.07, 'y'));
    const cap = (g, x, y, z, axis) => { const c = K.cyl(0.085, 0.085, 0.05, P.WHEEL_RED, x, y, z, 12); if (axis === 'x') c.rotation.z = PI / 2; g.add(c); (g.userData.caps = g.userData.caps || []).push(c); };
    cap(section, 0.06, 0, 0, 'x');
    cap(section, 0.25, 1.4, -1.15, 'y');
    scene.add(section);
    C5.section = section;
    C5.placeSection = installed => {
      section.removeFromParent();
      section.userData.caps.forEach(c => { c.visible = !installed; });
      if (installed) { leftG.add(section); section.position.set(...POS.sectionAt); section.rotation.set(0, 0, 0); }
      else { scene.add(section); section.position.set(...POS.sectionLean); section.rotation.set(0, 0, 0.2); }
    };

    // ---------------------------------------------------- the copper line: a tee on A, into the floor, up into the reactor
    const COP = P.COPPER;
    const copper = new T.Group();
    leftG.add(copper);
    copper.add(K.mesh(new T.SphereGeometry(0.085, 12, 10), K.m(COP), VX, 1.75, 3.15));
    run(copper, [[VX, 1.75, 3.15], [VX, 1.75, 2.8], [VX, 0.02, 2.8]], 0.055, COP);
    copper.add(K.box(0.2, 0.01, 0.2, P.NAVY_DARK, VX, 0.005, 2.8));
    // the trench: a freshly patched strip across the floor
    const trench = new T.Group();
    const t0 = [VX + 0.12, 2.8], t1 = [7.62, 2.2];
    const tl = Math.hypot(t1[0] - t0[0], t1[1] - t0[1]), ta = Math.atan2(-(t1[1] - t0[1]), t1[0] - t0[0]);
    const strip = K.box(tl, 0.006, 0.22, P.FLOOR_DARK, 0, 0, 0, { flat: true });
    trench.add(strip);
    trench.add(K.box(tl, 0.008, 0.04, P.COPPER, 0, 0.002, 0, { flat: true }));
    for (let s = 0.3; s < tl - 0.1; s += 0.55) trench.add(K.box(0.03, 0.008, 0.26, P.FLOOR_LINE, -tl / 2 + s, 0.003, 0, { flat: true }));
    trench.position.set((t0[0] + t1[0]) / 2, 0.004, (t0[1] + t1[1]) / 2);
    trench.rotation.y = ta;
    scene.add(trench);
    C5.trench = trench;
    const copperIn = new T.Group();
    run(copperIn, [[7.72, 0.02, 2.2], [7.72, 1.2, 2.2], [7.9, 1.2, 2.2]], 0.055, COP);
    copperIn.add(K.flange(7.86, 1.2, 2.2, 0.055, 'x'));
    copperIn.add(K.cyl(0.1, 0.1, 0.03, P.COPPER_LIGHT, 7.905, 1.2, 2.2, 14).rotateZ(PI / 2));
    copperIn.add(K.box(0.2, 0.01, 0.2, P.NAVY_DARK, 7.72, 0.005, 2.2));
    scene.add(copperIn);
    C5.copper = [copper, copperIn];
    const feedPort = AR.port();
    feedPort.position.set(...POS.feedPort);
    feedPort.rotation.y = -PI / 2;
    scene.add(feedPort);
    C5.feedPort = feedPort;

    // ---------------------------------------------------- branch B: the expansion loop, or Fable's straight piece
    hideIn(lp, mid([VX, 2.05, 2.6], [VX, 3.9, 2.6]), 'CylinderGeometry');
    leftG.add(K.pipe(VX, 2.05, 2.6, VX, 2.55, 2.6, 0.07, P.POD));
    leftG.add(K.pipe(VX, 3.25, 2.6, VX, 3.9, 2.6, 0.07, P.POD));
    leftG.add(K.flange(VX, 2.55, 2.6, 0.07, 'y'));
    leftG.add(K.flange(VX, 3.25, 2.6, 0.07, 'y'));
    const loop = new T.Group();
    run(loop, [[0, 0.02, 0], [0, 0.13, 0], [0, 0.13, 0.55], [0, 0.57, 0.55], [0, 0.57, 0], [0, 0.68, 0]], 0.07, P.POD);
    const straight = new T.Group();
    straight.add(K.pipe(0, 0.02, 0, 0, 0.68, 0, 0.07, P.POD));
    [loop, straight].forEach(pc => { pc.add(K.flange(0, 0.03, 0, 0.07, 'y')); pc.add(K.flange(0, 0.67, 0, 0.07, 'y')); cap(pc, 0, -0.02, 0, 'y'); cap(pc, 0, 0.72, 0, 'y'); scene.add(pc); });
    C5.loop = loop; C5.straight = straight;
    C5.placeInsert = loopIn => {
      [loop, straight].forEach(pc => pc.removeFromParent());
      const inP = loopIn ? loop : straight, outP = loopIn ? straight : loop;
      leftG.add(inP); inP.position.set(...POS.insertAt); inP.rotation.set(0, 0, 0);
      scene.add(outP); outP.position.set(...(loopIn ? POS.straightLean : POS.loopLean)); outP.rotation.set(0, 0, 0.22);
      inP.userData.caps.forEach(c => { c.visible = false; });
      outP.userData.caps.forEach(c => { c.visible = true; });
    };
    const routePort = AR.port();
    routePort.position.set(...POS.routePort);
    routePort.rotation.y = PI / 2;
    leftG.add(routePort);
    C5.routePort = routePort;

    // ---------------------------------------------------- header gauge and the roof vent
    leftG.add(K.pipe(0.3, 0.45, 1.55, 0.3, 1.05, 1.55, 0.03, P.NAVY));
    const hg = AR.gauge(0.12);
    hg.position.set(0.37, 1.05, 1.55);
    hg.rotation.y = PI / 2;
    leftG.add(hg);
    C5.headerGauge = hg;
    leftG.add(K.pipe(0.3, 0.45, 4.3, 0.3, 0.45, 4.6, 0.1, P.REACTOR));
    const [vx, vy, vz] = POS.vent;
    run(leftG, [[0.3, 0.45, 4.6], [vx, 0.45, vz], [vx, 9.45, vz]], 0.05, P.POD);
    const vv = AR.ventValve();
    vv.position.set(vx, vy, vz);
    leftG.add(vv);
    C5.ventValve = vv;
    leftG.add(K.pipe(vx, 1.65, vz, vx + 0.07, 1.65, vz, 0.025, P.NAVY));
    const vg = AR.gauge(0.11);
    vg.position.set(vx + 0.1, 1.65, vz);
    vg.rotation.y = PI / 2;
    leftG.add(vg);
    C5.ventGauge = vg;
    const ventPort = AR.port();
    ventPort.position.set(vx + 0.08, 1.05, vz);
    ventPort.rotation.y = PI / 2;
    leftG.add(ventPort);
    C5.ventPort = ventPort;
    const cw = AR.cowl();
    cw.position.set(vx, 9.4, vz);
    leftG.add(cw);
    C5.cowl = cw;
    C5.ventTop = [vx, 9.85, vz];

    // ---------------------------------------------------- the reactor: bolt 5 backed out, fog, crack, ports, hatch, chart
    const bolt = R.bolts[POS.bolt];
    C5.bolt = bolt;
    C5.boltZ = bolt.position.z;
    const shank = K.cyl(0.045, 0.045, 1, P.BRASS_LIGHT, bolt.position.x, bolt.position.y, 0, 10);
    shank.rotation.x = PI / 2;
    R.root.add(shank);
    C5.setBolt = out => {
      bolt.position.z = C5.boltZ + out;
      shank.visible = out > 0.01;
      shank.scale.y = Math.max(0.01, out + 0.02);
      shank.position.z = C5.boltZ - 0.05 + (out + 0.02) / 2;
    };
    const fogT = AR.fog();
    const fogM = new T.Mesh(new T.CircleGeometry(1.97, 48), CL.Ink.ink('#FFFFFF', { map: fogT.tex, useAlpha: true, flat: true, lit: true, depthWrite: false }));
    fogM.position.set(RX, R.PC.y, R.PC.z + 0.03);
    fogM.renderOrder = 2;
    scene.add(fogM);
    C5.fog = fogT;
    C5.fogMesh = fogM;
    const crack = K.decal(4.0, 4.0, AR.crack(0.55), { useAlpha: true, depthWrite: false });
    crack.position.set(RX, R.PC.y, R.PC.z + 0.07);
    crack.renderOrder = 3;
    scene.add(crack);
    const sealPort = AR.port();
    sealPort.position.set(...POS.sealPort);
    scene.add(sealPort);
    C5.sealPort = sealPort;
    const testPort = AR.port();
    testPort.position.set(...POS.testPort);
    testPort.rotation.y = PI / 2;
    scene.add(testPort);
    C5.testPort = testPort;
    const hatch = AR.hatch();
    hatch.position.set(...POS.hatch);
    hatch.rotation.y = PI / 2;
    scene.add(hatch);
    C5.hatch = hatch;
    const chartTex = AR.tapChart();
    C5.chartTex = chartTex;
    const chart = K.decal(0.85, 0.85, chartTex);
    chart.position.set(...POS.chart);
    chart.rotation.y = PI / 2;
    scene.add(chart);
    C5.chart = chart;
    // the low pipes across the alley: Haiku fits under, nobody else does
    const barrier = new T.Group();
    [0.6, 0.82].forEach(y => barrier.add(K.pipe(14.5, y, POS.barrierZ, 15.98, y, POS.barrierZ, 0.06, P.REACTOR_DEEP)));
    barrier.add(K.box(0.08, 0.5, 0.16, P.NAVY, 15.92, 0.71, POS.barrierZ));
    barrier.add(K.flange(14.53, 0.6, POS.barrierZ, 0.06, 'x'));
    barrier.add(K.flange(14.53, 0.82, POS.barrierZ, 0.06, 'x'));
    scene.add(barrier);
    C5.barrier = barrier;

    // ---------------------------------------------------- drafting table, blueprint, desk lamp
    const table = AR.table();
    table.position.set(POS.table[0], 0, POS.table[1]);
    scene.add(table);
    const bpTex = AR.blueprint();
    C5.bpTex = bpTex;
    const bp = K.decal(1.36, 1.36 * AR.BP.H / AR.BP.W, bpTex);
    bp.rotation.x = -PI / 2 + 0.12;
    bp.position.set(0, 0.957, 0);
    table.add(bp);
    C5.table = table;
    C5.bpDecal = bp;
    const lamp = AR.deskLamp();
    lamp.position.set(POS.lamp[0], 0.95, POS.lamp[1]);
    scene.add(lamp);
    C5.lamp = lamp;

    // ---------------------------------------------------- walk grid
    G.blockRect(POS.table[0] - 0.78, POS.table[1] - 0.5, POS.table[0] + 0.78, POS.table[1] + 0.5);
    G.blockRect(0, 6.95, 0.5, 9.7);          // the pieces leaning on the left wall
    // the mouth of the alley beside the reactor: the room blocks the gap between the
    // reactor face and the plinth right up to the wall; open it past the plinth's end
    const [i0, j0] = G.cellOf(15.0, 3.4), [i1, j1] = G.cellOf(15.49, 3.84);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) G.block[G.idx(i, j)] = 0;
    return L;
  }

  CL.Ch5Level = { build, POS };
})(window.CL = window.CL || {});
