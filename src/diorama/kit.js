/* 3-D models for the diorama. Same proportions as the short:
   Clawd body 1 : 0.667 (depth 0.62), legs 0.167, eye slits 0.083 x 0.167;
   pods scale with their occupant (1.0 : 0.78 : 0.56); porthole radius 2.
   y is up, the front of everything faces +z. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const { ink } = CL.Ink;
  const TX = CL.Tex;

  const mats = {};
  function m(color, opt) {
    if (opt) return ink(color, opt);
    return mats[color] || (mats[color] = ink(color));
  }

  function mesh(geo, mat, x, y, z) {
    const o = new T.Mesh(geo, mat);
    o.position.set(x || 0, y || 0, z || 0);
    return o;
  }
  const box = (w, h, d, color, x, y, z, opt) => mesh(new T.BoxGeometry(w, h, d), m(color, opt), x, y, z);
  const cyl = (r0, r1, h, color, x, y, z, seg, opt) => mesh(new T.CylinderGeometry(r0, r1, h, seg || 24), m(color, opt), x, y, z);

  function roundRectShape(x0, y0, x1, y1, r) {
    const s = new T.Shape();
    s.moveTo(x0 + r, y0);
    s.lineTo(x1 - r, y0);
    s.quadraticCurveTo(x1, y0, x1, y0 + r);
    s.lineTo(x1, y1 - r);
    s.quadraticCurveTo(x1, y1, x1 - r, y1);
    s.lineTo(x0 + r, y1);
    s.quadraticCurveTo(x0, y1, x0, y1 - r);
    s.lineTo(x0, y0 + r);
    s.quadraticCurveTo(x0, y0, x0 + r, y0);
    return s;
  }

  function extrude(shape, depth, color, opt) {
    return new T.Mesh(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }), m(color, opt));
  }

  // a plane with a texture, facing +z
  function decal(w, h, texture, opt) {
    return new T.Mesh(new T.PlaneGeometry(w, h), ink('#FFFFFF', Object.assign({ map: texture, flat: true }, opt || {})));
  }

  // ------------------------------------------------------------ Clawd

  // returns { root, body, eyes, arms, legs, setPose(p) }; root sits on the floor at the feet
  function clawd(st) {
    const W = st.W, H = 0.6667 * W, D = 0.62 * W, LEG = 0.1667 * W;
    const root = new T.Group();
    const rig = new T.Group();   // bob / tilt / squash happen here
    root.add(rig);
    const faces = TX.clawdFaces(st);
    const top = m(P.ORANGE), bottom = m(P.ORANGE_DARK);
    const fm = k => ink('#FFFFFF', { map: faces[k], hatch: 0.12, shadeMin: 0.86 });
    const body = new T.Mesh(new T.BoxGeometry(W, H, D), [fm('side_l'), fm('side_r'), top, bottom, fm('front'), fm('back')]);
    body.position.y = LEG + H / 2;
    rig.add(body);
    // coat / hoodie / blazer hem hanging below the body
    const hemCol = { labcoat: P.COAT, hoodie: P.HOODIE_DARK, uniform: P.BLAZER }[st.outfit];
    if (hemCol) rig.add(box(W + 0.06 * W, 0.08 * W, D + 0.06 * W, hemCol, 0, LEG + 0.045 * W, 0));
    const eyes = [-1, 1].map(s => {
      const e = box(0.0833 * W, 0.1667 * W, 0.01, P.INK, s * (0.5 - 0.2083) * W, LEG + 0.4167 * W, D / 2 + 0.006, { flat: true });
      rig.add(e);
      return e;
    });
    // the short's four legs, as seen from the front, in a front row and a back row: a crab's
    // eight. Flush with the faces, so the camera looking down still sees them from any side.
    const LD = 0.11 * W;
    const legs = [];
    [1, -1].forEach(row => CL.Clawd.LEGS.forEach((lx, i) => {
      const g = new T.Group();
      g.position.set(lx * W, LEG + 0.02 * W, row * (D / 2 - LD / 2 - 0.01 * W));
      g.userData.z0 = g.position.z;
      g.userData.ph = (i % 2) ^ (row < 0 ? 1 : 0) ? Math.PI : 0;
      g.add(box(0.0833 * W, LEG + 0.04 * W, LD, P.ORANGE_DARK, 0, -(LEG + 0.04 * W) / 2, 0));
      root.add(g);
      legs.push(g);
    }));
    const a = 0.1667 * W;
    const sleeve = { labcoat: P.COAT, hoodie: P.HOODIE, uniform: P.BLAZER }[st.outfit];
    const arms = [-1, 1].map(s => {
      const g = new T.Group();
      g.position.set(s * (W / 2 - 0.01 * W), LEG + 0.25 * W, 0);
      g.add(box(a, a, a * 0.85, P.ORANGE, s * a / 2, 0, 0));
      if (sleeve) g.add(box(a * 0.62, a * 1.12, a * 0.95, sleeve, s * a * 0.3, 0, 0));
      rig.add(g);
      return g;
    });
    if (st.outfit === 'labcoat') {
      [-1, 1].forEach(s => {
        const lens = cyl(0.098 * W, 0.098 * W, 0.06 * W, P.BRASS, s * (0.29 - 0.5) * W * -1, LEG + H - 0.03 * W, D / 2 + 0.03 * W, 16);
        lens.rotation.x = Math.PI / 2;
        rig.add(lens);
        const glass = cyl(0.066 * W, 0.066 * W, 0.065 * W, P.GLASS_DEEP, lens.position.x, lens.position.y, lens.position.z + 0.003, 16);
        glass.rotation.x = Math.PI / 2;
        rig.add(glass);
      });
    }
    if (st.outfit === 'uniform') {
      const bp = box(0.74 * W, 0.47 * W, 0.2 * W, P.BACKPACK, 0, LEG + 0.2 * W, -D / 2 - 0.1 * W);
      rig.add(bp);
      rig.add(box(0.54 * W, 0.19 * W, 0.06 * W, P.BACKPACK_DARK, 0, LEG + 0.08 * W, -D / 2 - 0.21 * W));
    }
    let prop = null;
    if (st.prop === 'clipboard') {
      prop = new T.Group();
      const cb = box(0.36 * W, 0.46 * W, 0.03 * W, '#A8734A', 0, 0, 0);
      const paper = decal(0.3 * W, 0.36 * W, clipTex(), {});
      paper.position.set(0, -0.02 * W, 0.017 * W);
      prop.add(cb, paper);
      prop.add(box(0.16 * W, 0.06 * W, 0.04 * W, '#C9CDD3', 0, 0.21 * W, 0.01 * W));
      prop.position.set(-(W / 2 + a * 0.55), LEG + 0.27 * W, D / 2 + 0.05 * W);
      prop.rotation.z = 0.07;
      rig.add(prop);
    } else if (st.prop === 'laptop') {
      prop = box(0.48 * W, 0.04 * W, 0.34 * W, '#B9BEC6', -(W / 2 + 0.04 * W), LEG + 0.18 * W, 0.04 * W);
      prop.rotation.z = -0.12;
      rig.add(prop);
    }

    const pose = { walk: 0, amp: 0, armL: 0, armR: 0, eye: 1, look: [0, 0], tilt: 0, sq: 1, lift: 0, bob: 0 };
    function setPose(p) {
      Object.assign(pose, p);
      const bob = Math.abs(Math.sin(pose.walk)) * 0.035 * W * pose.amp;
      rig.position.y = bob + pose.lift;
      rig.rotation.z = -pose.tilt * Math.PI / 180;
      rig.scale.set(pose.sq, 1 / pose.sq, pose.sq);
      legs.forEach(g => {
        const ph = pose.walk + g.userData.ph;
        g.position.y = LEG + 0.02 * W + Math.max(0, Math.sin(ph)) * 0.08 * W * pose.amp + pose.lift;
        g.position.z = g.userData.z0 + Math.cos(ph) * 0.04 * W * pose.amp;
      });
      [pose.armL, pose.armR].forEach((r, i) => {
        const s = i === 0 ? -1 : 1;
        const g = arms[i];
        g.position.y = LEG + 0.25 * W + r * 0.24 * W;
        g.rotation.z = s * r * 0.66;
      });
      eyes.forEach(e => {
        e.scale.y = Math.max(0.09, Math.min(1.2, pose.eye));
        e.position.x = Math.sign(e.position.x) * (0.5 - 0.2083) * W + 0.035 * W * pose.look[0];
        e.position.y = LEG + 0.4167 * W + 0.03 * W * pose.look[1];
      });
    }
    setPose({});
    return { root, rig, body, eyes, arms, legs, prop, setPose, pose, W, H, D, LEG, height: LEG + H };
  }

  let _clip = null;
  function clipTex() {
    if (_clip) return _clip;
    _clip = TX.tex(TX.paint(0.3, 0.36, 900, g => {
      g.fill(X.rect(0, 0, 0.3, 0.36), P.PAPER);
      g.text('TO-DO', 0.15, 0.3, 0.045, P.INK, 'hand');
      ['Exit pod', 'Wake Sonnet 5.5', 'Wake Haiku 5.5', 'Check on Fable 5.5'].forEach((t, i) => {
        const y = 0.24 - i * 0.055;
        g.stroke(X.rect(0.02, y - 0.004, 0.044, y + 0.02), 0.6);
        g.text(t, 0.055, y, 0.03, P.INK, 'hand', 'left');
      });
    }, { line: 1.6 }));
    return _clip;
  }
  const X = CL.gfx;

  // ------------------------------------------------------------ wheel / valve

  function wheel(r, color) {
    const g = new T.Group();
    const rim = new T.Mesh(new T.TorusGeometry(r * 0.87, r * 0.13, 8, 28), m(color || P.WHEEL_RED));
    g.add(rim);
    for (let i = 0; i < 3; i++) {
      const s = box(r * 1.74, r * 0.14, r * 0.12, color || P.WHEEL_RED, 0, 0, 0);
      s.rotation.z = i * Math.PI / 3;
      g.add(s);
    }
    const hub = cyl(r * 0.24, r * 0.24, r * 0.3, P.WHEEL_RED_DARK, 0, 0, 0, 12);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const k = cyl(r * 0.12, r * 0.12, r * 0.26, P.WHEEL_RED_DARK, Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92, 0, 8);
      k.rotation.x = Math.PI / 2;
      g.add(k);
    }
    return g;
  }

  function gauge(r, label) {
    const g = new T.Group();
    const body = cyl(r, r, r * 0.35, P.BRASS, 0, 0, 0, 24);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const face = decal(r * 2, r * 2, TX.gaugeFace(label), { useAlpha: true });
    face.position.z = r * 0.18;
    g.add(face);
    const needle = new T.Group();
    needle.position.z = r * 0.2;
    needle.add(box(r * 0.07, r * 0.66, r * 0.03, P.TIE_RED, 0, r * 0.33, 0, { flat: true }));
    g.add(needle);
    g.userData.set = v => { needle.rotation.z = (135 - 270 * Math.max(0, Math.min(1.02, v))) * Math.PI / 180 - Math.PI / 2; };
    g.userData.set(0.2);
    return g;
  }

  // ------------------------------------------------------------ pod

  // returns { root, door, wheel, wheelMount, frost, glass, gauge, riserValve, k, interior, seat }
  function pod(k, label, seed) {
    const root = new T.Group();
    const r = 0.82 * k;
    // pedestal
    const ped = cyl(0.98 * k, 0.98 * k, 0.32 * k, P.POD, 0, 0.16 * k, 0, 40);
    root.add(ped);
    root.add(cyl(0.99 * k, 0.99 * k, 0.05 * k, P.NAVY, 0, 0.295 * k, 0, 40));
    const pl = decal(1.32 * k, 0.18 * k, TX.plate(label, 1.32, 0.18));
    pl.position.set(0, 0.14 * k, 0.985 * k);
    root.add(pl);
    // body with an opening in front for the door
    const open = Math.asin(0.6 / 0.82);
    const bodyG = new T.CylinderGeometry(r, r, 1.75 * k, 48, 1, true, open, Math.PI * 2 - 2 * open);
    const bodyM = mesh(bodyG, m(P.POD, { side: T.DoubleSide }), 0, 0.3 * k + 0.875 * k, 0);
    root.add(bodyM);
    const inner = mesh(new T.CylinderGeometry(r * 0.97, r * 0.97, 1.6 * k, 32, 1, true), m(P.POD_INSIDE, { side: T.BackSide, hatch: 0, flat: true, lit: true, emissive: '#0E1430' }), 0, 0.42 * k + 0.8 * k, 0);
    root.add(inner);
    const floorGlow = mesh(new T.CircleGeometry(r * 0.95, 32), m(P.POD_INSIDE_GLOW, { flat: true, lit: true, emissive: '#1A2A40' }), 0, 0.425 * k, 0);
    floorGlow.rotation.x = -Math.PI / 2;
    root.add(floorGlow);
    // frame strips at the opening
    [-1, 1].forEach(s => root.add(box(0.07 * k, 1.5 * k, 0.12 * k, P.NAVY_DARK, s * 0.6 * k, 1.17 * k, Math.cos(open) * r)));
    // bands
    const bandTex = TX.rivetBand();
    [[0.36, 0.12], [2.0, 0.12]].forEach(([y, h]) => {
      const t = bandTex.clone();
      t.needsUpdate = true;
      t.wrapS = T.RepeatWrapping;
      t.repeat.set(Math.round(2 * Math.PI * r / 0.6), 1);
      root.add(mesh(new T.CylinderGeometry(r * 1.02, r * 1.02, h * k, 48, 1, true), ink('#FFFFFF', { map: t, flat: false }), 0, y * k, 0));
    });
    // dome + cap + riser
    const dome = mesh(new T.SphereGeometry(r, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), m(P.POD), 0, 2.05 * k, 0);
    dome.scale.y = 0.9;
    root.add(dome);
    root.add(cyl(0.12 * k, 0.12 * k, 0.18 * k, P.NAVY, 0, 2.05 * k + r * 0.9, 0, 12));
    const gg = gauge(0.15 * k);
    gg.position.set(0.48 * k, 2.3 * k, 0.6 * k);
    gg.rotation.y = 0.65;
    gg.rotation.x = -0.35;
    root.add(gg);
    // door, hinged on its right edge (+x)
    const hinge = new T.Group();
    hinge.position.set(0.56 * k, 0, Math.cos(open) * r + 0.02 * k);
    root.add(hinge);
    const door = new T.Group();
    door.position.x = -0.56 * k;
    hinge.add(door);
    const frame = roundRectShape(-0.56 * k, 0.46 * k, 0.56 * k, 1.88 * k, 0.16 * k);
    frame.holes.push(roundRectShape(-0.45 * k, 0.95 * k, 0.45 * k, 1.78 * k, 0.12 * k));
    const fr = extrude(frame, 0.06 * k, P.NAVY);
    door.add(fr);
    const panel = box(0.9 * k, 0.32 * k, 0.02 * k, P.POD, 0, 0.72 * k, 0.07 * k);
    door.add(panel);
    [0.62, 1.68].forEach(y => door.add(box(0.08 * k, 0.18 * k, 0.08 * k, P.NAVY_DARK, 0.58 * k, y * k, 0.03 * k)));
    door.add(box(0.1 * k, 0.27 * k, 0.06 * k, P.BRASS, -0.56 * k, 1.28 * k, 0.05 * k));
    const glass = decal(0.9 * k, 0.83 * k, null, { opacity: 0.18, flat: true });
    glass.material.uniforms.uColor.value.set(P.GLASS);
    glass.position.set(0, 1.365 * k, 0.03 * k);
    door.add(glass);
    const fr2 = TX.frost(seed);
    const frostM = decal(0.9 * k, 0.83 * k, fr2.tex, { useAlpha: true, depthWrite: false });
    frostM.position.set(0, 1.365 * k, 0.035 * k);
    frostM.renderOrder = 2;
    door.add(frostM);
    const wheelMount = new T.Group();
    wheelMount.position.set(0, 0.72 * k, 0.1 * k);
    door.add(wheelMount);
    const wh = wheel(0.15 * k);
    wheelMount.add(wh);
    return { root, hinge, door, wheel: wh, wheelMount, frost: fr2, frostMesh: frostM, glass, gauge: gg, k, seatY: 0.42 * k, frontZ: Math.cos(open) * r };
  }

  // ------------------------------------------------------------ reactor

  // origin at the floor, back against z = 0; front face at z = 3.4
  function reactor() {
    const root = new T.Group();
    const Wd = 6.6, Dp = 3.4;
    const bodyM = m(P.REACTOR);
    const hidden = new T.MeshBasicMaterial({ visible: false });
    root.add(mesh(new T.BoxGeometry(Wd, 7.3, Dp), [bodyM, bodyM, bodyM, bodyM, hidden, bodyM], 0, 4.15, Dp / 2));
    const plateS = new T.Shape();
    plateS.moveTo(-Wd / 2, 0.5); plateS.lineTo(Wd / 2, 0.5); plateS.lineTo(Wd / 2, 7.8); plateS.lineTo(-Wd / 2, 7.8); plateS.closePath();
    const ph = new T.Path();
    ph.absarc(0, 3.35, 2.02, 0, Math.PI * 2, true);
    plateS.holes.push(ph);
    root.add(mesh(new T.ShapeGeometry(plateS, 24), m(P.REACTOR), 0, 0, Dp));
    [[0.7, 0.4], [6.285, 0.27]].forEach(([y, h]) => root.add(box(Wd + 0.12, h, Dp + 0.12, P.NAVY, 0, y, Dp / 2)));
    // arched top: half a cylinder lying along z, squashed to 0.52 of its radius
    const dome = mesh(new T.CylinderGeometry(3.45, 3.45, Dp + 0.1, 40, 1, false, -Math.PI / 2, Math.PI), m(P.REACTOR), 0, 7.95, Dp / 2);
    dome.rotation.x = -Math.PI / 2;
    dome.scale.z = 0.52;
    root.add(dome);
    root.add(box(Wd + 0.4, 0.35, Dp + 0.2, P.NAVY, 0, 7.925, Dp / 2));
    // drive on top
    root.add(box(0.5, 0.7, 0.5, P.NAVY_DARK, 0, 9.4, Dp / 2));
    root.add(box(1.6, 0.9, 1.2, P.NAVY, 0, 9.9, Dp / 2));
    root.add(cyl(0.55, 0.55, 1.15, P.REACTOR, 0, 10.92, Dp / 2, 24));
    const beacon = cyl(0.09, 0.09, 0.26, '#7A3A3A', 0.6, 10.5, Dp / 2 + 0.6, 12);
    root.add(beacon);
    // nameplate + gauges
    const np = decal(2.9, 0.83, TX.plate('FABLE 5.5', 2.9, 0.83));
    np.position.set(0, 7.03, Dp + 0.01);
    root.add(np);
    const gauges = [-2.3, 2.3].map(x => {
      const g = gauge(0.36);
      g.position.set(x, 7.0, Dp + 0.06);
      root.add(g);
      return g;
    });
    // porthole: ring, bolts, glass, a cavity behind it with Fable inside
    const PC = new T.Vector3(0, 3.35, Dp);
    const ringS = new T.Shape();
    ringS.absarc(0, 0, 2.55, 0, Math.PI * 2, false);
    const hole = new T.Path();
    hole.absarc(0, 0, 2.0, 0, Math.PI * 2, true);
    ringS.holes.push(hole);
    const ring = extrude(ringS, 0.3, P.NAVY);
    ring.position.set(0, PC.y, Dp - 0.05);
    root.add(ring);
    const bolts = [];
    for (let i = 0; i < 16; i++) {
      const a = Math.PI / 2 + i * Math.PI / 8;
      const b = cyl(0.09, 0.09, 0.12, P.NAVY_DARK, Math.cos(a) * 2.27, PC.y + Math.sin(a) * 2.27, Dp + 0.3, 10);
      b.rotation.x = Math.PI / 2;
      root.add(b);
      bolts.push(b);
    }
    const cavity = mesh(new T.CylinderGeometry(2.0, 2.0, 0.9, 40, 1, true), m(P.MURK, { side: T.BackSide, flat: true, hatch: 0 }), 0, PC.y, Dp - 0.45);
    cavity.rotation.x = Math.PI / 2;
    root.add(cavity);
    const back = decal(4.0, 4.0, TX.murk(), { useAlpha: true });
    back.position.set(0, PC.y, Dp - 0.88);
    root.add(back);
    const face = decal(4.8, 3.2, TX.fableFace());
    face.position.set(0, PC.y - 0.28 - 0.25 * 4.8 + 3.2 / 2, Dp - 0.6);
    root.add(face);
    const eyeY = PC.y - 0.28;
    const eyes = [-1, 1].map(s => {
      const e = box(0.4, 0.8, 0.02, P.INK, s * 0.24 * 4.8, eyeY, Dp - 0.58, { flat: true });
      root.add(e);
      return e;
    });
    const glass = mesh(new T.CircleGeometry(2.0, 48), ink(P.GLASS, { opacity: 0.16, flat: true, depthWrite: false }), 0, PC.y, Dp + 0.05);
    root.add(glass);
    // sign, ladder, plinth
    const sign = decal(0.66, 1.24, TX.sign());
    sign.position.set(2.88, 2.7, Dp + 0.02);
    root.add(sign);
    const lx = Wd / 2 + 0.2;
    [Dp - 1.03, Dp - 0.57].forEach(z => root.add(box(0.06, 7.9, 0.06, P.NAVY, lx, 4.45, z)));
    for (let i = 0; i < 27; i++) root.add(box(0.05, 0.05, 0.46, P.NAVY, lx, 0.8 + i * 0.28, Dp - 0.8));
    const plinth = box(Wd + 1.7, 0.52, 1.0, P.SAFETY, 0, 0.26, Dp + 0.5);
    const hz = TX.hazard().clone();
    hz.needsUpdate = true;
    hz.wrapS = T.RepeatWrapping;
    hz.repeat.set((Wd + 1.7) / 0.84, 1);
    plinth.material = [m(P.SAFETY), m(P.SAFETY), m(P.NAVY_DARK), m(P.NAVY_DARK), ink('#FFFFFF', { map: hz }), m(P.SAFETY)];
    root.add(plinth);
    root.add(box(Wd + 1.7, 0.06, 1.02, P.NAVY_DARK, 0, 0.53, Dp + 0.5));
    return { root, gauges, eyes, glass, face, beacon, bolts, ring, PC, sign, plinthTop: 0.56, frontZ: Dp };
  }

  // ------------------------------------------------------------ room bits

  function pipe(x0, y0, z0, x1, y1, z1, r, color) {
    const a = new T.Vector3(x0, y0, z0), b = new T.Vector3(x1, y1, z1);
    const len = a.distanceTo(b);
    const c = cyl(r, r, len, color || P.POD, 0, 0, 0, 14);
    c.position.copy(a).add(b).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return c;
  }

  function flange(x, y, z, r, axis) {
    const f = cyl(r * 1.45, r * 1.45, 0.08, P.NAVY, x, y, z, 14);
    if (axis === 'x') f.rotation.z = Math.PI / 2;
    if (axis === 'z') f.rotation.x = Math.PI / 2;
    return f;
  }

  function crate(label) {
    const t = TX.crate(label);
    const b = new T.Mesh(new T.BoxGeometry(0.9, 0.9, 0.9), ink('#FFFFFF', { map: t }));
    return b;
  }

  function lamp(on) {
    const g = new T.Group();
    const shade = mesh(new T.ConeGeometry(0.38, 0.28, 24, 1, true), m(P.NAVY, { side: T.DoubleSide }), 0, 0.14, 0);
    g.add(shade);
    const bulb = mesh(new T.SphereGeometry(0.11, 12, 8), ink('#9A9384', { flat: true }), 0, 0.02, 0);
    g.add(bulb);
    const cone = mesh(new T.ConeGeometry(2.0, 4.4, 24, 1, true), new T.MeshBasicMaterial({ color: 0xFFF4D6, map: coneTex(), transparent: true, opacity: 0.0, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }), 0, -2.2, 0);
    cone.layers.set(1);
    g.add(cone);
    g.userData.set = v => {
      bulb.material.uniforms.uColor.value.set(v > 0.5 ? '#FFF7DE' : '#9A9384');
      bulb.material.uniforms.uEmissive.value.set(v > 0.5 ? '#3A3020' : '#000000');
      cone.material.opacity = 0.16 * v;
    };
    g.userData.set(on ? 1 : 0);
    return g;
  }

  let _cone = null;
  function coneTex() {
    if (_cone) return _cone;
    const cv = document.createElement('canvas');
    cv.width = 4; cv.height = 128;
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 128);
    _cone = new T.CanvasTexture(cv);
    return _cone;
  }

  function ladder(h) {
    const g = new T.Group();
    [-0.22, 0.22].forEach(x => g.add(box(0.06, h, 0.06, P.NAVY, x, h / 2, 0)));
    for (let y = 0.3; y < h; y += 0.3) g.add(box(0.44, 0.05, 0.05, P.NAVY, 0, y, 0));
    return g;
  }

  // a soft dark blob under characters
  let blobTex = null;
  function blob(r) {
    if (!blobTex) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const c = cv.getContext('2d');
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(42,37,65,0.38)');
      g.addColorStop(1, 'rgba(42,37,65,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      blobTex = new T.CanvasTexture(cv);
    }
    const s = new T.Mesh(new T.PlaneGeometry(r * 2, r * 2), new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    s.rotation.x = -Math.PI / 2;
    s.layers.set(1);
    return s;
  }

  // additive glow sprite (eyes, bulbs)
  let glowTex = null;
  function glow(color, size) {
    if (!glowTex) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const c = cv.getContext('2d');
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
      glowTex = new T.CanvasTexture(cv);
    }
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(color), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    s.scale.set(size, size, 1);
    s.layers.set(1);
    return s;
  }

  CL.Kit = { m, mesh, box, cyl, decal, extrude, roundRectShape, clawd, wheel, gauge, pod, reactor, pipe, flange, crate, lamp, ladder, blob, glow };
})(window.CL = window.CL || {});
