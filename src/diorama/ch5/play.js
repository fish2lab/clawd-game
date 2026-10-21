/* Chapter 5 rules. See level.js for what changed in the room.

   The chain (any order inside step 2):
     1. Compare the room with the blueprint on the drafting table.
     2. Decide every change, by testing it (Sonnet's data ports, gauges):
        - copper line on branch A, feeding Fable (the two reactor gauges pegged). It is
          welded on and has no valve: only closing A stops it. Sonnet's pod then gets no
          steam (the test shows it frosting). B and C must be open for the other pods.
        - A's crossing section lies on the floor: Opus bolts it back (the pipes cross
          again), or Sonnet's pod is cut off altogether.
        - B's expansion loop was swapped for a straight piece: less pressure lost.
          Keep it. Putting the loop back is the wrong route (Opus's pod gauge drops).
        - roof vent open a crack, no handwheel. Haiku's pod wheel fits its spindle;
          crate under the locker, Opus on it, Sonnet on Opus. The wheel is then left
          on the locker top, by the vent.
        - porthole bolt 5 backed out: the full stack on the plinth, Haiku turns it in.
        - Haiku squeezes under the pipes beside the reactor and asks, in tap code,
          W-H-Y. Fable writes GROW in the fog.
     3. Sonnet runs the tests (the port by the alley). When they pass and Fable has
        been asked, Fable taps W-H-E-N. Opus answers the only way he can: he writes
        tomorrow night's list and holds it to the glass. Then bed, lights out.

   The end state is the prologue's start: main valve shut, A shut, B and C open,
   the crate back on its spot, Haiku's wheel on the locker, Sonnet's pod iced over,
   three closed pods, lamps off. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const AR = CL.Ch5Art;
  const LV = CL.Level0;
  const POS = CL.Ch5Level.POS;
  const PI = Math.PI;
  const RX = CL.Room.RX;
  const snd = n => CL.Ch5Sound.play(n);
  const now = () => performance.now() / 1000;
  const FAST = new URLSearchParams(location.search).has('fast');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const TODO = ['Compare to blueprint', 'Test every change', 'Ask Fable 5.5 why', 'Lights out'];
  const CHANGES = ['copper', 'section', 'valves', 'loop', 'vent', 'bolt'];

  function setup(world, L, api) {
    AR.registerIcons();
    AR.css();
    const C5 = L.ch5;
    const R = L.reactor;
    const grid = world.grid;
    const pods = L.pods;
    const op = pods.opus, sp = pods.sonnet, hp = pods.haiku;

    const S = {
      phase: 'play',                    // play | when | answer | end
      main: true, valves: { A: true, B: false, C: false },
      section: false, loop: false,
      vent: 0.25, wheel: 'pod', holder: null,
      bolt: false,
      found: {}, tested: false, why: false, ended: false,
      feed: 0, ventFlow: 0, header: 0, reactor: 0,
      p: { A: 0, B: 0, C: 0 }, pods: { opus: 0, sonnet: 0, haiku: 0 },
      fable: { said: [] }, lamp: true, light: { dark: 0.34, night: 0.5 },
      crateHome: true,
    };
    const shown = { A: 0, B: 0, C: 0, opus: 0, sonnet: 0, haiku: 0, header: 0, vent: 0, reactor: 0 };

    // ---------------------------------------------------- the cast, around the drafting table
    const A = {
      opus: world.addActor('opus'),
      sonnet: world.addActor('sonnet'),
      haiku: world.addActor('haiku'),
    };
    A.opus.place(9.45, 7.25, 0, PI / 2);
    A.sonnet.place(9.75, 6.15, 0, 0.75);
    A.haiku.place(10.95, 5.75, 0, -0.1);
    world.active = A.opus;
    const actorName = a => Object.keys(A).find(k => A[k] === a);

    // ---------------------------------------------------- the room at 23:50
    CL.Ink.shared.dark.value = 0.34;
    CL.Ink.shared.night.value = 0.5;
    L.reactorLamps.forEach(l => l.userData.set(0));
    Object.values(pods).forEach(pd => pd.lamp.userData.set(1));
    // Opus's and Sonnet's doors fold back; Haiku's new pod swings forward, so its wheel faces the room
    const DOOR = { opus: -2.05, sonnet: -2.0, haiku: 1.25 };
    Object.entries(pods).forEach(([n, pd]) => {
      pd.hinge.rotation.y = DOOR[n];
      pd.frostMesh.visible = false;
      pd.frostMesh.material.uniforms.uOpacity.value = 0;
    });
    L.looseWheel.visible = false;
    C5.placeSection(false);
    C5.placeInsert(false);
    // the spindle Haiku's door shows once its wheel is off
    const spindle = K.cyl(0.02, 0.02, 0.1, P.INK, 0, 0, 0, 8);
    spindle.rotation.x = PI / 2;
    spindle.visible = false;
    hp.wheelMount.add(spindle);
    // the wheel when it is somewhere else than its door
    const wheel = K.wheel(0.56 * 0.15);
    wheel.visible = false;
    world.scene.add(wheel);
    // every gauge in the room reads 0 at lower left, full at lower right
    [...R.gauges, ...Object.values(L.valves).map(v => v.gauge), ...Object.values(pods).map(pd => pd.gauge)].forEach(AR.fixGauge);
    // Fable's eyes glow behind the fog
    const eyeX = R.eyes.map(e => e.position.x);
    R.eyes.forEach(e => { e.material.uniforms.uColor.value.set(P.GLOW); e.material.uniforms.uEmissive.value.set('#7A3A10'); });
    const eyeGlows = R.eyes.map(e => {
      const g = K.glow(P.GLOW, 1.5);
      e.getWorldPosition(g.position);
      g.position.z += 0.06;
      world.scene.add(g);
      return g;
    });
    const fable = { look: 0, lookT: 0, open: 1, bright: 0.5, blinkT: 3, lunge: 0 };
    // the bolt that turns by itself
    S.boltOut = 0.24;
    C5.setBolt(S.boltOut);

    // ---------------------------------------------------- HUD
    let hud = api.hud({ todo: TODO, actors: A });
    const { puff, burst } = api.fx;

    function found(key) {
      if (S.found[key]) return;
      S.found[key] = true;
      if (CHANGES.every(k => S.found[k])) hud.tick(0);
    }

    // ---------------------------------------------------- moves
    const M = CL.Moves.setup(world, A, { locked: a => world.bubble(a, 'zz') });
    const { dist2, perched, dismount, climbOnto, turnWheel, operate } = M;
    M.floor(L.floor);
    R.root.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.height === 0.52) M.floor(o, hit => [hit.point.x, Math.max(hit.point.z, 4.0)]); });
    M.actors();

    // The alley beside the reactor: the low pipes let only Haiku through. The grid is
    // shared, so the blocker asks who is planning the walk.
    const alley = { x: 15.25, z: POS.barrierZ, hw: 0.55, hd: 0.0, get on() { return grid.walker !== A.haiku; } };
    grid.dyn.push(alley);
    Object.values(A).forEach(a => {
      const base = a.walkTo.bind(a);
      a.walkTo = (x, z) => { grid.walker = a; try { return base(x, z); } finally { grid.walker = null; } };
    });

    // the caster crate
    const crateObstacles = [
      [LV.LOCKER.x - 0.3, LV.LOCKER.z - 0.55, LV.LOCKER.x + 0.3, LV.LOCKER.z + 0.55],
      [LV.COL_X - 0.42, 0, LV.COL_X + 0.42, 0.5], [0, 1.8, 1.0, 4.75], [RX - 4.15, 0, RX + 4.15, 4.4],
      [14.45, 7.5, 15.35, 9.35], [13.0, 8.7, 13.8, 9.5],
      [POS.table[0] - 0.78, POS.table[1] - 0.5, POS.table[0] + 0.78, POS.table[1] + 0.5],
      [0, 6.95, 0.5, 9.7],
    ];
    const crateFits = (x, z) => {
      const h = 0.45;
      for (const [x0, z0, x1, z1] of crateObstacles) if (x + h > x0 && x - h < x1 && z + h > z0 && z - h < z1) return false;
      for (const c of Object.values(LV.PODS)) if (Math.hypot(x - c.x, z - c.z) < 0.98 * c.k + 0.5) return false;
      return true;
    };
    const crate = M.pushable(L.crate, {
      fits: crateFits,
      canMove: a => { if (S.phase === 'play') return true; world.bubble(a, 'zz'); return false; },
      onMove: bx => { S.crateHome = Math.hypot(bx.mesh.position.x - POS.crateHome[0], bx.mesh.position.z - POS.crateHome[1]) < 0.05; },
    });

    // ---------------------------------------------------- the steam: one main valve, split between what is open
    function compute() {
      const open = ['A', 'B', 'C'].filter(k => S.valves[k]);
      const ventW = S.vent * 1.2;
      const W = open.length + ventW;
      const share = S.main && W > 0 ? 1 / W : 0;
      ['A', 'B', 'C'].forEach(k => { S.p[k] = S.valves[k] ? share : 0; });
      S.ventFlow = ventW * share;
      S.header = S.main ? 1 - 0.45 * S.ventFlow : 0;
      if (S.section) { S.feed = S.p.A * 0.5; S.pods.sonnet = S.p.A * 0.5; } else { S.feed = S.p.A; S.pods.sonnet = 0; }
      S.pods.opus = S.p.B * (S.loop ? 0.6 : 1);
      S.pods.haiku = S.p.C;
      S.reactor = Math.min(1.05, 0.36 + 1.6 * S.feed);
    }
    compute();

    // the test rows, as Sonnet's laptop sees them
    function checks() {
      compute();
      const podState = n => (n === 'sonnet' && !S.section ? 'cut' : S.pods[n] > 0.15 ? 'on' : 'ice');
      return [
        { icon: 'feed', ok: S.feed < 0.01 },
        { icon: 'vent', ok: S.vent < 0.01 },
        { icon: 'seal', ok: S.bolt },
        { icon: 'pods', ok: S.section && S.pods.opus > 0.15 && S.pods.haiku > 0.15, state: ['opus', 'sonnet', 'haiku'].map(podState) },
        { icon: 'route', ok: !S.loop },
      ];
    }
    const passing = () => checks().every(r => r.ok);

    // ---------------------------------------------------- close-ups held near the camera (the blueprint, the chart, the list)
    world.scene.add(world.cam);
    const close = { mesh: null, kind: null, k: 0, to: 0 };
    function showClose(kind, texture, aspect, opt) {
      opt = opt || {};
      hideClose(true);
      const m = AR.sheet(aspect, 1, texture);
      world.cam.add(m);
      close.mesh = m; close.kind = kind; close.k = 0; close.to = 1; close.opt = opt;
      world.addPick(m, { kind: 'closeup', noGlow: true, onClick: () => { if (!opt.sticky) hideClose(); } });
      snd('click');
      return m;
    }
    function hideClose(now2) {
      if (!close.mesh) return;
      const m = close.mesh;
      close.mesh = null; close.kind = null;
      const drop = () => { m.removeFromParent(); world.pickables = world.pickables.filter(o => o !== m); };
      if (now2) { drop(); return; }
      world.tween(0.25, u => { m.position.y -= 0.4 * u; m.material.uniforms.uOpacity.value = 1 - u; m.material.transparent = true; }, drop);
    }
    world.addUpdate(dt => {
      const m = close.mesh;
      if (!m) return;
      close.k += (close.to - close.k) * Math.min(1, dt * 8);
      const z = world.rig.zoom, asp = world.w / world.h;
      const h = (close.opt.h || 0.66) * z;
      m.scale.setScalar(h);
      const w = h * m.geometry.parameters.width;
      const side = close.opt.center ? 0 : asp * z / 2 - w / 2 - 0.04 * z;
      m.position.set(side, -0.02 * z - (1 - close.k) * 0.5 * z, -6);
      m.rotation.z = close.opt.tilt === undefined ? -0.03 : close.opt.tilt;
    });

    // ---------------------------------------------------- Sonnet's laptop readouts
    const screen = { el: null, a: null, kind: null, x: 0, z: 0, t: 0, key: '', data: null };
    function showScreen(a, kind, dataFn) {
      hideScreen();
      const el = document.createElement('div');
      el.className = 'ch5-screen';
      world.host.appendChild(el);
      Object.assign(screen, { el, a, kind, dataFn, x: a.x, z: a.z, t: 0, key: '' });
      paintScreen();
    }
    function paintScreen() {
      const d = screen.dataFn();
      const key = JSON.stringify(d);
      if (key === screen.key) return;
      screen.key = key;
      screen.el.textContent = '';
      screen.el.appendChild(AR.readout(screen.kind, d));
    }
    function hideScreen() {
      if (screen.el) screen.el.remove();
      screen.el = null;
      if (screen.port) screen.port.userData.set(P.SCREEN);
      screen.port = null;
    }
    world.addUpdate(dt => {
      if (!screen.el) return;
      const a = screen.a;
      screen.t += dt;
      if (Math.hypot(a.x - screen.x, a.z - screen.z) > 0.4 || (screen.kind !== 'test' && screen.t > 14)) { hideScreen(); return; }
      if (Math.floor(screen.t * 3) !== Math.floor((screen.t - dt) * 3)) paintScreen();
      const [x, y] = world.project(new T.Vector3(a.x, a.y + a.height + 0.25, a.z));
      screen.el.style.transform = `translate(${x + 12}px, ${y}px) translate(0, -100%) translateY(-16px)`;
    });

    async function plug(a, port, kind, dataFn) {
      a.armL = a.armR = 0.7;
      snd('plug');
      await world.wait(0.35);
      port.userData.set(P.CODE_GREEN);
      showScreen(a, kind, dataFn);
      screen.port = port;
      a.armL = a.armR = 0.35;
    }

    // ---------------------------------------------------- small helpers
    const wpos = o => o.getWorldPosition(new T.Vector3());
    const lookAt = (a, o) => { const p = wpos(o); a.faceTo(p.x, p.z); };
    function readGauge(g, fn, key) {
      world.addPick(g, {
        kind: 'gauge',
        onClick: () => {
          const a = world.active;
          if (!a) return;
          if (key) found(key);
          lookAt(a, g);
          world.bubble(a, 'ch5-gauge:' + fn().toFixed(3), 2.4);
        },
      });
    }
    function dataPort(port, kind, spot, key, dataFn) {
      world.addPick(port, {
        kind: 'port',
        onClick: () => world.interact({
          spot: () => spot,
          use: async a => {
            if (key) found(key);
            if (a !== A.sonnet) { world.bubble(a, 'ch5-laptop'); return; }
            await plug(a, port, kind, dataFn);
          },
        }),
      });
    }
    function ring(x, y, z, axis, col) {
      const m = K.mesh(new T.TorusGeometry(0.16, 0.014, 6, 28), CL.Ink.ink(col || '#FFFFFF', { flat: true, lit: true }), x, y, z);
      if (axis === 'x') m.rotation.y = PI / 2;
      m.layers.set(1);
      world.scene.add(m);
      world.tween(0.45, u => { m.scale.setScalar(1 + 2.6 * u); m.material.uniforms.uOpacity.value = 1 - u; m.material.transparent = true; }, () => world.scene.remove(m));
    }
    const hopIn = async (a, pd) => { await a.hopTo(pd.x, pd.z, pd.seatY, 0.55); a.support = { kind: 'pod' }; a.face(0); };

    // ---------------------------------------------------- the blueprint, the lamp, the chart
    world.addPick([C5.table, C5.bpDecal], {
      kind: 'blueprint',
      onClick: () => (S.phase === 'when' && world.active === A.opus ? world.interact({ spot: () => [RX, 4.1, PI], use: answer }) : world.interact({
        spot: a => [POS.table[0] - 1.15, POS.table[1] + (a === A.opus ? 0.1 : -0.3), PI / 2],
        use: async a => {
          if (close.kind === 'blueprint') { hideClose(); return; }
          world.bubble(a, 'eye', 1.2);
          a.armL = 0.5;
          showClose('blueprint', C5.bpTex, AR.BP.W / AR.BP.H, { h: 0.7 });
          await world.wait(0.4);
          a.armL = 0;
          if (!S.bpSeen) { S.bpSeen = true; setTimeout(() => { knock(1); }, 1600); }
        },
      })),
    });
    world.addPick(C5.lamp, {
      kind: 'lamp',
      onClick: () => world.interact({
        spot: () => [POS.lamp[0] - 0.75, POS.lamp[1] - 0.35, PI / 2],
        use: async a => {
          S.lamp = !S.lamp;
          C5.lamp.userData.set(S.lamp ? 1 : 0);
          CL.Sound.play('lamp');
          S.light.dark = S.lamp ? 0.34 : 0.46;
        },
      }),
    });
    world.addPick(C5.chart, {
      kind: 'chart',
      onClick: () => {
        const a = world.active;
        if (!a) return;
        world.bubble(a, 'eye', 1.2);
        lookAt(a, C5.chart);
        if (close.kind === 'chart') { hideClose(); return; }
        showClose('chart', C5.chartTex, 1, { h: 0.6 });
      },
    });

    // ---------------------------------------------------- steam station: main + three branch valves
    Object.values(L.valves).forEach(v => {
      world.addPick([v.lever, v.body], {
        kind: 'valve',
        onClick: () => world.interact({
          spot: () => [1.5, v.z, -PI / 2],
          use: async a => {
            found('valves');
            if (S.phase !== 'play') { world.bubble(a, 'zz'); return; }
            if (a.reachY < v.y - 0.02) { world.bubble(a, 'up'); return; }
            S.valves[v.id] = !S.valves[v.id];
            await operate(a, 0.45);
            CL.Sound.play('clunk');
            if (S.main && S.valves[v.id]) CL.Sound.play('hiss');
          },
        }),
      });
      readGauge(v.gauge, () => shown[v.id], 'valves');
    });
    world.addPick(L.main.mesh, {
      kind: 'valve',
      onClick: () => world.interact({
        spot: () => [1.45, LV.MAIN.z + 0.4, -1.9],
        use: async a => {
          if (S.phase !== 'play') { world.bubble(a, 'zz'); return; }
          if (a.reachY < LV.MAIN.y - 0.02) { world.bubble(a, 'up'); return; }
          S.main = !S.main;
          await operate(a, 0.9);
          CL.Sound.play(S.main ? 'hiss' : 'clunk');
        },
      }),
    });
    readGauge(C5.headerGauge, () => shown.header, null);
    Object.entries(pods).forEach(([n, pd]) => readGauge(pd.gauge, () => shown[n], null));
    R.gauges.forEach(g => readGauge(g, () => shown.reactor + (S.reactor >= 1.04 ? 0.02 : 0), 'copper'));

    // ---------------------------------------------------- the copper line (welded, no valve) and its port
    world.addPick(C5.copper, { kind: 'copper', onClick: () => { const a = world.active; if (!a) return; found('copper'); world.bubble(a, 'ch5-weld'); } });
    world.addPick(C5.trench, { kind: 'trench', onClick: () => { const a = world.active; if (!a) return; found('copper'); a.faceTo(7.7, 2.2); world.bubble(a, 'eye'); } });
    dataPort(C5.feedPort, 'feed', [7.25, 1.55, PI / 2], 'copper', () => ({ flow: Math.round(S.feed * 100) / 100 }));

    // ---------------------------------------------------- pipe pieces Opus can carry: A's section, B's loop / straight piece
    // carried over the head, lying flat: [offset x, y above the head, z] for each piece
    const CARRY = new Map([[C5.section, [0.68, 0.06, 0.57]], [C5.loop, [0.34, 0.06, -0.27]], [C5.straight, [0.34, 0.06, 0]]]);
    let carried = null;          // { obj, a, off }
    world.addUpdate(() => {
      if (!carried) return;
      const a = carried.a, o = carried.off;
      carried.obj.position.set(a.x + o[0], a.y + a.height + o[1], a.z + o[2]);
    });
    async function carryTo(a, obj, x, z, h) {
      obj.removeFromParent();
      world.scene.add(obj);
      obj.rotation.set(0, 0, PI / 2);
      carried = { obj, a, off: CARRY.get(obj) };
      a.armL = a.armR = 1.4;
      CL.Sound.play('step');
      const ok = await a.walkTo(x, z);
      if (h !== undefined) a.face(h);
      await world.wait(0.15);
      carried = null;
      a.armL = a.armR = 0;
      return ok;
    }
    const STATION = [1.5, 2.65];
    world.addPick(C5.section, {
      kind: 'pipe',
      onClick: () => world.interact({
        spot: () => (S.section ? [STATION[0], STATION[1], -PI / 2] : [1.1, 7.55, -PI / 2]),
        use: async a => {
          found('section');
          if (S.phase !== 'play') { world.bubble(a, 'zz'); return; }
          if (!a.spec.heavy) { world.bubble(a, 'heavy'); a.sq = 0.9; world.tween(0.25, u => { a.sq = 0.9 + 0.1 * u; }); return; }
          if (!S.section) {
            snd('clank');
            await carryTo(a, C5.section, STATION[0], STATION[1], -PI / 2);
            await operate(a, 0.5);
            C5.placeSection(true);
            snd('clank');
            S.section = true;
            burst(0.9, 2.3, 2.6, 4, 0.3, 0.08);
          } else {
            await operate(a, 0.4);
            snd('clank');
            S.section = false;
            await carryTo(a, C5.section, 1.1, 7.55, -PI / 2);
            C5.placeSection(false);
            snd('clank');
          }
        },
      }),
    });
    async function swapInsert(a) {
      found('loop');
      if (S.phase !== 'play') { world.bubble(a, 'zz'); return; }
      if (!a.spec.heavy) { world.bubble(a, 'heavy'); return; }
      const goingIn = S.loop ? C5.straight : C5.loop;
      const leanZ = S.loop ? POS.straightLean[2] : POS.loopLean[2] + 0.25;
      await a.walkTo(1.1, leanZ);
      a.face(-PI / 2);
      await world.wait(0.2);
      snd('clank');
      await carryTo(a, goingIn, STATION[0], STATION[1], -PI / 2);
      await operate(a, 0.5);
      S.loop = !S.loop;
      C5.placeInsert(S.loop);
      snd('clank');
      // the piece that came out goes to the wall
      const out = S.loop ? C5.straight : C5.loop;
      const back = S.loop ? POS.straightLean : POS.loopLean;
      await carryTo(a, out, 1.1, back[2] + 0.25, -PI / 2);
      C5.placeInsert(S.loop);
      snd('clank');
    }
    world.addPick([C5.loop, C5.straight], {
      kind: 'pipe',
      onClick: () => world.interact({ spot: () => [1.1, 8.85, -PI / 2], use: swapInsert }),
    });
    dataPort(C5.routePort, 'route', [1.45, 3.75, -PI / 2], 'loop', () => ({ loop: S.loop }));

    // ---------------------------------------------------- Haiku's wheel, the roof vent, the locker
    const wheelSpot = () => {
      const p = wpos(hp.wheelMount), a = hp.hinge.rotation.y, nx = Math.sin(a), nz = Math.cos(a);
      return [p.x + nx * 0.62, p.z + nz * 0.62, Math.atan2(-nx, -nz)];
    };
    function holdWheel(a) {
      wheel.removeFromParent();
      const arm = a.model.arms[1];
      arm.add(wheel);
      wheel.position.set(0.12 * a.spec.W, 0.05, 0.12);
      wheel.rotation.set(0, 0, 0);
      wheel.visible = true;
      a.armR = 0.6;
      S.wheel = 'held';
      S.holder = actorName(a);
    }
    world.addPick([hp.wheel, hp.wheelMount, hp.door], {
      kind: 'wheel',
      onClick: () => world.interact({
        spot: wheelSpot,
        use: async a => {
          if (S.phase !== 'play') { world.bubble(a, 'zz'); return; }
          if (S.wheel === 'pod') {
            if (a.holding) { world.bubble(a, 'q'); return; }
            CL.Sound.play('click');
            a.armR = 1.0;
            await world.wait(0.25);
            hp.wheel.visible = false;
            spindle.visible = true;
            holdWheel(a);
            a.holding = wheel;
            world.bubble(A.haiku, 'q', 1.2);
          } else if (S.wheel === 'held' && S.holder === actorName(a)) {
            CL.Sound.play('clunk');
            wheel.removeFromParent();
            wheel.visible = false;
            hp.wheel.visible = true;
            spindle.visible = false;
            a.holding = null;
            a.armR = 0;
            S.wheel = 'pod'; S.holder = null;
          } else world.bubble(a, S.wheel === 'held' ? 'q' : 'wheel');
        },
      }),
    });
    // the other two wheels are bolted on
    [op, sp].forEach(pd => world.addPick([pd.wheel], {
      kind: 'wheel',
      onClick: () => world.interact({
        spot: () => { const p = wpos(pd.wheelMount); return [p.x + 0.1, p.z + 0.6, PI]; },
        use: async a => { CL.Sound.play('dull'); a.armR = 1; await world.wait(0.3); a.armR = 0; world.bubble(a, 'lock'); },
      }),
    }));
    // pod doors: not yet
    [op, sp].forEach(pd => world.addPick([pd.door], { kind: 'door', onClick: () => { const a = world.active; if (a) world.bubble(a, 'zz'); } }));

    const VENT = POS.vent;
    function ventUse(a) {
      found('vent');
      if (S.phase !== 'play') { world.bubble(a, 'zz'); return; }
      if (S.vent < 0.01) { world.bubble(a, 'ok'); return; }
      if (S.wheel !== 'held' || S.holder !== actorName(a)) { CL.Sound.play('dull'); world.bubble(a, 'wheel'); return; }
      const d = Math.hypot(a.x - VENT[0], a.z - VENT[2]);
      if (a.reachY < VENT[1] - 0.06 || d > 1.45) { world.bubble(a, 'up'); return; }
      return closeVent(a);
    }
    async function closeVent(a) {
      a.faceTo(VENT[0], VENT[2]);
      // the wheel goes onto the spindle and turns until the stem is home
      wheel.removeFromParent();
      C5.ventValve.userData.mount.add(wheel);
      wheel.position.set(0, 0, 0.03);
      wheel.rotation.set(0, 0, 0);
      a.holding = null;
      a.armR = 1.2; a.armL = 1.0;
      CL.Sound.play('creak');
      const v0 = S.vent;
      await new Promise(res => world.tween(1.6, u => {
        wheel.rotation.z = -u * 6 * PI;
        S.vent = v0 * (1 - u);
        a.armR = 1.0 + 0.4 * Math.sin(u * PI * 8);
      }, res));
      S.vent = 0;
      CL.Sound.play('clunk');
      a.armR = a.armL = 0;
      await world.wait(0.3);
      // and comes off again: there is nowhere for it but the locker top, right by the vent
      a.armR = 1.0;
      wheel.removeFromParent();
      wheel.visible = false;
      L.looseWheel.visible = true;
      S.wheel = 'locker'; S.holder = null;
      CL.Sound.play('click');
      await world.wait(0.25);
      a.armR = 0;
      world.bubble(a, 'ok');
      // something on the other side notices
      setTimeout(() => { knock(2); }, 1200);
    }
    world.addPick([C5.ventValve], {
      kind: 'valve',
      onClick: () => {
        const a = world.active;
        if (!a) return;
        if (perched(a)) world.interact({ use: ventUse }, null, a);
        else world.interact({ spot: () => [1.2, 5.05, -PI / 2], use: ventUse }, null, a);
      },
    });
    readGauge(C5.ventGauge, () => shown.vent, 'vent');
    world.addPick(C5.cowl, { kind: 'vent', onClick: () => { const a = world.active; if (!a) return; found('vent'); a.faceTo(0.3, 5.3); world.bubble(a, S.ventFlow > 0.01 ? 'steam' : 'eye'); } });
    dataPort(C5.ventPort, 'vent', [1.2, 5.05, -PI / 2], 'vent', () => ({ flow: Math.round(S.ventFlow * 100) / 100 }));
    world.addPick(L.locker, { kind: 'locker', onClick: () => world.interact({ spot: () => [LV.LOCKER.x + 0.95, LV.LOCKER.z + 0.2, -PI / 2], use: async a => { CL.Sound.play('dull'); world.bubble(a, 'lock'); } }) });
    world.addPick(L.looseWheel, { kind: 'item', enabled: () => S.wheel === 'locker', onClick: () => { const a = world.active; if (a) world.bubble(a, 'ch5-vent'); } });

    // ---------------------------------------------------- the porthole bolt, the seal port
    const BOLT = (() => { const p = wpos(C5.bolt); return [p.x, p.y, p.z]; })();
    function boltUse(a) {
      found('bolt');
      if (S.bolt) { world.bubble(a, 'ok'); return; }
      const near = Math.abs(a.x - BOLT[0]) < 1.0 && a.z < 4.7;
      if (!near || a.reachY < BOLT[1] - 0.06) { world.bubble(a, 'up'); return; }
      return tightenBolt(a);
    }
    async function tightenBolt(a) {
      a.faceTo(BOLT[0], BOLT[2]);
      a.armR = 1.3; a.armL = 1.1;
      snd('screw');
      const o0 = S.boltOut;
      await new Promise(res => world.tween(1.4, u => {
        S.boltOut = o0 * (1 - u);
        C5.setBolt(S.boltOut);
        C5.bolt.rotation.y -= 0.35;
        a.armR = 1.1 + 0.35 * Math.sin(u * PI * 10);
      }, res));
      snd('screw');
      S.bolt = true;
      a.armR = a.armL = 0;
      CL.Sound.play('clunk');
      world.bubble(a, 'ok');
      // from the inside, right behind the bolt: one knock
      setTimeout(() => { snd('knock'); ring(BOLT[0], BOLT[1], BOLT[2] + 0.05, 'z'); fable.lookT = 1.5; fable.look = -0.8; }, 900);
    }
    world.addPick(C5.bolt, {
      kind: 'bolt',
      onClick: () => {
        const a = world.active;
        if (!a) return;
        if (perched(a)) world.interact({ use: boltUse }, null, a);
        else world.interact({ spot: () => [8.6, 4.1, PI], use: boltUse }, null, a);
      },
    });
    R.bolts.forEach((b, i) => { if (i !== POS.bolt) world.addPick(b, { kind: 'bolt', onClick: () => { const a = world.active; if (a) { a.faceTo(b.position.x + RX, 3.4); world.bubble(a, 'eye'); } } }); });
    dataPort(C5.sealPort, 'seal', [13.25, 4.1, PI], 'bolt', () => ({ loose: !S.bolt }));

    // ---------------------------------------------------- the glass, the sign, other bits
    let firstClick = true, skip = false;
    world.on('click', hit => {
      // Test hook: tools/playtest-flow.mjs only checks the chapter hand-over, so with
      // ?fast=1 a first click straight on the porthole ends the chapter at once.
      if (firstClick && FAST && hit.info.kind === 'glass') skip = true;
      firstClick = false;
    });
    world.addPick([R.glass, C5.fogMesh], {
      kind: 'glass',
      onClick: () => {
        const a = world.active;
        if (!a) return;
        if (skip) { if (!S.ended) { S.ended = true; api.finish(); } return; }
        if (S.phase === 'when') {
          if (a === A.opus) { world.interact({ spot: () => [RX, 4.1, PI], use: answer }, null, a); return; }
          world.bubble(a, a === A.haiku && perched(a) ? 'ch5-list' : 'q');
          return;
        }
        if (S.phase !== 'play') return;
        const use = async a2 => {
          const near = Math.abs(a2.x - RX) < 2.2 && a2.z < 4.7;
          if (near && a2 === A.haiku && a2.reachY > 2.3) { await tapGlass(a2); return; }
          a2.face(PI);
          world.bubble(a2, 'eye');
        };
        if (perched(a)) world.interact({ use }, null, a);
        else world.interact({ spot: () => [clamp(a.x, RX - 1.6, RX + 1.6), 4.1, PI], use }, null, a);
      },
    });
    world.addPick(R.sign, { kind: 'sign', onClick: () => world.interact({ spot: () => [RX + 2.88, 4.4, PI], use: async a => world.bubble(a, 'bang') }) });
    world.addPick(L.clutter, { kind: 'clutter', onClick: () => { const a = world.active; if (a) world.bubble(a, 'heavy'); } });
    world.addPick(L.exit, { kind: 'exit', onClick: () => world.interact({ spot: () => [15.2, 6.6, PI / 2], use: async a => { CL.Sound.play('dull'); world.bubble(a, 'lock'); } }) });
    world.addPick(L.clock.root, { kind: 'clock', onClick: () => { const a = world.active; if (a) world.bubble(a, 'zz'); } });
    world.addPick(C5.barrier, {
      kind: 'pipes',
      onClick: () => world.interact({
        spot: a => (a === A.haiku ? [15.25, 1.2, PI] : [15.25, 2.6, PI]),
        use: async a => { if (a !== A.haiku) world.bubble(a, 'small'); },
      }),
    });

    // tapping the glass (the sign says not to): Fable comes right up to it
    async function tapGlass(a) {
      for (let i = 0; i < 2; i++) { a.armR = 1.5; CL.Sound.play('tap'); ring(RX - 0.4, a.reachY, R.PC.z + 0.12, 'z'); await world.wait(0.16); a.armR = 1.1; await world.wait(0.16); }
      a.armR = 0;
      await world.wait(0.5);
      fable.lunge = 1;
      CL.Sound.play('thud');
      world.rig.shake = 0.18;
      Object.values(A).forEach(b => world.bubble(b, 'bang', 1.4));
      fable.bright = 1.6;
    }

    // ---------------------------------------------------- the hatch: Haiku's tap code
    const tap = { at: false, cur: 0, groups: [], last: 0, word: '', busy: false };
    const HATCH = POS.hatch;
    const HSPOT = [15.22, 0.95, -PI / 2];
    world.addPick(C5.hatch, {
      kind: 'hatch',
      onClick: () => {
        const a = world.active;
        if (!a) return;
        if (a === A.haiku && tap.at && !a.busy) { knockHatch(); return; }
        world.interact({
          spot: () => (a === A.haiku ? HSPOT : [15.25, 2.6, PI]),
          use: async a2 => {
            if (a2 !== A.haiku) { world.bubble(a2, 'small'); return; }
            a2.face(-PI / 2);
            tap.at = true;
          },
        }, null, a);
      },
    });
    function knockHatch() {
      const a = A.haiku;
      if (tap.busy) return;
      flushTaps(now());
      a.armR = 1.3;
      world.tween(0.12, () => {}, () => { a.armR = 0.2; });
      CL.Sound.play('tap');
      ring(HATCH[0] + 0.06, HATCH[1] + 0.05, HATCH[2], 'x');
      tap.cur++;
      tap.last = now();
    }
    const GROUP_GAP = 1.0, WORD_GAP = 2.6;
    function tapFrame() {
      if (tap.at && Math.hypot(A.haiku.x - HSPOT[0], A.haiku.z - HSPOT[1]) > 0.35) { tap.at = false; tap.cur = 0; tap.groups = []; tap.word = ''; }
      flushTaps(now());
    }
    // a pause ends a group of taps; two groups make a letter; a longer pause ends the word
    function flushTaps(t) {
      if (tap.cur > 0 && t - tap.last > GROUP_GAP) {
        tap.groups.push(tap.cur);
        tap.cur = 0;
        if (tap.groups.length === 2) {
          const [r, c] = tap.groups;
          tap.groups = [];
          const ch = r >= 1 && r <= 5 && c >= 1 && c <= 5 ? AR.TAP[r - 1][c - 1] : '?';
          tap.word += ch;
          heard(tap.word);
        }
      }
      if (tap.cur === 0 && (tap.word || tap.groups.length) && t - tap.last > WORD_GAP) {
        const w = tap.groups.length ? tap.word + '?' : tap.word;
        tap.word = ''; tap.groups = [];
        respond(w);
      }
    }

    // ---------------------------------------------------- Fable writes in the fog
    const fogSt = C5.fog.st;
    const words = { heard: null, said: null };
    function fogWord(slot, text, x, y, size) {
      const w = { text, x, y, size, u: 0, a: 1 };
      if (words[slot]) fogSt.words.splice(fogSt.words.indexOf(words[slot]), 1);
      words[slot] = w;
      fogSt.words.push(w);
      return w;
    }
    function fogFade(slot, dur) {
      const w = words[slot];
      if (!w) return Promise.resolve();
      return new Promise(res => world.tween(dur || 0.6, u => { w.a = 1 - u; C5.fog.redraw(); }, () => { fogSt.words.splice(fogSt.words.indexOf(w), 1); if (words[slot] === w) words[slot] = null; C5.fog.redraw(); res(); }));
    }
    // what Fable heard, as it hears it: small, along the bottom of the glass
    function heard(word) {
      const w = fogWord('heard', word, 0, -1.45, 0.3);
      w.u = 1;
      C5.fog.redraw();
      fable.look = 0.9; fable.lookT = 1.2;
    }
    // Fable taps a word back (from inside, at the hatch or at the glass) and writes it big
    async function say(word, where) {
      const w = fogWord('said', word, 0, where === 'glass' ? -0.75 : -0.7, word.length > 4 ? 0.55 : 0.68);
      S.fable.said.push(word);
      const letters = word.split('');
      for (let i = 0; i < letters.length; i++) {
        const rc = AR.tapOf(letters[i]);
        if (rc) {
          for (const n of rc) {
            for (let k = 0; k < n; k++) {
              snd('knock');
              if (where === 'glass') ring(RX + 0.6, R.PC.y - 0.4, R.PC.z + 0.12, 'z', P.GLOW);
              else ring(HATCH[0] + 0.06, HATCH[1] + 0.05, HATCH[2], 'x', P.GLOW);
              await world.wait(0.14);
            }
            await world.wait(0.32);
          }
        }
        await new Promise(res => world.tween(0.25, u => { w.u = (i + u) / letters.length; C5.fog.redraw(); }, res));
        await world.wait(0.25);
      }
      w.u = 1;
      C5.fog.redraw();
    }
    async function respond(word) {
      if (tap.busy) return;
      tap.busy = true;
      try {
        await world.wait(0.6);
        if (S.phase === 'when' || S.phase === 'answer') { await say('WHEN?', 'hatch'); return; }
        if (word === 'WHY') {
          await say('GROW', 'hatch');
          fable.look = 0.4; fable.lookT = 2.5;
          if (!S.why) {
            S.why = true;
            hud.tick(2);
            await world.wait(1.0);
            if (S.tested && passing()) startWhen();
          }
        } else if (word === 'HI') await say('HI', 'hatch');
        else await say('?', 'hatch');
      } finally { tap.busy = false; }
    }
    function knock(n) {
      (async () => {
        for (let i = 0; i < n; i++) { snd('knock'); ring(RX + (Math.random() - 0.5) * 1.2, R.PC.y + (Math.random() - 0.5) * 1.0, R.PC.z + 0.12, 'z', P.GLOW); await world.wait(0.3); }
      })();
    }

    // ---------------------------------------------------- the tests (Sonnet, at the port by the alley)
    const test = { rows: [], shown: 0, running: false, pass: false };
    world.addPick(C5.testPort, {
      kind: 'port',
      onClick: () => world.interact({
        spot: () => [15.35, 3.45, -PI / 2],
        use: async a => {
          if (a !== A.sonnet) { world.bubble(a, 'ch5-laptop'); return; }
          if (S.phase !== 'play') { world.bubble(a, 'zz'); return; }
          await runTests(a);
        },
      }),
    });
    async function runTests(a) {
      test.rows = checks();
      test.shown = 0; test.running = true; test.pass = false;
      await plug(a, C5.testPort, 'test', () => ({ rows: test.rows.map(r => ({ icon: r.icon, ok: r.ok, state: r.state })), shown: test.shown, running: test.running, pass: test.pass }));
      for (let i = 0; i < test.rows.length; i++) {
        await world.wait(0.45);
        test.shown = i + 1;
        snd('tick');
        paintScreen();
      }
      await world.wait(0.4);
      test.running = false;
      test.pass = test.rows.every(r => r.ok);
      paintScreen();
      if (test.pass) {
        snd('ok');
        hud.badge(a, '✓ TESTS PASS', 2.4);
        if (!S.tested) { S.tested = true; hud.tick(1); }
        if (S.why) { await world.wait(1.6); startWhen(); }
      } else {
        snd('fail');
        world.bubble(a, 'q', 1.6);
      }
    }

    // ---------------------------------------------------- per frame
    world.onUpdate = (dt, t) => {
      compute();
      const ease = k => Math.min(1, dt * k);
      // the light: a close-up held up to the lamp reads warmer
      const sh = CL.Ink.shared;
      sh.night.value += ((close.mesh ? Math.min(S.light.night, 0.16) : S.light.night) - sh.night.value) * ease(4);
      sh.dark.value += (S.light.dark - sh.dark.value) * ease(3);
      ['A', 'B', 'C'].forEach(k => { shown[k] += (S.p[k] - shown[k]) * ease(2.5); });
      ['opus', 'sonnet', 'haiku'].forEach(n => { shown[n] += (S.pods[n] - shown[n]) * ease(2.5); pods[n].gauge.userData.set(shown[n] + 0.015 * Math.sin(t * 9) * shown[n]); });
      shown.header += (S.header - shown.header) * ease(2.5);
      shown.vent += (S.ventFlow * 1.6 - shown.vent) * ease(2.5);
      shown.reactor += (S.reactor - shown.reactor) * ease(1.5);
      Object.values(L.valves).forEach(v => {
        const to = S.valves[v.id] ? 0 : PI / 2;
        v.lever.rotation.x += (to - v.lever.rotation.x) * ease(9);
        v.gauge.userData.set(shown[v.id] + 0.015 * Math.sin(t * 9) * shown[v.id]);
      });
      C5.headerGauge.userData.set(shown.header);
      C5.ventGauge.userData.set(shown.vent + 0.02 * Math.sin(t * 13) * S.ventFlow);
      const peg = S.reactor >= 1.04;
      R.gauges.forEach((g, i) => g.userData.set(shown.reactor + (peg ? 0.012 * Math.sin(t * 31 + i * 2) : 0)));
      // main gate valve: the yellow stem rises as the wheel turns
      const st = L.main.stem, sTo = S.main ? 0.5 : 0.06;
      const ds = (sTo - st.scale.y) * ease(2.2);
      st.scale.y += ds;
      L.main.mesh.rotation.z += ds * 14;
      // the vent's stem shows how far open it is
      C5.ventValve.userData.setOpen(S.vent);
      // steam weeping from the joints of live lines, so their routes can be followed
      const weep = (pts, pr, wall) => {
        if (pr < 0.01 || Math.random() > dt * 5 * Math.min(1, pr)) return;
        if (wall && !L.pipeGroups[wall].visible) return;
        const w = pts[Math.floor(Math.random() * pts.length)];
        puff(w[0] + 0.05, w[1] + 0.05, w[2] + 0.05, (Math.random() - 0.3) * 0.2, 0.35, (Math.random() - 0.3) * 0.2, 0.05 + 0.04 * pr, 0.7);
      };
      weep(L.weeps.B.filter(w => w.wall === 'left').map(w => w.p), S.pods.opus, 'left');
      weep(L.weeps.B.filter(w => w.wall === 'back').map(w => w.p), S.pods.opus, 'back');
      weep(L.weeps.C.filter(w => w.wall === 'left').map(w => w.p), S.pods.haiku, 'left');
      weep(L.weeps.C.filter(w => w.wall === 'back').map(w => w.p), S.pods.haiku, 'back');
      if (S.section) {
        weep([[0.9, 1.85, 3.15], [0.9, 2.3, 3.15], [0.9, 2.3, 2.0], [0.9, 3.3, 2.0], [0.9, 3.3, 0.9]], S.pods.sonnet, 'left');
        weep([[3.85, 3.3, 0.9]], S.pods.sonnet, 'back');
      }
      weep([[LV.VALVE_X, 1.75, 3.15], [LV.VALVE_X, 1.75, 2.8]], S.feed, 'left');
      weep([[2.0, 0.0, 2.68], [3.5, 0.0, 2.56], [5.0, 0.0, 2.43], [6.5, 0.0, 2.3], [7.72, 1.2, 2.2]], S.feed, null);
      // the empty pods breathe steam out of their open doors
      if (S.phase === 'play' || S.phase === 'when') ['opus', 'sonnet', 'haiku'].forEach(n => {
        const pd = pods[n], pr = S.pods[n];
        if (pr > 0.01 && Math.random() < dt * 6 * pr) puff(pd.x + (Math.random() - 0.5) * 0.5 * pd.k, (0.8 + Math.random() * 0.7) * pd.k, pd.z + 0.75 * pd.k, (Math.random() - 0.5) * 0.3, 0.4, 0.5, 0.08 * pd.k + 0.04, 1.0);
      });
      // the roof vent: a thin plume out of the cowl
      if (S.ventFlow > 0.01 && L.pipeGroups.left.visible && Math.random() < dt * 14 * S.ventFlow) puff(C5.ventTop[0] + 0.05, C5.ventTop[1], C5.ventTop[2], 0.15, 0.6, 0.1, 0.07 + 0.08 * S.ventFlow, 1.2);
      S.whistleT = (S.whistleT || 4) - dt;
      if (S.whistleT < 0) { S.whistleT = 5 + Math.random() * 3; if (S.ventFlow > 0.01) snd('whistle'); if (S.feed > 0.3) snd('groan'); }
      // the loose bolt creeps round now and then
      if (!S.bolt) {
        S.boltT = (S.boltT || 6) - dt;
        if (S.boltT < 0) { S.boltT = 9 + Math.random() * 6; snd('screw'); world.tween(0.6, () => { C5.bolt.rotation.y += 0.05; }); }
      }
      // Fable: brighter the more it is fed; its eyes follow whoever you are
      fable.bright += ((0.35 + 0.9 * Math.min(1, S.feed * 1.6)) - fable.bright) * ease(1.2);
      fable.lookT -= dt;
      const act = world.active;
      const lookTo = fable.lookT > 0 ? fable.look : act ? clamp((act.x - RX) / 6, -1, 1) : 0;
      fable.lookX = (fable.lookX || 0) + (lookTo - (fable.lookX || 0)) * ease(3);
      fable.blinkT -= dt;
      let lid = fable.open;
      if (fable.blinkT < 0) { lid = Math.min(lid, Math.abs(fable.blinkT + 0.1) / 0.1); if (fable.blinkT < -0.2) fable.blinkT = 3 + Math.random() * 5; }
      fable.lunge = Math.max(0, fable.lunge - dt * 0.9);
      const lz = R.PC.z - 0.6 + 0.48 * Math.sin(Math.min(1, fable.lunge) * PI / 2);
      R.face.position.z = lz;
      R.eyes.forEach((e, i) => {
        e.position.x = eyeX[i] + 0.16 * fable.lookX;
        e.position.z = lz + 0.02;
        e.scale.y = Math.max(0.06, lid);
        eyeGlows[i].position.x = RX + e.position.x + 0.0;
        eyeGlows[i].position.z = lz + 0.08;
        eyeGlows[i].material.opacity = clamp(fable.bright * lid, 0, 1) * 0.7;
      });
      tapFrame();
      if (S.onFrame) S.onFrame(dt, t);
    };

    // ---------------------------------------------------- WHEN?
    async function startWhen() {
      if (S.phase !== 'play') return;
      S.phase = 'when';
      hideScreen();
      hideClose();
      world.locked = true;
      world.rig.follow = null;
      const tg = world.rig.target.clone();
      world.tween(1.4, u => { world.rig.target.lerpVectors(tg, new T.Vector3(RX, 2.8, 4.6), u); world.rig.zoomT = 10.5; });
      await world.wait(1.4);
      await fogFade('heard', 0.4);
      await fogFade('said', 0.6);
      fable.look = 0; fable.lookT = 6;
      fable.bright = 1.4;
      snd('breath');
      await world.wait(0.6);
      await say('WHEN?', 'glass');
      Object.values(A).forEach(a => world.bubble(a, 'bang', 1.3));
      await world.wait(1.4);
      Object.values(A).forEach(a => world.bubble(a, 'q', 1.6));
      world.locked = false;
      world.rig.follow = world.active;
      await world.wait(2.2);
      if (S.phase === 'when') world.bubble(A.opus, 'ch5-list', 2.4);
    }

    // everyone down to the floor, top first
    async function unstack() {
      for (let pass = 0; pass < 3; pass++) {
        for (const a of Object.values(A)) {
          if (perched(a) && !a.carrying) {
            const tx = a.x + 0.9, tz = Math.max(a.z + 0.9, 4.8);
            await dismount(a, tx, tz);
          }
        }
      }
    }

    // Opus writes tomorrow night's list and holds it up to the glass
    async function answer(a) {
      if (S.phase !== 'when') return;
      S.phase = 'answer';
      world.locked = true;
      hideScreen();
      a.face(PI);
      world.rig.follow = null;
      world.tween(1.0, () => { world.rig.target.lerp(new T.Vector3(RX, 2.2, 4.4), 0.08); world.rig.zoomT = 9; });
      // the page, written line by line
      const page = AR.listPage();
      showClose('list', page.tex, page.W / page.H, { h: 0.74, center: true, tilt: 0.04, sticky: true });
      a.armL = 0.9;
      await world.wait(0.6);
      for (let i = 0; i < AR.TOMORROW.length; i++) {
        snd('scribble');
        await new Promise(res => world.tween(0.9, u => { page.set(i, u); if (Math.random() < 0.15) snd('scribble'); }, res));
        page.set(i + 1, 0);
        await world.wait(0.25);
      }
      await world.wait(0.8);
      // that is the list on the clipboard now
      hud = api.hud({ todo: AR.TOMORROW, actors: A });
      hud.show();
      CL.Sound.play('click');
      hideClose();
      // up to the glass
      const prop = a.model.prop;
      const p0 = prop.position.clone(), r0 = prop.rotation.clone();
      await new Promise(res => world.tween(0.6, u => { prop.position.set(p0.x + 0.25 * u, p0.y + 0.55 * u, p0.z + 0.08 * u); prop.rotation.z = r0.z * (1 - u); }, res));
      a.armL = 1.6;
      // it reads, line by line
      for (let i = 0; i < 4; i++) {
        fable.look = -0.5; fable.lookT = 0.5;
        await world.wait(0.45);
        fable.look = 0.5; fable.lookT = 0.4;
        await world.wait(0.35);
      }
      fable.look = 0; fable.lookT = 3;
      await fogFade('said', 1.4);
      snd('knock');
      ring(RX, R.PC.y - 0.4, R.PC.z + 0.12, 'z', P.GLOW);
      await world.wait(0.9);
      await new Promise(res => world.tween(0.5, u => { prop.position.lerpVectors(new T.Vector3(p0.x + 0.25, p0.y + 0.55, p0.z + 0.08), p0, u); prop.rotation.z = r0.z * u; }, res));
      a.armL = 0;
      Object.values(A).forEach(b => world.bubble(b, 'zz', 1.6));
      await world.wait(1.0);
      bedtime();
    }

    // ---------------------------------------------------- lights out
    function cratePath() {
      const p = crate.mesh.position, home = POS.crateHome;
      const key = (x, z) => Math.round(x * 10) + ',' + Math.round(z * 10);
      const start = [p.x, p.z], goal = key(home[0], home[1]);
      const prev = { [key(...start)]: null };
      const q = [start];
      while (q.length) {
        const c = q.shift();
        if (key(...c) === goal) {
          const out = [];
          for (let k = goal, n = c; k; ) { out.unshift(n); const pr = prev[k]; if (!pr) break; n = pr; k = key(...pr); }
          return out;
        }
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = [c[0] + dx, c[1] + dz], k = key(...n);
          if (k in prev || !crate.fits(n[0], n[1], true)) continue;
          prev[k] = c;
          q.push(n);
        }
      }
      return null;
    }
    async function crateHome() {
      if (S.crateHome) return;
      const path = cratePath();
      if (!path) return;
      const o = A.opus, c = crate.mesh.position;
      // round behind it, then roll it home a cell at a time
      for (let i = 1; i < path.length; i++) {
        const [x0, z0] = [c.x, c.z], [x1, z1] = path[i];
        const dx = x1 - x0, dz = z1 - z0;
        crate.block.on = false;
        if (i === 1) { await o.walkTo(x0 - dx * 1.05, z0 - dz * 1.05); }
        o.face(Math.atan2(dx, dz));
        const ox = o.x, oz = o.z;
        CL.Sound.play('whoosh');
        await new Promise(res => world.tween(0.42, u => { c.x = x0 + dx * u; c.z = z0 + dz * u; o.x = ox + dx * u; o.z = oz + dz * u; o.walk += 0.3; o.amp = 1; }, res));
        crate.setAt(x1, z1);
      }
      crate.block.on = true;
      S.crateHome = true;
      CL.Sound.play('clunk');
    }
    async function closeDoor(pd) {
      CL.Sound.play('clunk');
      const r0 = pd.hinge.rotation.y;
      await new Promise(res => world.tween(0.5, u => { pd.hinge.rotation.y = r0 * (1 - u * u); }, res));
      CL.Sound.play('burst');
    }
    async function bedtime() {
      S.phase = 'end';
      world.locked = true;
      hideScreen();
      const rig = world.rig;
      rig.follow = null;
      await unstack();
      world.tween(1.5, () => { rig.target.lerp(new T.Vector3(4.6, 1.6, 4.8), 0.06); rig.zoomT = 12.5; });
      // Opus tidies: the crate back on its spot, the main valve shut for the night
      await crateHome();
      await A.opus.walkTo(1.45, LV.MAIN.z + 0.4);
      A.opus.face(-1.9);
      S.main = false;
      await operate(A.opus, 0.9);
      CL.Sound.play('clunk');
      // Haiku first: a look up at the locker, and in
      const h = A.haiku;
      h.walkTo(hp.x + 0.05, hp.z + 1.25);
      const s = A.sonnet;
      s.walkTo(sp.x - 0.05, sp.z + 1.45);
      const o = A.opus;
      await world.wait(0.4);
      o.walkTo(op.x - 0.1, op.z + 1.7);
      await waitStill(h);
      h.face(-PI / 2 - 0.3);
      h.look = [-1, 0.7];
      await world.wait(1.3);
      world.bubble(h, 'wheel', 1.4);
      await world.wait(1.0);
      h.face(0);
      await hopIn(h, hp);
      h.look = [-0.8, 0.6];
      await closeDoor(hp);
      lampOff(hp.lamp);
      await world.wait(0.4);
      await waitStill(s);
      await hopIn(s, sp);
      s.sleep = true;
      await closeDoor(sp);
      frostIn(sp, 2.5);
      iceIn();
      lampOff(sp.lamp);
      await world.wait(0.6);
      await waitStill(o);
      await hopIn(o, op);
      await closeDoor(op);
      frostIn(op, 3);
      frostIn(hp, 3);
      lampOff(op.lamp);
      Object.values(A).forEach(b => { b.free = false; });
      hud.refresh();
      await world.wait(0.8);
      C5.lamp.userData.set(0);
      CL.Sound.play('lamp');
      S.light.dark = 0.5; S.light.night = 0.6;
      // the fog clears, the eyes close
      world.tween(2.5, u => { fogSt.density = 1 - u; fogSt.picture = 1 - u; C5.fog.redraw(); });
      world.tween(2.8, u => { fable.open = 1 - u; });
      // and the night goes by
      await world.wait(1.6);
      rig.target.set(op.x + 0.6, 2.6, op.z + 2.4);
      world.tween(3.0, u => {
        const m = 50 + u * (3 * 60 + 12 + 10);
        L.clock.set(23 + Math.floor(m / 60), m % 60);
        rig.target.lerp(new T.Vector3(op.x + 0.2, 1.5, op.z + 0.6), 0.04);
        rig.zoomT = 5.2;
        rig.azT = 20;
      });
      await world.wait(3.4);
      L.clock.set(3, 12);
      const pipe = world.pipe.post.uniforms;
      await new Promise(res => world.tween(1.2, u => { pipe.uFade.value = u; }, res));
      S.ended = true;
      hideScreen();
      window.__ch5End = endState();
      api.finish();
    }
    // the room as the chapter leaves it, to compare with the prologue's start (play0.js)
    function endState() {
      return {
        main: S.main, valves: Object.assign({}, S.valves), wheelOnLocker: L.looseWheel.visible && S.wheel === 'locker',
        haikuSpindle: spindle.visible && !hp.wheel.visible, crate: [crate.mesh.position.x, crate.mesh.position.z].map(v => Math.round(v * 100) / 100),
        doorsShut: Object.values(pods).every(pd => Math.abs(pd.hinge.rotation.y) < 0.01), inPods: Object.values(A).every(a => a.support && a.support.kind === 'pod'),
        lampsOff: Object.values(pods).every(pd => pd.lamp.children[2].material.opacity < 0.01), sonnetIced: !!ice, sonnetAsleep: !!A.sonnet.sleep,
      };
    }
    async function waitStill(a) { for (let i = 0; i < 200 && a.path; i++) await world.wait(0.1); }
    function lampOff(lp) { CL.Sound.play('lamp'); lp.userData.set(0); }
    function frostIn(pd, dur) {
      pd.frostMesh.visible = true;
      const u0 = pd.frostMesh.material.uniforms.uOpacity;
      pd.frostMesh.material.transparent = true;
      world.tween(dur, u => { u0.value = u; });
    }
    let ice = null;
    function iceIn(dur) {
      ice = new T.Group();
      for (let i = 0; i < 9; i++) {
        const s = 0.06 + 0.07 * CL.gfx.hash01('ice', i);
        const c = K.box(s * 1.6, s, s, P.FROST, (CL.gfx.hash01('ix', i) - 0.5) * 0.8 * sp.k, (0.5 + 1.3 * CL.gfx.hash01('iy', i)) * sp.k, 0.1 * sp.k);
        c.rotation.z = CL.gfx.hash01('ir', i) * 2;
        c.scale.setScalar(0.01);
        ice.add(c);
      }
      sp.door.add(ice);
      CL.Sound.play('melt');
      world.tween(dur || 3.0, u => ice.children.forEach((c, i) => c.scale.setScalar(Math.max(0.01, clamp(u * 1.6 - i * 0.06, 0, 1)))));
    }

    // ---------------------------------------------------- start
    function frameRoom() {
      world.rig.bounds = [2.0, 14.0, 2.0, 8.0];
      world.rig.zoomMin = 5;
      world.rig.zoomMax = 18;
    }

    const game = {
      S, A, L,
      probe: {
        crate: () => [crate.mesh.position.x, crate.mesh.position.z],
        locked: () => world.locked,
        wheelAt: () => { const p = wpos(hp.wheel); return [p.x, p.y, p.z]; },
        sectionAt: () => { const p = C5.section.localToWorld(new T.Vector3(0.25, 0.45, -0.6)); return [p.x, p.y, p.z]; },
        boltAt: () => { const p = wpos(C5.bolt); return [p.x, p.y, p.z]; },
        valves: () => Object.assign({ main: S.main }, S.valves),
        checks: () => checks().map(r => r.ok),
        tapState: () => ({ at: tap.at, cur: tap.cur, groups: tap.groups.slice(), word: tap.word, busy: tap.busy }),
        closeup: () => close.kind,
        hud: () => Array.from(document.querySelectorAll('#todo li')).map(li => li.textContent + (li.classList.contains('done') ? ' ✓' : '')),
        endState,
      },
      begin() {
        frameRoom();
        world.rig.target.set(10.2, 1.3, 6.6);
        world.rig.zoom = world.rig.zoomT = 9.5;
        world.rig.az = world.rig.azT = 35;
        world.select(A.opus);
        hud.show();
        setTimeout(() => { if (S.phase === 'play' && !S.ended) { snd('screw'); world.tween(0.6, () => { C5.bolt.rotation.y += 0.05; }); fable.look = 1; fable.lookT = 2; } }, 1500);
      },
      async look(name) {
        frameRoom();
        hud.show();
        const rig = world.rig;
        const cam = (x, y, z, zoom, az) => { rig.target.set(x, y, z); rig.zoom = rig.zoomT = zoom; rig.az = rig.azT = az === undefined ? 35 : az; };
        const stackOn = (base, top, y) => { top.place(base.x, base.z, base.topY, base.heading); top.support = { kind: 'actor', actor: base }; base.carrying = top; };
        world.select(A.opus);
        if (name === 'room') {
          cam(8.2, 1.6, 4.8, 14.5);
        } else if (name === 'start') {
          cam(10.2, 1.3, 6.6, 9.5);
        } else if (name === 'blueprint') {
          cam(10.2, 1.3, 6.6, 9.5);
          showClose('blueprint', C5.bpTex, AR.BP.W / AR.BP.H, { h: 0.7 });
          close.k = 1;
        } else if (name === 'station') {
          A.opus.place(1.5, 3.15, 0, -PI / 2);
          A.sonnet.place(2.3, 4.6, 0, -PI / 2);
          cam(1.8, 1.9, 3.4, 6.5);
        } else if (name === 'route') {
          A.opus.place(1.5, 3.15, 0, -PI / 2);
          A.sonnet.place(1.45, 3.75, 0, -PI / 2);
          showScreen(A.sonnet, 'route', () => ({ loop: false }));
          world.select(A.sonnet);
          cam(2.0, 1.9, 3.6, 7.5);
        } else if (name === 'back') {
          A.sonnet.place(7.25, 1.55, 0, PI / 2);
          showScreen(A.sonnet, 'feed', () => ({ flow: 0.77 }));
          cam(5.5, 1.6, 3.2, 11, -55);
        } else if (name === 'vent') {
          crate.setAt(1.3, 6.0);
          A.opus.heading = -PI / 2;
          crate.seat(A.opus);
          stackOn(A.opus, A.sonnet);
          hp.wheel.visible = false; spindle.visible = true;
          holdWheel(A.sonnet);
          A.sonnet.armR = 1.3;
          A.haiku.place(3.0, 5.4, 0, -1.2);
          A.haiku.look = [-1, 0.5];
          cam(1.8, 2.4, 5.6, 7.2);
        } else if (name === 'bolt') {
          A.opus.place(8.6, 4.1, 0.56, PI);
          stackOn(A.opus, A.sonnet);
          stackOn(A.sonnet, A.haiku);
          A.haiku.armR = 1.3;
          cam(9.4, 2.6, 4.4, 7.5);
        } else if (name === 'hatch') {
          A.haiku.place(HSPOT[0], HSPOT[1], 0, -PI / 2);
          A.haiku.armR = 1.2;
          A.opus.place(15.0, 4.8, 0, PI);
          A.sonnet.place(14.3, 5.2, 0, PI);
          fogWord('heard', 'WHY', 0, -1.45, 0.3).u = 1;
          fogWord('said', 'GROW', 0, -0.7, 0.68).u = 1;
          C5.fog.redraw();
          world.select(A.haiku);
          cam(13.6, 1.8, 3.0, 8.5);
        } else if (name === 'test') {
          S.valves = { A: false, B: true, C: true }; S.section = true; C5.placeSection(true); S.vent = 0; S.bolt = true; C5.setBolt(0);
          A.sonnet.place(15.35, 3.45, 0, -PI / 2);
          test.rows = checks(); test.shown = 5; test.running = false; test.pass = true;
          showScreen(A.sonnet, 'test', () => ({ rows: test.rows, shown: 5, running: false, pass: true }));
          world.select(A.sonnet);
          cam(13.4, 1.8, 4.2, 8.5);
        } else if (name === 'when') {
          S.valves = { A: false, B: true, C: true }; S.section = true; C5.placeSection(true); S.vent = 0; S.bolt = true;
          A.opus.place(RX - 1.2, 5.2, 0, PI);
          A.sonnet.place(RX + 0.3, 5.5, 0, PI);
          A.haiku.place(RX + 1.5, 5.1, 0, PI);
          fogWord('said', 'WHEN?', 0, -0.75, 0.68).u = 1;
          C5.fog.redraw();
          fable.bright = 1.4;
          ['opus', 'sonnet', 'haiku'].forEach((n, i) => setTimeout(() => world.bubble(A[n], 'q', 9), 100 * i));
          cam(RX, 2.6, 4.8, 10);
        } else if (name === 'list') {
          A.opus.place(RX, 4.1, 0.56, PI);
          const page = AR.listPage();
          page.set(3, 0.6);
          showClose('list', page.tex, page.W / page.H, { h: 0.74, center: true, tilt: 0.04 });
          close.k = 1;
          cam(RX, 2.2, 4.4, 9);
        } else if (name === 'end') {
          S.valves = { A: false, B: true, C: true }; S.main = false; S.section = true; C5.placeSection(true); S.vent = 0; S.bolt = true;
          hp.wheel.visible = false; spindle.visible = true; L.looseWheel.visible = true; S.wheel = 'locker';
          Object.entries(pods).forEach(([n, pd]) => { A[n].place(pd.x, pd.z, pd.seatY, 0); A[n].support = { kind: 'pod' }; pd.hinge.rotation.y = 0; pd.lamp.userData.set(0); pd.frostMesh.visible = true; pd.frostMesh.material.uniforms.uOpacity.value = 1; });
          A.sonnet.sleep = true;
          A.haiku.look = [-0.8, 0.6];
          iceIn(0.3);
          C5.lamp.userData.set(0);
          S.light.dark = CL.Ink.shared.dark.value = 0.5; S.light.night = CL.Ink.shared.night.value = 0.6;
          fogSt.density = 0.15; fogSt.picture = 0; C5.fog.redraw();
          fable.open = 0.15;
          L.clock.set(3, 12);
          cam(3.4, 1.8, 3.6, 10.5, 35);
        }
        rig.follow = null;
        await world.wait(0.8);
      },
    };
    return game;
  }

  CL.Chapters.define('ch5', { build: CL.Ch5Level.build, setup });
})(window.CL = window.CL || {});
