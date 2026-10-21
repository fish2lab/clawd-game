/* Shared effects. Steam: white balls that grow, drift up and shrink away; the
   post pass inks their outlines, like the puffs in the short. */
(function (CL) {
  'use strict';
  const T = THREE;
  const PI = Math.PI;

  function steam(world) {
    const puffs = [];
    const geo = new T.SphereGeometry(1, 12, 8);
    const mat = CL.Ink.ink('#FFFFFF', { shadeMin: 0.86, hatch: 0.1, lit: true });
    // one puff at (x, y, z) moving (vx, vy, vz), growing to size, gone after life seconds
    function puff(x, y, z, vx, vy, vz, size, life) {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.scale.setScalar(0.001);
      world.scene.add(m);
      puffs.push({ m, v: new T.Vector3(vx, vy, vz), size, life, t: 0 });
    }
    // n puffs bursting from a point, mostly towards the camera side (+z)
    function burst(x, y, z, n, spread, size) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * PI * 2;
        puff(x, y, z, Math.cos(a) * spread * Math.random(), 0.3 + Math.random() * spread * 0.6, Math.sin(a) * spread * Math.random() + spread * 0.4, size * (0.6 + Math.random() * 0.6), 1.0 + Math.random() * 0.6);
      }
    }
    world.addUpdate(dt => {
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.t += dt;
        const u = p.t / p.life;
        p.m.position.addScaledVector(p.v, dt);
        p.v.multiplyScalar(1 - dt * 1.5);
        p.v.y += dt * 0.4;
        const s = p.size * Math.min(1, p.t / 0.18) * (1 - Math.max(0, (u - 0.55) / 0.45));
        p.m.scale.setScalar(Math.max(0.001, s));
        if (u >= 1) { world.scene.remove(p.m); puffs.splice(i, 1); }
      }
    });
    return { puff, burst };
  }

  CL.Fx = { steam };
})(window.CL = window.CL || {});
