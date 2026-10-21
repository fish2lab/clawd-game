/* Chapter 5 · 递归自我改进 (RSI). STUB: the room and the cast; clicking the porthole ends the chapter.
   Replace with the real level (see docs/DESIGN.md and src/diorama/level0.js + play0.js). */
(function (CL) {
  'use strict';
  const ID = 'ch5';

  function build(world) {
    const L = CL.Room.build(world, { clock: [23, 50] });
    return L;
  }

  function setup(world, L, api) {
    const S = { done: false };
    const A = {
      opus: world.addActor('opus'),
      sonnet: world.addActor('sonnet'),
      haiku: world.addActor('haiku'),
    };
    A.opus.place(6.0, 6.5, 0, Math.PI);
    A.sonnet.place(7.6, 6.5, 0, Math.PI);
    A.haiku.place(9.2, 6.5, 0, Math.PI);
    Object.values(A).forEach(a => { a.free = true; });
    const hud = api.hud({ todo: ['…'], actors: A });
    const M = CL.Moves.setup(world, A);
    M.floor(L.floor);
    M.actors();
    world.addPick(L.reactor.glass, { kind: 'glass', onClick: () => { if (S.done) return; S.done = true; api.finish(); } });
    const frame = () => {
      world.rig.target.set(8, 2, 5);
      world.rig.zoom = world.rig.zoomT = 15;
    };
    return {
      S, A, L,
      begin() { frame(); world.select(A.opus); hud.show(); },
      async look(name) { frame(); world.select(A.opus); hud.show(); await world.wait(0.6); },
    };
  }

  CL.Chapters.define(ID, { build, setup });
})(window.CL = window.CL || {});
