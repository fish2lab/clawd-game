/* Chapter 4 · 蒸馏 DISTILLATION — the room, seven days before release, 21:00.

   Night: the desk lamp and the blue of the fish tank. The cryo pods are in (same
   places as the prologue), the PLEASE DO NOT TAP THE GLASS sign is up, the porthole
   has its first small crack. Opus's research corner, left of the pods:

     - the fish tank: a navy whale (teacher) and a small square terracotta fish
       (student); a tall shelf over its left end with the key to the still cabinet;
       a ruler with a FULL line on the glass; a drain valve in front.
     - the song console left of the tank: five glass tubes graduated in five rings,
       lit to the whale's song; an orange collar on each tube shows the fish's
       fader; five faders, a T knob, a desk bell.
     - a communicating pipe out of the tank's right end (inlet valve, lever along
       the pipe = open) into a floor trench with a flow window, to a hatch in the
       reactor plinth. Under the reactor is the condensate tank: its standpipe and
       a SHUT / OPEN dial are on the reactor front. Only Haiku fits the hatch, and
       a crate of salt stands in front of it.
     - the copper still in a locked navy cabinet in front of Haiku's pod: a T knob
       on the burner, five condenser valves with rising yellow stems, a copper feed
       from the reactor and a glass tube to the top of Haiku's pod.
     - the reactor's data port, left of the porthole (Sonnet's laptop reads it). */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const TX = CL.Tex;
  const X = CL.gfx;
  const A4 = CL.Ch4Art;
  const { ink } = CL.Ink;
  const PI = Math.PI;
  const { RW, RD, WALL_H, RX, PLINTH_Y } = CL.Room;
  const run = CL.Room.run;

  const PODS = {
    opus: { x: 1.5, z: 1.15, k: 1.0, label: 'OPUS 5.5' },
    sonnet: { x: 3.85, z: 0.95, k: 0.78, label: 'SONNET 5.5' },
    haiku: { x: 5.85, z: 0.75, k: 0.56, label: 'HAIKU 5.5' },
  };
  const TANK = { x0: 2.6, x1: 5.6, z0: 5.6, z1: 6.7, cab: 0.85, gx0: 2.7, gx1: 5.5, gz0: 5.7, gz1: 6.6, gy0: 0.89, gy1: 2.22, sand: 1.0 };
  const WATER = { full: 2.05, head: 2.12, start: 1.85, low: 1.3, min: 1.08 };
  const CONSOLE = { x0: 0.5, x1: 2.4, z0: 5.85, zb: 6.27, z1: 6.7, yf: 0.79, yb: 1.04 };
  const TUBES = { x: [0.75, 1.02, 1.29, 1.56, 1.83], z: 6.06, y0: 1.06, step: 0.15 };
  const FADER = { run: [0.08, 0.4], tx: 1.65 };          // plate-local (from the plate's front edge / left edge)
  const BELL = [2.2, 1.04, 6.06];
  const SHELF = { x0: 3.2, x1: 4.6, z0: 5.42, z1: 5.98, y: 3.7 };
  const KEY0 = [3.9, 3.745, 5.9];
  const KEY_FLOOR = [4.1, 7.35];
  const SPOUT = { x: 3.9, z: 6.15 };
  const DRAIN = { x: 2.95, y: 0.33, z: 6.83 };
  const INLET = { x: 5.74, y: 0.6, z: 6.15 };
  const TRENCH = [[5.85, 6.15], [5.85, 5.0], [7.5, 5.0], [7.5, 4.42]];
  const FLOW = [6.75, 5.0];
  const HATCH = { x: 7.5, y: 0.21, z: 4.405 };
  const DIAL = { x: 8.1, y: 0.27, z: 4.41 };
  const STAND = { x: 8.05, z: 3.5, y0: 0.62, y1: 2.6 };
  const PORT = [8.45, 1.2, 3.43];
  const STILL = { x0: 4.75, x1: 6.25, z0: 2.75, z1: 3.55, h: 1.9 };
  const BX = 5.15, JX = 5.85;            // the still's boiler and condenser jar (x)
  const VALVES_X = [4.97, 5.23, 5.49, 5.75, 6.01];
  const VALVE = { y: 1.1, z: 3.42, step: 0.055, base: 0.03 };
  const STILL_TUBE = [[JX, 1.9, 2.9], [JX, 2.35, 2.9], [JX, 2.35, 0.75], [JX, 1.63, 0.75]];
  const CRATE0 = [7.5, 4.95];
  const DESK = { x0: 0.45, x1: 1.4, z0: 8.0, z1: 9.5, y: 0.95 };

  function build(world) {
    const scene = world.scene;
    const L = CL.Room.build(world, { clock: [21, 0] });
    const { back, left } = L.walls;
    const R = L.reactor;
    const G = L.grid;

    // ---------------------------------------------------- pods (same places as the prologue)
    L.pods = {};
    Object.entries(PODS).forEach(([name, c], i) => {
      const pd = K.pod(c.k, c.label, 11 + i);
      pd.root.position.set(c.x, 0, c.z);
      scene.add(pd.root);
      pd.x = c.x; pd.z = c.z;
      pd.frost.clear();
      const lp = K.lamp(false);
      lp.position.set(c.x, 4.65, c.z * 0.6);
      back.add(lp);
      back.add(K.box(0.02, WALL_H - 4.9, 0.02, P.INK, c.x, 4.9 + (WALL_H - 4.9) / 2, c.z * 0.6));
      pd.lamp = lp;
      pd.gauge.userData.set(0.05);
      L.pods[name] = pd;
    });
    // Haiku is still last generation: tape over the number on its plate
    const hp = L.pods.haiku;
    hp.tape = K.decal(0.3 * hp.k, 0.2 * hp.k, A4.tape(0.3, 0.2), { useAlpha: true });
    hp.tape.position.set(0.2 * hp.k, 0.145 * hp.k, 0.99 * hp.k);
    hp.tape.rotation.z = -0.06;
    hp.root.add(hp.tape);
    hp.hinge.rotation.y = -2.1;

    // ---------------------------------------------------- the porthole: its first small crack (chapter 3)
    const crackCv = document.createElement('canvas');
    crackCv.width = crackCv.height = 512;
    const cg = new X.G(crackCv.getContext('2d'), 512, 512, new X.Cam(CL.Lab.PORT_C[0], CL.Lab.PORT_C[1], 4.0));
    cg.zoomk = 1.6;
    cg.beginWorld();
    CL.Lab.drawCracks(cg, 0.55);
    cg.end();
    const crack = K.decal(4.0, 4.0, new T.CanvasTexture(crackCv), { useAlpha: true, depthWrite: false });
    crack.position.set(RX, R.PC.y, R.PC.z + 0.07);
    crack.renderOrder = 3;
    scene.add(crack);

    // ---------------------------------------------------- the fish tank
    const tank = new T.Group();
    scene.add(tank);
    const tcx = (TANK.x0 + TANK.x1) / 2, tcz = (TANK.z0 + TANK.z1) / 2;
    const tw = TANK.x1 - TANK.x0, td = TANK.z1 - TANK.z0;
    tank.add(K.box(tw, TANK.cab, td, P.NAVY, tcx, TANK.cab / 2, tcz));
    [tcx - 0.75, tcx + 0.75].forEach(x => {
      tank.add(K.box(1.25, 0.56, 0.02, P.NAVY_LIGHT, x, 0.4, TANK.z1 + 0.01));
      tank.add(K.box(0.05, 0.12, 0.04, P.BRASS, x + (x < tcx ? 0.5 : -0.5), 0.4, TANK.z1 + 0.03));
    });
    const plaque = K.decal(1.2, 0.13, A4.label('TEACHER · STUDENT', 1.2, 0.13, 0.065));
    plaque.position.set(tcx, 0.76, TANK.z1 + 0.012);
    tank.add(plaque);
    tank.add(K.box(tw, 0.04, td, P.NAVY_DARK, tcx, TANK.cab + 0.02, tcz));
    const gh = TANK.gy1 - TANK.gy0, gyc = (TANK.gy0 + TANK.gy1) / 2;
    [[TANK.gx0, TANK.gz0], [TANK.gx1, TANK.gz0], [TANK.gx0, TANK.gz1], [TANK.gx1, TANK.gz1]].forEach(([x, z]) => tank.add(K.box(0.06, gh, 0.06, P.NAVY, x, gyc, z)));
    [TANK.gz0, TANK.gz1].forEach(z => tank.add(K.box(TANK.gx1 - TANK.gx0 + 0.06, 0.06, 0.06, P.NAVY, tcx, TANK.gy1, z)));
    [TANK.gx0, TANK.gx1].forEach(x => tank.add(K.box(0.06, 0.06, TANK.gz1 - TANK.gz0, P.NAVY, x, TANK.gy1, tcz)));
    // glass panes: drawn in colour only (layer 1), so the whale behind them keeps its ink outline
    const glassM = ink(P.GLASS, { opacity: 0.13, flat: true, lit: true, depthWrite: false, side: T.DoubleSide });
    const gw = TANK.gx1 - TANK.gx0, gd = TANK.gz1 - TANK.gz0;
    const panes = [
      [gw, tcx, TANK.gz1, 0], [gw, tcx, TANK.gz0, 0], [gd, TANK.gx0, tcz, PI / 2], [gd, TANK.gx1, tcz, PI / 2],
    ].map(([w, x, z, ry]) => {
      const p = new T.Mesh(new T.PlaneGeometry(w, gh), glassM);
      p.position.set(x, gyc, z);
      p.rotation.y = ry;
      p.layers.set(1);
      tank.add(p);
      return p;
    });
    // sand, pebbles, weeds
    tank.add(K.box(gw - 0.04, TANK.sand - TANK.gy0, gd - 0.04, P.FLOOR_DARK, tcx, (TANK.sand + TANK.gy0) / 2, tcz));
    for (let i = 0; i < 9; i++) {
      const pb = K.mesh(new T.SphereGeometry(0.04 + 0.03 * X.hash01('pb', i), 8, 6), K.m(P.REACTOR_SHADE), TANK.gx0 + 0.2 + 2.4 * X.hash01('px', i), TANK.sand + 0.01, TANK.gz0 + 0.15 + 0.6 * X.hash01('pz', i));
      pb.scale.y = 0.6;
      tank.add(pb);
    }
    const weedCol = A4.mixc(P.CODE_GREEN, P.INK, 0.4);
    L.weeds = [[2.85, 5.8, 0.55], [2.98, 5.85, 0.8], [5.2, 5.82, 0.7], [5.33, 5.9, 0.5], [4.6, 5.78, 0.42]].map(([x, z, h], i) => {
      const g = new T.Group();
      g.position.set(x, TANK.sand, z);
      g.add(K.box(0.035, h, 0.035, weedCol, 0, h / 2, 0));
      g.add(K.box(0.03, h * 0.5, 0.03, weedCol, 0.05, h * 0.25, 0.02));
      g.userData.ph = i * 1.7;
      tank.add(g);
      return g;
    });
    // water: a box drawn in colour only, and a white meniscus line on the glass at its surface
    const waterM = ink(P.WATER_DEEP, { opacity: 0.38, flat: true, lit: true, depthWrite: false, emissive: A4.mixc(P.WATER, P.NIGHT, 0.82) });
    const water = new T.Mesh(new T.BoxGeometry(gw - 0.04, 1, gd - 0.04), waterM);
    water.layers.set(1);
    water.position.set(tcx, 0, tcz);
    tank.add(water);
    const men = new T.Group();
    men.add(K.box(gw - 0.04, 0.018, 0.012, P.FROST, tcx, 0, TANK.gz1 - 0.012, { flat: true }));
    men.add(K.box(gw - 0.04, 0.018, 0.012, P.FROST, tcx, 0, TANK.gz0 + 0.012, { flat: true }));
    men.add(K.box(0.012, 0.018, gd - 0.04, P.FROST, TANK.gx0 + 0.012, 0, tcz, { flat: true }));
    men.add(K.box(0.012, 0.018, gd - 0.04, P.FROST, TANK.gx1 - 0.012, 0, tcz, { flat: true }));
    tank.add(men);
    // the ruler with the FULL line, stuck on the front glass at the right end
    const scale = K.decal(0.14, gh, A4.levelScale(gh, WATER.full - TANK.gy0));
    scale.position.set(TANK.gx1 - 0.14, gyc, TANK.gz1 + 0.004);
    tank.add(scale);
    // level gauge on the cabinet
    const lg = K.gauge(0.11, 'H2O');
    lg.position.set(TANK.x1 - 0.32, 0.5, TANK.z1 + 0.04);
    tank.add(lg);
    // blue light of the tank
    const tglow = K.glow(P.WATER_DEEP, 4.4);
    tglow.position.set(tcx, 1.6, TANK.z0 - 0.25);
    tglow.material.opacity = 0.55;
    tank.add(tglow);
    L.tank = { root: tank, water, men, panes, scale, gauge: lg, glow: tglow, plaque };

    // tank bubbles (an air stone at the back right, more when air comes out of a dry pipe)
    L.bubbles = [];
    const bubM = ink(P.FROST, { flat: true, lit: true });
    for (let i = 0; i < 14; i++) {
      const b = K.mesh(new T.SphereGeometry(1, 8, 6), bubM, 5.2, -1, 6.3);
      b.scale.setScalar(0.025);
      b.visible = false;
      tank.add(b);
      L.bubbles.push({ m: b, t: 0, life: 0 });
    }

    // the shelf over the tank's left end, and the key
    const shelf = new T.Group();
    scene.add(shelf);
    const scx = (SHELF.x0 + SHELF.x1) / 2, scz = (SHELF.z0 + SHELF.z1) / 2;
    [SHELF.x0 + 0.04, SHELF.x1 - 0.04].forEach(x => shelf.add(K.box(0.05, SHELF.y + 0.2 - TANK.cab, 0.05, P.NAVY, x, (SHELF.y + 0.2 + TANK.cab) / 2, TANK.z0 + 0.03)));
    shelf.add(K.box(SHELF.x1 - SHELF.x0, 0.05, SHELF.z1 - SHELF.z0, P.REACTOR, scx, SHELF.y - 0.025, scz));
    shelf.add(K.box(SHELF.x1 - SHELF.x0, 0.03, 0.03, P.NAVY, scx, SHELF.y - 0.06, SHELF.z1 - 0.015));
    [[SHELF.x0 + 0.2, 0.22], [SHELF.x0 + 0.38, 0.17]].forEach(([x, h]) => {
      const j = K.cyl(0.075, 0.075, h, P.GLASS, x, SHELF.y + h / 2, 5.62, 14, { opacity: 0.6, lit: true });
      shelf.add(j);
      shelf.add(K.cyl(0.08, 0.08, 0.03, P.NAVY, x, SHELF.y + h + 0.015, 5.62, 14));
      shelf.add(K.cyl(0.05, 0.05, h * 0.5, P.ORANGE_LIGHT, x, SHELF.y + h * 0.3, 5.62, 10, { opacity: 0.8 }));
    });
    const book = K.box(0.08, 0.28, 0.22, P.TIE_RED, SHELF.x1 - 0.18, SHELF.y + 0.14, 5.6);
    book.rotation.z = 0.12;
    shelf.add(book);
    shelf.add(K.box(0.07, 0.24, 0.2, P.NAVY_LIGHT, SHELF.x1 - 0.28, SHELF.y + 0.12, 5.6));
    L.shelf = shelf;
    const key = new T.Group();
    const kr = K.mesh(new T.TorusGeometry(0.045, 0.014, 6, 16), K.m(P.BRASS), -0.11, 0, 0);
    key.add(kr);
    key.add(K.box(0.17, 0.022, 0.022, P.BRASS, 0.02, 0, 0));
    key.add(K.box(0.022, 0.05, 0.022, P.BRASS, 0.09, -0.03, 0));
    key.add(K.box(0.022, 0.035, 0.022, P.BRASS, 0.05, -0.022, 0));
    key.add(K.box(0.07, 0.09, 0.01, P.WHEEL_RED, -0.2, -0.04, 0.0));
    key.rotation.x = -PI / 2;
    key.scale.setScalar(1.35);
    key.position.set(...KEY0);
    scene.add(key);
    L.key = key;

    // ---------------------------------------------------- the whale, the fish, the spout
    L.whale = A4.whale();
    L.whale.root.scale.setScalar(0.85);
    L.whale.root.position.set(3.95, 1.42, tcz);
    L.whale.root.rotation.y = PI;
    scene.add(L.whale.root);
    L.fish = A4.fish();
    L.fish.root.position.set(3.4, 1.7, 6.47);
    scene.add(L.fish.root);
    const spout = new T.Group();
    const spoutM = ink(P.FROST, { shadeMin: 0.86, hatch: 0.06, lit: true });
    const col = K.mesh(new T.CylinderGeometry(0.075, 0.11, 1, 14, 1, true), spoutM, 0, 0.5, 0);
    spout.add(col);
    spout.position.set(SPOUT.x, 1.7, SPOUT.z);
    spout.scale.set(1, 0.001, 1);
    spout.visible = false;
    scene.add(spout);
    L.spout = spout;

    // ---------------------------------------------------- the song console
    const con = new T.Group();
    scene.add(con);
    const cw = CONSOLE.x1 - CONSOLE.x0, ccx = (CONSOLE.x0 + CONSOLE.x1) / 2;
    con.add(K.box(cw, CONSOLE.yb, CONSOLE.zb - CONSOLE.z0, P.NAVY, ccx, CONSOLE.yb / 2, (CONSOLE.z0 + CONSOLE.zb) / 2));
    con.add(K.box(cw, CONSOLE.yf, CONSOLE.z1 - CONSOLE.zb, P.NAVY, ccx, CONSOLE.yf / 2, (CONSOLE.zb + CONSOLE.z1) / 2));
    const wedgeS = new T.Shape();
    wedgeS.moveTo(0, 0); wedgeS.lineTo(CONSOLE.z1 - CONSOLE.zb, 0); wedgeS.lineTo(CONSOLE.z1 - CONSOLE.zb, CONSOLE.yb - CONSOLE.yf); wedgeS.closePath();
    const wedge = K.extrude(wedgeS, cw, P.NAVY);
    wedge.rotation.y = PI / 2;
    wedge.position.set(CONSOLE.x0, CONSOLE.yf, CONSOLE.z1);
    con.add(wedge);
    con.add(K.box(cw * 0.9, 0.32, 0.02, P.NAVY_LIGHT, ccx, 0.4, CONSOLE.z1 + 0.01));
    // the sloping fader plate
    const pl = Math.hypot(CONSOLE.z1 - CONSOLE.zb, CONSOLE.yb - CONSOLE.yf), pa = Math.atan2(CONSOLE.yb - CONSOLE.yf, CONSOLE.z1 - CONSOLE.zb);
    const plateG = new T.Group();
    plateG.position.set(ccx, (CONSOLE.yf + CONSOLE.yb) / 2 + 0.02, (CONSOLE.zb + CONSOLE.z1) / 2);
    plateG.rotation.x = pa;
    con.add(plateG);
    const slotsX = TUBES.x.map(x => x - CONSOLE.x0);
    const plate = K.decal(cw, pl, A4.faderPlate(cw, pl, slotsX, FADER.run, FADER.tx));
    plate.rotation.x = -PI / 2;
    plate.position.y = 0.002;
    plateG.add(plate);
    const knobs = slotsX.map(sx => {
      const kb = K.box(0.1, 0.045, 0.06, P.ORANGE, sx - cw / 2, 0.025, 0);
      kb.add(K.box(0.1, 0.006, 0.012, P.ORANGE_DARK, 0, 0.024, 0, { flat: true }));
      plateG.add(kb);
      return kb;
    });
    const fpos = v => pl / 2 - (FADER.run[0] + (FADER.run[1] - FADER.run[0]) * v / 5);
    knobs.forEach(kb => { kb.position.z = fpos(0); });
    const tKnob = new T.Group();
    tKnob.position.set(FADER.tx - cw / 2, 0.0, pl / 2 - pl * 0.5);
    tKnob.add(K.cyl(0.07, 0.075, 0.07, P.BRASS, 0, 0.035, 0, 18));
    const tPtr = new T.Group();
    tPtr.position.y = 0.072;
    tPtr.add(K.box(0.075, 0.012, 0.016, P.INK, 0.035, 0, 0, { flat: true }));
    tKnob.add(tPtr);
    plateG.add(tKnob);
    // the five tubes: glass graduated in five rings, a lit column (the whale), an orange collar (the fish)
    const tubeTex = TX.tex(TX.paint(1, 0.84, 256, g => {
      g.fill(X.rect(0, 0, 1, 0.84), P.GLASS, 0.25);
      for (let k = 0; k <= 5; k++) g.fill(X.rect(0, 0.02 + k * TUBES.step - 0.006, 1, 0.02 + k * TUBES.step + 0.006), P.INK, k === 0 ? 0.5 : 0.95);
    }));
    const tubeM = ink('#FFFFFF', { map: tubeTex, useAlpha: true, flat: true, lit: true, depthWrite: false, side: T.DoubleSide });
    const tubes = TUBES.x.map((x, i) => {
      const glass = K.mesh(new T.CylinderGeometry(0.065, 0.065, 0.84, 16, 1, true), tubeM, x, TUBES.y0 - 0.02 + 0.42, TUBES.z);
      glass.renderOrder = 2;
      con.add(glass);
      con.add(K.cyl(0.085, 0.085, 0.05, P.NAVY_DARK, x, CONSOLE.yb + 0.01, TUBES.z, 14));
      con.add(K.cyl(0.08, 0.08, 0.04, P.NAVY_DARK, x, TUBES.y0 + 0.84, TUBES.z, 14));
      const cm = A4.glowMat(P.SCREEN);
      const column = K.mesh(new T.CylinderGeometry(0.045, 0.045, 1, 12), cm, x, TUBES.y0, TUBES.z);
      column.scale.y = 0.001;
      con.add(column);
      const collar = K.mesh(new T.TorusGeometry(0.078, 0.017, 6, 20), A4.own(P.ORANGE), x, TUBES.y0, TUBES.z);
      collar.rotation.x = PI / 2;
      con.add(collar);
      return { glass, column, collar, mat: cm, x };
    });
    const board = K.box(cw - 0.1, 1.0, 0.04, P.NAVY_DARK, ccx, CONSOLE.yb + 0.5, CONSOLE.z0 + 0.03);
    con.add(board);
    const songLabel = K.decal(1.0, 0.13, A4.panelText('WHALE SONG', 1.0, 0.13, P.SCREEN), { useAlpha: true });
    songLabel.position.set(ccx - 0.15, CONSOLE.yb + 0.93, CONSOLE.z0 + 0.052);
    con.add(songLabel);
    // the desk bell
    const bell = new T.Group();
    bell.position.set(...BELL);
    bell.add(K.cyl(0.1, 0.1, 0.03, P.NAVY_DARK, 0, 0.015, 0, 18));
    const dome = K.mesh(new T.SphereGeometry(0.085, 18, 10, 0, PI * 2, 0, PI / 2), K.m(P.BRASS), 0, 0.03, 0);
    bell.add(dome);
    const plunger = K.cyl(0.014, 0.014, 0.06, P.BRASS_LIGHT, 0, 0.13, 0, 8);
    bell.add(plunger);
    bell.add(K.cyl(0.03, 0.03, 0.015, P.BRASS, 0, 0.16, 0, 10));
    con.add(bell);
    L.console = { root: con, plateG, plate, plateLen: pl, plateW: cw, knobs, fpos, tKnob, tPtr, tubes, board, bell, plunger, songLabel };

    // ---------------------------------------------------- drain valve (front of the tank, to a floor drain)
    const drainG = new T.Group();
    scene.add(drainG);
    run(drainG, [[DRAIN.x, 0.58, TANK.z1], [DRAIN.x, 0.58, DRAIN.z], [DRAIN.x, 0.03, DRAIN.z]], 0.035, P.POD);
    const grate = K.mesh(new T.CircleGeometry(0.16, 18), K.m(P.NAVY_DARK, { flat: true }), DRAIN.x, 0.004, DRAIN.z + 0.05);
    grate.rotation.x = -PI / 2;
    drainG.add(grate);
    [-0.08, 0, 0.08].forEach(d => drainG.add(K.box(0.26, 0.006, 0.02, P.NAVY_LIGHT, DRAIN.x, 0.008, DRAIN.z + 0.05 + d, { flat: true })));
    const dBody = K.cyl(0.065, 0.065, 0.15, P.NAVY, DRAIN.x, DRAIN.y, DRAIN.z, 12);
    drainG.add(dBody);
    const dLever = new T.Group();
    dLever.position.set(DRAIN.x, DRAIN.y, DRAIN.z + 0.08);
    dLever.add(K.box(0.035, 0.28, 0.05, P.WHEEL_RED, 0, 0.12, 0));
    dLever.add(K.box(0.05, 0.07, 0.07, P.WHEEL_RED_DARK, 0, 0.25, 0));
    dLever.rotation.z = -PI / 2;
    drainG.add(dLever);
    L.drain = { body: dBody, lever: dLever, grate };

    // ---------------------------------------------------- the communicating pipe: inlet valve, trench, flow window
    const inG = new T.Group();
    scene.add(inG);
    run(inG, [[TANK.x1 - 0.02, INLET.y, INLET.z], [TRENCH[0][0], INLET.y, INLET.z], [TRENCH[0][0], 0.03, INLET.z]], 0.04, P.POD);
    inG.add(K.flange(TANK.x1 + 0.01, INLET.y, INLET.z, 0.04, 'x'));
    const iBody = K.cyl(0.075, 0.075, 0.15, P.NAVY, INLET.x, INLET.y, INLET.z, 12);
    iBody.rotation.z = PI / 2;
    inG.add(iBody);
    inG.add(K.cyl(0.02, 0.02, 0.06, P.NAVY, INLET.x, INLET.y + 0.08, INLET.z, 8));
    const iLever = new T.Group();
    iLever.position.set(INLET.x, INLET.y + 0.11, INLET.z);
    iLever.add(K.box(0.3, 0.03, 0.05, P.WHEEL_RED, 0.13, 0, 0));
    iLever.add(K.box(0.08, 0.05, 0.07, P.WHEEL_RED_DARK, 0.27, 0, 0));
    iLever.rotation.y = -PI / 2;
    inG.add(iLever);
    // trench: a channel with a grate; the strip under the grate turns to water when the pipe is full
    const grateTex = TX.paint(0.26, 0.32, 256, g => {
      for (let i = 0; i < 2; i++) g.fs(X.rect(0, 0.05 + i * 0.16, 0.26, 0.11 + i * 0.16), P.NAVY_LIGHT, 0.5);
      g.fill(X.rect(0, 0, 0.03, 0.32), P.NAVY);
      g.fill(X.rect(0.23, 0, 0.26, 0.32), P.NAVY);
    });
    const wetM = A4.own(P.NAVY_DARK, { flat: true });
    const trench = [];
    for (let i = 0; i < TRENCH.length - 1; i++) {
      const [ax, az] = TRENCH[i], [bx, bz] = TRENCH[i + 1];
      const len = Math.hypot(bx - ax, bz - az) + 0.26, along = Math.abs(bx - ax) > Math.abs(bz - az);
      const cx = (ax + bx) / 2, cz = (az + bz) / 2;
      const strip = K.box(along ? len : 0.26, 0.004, along ? 0.26 : len, P.NAVY_DARK, cx, 0.002, cz, { flat: true });
      inG.add(strip);
      const wet = K.box(along ? len - 0.06 : 0.14, 0.004, along ? 0.14 : len - 0.06, P.NAVY_DARK, cx, 0.005, cz);
      wet.material = wetM;
      inG.add(wet);
      const gt = TX.tex(grateTex);
      gt.wrapS = gt.wrapT = T.RepeatWrapping;
      gt.repeat.set(1, len / 0.32);
      const gm = K.decal(0.26, len, gt, { useAlpha: true, depthWrite: false });
      gm.rotation.x = -PI / 2;
      if (along) gm.rotation.z = PI / 2;
      gm.position.set(cx, 0.009, cz);
      inG.add(gm);
      trench.push(wet);
    }
    const flowG = new T.Group();
    flowG.position.set(FLOW[0], 0.012, FLOW[1]);
    const rim = K.mesh(new T.TorusGeometry(0.13, 0.025, 6, 22), K.m(P.BRASS), 0, 0.01, 0);
    rim.rotation.x = PI / 2;
    flowG.add(rim);
    const disc = K.mesh(new T.CircleGeometry(0.13, 22), ink(P.FROST, { flat: true, lit: true }), 0, 0.0, 0);
    disc.rotation.x = -PI / 2;
    flowG.add(disc);
    const paddle = new T.Group();
    paddle.position.y = 0.012;
    paddle.add(K.box(0.2, 0.01, 0.035, P.ALARM, 0, 0, 0, { flat: true }));
    paddle.add(K.box(0.035, 0.01, 0.2, P.ALARM, 0, 0, 0, { flat: true }));
    flowG.add(paddle);
    inG.add(flowG);
    L.inlet = { body: iBody, lever: iLever, group: inG };
    L.trench = { wet: trench, wetM, flow: flowG, paddle };

    // ---------------------------------------------------- the hatch under the plinth, the SHUT/OPEN dial, the standpipe
    const hatch = new T.Group();
    scene.add(hatch);
    const hole = K.box(0.52, 0.36, 0.01, P.INK, HATCH.x, HATCH.y, HATCH.z, { flat: true });
    hatch.add(hole);
    const flapH = new T.Group();
    flapH.position.set(HATCH.x, HATCH.y + 0.18, HATCH.z + 0.012);
    const flap = new T.Group();
    flap.add(K.box(0.5, 0.34, 0.02, P.NAVY, 0, -0.17, 0));
    [-0.08, -0.17, -0.26].forEach(y => flap.add(K.box(0.42, 0.025, 0.012, P.NAVY_DARK, 0, y, 0.012)));
    flapH.add(flap);
    hatch.add(flapH);
    const dialG = new T.Group();
    dialG.position.set(DIAL.x, DIAL.y, DIAL.z);
    dialG.add(K.cyl(0.14, 0.14, 0.03, P.NAVY_DARK, 0, 0, -0.005, 20).rotateX(PI / 2));
    const dface = K.decal(0.24, 0.24, A4.shutOpenFace(), { useAlpha: true });
    dface.position.z = 0.012;
    dialG.add(dface);
    const dPtr = new T.Group();
    dPtr.position.z = 0.016;
    dPtr.add(K.box(0.016, 0.09, 0.008, P.INK, 0, 0.045, 0, { flat: true }));
    dPtr.rotation.z = PI / 3;
    dialG.add(dPtr);
    hatch.add(dialG);
    // the condensate standpipe on the reactor front: water stands high in it
    const stand = new T.Group();
    scene.add(stand);
    const sh = STAND.y1 - STAND.y0;
    const sg = K.mesh(new T.CylinderGeometry(0.06, 0.06, sh, 14, 1, true), ink(P.GLASS, { opacity: 0.35, flat: true, lit: true, depthWrite: false, side: T.DoubleSide }), STAND.x, STAND.y0 + sh / 2, STAND.z);
    stand.add(sg);
    const sw = K.mesh(new T.CylinderGeometry(0.045, 0.045, 1, 12), A4.glowMat(P.WATER, A4.mixc(P.WATER_DEEP, P.NIGHT, 0.5)), STAND.x, 0, STAND.z);
    sw.scale.y = WATER.head - STAND.y0;
    sw.position.y = STAND.y0 + sw.scale.y / 2;
    stand.add(sw);
    stand.add(K.cyl(0.075, 0.075, 0.05, P.NAVY, STAND.x, STAND.y1, STAND.z, 12));
    stand.add(K.cyl(0.075, 0.075, 0.05, P.NAVY, STAND.x, STAND.y0, STAND.z, 12));
    [0.95, 2.3].forEach(y => stand.add(K.box(0.05, 0.05, 0.1, P.NAVY, STAND.x, y, STAND.z - 0.06)));
    L.hatch = { root: hatch, flapH, hole, dial: dialG, dPtr };
    L.stand = { root: stand, glass: sg, water: sw };

    // ---------------------------------------------------- the reactor's data port
    const port = new T.Group();
    port.position.set(...PORT);
    port.add(K.box(0.26, 0.2, 0.05, P.NAVY_DARK, 0, 0, 0));
    port.add(K.box(0.12, 0.05, 0.012, P.INK, -0.03, -0.02, 0.03, { flat: true }));
    const led = K.box(0.03, 0.03, 0.012, P.ALARM, 0.08, 0.05, 0.03, { flat: true, lit: true, emissive: A4.mixc(P.ALARM, P.NIGHT, 0.6) });
    port.add(led);
    const plab = K.decal(0.26, 0.08, A4.panelText('DATA', 0.26, 0.08, P.SAFETY), { useAlpha: true });
    plab.position.set(0, 0.15, 0.0);
    port.add(plab);
    scene.add(port);
    // the laptop's readout, shown over Sonnet while it is plugged in
    const rcv = document.createElement('canvas');
    rcv.width = 520; rcv.height = 340;
    const rtex = new T.CanvasTexture(rcv);
    const readout = K.decal(1.3, 0.85, rtex, { emissive: A4.mixc(P.NAVY, P.NIGHT, 0.7), lit: true });
    readout.visible = false;
    scene.add(readout);
    const cable = K.pipe(0, 0, 0, 0, 1, 0, 0.012, P.INK);
    cable.visible = false;
    scene.add(cable);
    L.port = { root: port, led, readout, rcv, rtex, cable };

    // ---------------------------------------------------- the still
    const still = new T.Group();
    scene.add(still);
    const stw = STILL.x1 - STILL.x0, std = STILL.z1 - STILL.z0, stcx = (STILL.x0 + STILL.x1) / 2, stcz = (STILL.z0 + STILL.z1) / 2;
    still.add(K.box(stw, STILL.h, 0.04, P.NAVY, stcx, STILL.h / 2, STILL.z0 + 0.02));
    [STILL.x0 + 0.02, STILL.x1 - 0.02].forEach(x => still.add(K.box(0.04, STILL.h, std, P.NAVY, x, STILL.h / 2, stcz)));
    still.add(K.box(stw + 0.06, 0.06, std + 0.06, P.NAVY_DARK, stcx, STILL.h, stcz));
    still.add(K.box(stw, 0.06, std, P.NAVY_DARK, stcx, 0.03, stcz));
    still.add(K.box(stw - 0.08, STILL.h - 0.1, 0.02, P.POD_INSIDE, stcx, STILL.h / 2, STILL.z0 + 0.05, { flat: true }));
    const stillPlate = K.decal(0.5, 0.12, A4.label('STILL', 0.5, 0.12, 0.07));
    stillPlate.position.set(stcx, STILL.h - 0.11, STILL.z1 + 0.035);
    still.add(stillPlate);
    // burner, flames, T knob and dial
    still.add(K.box(0.5, 0.24, 0.46, P.NAVY_DARK, BX, 0.18, 3.12));
    const flameM = A4.glowMat(P.GLOW, A4.mixc(P.GLOW, P.NIGHT, 0.35));
    const flames = [[-0.12, -0.08], [0.12, -0.08], [-0.12, 0.1], [0.12, 0.1], [0, 0]].map(([dx, dz]) => {
      const f = K.mesh(new T.ConeGeometry(0.045, 0.14, 8), flameM, BX + dx, 0.37, 3.12 + dz);
      f.scale.setScalar(0.001);
      still.add(f);
      return f;
    });
    const stDial = K.decal(0.2, 0.2, TX.tex(TX.paint(1, 1, 200, g => {
      g.fs(X.circle(0.5, 0.5, 0.48), P.POD, 1.2);
      for (let k = 0; k < 5; k++) {
        const a = X.deg(210 - k * 60);
        g.line(0.5 + Math.cos(a) * 0.3, 0.5 + Math.sin(a) * 0.3, 0.5 + Math.cos(a) * 0.43, 0.5 + Math.sin(a) * 0.43, k === 4 ? 2.2 : 1.4, k === 4 ? P.ALARM : P.INK);
      }
      g.text('T', 0.5, 0.12, 0.2, P.ALARM, 'slab');
    }, { line: 3 })), { useAlpha: true });
    stDial.position.set(BX, 0.2, 3.355);
    still.add(stDial);
    const sKnob = new T.Group();
    sKnob.position.set(BX, 0.2, 3.37);
    sKnob.add(K.cyl(0.045, 0.05, 0.05, P.BRASS, 0, 0, 0.025, 14).rotateX(PI / 2));
    const sPtr = new T.Group();
    sPtr.position.z = 0.055;
    sPtr.add(K.box(0.012, 0.06, 0.008, P.INK, 0, 0.03, 0, { flat: true }));
    sKnob.add(sPtr);
    still.add(sKnob);
    // copper boiler, its thermometer, the swan neck, the condenser jar with its coil
    const boiler = K.mesh(new T.SphereGeometry(0.32, 22, 16), K.m(P.COPPER), BX, 0.62, 3.1);
    still.add(boiler);
    const bandM = K.mesh(new T.TorusGeometry(0.322, 0.016, 6, 30), K.m(P.COPPER_LIGHT), BX, 0.62, 3.1);
    bandM.rotation.x = PI / 2;
    still.add(bandM);
    const thermo = K.gauge(0.1, 'T');
    thermo.position.set(BX, 0.66, 3.43);
    still.add(thermo);
    run(still, [[BX, 0.92, 3.1], [BX, 1.48, 3.1], [JX, 1.48, 3.1], [JX, 1.18, 3.1]], 0.04, P.COPPER);
    const jar = K.mesh(new T.CylinderGeometry(0.2, 0.2, 0.9, 18, 1, true), ink(P.GLASS, { opacity: 0.35, flat: true, lit: true, depthWrite: false, side: T.DoubleSide }), JX, 0.7, 3.1);
    still.add(jar);
    still.add(K.cyl(0.22, 0.22, 0.06, P.NAVY, JX, 0.25, 3.1, 18));
    still.add(K.cyl(0.22, 0.22, 0.05, P.NAVY, JX, 1.16, 3.1, 18));
    for (let i = 0; i < 6; i++) {
      const c = K.mesh(new T.TorusGeometry(0.14, 0.022, 6, 22), K.m(P.COPPER_LIGHT), JX, 0.36 + i * 0.13, 3.1);
      c.rotation.x = PI / 2;
      still.add(c);
    }
    run(still, [[JX, 0.4, 3.1], [JX, 0.4, 2.9], [JX, 1.9, 2.9]], 0.035, P.COPPER);
    // the five condenser valves: a manifold, a handwheel on top of each, a yellow stem that rises with it
    still.add(K.cyl(0.035, 0.035, VALVES_X[4] - VALVES_X[0] + 0.2, P.COPPER, (VALVES_X[0] + VALVES_X[4]) / 2, VALVE.y - 0.09, VALVE.z, 10).rotateZ(PI / 2));
    const stemTex = A4.stemScale(0.36, VALVE.step);
    const valves = VALVES_X.map(x => {
      still.add(K.cyl(0.035, 0.04, 0.09, P.BRASS, x, VALVE.y - 0.045, VALVE.z, 10));
      const wh = K.wheel(0.065);
      wh.rotation.x = -PI / 2;
      wh.position.set(x, VALVE.y, VALVE.z);
      still.add(wh);
      const stem = new T.Group();
      stem.position.set(x, VALVE.y, VALVE.z);
      stem.add(K.box(0.022, 1, 0.022, P.SAFETY, 0, 0.5, 0));
      stem.scale.y = VALVE.base;
      still.add(stem);
      const sc = K.decal(0.08, 0.36, stemTex);
      sc.position.set(x, VALVE.y + 0.18, VALVE.z - 0.07);
      still.add(sc);
      return { wheel: wh, stem, x };
    });
    // doors (locked): hinged at the outer edges; a brass lock plate where they meet
    const doorL = new T.Group(), doorR = new T.Group();
    doorL.position.set(STILL.x0, 0, STILL.z1 + 0.02);
    doorR.position.set(STILL.x1, 0, STILL.z1 + 0.02);
    [[doorL, 1], [doorR, -1]].forEach(([d, s]) => {
      d.add(K.box(stw / 2, STILL.h - 0.1, 0.04, P.NAVY, s * stw / 4, STILL.h / 2, 0));
      d.add(K.box(stw / 2 - 0.16, 0.7, 0.02, P.NAVY_LIGHT, s * stw / 4, 1.3, 0.025));
      d.add(K.box(stw / 2 - 0.16, 0.6, 0.02, P.NAVY_LIGHT, s * stw / 4, 0.5, 0.025));
      d.add(K.box(0.04, 0.22, 0.05, P.BRASS, s * (stw / 2 - 0.08), 0.95, 0.04));
      still.add(d);
    });
    const lock = new T.Group();
    lock.add(K.box(0.1, 0.16, 0.02, P.BRASS, 0, 0, 0));
    lock.add(K.box(0.018, 0.05, 0.01, P.INK, 0, -0.01, 0.012, { flat: true }));
    doorR.add(lock);
    lock.position.set(-0.71, 0.95, 0.04);
    // feed from the reactor: copper, into the cabinet's right side
    run(still, [[RX - 3.3, 1.55, 3.05], [STILL.x1, 1.55, 3.05]], 0.05, P.COPPER);
    still.add(K.flange(RX - 3.36, 1.55, 3.05, 0.05, 'x'));
    still.add(K.flange(STILL.x1 + 0.05, 1.55, 3.05, 0.05, 'x'));
    // the glass tube to the top of Haiku's pod; copper joints
    const tubeGM = ink(P.GLASS, { opacity: 0.4, flat: true, lit: true, depthWrite: false });
    for (let i = 0; i < STILL_TUBE.length - 1; i++) {
      const p = K.pipe(...STILL_TUBE[i], ...STILL_TUBE[i + 1], 0.045, P.GLASS);
      p.material = tubeGM;
      still.add(p);
    }
    STILL_TUBE.forEach((p, i) => { if (i) still.add(K.mesh(new T.SphereGeometry(0.06, 10, 8), K.m(P.COPPER), ...p)); });
    L.still = { root: still, doors: [doorL, doorR], lock, flames, flameM, knob: sKnob, ptr: sPtr, dial: stDial, thermo, boiler, jar, valves };

    // ---------------------------------------------------- the crate of salt in front of the hatch
    const crate = K.crate('SALT');
    crate.position.set(CRATE0[0], 0.45, CRATE0[1]);
    [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]].forEach(([dx, dz]) => crate.add(K.cyl(0.06, 0.06, 0.04, P.INK, dx, -0.45, dz, 8)));
    scene.add(crate);
    L.crate = crate;

    // ---------------------------------------------------- Opus's desk and lamp
    const desk = new T.Group();
    scene.add(desk);
    const dcx = (DESK.x0 + DESK.x1) / 2, dcz = (DESK.z0 + DESK.z1) / 2;
    desk.add(K.box(DESK.x1 - DESK.x0, 0.05, DESK.z1 - DESK.z0, P.REACTOR, dcx, DESK.y, dcz));
    [[DESK.x0 + 0.06, DESK.z0 + 0.06], [DESK.x1 - 0.06, DESK.z0 + 0.06], [DESK.x0 + 0.06, DESK.z1 - 0.06], [DESK.x1 - 0.06, DESK.z1 - 0.06]].forEach(([x, z]) => desk.add(K.box(0.05, DESK.y, 0.05, P.NAVY, x, DESK.y / 2, z)));
    desk.add(K.box(0.7, 0.3, 0.6, P.NAVY, dcx, DESK.y - 0.2, DESK.z1 - 0.4));
    desk.add(K.box(0.04, 0.05, 0.12, P.BRASS, DESK.x1 - 0.22, DESK.y - 0.2, DESK.z1 - 0.4));
    const lamp = new T.Group();
    lamp.position.set(0.72, DESK.y + 0.025, DESK.z0 + 0.3);
    lamp.add(K.cyl(0.1, 0.11, 0.03, P.NAVY, 0, 0.015, 0, 16));
    const arm1 = K.box(0.03, 0.5, 0.03, P.NAVY_DARK, 0.06, 0.25, 0.1);
    arm1.rotation.x = 0.4;
    lamp.add(arm1);
    const arm2 = K.box(0.03, 0.03, 0.4, P.NAVY_DARK, 0.06, 0.47, 0.35);
    lamp.add(arm2);
    const shade = K.mesh(new T.ConeGeometry(0.13, 0.15, 16, 1, true), K.m(P.WHEEL_RED, { side: T.DoubleSide }), 0.06, 0.42, 0.55);
    lamp.add(shade);
    const bulb = K.mesh(new T.SphereGeometry(0.045, 10, 8), ink(P.GLOW_CORE, { flat: true, lit: true, emissive: A4.mixc(P.GLOW_CORE, P.NIGHT, 0.4) }), 0.06, 0.36, 0.55);
    lamp.add(bulb);
    const cv = document.createElement('canvas');
    cv.width = 4; cv.height = 128;
    const cc = cv.getContext('2d');
    const grd = cc.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, X.css(P.GLOW_CORE, 0.9));
    grd.addColorStop(0.6, X.css(P.GLOW_CORE, 0.25));
    grd.addColorStop(1, X.css(P.GLOW_CORE, 0));
    cc.fillStyle = grd;
    cc.fillRect(0, 0, 4, 128);
    const cone = new T.Mesh(new T.ConeGeometry(0.55, 0.42, 20, 1, true), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true, opacity: 0.22, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
    cone.position.set(0.06, 0.15, 0.55);
    cone.layers.set(1);
    lamp.add(cone);
    const pool = K.glow(P.GLOW_CORE, 1.6);
    pool.position.set(0.06, 0.05, 0.55);
    pool.material.opacity = 0.3;
    lamp.add(pool);
    desk.add(lamp);
    const nb = K.decal(0.6, 0.42, A4.notebook());
    nb.rotation.x = -PI / 2;
    nb.rotation.z = 0.25;
    nb.position.set(dcx + 0.02, DESK.y + 0.03, DESK.z0 + 0.95);
    desk.add(nb);
    desk.add(K.cyl(0.06, 0.055, 0.12, P.WHEEL_RED, 0.62, DESK.y + 0.085, DESK.z1 - 0.2, 12));
    L.desk = { root: desk, lamp, bulb, cone, pool, notebook: nb, on: true };

    // ---------------------------------------------------- walk grid
    Object.values(PODS).forEach(c => G.blockCircle(c.x, c.z, 0.98 * c.k));
    G.blockRect(CONSOLE.x0, CONSOLE.z0, CONSOLE.x1, CONSOLE.z1);
    G.blockRect(TANK.x0, TANK.z0, TANK.x1, TANK.z1);
    G.blockRect(TANK.x1, INLET.z - 0.1, TRENCH[0][0] + 0.05, INLET.z + 0.1, 0.12);
    G.blockRect(DRAIN.x - 0.08, TANK.z1, DRAIN.x + 0.08, DRAIN.z + 0.06, 0.12);
    G.blockRect(STILL.x0, STILL.z0, STILL.x1, STILL.z1);
    G.blockRect(DESK.x0, DESK.z0, DESK.x1, DESK.z1);

    world.rig.bounds = [2.2, 11.5, 3.2, 7.4];
    world.rig.zoomMin = 6;
    world.rig.zoomMax = 18;
    return L;
  }

  CL.Ch4 = {
    build, PODS, TANK, WATER, CONSOLE, TUBES, FADER, BELL, SHELF, KEY0, KEY_FLOOR, SPOUT, DRAIN, INLET, TRENCH, FLOW,
    HATCH, DIAL, STAND, PORT, STILL, VALVES_X, VALVE, STILL_TUBE, CRATE0, DESK, RX, PLINTH_Y,
  };
})(window.CL = window.CL || {});
