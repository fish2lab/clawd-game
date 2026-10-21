/* What a Clawd can do with its body, the same in every chapter:
   walk, hop down, climb onto a bigger Clawd (the stacking rule), turn a wheel,
   work a handle, and push or pull a box on casters.

     const M = CL.Moves.setup(world, A, { locked: a => {...} });
     M.floor(L.floor);              // clicking it walks there
     M.actors();                    // click a Clawd to select it, its head to climb on
     const box = M.pushable(mesh, { fits: (x, z) => ..., size: 0.9 });

   Every command goes through world.claim/release, so a click during an action is
   queued and a click during a walk redirects it. */
(function (CL) {
  'use strict';
  const T = THREE;
  const PI = Math.PI;
  const play = n => CL.Sound.play(n);

  // The marker for a box move, in the box's direction of travel (local -z): the target
  // footprint on the floor, and a big arrow on the box's own top face (always in view
  // from above); a red cross on the box instead when it can't move that way.
  function boxHint(size) {
    const P = CL.P;
    const g = new T.Group();
    const ok = CL.Ink.ink(P.SAFETY, { flat: true, lit: true, opacity: 0.95, depthWrite: false });
    const okFill = CL.Ink.ink(P.SAFETY, { flat: true, lit: true, opacity: 0.3, depthWrite: false });
    const no = CL.Ink.ink(P.ALARM, { flat: true, lit: true, opacity: 0.95, depthWrite: false });
    const dark = CL.Ink.ink(P.INK, { flat: true, lit: true, opacity: 0.85, depthWrite: false });
    const flat = (geo, mat, x, y, z, rz) => {
      const m = new T.Mesh(geo, mat);
      m.rotation.set(-PI / 2, 0, rz || 0);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    const h = size / 2, w = 0.07;
    const foot = [
      flat(new T.PlaneGeometry(size, size), okFill, 0, 0, 0),
      ...[[0, -h, size, w], [0, h, size, w], [-h, 0, w, size], [h, 0, w, size]].map(([x, z, sx, sz]) => flat(new T.PlaneGeometry(sx, sz), ok, x, 0.001, z)),
    ];
    const tri = new T.Shape([new T.Vector2(0, 0.3), new T.Vector2(-0.24, -0.04), new T.Vector2(-0.09, -0.04), new T.Vector2(-0.09, -0.3), new T.Vector2(0.09, -0.3), new T.Vector2(0.09, -0.04), new T.Vector2(0.24, -0.04)]);
    const top = size - 0.012 + 0.006;   // the group sits just above the floor
    const arrow = flat(new T.ShapeGeometry(tri), dark, 0, top, 1);   // drawn pointing +y: lies along -z
    const cross = { children: [PI / 4, -PI / 4].map(r => flat(new T.PlaneGeometry(0.6, 0.12), no, 0, top, 1, r)) };
    g.traverse(o => o.layers.set(1));   // no ink outline for markings
    g.visible = false;
    // can: the box can move; then the footprint shows where it ends up
    g.userData.show = can => {
      foot.forEach(m => { m.visible = can; });
      arrow.visible = can;
      cross.children.forEach(m => { m.visible = !can; });
    };
    return g;
  }

  // opt.locked(a): called when a Clawd that is not free yet is clicked; show why
  function setup(world, A, opt) {
    opt = opt || {};
    const grid = world.grid;
    const dist2 = (a, x, z) => Math.hypot(a.x - x, a.z - z);
    const perched = a => !!a.support && a.support.kind !== 'floor' && a.support.kind !== 'pod';
    const inPod = a => !!a.support && a.support.kind === 'pod';
    const boxes = [];

    // hop down from a box or another Clawd onto the floor, towards (x, z)
    async function dismount(a, x, z) {
      const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz) || 1;
      const sp = a.support;
      const off = 0.5 + (sp.kind === 'crate' ? sp.crate.half : sp.kind === 'actor' ? sp.actor.spec.W * 0.4 : 0.3);
      const [fx, fz] = grid.nearestFree(a.x + dx / d * off, a.z + dz / d * off);
      if (sp.kind === 'actor') sp.actor.carrying = null;
      if (sp.kind === 'crate') sp.crate.rider = null;
      a.support = null;
      await a.hopTo(fx, fz, grid.heightAt(fx, fz), 0.4);
    }

    async function moveTo(a, x, z) {
      if (!a) return;
      if (inPod(a)) { world.bubble(a, 'lock'); return; }
      const my = world.claim(a, () => moveTo(a, x, z));
      if (my === null) return;
      try {
        if (perched(a)) {
          if (a.carrying) { world.bubble(a, 'stack'); return; }
          a.busy = true;
          await dismount(a, x, z);
        }
        a.busy = 'walk';
        const ok = await a.walkTo(x, z);
        if (a.cmd !== my) return;
        if (!ok) world.bubble(a, 'q');
      } finally { world.release(a, my); }
    }

    // climb onto another Clawd: only onto a bigger one, and only one Clawd per head
    async function climbOnto(a, base) {
      if (inPod(a)) return;
      if (!base.free) { world.bubble(a, 'q'); return; }
      if (base.carrying && base.carrying !== a) { world.bubble(a, 'q'); return; }
      if (a.carrying) { world.bubble(a, 'stack'); return; }
      if (a.spec.W >= base.spec.W) { world.bubble(base, 'heavy'); base.sq = 0.82; world.tween(0.3, u => { base.sq = 0.82 + 0.18 * u; }); return; }
      const my = world.claim(a, () => climbOnto(a, base));
      if (my === null) return;
      try {
        a.busy = true;
        if (perched(a) && dist2(a, base.x, base.z) > 1.5) await dismount(a, base.x, base.z);
        if (!perched(a) && dist2(a, base.x, base.z) > base.spec.W * 0.5 + 0.7) {
          const d = dist2(a, base.x, base.z) || 1;
          const r = base.spec.W * 0.5 + 0.45;
          const [sx, sz] = grid.nearestFree(base.x + (a.x - base.x) / d * r, base.z + (a.z - base.z) / d * r);
          a.busy = 'walk';
          const ok = await a.walkTo(sx, sz);
          if (a.cmd !== my) return;
          a.busy = true;
          if (!ok) { world.bubble(a, 'q'); return; }
        }
        if (base.topY - a.y > 1.8) { world.bubble(a, 'up'); return; }
        await a.hopTo(base.x, base.z, base.topY, 0.5);
        a.support = { kind: 'actor', actor: base };
        base.carrying = a;
        a.face(base.heading);
        play('step');
      } finally { world.release(a, my); }
    }

    // spin a hand wheel `turns` times about its local axis, arms going round
    async function turnWheel(a, wheelObj, turns, axis) {
      play('creak');
      a.armR = 1.2; a.armL = 1.0;
      const r0 = wheelObj.rotation[axis || 'z'];
      await new Promise(res => world.tween(0.9, u => {
        wheelObj.rotation[axis || 'z'] = r0 - turns * 2 * PI * u;
        a.armR = 1.0 + 0.4 * Math.sin(u * PI * 4);
      }, res, CL.Engine.ease));
      a.armR = 0; a.armL = 0;
    }

    // work a handle or lever for dur seconds (the thing itself animates elsewhere)
    async function operate(a, dur) {
      play('creak');
      a.armR = 1.2; a.armL = 1.0;
      await new Promise(res => world.tween(dur, u => { a.armR = 1.0 + 0.4 * Math.sin(u * PI * 4); }, res));
      a.armR = 0; a.armL = 0;
    }

    // a surface you walk on; map(hit) may adjust the target point
    function floor(mesh, map) {
      world.addPick(mesh, { kind: 'floor', onClick: (hit, a) => {
        if (!a) return;
        const [x, z] = map ? map(hit) : [hit.point.x, hit.point.z];
        moveTo(a, x, z);
      } });
    }

    // the Clawds themselves: click a side to select, click a head to climb on
    function actors() {
      Object.values(A).forEach(a => {
        world.addPick(a.root, {
          kind: 'actor', noGlow: true,
          onClick: (hit, act) => {
            if (!a.free) { if (opt.locked) opt.locked(a); else world.bubble(a, 'zz'); return; }
            if (act && act !== a && act.free && hit.normal.y > 0.6) climbOnto(act, a);
            else world.select(a);
          },
        });
      });
    }

    // A box on casters. Click a side: Opus (only Opus is heavy enough) pushes it one
    // cell away from that side; if that way is blocked he pulls it one cell back
    // instead, so a box can never get stuck against a wall. Click the top to climb on.
    // cfg: { size: 0.9, fits(x, z) -> bool (static obstacles), onMove(box), canMove(a) -> bool }
    function pushable(mesh, cfg) {
      cfg = cfg || {};
      const size = cfg.size || 0.9, half = size / 2;
      const bx = { mesh, half, size, rider: null, block: { x: mesh.position.x, z: mesh.position.z, hw: half, hd: half, on: true } };
      grid.dyn.push(bx.block);
      boxes.push(bx);
      // can the box stand at (x, z)? skip: a Clawd to ignore (the one moving it), or true for all
      bx.fits = (x, z, skip) => {
        if (cfg.fits && !cfg.fits(x, z)) return false;
        if (x - half < 0.35 || z - half < 0.35 || x + half > CL.Room.RW - 0.35 || z + half > CL.Room.RD - 0.35) return false;
        for (const o of boxes) if (o !== bx && Math.abs(o.mesh.position.x - x) < o.half + half && Math.abs(o.mesh.position.z - z) < o.half + half) return false;
        if (skip !== true) for (const a of Object.values(A)) if (a !== skip && !inPod(a) && !perched(a) && Math.abs(a.x - x) < half + 0.3 && Math.abs(a.z - z) < half + 0.3) return false;
        return true;
      };
      // where a side click would send it: { dir, k: 1 push / -1 pull } or null
      bx.plan = (a, n, from) => {
        const dir = Math.abs(n.x) > Math.abs(n.z) ? [-Math.sign(n.x), 0] : [0, -Math.sign(n.z)];
        const p = bx.mesh.position;
        if (bx.fits(p.x + dir[0], p.z + dir[1], a)) return { dir, k: 1 };
        if (grid.freeAt(p.x - dir[0] * (half + 1.6), p.z - dir[1] * (half + 1.6)) && bx.fits(p.x - dir[0], p.z - dir[1], a)) return { dir, k: -1 };
        return { dir, k: 0 };
      };
      bx.setAt = (x, z) => {
        mesh.position.x = x; mesh.position.z = z;
        bx.block.x = x; bx.block.z = z;
      };
      bx.push = async (a, n) => {
        if (inPod(a)) return;
        if (!a.spec.heavy) { world.bubble(a, 'heavy'); return; }
        if (bx.rider) { world.bubble(a, 'q'); return; }
        if (cfg.canMove && !cfg.canMove(a)) return;
        const my = world.claim(a, () => bx.push(a, n));
        if (my === null) return;
        const c = mesh;
        try {
          const { dir } = bx.plan(a, n);
          const sx = c.position.x - dir[0] * (half + 0.6), sz = c.position.z - dir[1] * (half + 0.6);
          a.busy = true;
          if (perched(a)) await dismount(a, sx, sz);
          bx.block.on = false;
          a.busy = 'walk';
          const ok = await a.walkTo(sx, sz);
          bx.block.on = true;
          if (a.cmd !== my) return;
          a.busy = true;
          if (!ok) { world.bubble(a, 'q'); return; }
          a.face(Math.atan2(dir[0], dir[1]));
          await world.wait(0.15);
          const { k } = bx.plan(a, n);
          if (!k) { play('dull'); a.sq = 0.9; world.tween(0.25, u => { a.sq = 0.9 + 0.1 * u; }); world.bubble(a, 'heavy'); return; }
          play('whoosh');
          const x0 = c.position.x, z0 = c.position.z, ax = a.x, az = a.z;
          a.armL = a.armR = k > 0 ? 0.4 : 1.1;
          bx.block.on = false;
          await new Promise(res => world.tween(k > 0 ? 0.4 : 0.6, u => {
            c.position.x = x0 + dir[0] * u * k; c.position.z = z0 + dir[1] * u * k;
            a.x = ax + dir[0] * u * k * (k > 0 ? 0.8 : 1); a.z = az + dir[1] * u * k * (k > 0 ? 0.8 : 1);
            a.walk += 0.3 * k; a.amp = 1;
          }, res, CL.Engine.ease));
          a.armL = a.armR = 0;
          bx.setAt(c.position.x, c.position.z);
          bx.block.on = true;
          play('clunk');
          if (cfg.onMove) cfg.onMove(bx);
        } finally { world.release(a, my); }
      };
      bx.climb = async a => {
        if (inPod(a)) return;
        const c = mesh;
        if (bx.rider) { if (bx.rider !== a) climbOnto(a, bx.rider); return; }
        const my = world.claim(a, () => bx.climb(a));
        if (my === null) return;
        try {
          a.busy = true;
          if (perched(a)) { if (a.carrying) { world.bubble(a, 'stack'); return; } await dismount(a, c.position.x, c.position.z); }
          if (dist2(a, c.position.x, c.position.z) > half + 0.7) {
            const d = dist2(a, c.position.x, c.position.z) || 1;
            bx.block.on = true;
            const [sx, sz] = grid.nearestFree(c.position.x + (a.x - c.position.x) / d * (half + 0.55), c.position.z + (a.z - c.position.z) / d * (half + 0.55));
            a.busy = 'walk';
            const ok = await a.walkTo(sx, sz);
            if (a.cmd !== my) return;
            a.busy = true;
            if (!ok) { world.bubble(a, 'q'); return; }
          }
          await a.hopTo(c.position.x, c.position.z, size, 0.5);
          a.support = { kind: 'crate', crate: bx };
          bx.rider = a;
          play('step');
        } finally { world.release(a, my); }
      };
      // seat a Clawd on top without animation (for posed stills)
      bx.seat = a => { a.place(mesh.position.x, mesh.position.z, size, a.heading); a.support = { kind: 'crate', crate: bx }; bx.rider = a; };
      const info = world.addPick(mesh, {
        kind: 'crate',
        onClick: (hit, a) => {
          hint.visible = false;
          if (!a) return;
          if (hit.normal.y > 0.6) bx.climb(a);
          else bx.push(a, hit.normal);
        },
      });
      // Hovering a side with Opus shows where the box would go: its footprint on the
      // floor and an arrow (push away, or pull back), or a red cross if it can't move.
      const hint = boxHint(size);
      world.scene.add(hint);
      world.on('move', hit => {
        const a = world.active;
        hint.visible = false;
        if (!hit || hit.info !== info || hit.normal.y > 0.6 || !a || bx.rider || a.busy === true) return;
        let { dir, k } = bx.plan(a, hit.normal);
        if (!a.spec.heavy) k = 0;   // only Opus is heavy enough to move it
        const p = mesh.position;
        const s = k || 1;
        hint.position.set(p.x + dir[0] * s, 0.012, p.z + dir[1] * s);
        hint.rotation.y = Math.atan2(-dir[0] * s, -dir[1] * s);
        hint.userData.show(!!k);
        hint.visible = true;
      });
      return bx;
    }

    // the base of a stack walks; whoever stands on it rides along (Actor.update)
    world.dismount = dismount;
    world.isPerched = perched;

    return { dist2, perched, inPod, dismount, moveTo, climbOnto, turnWheel, operate, floor, actors, pushable, boxes };
  }

  CL.Moves = { setup };
})(window.CL = window.CL || {});
