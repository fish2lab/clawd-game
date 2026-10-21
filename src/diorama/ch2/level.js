/* Chapter 2 · 监督微调 (SFT): the room, 60 days before release, 09:15.

   Daylight. No cryo pods yet (two bare pedestals, the third still crated), no
   sign on the reactor. In front of the reactor the floor is a 3 x 3 stage of
   demonstration tiles framed in red tape: a video camera on a tripod films it,
   a tape recorder (REC / PLAY) on a trolley records it, and a monitor on the
   plinth plays it back to the porthole. Around the stage stands the demo set:
   a bell (left edge), a lamp (front edge), a flag (right edge) and, high on a
   tall post at the front-right corner, a big bell with a rope. Above the
   porthole, on a bar, Fable has the very same set. The tiles are pressure
   plates; the centre one is loose.

   Also: the easel with the demo cards, a yellow step stool, the tap-code chart
   on the reactor (a poster on a stand hides its upper rows from the front),
   the stage's data port, and a tool board with an empty hook for a clipboard. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const PR = CL.Ch2Props;
  const A2 = CL.Ch2Art;
  const PI = Math.PI;
  const { RX } = CL.Room;

  const ST = { x0: 9.55, z0: 4.55, t: 1.1 };              // the stage: x 9.55..12.85, z 4.55..7.85
  const STAGE_Y = 0.05;
  const LOOSE = 4;                                         // the centre tile
  const tileXZ = i => [ST.x0 + ST.t * (i % 3 + 0.5), ST.z0 + ST.t * (Math.floor(i / 3) + 0.5)];
  const onStage = (x, z) => x >= ST.x0 && x <= ST.x0 + 3 * ST.t && z >= ST.z0 && z <= ST.z0 + 3 * ST.t;
  // the demo set: where each thing stands, where you stand to use it, how high its handle is
  const DEV = {
    bell: { at: [9.22, 6.2], spot: [9.95, 6.2, -PI / 2], y: 0.39 },
    lamp: { at: [11.2, 8.14], spot: [11.2, 7.52, 0], y: 0.55 },
    flag: { at: [13.18, 6.2], spot: [12.45, 6.2, PI / 2], y: 0.5 },
  };
  // the big bell: a post standing on the plinth, its arm reaching over the stage's back-right corner
  const BIG = { at: [13.65, 4.12], h: 2.75, rope: [12.85, 4.55], handleY: 1.95, spot: [12.3, 5.1] };
  BIG.arm = Math.hypot(BIG.rope[0] - BIG.at[0], BIG.rope[1] - BIG.at[1]);
  BIG.rot = Math.atan2(BIG.rope[1] - BIG.at[1], BIG.at[0] - BIG.rope[0]);
  const REC = { at: [13.9, 8.45], spot: [14.15, 9.3, PI], keyY: 0.88 };      // front-right: no walk to it crosses the centre tile
  const CAM = { at: [9.08, 4.78] };
  const EASEL = { at: [8.45, 5.3], rot: 0.62 };
  const STOOL0 = [6.35, 5.45];
  const JBOX = { at: [8.85, 7.45], spot: [8.85, 8.1, PI] };
  const PEG = { x: 5.75, y: 0.85 };                        // on the back wall
  const CHART = { x: 8.42, y: 1.575, z: 3.407 };
  const POSTER = { x: 8.73, z: 3.88, y: 2.235 };
  const MON = { at: [10.05, 4.1], rot: -0.35 };
  const MIRROR = { y: 6.0, z: 3.9, x0: 9.35, x1: 14.15, xs: { bell: 9.85, lamp: 11.2, flag: 12.85, big: 13.75 } };
  const CARDS = [
    { seq: ['bell', 'bell', 'lamp'] },
    { seq: ['flag', 'bell', 'lamp'] },
    { seq: ['big'] },
    { tap: ['H', 'I'] },
  ];

  function build(world) {
    const scene = world.scene;
    const L = CL.Room.build(world, { clock: [9, 15] });
    const { back } = L.walls;
    const R = L.reactor;
    const G = L.grid;

    // the sign is not up yet (chapter 3); its screw holes are
    R.sign.visible = false;
    [[-0.25, 0.55], [0.25, 0.55], [-0.25, -0.55], [0.25, -0.55]].forEach(([dx, dy]) => R.root.add(K.cyl(0.03, 0.03, 0.01, P.REACTOR_DEEP, RX - RX + 2.88 + dx, 2.7 + dy, 3.405, 8).rotateX(PI / 2)));
    // gauge labels
    [['LOSS', -2.3], ['SFT', 2.3]].forEach(([t, dx]) => {
      const p = K.decal(0.5, 0.14, A2.smallPlate(t, 0.5, 0.14, CL.P.PAPER), {});
      p.position.set(RX + dx, 6.53, 3.475);
      scene.add(p);
    });

    // ---------------------------------------------------- the cryo bay, not built yet
    const bay = new T.Group();
    scene.add(bay);
    [[1.5, 1.15, 1.0], [3.85, 0.95, 0.78]].forEach(([x, z, k]) => {
      bay.add(K.cyl(0.98 * k, 0.98 * k, 0.32 * k, P.POD, x, 0.16 * k, z, 40));
      bay.add(K.cyl(0.99 * k, 0.99 * k, 0.05 * k, P.NAVY, x, 0.295 * k, z, 40));
      bay.add(K.cyl(0.12 * k, 0.12 * k, 0.1, P.NAVY_DARK, x, 0.32 * k + 0.05, z, 12));
      G.blockCircle(x, z, 0.98 * k);
    });
    // the third pod, still in its crate, and a spare
    const crates = [];
    [[2.3, 3.4, 0.45, 'POD 3'], [2.3, 3.4, 1.35, null], [3.2, 3.4, 0.45, 'LN₂']].forEach(([x, z, y, lab]) => {
      const c = K.crate(lab);
      c.position.set(x, y, z);
      bay.add(c);
      crates.push(c);
    });
    G.blockRect(1.85, 2.95, 3.65, 3.85);
    L.crates = crates;
    L.bay = bay;

    // ---------------------------------------------------- the stage
    const stg = PR.stage(ST, LOOSE);
    scene.add(stg.root);
    L.stage = stg;
    G.height(ST.x0, ST.z0, ST.x0 + 3 * ST.t, ST.z0 + 3 * ST.t, STAGE_Y);

    // the demo set
    const bell = PR.bellPost();
    bell.root.position.set(DEV.bell.at[0], 0, DEV.bell.at[1]);
    scene.add(bell.root);
    const lamp = PR.lampPost();
    lamp.root.position.set(DEV.lamp.at[0], 0, DEV.lamp.at[1]);
    lamp.root.rotation.y = PI;                             // the button faces the stage
    scene.add(lamp.root);
    const flag = PR.flagPole();
    flag.root.position.set(DEV.flag.at[0], 0, DEV.flag.at[1]);
    scene.add(flag.root);
    const big = PR.bigBellPost(BIG.h, BIG.arm, BIG.handleY - CL.Room.PLINTH_Y);
    big.root.position.set(BIG.at[0], CL.Room.PLINTH_Y, BIG.at[1]);
    big.root.rotation.y = BIG.rot;
    scene.add(big.root);
    L.dev = { bell, lamp, flag, big };
    G.blockCircle(DEV.bell.at[0], DEV.bell.at[1], 0.1);
    G.blockCircle(DEV.lamp.at[0], DEV.lamp.at[1], 0.1);
    G.blockCircle(DEV.flag.at[0], DEV.flag.at[1], 0.1);
    G.blockCircle(BIG.at[0], BIG.at[1], 0.14);

    // Fable's set on a bar above the porthole
    const mir = PR.mirrorBar(MIRROR.x0, MIRROR.x1, MIRROR.xs);
    mir.root.position.set(0, MIRROR.y, MIRROR.z);
    scene.add(mir.root);
    L.mirror = mir;

    // recorder, camera, monitor
    const rec = PR.recorder();
    rec.root.position.set(REC.at[0], 0, REC.at[1]);
    scene.add(rec.root);
    L.rec = rec;
    G.blockRect(REC.at[0] - 0.7, REC.at[1] - 0.36, REC.at[0] + 0.7, REC.at[1] + 0.34);
    const cam = PR.tripodCam();
    cam.root.position.set(CAM.at[0], 0, CAM.at[1]);
    cam.head.rotation.y = Math.atan2(RX - CAM.at[0], 6.2 - CAM.at[1]);
    cam.head.rotation.x = 0.0;
    scene.add(cam.root);
    L.cam = cam;
    G.blockCircle(CAM.at[0], CAM.at[1], 0.36);
    // the camera's cable to the recorder
    CL.Room.run(scene, [[CAM.at[0] + 0.1, 0.02, CAM.at[1] + 0.15], [9.42, 0.02, 5.1], [9.42, 0.02, 8.5], [REC.at[0] - 0.5, 0.02, 8.5]], 0.018, P.INK);
    const mon = PR.monitor();
    mon.root.position.set(MON.at[0], CL.Room.PLINTH_Y, MON.at[1]);
    mon.root.rotation.y = MON.rot;
    scene.add(mon.root);
    L.mon = mon;
    G.blockRect(MON.at[0] - 0.3, MON.at[1] - 0.25, MON.at[0] + 0.3, MON.at[1] + 0.3, 0.15);

    // easel and cards
    const ea = PR.easel(CARDS);
    ea.root.position.set(EASEL.at[0], 0, EASEL.at[1]);
    ea.root.rotation.y = EASEL.rot;
    scene.add(ea.root);
    ea.stack.forEach(s => ea.board.add(s));
    L.easel = ea;
    G.blockCircle(EASEL.at[0], EASEL.at[1], 0.42);

    // the step stool
    const stool = PR.stool();
    stool.position.set(STOOL0[0], 0, STOOL0[1]);
    stool.rotation.y = 0.3;
    scene.add(stool);
    L.stool = stool;

    // the tap chart on the reactor, and the poster stand in front of it (on the plinth)
    const ch = PR.chart();
    ch.position.set(CHART.x, CHART.y, CHART.z);
    scene.add(ch);
    L.chart = ch;
    const ps = PR.posterStand(POSTER.y - CL.Room.PLINTH_Y);
    ps.root.position.set(POSTER.x, CL.Room.PLINTH_Y, POSTER.z);
    scene.add(ps.root);
    L.poster = ps;
    G.blockCircle(POSTER.x, POSTER.z, 0.12, 0.18);

    // the stage's data port
    const jb = PR.jbox();
    jb.root.position.set(JBOX.at[0], 0, JBOX.at[1]);
    scene.add(jb.root);
    CL.Room.run(scene, [[JBOX.at[0] + 0.22, 0.02, JBOX.at[1]], [ST.x0 - 0.12, 0.02, JBOX.at[1]]], 0.02, P.INK);
    L.jbox = jb;
    G.blockRect(JBOX.at[0] - 0.22, JBOX.at[1] - 0.15, JBOX.at[0] + 0.22, JBOX.at[1] + 0.15);

    // tool board with the empty hook
    const peg = PR.pegboard();
    peg.root.position.set(PEG.x, PEG.y, 0.0);
    back.add(peg.root);
    L.peg = peg;
    L.hookWorld = new T.Vector3(PEG.x + peg.hook.x, PEG.y + peg.hook.y, peg.hook.z);

    // lighting: a warm morning
    world.pipe.post.uniforms.uTint.value.set(P.GLOW_CORE);
    world.pipe.post.uniforms.uTintA.value = 0.07;
    L.reactorLamps.forEach(l => l.userData.set(1));

    return L;
  }

  CL.Ch2Level = { build, ST, STAGE_Y, LOOSE, tileXZ, onStage, DEV, BIG, REC, CAM, EASEL, STOOL0, JBOX, PEG, CHART, POSTER, MON, MIRROR, CARDS };
})(window.CL = window.CL || {});
