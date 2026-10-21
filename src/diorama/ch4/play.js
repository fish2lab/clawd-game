/* Chapter 4 · 蒸馏 — the rules. See level.js for the room and docs/chapters/ch4.md
   for the puzzle chain.

   Systems: water level, faders, temperature.
     - Ring the bell: the whale sings its five notes (the lit tubes), the fish sings
       back what its faders say (the orange collars), the whale swallows the fish and
       spouts it up. How high: how well the fish's song matches the whale's, but never
       higher than the water allows. Each spout uses water.
     - T (temperature) only changes what you can see and hear: at T 1 only the loudest
       note shows; turned up, the quiet ones come out (dark knowledge). The match is
       always against the whole song.
     - The communicating pipe refills the tank from the condensate tank under the
       reactor, but only with both its valves open: the inlet at the tank and the one
       under the reactor (only Haiku fits the hatch). The drain empties the tank.
     - The still: its T knob changes what Sonnet's laptop reads at the reactor's data
       port; its five condenser valves are what Haiku learns. Haiku sits in its pod. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const X = CL.gfx;
  const A4 = CL.Ch4Art;
  const C = CL.Ch4;
  const PI = Math.PI;
  const play = (n, a) => CL.Ch4Sound.play(n, a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const W_SONG = [2, 5, 1, 3, 1];          // the whale's song, in rings
  const F_SONG = [2, 1, 3, 5, 1];          // what Fable gives off: note, star, heart, eye, tap
  const EXP = [6, 3, 2, 1.4, 1];            // T 1..5: how sharp what you see is
  const soften = (song, t) => { const m = Math.max(...song); return song.map(v => 5 * Math.pow(v / m, EXP[t - 1])); };
  const match = (a, b) => { let lo = 0, hi = 0; for (let i = 0; i < 5; i++) { lo += Math.min(a[i], b[i]); hi += Math.max(a[i], b[i]); } return hi ? lo / hi : 1; };
  const sum = a => a.reduce((s, v) => s + v, 0);

  const CONSOLE_SPOT = [1.45, 7.35, PI];
  const BELL_SPOT = [2.15, 7.35, PI];
  const STILL_SPOT = [5.5, 4.25, PI];
  const KNOB_SPOT = [5.15, 4.25, PI];
  const PORT_SPOT = [C.PORT[0], 4.1, PI];
  const WHALE_Y = 1.42;
  const WHALE_SPOUT_X = C.SPOUT.x + 0.3 * 0.85;    // whale centre when its blowhole is under the shelf (facing -x)
  const COL_TOP = C.SHELF.y - 0.04;                 // the spout's top when the fish reaches the key

  function setup(world, L, api) {
    A4.registerIcons();
    const S = {
      T: 1, faders: [0, 0, 0, 0, 0], round: 0, busy: false, lastMatch: 0, lastLift: 0, lastCapped: false, best: 0,
      level: C.WATER.start, inlet: false, drain: false, cond: false, pipeWet: false, flow: 0,
      keyDown: false, keyTaken: false, holder: null, stillOpen: false,
      sT: 1, valves: [0, 0, 0, 0, 0], plugged: false, plugs: 0,
      crawling: false, haikuIn: false, distilling: false, prog: 0, runs: 0, distillQ: 0, distilled: false, ended: false,
      lampOn: true,
    };
    const A = {
      opus: world.addActor('opus'),
      sonnet: world.addActor('sonnet'),
      haiku: world.addActor('haiku'),
    };
    const R = L.reactor;
    const hp = L.pods.haiku;
    const U = { hidden: false, dark: 0, whale: 'idle', fish: 'idle', airT: 0, flowBlip: 0, drops: [], eyes: 0, sing: 0, reply: 0, readT: -1, gurgleT: 0, dripT: 0 };
    const v3 = new T.Vector3();

    // ---------------------------------------------------- Haiku is last generation: no uniform yet
    function restyle(a, outfit) {
      const old = a.model;
      const m = K.clawd(CL.Clawd.CS({ W: a.spec.W, outfit, prop: a.spec.prop }));
      const parent = old.root.parent;
      let info = null;
      const gone = new Set();
      old.root.traverse(o => { if (o.isMesh) { gone.add(o); if (o.userData.pick && !info) info = o.userData.pick; } });
      parent.remove(old.root);
      parent.add(m.root);
      world.pickables = world.pickables.filter(o => !gone.has(o));
      a.model = m;
      a.root = m.root;
      m.root.traverse(o => { if (o.isMesh) o.userData.actor = a; });
      if (info) world.addPick(m.root, info);
      a.update(0, world.t);
    }
    function portrait(outfit) {
      const b = document.querySelectorAll('#who .who')[2];
      if (!b) return;
      b.textContent = '';
      const st = CL.Clawd.CS({ W: 0.56, outfit });
      b.appendChild(CL.Clawd.faceDecal(st, 'front', 200 / st.W, true));
    }
    restyle(A.haiku, null);

    // ---------------------------------------------------- start: 21:00, the lab at night
    A.opus.place(2.4, 7.75, 0, PI * 0.92);
    A.sonnet.place(1.85, 8.75, 0, -PI / 2);
    A.haiku.place(3.8, 2.75, 0, 0.3);
    world.active = A.opus;
    CL.Ink.shared.dark.value = 0.3;
    CL.Ink.shared.night.value = 0.32;

    const hud = api.hud({ todo: ['Whale song lesson', 'Open the still', 'Distill Haiku', 'Check on Fable 5.5'], actors: A });
    const { tick, circle } = hud;
    portrait(null);
    const { puff, burst } = api.fx;

    const M = CL.Moves.setup(world, A, { locked: a => world.bubble(a, 'zz') });
    const { perched, operate, turnWheel } = M;
    M.floor(L.floor);
    R.root.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.height === 0.52) M.floor(o, hit => [hit.point.x, Math.max(hit.point.z, 4.0)]); });
    M.actors();

    // the crate of salt: only between the trench and the reactor, on a one-unit lattice, so it always has a way out
    const crate = M.pushable(L.crate, {
      fits: (x, z) => x > 6.4 && x < 9.6 && z > 4.85 && z < 6.05,
    });

    // after a refusal in front of a small opening, step back so the opening stays clickable
    async function stepBack(a) {
      await world.wait(0.5);
      const [x, z] = world.grid.nearestFree(a.x + 0.55, a.z + 0.75);
      await a.walkTo(x, z);
      a.face(PI);
    }
    const say = (text, dur) => A4.speech(world, () => L.fish.root.getWorldPosition(v3).clone().add(new T.Vector3(0, 0.14, 0)), text, dur);
    const nearTank = a => Math.hypot(a.x - 3.6, a.z - 6.6) < 4.5;
    const lookAt = a => world.bubble(a, 'eye');
    const info = (obj, kind, fn) => world.addPick(obj, { kind: kind || 'info', onClick: () => { const a = world.active; if (!a) return; if (fn) fn(a); else lookAt(a); } });

    // ---------------------------------------------------- the song console
    const con = L.console;
    const surfaceY = () => S.level;
    const reachConsole = a => a.reachY >= 0.85;
    function setT(a) {
      if (!reachConsole(a)) { world.bubble(a, 'up'); return false; }
      S.T = S.T % 5 + 1;
      play('click');
      play('warm');
      return true;
    }
    world.addPick([con.plate, ...con.knobs], {
      kind: 'fader',
      onClick: hit => {
        const lp = con.plateG.worldToLocal(hit.point.clone());
        const sx = lp.x + con.plateW / 2, py = con.plateLen / 2 - lp.z;
        if (Math.hypot(sx - C.FADER.tx, py - con.plateLen / 2) < 0.17) { world.interact({ spot: () => CONSOLE_SPOT, use: async a => { if (setT(a)) await operate(a, 0.3); } }); return; }
        let best = -1, bd = 0.13;
        C.TUBES.x.forEach((x, i) => { const d = Math.abs(sx - (x - C.CONSOLE.x0)); if (d < bd) { bd = d; best = i; } });
        if (best < 0) { lookAt(world.active); return; }
        const v = clamp(Math.round((py - C.FADER.run[0]) / (C.FADER.run[1] - C.FADER.run[0]) * 5), 0, 5);
        world.interact({
          spot: () => CONSOLE_SPOT,
          use: async a => {
            if (!reachConsole(a)) { world.bubble(a, 'up'); return; }
            S.faders[best] = v;
            play('click');
            await operate(a, 0.3);
          },
        });
      },
    });
    world.addPick(con.tKnob, { kind: 'knob', onClick: () => world.interact({ spot: () => CONSOLE_SPOT, use: async a => { if (setT(a)) await operate(a, 0.3); } }) });
    // the tubes: listen to the whale's song as it shows now
    world.addPick(con.tubes.map(t => t.glass).concat([con.board, con.songLabel]), {
      kind: 'tubes',
      onClick: () => { const a = world.active; if (!a) return; lookAt(a); if (nearTank(a)) { U.sing = 1.2; play('song', soften(W_SONG, S.T).map(v => v / 5)); } },
    });
    world.addPick(con.bell, {
      kind: 'bell',
      onClick: () => world.interact({
        spot: () => BELL_SPOT,
        use: async a => {
          if (!reachConsole(a)) { world.bubble(a, 'up'); return; }
          a.armR = 1.2;
          world.tween(0.25, u => { con.plunger.position.y = 0.13 - 0.03 * Math.sin(u * PI); }, () => { a.armR = 0; });
          play('bell');
          if (S.busy) { await world.wait(0.3); return; }
          round(a);
          await world.wait(0.4);
        },
      }),
    });

    // ---------------------------------------------------- the tank: whale, fish, a round
    const wh = L.whale, fi = L.fish;
    wh.root.rotation.y = PI;
    function swimWhale(x, dur) {
      const x0 = wh.root.position.x;
      return new Promise(res => world.tween(dur, u => { wh.root.position.x = x0 + (x - x0) * u; }, res, CL.Engine.ease));
    }
    const blowhole = () => { wh.root.updateMatrixWorld(true); return wh.body.localToWorld(wh.blowhole.clone()); };
    const mouth = () => { wh.root.updateMatrixWorld(true); return wh.body.localToWorld(wh.mouth.clone()); };
    function moveFish(to, dur, arc) {
      const p0 = fi.root.position.clone();
      return new Promise(res => world.tween(dur, u => {
        fi.root.position.lerpVectors(p0, to, u);
        if (arc) fi.root.position.y += arc * 4 * u * (1 - u);
      }, res));
    }
    const capOf = lvl => clamp((lvl - C.WATER.low) / (C.WATER.full - C.WATER.low), 0, 1);
    const connected = () => S.inlet && S.cond;

    async function round(by) {
      S.busy = true;
      S.round++;
      const first = S.round === 1;
      U.whale = 'script';
      U.fish = 'script';
      // the whale comes under the shelf
      await swimWhale(WHALE_SPOUT_X, 0.9);
      // it sings what it knows; the fish sings back what its faders say
      U.sing = 1.6;
      play('song', soften(W_SONG, S.T).map(v => v / 5));
      await moveFish(new T.Vector3(C.SPOUT.x - 0.85, 1.55, C.SPOUT.z + 0.05), 1.4);
      fi.root.rotation.y = 0;
      U.reply = 1.2;
      play('reply', S.faders.map(v => v / 5));
      await world.wait(1.2);
      // gulp
      await new Promise(res => world.tween(0.35, u => { wh.jaw.rotation.z = -0.8 * u; }, res));
      const m0 = mouth();
      await moveFish(m0, 0.22);
      fi.root.visible = false;
      play('gulp');
      world.rig.shake = 0.04;
      await new Promise(res => world.tween(0.2, u => { wh.jaw.rotation.z = -0.8 * (1 - u); }, res));
      const m = match(S.faders, W_SONG);
      const cap = capOf(S.level);
      // the silence
      if (first) {
        U.dark = 1;
        play('drone');
        await world.wait(1.2);
        Object.values(A).forEach(a => { if (a.free && nearTank(a)) world.bubble(a, 'bang', 1.4); });
        await world.wait(2.2);
      } else await world.wait(0.7);
      U.dark = 0;
      // the spout
      const lift = Math.min(m, cap), capped = cap < m - 1e-6;
      const vis = Math.max(0.12, lift);
      S.lastMatch = m; S.lastLift = lift; S.lastCapped = capped; S.best = Math.max(S.best, lift);
      const b0 = blowhole();
      const sp = L.spout;
      sp.position.set(b0.x, b0.y, b0.z);
      sp.visible = true;
      fi.root.visible = true;
      fi.root.rotation.set(0, 0, 0.25);
      const top = surfaceY() + (COL_TOP - surfaceY()) * vis;
      const len = Math.max(0.05, top - b0.y);
      play('spout');
      burst(b0.x, surfaceY(), b0.z + 0.1, 8, 0.5, 0.1);
      world.rig.shake = first ? 0.12 : 0.05;
      await new Promise(res => world.tween(0.9, u => {
        const k = 1 - Math.pow(1 - u, 3);
        sp.scale.y = Math.max(0.001, len * k);
        fi.root.position.set(b0.x, b0.y + len * k + 0.09, b0.z);
      }, res));
      if (capped) {
        // not enough water: the column shudders and breaks up, the fish tumbles
        play('sputter');
        if (by && by.free) world.bubble(by, 'ch4.drop', 1.8);
        await new Promise(res => world.tween(0.45, u => { sp.scale.x = sp.scale.z = 1 + 0.25 * Math.sin(u * 40); }, res));
        burst(b0.x, b0.y + len, b0.z, 10, 0.6, 0.09);
        sp.scale.x = sp.scale.z = 1;
      } else {
        await world.wait(0.35);
        if (lift >= 0.999 && !S.keyDown) await knockKey();
        else if (lift < 0.999) { fi.eyes.forEach(e => { e.scale.y = 0.3; }); await world.wait(0.25); fi.eyes.forEach(e => { e.scale.y = 1; }); }
      }
      // down it comes
      const fy0 = fi.root.position.y;
      world.tween(0.4, u => { sp.scale.y = Math.max(0.001, len * (1 - u)); }, () => { sp.visible = false; });
      const land = Math.max(C.TANK.sand + 0.14, surfaceY() - 0.15);
      await new Promise(res => world.tween(0.55, u => {
        fi.root.position.y = fy0 + (land - fy0) * u * u;
        fi.root.position.x = b0.x - 0.25 * u;
        fi.root.rotation.z = 0.25 + (capped ? 6 : 1.2) * u;
      }, res));
      fi.root.rotation.z = 0;
      play('splash');
      burst(fi.root.position.x, surfaceY(), b0.z + 0.15, 7, 0.45, 0.08);
      if (!connected()) S.level = Math.max(C.WATER.min, S.level - (0.06 + 0.14 * vis));
      if (first || (S.keyDown && !S.saidKey)) {
        if (S.keyDown) S.saidKey = true;
        await world.wait(0.5);
        say('CAN YOU eat me again?', 3.4);
        U.sayT = 16;
      }
      U.whale = 'idle';
      U.fish = 'idle';
      U.fishT = 0;
      S.busy = false;
    }

    // the fish noses the key off the shelf; it lands on the floor in front of the tank
    async function knockKey() {
      S.keyDown = true;
      const k = L.key;
      await new Promise(res => world.tween(0.25, u => { fi.root.rotation.z = 0.25 + 0.8 * Math.sin(u * PI); fi.root.position.z = C.SPOUT.z - 0.12 * Math.sin(u * PI); }, res));
      play('key');
      const p0 = k.position.clone(), p1 = new T.Vector3(C.KEY_FLOOR[0], 0.03, C.KEY_FLOOR[1]);
      world.tween(0.95, u => {
        k.position.lerpVectors(p0, p1, u);
        k.position.y = p0.y + (p1.y - p0.y) * u + 0.5 * 4 * u * (1 - u);
        k.rotation.z = u * 9;
      }, () => {
        k.position.copy(p1);
        k.rotation.set(-PI / 2, 0, 0.6);
        play('key');
        tick(0);
      });
      await world.wait(0.3);
    }

    // the key on the floor
    world.addPick(L.key, {
      kind: 'item',
      enabled: () => !S.keyTaken,
      onClick: () => {
        const a = world.active;
        if (!a) return;
        if (!S.keyDown) { world.interact({ spot: () => [C.SPOUT.x, 7.35, PI], use: async a2 => world.bubble(a2, 'up') }, null, a); return; }
        world.interact({
          spot: () => [C.KEY_FLOOR[0], C.KEY_FLOOR[1] + 0.55, PI],
          use: async a2 => {
            play('click');
            S.keyTaken = true;
            S.holder = a2.name;
            const k = L.key;
            k.removeFromParent();
            a2.model.arms[1].add(k);
            k.position.set(0.12 * a2.spec.W, -0.02, 0.12);
            k.rotation.set(0, 0, -PI / 2);
            a2.holding = k;
            a2.armR = 0.5;
            world.bubble(a2, 'ok');
          },
        }, null, a);
      },
    });
    info(L.shelf, 'shelf', a => world.interact({ spot: () => [C.SPOUT.x, 7.35, PI], use: async a2 => world.bubble(a2, 'up') }, null, a));
    world.addPick(fi.root, { kind: 'fish', onClick: () => { const a = world.active; if (!a) return; lookAt(a); if (!fi.root.visible) return; say(S.round ? 'CAN YOU eat me again?' : 'CAN YOU eat me?', 2.8); } });
    world.addPick(wh.root, { kind: 'whale', onClick: () => { const a = world.active; if (!a) return; lookAt(a); play('hum'); U.blink = 0.25; } });
    info([L.tank.scale, L.tank.gauge, L.tank.plaque], 'gauge');

    // ---------------------------------------------------- valves: drain and inlet (the lever along the pipe = open)
    world.addPick([L.drain.lever, L.drain.body], {
      kind: 'valve',
      onClick: () => world.interact({ spot: () => [C.DRAIN.x, 7.45, PI], use: async a => {
        S.drain = !S.drain;
        await operate(a, 0.45);
        play('clunk');
        if (S.drain) play('gurgle');
      } }),
    });
    world.addPick([L.inlet.lever, L.inlet.body], {
      kind: 'valve',
      onClick: () => world.interact({ spot: () => [5.85, 6.95, PI], use: async a => {
        S.inlet = !S.inlet;
        await operate(a, 0.45);
        play('clunk');
        if (S.inlet && !S.pipeWet) {
          // the pipe beyond is dry: the tank pushes the air out of it, and that's all
          S.pipeWet = true;
          U.airT = 2.6;
          U.fillDebt = 0.05;
          play('gurgle');
        } else if (S.inlet && S.cond) play('gurgle');
      } }),
    });
    info(L.trench.flow, 'gauge');

    // ---------------------------------------------------- the hatch: Haiku crawls under the reactor to the condensate valve
    const crateAtHatch = () => Math.abs(crate.mesh.position.x - C.HATCH.x) < 0.7 && crate.mesh.position.z < 5.5;
    world.addPick(L.hatch.root, {   // the hole, its brass frame, the flap (the dial gets its own pick below)
      kind: 'hatch',
      onClick: () => world.interact({
        spot: () => [C.HATCH.x, 4.88, PI],
        use: async a => {
          if (crateAtHatch()) { world.bubble(a, a === A.opus ? 'small' : 'heavy'); return; }
          if (a !== A.haiku) { play('dull'); world.bubble(a, 'small'); await stepBack(a); return; }
          await crawl(a);
        },
      }),
    });
    async function flap(open) {
      play('clunk');
      await new Promise(res => world.tween(0.25, u => { L.hatch.flapH.rotation.x = open ? 1.3 * u : 1.3 * (1 - u); }, res));
    }
    async function crawl(h) {
      S.crawling = true;
      h.face(PI);
      await world.wait(0.2);
      play('crawl');
      await flap(true);
      const z0 = h.z;
      await new Promise(res => world.tween(0.5, u => { h.z = z0 + (4.25 - z0) * u; h.sq = 1 - 0.18 * u; }, res));
      U.hidden = true;
      await flap(false);
      await world.wait(0.9);
      play('crawl');
      await world.wait(0.7);
      play('creak');
      await world.wait(0.5);
      S.cond = !S.cond;
      play('clunk');
      if (S.cond) {
        play('gurgle');
        if (!S.pipeWet) { S.pipeWet = true; U.flowBlip = 1.6; }
      }
      await world.wait(0.7);
      play('crawl');
      await flap(true);
      U.hidden = false;
      h.face(0);
      await new Promise(res => world.tween(0.5, u => { h.z = 4.25 + (z0 - 4.25) * u; h.sq = 0.82 + 0.18 * u; }, res));
      h.sq = 1;
      await flap(false);
      S.crawling = false;
    }
    info([L.hatch.dial, L.stand.root], 'gauge');

    // ---------------------------------------------------- the reactor's data port and Sonnet's laptop
    world.addPick(L.port.root, {
      kind: 'port',
      onClick: () => world.interact({
        spot: () => PORT_SPOT,
        use: async a => {
          if (a !== A.sonnet) { play('dull'); world.bubble(a, 'ch4.plug'); return; }
          if (S.plugged) { lookAt(a); return; }
          await operate(a, 0.35);
          play('click');
          S.plugged = true;
          S.plugs++;
          U.readT = -1;
          if (S.plugs === 1) U.eyes = 1.4;
        },
      }),
    });
    info(L.port.readout, 'gauge');

    // ---------------------------------------------------- the still
    const st = L.still;
    world.addPick([...st.doors, st.lock], {
      kind: 'door',
      enabled: () => !S.stillOpen,
      onClick: () => world.interact({
        spot: () => STILL_SPOT,
        use: async a => {
          if (S.stillOpen) { lookAt(a); return; }
          if (S.holder !== a.name) { play('dull'); world.bubble(a, 'lock'); return; }
          await openStill(a);
        },
      }),
    });
    async function openStill(a) {
      const k = L.key;
      a.armR = 1.1;
      play('click');
      await world.wait(0.35);
      k.removeFromParent();
      a.holding = null;
      S.holder = null;
      a.armR = 0;
      play('creak');
      await new Promise(res => world.tween(0.8, u => { const e = 1 - Math.pow(1 - u, 3); st.doors[0].rotation.y = -1.95 * e; st.doors[1].rotation.y = 1.95 * e; }, res));
      S.stillOpen = true;
      U.portBlink = 5;   // the still is fed from the reactor: its data port starts blinking
      play('boil');
      tick(1);
    }
    world.addPick([st.knob, st.dial], {
      kind: 'knob',
      enabled: () => S.stillOpen,
      onClick: () => world.interact({ spot: () => KNOB_SPOT, use: async a => {
        S.sT = S.sT % 5 + 1;
        play('click');
        play('warm');
        await operate(a, 0.3);
      } }),
    });
    st.valves.forEach((vv, i) => {
      world.addPick([vv.wheel, vv.stem], {
        kind: 'valve',
        enabled: () => S.stillOpen,
        onClick: () => world.interact({ spot: () => [vv.x, 4.25, PI], use: async a => {
          if (a.reachY < C.VALVE.y - 0.03) { world.bubble(a, 'up'); return; }
          S.valves[i] = (S.valves[i] + 1) % 6;
          await turnWheel(a, vv.wheel, S.valves[i] ? 0.25 : -1.25);
          play(S.valves[i] ? 'click' : 'clunk');
        } }),
      });
    });
    info([st.thermo, st.jar, st.boiler], 'gauge');

    // ---------------------------------------------------- Haiku's pod: sit in it to be distilled
    world.addPick(hp.root, {
      kind: 'pod',
      onClick: () => {
        const a = world.active;
        if (!a) return;
        if (S.haikuIn) { lookAt(a); return; }
        world.interact({ spot: () => [hp.x, 1.95, PI], use: async a2 => {
          if (a2 !== A.haiku) { world.bubble(a2, 'small'); await stepBack(a2); return; }
          await enterPod(a2);
        } }, null, a);
      },
    });
    info(hp.gauge, 'gauge');
    async function door(open) {
      play(open ? 'burst' : 'clunk');
      const r0 = hp.hinge.rotation.y, r1 = open ? -2.1 : 0;
      await new Promise(res => world.tween(0.55, u => { hp.hinge.rotation.y = r0 + (r1 - r0) * (1 - Math.pow(1 - u, 3)); }, res));
      if (open) burst(hp.x, 0.7, hp.z + 0.6, 10, 0.7, 0.12);
    }
    async function enterPod(h) {
      world.bubble(h, 'ch4.fish', 1.4);
      await world.wait(0.5);
      await h.hopTo(hp.x, hp.z, hp.seatY, 0.5);
      h.support = { kind: 'pod' };
      h.face(0);
      S.haikuIn = true;
      await door(false);
      await distill();
    }
    async function leavePod() {
      const h = A.haiku;
      await door(true);
      await h.hopTo(hp.x + 0.15, 1.95, 0, 0.5);
      h.support = null;
      S.haikuIn = false;
    }
    async function distill() {
      S.distilling = true;
      S.runs++;
      S.prog = 0;
      const flowing = S.stillOpen && sum(S.valves) > 0;
      if (!flowing) {
        // nothing comes down the tube
        await world.wait(1.8);
        world.bubble(A.haiku, 'q');
        await world.wait(0.7);
        await leavePod();
        S.distilling = false;
        return;
      }
      play('rise');
      await new Promise(res => world.tween(7, u => { S.prog = u; }, res));
      const q = match(S.valves, F_SONG);
      S.distillQ = q;
      if (q >= 0.999) { await success(); return; }
      play('dull');
      world.bubble(A.haiku, 'q');
      await world.wait(0.9);
      S.prog = 0;
      await leavePod();
      S.distilling = false;
    }

    // ---------------------------------------------------- the end: eaten is lifted; Haiku 5.5 taps the glass
    function ring(pos, quat, r, col) {
      const m = K.mesh(new T.TorusGeometry(r, r * 0.08, 6, 32), CL.Ink.ink(col || P.FROST, { flat: true, lit: true }), pos.x, pos.y, pos.z);
      m.quaternion.copy(quat);
      m.layers.set(1);
      world.scene.add(m);
      world.tween(0.5, u => { m.scale.setScalar(1 + 3 * u); m.material.uniforms.uOpacity.value = 1 - u; m.material.transparent = true; }, () => world.scene.remove(m));
    }
    function camTo(goal, zoom, dur) {
      const t0 = world.rig.target.clone();
      world.rig.zoomT = zoom;
      world.tween(dur, u => { world.rig.target.lerpVectors(t0, goal, u); }, null, CL.Engine.ease);
    }
    async function success() {
      S.distilled = true;
      S.ended = true;
      S.distilling = false;
      world.locked = true;
      world.rig.follow = null;
      const h = A.haiku;
      const post = world.pipe.post.uniforms;
      tick(2);
      camTo(new T.Vector3(hp.x + 0.25, 0.9, hp.z + 0.6), 5.2, 1.2);
      play('rise');
      await world.wait(0.6);
      post.uTint.value.set(P.GLOW_CORE);
      await new Promise(res => world.tween(0.5, u => { post.uTintA.value = 0.6 * u; }, res));
      restyle(h, 'uniform');
      portrait('uniform');
      hp.tape.visible = false;
      U.done = true;
      play('chime');
      await new Promise(res => world.tween(0.9, u => { post.uTintA.value = 0.6 * (1 - u); }, res));
      post.uTint.value.set(P.ALARM);
      await world.wait(0.9);
      // its first act: two taps on the inside of the glass
      const gq = hp.glass.getWorldQuaternion(new T.Quaternion());
      for (let i = 0; i < 2; i++) {
        h.armR = 1.5;
        play('tap');
        ring(new T.Vector3(hp.x + 0.08, 0.66, hp.z + hp.frontZ + 0.06), gq, 0.08);
        await world.wait(0.16);
        h.armR = 1.0;
        await world.wait(0.3);
      }
      h.armR = 0;
      await world.wait(1.8);
      // the answer, from the other side of the room
      camTo(new T.Vector3(C.RX - 2.2, 2.2, 4.4), 11.5, 1.6);
      await world.wait(1.5);
      const pq = new T.Quaternion();
      for (let i = 0; i < 2; i++) {
        play('tapDeep');
        U.eyes = 0.5;
        ring(new T.Vector3(C.RX + 0.35, 2.55, R.PC.z + 0.14), pq, 0.22, P.GLOW_CORE);
        await world.wait(0.55);
      }
      await world.wait(0.4);
      [A.opus, A.sonnet].forEach(a => { a.faceTo(C.RX, 3.4); world.bubble(a, 'bang', 1.6); });
      circle(3);
      await world.wait(2.2);
      await new Promise(res => world.tween(0.9, u => { post.uFade.value = u; }, res));
      api.finish();
    }

    // ---------------------------------------------------- the rest of the room
    world.addPick(R.glass, {
      kind: 'glass',
      onClick: () => world.interact({ spot: () => [C.RX - 0.5, 4.1, PI], use: async a => {
        lookAt(a);
        if (!U.peeked) { U.peeked = true; await world.wait(0.4); U.eyes = 1.1; }
      } }),
    });
    world.addPick(R.sign, { kind: 'sign', onClick: () => world.interact({ spot: () => [C.RX + 2.88, 4.4, PI], use: async a => world.bubble(a, 'bang') }) });
    R.gauges.forEach(gg => info(gg, 'gauge'));
    [L.pods.opus.root, L.pods.sonnet.root].forEach(r => info(r, 'pod', a => world.bubble(a, 'zz')));
    world.addPick(L.exit, { kind: 'exit', onClick: () => world.interact({ spot: () => [15.2, 6.6, PI / 2], use: async a => { play('dull'); world.bubble(a, 'lock'); } }) });
    info(L.clock.root, 'clock', a => world.bubble(a, 'zz'));
    world.addPick([L.desk.lamp], {
      kind: 'lamp',
      onClick: () => world.interact({ spot: () => [1.85, 8.3, -PI / 2], use: async a => {
        S.lampOn = !S.lampOn;
        play('lamp');
        await operate(a, 0.2);
      } }),
    });
    info(L.desk.notebook, 'note');
    info(L.clutter, 'clutter', a => world.bubble(a, 'heavy'));

    // ---------------------------------------------------- per frame
    const crawlFix = () => { const h = A.haiku; h.root.visible = !U.hidden; if (U.hidden) h.shadow.visible = false; };
    const dropPath = C.STILL_TUBE.map(p => new T.Vector3(...p)).concat([new T.Vector3(hp.x, 1.25, hp.z), new T.Vector3(hp.x, 0.75, hp.z)]);
    const segLen = [];
    let pathLen = 0;
    for (let i = 0; i < dropPath.length - 1; i++) { const l = dropPath[i].distanceTo(dropPath[i + 1]); segLen.push(l); pathLen += l; }
    const dropMat = A4.glowMat(P.GLOW, A4.mixc(P.GLOW, P.NIGHT, 0.2));
    const dropGeo = new T.SphereGeometry(0.035, 8, 6);
    const podGlow = K.glow(P.GLOW, 1.4);
    podGlow.position.set(hp.x, 0.6, hp.z + 0.1);
    world.scene.add(podGlow);
    const eyeGlows = R.eyes.map(e => { const g = K.glow(P.GLOW, 1.2); g.position.copy(e.getWorldPosition(new T.Vector3())).add(new T.Vector3(0, 0, 0.06)); world.scene.add(g); return g; });
    const pathAt = s => {
      for (let i = 0; i < segLen.length; i++) { if (s <= segLen[i]) return dropPath[i].clone().lerp(dropPath[i + 1], s / segLen[i]); s -= segLen[i]; }
      return dropPath[dropPath.length - 1].clone();
    };

    U.sayT = 1.6;
    world.onUpdate = (dt, t) => {
      const k = u => Math.min(1, dt * u);
      // the fish keeps asking while nothing happens
      if (!S.busy && !S.keyDown && fi.root.visible && !S.ended) {
        U.sayT -= dt;
        if (U.sayT < 0) { U.sayT = S.round ? 16 : 10; say(S.round ? 'CAN YOU eat me again?' : 'CAN YOU eat me?', 3.2); }
      }
      // -- console: knobs, collars, tube columns, T pointer
      const bars = soften(W_SONG, S.T);
      U.sing = Math.max(0, U.sing - dt);
      U.reply = Math.max(0, U.reply - dt);
      con.knobs.forEach((kb, i) => { kb.position.z += (con.fpos(S.faders[i]) - kb.position.z) * k(10); });
      con.tubes.forEach((tb, i) => {
        const hTo = U.dark ? 0.001 : Math.max(0.001, bars[i] * C.TUBES.step);
        tb.column.scale.y += (hTo - tb.column.scale.y) * k(6);
        tb.column.position.y = C.TUBES.y0 + tb.column.scale.y / 2;
        const pulse = U.sing > 0 ? 0.5 + 0.5 * Math.sin(t * 14 + i) : 0;
        tb.mat.uniforms.uEmissive.value.set(A4.mixc(A4.mixc(P.SCREEN, P.NIGHT, 0.8), P.SCREEN, pulse * 0.5));
        const cy = C.TUBES.y0 + S.faders[i] * C.TUBES.step;
        tb.collar.position.y += (cy - tb.collar.position.y) * k(10);
        const rp = U.reply > 0 ? 0.5 + 0.5 * Math.sin(t * 18 + i * 2) : 0;
        tb.collar.material.uniforms.uEmissive.value.set(rp > 0 ? A4.mixc(P.NIGHT, P.ORANGE_LIGHT, rp * 0.6) : A4.NO_GLOW);
      });
      const tTo = X.deg(210 - 60 * (S.T - 1));
      con.tPtr.rotation.y += (tTo - con.tPtr.rotation.y) * k(10);
      // -- water
      let flow = 0;
      if (connected()) flow += 0.4 * (C.WATER.head - S.level);
      if (S.drain) flow -= 0.45 * (S.level - C.WATER.min);
      if (U.fillDebt > 0) { const d = Math.min(U.fillDebt, dt * 0.04); U.fillDebt -= d; flow -= d / Math.max(dt, 1e-4); }
      S.level = clamp(S.level + flow * dt, C.WATER.min - 0.02, 2.17);
      S.flow = flow;
      const lv = S.level, wt = L.tank.water;
      wt.scale.y = lv - C.TANK.gy0;
      wt.position.y = (lv + C.TANK.gy0) / 2;
      L.tank.men.position.y = lv + 0.003 * Math.sin(t * 3);
      L.tank.gauge.userData.set((lv - C.TANK.gy0) / (C.TANK.gy1 - C.TANK.gy0));
      if (S.drain || (connected() && Math.abs(flow) > 0.01)) {
        U.gurgleT -= dt;
        if (U.gurgleT < 0) { U.gurgleT = 1.1; play('gurgle'); }
      }
      // -- valves, trench, flow window, dial
      L.drain.lever.rotation.z += ((S.drain ? 0 : -PI / 2) - L.drain.lever.rotation.z) * k(9);
      L.inlet.lever.rotation.y += ((S.inlet ? 0 : -PI / 2) - L.inlet.lever.rotation.y) * k(9);
      L.trench.wetM.uniforms.uColor.value.set(S.pipeWet ? P.WATER_DEEP : P.NAVY_DARK);
      L.trench.wetM.uniforms.uEmissive.value.set(S.pipeWet && Math.abs(flow) > 0.01 ? A4.mixc(P.WATER_DEEP, P.NIGHT, 0.5 - 0.15 * Math.sin(t * 6)) : A4.NO_GLOW);
      U.flowBlip = Math.max(0, U.flowBlip - dt);
      const spin = (connected() ? Math.abs(flow) * 30 : 0) + (U.flowBlip > 0 ? 8 : 0) + (U.airT > 0 ? 6 : 0);
      L.trench.paddle.rotation.y += spin * dt;
      L.hatch.dPtr.rotation.z += ((S.cond ? -PI / 3 : PI / 3) - L.hatch.dPtr.rotation.z) * k(6);
      // -- tank life: weeds, bubbles, the whale and the fish when nobody is making them do anything
      L.weeds.forEach(g => { g.rotation.z = U.dark ? g.rotation.z * 0.9 : 0.12 * Math.sin(t * 1.3 + g.userData.ph); });
      U.airT = Math.max(0, U.airT - dt);
      L.bubbles.forEach((b, i) => {
        if (!b.m.visible) {
          const rate = U.airT > 0 ? 6 : (S.drain ? 1.5 : 0.35);
          if (Math.random() < dt * rate) {
            const air = U.airT > 0;
            b.m.position.set(air ? 5.35 : (S.drain ? C.DRAIN.x + 0.1 : 5.2), C.TANK.sand + 0.05, air ? 6.1 + Math.random() * 0.2 : 6.3);
            b.m.visible = true;
            b.t = 0;
          }
          return;
        }
        b.t += dt;
        b.m.position.y += dt * (0.5 + 0.2 * Math.sin(i));
        b.m.position.x += 0.02 * Math.sin(t * 5 + i) * dt * 10;
        if (b.m.position.y > lv - 0.02) b.m.visible = false;
      });
      if (U.whale === 'idle') {
        const wx = 3.95 + 0.15 * Math.sin(t * 0.35);
        wh.root.position.x += (wx - wh.root.position.x) * k(0.8);
        wh.root.position.y = WHALE_Y + 0.03 * Math.sin(t * 0.9);
        wh.root.rotation.y += (PI - wh.root.rotation.y) * k(2);
        wh.tail.rotation.z = 0.18 * Math.sin(t * 1.6);
      } else {
        wh.tail.rotation.z = U.dark ? wh.tail.rotation.z * 0.9 : 0.25 * Math.sin(t * 3.2);
        if (U.dark) wh.root.rotation.y += (PI - 0.45 - wh.root.rotation.y) * k(1.5);
        else wh.root.rotation.y += (PI - wh.root.rotation.y) * k(3);
      }
      if (U.blink > 0) { U.blink -= dt; wh.eyes.forEach(e => { e.scale.y = U.blink > 0 ? 0.15 : 1; }); }
      if (U.fish === 'idle') {
        U.fishT = (U.fishT || 0) + dt;
        const ft = U.fishT * 0.5;
        const top = Math.max(C.TANK.sand + 0.3, lv - 0.13);
        const fx = 4.1 + 1.0 * Math.sin(ft), fz = 6.46 + 0.03 * Math.sin(ft * 2.3), fy = Math.min(top, 1.9 + 0.08 * Math.sin(ft * 3.1));
        const fp = fi.root.position;
        const vx = fx - fp.x, vz = fz - fp.z;
        fp.x += vx * k(2); fp.y += (fy - fp.y) * k(2); fp.z += vz * k(2);
        if (Math.abs(vx) + Math.abs(vz) > 0.002) fi.root.rotation.y = CL.Engine.angLerp(fi.root.rotation.y, Math.atan2(-vz, vx), k(4));
        fi.tail.rotation.y = 0.5 * Math.sin(t * 9);
      } else fi.tail.rotation.y = 0.6 * Math.sin(t * 14);
      // the scare: the room dims while the whale holds the fish
      U.darkV = (U.darkV || 0) + ((U.dark ? 1 : 0) - (U.darkV || 0)) * k(U.dark ? 1.5 : 4);
      const lamp = S.lampOn && !(U.dark && Math.sin(t * 23) > 0.3);
      L.desk.cone.visible = L.desk.pool.visible = lamp;
      L.desk.bulb.material.uniforms.uEmissive.value.set(lamp ? A4.mixc(P.GLOW_CORE, P.NIGHT, 0.4) : A4.NO_GLOW);
      L.desk.bulb.material.uniforms.uColor.value.set(lamp ? P.GLOW_CORE : P.INK_SOFT);
      CL.Ink.shared.dark.value = (S.lampOn ? 0.3 : 0.42) + 0.22 * U.darkV;
      L.tank.glow.material.opacity = 0.55 * (1 - 0.6 * U.darkV);
      // -- the still
      st.flames.forEach((f, i) => {
        const s = S.stillOpen ? 0.5 + 0.22 * S.sT + 0.12 * Math.sin(t * 17 + i * 2) : 0.001;
        f.scale.set(s, s * (1 + 0.15 * Math.sin(t * 23 + i)), s);
      });
      const sTo = X.deg(210 - 60 * (S.sT - 1)) - PI / 2;
      st.ptr.rotation.z += (sTo - st.ptr.rotation.z) * k(10);
      st.thermo.userData.set((S.stillOpen ? 0.12 + 0.16 * S.sT : 0.05) + 0.01 * Math.sin(t * 7));
      st.valves.forEach((vv, i) => {
        const to = C.VALVE.base + S.valves[i] * C.VALVE.step;
        vv.stem.scale.y += (to - vv.stem.scale.y) * k(8);
      });
      if (S.stillOpen && Math.random() < dt * 0.5 * S.sT) puff(5.15 + (Math.random() - 0.5) * 0.2, 1.0, 3.25, 0, 0.3, 0.2, 0.04, 0.6);
      // -- the data port, Sonnet's laptop and its readout
      const so = A.sonnet;
      if (S.plugged && (so.busy === 'walk' || Math.hypot(so.x - PORT_SPOT[0], so.z - PORT_SPOT[1]) > 0.35 || perched(so))) { S.plugged = false; play('click'); }
      U.portBlink = Math.max(0, (U.portBlink || 0) - dt);
      const ledOn = S.plugged || !(U.portBlink > 0 && Math.sin(t * 12) < 0);
      L.port.led.material.uniforms.uColor.value.set(S.plugged ? P.CODE_GREEN : ledOn ? P.ALARM : P.INK);
      L.port.led.material.uniforms.uEmissive.value.set(ledOn ? A4.mixc(S.plugged ? P.CODE_GREEN : P.ALARM, P.NIGHT, 0.5) : A4.NO_GLOW);
      const ro = L.port.readout;
      ro.visible = S.plugged;
      L.port.cable.visible = S.plugged;
      if (S.plugged) {
        if (U.readT !== S.sT) {
          U.readT = S.sT;
          A4.paintReadout(L.port.rcv, soften(F_SONG, S.sT), S.sT);
          L.port.rtex.needsUpdate = true;
        }
        ro.position.set(so.x - 0.15, so.y + so.height + 0.75, so.z + 0.25);
        ro.quaternion.copy(world.cam.quaternion);
        so.armL = 0.3 + 0.12 * Math.sin(t * 20);
        so.armR = 0.3 + 0.12 * Math.sin(t * 23 + 1);
        const p0 = so.model.prop.getWorldPosition(new T.Vector3()), p1 = new T.Vector3(C.PORT[0] - 0.03, C.PORT[1] - 0.02, C.PORT[2] + 0.04);
        const cb = L.port.cable;
        cb.position.copy(p0).add(p1).multiplyScalar(0.5);
        cb.scale.set(1, p0.distanceTo(p1), 1);
        cb.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
      } else if (U.wasPlugged) { so.armL = so.armR = 0; }
      U.wasPlugged = S.plugged;
      // -- distilling: drops of light down the glass tube into Haiku's pod
      const q = match(S.valves, F_SONG);
      if (S.distilling && S.prog > 0 && S.prog < 1) {
        U.dripT -= dt * (2 + 1.6 * sum(S.valves) / 5);
        if (U.dripT < 0) {
          U.dripT = 1;
          const m = new T.Mesh(dropGeo, dropMat);
          m.layers.set(1);
          world.scene.add(m);
          U.drops.push({ m, s: 0 });
        }
      }
      for (let i = U.drops.length - 1; i >= 0; i--) {
        const d = U.drops[i];
        d.s += dt * 1.6;
        d.m.position.copy(pathAt(d.s));
        if (d.s >= pathLen) { world.scene.remove(d.m); U.drops.splice(i, 1); play('drip'); }
      }
      podGlow.material.opacity = S.distilling ? Math.min(1, S.prog * 1.4) * (0.25 + 0.75 * q) : (U.done ? 0.5 : 0);
      podGlow.visible = podGlow.material.opacity > 0.002;
      hp.gauge.userData.set(U.done ? 0.97 : 0.05 + 0.92 * (S.distilling ? S.prog * q : S.distillQ));
      // -- Fable's eyes behind the glass: a glint when someone looks, a glow while it is being distilled
      U.eyes = Math.max(0, (U.eyes || 0) - dt);
      const ev = Math.max(U.eyes > 0 ? Math.min(1, U.eyes * 2) : 0, S.distilling ? 0.35 * S.prog : 0);
      eyeGlows.forEach(g => { g.material.opacity = ev; g.visible = ev > 0.002; });
      R.eyes.forEach(e => {
        e.material.uniforms.uColor.value.set(ev > 0.25 ? P.GLOW : P.INK);
        e.material.uniforms.uEmissive.value.set(ev > 0.25 ? A4.mixc(P.GLOW, P.NIGHT, 1 - ev) : A4.NO_GLOW);
      });
      crawlFix();
    };

    // ---------------------------------------------------- framing and stills
    function frame() {
      world.rig.bounds = [2.2, 11.5, 3.2, 7.4];
      world.rig.zoomMin = 6;
      world.rig.zoomMax = 18;
    }

    const game = {
      S, A, L,
      probe: {
        crate: () => [crate.mesh.position.x, crate.mesh.position.z],
        // world points of the controls, for the playthrough test
        fader: (i, v) => { const p = new T.Vector3(C.TUBES.x[i] - C.CONSOLE.x0 - con.plateW / 2, 0.03, con.fpos(v)); return con.plateG.localToWorld(p).toArray(); },
        tKnob: () => con.tKnob.localToWorld(new T.Vector3(0, 0.07, 0)).toArray(),
        valve: i => st.valves[i].wheel.getWorldPosition(new T.Vector3()).toArray(),
        key: () => L.key.getWorldPosition(new T.Vector3()).toArray(),
        bars: () => soften(W_SONG, S.T),
        readout: () => soften(F_SONG, S.sT),
      },
      begin() {
        frame();
        world.rig.target.set(2.8, 1.8, 6.6);
        world.rig.zoom = world.rig.zoomT = 8;
        world.rig.az = world.rig.azT = 35;
        world.select(A.opus);
        hud.show();
      },
      async look(name) {
        U.sayT = 1e9;
        // fast-forward the world without rendering, then hold the frame (stills on slow software GL)
        const ff = async sec => {
          world.paused = true;
          for (let q = 0; q < sec; q += 0.05) {
            world.update(0.05);
            for (let j = 0; j < 24; j++) await Promise.resolve();   // let the scripts waiting on tweens move on, without a render in between
          }
        };
        frame();
        hud.show();
        world.select(A.opus);
        world.rig.follow = null;
        world.rig.az = world.rig.azT = 35;
        const at = (x, y, z, zoom) => { world.rig.target.set(x, y, z); world.rig.zoom = world.rig.zoomT = zoom; };
        if (name === 'room') {
          at(6.4, 1.6, 5.4, 15);
        } else if (name === 'tank') {
          S.T = 3; S.faders = [1, 5, 0, 2, 0];
          A.opus.place(CONSOLE_SPOT[0], CONSOLE_SPOT[1], 0, PI);
          at(2.9, 1.9, 6.4, 7.0);
          say('CAN YOU eat me?', 30);
        } else if (name === 'bars') {
          S.T = 5; S.faders = [2, 5, 1, 3, 0];
          A.opus.place(CONSOLE_SPOT[0], CONSOLE_SPOT[1], 0, PI);
          at(1.5, 1.4, 6.6, 4.2);
        } else if (name === 'spout' || name === 'gulp' || name === 'silence' || name === 'sputter') {
          S.T = 5; S.faders = [2, 5, 1, 3, 1];
          if (name === 'spout') { S.level = 2.1; S.inlet = S.cond = S.pipeWet = true; }
          else S.level = name === 'sputter' ? 1.55 : 1.85;
          if (name === 'spout' || name === 'sputter') S.round = 1;
          A.opus.place(BELL_SPOT[0], BELL_SPOT[1], 0, PI);
          A.sonnet.place(2.9, 7.6, 0, PI * 0.9);
          at(3.6, 2.4, 6.4, 8.0);
          round(A.opus);
          await ff({ gulp: 4.0, silence: 5.8, spout: 6.15, sputter: 6.0 }[name]);
          return;
        } else if (name === 'water') {
          S.inlet = true; S.pipeWet = true; S.level = 1.5;
          crate.setAt(6.5, 4.95);
          A.opus.place(6.5, 5.85, 0, 0.4);
          A.haiku.place(C.HATCH.x, 4.88, 0, PI);
          A.sonnet.place(5.85, 6.95, 0, PI);
          at(6.4, 1.2, 5.0, 7.5);
          world.select(A.haiku);
          world.rig.follow = null;
          crawl(A.haiku);
          await ff(0.75);
          return;
        } else if (name === 'still' || name === 'valves') {
          S.stillOpen = true; S.keyDown = S.keyTaken = true; L.key.visible = false;
          st.doors[0].rotation.y = -1.95; st.doors[1].rotation.y = 1.95;
          S.sT = 4; S.valves = [1, 0, 2, 5, 0];
          A.sonnet.place(PORT_SPOT[0], PORT_SPOT[1], C.PLINTH_Y, PI);
          S.plugged = true;
          A.opus.place(STILL_SPOT[0] - 1.2, STILL_SPOT[1] + 0.3, 0, PI * 0.8);
          A.haiku.place(3.9, 2.4, 0, 0.4);
          if (name === 'valves') at(5.5, 1.0, 3.6, 3.2); else at(6.9, 1.5, 4.0, 7.0);
          tick(0); tick(1);
        } else if (name === 'distill') {
          S.stillOpen = true; S.keyDown = S.keyTaken = true; L.key.visible = false;
          st.doors[0].rotation.y = -1.95; st.doors[1].rotation.y = 1.95;
          S.sT = 5; S.valves = [2, 1, 3, 5, 1];
          A.haiku.place(hp.x, hp.z, hp.seatY, 0); A.haiku.support = { kind: 'pod' };
          hp.hinge.rotation.y = 0; S.haikuIn = true;
          A.opus.place(STILL_SPOT[0], STILL_SPOT[1] + 0.3, 0, PI * 0.8);
          A.sonnet.place(PORT_SPOT[0], PORT_SPOT[1], C.PLINTH_Y, PI);
          at(5.9, 1.4, 2.6, 6.5);
          tick(0); tick(1);
          S.distilling = true; S.prog = 0.6;
          await ff(2.5);
          return;
        } else if (name === 'tap' || name === 'answer') {
          S.stillOpen = true; S.keyDown = S.keyTaken = true; L.key.visible = false;
          st.doors[0].rotation.y = -1.95; st.doors[1].rotation.y = 1.95;
          S.sT = 5; S.valves = [2, 1, 3, 5, 1];
          A.haiku.place(hp.x, hp.z, hp.seatY, 0); A.haiku.support = { kind: 'pod' };
          hp.hinge.rotation.y = 0; S.haikuIn = true;
          A.opus.place(STILL_SPOT[0], STILL_SPOT[1] + 0.3, 0, PI * 0.8);
          A.sonnet.place(PORT_SPOT[0], PORT_SPOT[1], C.PLINTH_Y, PI);
          tick(0); tick(1);
          at(5.9, 1.4, 2.6, 6.5);
          success();
          await ff(name === 'tap' ? 3.05 : 7.3);
          return;
        } else if (name === 'back') {
          at(6, 1.5, 5, 15);
          world.rig.az = world.rig.azT = 215;
        }
        await world.wait(0.8);
      },
    };
    return game;
  }

  CL.Chapters.define('ch4', { build: C.build, setup });
})(window.CL = window.CL || {});
