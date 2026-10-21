/* Boot: fonts, world, level, HUD. ?look=<name> skips the start screen and poses
   a still for screenshots (see CL.Play0.looks). */
(function (CL) {
  'use strict';
  const q = new URLSearchParams(location.search);

  async function fonts() {
    try {
      await Promise.all([
        document.fonts.load('700 40px "Zilla Slab"'),
        document.fonts.load('400 40px "Caveat"'),
        document.fonts.load('400 40px "ZCOOL QingKe HuangYou"', '请勿敲击玻璃预训练'),
      ]);
    } catch (e) { /* system fallbacks */ }
    await document.fonts.ready;
  }

  async function boot() {
    await fonts();
    // ?fast=1 is for automated tests on software GL: bigger time steps, half resolution
    const fast = q.has('fast');
    const world = new CL.Engine.World(document.getElementById('stage'), { preserve: q.has('look'), dpr: fast ? 0.5 : 0, maxDt: fast ? 0.25 : 0.05 });
    window.__world = world;
    const L = CL.Level0.build(world);
    const game = CL.Play0.setup(world, L);
    window.__game = game;
    // read-only hooks for the automated playthrough (tools/playtest.mjs)
    window.__probe = {
      screen: (x, y, z) => world.project(new THREE.Vector3(x, y, z)),
      state: () => JSON.parse(JSON.stringify(Object.assign({}, game.S, { onFrame: null }))),
      actor: n => { const a = game.A[n]; return { x: a.x, y: a.y, z: a.z, support: a.support && a.support.kind, busy: a.busy, free: a.free }; },
      crate: () => [game.L.crate.position.x, game.L.crate.position.z],
      valves: () => Object.fromEntries(Object.entries(game.L.valves).map(([k, v]) => [k, v.open])),
      settled: () => Math.abs(world.rig.az - world.rig.azT) < 0.5 && Math.abs(world.rig.zoom - world.rig.zoomT) < 0.05 && (world.rig.moving || 0) < 0.03 && !world.rig.shake,
      pickAt: (x, y) => { const h = world.pick([x, y]); return h ? h.info.kind : null; },
      debug: () => ({ calls: world.renderer.info.render.calls, t: world.t, tweens: world.tweens.length, paths: Object.fromEntries(Object.entries(game.A).map(([k, a]) => [k, { path: a.path, cmd: a.cmd, h: a.heading, next: !!a.next }])) }),
    };
    world.start();
    if (q.has('look')) {
      document.getElementById('start').hidden = true;
      await game.look(q.get('look'));
      window.__ready = true;
      return;
    }
    document.getElementById('go').addEventListener('click', () => {
      CL.Sound.unlock();
      document.getElementById('start').hidden = true;
      game.begin();
    });
    document.getElementById('again').addEventListener('click', () => location.reload());
  }

  boot();
})(window.CL = window.CL || {});
