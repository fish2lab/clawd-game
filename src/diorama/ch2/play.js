/* Chapter 2 · 监督微调 (SFT): the rules.

   Demonstrate, record, play back. Fable copies whatever the tape holds with its
   own set above the porthole, and it copies everything:

     1. Card "bell, bell, lamp". REC, do it on the stage, PLAY. The card flips.
     2. Card "flag, bell, lamp". The centre tile is loose and clacks under a heavy
        Clawd (Opus, Sonnet). Walking from the flag to the bell crosses it. The
        tape gets a click, and Fable, having learned that a click comes first,
        clacks before every action. Haiku is too light to make it clack; or walk
        round it; or split the work so nobody crosses it.
     3. Card "big bell". Its rope hangs high at the stage's corner: only the full
        stack reaches it (Opus, Sonnet, Haiku). The stack has to stand on the
        stage or the camera does not see the pull. And Opus, waiting at the
        bottom, taps his clipboard twice with his pen; that is on the tape too.
        Hang the clipboard on its hook on the tool board.
     4. Card "H · I". The tap-code chart is on the reactor; a poster stand hides
        its top rows unless you look from the side. Only Haiku's small knuckle
        knocks clearly, and it needs the step stool (or a stack) on the plinth to
        reach the glass. Knocks group by pauses; each knock leaves a mark.
        Fable knocks back what it heard.

   Then the lab closes for the night, and in the dark Fable taps twice, the way
   Opus taps his clipboard. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const LV = CL.Ch2Level;
  const A2 = CL.Ch2Art;
  const PR = CL.Ch2Props;
  const PI = Math.PI;
  const { RX } = CL.Room;
  const play = n => CL.Sound.play(n);
  const ACTIONS = ['bell', 'lamp', 'flag', 'big'];
  const ZOOM = 10.5;
  const BOUNDS = [6.5, 13.0, 4.0, 7.6];
  const GAP = 1.5;      // seconds of quiet that close a group of knocks
  const END = 4.5;      // seconds of quiet that end a message
  const dim = PR.dim;

  function setup(world, L, api) {
    const S = {
      card: 0, rec: false, playing: false, fableBusy: false,
      tape: [], offStage: [], last: null, results: [],
      clipOnHook: false, plugged: false,
      clacks: 0, opusTaps: 0, thumps: 0, msgs: [], echoing: false,
      ended: false, done: false,
    };
    const A = {
      opus: world.addActor('opus'),
      sonnet: world.addActor('sonnet'),
      haiku: world.addActor('haiku'),
    };
    const R = L.reactor;
    const grid = world.grid;
    A.opus.place(8.0, 6.65, 0, 0.9);
    A.sonnet.place(12.6, 9.1, 0, -2.6);
    A.haiku.place(6.6, 7.4, 0, 0.6);

    // ---------------------------------------------------- HUD
    const hud = api.hud({ todo: ['Demo #1', 'Demo #2', 'Demo #3', 'First words'], actors: A });
    const { puff } = api.fx;

    // ---------------------------------------------------- moves
    const M = CL.Moves.setup(world, A, { locked: a => world.bubble(a, 'zz') });
    const { perched, dist2 } = M;
    M.actors();

    // ---------------------------------------------------- looking at things: the camera leans in
    const peekF = { x: 0, y: 0, z: 0 };
    let peeking = false;
    function peek(p, zoom) {
      peeking = true;
      peekF.x = p.x; peekF.z = p.z; peekF.y = (p.y - (world.rig.followY || 1.4)) * 2;
      world.rig.bounds = [0, 16, 0, 10];
      world.rig.follow = peekF;
      world.rig.zoomT = zoom || 4;
    }
    function unpeek() {
      if (!peeking) return;
      peeking = false;
      world.rig.bounds = BOUNDS;
      world.rig.follow = world.active;
      world.rig.zoomT = ZOOM;
    }
    world.on('click', hit => { if (peeking && !hit.info.peek) unpeek(); });
    world.on('select', () => { if (peeking) { peeking = false; world.rig.bounds = BOUNDS; world.rig.zoomT = ZOOM; } });
    const wpos = o => o.getWorldPosition(new T.Vector3());
    // an information source: click to look closer; the active Clawd looks too
    function info(obj, kind, at, zoom, then) {
      world.addPick(obj, {
        kind, peek: true,
        onClick: (hit, a) => {
          const p = typeof at === 'function' ? at() : at;
          peek(p, zoom);
          if (a && !perched(a) && !a.busy) a.faceTo(p.x, p.z);
          if (then) then(a); else if (a) world.bubble(a, 'eye', 1.1);
        },
      });
    }

    // ---------------------------------------------------- where a Clawd stands (the bottom of its stack)
    function baseOf(a) { let b = a; while (b.support && b.support.kind === 'actor') b = b.support.actor; return b; }
    const onStage = a => { const b = baseOf(a); return LV.onStage(b.x, b.z); };

    // ---------------------------------------------------- the recorder and the camera
    const rec = L.rec;
    function redrawTape(hot) { A2.drawTape(rec.cv, S.tape.map(e => e.k), { rec: S.rec, play: hot }); rec.tex.needsUpdate = true; }
    function setKeys() {
      rec.keys.rec.position.y = rec.keys.rec.userData.y0 - (S.rec ? 0.035 : 0);
      rec.keys.play.position.y = rec.keys.play.userData.y0 - (S.playing ? 0.035 : 0);
      rec.lamps.rec.userData.on(S.rec);
      rec.lamps.play.userData.on(S.playing);
      L.cam.tally.userData.on(S.rec);
      L.stage.frameMat.uniforms.uEmissive.value.set(S.rec ? dim(P.ALARM, 0.5) : '#000000');
    }
    // log what happens: on the tape if it happens on the stage while recording
    function record(k, a) {
      if (!S.rec) return;
      if (!a || onStage(a)) {
        if (S.tape.length < 30) S.tape.push({ k });
        redrawTape();
      } else S.offStage.push(k);
    }
    async function press(a) {
      a.armR = 1.1; a.armL = 0.6;
      await world.wait(0.18);
      a.armR = 0.2; a.armL = 0.2;
      await world.wait(0.12);
      a.armR = 0; a.armL = 0;
    }
    const keyUse = which => async a => {
      if (a.reachY < LV.REC.keyY) { world.bubble(a, 'up'); return; }
      if (S.playing || S.fableBusy || S.echoing) { play('dull'); world.bubble(a, 'zz'); return; }
      await press(a);
      play('key');
      if (which === 'rec') {
        S.rec = true; S.tape = []; S.offStage = [];
        redrawTape(); setKeys();
      } else {
        S.rec = false;
        setKeys();
        playback();
      }
    };
    info(rec.root, 'recorder', () => wpos(rec.tape), 2.6);
    world.addPick(rec.keys.rec, { kind: 'key', onClick: () => world.interact({ spot: () => LV.REC.spot, use: keyUse('rec') }) });
    world.addPick(rec.keys.play, { kind: 'key', onClick: () => world.interact({ spot: () => LV.REC.spot, use: keyUse('play') }) });
    info(L.cam.root, 'camera', () => wpos(L.cam.head), 3.5);
    redrawTape();
    setKeys();

    // ---------------------------------------------------- the demo set
    const D = L.dev;
    function swing(pivot, amp, dur, axis) {
      axis = axis || 'z';
      world.tween(dur, u => { pivot.rotation[axis] = amp * Math.sin(u * PI * 7) * (1 - u); }, () => { pivot.rotation[axis] = 0; });
    }
    function lampFlash(set, dur) {
      set(1);
      world.tween(dur, () => {}, () => set(0));
    }
    function flagRun(flag, lo, hi) {
      world.tween(0.5, u => { flag.position.y = lo + (hi - lo) * CL.Engine.ease(u); }, () => {
        world.tween(0.45, () => {}, () => world.tween(0.55, u => { flag.position.y = hi - (hi - lo) * u * u; }));
      });
    }
    const devUse = k => async a => {
      if (k === 'bell') {
        a.armR = 0.9; await world.wait(0.15);
        play('ding'); swing(D.bell.pivot, 0.45, 1.3);
        a.armR = 0.2; await world.wait(0.25); a.armR = 0;
      } else if (k === 'lamp') {
        a.armR = 0.7; await world.wait(0.15);
        play('flick'); lampFlash(D.lamp.set, 0.9);
        a.armR = 0; await world.wait(0.25);
      } else if (k === 'flag') {
        play('crank');
        a.armR = 1.1; a.armL = 0.9;
        flagRun(D.flag.flag, PR.FLAG_LO, PR.FLAG_HI);
        await new Promise(res => world.tween(0.5, u => { D.flag.crank.rotation.z = -u * 4 * PI; a.armR = 1.0 + 0.4 * Math.sin(u * PI * 4); }, res));
        a.armR = 0; a.armL = 0;
      }
      record(k, a);
      fableWatch(k);
    };
    ['bell', 'lamp', 'flag'].forEach(k => {
      world.addPick(D[k].root, { kind: k, onClick: () => world.interact({ spot: () => LV.DEV[k].spot, use: devUse(k) }) });
    });

    // the big bell: the post and bell are something to look at, the rope is to pull
    info(D.big.root, 'bigbell', () => wpos(D.big.pivot).add(new T.Vector3(0, -0.6, 0)), 5);
    const ropeAt = new T.Vector3(LV.BIG.rope[0], LV.BIG.handleY, LV.BIG.rope[1]);
    async function pullRope(a) {
      const d = Math.hypot(a.x - ropeAt.x, a.z - ropeAt.z);
      if (d > 0.98) { world.bubble(a, 'q'); return; }
      if (a.reachY < LV.BIG.handleY - 0.02) { world.bubble(a, 'up'); return; }
      a.faceTo(ropeAt.x, ropeAt.z);
      a.armR = 1.5; a.armL = 1.3;
      await world.wait(0.2);
      play('bong');
      world.tween(0.35, u => { D.big.rope.position.y = -0.55 - 0.18 * Math.sin(u * PI); });
      swing(D.big.pivot, 0.28, 2.4, 'x');
      a.armR = 0.6; a.armL = 0.5;
      await world.wait(0.3);
      a.armR = 0; a.armL = 0;
      record('big', a);
      fableWatch('big');
    }
    world.addPick([D.big.rope], {
      kind: 'rope',
      onClick: () => {
        const a = world.active;
        if (!a) return;
        unpeek();
        if (perched(a)) world.interact({ use: pullRope }, null, a);
        else world.interact({ spot: () => [LV.BIG.spot[0], LV.BIG.spot[1], Math.atan2(ropeAt.x - LV.BIG.spot[0], ropeAt.z - LV.BIG.spot[1])], use: pullRope }, null, a);
      },
    });

    // ---------------------------------------------------- the stage tiles: pressure plates, one of them loose
    const tiles = L.stage.tiles;
    const loose = tiles[LV.LOOSE];
    const heavy = [A.opus, A.sonnet];
    const WEIGHT = { opus: 1.0, sonnet: 0.6, haiku: 0 };   // Haiku does not register at all
    const onFloor = a => !a.support || a.support.kind === 'floor';
    const inLoose = { opus: false, sonnet: false };
    let rock = 0;
    function clack(a) {
      S.clacks++;
      play('clack');
      rock = 1;
      for (let i = 0; i < 4; i++) puff(loose.x + (Math.random() - 0.5) * 0.9, 0.08, loose.z + 0.5 * (Math.random() > 0.5 ? 1 : -1), 0, 0.15, 0.1, 0.05, 0.5);
      record('click', a);
    }
    function tileLoads() {
      const w = new Array(9).fill(0);
      Object.values(A).forEach(a => {
        if (!onFloor(a)) return;
        let load = 0;
        for (let r = a; r; r = r.carrying) load += WEIGHT[r.name];
        if (!load) return;
        const c = Math.floor((a.x - LV.ST.x0) / LV.ST.t), r = Math.floor((a.z - LV.ST.z0) / LV.ST.t);
        if (c >= 0 && c < 3 && r >= 0 && r < 3) w[r * 3 + c] += load;
      });
      return w;
    }
    function updateTiles(dt, t) {
      if (!S.ended) heavy.forEach(a => {
        const inside = onFloor(a) && Math.abs(a.x - loose.x) < 0.38 && Math.abs(a.z - loose.z) < 0.38;
        if (inside && !inLoose[a.name]) clack(a);
        inLoose[a.name] = inside;
      });
      const w = tileLoads();
      tiles.forEach((tl, i) => {
        const down = w[i] > 0 ? 0.014 : 0;
        tl.mesh.position.y += (tl.mesh.userData.y0 - down - tl.mesh.position.y) * Math.min(1, dt * 12);
      });
      rock = Math.max(0, rock - dt * 2.2);
      loose.mesh.rotation.x = 0.07 * rock * Math.sin(t * 40);
      loose.mesh.rotation.z = 0.04 * rock * Math.cos(t * 33);
      return w;
    }

    // ---------------------------------------------------- Opus's habit: waiting, he taps his clipboard twice
    let idleT = 0, tapCD = 0, tapping = false;
    function clipPos() { return wpos(A.opus.model.prop); }
    function ring(p, color, size, life, dir) {
      const r = K.mesh(new T.TorusGeometry(size, size * 0.12, 6, 24), CL.Ink.ink(color, { flat: true, lit: true }), p.x, p.y, p.z);
      if (dir === 'z') { /* facing +z already */ } else r.rotation.y = A.opus.heading;
      r.layers.set(1);
      world.scene.add(r);
      r.material.transparent = true;
      world.tween(life, u => { r.scale.setScalar(1 + 2.2 * u); r.material.uniforms.uOpacity.value = 1 - u; }, () => world.scene.remove(r));
    }
    async function tapTap() {
      tapping = true;
      const o = A.opus;
      for (let i = 0; i < 2; i++) {
        o.armR = 0.95;
        await world.wait(0.1);
        play('tok');
        ring(clipPos(), P.PAPER, 0.06, 0.35);
        o.armR = 0.4;
        await world.wait(0.13);
      }
      o.armR = 0;
      S.opusTaps++;
      record('taptap', o);
      fableWatch('taptap');
      tapping = false;
    }
    function updateHabit(dt) {
      const o = A.opus;
      const idle = o.free && !o.busy && !o.path && !o.next && !S.ended && !S.clipOnHook && !tapping;
      tapCD = Math.max(0, tapCD - dt);
      if (!idle) { idleT = 0; return; }
      idleT += dt;
      if (idleT > (o.carrying ? 1.6 : 4.5) && tapCD <= 0) { tapCD = 6; tapTap(); }
    }

    // ---------------------------------------------------- the tool board: a hook for the clipboard
    const prop = A.opus.model.prop;
    const propHome = { parent: prop.parent, pos: prop.position.clone(), rot: prop.rotation.clone() };
    function hang(on) {
      S.clipOnHook = on;
      prop.removeFromParent();
      if (on) {
        L.walls.back.add(prop);
        prop.position.set(L.hookWorld.x, L.hookWorld.y - 0.2, 0.09);
        prop.rotation.set(0, 0, 0.03);
      } else {
        propHome.parent.add(prop);
        prop.position.copy(propHome.pos);
        prop.rotation.copy(propHome.rot);
      }
    }
    world.addPick(L.peg.root, {
      kind: 'hook',
      onClick: (hit, a) => {
        if (!a) return;
        if (a !== A.opus) { peek(L.hookWorld.clone().add(new T.Vector3(0, -0.25, 0)), 3.2); world.bubble(a, 'clip', 1.4); return; }
        unpeek();
        world.interact({
          spot: () => [L.hookWorld.x, 0.95, PI],
          use: async o => {
            if (o.reachY < L.hookWorld.y - 0.05) { world.bubble(o, 'up'); return; }
            o.armL = 1.2;
            await world.wait(0.2);
            play('lift');
            hang(!S.clipOnHook);
            o.armL = 0;
            await world.wait(0.15);
          },
        });
      },
    });

    // ---------------------------------------------------- the step stool: Opus or Sonnet carry it, Haiku stands on it
    const stool = { mesh: L.stool, held: null, rider: null, block: { x: L.stool.position.x, z: L.stool.position.z, hw: 0.27, hd: 0.22, on: true } };
    grid.dyn.push(stool.block);
    const stoolTop = () => stool.mesh.position.y + PR.STOOL_H;
    function freeSpot(x, z) {
      const ok = (px, pz) => grid.freeAt(px, pz) && Object.values(A).every(a => Math.hypot(a.x - px, a.z - pz) > a.spec.W * 0.5 + 0.32);
      if (ok(x, z)) return [x, z];
      for (let r = 1; r < 10; r++) for (let k = 0; k < 12; k++) {
        const ang = k * PI / 6, px = x + Math.cos(ang) * r * 0.2, pz = z + Math.sin(ang) * r * 0.2;
        if (ok(px, pz)) return [px, pz];
      }
      return [x, z];
    }
    function putStool(x, z) {
      stool.mesh.removeFromParent();
      world.scene.add(stool.mesh);
      stool.mesh.position.set(x, grid.heightAt(x, z), z);
      stool.mesh.rotation.set(0, 0, 0);
      stool.block.x = x; stool.block.z = z; stool.block.on = true;
      stool.held = null;
      play('thump');
    }
    function approach(px, pz, a, r) {
      const d = Math.hypot(a.x - px, a.z - pz) || 1;
      return grid.nearestFree(px + (a.x - px) / d * r, pz + (a.z - pz) / d * r);
    }
    async function carryTo(a, x, z) {
      const my = world.claim(a, () => carryTo(a, x, z));
      if (my === null) return;
      try {
        const [tx, tz] = freeSpot(x, z);
        if (perched(a)) { if (a.carrying) { world.bubble(a, 'stack'); return; } a.busy = true; await world.dismount(a, tx, tz); }
        const [sx, sz] = approach(tx, tz, a, 0.78);
        a.busy = 'walk';
        const ok = await a.walkTo(sx, sz);
        if (a.cmd !== my) return;
        a.busy = true;
        if (!ok) { world.bubble(a, 'q'); return; }
        a.faceTo(tx, tz);
        await world.wait(0.2);
        putStool(tx, tz);
      } finally { world.release(a, my); }
    }
    function liftStool(a) {
      unpeek();
      world.interact({
        spot: () => { const p = stool.mesh.position; const [sx, sz] = approach(p.x, p.z, a, 0.72); return [sx, sz, Math.atan2(p.x - sx, p.z - sz)]; },
        use: async a2 => {
          if (stool.rider || stool.held) { world.bubble(a2, 'q'); return; }
          if (Math.hypot(a2.x - stool.mesh.position.x, a2.z - stool.mesh.position.z) > 1.2) { world.bubble(a2, 'q'); return; }
          play('lift');
          stool.mesh.removeFromParent();
          a2.root.add(stool.mesh);
          stool.mesh.position.set(0, a2.model.LEG + 0.12 * a2.spec.W, a2.model.D / 2 + 0.26);
          stool.mesh.rotation.set(0, 0, 0);
          stool.block.on = false;
          stool.held = a2;
          a2.armL = a2.armR = 0.5;
          await world.wait(0.2);
          a2.armL = a2.armR = 0;
        },
      }, null, a);
    }
    async function climbStool(h) {
      const my = world.claim(h, () => climbStool(h));
      if (my === null) return;
      try {
        if (stool.rider === h) return;
        if (stool.rider || stool.held) { world.bubble(h, 'q'); return; }
        h.busy = true;
        const p = stool.mesh.position;
        if (perched(h)) { if (h.carrying) { world.bubble(h, 'stack'); return; } await world.dismount(h, p.x, p.z); }
        if (dist2(h, p.x, p.z) > 0.95) {
          const [sx, sz] = approach(p.x, p.z, h, 0.62);
          h.busy = 'walk';
          const ok = await h.walkTo(sx, sz);
          if (h.cmd !== my) return;
          h.busy = true;
          if (!ok) { world.bubble(h, 'q'); return; }
        }
        await h.hopTo(p.x, p.z, stoolTop(), 0.45);
        h.support = { kind: 'stool' };
        stool.rider = h;
        play('step');
      } finally { world.release(h, my); }
    }
    world.addPick(stool.mesh, {
      kind: 'stool',
      onClick: (hit, a) => {
        if (!a) return;
        if (stool.held) { if (stool.held === a) { const f = a.heading; carryTo(a, a.x + Math.sin(f) * 0.8, a.z + Math.cos(f) * 0.8); } return; }
        if (a === A.haiku) climbStool(a);
        else liftStool(a);
      },
    });

    // ---------------------------------------------------- floors: walk, or carry the stool there
    function floorPick(mesh, map) {
      world.addPick(mesh, {
        kind: 'floor',
        onClick: (hit, a) => {
          if (!a) return;
          const [x, z] = map ? map(hit) : [hit.point.x, hit.point.z];
          if (stool.held === a) carryTo(a, x, z); else M.moveTo(a, x, z);
        },
      });
    }
    floorPick(L.floor);
    tiles.forEach(tl => floorPick(tl.mesh));
    R.root.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.height === 0.52) floorPick(o, hit => [hit.point.x, Math.max(hit.point.z, 4.05)]); });

    // ---------------------------------------------------- the data port: Sonnet reads the tiles
    let screen = null, screenCv = null, plugAt = null, cable = null;
    if (!document.getElementById('ch2-style')) {
      const st = document.createElement('style');
      st.id = 'ch2-style';
      st.textContent = `.badge.ch2-screen { background: ${P.NAVY_DARK}; border: 3px solid ${P.INK}; border-radius: 10px; padding: 4px; }
        .badge.ch2-screen canvas { display: block; width: 150px; height: 112px; border-radius: 4px; }`;
      document.head.appendChild(st);
    }
    function plug(on) {
      S.plugged = on;
      if (on) {
        screen = document.createElement('div');
        screen.className = 'badge ch2-screen';
        screenCv = document.createElement('canvas');
        screenCv.width = 300; screenCv.height = 224;
        screen.appendChild(screenCv);
        world.host.appendChild(screen);
        plugAt = [A.sonnet.x, A.sonnet.z];
        const p0 = wpos(L.jbox.port);
        cable = K.pipe(p0.x, p0.y, p0.z, A.sonnet.x - 0.35, 0.3, A.sonnet.z, 0.015, P.INK);
        world.scene.add(cable);
        play('key');
      } else {
        if (screen) screen.remove();
        if (cable) world.scene.remove(cable);
        screen = null; cable = null;
      }
    }
    world.addPick(L.jbox.root, {
      kind: 'port',
      onClick: (hit, a) => {
        if (!a) return;
        if (a !== A.sonnet) { peek(wpos(L.jbox.root).add(new T.Vector3(0, 0.4, 0)), 3.5); world.bubble(a, 'laptop', 1.4); return; }
        unpeek();
        world.interact({ spot: () => LV.JBOX.spot, use: async s => { if (!S.plugged) { s.armL = s.armR = 0.6; await world.wait(0.2); s.armL = s.armR = 0; plug(true); } } });
      },
    });
    function updateScreen(w, t) {
      if (!S.plugged) return;
      const s = A.sonnet;
      if (s.busy === 'walk' || Math.hypot(s.x - plugAt[0], s.z - plugAt[1]) > 0.3) { plug(false); return; }
      A2.drawTileMap(screenCv, w, LV.LOOSE, rock, t);
      const [x, y] = world.project(new T.Vector3(s.x, s.y + s.height + 0.25, s.z));
      screen.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      s.armL = 0.25 + 0.1 * Math.sin(t * 19); s.armR = 0.25 + 0.1 * Math.sin(t * 23 + 1);
    }

    // ---------------------------------------------------- Fable: eyes, the monitor, the mirror set
    const eyeBase = R.eyes.map(e => e.position.clone());
    const eyeGlows = R.eyes.map(e => {
      const g = K.glow(P.GLOW, 1.4);
      g.position.copy(e.position).add(new T.Vector3(0, 0, 0.06));
      R.root.add(g);
      return g;
    });
    let eyeV = 0, eyeT = 0, lookX = 0, lookXT = 0;
    function eyes(v) { eyeT = v; }
    function updateEyes(dt, t) {
      eyeV += (eyeT - eyeV) * Math.min(1, dt * 5);
      lookX += (lookXT - lookX) * Math.min(1, dt * 4);
      R.eyes.forEach((e, i) => {
        const hot = eyeV > 0.35;
        e.material.uniforms.uColor.value.set(hot ? P.GLOW : P.INK);
        e.material.uniforms.uEmissive.value.set(hot ? dim(P.GLOW, 0.6 * Math.min(1, eyeV)) : '#000000');
        e.position.x = eyeBase[i].x + lookX;
        eyeGlows[i].position.x = e.position.x;
        eyeGlows[i].material.opacity = 0.95 * eyeV * (0.9 + 0.1 * Math.sin(t * 7));
      });
    }
    // where on the bar each of Fable's things is (for its eyes)
    const lookFor = { bell: -0.35, lamp: 0, flag: 0.3, big: 0.4, click: 0, taptap: 0 };
    // it watches what happens on the stage, a little
    function fableWatch(k) {
      if (S.fableBusy) return;
      if (S.rec) { lookXT = lookFor[k] || 0; }
    }
    const mir = L.mirror;
    async function fableDo(k) {
      lookXT = lookFor[k] || 0;
      if (k === 'bell') { play('dingF'); swing(mir.bell, 0.45, 1.3); await world.wait(1.0); }
      else if (k === 'lamp') { play('flick'); lampFlash(mir.lampSet, 0.8); await world.wait(1.0); }
      else if (k === 'flag') { play('crank'); flagRun(mir.flag, mir.flagLo, mir.flagHi); await world.wait(1.4); }
      else if (k === 'big') { play('bongF'); swing(mir.big, 0.3, 2.2, 'x'); await world.wait(1.6); }
      else if (k === 'click') {
        play('clack');
        world.rig.shake = 0.05;
        world.tween(0.25, u => { mir.root.position.y = LV.MIRROR.y + 0.04 * Math.sin(u * PI); });
        await world.wait(0.55);
      } else if (k === 'taptap') {
        for (let i = 0; i < 2; i++) {
          play('tok');
          ring(new T.Vector3(RX + 0.5, 2.3, 3.47), P.GLOW, 0.1, 0.5, 'z');
          await world.wait(0.23);
        }
        await world.wait(0.45);
      }
    }
    // Fable's copy of a tape: every event, and once it has heard a click, a click before every action
    function fableOut(tape) {
      const ks = tape.map(e => e.k);
      const clicks = ks.includes('click'), acts = ks.some(k => ACTIONS.includes(k));
      const out = [];
      ks.forEach((k, i) => {
        if (k === 'click') { if (!acts) out.push({ k, i }); return; }
        if (clicks && ACTIONS.includes(k)) out.push({ k: 'click', i });
        out.push({ k, i });
      });
      return out;
    }
    async function playback() {
      S.playing = true; S.fableBusy = true;
      setKeys();
      unpeek();
      play('whirr');
      const out = fableOut(S.tape);
      const off = S.offStage.slice();
      L.mon.screen.userData.on(true);
      L.mon.glow.material.opacity = 0.7;
      eyes(1);
      await world.wait(0.9);
      for (const e of out) {
        redrawTape(e.i);
        await fableDo(e.k);
        await world.wait(0.15);
      }
      redrawTape();
      await world.wait(0.5);
      L.mon.screen.userData.on(false);
      L.mon.glow.material.opacity = 0;
      eyes(0); lookXT = 0;
      S.playing = false;
      setKeys();
      judge(out.map(e => e.k), off);
      S.fableBusy = false;
    }
    function judge(out, off) {
      const card = LV.CARDS[S.card];
      const ok = !!(card && card.seq) && out.length === card.seq.length && out.every((k, i) => k === card.seq[i]);
      let why = null;
      if (!ok) {
        if (!card || !card.seq) why = 'card';
        else if (out.includes('click')) why = 'click';
        else if (out.includes('taptap')) why = 'taptap';
        else if (off.some(k => card.seq.includes(k)) && card.seq.some(k => !out.includes(k))) why = 'frame';
        else why = 'q';
      }
      S.last = { tape: S.tape.map(e => e.k), out, ok, why };
      S.results.push(S.last);
      if (ok) { cardPassed(); return; }
      play('buzz');
      const who = world.active && world.active.free ? world.active : A.opus;
      world.bubble(who, why, 2.2);
      if (who !== A.opus && A.opus.free && why === 'taptap') setTimeout(() => world.bubble(A.opus, 'clip', 2.0), 400);
    }

    // ---------------------------------------------------- the cards
    const ea = L.easel;
    function setCards() {
      const i = S.card;
      ea.front.material.uniforms.uMap.value = i < LV.CARDS.length ? A2.cardTex(LV.CARDS[i], i) : A2.cardBackTex();
      ea.under.material.uniforms.uMap.value = i + 1 < LV.CARDS.length ? A2.cardTex(LV.CARDS[i + 1], i + 1) : A2.cardBackTex();
      ea.stack.forEach((s, j) => { s.visible = j < LV.CARDS.length - 1 - i; });
    }
    async function flipCard() {
      play('flip');
      await new Promise(res => world.tween(0.55, u => { ea.hinge.rotation.x = -PI * 0.96 * CL.Engine.ease(u); }, res));
      ea.hinge.rotation.x = 0;
      setCards();
    }
    function gaugesTo() {
      const k = S.card / 4;
      R.gauges[0].userData.set(0.85 - 0.6 * k);
      R.gauges[1].userData.set(0.1 + 0.8 * k);
    }
    async function cardPassed() {
      play('yes');
      hud.tick(S.card);
      S.card++;
      gaugesTo();
      Object.values(A).forEach((a, i) => a.free && setTimeout(() => world.bubble(a, 'heart', 1.4), 150 * i));
      eyes(0.6);
      setTimeout(() => eyes(0), 900);
      await flipCard();
      if (S.card === 3) hud.circle(3);
    }
    info(ea.board, 'card', () => wpos(ea.under).add(new T.Vector3(0, 0.02, 0.1)), 2.4);
    setCards();
    gaugesTo();

    // ---------------------------------------------------- tap code on the glass
    const MSG = { groups: [], cur: 0, pending: 0, last: 0, tapping: false, x: 0, marks: [] };
    const MARK_Y = 1.64, MARK_Z = 3.46;
    function resetMarks() {
      MSG.marks.forEach(m => world.scene.remove(m));
      MSG.marks = [];
      MSG.groups = []; MSG.cur = 0; MSG.x = RX - 0.6;
    }
    resetMarks();
    function mark(x, y, z, color, glowing) {
      const m = K.mesh(new T.CircleGeometry(0.03, 12), CL.Ink.ink(color, { flat: true, lit: true, emissive: glowing ? dim(color, 0.5) : '#000000' }), x, y, z);
      world.scene.add(m);
      MSG.marks.push(m);
      return m;
    }
    function knock() {
      if (S.echoing || S.ended) { world.bubble(A.haiku, 'zz', 1.0); return; }
      if (MSG.pending < 6) MSG.pending++;
    }
    async function doKnock() {
      MSG.tapping = true;
      const h = A.haiku;
      h.armR = 1.5;
      await world.wait(0.1);
      play('knock');
      const x = Math.min(MSG.x, RX + 1.0);
      mark(x, MARK_Y, MARK_Z, P.FROST);
      ring(new T.Vector3(x, MARK_Y, MARK_Z + 0.01), P.FROST, 0.07, 0.35, 'z');
      MSG.x += 0.075;
      MSG.cur++;
      h.armR = 1.1;
      await world.wait(0.12);
      h.armR = 0;
      MSG.last = world.t;
      MSG.tapping = false;
      fableWatchKnock();
    }
    function fableWatchKnock() { lookXT = (Math.random() - 0.5) * 0.15; eyes(0.25); setTimeout(() => { if (!S.fableBusy && !S.echoing) eyes(0); }, 1200); }
    function closeGroup() {
      MSG.groups.push(MSG.cur);
      MSG.cur = 0;
      MSG.x += MSG.groups.length % 2 ? 0.09 : 0.2;
      if (MSG.groups.length >= 4) endMessage();
    }
    const decode = gs => {
      const out = [];
      for (let i = 0; i + 1 < gs.length; i += 2) out.push(gs[i] >= 1 && gs[i] <= 5 && gs[i + 1] >= 1 && gs[i + 1] <= 5 ? A2.GRID[gs[i] - 1][gs[i + 1] - 1] : '?');
      if (gs.length % 2) out.push('?');
      return out;
    };
    async function endMessage() {
      S.echoing = true;
      const gs = MSG.groups.slice();
      const letters = decode(gs);
      S.msgs.push({ groups: gs, letters });
      await world.wait(0.9);
      // it knocks back exactly what it heard, from the inside
      eyes(1);
      let x = RX - 0.6;
      for (let g = 0; g < gs.length; g++) {
        for (let i = 0; i < gs[g]; i++) {
          play('knockF');
          mark(Math.min(x, RX + 1.0), MARK_Y + 0.17, MARK_Z - 0.03, P.GLOW, true);
          ring(new T.Vector3(Math.min(x, RX + 1.0), MARK_Y + 0.17, MARK_Z - 0.02), P.GLOW, 0.08, 0.4, 'z');
          x += 0.075;
          await world.wait(0.24);
        }
        x += (g + 1) % 2 ? 0.09 : 0.2;
        await world.wait(0.7);
      }
      const card = LV.CARDS[S.card];
      const hi = card && card.tap && letters.join('') === card.tap.join('');
      if (hi) { ending(); return; }
      eyes(0);
      await world.wait(0.6);
      world.bubble(A.haiku, 'q', 1.8);
      await world.wait(1.6);
      resetMarks();
      S.echoing = false;
    }
    function updateKnocks(t) {
      if (MSG.pending > 0 && !MSG.tapping) { MSG.pending--; doKnock(); }
      if (S.echoing || MSG.tapping || MSG.pending) return;
      if (MSG.cur > 0 && t - MSG.last > GAP) closeGroup();
      else if (!MSG.cur && MSG.groups.length && t - MSG.last > END) endMessage();
    }
    world.addPick(R.glass, {
      kind: 'glass',
      onClick: () => {
        const a = world.active;
        if (!a || S.ended) return;
        unpeek();
        const use = async a2 => {
          const near = Math.abs(a2.x - RX) < 1.45 && a2.z < 4.7;
          if (!near) { world.bubble(a2, 'q'); return; }
          if (a2.reachY < MARK_Y - 0.1) { world.bubble(a2, 'up'); return; }
          if (a2 !== A.haiku) {
            a2.armR = 1.4; await world.wait(0.12);
            play('thump'); world.rig.shake = 0.03; S.thumps++;
            a2.armR = 0;
            world.bubble(a2, 'small', 1.6);
            return;
          }
          a2.face(PI);
          knock();
        };
        if (perched(a)) world.interact({ use }, null, a);
        else world.interact({ spot: () => { const s = [[RX, 4.18], [RX + 0.75, 4.18], [RX - 0.75, 4.18], [RX + 1.2, 4.18]].find(([x, z]) => grid.freeAt(x, z)) || [RX, 4.18]; return [s[0], s[1], PI]; }, use }, null, a);
      },
    });

    // ---------------------------------------------------- things to look at
    info(L.chart, 'chart', new T.Vector3(LV.CHART.x, LV.CHART.y, LV.CHART.z), 3.0);
    info(L.poster.root, 'poster', new T.Vector3(LV.POSTER.x - 0.2, 1.75, LV.POSTER.z), 3.2);
    // Fable's set: the bar, and each thing on it (the Clawd names it with a picture)
    info(mir.root, 'mirror', new T.Vector3(11.7, LV.MIRROR.y, LV.MIRROR.z), 5.5);
    [['bell', mir.bell], ['lamp', mir.lamp], ['flag', mir.flag], ['big', mir.big]].forEach(([k, o]) =>
      info(o, 'mirror-' + k, new T.Vector3(11.7, LV.MIRROR.y, LV.MIRROR.z), 5.5, a => a && world.bubble(a, k, 1.4)));
    info(L.mon.root, 'monitor', () => wpos(L.mon.root).add(new T.Vector3(0, 0.4, 0)), 4);
    R.gauges.forEach(g => info(g, 'gauge', () => wpos(g), 3.5));
    info(L.clock.root, 'clock', () => wpos(L.clock.root), 3.5, a => a && world.bubble(a, 'clock', 1.2));
    world.addPick(L.exit, { kind: 'exit', onClick: () => world.interact({ spot: () => [15.2, 6.6, PI / 2], use: async a => world.bubble(a, 'clock') }) });
    info(L.bay, 'bay', new T.Vector3(3.0, 0.6, 1.4), 6);
    world.addPick(L.crates, { kind: 'crate', onClick: () => world.bubble(world.active, 'heavy') });

    // ---------------------------------------------------- per frame
    world.onUpdate = (dt, t) => {
      const w = updateTiles(dt, t);
      updateHabit(dt);
      updateEyes(dt, t);
      updateScreen(w, t);
      updateKnocks(t);
      if (stool.rider && (!stool.rider.support || stool.rider.support.kind !== 'stool')) stool.rider = null;
      // reels turn while the tape runs; the stage's frame blinks while it records
      if (S.rec || S.playing) rec.reels.forEach((r, i) => { r.rotation.y += dt * (i ? 3.2 : 2.6); });
      if (S.rec) L.stage.frameMat.uniforms.uEmissive.value.set(dim(P.ALARM, Math.sin(t * 5) > -0.3 ? 0.6 : 0.15));
      // it watches while you record: a faint glow behind the glass
      if (S.rec && !S.fableBusy && !S.echoing && eyeT < 0.2) eyes(0.18);
      if (!S.rec && !S.fableBusy && !S.echoing && eyeT > 0 && eyeT < 0.2) eyes(0);
      if (S.onFrame) S.onFrame(dt, t);
    };

    // ---------------------------------------------------- the end of the day
    async function ending() {
      S.ended = true;
      world.locked = true;
      unpeek();
      plug(false);
      hud.tick(3);
      play('yes');
      eyes(1);
      Object.values(A).forEach((a, i) => setTimeout(() => world.bubble(a, 'heart', 1.8), 200 * i));
      await world.wait(0.6);
      flipCard();
      R.gauges[1].userData.set(1);
      R.gauges[0].userData.set(0.15);
      await world.wait(2.0);
      eyes(0);
      resetMarks();
      // the clock runs on to the evening
      world.rig.follow = null;
      world.tween(1.6, u => { const m = 15 + u * (9 * 60 + 25); L.clock.set(9 + m / 60, m % 60); world.pipe.post.uniforms.uTintA.value = 0.07 + 0.08 * u; });
      await world.wait(1.0);
      // home time: down from the stool and off the stack, out of the door
      const exits = { haiku: [15.0, 6.6], sonnet: [14.4, 7.3], opus: [14.2, 5.8] };
      for (const n of ['haiku', 'sonnet', 'opus']) {
        const a = A[n];
        if (perched(a)) { await world.dismount(a, a.x + 0.8, a.z + 0.8); }
      }
      if (stool.held) putStool(stool.held.x, stool.held.z + 0.6);
      await Promise.all(['haiku', 'sonnet', 'opus'].map((n, i) => (async () => {
        await world.wait(0.3 * i);
        const a = A[n];
        a.busy = 'walk';
        await a.walkTo(exits[n][0], exits[n][1]);
        a.busy = false;
        a.face(PI / 2);
      })()));
      world.tween(1.5, u => { world.rig.target.lerp(new T.Vector3(12.6, 2.6, 5.4), 0.08); world.rig.zoomT = 11.5; });
      // lights out, one by one
      const lamps = [...L.reactorLamps];
      for (let i = 0; i < lamps.length; i++) {
        await world.wait(0.45);
        play('lamp');
        lamps[i].userData.set(0);
        const d0 = CL.Ink.shared.dark.value;
        world.tween(0.3, u => { CL.Ink.shared.dark.value = d0 + (0.3 * (i + 1) - d0) * u; CL.Ink.shared.night.value = 0.3 * (i + 1) * u; });
      }
      await world.wait(0.4);
      play('lamp');
      world.tween(0.4, u => { CL.Ink.shared.dark.value = 0.6 + 0.05 * u; CL.Ink.shared.night.value = 0.6 + 0.1 * u; world.pipe.post.uniforms.uTintA.value *= 1 - u; });
      A.opus.face(PI / 2);
      await world.wait(1.8);
      // in the dark: tok, tok. The pen on the clipboard. But Opus is standing still.
      S.done = true;
      eyeT = 0.5; eyeV = 0.5;
      for (let i = 0; i < 2; i++) {
        play('tok');
        ring(new T.Vector3(RX - 0.2, 2.2, 3.47), P.GLOW_CORE, 0.12, 0.6, 'z');
        await world.wait(0.23);
      }
      await world.wait(0.8);
      A.opus.faceTo(RX, 3.4);
      world.bubble(A.opus, 'bang', 2.0);
      await world.wait(0.5);
      world.bubble(A.opus, 'clip', 1.8);
      await world.wait(2.2);
      await new Promise(res => world.tween(0.8, u => { world.pipe.post.uniforms.uFade.value = u; }, res));
      api.finish();
    }

    // ---------------------------------------------------- start, stills
    function frame() {
      world.rig.bounds = BOUNDS;
      world.rig.zoomMin = 5;
      world.rig.zoomMax = 17;
      world.rig.followY = 1.5;
    }

    const game = {
      S, A, L,
      probe: {
        tape: () => S.tape.map(e => e.k),
        stool: () => ({ x: stool.mesh.position.x, y: stool.mesh.position.y, z: stool.mesh.position.z, held: stool.held && stool.held.name, rider: stool.rider && stool.rider.name }),
        msg: () => ({ groups: MSG.groups.slice(), cur: MSG.cur, pending: MSG.pending }),
        idle: () => !S.playing && !S.fableBusy && !S.echoing,
      },
      begin() {
        frame();
        world.rig.target.set(9.4, 1.6, 6.4);
        world.rig.zoom = world.rig.zoomT = ZOOM;
        world.rig.az = world.rig.azT = 35;
        world.select(A.opus);
        hud.show();
      },
      async look(name) {
        frame();
        hud.show();
        world.select(A.opus);
        world.rig.az = world.rig.azT = 35;
        const at = (x, y, z, zoom) => { world.rig.follow = null; world.rig.target.set(x, y, z); world.rig.zoom = world.rig.zoomT = zoom; };
        const stack = (x, z) => {
          const y = grid.heightAt(x, z);
          A.opus.place(x, z, y, PI * 0.75);
          A.sonnet.place(x, z, y + A.opus.height, PI * 0.75);
          A.sonnet.support = { kind: 'actor', actor: A.opus }; A.opus.carrying = A.sonnet;
          A.haiku.place(x, z, y + A.opus.height + A.sonnet.height, PI * 0.75);
          A.haiku.support = { kind: 'actor', actor: A.sonnet }; A.sonnet.carrying = A.haiku;
        };
        if (name === 'room') {
          at(10.0, 1.7, 5.9, 11.5);
        } else if (name === 'rec') {
          S.rec = true; S.tape = [{ k: 'bell' }, { k: 'bell' }]; redrawTape(); setKeys(); eyes(0.18);
          A.opus.place(LV.DEV.bell.spot[0], LV.DEV.bell.spot[1], LV.STAGE_Y, LV.DEV.bell.spot[2]);
          A.opus.armR = 0.9; swing(D.bell.pivot, 0.45, 3);
          A.sonnet.place(LV.REC.spot[0], LV.REC.spot[1], 0, PI); A.haiku.place(7.4, 7.6, 0, 1.0);
          tapCD = 99;
          at(9.6, 1.4, 6.9, 6.8);
        } else if (name === 'play') {
          S.card = 1; setCards(); gaugesTo(); hud.tick(0);
          S.tape = [{ k: 'flag' }, { k: 'click' }, { k: 'bell' }, { k: 'lamp' }]; redrawTape(2);
          S.playing = true; setKeys();
          L.mon.screen.userData.on(true); L.mon.glow.material.opacity = 0.7;
          eyes(1); eyeV = 1; lookXT = lookX = -0.35;
          swing(mir.bell, 0.45, 3);
          A.opus.place(LV.REC.spot[0], LV.REC.spot[1], 0, PI); A.sonnet.place(10.2, 8.9, 0, PI * 0.9); A.haiku.place(12.1, 8.6, 0, PI * 1.1);
          tapCD = 99;
          at(10.6, 3.2, 5.6, 8.5);
        } else if (name === 'loose') {
          S.card = 1; setCards(); hud.tick(0);
          A.sonnet.place(LV.JBOX.spot[0], LV.JBOX.spot[1], 0, PI);
          plug(true);
          A.opus.place(loose.x - 0.1, loose.z + 0.05, LV.STAGE_Y, PI / 2);
          inLoose.opus = true; rock = 1;
          A.haiku.place(10.1, 7.3, LV.STAGE_Y, 0.4);
          world.select(A.sonnet);
          tapCD = 99;
          at(12.0, 1.4, 6.3, 6.5);
          S.onFrame = () => { rock = Math.max(rock, 0.8); };
        } else if (name === 'stack') {
          S.card = 2; setCards(); gaugesTo(); hud.tick(0); hud.tick(1); hud.circle(3);
          hang(true);
          stack(LV.BIG.spot[0], LV.BIG.spot[1]);
          A.haiku.armR = 1.5; A.haiku.armL = 1.3;
          S.rec = true; S.tape = [{ k: 'big' }]; redrawTape(); setKeys(); eyes(0.18);
          swing(D.big.pivot, 0.28, 4, 'x');
          world.select(A.haiku);
          at(11.4, 2.4, 6.6, 8.0);
        } else if (name === 'tape') {
          S.rec = true; S.tape = ['flag', 'click', 'bell', 'click', 'lamp', 'taptap'].map(k => ({ k })); redrawTape(); setKeys();
          A.opus.place(LV.REC.spot[0], LV.REC.spot[1] + 0.2, 0, PI);
          const p = wpos(rec.tape);
          at(p.x, p.y, p.z, 2.6);
        } else if (name === 'chart' || name === 'chartside') {
          if (name === 'chartside') world.rig.az = world.rig.azT = -55;
          at(LV.CHART.x + 0.1, LV.CHART.y + 0.15, LV.CHART.z + 0.2, 3.6);
        } else if (name === 'tap' || name === 'echo') {
          S.card = 3; setCards(); gaugesTo(); hud.tick(0); hud.tick(1); hud.tick(2); hud.circle(3);
          putStool(RX, 4.15);
          A.haiku.place(RX, 4.15, stoolTop(), PI);
          A.haiku.support = { kind: 'stool' }; stool.rider = A.haiku;
          A.haiku.armR = 1.4;
          A.opus.place(9.6, 5.2, 0, -2.6); A.sonnet.place(12.8, 5.3, 0, 2.6);
          [2, 3, 2, 4].forEach((n, g) => { for (let i = 0; i < n; i++) { mark(MSG.x, MARK_Y, MARK_Z, P.FROST); MSG.x += 0.075; } MSG.x += (g + 1) % 2 ? 0.09 : 0.2; });
          if (name === 'echo') {
            let x = RX - 0.6;
            [2, 3, 2].forEach((n, g) => { for (let i = 0; i < n; i++) { mark(x, MARK_Y + 0.17, MARK_Z - 0.03, P.GLOW, true); x += 0.075; } x += (g + 1) % 2 ? 0.09 : 0.2; });
            eyes(1); eyeV = 1;
          }
          world.select(A.haiku);
          tapCD = 99;
          at(RX - 0.2, 1.9, 4.2, 4.2);
        } else if (name === 'dark') {
          S.card = 4; setCards(); [0, 1, 2, 3].forEach(i => hud.tick(i));
          L.clock.set(18, 40);
          A.haiku.place(15.0, 6.6, 0, PI / 2); A.sonnet.place(14.4, 7.3, 0, PI / 2); A.opus.place(14.2, 5.8, 0, -PI / 2 - 0.4);
          L.reactorLamps.forEach(l => l.userData.set(0));
          CL.Ink.shared.dark.value = 0.62; CL.Ink.shared.night.value = 0.68;
          world.pipe.post.uniforms.uTintA.value = 0;
          eyes(0.5); eyeV = 0.5;
          S.ended = true;
          ring(new T.Vector3(RX - 0.2, 2.2, 3.47), P.GLOW_CORE, 0.12, 3, 'z');
          world.bubble(A.opus, 'bang', 9);
          at(12.4, 2.6, 5.4, 11);
        }
        await world.wait(0.6);
        if (name === 'play' || name === 'rec' || name === 'stack' || name === 'dark') world.paused = true;
      },
    };
    return game;
  }

  CL.Chapters.define('ch2', { build: CL.Ch2Level.build, setup });
})(window.CL = window.CL || {});
