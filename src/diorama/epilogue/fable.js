/* Fable 5.5 out of its tank: a Clawd 4.8 times Opus's width (as at the end of the
   prologue), with the amber glow still in its eyes. Not a player character: the
   rules move it. It can sit up (c = 0, 4.0 high) or lie low (c = 1, 1.76 high: its
   back becomes a floor the Clawds can stand on), crab-walk sideways, look at
   things, blink, and float.

   F.x, F.z, F.y (float height), F.c (crouch), F.walk/F.amp, F.armL/F.armR,
   F.look, F.wide, F.pitch, F.happy; F.top is the height of its back. F also has
   what world.bubble() reads (x, y, z, height, spec.W, carrying), so the thought
   bubbles work on it too. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const E = CL.Epi = CL.Epi || {};
  const W = 4.8, D = 0.62 * W, LEG = 0.1667 * W, H = 0.6667 * W;

  // back height for a crouch c: the body squashes and sinks until it rests on the floor
  const sy = c => 1 - 0.45 * c;
  const topAt = c => sy(c) * (LEG + H - LEG * c);

  function emissive(hex, k) { return '#' + new T.Color(hex).multiplyScalar(k).getHexString(); }

  function create(world) {
    const m = K.clawd(CL.Clawd.CS({ W }));
    world.scene.add(m.root);

    // the eyes keep the glow they had behind the porthole
    const glows = m.eyes.map(e => {
      e.material.uniforms.uColor.value.set(P.GLOW);
      e.material.uniforms.uEmissive.value.set(emissive(P.GLOW, 0.7));
      const g = K.glow(P.GLOW, 1.6);
      g.material.opacity = 0.85;
      g.position.z = 0.06;
      e.add(g);
      return g;
    });
    // happy eyes for the dawn: ^ ^
    const happy = new T.Group();
    m.eyes.forEach(e => {
      [-1, 1].forEach(s => {
        const b = K.box(0.62, 0.13, 0.03, P.INK, e.position.x + s * 0.21, e.position.y + 0.05, e.position.z + 0.01, { flat: true });
        b.rotation.z = -s * 0.75;
        happy.add(b);
      });
    });
    happy.visible = false;
    m.rig.add(happy);
    // murk from the tank, still running down its front and sides
    // (a few runs of different lengths over the front edge, a drop at the end of each)
    const murk = K.m(P.ORANGE_DEEP, { flat: true });
    [[-1.75, 0.35, 0.16], [-0.6, 0.9, 0.11], [0.95, 0.5, 0.2], [1.9, 1.3, 0.09]].forEach(([x, len, w]) => {
      const d = new T.Mesh(new T.BoxGeometry(w, len, 0.025), murk);
      d.position.set(x, LEG + H - len / 2, D / 2 + 0.013);
      m.rig.add(d);
      const drop = new T.Mesh(new T.SphereGeometry(w * 0.62, 10, 8), murk);
      drop.scale.set(1, 1.25, 0.35);
      drop.position.set(x, LEG + H - len, D / 2 + 0.02);
      m.rig.add(drop);
    });
    [[-1, 0.7, -0.6], [1, 1.0, 0.5]].forEach(([s, len, z]) => {
      const d = new T.Mesh(new T.BoxGeometry(0.025, len, 0.12), murk);
      d.position.set(s * (W / 2 + 0.013), LEG + H - len / 2, z);
      m.rig.add(d);
    });
    const shadow = K.blob(W * 0.62);
    shadow.scale.set(1, D / W * 1.3, 1);
    world.scene.add(shadow);

    const F = {
      model: m, root: m.root, eyes: m.eyes, glows,
      x: 0, z: 0, y: 0, c: 0, heading: 0,
      walk: 0, amp: 0, armL: 0, armR: 0, look: [0, 0], wide: 0, pitch: 0, roll: 0,
      glow: 0.85, happy: false, breathe: 1, blinkT: 2.5, closed: false,
      spec: { W }, carrying: null, free: false,
      W, D, LEG, H,
      get top() { return topAt(this.c); },
      get height() { return topAt(this.c); },
      topAt,
    };

    world.addUpdate((dt, t) => {
      F.blinkT -= dt;
      let eye = F.closed ? 0.09 : 1 + 0.25 * F.wide;
      if (F.blinkT < 0) {
        eye = Math.max(0.09, Math.abs(F.blinkT + 0.12) / 0.12) * eye;
        if (F.blinkT < -0.24) F.blinkT = 3 + Math.random() * 4;
      }
      m.setPose({ walk: F.walk, amp: F.amp, armL: F.armL, armR: F.armR, eye, look: F.look, tilt: F.roll, sq: 1, lift: 0 });
      const k = sy(F.c), br = 1 + 0.012 * Math.sin(t * 1.7) * F.breathe;
      const bob = Math.abs(Math.sin(F.walk)) * 0.035 * W * F.amp;
      m.rig.scale.set(1 + 0.03 * F.c, k * br, 1 + 0.03 * F.c);
      m.rig.position.y = -LEG * k * F.c + bob;
      m.rig.rotation.x = F.pitch;
      m.root.position.set(F.x, F.y, F.z);
      m.root.rotation.y = F.heading;
      happy.visible = F.happy;
      m.eyes.forEach(e => { e.visible = !F.happy; });
      glows.forEach(g => { g.material.opacity = F.glow * (0.85 + 0.15 * Math.sin(t * 2.3)); });
      shadow.position.set(F.x, 0.012, F.z);
      shadow.visible = F.y < 0.5;
    });
    return F;
  }

  E.Fable = { create, topAt, W, D };
})(window.CL = window.CL || {});
