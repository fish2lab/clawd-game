/* Epilogue room: the prologue's lab one second after the breakout (03:21).

   Same room as the prologue (CL.Level0.build), set to how the short left it: the
   porthole glass gone, three bolts and the sign knocked off, glass all over the
   plinth, a pool of murk where Fable landed, the pods open and empty, the steam
   station as the prologue was solved (main open, only Sonnet's branch).

   New in the room:
     - a roof hatch above the cryo bay (6 x 3.6, big enough for Fable), hinged at its
       back edge, held by two roof beams. A gearbox on its front edge hangs a rod
       down to a crank wheel at 6.1 high: only the four-high stack on Fable reaches it.
     - the tap-code chart taped to the reactor's right flank (from chapter 2).
     - the PLEASE DO NOT TAP THE GLASS sign, fallen and leaning on the plinth; the
       tap code is scratched on its back.
     - two chalk tally strips on the floor in front of Fable: Haiku's knocks (white)
       and Fable's answer (amber). */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const TX = CL.Tex;
  const PI = Math.PI;
  const E = CL.Epi = CL.Epi || {};
  const { RD, WALL_H, RX } = CL.Room;

  const P0 = { x: 10.9, z: 6.15 };                      // where Fable landed
  const ROOF = WALL_H + 0.14;                           // top of the wall caps
  const SKY = { x: 5.0, z: 6.0, w: 6.0, d: 3.6 };       // the hatch opening
  const CRANK = { x: 5.0, y: 6.1, z: 8.0 };             // the crank wheel under the gearbox
  const REGION = [4.5, 11.0, 6.0, 8.0];                 // where Fable's centre can go (x0, x1, z0, z1)
  const TALLY = { x: 8.5, zH: 8.95, zF: 8.4 };          // the chalk strips: Haiku's row, Fable's row
  const SIGN = { x: 14.4, z: 4.4 };                     // foot of the plinth where the sign leans

  function emissive(hex, k) { return '#' + new T.Color(hex).multiplyScalar(k).getHexString(); }

  function build(world) {
    const scene = world.scene;
    const L = CL.Level0.build(world);
    const R = L.reactor;
    const G = L.grid;
    L.clock.set(3, 21);

    // ---------------------------------------------------- the night as the prologue left it
    Object.values(L.pods).forEach(pd => { pd.hinge.rotation.y = -2.0; pd.frost.clear(); });
    L.looseWheel.removeFromParent();                    // it is on Haiku's pod now
    L.valves.A.open = true; L.valves.B.open = false; L.valves.C.open = false;
    Object.values(L.valves).forEach(v => { v.lever.rotation.x = v.open ? 0 : PI / 2; });
    L.main.open = true;
    L.main.stem.scale.y = 0.5;
    L.crate.position.set(1.3, 0.45, 6.0);               // where Opus pushed it, by the locker
    G.blockRect(0.85, 5.55, 1.75, 6.45);

    // the porthole is empty: no glass, no face behind it
    R.glass.visible = false;
    R.face.visible = false;
    R.eyes.forEach(e => { e.visible = false; });
    R.sign.visible = false;
    // three bolts on the floor
    L.bolts = [[5, 7.55, 0.06, 4.75], [11, 12.9, 0.62, 4.05], [13, 9.3, 0.06, 9.35]].map(([i, x, y, z]) => {
      const b = R.bolts[i];
      b.removeFromParent();
      b.position.set(x, y, z);
      b.rotation.set(0, 0, 0);
      scene.add(b);
      return b;
    });
    // murk running out of the porthole, down the reactor and over the plinth
    const murk = K.m(P.MURK_LIGHT, { flat: true });
    [[-1.3, 0.5], [-0.4, 0.9], [0.6, 0.65], [1.5, 0.35]].forEach(([dx, w]) => {
      const top = R.PC.y - Math.sqrt(4 - dx * dx) + 0.05;
      const m = new T.Mesh(new T.BoxGeometry(w * 0.4, top - 0.56, 0.02), murk);
      m.position.set(RX + dx, 0.56 + (top - 0.56) / 2, 3.415);
      scene.add(m);
    });
    const ptop = K.box(4.6, 0.012, 0.95, P.MURK_LIGHT, RX, 0.566, 3.9, { flat: true, opacity: 0.92 });
    scene.add(ptop);

    // ---------------------------------------------------- the pool where Fable landed
    const shape = new T.Shape();
    for (let i = 0; i <= 48; i++) {
      const a = i / 48 * PI * 2;
      const r = 3.25 + 0.22 * Math.sin(a * 3 + 0.7) + 0.12 * Math.sin(a * 7 + 2.1);
      const x = Math.cos(a) * r * 1.12, y = Math.sin(a) * r * 0.86;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    const pool = new T.Mesh(new T.ShapeGeometry(shape), CL.Ink.ink(P.MURK_LIGHT, { flat: true, opacity: 0.88, depthWrite: false }));
    pool.rotation.x = -PI / 2;
    pool.position.set(P0.x, 0.004, P0.z + 0.6);
    pool.renderOrder = 1;
    scene.add(pool);
    L.pool = pool;

    // ---------------------------------------------------- glass everywhere
    const rnd = CL.gfx.rng(21);
    const shardMats = [P.FROST, P.GLASS, P.GLASS_DEEP].map(c => CL.Ink.ink(c, { flat: true, side: T.DoubleSide }));
    for (let i = 0; i < 46; i++) {
      const s = 0.07 + rnd() * 0.2;
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute([-s, -s * 0.3, 0, s * 0.8, -s * 0.5, 0, s * 0.2, s * 0.7, 0], 3));
      g.computeVertexNormals();
      const m = new T.Mesh(g, shardMats[i % 3]);
      let x, z, y;
      if (i < 12) { x = RX - 3.8 + rnd() * 7.6; z = 3.5 + rnd() * 0.85; y = 0.572; }
      else { const a = rnd() * PI * 2, r = 1.0 + rnd() * 4.2; x = P0.x + Math.cos(a) * r * 1.15; z = P0.z + 0.4 + Math.sin(a) * r * 0.75; y = 0.012; }
      if (z > RD - 0.5 || x > 15.5 || (x > 14.3 && z > 7.3)) continue;
      m.position.set(x, y + rnd() * 0.004, z);
      m.rotation.set(-PI / 2 + (rnd() - 0.5) * 0.2, 0, rnd() * PI * 2);
      scene.add(m);
    }

    // ---------------------------------------------------- the tap-code chart on the reactor's flank
    const chart = K.decal(1.8, 1.8, E.Art.tapChart(), { useAlpha: true });
    chart.position.set(RX + 3.3 + 0.012, 2.45, 1.25);
    chart.rotation.y = PI / 2;
    scene.add(chart);
    L.chart = chart;

    // ---------------------------------------------------- the sign, fallen against the plinth
    // a board leaning from the floor onto the plinth's top edge; front (the warning) up.
    // flip: the group turns about the board's long axis to show the back (the scratched code).
    const sign = new T.Group();
    const lean = Math.asin(0.56 / 1.24);
    sign.position.set(SIGN.x, 0.56 / 2, SIGN.z + Math.cos(lean) * 1.24 / 2);
    sign.rotation.x = -(PI / 2 - lean);
    const flip = new T.Group();
    sign.add(flip);
    const board = K.box(0.66, 1.24, 0.03, P.NAVY_DARK, 0, 0, 0);
    const front = K.decal(0.66, 1.24, TX.sign());
    front.position.z = 0.017;
    const back = K.decal(0.66, 1.24, TX.sign(null, true));
    back.position.z = -0.017;
    back.rotation.y = PI;
    flip.add(board, front, back);
    scene.add(sign);
    L.sign = { root: sign, flip };
    G.blockRect(SIGN.x - 0.36, SIGN.z, SIGN.x + 0.36, SIGN.z + 1.1, 0.15);

    // ---------------------------------------------------- the roof hatch
    const roof = new T.Group();
    scene.add(roof);
    // two beams across the room, resting on the back and front walls
    [SKY.x - SKY.w / 2 - 0.37, SKY.x + SKY.w / 2 + 0.37].forEach(x => {
      roof.add(K.box(0.24, 0.34, RD + 0.6, P.NAVY, x, ROOF + 0.17, RD / 2));
      roof.add(K.box(0.36, 0.05, RD + 0.6, P.NAVY_DARK, x, ROOF + 0.025, RD / 2));
    });
    // the fixed frame round the opening
    const fy = ROOF + 0.11, bw = 0.25;
    const z0 = SKY.z - SKY.d / 2, z1 = SKY.z + SKY.d / 2, x0 = SKY.x - SKY.w / 2, x1 = SKY.x + SKY.w / 2;
    roof.add(K.box(SKY.w + 2 * bw, 0.22, bw, P.NAVY, SKY.x, fy, z0 - bw / 2));
    roof.add(K.box(SKY.w + 2 * bw, 0.22, bw, P.NAVY, SKY.x, fy, z1 + bw / 2));
    roof.add(K.box(bw, 0.22, SKY.d, P.NAVY, x0 - bw / 2, fy, SKY.z));
    roof.add(K.box(bw, 0.22, SKY.d, P.NAVY, x1 + bw / 2, fy, SKY.z));
    // the leaf: hinged on its back edge, a navy frame with six panes of glass
    const leaf = new T.Group();
    leaf.position.set(SKY.x, ROOF + 0.27, z0 - bw);
    roof.add(leaf);
    const lw = SKY.w + 2 * bw, ld = SKY.d + 2 * bw;
    const lbar = (w, d, x, z) => leaf.add(K.box(w, 0.1, d, P.NAVY, x, 0, z));
    lbar(lw, 0.16, 0, 0.08); lbar(lw, 0.16, 0, ld - 0.08);
    lbar(0.16, ld, -lw / 2 + 0.08, ld / 2); lbar(0.16, ld, lw / 2 - 0.08, ld / 2);
    lbar(0.08, ld, -lw / 6, ld / 2); lbar(0.08, ld, lw / 6, ld / 2); lbar(lw, 0.08, 0, ld / 2);
    const paneMat = CL.Ink.ink(P.GLASS_DEEP, { opacity: 0.3, flat: true, depthWrite: false, lit: true, side: T.DoubleSide });
    const pane = new T.Mesh(new T.PlaneGeometry(lw - 0.2, ld - 0.2), paneMat);
    pane.rotation.x = -PI / 2;
    pane.position.set(0, 0.0, ld / 2);
    pane.layers.set(1);
    leaf.add(pane);
    // a pair of hinges and a handle on the front edge
    [-lw / 3, lw / 3].forEach(x => leaf.add(K.cyl(0.07, 0.07, 0.4, P.NAVY_DARK, x, 0.02, 0, 10).rotateZ(PI / 2)));
    leaf.add(K.box(0.5, 0.06, 0.08, P.BRASS, 0, 0.08, ld - 0.04));
    // three brass dogs on the front edge, pushed out over the frame while it is shut
    const dogs = [-lw / 3, 0.3, lw / 3].map(x => {
      const d = K.box(0.16, 0.07, 0.24, P.BRASS, x, -0.06, ld + 0.06);
      leaf.add(d);
      return d;
    });
    // gearbox on the front of the frame, the rod, and the crank wheel at the bottom
    const gear = new T.Group();
    gear.add(K.box(0.42, 0.34, 0.34, P.NAVY_DARK, CRANK.x, ROOF - 0.12, CRANK.z));
    gear.add(K.cyl(0.13, 0.13, 0.36, P.BRASS, CRANK.x + 0.22, ROOF - 0.12, CRANK.z, 12).rotateZ(PI / 2));
    // the rod down to the crank (clicking any of it works the crank)
    const rod = new T.Group();
    rod.add(K.cyl(0.05, 0.05, ROOF - 0.3 - CRANK.y, P.NAVY_LIGHT, CRANK.x, (ROOF - 0.3 + CRANK.y) / 2, CRANK.z, 8));
    rod.add(K.cyl(0.09, 0.09, 0.16, P.NAVY_DARK, CRANK.x, CRANK.y + 0.12, CRANK.z, 10));
    roof.add(rod);
    // the shaft from the gearbox along the frame to the hinge
    gear.add(K.cyl(0.03, 0.03, x1 + 0.1 - CRANK.x, P.NAVY_LIGHT, (CRANK.x + x1 + 0.1) / 2, ROOF - 0.04, CRANK.z, 6).rotateZ(PI / 2));
    gear.add(K.cyl(0.03, 0.03, CRANK.z - z0 + bw, P.NAVY_LIGHT, x1 + 0.1, ROOF - 0.04, (CRANK.z + z0 - bw) / 2, 6).rotateX(PI / 2));
    gear.add(K.cyl(0.11, 0.11, 0.1, P.BRASS, x1 + 0.1, ROOF - 0.04, z0 - bw, 12).rotateX(PI / 2));
    roof.add(gear);
    // safety yellow, so it is never taken for one of the red steam valves behind it
    const crank = K.wheel(0.42, P.SAFETY);
    crank.rotation.x = -PI / 2;
    crank.position.set(CRANK.x, CRANK.y, CRANK.z);
    crank.add(K.cyl(0.05, 0.05, 0.28, P.HAZARD_DARK, 0.34, 0, -0.14, 8).rotateX(PI / 2));
    roof.add(crank);
    // dawn, for later: a shaft of light through the opening and a patch of it on the floor
    const shaftMat = new T.MeshBasicMaterial({ color: new T.Color(P.DAWN_HI), map: E.Art.ramp(), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
    const shaft = new T.Mesh(new T.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1, true), shaftMat);
    shaft.rotation.y = PI / 4;
    const shaftG = new T.Group();
    shaftG.add(shaft);
    shaftG.scale.set(SKY.w, ROOF, SKY.d);
    shaftG.position.set(SKY.x, ROOF / 2, SKY.z);
    shaft.layers.set(1);
    scene.add(shaftG);
    const patch = new T.Mesh(new T.PlaneGeometry(SKY.w, SKY.d), new T.MeshBasicMaterial({ color: new T.Color(P.DAWN_HI), transparent: true, opacity: 0, depthWrite: false }));
    patch.rotation.x = -PI / 2;
    patch.position.set(SKY.x, 0.01, SKY.z);
    patch.layers.set(1);
    scene.add(patch);
    // the crank's shadow, on whatever is under it (the floor, or Fable's back)
    const mark = K.blob(0.34);
    mark.position.set(CRANK.x, 0.013, CRANK.z);
    scene.add(mark);
    L.hatch = { roof, leaf, pane, paneMat, dogs, crank, rod, gear, shaft, patch, mark };

    // ---------------------------------------------------- the chalk tally strips
    const strip = (tl, z, opt) => {
      const m = K.decal(tl.w, tl.h, tl.tex, Object.assign({ useAlpha: true, depthWrite: false }, opt));
      m.rotation.x = -PI / 2;
      m.position.set(TALLY.x, 0.007, z);
      m.renderOrder = 2;
      scene.add(m);
      return m;
    };
    const tH = E.Art.tally(P.PAPER), tF = E.Art.tally(P.GLOW);
    L.tally = {
      haiku: tH, fable: tF,
      meshH: strip(tH, TALLY.zH, {}),
      meshF: strip(tF, TALLY.zF, { lit: true, emissive: emissive(P.GLOW, 0.35) }),
    };

    return L;
  }

  E.Level = { build, P0, ROOF, SKY, CRANK, REGION, TALLY, SIGN };
})(window.CL = window.CL || {});
