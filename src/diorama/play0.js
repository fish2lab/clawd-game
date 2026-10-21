/* Prologue rules: puzzle state, interactions, pressure, and the ending.
   See level0.js for the puzzle list. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const LV = CL.Level0;
  const S0 = CL.Sound;
  const PI = Math.PI;
  const play = n => S0.play(n);

  function setup(world, L, api) {
    const S = {
      opusOut: false, wiped: 0, main: false, thaw: 0, thawed: false, sonnetFree: false,
      wheelTaken: false, wheelOn: false, haikuFree: false, ended: false,
      pressure: { opus: 0, sonnet: 0, haiku: 0 }, shown: { opus: 0, sonnet: 0, haiku: 0, main: 0 },
    };
    const A = {
      opus: world.addActor('opus'),
      sonnet: world.addActor('sonnet'),
      haiku: world.addActor('haiku'),
    };
    const R = L.reactor;
    const grid = world.grid;

    // ---------------------------------------------------- start positions: everyone in their pod
    function seat(a, name) {
      const pd = L.pods[name];
      a.place(pd.x, pd.z, pd.seatY, 0);
      a.support = { kind: 'pod' };
    }
    seat(A.opus, 'opus');
    seat(A.sonnet, 'sonnet');
    seat(A.haiku, 'haiku');
    A.sonnet.free = false;
    A.haiku.free = false;
    A.sonnet.sleep = true;
    world.active = A.opus;

    // night until Opus is out
    CL.Ink.shared.dark.value = 0.5;
    CL.Ink.shared.night.value = 0.6;
    Object.values(L.pods).forEach(pd => pd.lamp.userData.set(0));
    L.reactorLamps.forEach(l => l.userData.set(0));

    // Sonnet's pod is iced over: a crust on the door and wheel
    const ice = new T.Group();
    const sp = L.pods.sonnet;
    for (let i = 0; i < 9; i++) {
      const s = 0.06 + 0.07 * CL.gfx.hash01('ice', i);
      const c = K.box(s * 1.6, s, s, '#E8F2FA', (CL.gfx.hash01('ix', i) - 0.5) * 0.8 * sp.k, (0.5 + 1.3 * CL.gfx.hash01('iy', i)) * sp.k, 0.1 * sp.k);
      c.rotation.z = CL.gfx.hash01('ir', i) * 2;
      ice.add(c);
    }
    sp.door.add(ice);

    // Haiku's pod has lost its wheel: a bare spindle
    const hp = L.pods.haiku;
    hp.wheel.visible = false;
    const spindle = K.cyl(0.02, 0.02, 0.1, P.INK, 0, 0, 0.0, 8);
    spindle.rotation.x = PI / 2;
    hp.wheelMount.add(spindle);

    // sonnet's laptop glows inside the pod once it thaws
    const screenGlow = K.glow(P.SCREEN, 0.9);
    screenGlow.position.set(sp.x, 0.95 * sp.k, sp.z + 0.3);
    world.scene.add(screenGlow);

    // ---------------------------------------------------- HUD
    const hud = api.hud({ todo: ['Exit pod', 'Wake Sonnet 5.5', 'Wake Haiku 5.5', 'Check on Fable 5.5'], actors: A });
    const { tick, circle, badge } = hud;
    const refreshHud = hud.refresh;

    // ---------------------------------------------------- steam puffs (white balls, inked by the post pass)
    const { puff, burst } = api.fx;

    // ---------------------------------------------------- what the Clawds can do (shared with every chapter)
    const M = CL.Moves.setup(world, A, {
      locked: a => {
        if (a === A.haiku && !S.haikuFree) { world.bubble(a, S.wheelOn ? 'zz' : 'eye'); return; }
        world.bubble(a, a === A.sonnet && !S.thawed ? 'frost' : 'zz');
      },
    });
    const { dist2, perched, inPod, dismount, moveTo, climbOnto, turnWheel, operate } = M;

    function openDoor(pd, phi) {
      play('burst');
      const h = pd.hinge;
      world.tween(0.45, u => { h.rotation.y = -phi * (1 - Math.pow(1 - u, 3)) * (1 + 0.15 * Math.sin(u * PI)); }, null);
      burst(pd.x, 1.2 * pd.k, pd.z + 0.7 * pd.k, 14, 1.2 * pd.k, 0.22 * pd.k);
      world.rig.shake = 0.06;
    }

    function free(a) {
      a.free = true;
      a.sleep = false;
      a.support = null;
      refreshHud();
    }

    async function hopOutOfPod(a, name, tx, tz) {
      const pd = L.pods[name];
      await a.hopTo(tx, tz, 0, 0.55);
      a.support = null;
      a.face(0);
    }

    // ---------------------------------------------------- picks
    M.floor(L.floor);
    // the plinth top counts as floor
    R.root.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.height === 0.52) M.floor(o, hit => [hit.point.x, Math.max(hit.point.z, 4.0)]); });
    M.actors();

    // the caster crate: anything in the room it can't roll through
    const crateObstacles = [
      [LV.LOCKER.x - 0.3, LV.LOCKER.z - 0.55, LV.LOCKER.x + 0.3, LV.LOCKER.z + 0.55],
      [LV.COL_X - 0.42, 0, LV.COL_X + 0.42, 0.5], [0, 1.8, 1.0, 4.75], [LV.RX - 4.15, 0, LV.RX + 4.15, 4.4],
      [14.45, 7.5, 15.35, 9.35], [13.0, 8.7, 13.8, 9.5],
    ];
    const crate = M.pushable(L.crate, {
      fits: (x, z) => {
        const h = 0.45;
        for (const [x0, z0, x1, z1] of crateObstacles) if (x + h > x0 && x - h < x1 && z + h > z0 && z - h < z1) return false;
        for (const c of Object.values(LV.PODS)) if (Math.hypot(x - c.x, z - c.z) < 0.98 * c.k + 0.5) return false;
        return true;
      },
    });


    // Opus pod: frost (drag to wipe) and the wheel, from the inside
    const op = L.pods.opus;
    world.addPick([op.wheel, op.door], {
      kind: 'wheel',
      onClick: () => {
        const a = world.active;
        if (S.opusOut) { world.bubble(a, 'zz'); return; }
        world.interact({ use: async a2 => {
          if (S.wiped < 0.45) { world.bubble(a2, 'eye'); return; }
          await turnWheel(a2, op.wheel, 2);
          openDoor(op, 2.05);
          await world.wait(0.25);
          await hopOutOfPod(a2, 'opus', op.x - 0.15, op.z + 1.5);
          S.opusOut = true;
          free(a2);
          tick(0);
          lightsOn();
        } }, null, A.opus);
      },
    });

    // registered after the door so the frost keeps its own drag handler
    world.addPick(op.frostMesh, {
      kind: 'frost',
      enabled: () => !S.opusOut,
      drag: (hit, phase) => {
        if (!hit || !hit.uv || S.opusOut) return;
        const c = op.frost.wipe(hit.uv.x, hit.uv.y, 0.16);
        S.wiped = c;
        if (phase === 'start') play('melt');
        A.opus.look = [(hit.uv.x - 0.5) * 2, (hit.uv.y - 0.5) * 2];
      },
      onClick: hit => { if (hit.uv && !S.opusOut) { S.wiped = op.frost.wipe(hit.uv.x, hit.uv.y, 0.2); play('melt'); } },
    });
    async function lightsOn() {
      world.rig.zoomT = 12.5;
      world.rig.followY = 1.6;
      world.rig.follow = world.active;
      const lamps = [L.pods.opus.lamp, L.pods.sonnet.lamp, L.pods.haiku.lamp, ...L.reactorLamps];
      for (let i = 0; i < lamps.length; i++) {
        await world.wait(0.35);
        play('lamp');
        lamps[i].userData.set(1);
        const d0 = CL.Ink.shared.dark.value;
        world.tween(0.3, u => { CL.Ink.shared.dark.value = d0 - (d0 - 0.5 * (1 - (i + 1) / lamps.length)) * u; });
      }
      world.tween(0.6, u => { CL.Ink.shared.dark.value *= 1 - u; CL.Ink.shared.night.value *= 1 - u; });
    }

    // Sonnet pod
    world.addPick([sp.door, sp.wheel], {
      kind: 'door',
      onClick: () => {
        if (S.sonnetFree) { world.bubble(world.active, 'zz'); return; }
        world.interact({
          spot: () => [sp.x - 0.05, sp.z + 0.76 * 1 + 0.55, PI],
          use: async a => {
            if (!S.thawed) { play('dull'); world.bubble(a, 'frost'); return; }
            if (a.reachY < 0.56 * 0.78 + 0.1) { world.bubble(a, 'up'); return; }
            await turnWheel(a, sp.wheel, 1.5);
            openDoor(sp, 2.0);
            A.sonnet.sleep = false;
            await world.wait(0.3);
            await hopOutOfPod(A.sonnet, 'sonnet', sp.x + 0.4, sp.z + 1.45);
            free(A.sonnet);
            S.sonnetFree = true;
            screenGlow.material.opacity = 0;
            badge(A.sonnet, '✓ TESTS PASS', 2.2);
            play('chime');
            tick(1);
          },
        }, null, world.active);
      },
    });

    // Haiku pod
    world.addPick([hp.door, hp.wheelMount], {
      kind: 'door',
      onClick: () => {
        if (S.haikuFree) { world.bubble(world.active, 'zz'); return; }
        world.interact({
          spot: () => [hp.x + 0.05, hp.z + 0.55 + 0.55, PI],
          use: async a => {
            if (!S.wheelOn) {
              if (a.holding) {
                play('clunk');
                a.holding.removeFromParent();
                a.holding = null;
                hp.wheel.visible = true;
                spindle.visible = false;
                S.wheelOn = true;
                world.bubble(A.haiku, 'heart');
                return;
              }
              play('dull');
              world.bubble(a, 'wheel');
              setTimeout(() => world.bubble(A.haiku, 'eye', 1.8), 500);
              return;
            }
            await turnWheel(a, hp.wheel, 1);
            openDoor(hp, 2.2);
            await world.wait(0.15);
            await haikuDash();
          },
        }, null, world.active);
      },
    });

    async function haikuDash() {
      const h = A.haiku;
      S.haikuFree = true;
      play('whoosh');
      h.support = null;
      h.spec = Object.assign({}, h.spec, { speed: 9 });
      await h.hopTo(hp.x + 0.2, hp.z + 1.2, 0, 0.25);
      const lap = [[6.6, 5.2], [10.5, 5.4], [13.6, 6.2], [12.6, 8.6], [7.5, 8.9], [3.6, 7.6], [3.0, 4.8], [4.9, 3.6]];
      for (const [x, z] of lap) { h.path = [[x, z]]; await new Promise(res => { h.onArrive = res; }); }
      h.spec = CL.Engine.SPECS.haiku;
      h.face(0);
      h.armR = 1.5;
      world.bubble(h, 'heart');
      play('chime');
      await world.wait(0.8);
      h.armR = 0;
      free(h);
      tick(2);
      circle(3);
      await world.wait(0.6);
      play('thud');
      world.rig.shake = 0.12;
      Object.values(A).forEach(a => a.free && world.bubble(a, 'bang', 1.2));
    }

    // locker + the wheel on top
    world.addPick(L.locker, { kind: 'locker', onClick: () => world.interact({ spot: () => [LV.LOCKER.x + 0.95, LV.LOCKER.z, -PI / 2], use: async a => { play('dull'); world.bubble(a, 'lock'); } }) });
    world.addPick(L.looseWheel, {
      kind: 'item',
      enabled: () => !S.wheelTaken,
      onClick: () => {
        const a = world.active;
        if (!a) return;
        const wx = L.looseWheel.position.x, wz = L.looseWheel.position.z, wy = L.looseWheel.position.y;
        const tryTake = async a2 => {
          if (dist2(a2, wx, wz) > 1.25 || a2.reachY < wy - 0.05) { world.bubble(a2, 'up'); return; }
          play('click');
          S.wheelTaken = true;
          const w = L.looseWheel;
          w.removeFromParent();
          const arm = a2.model.arms[1];
          arm.add(w);
          w.position.set(0.12 * a2.spec.W, 0.05, 0.12);
          w.rotation.set(0, 0, 0);
          a2.holding = w;
          a2.armR = 0.6;
          world.bubble(a2, 'ok');
        };
        if (perched(a)) world.interact({ use: tryTake }, null, a);
        else world.interact({ spot: () => [LV.LOCKER.x + 0.95, LV.LOCKER.z, -PI / 2], use: tryTake }, null, a);
      },
    });

    // crate
    // valve block + main valve. The valves only change state here; onUpdate moves the
    // levers and the stem to match, so what you see is always what the pipes do.
    Object.values(L.valves).forEach(v => {
      world.addPick([v.lever, v.body], {
        kind: 'valve',
        onClick: () => world.interact({
          spot: () => [1.5, v.z, -PI / 2],
          use: async a => {
            if (a.reachY < v.y - 0.02) { world.bubble(a, 'up'); return; }
            v.open = !v.open;
            await operate(a, 0.45);
            play('clunk');
            if (S.main && v.open) play('hiss');
          },
        }),
      });
      world.addPick(v.gauge, { kind: 'gauge', onClick: () => world.bubble(world.active, 'eye') });
    });
    world.addPick(L.main.mesh, {
      kind: 'valve',
      onClick: () => world.interact({
        spot: () => [1.45, LV.MAIN.z + 0.4, -1.9],
        use: async a => {
          if (a.reachY < LV.MAIN.y - 0.02) { world.bubble(a, 'up'); return; }
          S.main = !S.main;
          await operate(a, 0.9);
          play(S.main ? 'hiss' : 'clunk');
          if (S.main) burst(LV.MAIN.x + 0.3, LV.MAIN.y + 0.3, LV.MAIN.z, 6, 0.5, 0.12);
        },
      }),
    });

    // reactor: the porthole, the sign, gauges, ladder
    world.addPick(R.glass, {
      kind: 'glass',
      onClick: () => {
        const a = world.active;
        if (!a || S.ended) return;
        const use = async a2 => {
          const near = Math.abs(a2.x - LV.RX) < 1.4 && a2.z < 4.6;
          if (!near) { world.bubble(a2, 'q'); return; }
          if (a2.reachY < 1.4) { world.bubble(a2, 'up'); return; }
          if (a2 !== A.haiku || a2.reachY < 2.6) { play('dull'); world.bubble(a2, 'q'); return; }
          ending();
        };
        if (perched(a)) world.interact({ use }, null, a);
        else world.interact({ spot: () => [LV.RX, 4.1, PI], use }, null, a);
      },
    });
    world.addPick(R.sign, { kind: 'sign', onClick: () => world.interact({ spot: () => [LV.RX + 2.88, 4.4, PI], use: async a => world.bubble(a, 'bang') }) });
    // the stacking placard under it: the Clawd that reads it thinks of a stack
    world.addPick(L.hanoi, { kind: 'sign', onClick: () => world.interact({ spot: () => [LV.RX + 2.88, 4.4, PI], use: async a => world.bubble(a, 'stack', 2.2) }) });
    R.gauges.forEach(gg => world.addPick(gg, { kind: 'gauge', onClick: () => world.bubble(world.active, 'eye') }));
    world.addPick(L.clutter, { kind: 'clutter', onClick: () => world.bubble(world.active, 'heavy') });
    world.addPick(L.exit, { kind: 'exit', onClick: () => world.interact({ spot: () => [15.2, 6.6, PI / 2], use: async a => { play('dull'); world.bubble(a, 'lock'); } }) });
    world.addPick(L.clock.root, { kind: 'clock', onClick: () => world.bubble(world.active, 'zz') });

    // ---------------------------------------------------- per-frame rules
    world.onUpdate = (dt, t) => {
      // pressure: one main valve, split between the open branches
      const open = Object.values(L.valves).filter(v => v.open);
      const per = S.main && open.length ? 1 / open.length : 0;
      S.pressure.sonnet = L.valves.A.open ? per : 0;
      S.pressure.opus = L.valves.B.open ? per : 0;
      S.pressure.haiku = L.valves.C.open ? per : 0;
      ['opus', 'sonnet', 'haiku'].forEach(n => {
        S.shown[n] += (S.pressure[n] - S.shown[n]) * Math.min(1, dt * 2.5);
        L.pods[n].gauge.userData.set(0.08 + 0.9 * S.shown[n] + 0.02 * Math.sin(t * 9) * S.shown[n]);
      });
      S.shown.main += ((S.main ? 1 : 0) - S.shown.main) * Math.min(1, dt * 2.5);
      // levers swing to match their valve; the main stem rises as its wheel spins
      Object.values(L.valves).forEach(v => {
        const to = v.open ? 0 : PI / 2;
        v.lever.rotation.x += (to - v.lever.rotation.x) * Math.min(1, dt * 9);
        v.gauge.userData.set(0.05 + 0.9 * S.shown[v.pod] + 0.02 * Math.sin(t * 9) * S.shown[v.pod]);
      });
      const st = L.main.stem, sTo = S.main ? 0.5 : 0.06;
      const ds = (sTo - st.scale.y) * Math.min(1, dt * 2.2);
      st.scale.y += ds;
      L.main.mesh.rotation.z += ds * 14;
      // a live branch weeps steam at its joints, so its route can be followed
      ['A', 'B', 'C'].forEach(id => {
        const pr = S.pressure[L.valves[id].pod];
        if (pr < 0.01 || Math.random() > dt * 5 * pr) return;
        const ws = L.weeps[id].filter(w => L.pipeGroups[w.wall].visible);
        if (!ws.length) return;
        const w = ws[Math.floor(Math.random() * ws.length)].p;
        puff(w[0] + 0.05, w[1] + 0.05, w[2] + 0.05, (Math.random() - 0.3) * 0.2, 0.35, (Math.random() - 0.3) * 0.2, 0.05 + 0.04 * pr, 0.7);
      });
      // Sonnet's ice only gives at full pressure
      // some steam reaches the ice: it hisses, but it takes full pressure to melt it
      if (!S.thawed && S.pressure.sonnet > 0.01 && S.pressure.sonnet <= 0.95 && Math.random() < dt * 4 * S.pressure.sonnet) {
        puff(sp.x + (Math.random() - 0.5) * 0.4, 1.9 * sp.k, sp.z + 0.6 * sp.k, 0, 0.25, 0.2, 0.05, 0.5);
      }
      if (!S.thawed && S.pressure.sonnet > 0.95) {
        S.thaw += dt / 2.2;
        ice.children.forEach((c, i) => { c.scale.setScalar(Math.max(0.01, 1 - S.thaw * (1 + i * 0.1))); });
        if (Math.random() < dt * 6) puff(sp.x + (Math.random() - 0.5) * 0.5, 1.2 * sp.k, sp.z + 0.7 * sp.k, 0, 0.6, 0.3, 0.1, 0.8);
        if (S.thaw >= 1) {
          S.thawed = true;
          ice.visible = false;
          sp.frost.clear();
          play('melt');
          burst(sp.x, 1.3 * sp.k, sp.z + 0.6 * sp.k, 10, 0.8, 0.16);
          A.sonnet.sleep = false;
        }
      }
      // steam escapes the empty pod and rattles Haiku's
      if (S.opusOut && S.pressure.opus > 0.01 && Math.random() < dt * 10 * S.pressure.opus) {
        puff(op.x + (Math.random() - 0.5) * 0.6, 1.1 + Math.random() * 0.6, op.z + 0.9, (Math.random() - 0.5) * 0.4, 0.5, 0.6, 0.12, 1.1);
      }
      if (!S.haikuFree) {
        const amp = (0.25 + 1.6 * S.pressure.haiku) * (0.6 + 0.4 * Math.max(0, Math.sin(t * 5)));
        hp.root.position.x = hp.x + 0.012 * Math.sin(t * 57) * amp;
        hp.root.rotation.z = 0.03 * Math.sin(t * 43) * amp;
        A.haiku.x = hp.x + 0.012 * Math.sin(t * 57) * amp;
        // Haiku keeps looking at its wheel
        if (!S.wheelTaken) {
          const lx = L.looseWheel.position.x - hp.x;
          A.haiku.look = [Math.max(-1, lx / 3), 0.6];
        } else A.haiku.look = [0, 0];
      } else {
        hp.root.position.x = hp.x;
        hp.root.rotation.z = 0;
      }
      // sonnet types inside its pod once thawed
      if (!S.sonnetFree && S.thawed) {
        A.sonnet.armL = 0.3 + 0.15 * Math.sin(t * 20);
        A.sonnet.armR = 0.3 + 0.15 * Math.sin(t * 23 + 1);
        screenGlow.material.opacity = 0.5 + 0.2 * Math.sin(t * 13);
      }
      if (S.onFrame) S.onFrame(dt, t);
    };

    // ---------------------------------------------------- the ending
    async function ending() {
      S.ended = true;
      world.locked = true;
      const h = A.haiku;
      world.rig.follow = null;
      world.tween(1.2, u => {
        world.rig.target.lerp(new T.Vector3(LV.RX, 2.6, 4.2), u * 0.12);
        world.rig.zoomT = 8.5;
      });
      for (let i = 0; i < 3; i++) {
        h.armR = 1.5;
        play('tap');
        tapRing(LV.RX, 2.7);
        await world.wait(0.16);
        h.armR = 1.1;
        await world.wait(0.16);
      }
      h.armR = 0;
      await world.wait(0.9);
      // the eyes
      const eyeGlows = R.eyes.map(e => {
        const g = K.glow(P.GLOW, 1.6);
        g.position.copy(e.getWorldPosition(new T.Vector3())).add(new T.Vector3(0, 0, 0.05));
        world.scene.add(g);
        return g;
      });
      const flick = [0, 0.65, 0.1, 0, 0.85, 0.3, 1];
      for (const v of flick) {
        R.eyes.forEach(e => { e.material.uniforms.uColor.value.set(v > 0.5 ? P.GLOW : P.INK); e.material.uniforms.uEmissive.value.set(v > 0.5 ? '#FF9A3A' : '#000000'); });
        eyeGlows.forEach(g => { g.material.opacity = v; });
        await world.wait(0.05);
      }
      Object.values(A).forEach(a => world.bubble(a, 'bang', 1.4));
      const pipe = world.pipe.post.uniforms;
      let alarmOn = true;
      (async () => { while (alarmOn) { play('alarm'); await world.wait(0.8); } })();
      S.onFrame = (dt, t) => {
        pipe.uTintA.value = alarmOn ? 0.12 + 0.1 * Math.sin(t * 8.8) : pipe.uTintA.value;
        R.beacon.material.uniforms.uEmissive.value.set(Math.sin(t * 8.8) > 0 ? '#E8463A' : '#000000');
      };
      await world.wait(1.1);
      // three hits
      const crackCanvas = document.createElement('canvas');
      crackCanvas.width = crackCanvas.height = 512;
      const crackTex = new T.CanvasTexture(crackCanvas);
      const crack = K.decal(4.0, 4.0, crackTex, { useAlpha: true, depthWrite: false });
      crack.position.set(LV.RX, R.PC.y, R.PC.z + 0.07);
      crack.renderOrder = 3;
      world.scene.add(crack);
      const drawCrack = lvl => {
        const c = crackCanvas.getContext('2d');
        c.clearRect(0, 0, 512, 512);
        const g = new CL.gfx.G(c, 512, 512, new CL.gfx.Cam(CL.Lab.PORT_C[0], CL.Lab.PORT_C[1], 4.0));
        g.zoomk = 1.6;
        g.beginWorld();
        CL.Lab.drawCracks(g, lvl);
        g.end();
        crackTex.needsUpdate = true;
      };
      for (let i = 0; i < 3; i++) {
        await new Promise(res => world.tween(0.35, u => { R.face.position.z = R.PC.z - 0.6 + 0.5 * u * u; R.eyes.forEach(e => { e.position.z = R.face.position.z + 0.02; }); }, res));
        play('thud');
        world.rig.shake = 0.18 + 0.08 * i;
        drawCrack(i + 1);
        if (i >= 1) popBolt(i === 1 ? 5 : 11);
        Object.values(A).forEach(a => { a.extraTilt = (Math.random() - 0.5) * 16; });
        await new Promise(res => world.tween(0.45, u => { R.face.position.z = R.PC.z - 0.1 - 0.5 * u; R.eyes.forEach(e => { e.position.z = R.face.position.z + 0.02; }); Object.values(A).forEach(a => { a.extraTilt *= 0.9; }); }, res));
      }
      // the stack comes apart
      const spots = [[LV.RX - 2.2, 5.6], [LV.RX - 3.4, 6.3], [LV.RX + 2.6, 6.0]];
      [A.haiku, A.sonnet, A.opus].forEach((a, i) => {
        if (a.support && a.support.kind === 'actor') a.support.actor.carrying = null;
        a.carrying = null;
        a.support = null;
        a.hopTo(spots[i][0], spots[i][1], 0, 0.6);
        world.tween(0.6, u => { a.extraTilt = 360 * u * (i % 2 ? 1 : -1); }, () => { a.extraTilt = 0; });
      });
      await world.wait(0.6);
      // it gets out
      play('shatter');
      crack.visible = false;
      R.glass.visible = false;
      shards();
      const big = K.clawd(CL.Clawd.CS({ W: 4.8 }));
      big.root.position.set(LV.RX, 0.6, R.PC.z - 1.2);
      world.scene.add(big.root);
      const bigGlows = big.eyes.map(e => { const g = K.glow(P.GLOW, 1.4); g.material.opacity = 1; e.add(g); g.position.z = 0.05; return g; });
      big.eyes.forEach(e => { e.material.uniforms.uColor.value.set(P.GLOW); e.material.uniforms.uEmissive.value.set('#FF9A3A'); });
      R.face.visible = false;
      R.eyes.forEach(e => { e.visible = false; });
      eyeGlows.forEach(g => { g.visible = false; });
      const pool = K.mesh(new T.CircleGeometry(1, 40), CL.Ink.ink(P.MURK_LIGHT, { flat: true, opacity: 0.92 }), LV.RX, 0.6, 5.0);
      pool.rotation.x = -PI / 2;
      world.scene.add(pool);
      world.rig.shake = 0.35;
      await new Promise(res => world.tween(0.9, u => {
        big.root.position.z = R.PC.z - 1.2 + 3.0 * u;
        big.root.position.y = 0.6 + 1.2 * Math.sin(u * PI * 0.8);
        big.root.rotation.x = -0.25 * Math.sin(u * PI);
        big.setPose({ armL: 1.3 * u, armR: 1.1 * u, tilt: -6 * u });
        pool.scale.setScalar(0.5 + 4.5 * u);
      }, res));
      alarmOn = false;
      await world.wait(0.25);
      await new Promise(res => world.tween(0.5, u => { pipe.uFade.value = u; }, res));
      api.finish();
    }

    function tapRing(x, y) {
      const ring = K.mesh(new T.TorusGeometry(0.2, 0.015, 6, 32), CL.Ink.ink('#FFFFFF', { flat: true, lit: true }), x, y, R.PC.z + 0.12);
      ring.layers.set(1);
      world.scene.add(ring);
      world.tween(0.45, u => { ring.scale.setScalar(1 + 3 * u); ring.material.uniforms.uOpacity.value = 1 - u; ring.material.transparent = true; }, () => world.scene.remove(ring));
    }

    function popBolt(i) {
      const b = R.bolts[i];
      const p0 = b.position.clone();
      const v = new T.Vector3((Math.random() - 0.5) * 3, 3, 2.5);
      world.tween(0.9, u => {
        b.position.set(p0.x + v.x * u, p0.y + v.y * u - 6 * u * u, p0.z + v.z * u);
        b.rotation.z += 0.4;
      });
    }

    function shards() {
      for (let i = 0; i < 40; i++) {
        const s = 0.1 + Math.random() * 0.3;
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute([-s, -s * 0.3, 0, s * 0.8, -s * 0.5, 0, s * 0.2, s * 0.7, 0], 3));
        g.computeVertexNormals();
        const m = new T.Mesh(g, CL.Ink.ink('#DDE6F2', { flat: true, side: T.DoubleSide, lit: true }));
        const a = Math.random() * PI * 2, r = Math.random() * 1.8;
        m.position.set(LV.RX + Math.cos(a) * r, R.PC.y + Math.sin(a) * r, R.PC.z + 0.1);
        world.scene.add(m);
        const v = new T.Vector3(Math.cos(a) * 3 * Math.random(), Math.sin(a) * 2 + 1.5, 3 + Math.random() * 3);
        const spin = new T.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
        world.tween(1.2, u => {
          m.position.addScaledVector(v, 0.016);
          v.y -= 0.12;
          if (m.position.y < 0.05) { m.position.y = 0.05; v.multiplyScalar(0.3); }
          m.rotation.x += spin.x * 0.016; m.rotation.y += spin.y * 0.016;
        });
      }
    }

    // ---------------------------------------------------- start
    function frameRoom() {
      world.rig.bounds = [3.5, 12.5, 3.0, 7.0];
      world.rig.zoomMin = 6;
      world.rig.zoomMax = 18;
    }

    const game = {
      S, A, L, crateFits: (x, z, skip) => crate.fits(x, z, skip),
      probe: {
        crate: () => [crate.mesh.position.x, crate.mesh.position.z],
        valves: () => Object.fromEntries(Object.entries(L.valves).map(([k, v]) => [k, v.open])),
      },
      begin() {
        frameRoom();
        world.rig.target.set(op.x + 0.2, 1.5, op.z + 0.6);
        world.rig.zoom = world.rig.zoomT = 5.2;
        world.rig.az = world.rig.azT = 20;
        world.select(A.opus);
        world.rig.follow = null;
        hud.show();
        // after the first exit the camera settles into the 35-degree diorama view
        const iv = setInterval(() => { if (S.opusOut) { world.rig.azT = 35; clearInterval(iv); } }, 200);
      },
      // posed stills for screenshots
      async look(name) {
        frameRoom();
        hud.show();
        const wakeAll = () => {
          S.opusOut = S.thawed = S.sonnetFree = S.haikuFree = S.wheelOn = true;
          ['opus', 'sonnet', 'haiku'].forEach(n => { L.pods[n].hinge.rotation.y = -2.0; });
          ice.visible = false; sp.frost.clear(); op.frost.clear();
          hp.wheel.visible = true; spindle.visible = false;
          Object.values(A).forEach(free);
          Object.values(L.pods).forEach(pd => pd.lamp.userData.set(1));
          L.reactorLamps.forEach(l => l.userData.set(1));
          CL.Ink.shared.dark.value = 0;
          CL.Ink.shared.night.value = 0;
          tick(0); tick(1); tick(2); circle(3);
        };
        if (name === 'start') {
          world.rig.target.set(op.x + 0.2, 1.5, op.z + 0.6);
          world.rig.zoom = world.rig.zoomT = 5.2;
          world.rig.az = world.rig.azT = 20;
          op.frost.wipe(0.42, 0.45, 0.22); op.frost.wipe(0.55, 0.5, 0.2);
          A.opus.look = [0.4, 0.2];
          world.select(A.opus);
        } else if (name === 'room') {
          wakeAll();
          A.opus.place(4.3, 4.6, 0, 0.5);
          A.sonnet.place(5.6, 5.4, 0, -0.3);
          A.haiku.place(8.4, 5.8, 0, 0.8);
          S.main = true; L.valves.B.open = false; L.valves.C.open = true;
          world.select(A.opus);
          world.rig.target.set(7.6, 1.6, 4.6);
          world.rig.zoom = world.rig.zoomT = 14.5;
        } else if (name === 'steam') {
          S.opusOut = true; free(A.opus);
          op.hinge.rotation.y = -2.05; op.frost.clear();
          Object.values(L.pods).forEach(pd => pd.lamp.userData.set(1));
          L.reactorLamps.forEach(l => l.userData.set(1));
          CL.Ink.shared.dark.value = 0;
          CL.Ink.shared.night.value = 0;
          tick(0);
          S.main = true;
          A.opus.place(1.5, 3.1, 0, -PI / 2);
          A.opus.armR = 1.2;
          world.select(A.opus);
          world.rig.target.set(2.6, 2.8, 2.6);
          world.rig.zoom = world.rig.zoomT = 8.0;
          world.rig.az = world.rig.azT = 35;
        } else if (name === 'locker') {
          wakeAll();
          crate.setAt(1.3, 6.0);
          A.opus.heading = -PI / 2;
          crate.seat(A.opus);
          A.sonnet.place(1.3, 6.0, 0.9 + A.opus.height, -PI / 2);
          A.sonnet.support = { kind: 'actor', actor: A.opus }; A.opus.carrying = A.sonnet;
          A.sonnet.armR = 1.5;
          A.haiku.place(3.2, 6.6, 0, -1.2);
          S.wheelOn = false; S.haikuFree = false; A.haiku.free = true;
          world.select(A.sonnet);
          world.rig.target.set(2.2, 2.0, 6.0);
          world.rig.zoom = world.rig.zoomT = 7.5;
          world.rig.az = world.rig.azT = 35;
        } else if (name === 'stack') {
          wakeAll();
          A.opus.place(LV.RX, 4.1, 0.56, PI);
          A.sonnet.place(LV.RX, 4.1, 0.56 + A.opus.height, PI);
          A.sonnet.support = { kind: 'actor', actor: A.opus }; A.opus.carrying = A.sonnet;
          A.haiku.place(LV.RX, 4.1, 0.56 + A.opus.height + A.sonnet.height, PI);
          A.haiku.support = { kind: 'actor', actor: A.sonnet }; A.sonnet.carrying = A.haiku;
          A.haiku.armR = 1.4;
          world.select(A.haiku);
          world.rig.target.set(LV.RX, 2.8, 4.2);
          world.rig.zoom = world.rig.zoomT = 8.5;
          world.rig.az = world.rig.azT = 35;
        } else if (name === 'eyes' || name === 'hits' || name === 'breakout') {
          wakeAll();
          A.opus.place(LV.RX, 4.1, 0.56, PI);
          A.sonnet.place(LV.RX, 4.1, 0.56 + A.opus.height, PI);
          A.sonnet.support = { kind: 'actor', actor: A.opus }; A.opus.carrying = A.sonnet;
          A.haiku.place(LV.RX, 4.1, 0.56 + A.opus.height + A.sonnet.height, PI);
          A.haiku.support = { kind: 'actor', actor: A.sonnet }; A.sonnet.carrying = A.haiku;
          world.select(A.haiku);
          world.rig.target.set(LV.RX, 2.8, 4.2);
          world.rig.zoom = world.rig.zoomT = 8.5;
          world.rig.az = world.rig.azT = 35;
          refreshHud();
          ending();
          await world.wait({ eyes: 3.2, hits: 5.6, breakout: 7.35 }[name]);
          world.paused = true;
          return;
        } else if (name === 'back') {
          wakeAll();
          A.opus.place(4.3, 4.6, 0, 0.5);
          A.sonnet.place(5.6, 5.4, 0, -0.3);
          A.haiku.place(8.4, 5.8, 0, 0.8);
          world.select(A.opus);
          world.rig.target.set(8, 2, 5);
          world.rig.zoom = world.rig.zoomT = 15;
          world.rig.az = world.rig.azT = 125;
        }
        world.rig.follow = null;
        refreshHud();
        await world.wait(0.6);
      },
    };
    return game;
  }

  CL.Play0 = { setup };
  CL.Chapters.define('prologue', { build: CL.Level0.build, setup });
})(window.CL = window.CL || {});
