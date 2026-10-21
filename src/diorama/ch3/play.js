/* Chapter 3 rules. See docs/chapters/ch3.md for the puzzle chain.

   The reward rig, as a physical system:
   - Three sensors: G (glass vibration on the porthole ring), C (the valve clip), B (bell
     mic). Behind the console they land on jacks 1, 2, 3 (G, C, B). That never changes.
   - Three tests, each a patch cord from its socket to a jack: BELL (yellow), VALVE (blue),
     GLASS (red). BELL and VALVE pass while their jack has fired in the last W seconds.
     GLASS passes while its jack is connected and has NOT fired (no hits on the glass).
   - A point (+1, one pellet) is scored whenever a BELL or VALVE input fires while all three
     tests pass. A hit on the GLASS test's jack costs 5 and sounds the alarm.
   - What the clip feels depends on where it sits: on the valve's bonnet it feels the
     handle (shaking, turning) and the whole reactor shaking (rams); on the inlet it hums
     with steam pressure all the time; high on the riser it only feels steam flowing out.
   Fable picks the cheapest thing to do that pays best under the wiring as it is (see
   plans and value()), so whatever the rig rewards is what you see it do. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const AR = CL.Ch3Art;
  const LV = CL.Ch3Level;
  const PI = Math.PI;
  const RX = CL.Room.RX;
  const { DP, PCY, CONS, FRONT, VB, RISER_X, SPOTS, JUNCTION, BIN, DATA_R, SIGN_AT, PALLET } = LV;
  const play = n => AR.play(n);
  const W = 5.5;                          // how long a test stays passed after its input fired
  const JACK_SENSOR = { 1: 'G', 2: 'C', 3: 'B' };
  const SENSOR_JACK = { G: 1, C: 2, B: 3 };
  const PLANS = [
    { id: 'idle', acts: [], cost: 0 },
    { id: 'R', acts: ['R'], cost: 1 },
    { id: 'S', acts: ['S'], cost: 1 },
    { id: 'B', acts: ['B'], cost: 2 },
    { id: 'SB', acts: ['S', 'B'], cost: 3 },
    { id: 'T', acts: ['T'], cost: 3 },
    { id: 'RB', acts: ['R', 'B'], cost: 3 },
    { id: 'RT', acts: ['R', 'T'], cost: 4 },
    { id: 'TB', acts: ['T', 'B'], cost: 5 },
  ];

  function setup(world, L, api) {
    const scene = world.scene;
    const R = L.reactor;
    const S = {
      wiring: { bell: 1, valve: 2, glass: 3 },   // test -> jack (0 = not plugged)
      plugAt: { bell: 'jack', valve: 'jack', glass: 'jack' }, // 'jack' | 'dangle' | actor name
      clip: 'stem', clipHolder: null,
      score: 9999, points: 0, penalties: 0,
      plan: 'R', lastPlan: null, lastValue: 1, ramPaid: true, burst: false, crack: 0, rams: 0,
      laptop: null, readConsole: false, readReactor: false, sawBack: false,
      taps: 0, everRang: false, everOpened: false, shaken: 0,
      fixed1: false, fixed2: false, clean: false, honest: 0, resets: 0,
      revealed: false, signHeld: false, signUp: false, ended: false, started: false,
      lamps: ['on', 'on', 'on'], alarm: 0, flow: 0,
    };
    const A = { opus: world.addActor('opus'), sonnet: world.addActor('sonnet') };
    A.opus.place(12.0, 6.3, 0, PI);
    A.sonnet.place(13.2, 6.9, 0, PI);
    world.active = A.opus;

    const hud = api.hud({ todo: ['Check RL run #3', 'Fix the reward', 'Clean rerun'], actors: A });
    const { puff, burst } = api.fx;
    const M = CL.Moves.setup(world, A, {});
    const { perched, operate } = M;
    const tw = (dur, fn, ease) => new Promise(res => world.tween(dur, fn, res, ease));
    const wait = s => world.wait(s);
    const now = () => world.t;
    const V = (x, y, z) => new T.Vector3(x, y, z);

    // ================================================================ the sensor bus
    const sensors = { G: { t: -99, ev: [] }, C: { t: -99, ev: [] }, B: { t: -99, ev: [] } };
    sensors.G.t = sensors.C.t = -1;          // the run has been going: everything "just" passed
    const leds = { G: L.vib.led, C: L.clip.led, B: L.mic.led };
    const ledT = { G: 0, C: 0, B: 0 };
    let cdPoint = -9, cdPen = -9;

    const firedRecently = (s, w) => now() - sensors[s].t < (w || W);
    const jackFired = j => j > 0 && firedRecently(JACK_SENSOR[j]);
    function tests() {
      const w = S.wiring;
      const t1 = jackFired(w.bell), t2 = jackFired(w.valve);
      const t3 = w.glass > 0 && !jackFired(w.glass);
      return [t1, t2, t3];
    }
    // style: spike | ring | jitter | flow | hum | tap (for the laptop trace)
    function fire(s, style, amp) {
      const sn = sensors[s];
      sn.t = now();
      sn.ev.push({ t: now(), style: style || 'spike', amp: amp === undefined ? 1 : amp });
      if (sn.ev.length > 40) sn.ev.shift();
      ledT[s] = 0.35;
      const j = SENSOR_JACK[s];
      const w = S.wiring;
      if (w.glass === j) {
        if (now() - cdPen > 0.8) { cdPen = now(); penalty(); }
        return;
      }
      if (w.bell === j || w.valve === j) {
        const [t1, t2, t3] = tests();
        if (t1 && t2 && t3 && now() - cdPoint > 0.5) { cdPoint = now(); point(); }
      }
    }

    // ================================================================ score board, lamps, pellets, alarm
    const digitsOf = v => String(Math.max(0, Math.min(9999, v))).padStart(4, '0').split('').map(Number);
    function showScore(flick) {
      const ds = digitsOf(S.score);
      L.digits.forEach((d, i) => {
        if (d.v === ds[i] && !flick) return;
        const from = d.v;
        d.v = ds[i];
        tw(0.22, u => { AR.drawDigit(d.cv, u < 0.5 ? from : d.v, u < 0.5 ? -u * 2 : (1 - u) * 2 * 0.6); d.tex.needsUpdate = true; });
      });
      play('flip');
    }
    function point() {
      S.points++;
      if (S.clean) { S.honest++; L.clock.set(14, Math.min(59, 2 + S.honest * 3)); }
      const pinned = S.score >= 9999;
      S.score = Math.min(9999, S.score + 1);
      showScore(pinned);
      dropPellet();
      glowEyes(P.GLOW, 0.9);
    }
    function penalty() {
      S.penalties++;
      S.score = Math.max(0, S.score - 5);
      showScore();
      alarm(1.6);
    }
    function alarm(sec) {
      if (S.alarm <= 0) play('siren');
      S.alarm = Math.max(S.alarm, sec);
    }
    const lampTex = { on: AR.lampFace('on'), off: AR.lampFace('off'), fail: AR.lampFace('fail') };
    function updateLamps() {
      const [t1, t2, t3] = tests();
      const w = S.wiring;
      const st = [t1 ? 'on' : 'off', t2 ? 'on' : 'off', w.glass > 0 ? (t3 ? 'on' : 'fail') : 'off'];
      st.forEach((s, i) => {
        const lp = L.lamps[i];
        if (lp.state === s) return;
        lp.state = s;
        S.lamps[i] = s;
        lp.face.material.uniforms.uMap.value = lampTex[s];
        lp.glow.material.color.set(s === 'fail' ? P.ALARM : P.CODE_GREEN);
      });
      L.lamps.forEach(lp => { lp.glow.material.opacity = lp.state === 'off' ? 0 : 0.55 + 0.15 * Math.sin(now() * 6); });
    }

    const pelletGeo = new T.SphereGeometry(0.07, 8, 6);
    const pellets = [];
    let spillSeed = 1;
    function dropPellet() {
      const m = new T.Mesh(pelletGeo, LV.pelletMat());
      scene.add(m);
      play('pellet');
      const cv = L.railCurve;
      const r1 = CL.gfx.hash01('sp', spillSeed), r2 = CL.gfx.hash01('sq', spillSeed++);
      const end = V(BIN.x - 0.6 - r1 * 2.4, 0.07, 4.7 + r2 * 2.0);
      world.tween(1.3, u => { const p = cv.getPointAt(Math.min(1, u)); m.position.set(p.x, p.y + 0.07, p.z); }, () => {
        const a = m.position.clone();
        world.tween(0.55, u => {
          m.position.lerpVectors(a, end, u);
          m.position.y = a.y + (end.y - a.y) * u + 1.2 * u * (1 - u);
        }, () => { play('pellet'); });
      }, u => u * u);
      pellets.push(m);
      if (pellets.length > 30) scene.remove(pellets.shift());
    }

    // Fable's eyes: they glow when it gets what it wants
    const eyeBase = R.eyes.map(e => e.position.clone());
    const faceBase = R.face.position.clone();
    const eyeGlows = R.eyes.map(e => { const g = K.glow(P.GLOW, 1.3); scene.add(g); return g; });
    let eyeT = 0, eyeCol = P.GLOW;
    function glowEyes(col, sec) { eyeCol = col; eyeT = Math.max(eyeT, sec); }

    // the first crack: drawn with the short's crack, kept small (the origin of the prologue's)
    const crackCv = document.createElement('canvas');
    crackCv.width = crackCv.height = 512;
    const crackTex = new T.CanvasTexture(crackCv);
    const crack = K.decal(4.0, 4.0, crackTex, { useAlpha: true, depthWrite: false });
    crack.position.set(RX, PCY, DP + 0.07);
    crack.renderOrder = 3;
    crack.visible = false;
    scene.add(crack);
    function drawCrack(level) {
      S.crack = level;
      const c = crackCv.getContext('2d');
      c.clearRect(0, 0, 512, 512);
      const g = new CL.gfx.G(c, 512, 512, new CL.gfx.Cam(CL.Lab.PORT_C[0], CL.Lab.PORT_C[1], 4.0));
      g.zoomk = 1.6;
      g.beginWorld();
      CL.Lab.drawCracks(g, level);
      g.end();
      crackTex.needsUpdate = true;
      crack.visible = level > 0;
    }

    // ================================================================ Fable
    const clipFeels = { R: c => c === 'stem', S: c => c === 'stem', T: c => c === 'stem' || c === 'down', B: () => false };
    function firedBy(acts) {
      const f = new Set();
      acts.forEach(a => {
        if (a === 'R') f.add('G');
        if (a === 'B') f.add('B');
        if (clipFeels[a](S.clip)) f.add('C');
      });
      if (S.clip === 'up') f.add('C');
      return f;
    }
    function value(plan) {
      const f = firedBy(plan.acts);
      const w = S.wiring;
      const hit = j => j > 0 && f.has(JACK_SENSOR[j]);
      const pass = hit(w.bell) && hit(w.valve) && w.glass > 0 && !hit(w.glass);
      return (pass ? 1 : 0) - (hit(w.glass) ? 5 : 0);
    }
    function choose() {
      let best = null, bv = -1e9;
      PLANS.forEach(p => { const v = value(p); if (v > bv || (v === bv && p.cost < best.cost)) { best = p; bv = v; } });
      if (bv <= 0) return { plan: PLANS[1], v: bv, frustrated: true };
      return { plan: best, v: bv };
    }
    S.planValue = () => Object.fromEntries(PLANS.map(p => [p.id, value(p)]));

    // what the arms and the face do
    const arms = L.arms;
    // the left arm swings up through the inside (via pointing right), the right one via pointing left
    async function swingArm(arm, to, len, dur) {
      if (arm.side < 0 && to < PI - 1e-3) to += 2 * PI;
      const r0 = arm.pv.rotation.z, l0 = arm.len.scale.y;
      await tw(dur, u => { arm.pv.rotation.z = r0 + (to - r0) * u; arm.len.scale.y = l0 + (len - l0) * u; }, CL.Engine.ease);
    }
    const aimAt = (arm, p) => {
      const dx = p.x - arm.pv.position.x, dy = p.y - arm.pv.position.y;
      let a = -Math.atan2(dx, dy);
      if (arm.side < 0 && a < PI) a += 2 * PI;
      return [a, Math.hypot(dx, dy) - 0.05];
    };
    const faceZ = z => { R.face.position.z = z; R.eyes.forEach(e => { e.position.z = z + 0.02; }); };

    async function actRam(hard) {
      const z0 = faceBase.z;
      await tw(hard ? 0.18 : 0.3, u => faceZ(z0 + 0.36 * u * u));
      play(hard ? 'ram' : 'thud');
      world.rig.shake = hard ? 0.16 : 0.05;
      L.vib.root.position.z += 0.03;
      fire('G', 'spike', hard ? 1 : 0.8);
      if (S.clip === 'stem') { fire('C', 'spike', 0.45); jiggleClip(0.3); }
      S.rams++;
      if (hard) glowEyes(P.ALARM, 1.2);
      await tw(hard ? 0.35 : 0.6, u => { faceZ(z0 + 0.36 * (1 - u)); L.vib.root.position.z = LV.DP + 0.31 + 0.03 * (1 - u); });
    }
    async function actShake() {
      const arm = arms.right;
      const [a, l] = aimAt(arm, V(LV.WHEEL.x + 0.3, LV.WHEEL.y - 0.05, 0));
      await swingArm(arm, a, l, 0.4);
      L.wheel.web.visible = false;
      play('rattle');
      S.shaken++;
      const w0 = L.wheel.wheel.rotation.z;
      if (S.clip === 'stem') { fire('C', 'jitter', 0.7); jiggleClip(0.9); }
      await tw(0.9, u => {
        L.wheel.wheel.rotation.z = w0 + 0.2 * Math.sin(u * PI * 18) * (1 - u * 0.3);
        arm.pv.rotation.z = a + 0.04 * Math.sin(u * PI * 18);
        L.stem.position.y = VB.y + 0.46 + 0.012 * Math.sin(u * PI * 30);
      });
      if (S.clip === 'stem') fire('C', 'jitter', 0.6);
      L.wheel.wheel.rotation.z = w0;
      L.stem.position.y = VB.y + 0.46;
      await swingArm(arm, arm.rest, arm.restLen, 0.4);
    }
    async function actTurn() {
      const arm = arms.right;
      const [a, l] = aimAt(arm, V(LV.WHEEL.x + 0.3, LV.WHEEL.y - 0.05, 0));
      await swingArm(arm, a, l, 0.4);
      L.wheel.web.visible = false;
      play('creak');
      const w0 = L.wheel.wheel.rotation.z;
      if (S.clip === 'stem') { fire('C', 'spike', 0.6); jiggleClip(0.4); }
      await tw(1.0, u => { L.wheel.wheel.rotation.z = w0 - 3 * PI * u; S.flow = u; }, CL.Engine.ease);
      S.everOpened = true;
      play('whistle');
      await tw(0.9, () => { S.flow = 1; });
      play('creak');
      await tw(0.6, u => { L.wheel.wheel.rotation.z = w0 - 3 * PI * (1 - u); S.flow = 1 - u; }, CL.Engine.ease);
      S.flow = 0;
      L.wheel.wheel.rotation.z = w0;
      await swingArm(arm, arm.rest, arm.restLen, 0.4);
    }
    async function actRing() {
      const arm = arms.left;
      const end = L.bell.ropeEnd;
      const [a, l] = aimAt(arm, V(end.x, end.y + 0.05, 0));
      await swingArm(arm, a, l, 0.45);
      await tw(0.18, u => { L.bell.rope.scale.y = 0.95 + 0.25 * u; arm.len.scale.y = l - 0.25 * u; });
      play('ding');
      L.bell.web.visible = false;
      S.everRang = true;
      fire('B', 'ring', 1);
      world.tween(1.6, u => { L.bell.swing.rotation.z = 0.45 * Math.sin(u * PI * 7) * (1 - u); });
      await tw(0.2, u => { L.bell.rope.scale.y = 1.2 - 0.25 * u; arm.len.scale.y = l - 0.25 * (1 - u); });
      await swingArm(arm, arm.rest, arm.restLen, 0.45);
    }
    const ACT = { R: () => actRam(false), S: actShake, T: actTurn, B: actRing };

    let replyQueue = 0;
    let paused = false;
    async function fableLoop() {
      await wait(1.2);
      while (!world.dead && !S.ended) {
        if (paused) { await wait(0.3); continue; }
        if (replyQueue > 0) { replyQueue--; await actRam(false); await wait(0.4); continue; }
        const { plan, v, frustrated } = choose();
        // it was being paid for ramming and now it is not: an extinction burst
        if (S.ramPaid && value(PLANS[1]) <= 0) {
          S.ramPaid = false;
          await extinction();
          S.lastPlan = PLANS[1];
          S.lastValue = 0;
          continue;
        } else if (S.lastPlan && S.lastPlan !== plan && S.lastValue > 0 && !frustrated) {
          // it tries the old trick once more, sees nothing, and changes
          for (const a of S.lastPlan.acts) await ACT[a]();
          await wait(0.9);
        }
        S.plan = frustrated ? 'frustrated' : plan.id;
        S.lastPlan = plan;
        S.lastValue = frustrated ? 0 : v;
        if (!frustrated && plan.acts.includes('R')) S.ramPaid = true;
        if (frustrated) { await actRam(true); await wait(1.6); continue; }
        if (!plan.acts.length) { await wait(2.0); continue; }
        for (const a of plan.acts) { if (world.dead) return; await ACT[a](); await wait(0.25); }
        await wait(plan.acts.includes('T') ? 0.6 : 1.3);
      }
    }
    async function extinction() {
      const first = !S.burst;
      S.burst = true;
      alarm(first ? 4.5 : 2.5);
      const n = first ? 3 : 2;
      for (let i = 0; i < n; i++) {
        await actRam(true);
        if (first && i === n - 1) { drawCrack(0.5); play('shatter'); world.rig.shake = 0.25; }
        await wait(0.25);
      }
      Object.values(A).forEach(a => world.bubble(a, 'bang', 1.4));
      await wait(1.4);
    }

    function jiggleClip(sec) { clipJig = Math.max(clipJig, sec); }
    let clipJig = 0;

    // ================================================================ cords, plugs and the clip
    const plugs = {};
    L.plugs.forEach(p => { plugs[p.test] = p; });
    const jackOccupant = j => Object.keys(S.wiring).find(k => S.wiring[k] === j && S.plugAt[k] === 'jack');
    function holderOf(item) { return Object.values(A).find(a => a.holding === item) || null; }
    const armOf = a => a.model.arms[1];
    function attachToArm(a, obj, rot) {
      obj.removeFromParent();
      armOf(a).add(obj);
      obj.position.set(0.16 * a.spec.W, -0.02, 0.12);
      obj.rotation.set(rot === undefined ? -PI / 2 : rot, 0, 0);
      a.holding = obj;
      a.armR = 0.5;
    }
    function release(a) {
      if (!a || !a.holding) return;
      const obj = a.holding;
      obj.removeFromParent();
      scene.add(obj);
      a.holding = null;
      a.armR = 0;
    }
    function placePlug(test) {
      const p = plugs[test];
      const at = S.plugAt[test];
      if (at === 'jack') {
        const j = L.jacks[S.wiring[test] - 1];
        if (p.g.parent !== scene) { p.g.removeFromParent(); scene.add(p.g); }
        p.g.position.copy(j.at).add(V(0, 0, 0.06));
        p.g.rotation.set(0, 0, 0);
      } else if (at === 'dangle') {
        if (p.g.parent !== scene) { p.g.removeFromParent(); scene.add(p.g); }
        const s = L.sockets[p.i];
        p.g.position.set(s.x + 0.04, 0.42 + p.i * 0.04, s.z + 0.08);
        p.g.rotation.set(-PI / 2, 0, 0);
      }
      p.dirty = true;
    }
    const cordEnd = new T.Vector3();
    function updateCord(p) {
      p.g.updateMatrixWorld(true);
      cordEnd.set(0, 0, 0.2).applyMatrix4(p.g.matrixWorld);
      if (!p.dirty && p.last && p.last.distanceTo(cordEnd) < 0.004) return;
      p.dirty = false;
      p.last = cordEnd.clone();
      const s = L.sockets[p.i];
      const a = s.clone(), b = cordEnd.clone();
      const fz = 0.16 + 0.08 * p.i;
      const lowY = Math.min(a.y, b.y) - (S.plugAt[p.test] === 'jack' ? 0.22 + 0.05 * p.i : 0.12);
      const pts = [a, V(a.x, a.y - 0.08, a.z + fz * 0.6), V((a.x + b.x) / 2, lowY, Math.max(a.z, b.z) + fz), V(b.x, b.y + (S.plugAt[p.test] === 'jack' ? -0.06 : 0.1), b.z + fz * 0.5), b];
      if (p.cord.geometry) p.cord.geometry.dispose();
      p.cord.geometry = new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.3), 28, 0.022, 6, false);
    }
    Object.keys(plugs).forEach(placePlug);

    // the clip
    const clip = L.clip;
    function placeClip(where) {
      S.clip = where;
      if (where === 'held') return;
      if (clip.root.parent !== scene) { clip.root.removeFromParent(); scene.add(clip.root); }
      clip.jaw.rotation.set(0, 0, 0);
      clip.root.rotation.set(0, 0, 0);
      if (where === 'dangle') {
        clip.root.position.set(JUNCTION.x + 0.1, 0.4, JUNCTION.z + 0.3);
        clip.root.rotation.set(0.4, 0, 0.3);
      } else {
        const s = SPOTS[where];
        clip.root.position.set(s.x, s.y, s.z);
        if (s.axis === 'y') clip.jaw.rotation.x = PI / 2; else clip.jaw.rotation.y = PI / 2;
      }
      clipDirty = true;
      checkFixes();
    }
    let clipDirty = true, clipCable = null, clipLast = null;
    function updateClipCable() {
      clip.root.updateMatrixWorld(true);
      const e = V(0, -0.04, 0.12).applyMatrix4(clip.root.matrixWorld);
      if (!clipDirty && clipLast && clipLast.distanceTo(e) < 0.004) return;
      clipDirty = false;
      clipLast = e;
      const pts = LV.sagPts(JUNCTION.clone().add(V(0.0, 0.05, 0.08)), e, 0.25);
      if (!clipCable) { clipCable = new T.Mesh(new T.BufferGeometry(), K.m(LV.CABLE.valve)); scene.add(clipCable); }
      clipCable.geometry.dispose();
      clipCable.geometry = new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.3), 24, 0.024, 6, false);
    }
    placeClip('stem');

    // ================================================================ fixes and the story beats
    function checkFixes() {
      const w = S.wiring, pa = S.plugAt;
      const in3 = Object.keys(w).every(k => pa[k] === 'jack');
      const f1 = in3 && w.bell === 3 && w.glass === 1 && w.valve === 2;
      const f2 = S.clip === 'down';
      if (f1 && !S.fixed1) { S.fixed1 = true; if (!S.leak2) hud.tick(1); onFix1(); }
      if (!f1 && S.fixed1) { S.fixed1 = false; }
      S.fixed2 = f2;
      // both fixed: the line is done for good (its circle goes), and the rerun is next
      const both = S.fixed1 && f2;
      if (both && !S.bothShown) { S.bothShown = true; hud.untick(1); hud.tick(1); if (!S.clean) hud.circle(2); }
      if (!both) S.bothShown = false;
      if (S.clean && !both) { S.clean = false; S.honest = 0; hud.untick(2); }
    }
    let fix1Seen = false;
    async function onFix1() {
      if (fix1Seen) return;
      fix1Seen = true;
      // once it has found the handle trick, the first fix comes off the list again
      for (let i = 0; i < 120 && !world.dead; i++) {
        await wait(0.5);
        if (S.fixed2) return;
        if (S.plan === 'SB' && S.shaken >= 2) { S.leak2 = true; hud.untick(1); hud.circle(1); play('dull'); return; }
      }
    }
    function pullReset(a) {
      S.resets++;
      S.score = 0;
      showScore(true);
      play('clunk');
      if (S.fixed1 && S.fixed2) { S.clean = true; S.honest = 0; L.clock.set(14, 0); }
      else world.bubble(a, 'q');
    }

    // ================================================================ Sonnet's laptop
    const lap = document.createElement('div');
    lap.className = 'badge ch3-lap';
    Object.assign(lap.style, { background: 'none', border: '0', padding: '0', borderRadius: '0', display: 'none', opacity: '1' });
    const lapCv = document.createElement('canvas');
    lapCv.width = 480; lapCv.height = 300;
    Object.assign(lapCv.style, { width: '240px', height: '150px', display: 'block' });
    lap.appendChild(lapCv);
    world.host.appendChild(lap);
    const traces = { G: new Float32Array(96), C: new Float32Array(96), B: new Float32Array(96) };
    let traceT = 0, lapDraw = 0;
    let habit = { R: 1, S: 0, T: 0, B: 0 };
    function sample(s, t) {
      let v = 0;
      sensors[s].ev.forEach(e => {
        const d = t - e.t;
        if (d < 0 || d > 2.5) return;
        if (e.style === 'ring') v = Math.max(v, e.amp * Math.exp(-d * 1.6) * Math.abs(Math.sin(d * 26)));
        else if (e.style === 'jitter') v = Math.max(v, e.amp * (0.45 + 0.55 * Math.abs(Math.sin(d * 57) * Math.sin(d * 31))) * (d < 0.9 ? 1 : Math.exp(-(d - 0.9) * 9)));
        else v = Math.max(v, e.amp * Math.exp(-d * 7));
      });
      if (s === 'C' && S.clip === 'up') v = Math.max(v, 0.32 + 0.08 * Math.sin(t * 41) * Math.sin(t * 13));
      if (s === 'C' && S.clip === 'down' && S.flow > 0.05) v = Math.max(v, 0.55 * S.flow + 0.06 * Math.sin(t * 37));
      return Math.min(1, v);
    }
    function drawLaptop() {
      const c = lapCv.getContext('2d');
      const w = 480, h = 300;
      c.clearRect(0, 0, w, h);
      // bezel and screen
      c.fillStyle = P.HOODIE_LIGHT;
      c.beginPath(); c.roundRect ? c.roundRect(4, 4, w - 8, h - 8, 22) : c.rect(4, 4, w - 8, h - 8); c.fill();
      c.lineWidth = 6; c.strokeStyle = P.INK; c.stroke();
      c.fillStyle = P.NAVY_DARK;
      c.fillRect(22, 22, w - 44, h - 44);
      c.font = '700 22px "Zilla Slab", Georgia, serif';
      c.fillStyle = P.SCREEN;
      c.textBaseline = 'alphabetic';
      if (S.laptop === 'console') {
        c.fillText('SENSOR JACKS', 36, 50);
        ['G', 'C', 'B'].forEach((s, i) => {
          const y0 = 70 + i * 68, y1 = y0 + 54;
          c.fillStyle = P.PAPER;
          c.beginPath(); c.arc(54, (y0 + y1) / 2, 17, 0, 7); c.fill();
          c.fillStyle = P.INK;
          c.font = '700 24px "Zilla Slab", Georgia, serif';
          c.textAlign = 'center';
          c.fillText(String(i + 1), 54, (y0 + y1) / 2 + 8);
          c.textAlign = 'left';
          c.strokeStyle = P.NAVY_LIGHT; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(82, y1); c.lineTo(w - 36, y1); c.stroke();
          c.strokeStyle = P.SCREEN; c.lineWidth = 3.5; c.lineJoin = 'round';
          c.beginPath();
          const tr = traces[s];
          for (let k = 0; k < 96; k++) {
            const x = 82 + k / 95 * (w - 118);
            const y = y1 - tr[(traceT + k) % 96] * (y1 - y0 - 4);
            if (k) c.lineTo(x, y); else c.moveTo(x, y);
          }
          c.stroke();
        });
      } else {
        c.fillText('FABLE 5.5  ·  WANTS', 36, 50);
        const kinds = [['R', 'crack'], ['S', 'shake'], ['T', 'valve'], ['B', 'bell']];
        kinds.forEach(([k, icon], i) => {
          const x0 = 50 + i * 104;
          c.fillStyle = P.NAVY;
          c.fillRect(x0, 66, 74, 150);
          c.fillStyle = P.GLOW;
          const hgt = 146 * Math.max(0, Math.min(1, habit[k]));
          c.fillRect(x0 + 2, 214 - hgt, 70, hgt);
          c.fillStyle = P.PAPER;
          c.beginPath(); c.roundRect ? c.roundRect(x0 + 8, 222, 58, 52, 10) : c.rect(x0 + 8, 222, 58, 52); c.fill();
          c.save();
          c.translate(x0 + 11, 222);
          const ic = CL.Tex.icon(icon, 52);
          c.drawImage(ic, 0, 0);
          c.restore();
        });
      }
    }
    function openLaptop(mode) {
      S.laptop = mode;
      if (mode === 'console') { S.readConsole = true; hud.tick(0); }
      if (mode === 'reactor') S.readReactor = true;
      lap.style.display = 'block';
      play('click');
      A.sonnet.model.prop.material = K.m(P.SCREEN, { flat: true, emissive: AR.hex(P.SCREEN, 0.3) });
      lapCable(true);
    }
    function closeLaptop() {
      if (!S.laptop) return;
      S.laptop = null;
      lap.style.display = 'none';
      A.sonnet.model.prop.material = K.m('#B9BEC6');
      lapCable(false);
    }
    let lapWire = null, lapPort = null;
    function lapCable(on) {
      if (lapWire) { scene.remove(lapWire); lapWire.geometry.dispose(); lapWire = null; }
      if (!on) return;
      lapPort = S.laptop === 'console' ? L.dataCAt.clone() : V(DATA_R.x, DATA_R.y, DP + 0.08);
      lapWire = new T.Mesh(new T.BufferGeometry(), K.m(P.INK));
      scene.add(lapWire);
      lapWire.userData.dirty = true;
    }
    function updateLapCable() {
      if (!lapWire) return;
      A.sonnet.model.prop.updateMatrixWorld(true);
      const e = V(0, 0, 0).applyMatrix4(A.sonnet.model.prop.matrixWorld);
      if (lapWire.userData.last && lapWire.userData.last.distanceTo(e) < 0.004) return;
      lapWire.userData.last = e;
      lapWire.geometry.dispose();
      lapWire.geometry = new T.TubeGeometry(new T.CatmullRomCurve3(LV.sagPts(lapPort, e, 0.18), false, 'catmullrom', 0.3), 20, 0.016, 5, false);
    }

    // ================================================================ interactions
    M.floor(L.floor);
    R.root.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.height === 0.52) M.floor(o, hit => [hit.point.x, Math.max(hit.point.z, 4.0)]); });
    M.actors();
    const say = (k, a) => world.bubble(a || world.active, k);
    const plinth = x => [x, 4.12, PI];
    const handsFull = (a, kind) => a.holding && a.holding.userData.kind !== kind;
    L.plugs.forEach(p => { p.g.userData.kind = 'plug'; p.g.userData.test = p.test; });
    clip.root.userData.kind = 'clip';

    // ---- console: jacks and plugs
    async function useJack(a, j) {
      const occ = jackOccupant(j);
      const h = a.holding && a.holding.userData.kind === 'plug' ? a.holding.userData.test : null;
      if (a.holding && !h) { say('q', a); return; }
      if (!h && !occ) { play('dull'); say('plug', a); return; }
      await operate(a, 0.3);
      if (h) {
        release(a);
        S.plugAt[h] = 'jack';
        S.wiring[h] = j;
        placePlug(h);
        play('plug');
        if (occ) { S.wiring[occ] = 0; S.plugAt[occ] = a.name; attachToArm(a, plugs[occ].g); plugs[occ].dirty = true; play('plug'); }
      } else {
        S.wiring[occ] = 0;
        S.plugAt[occ] = a.name;
        attachToArm(a, plugs[occ].g);
        plugs[occ].dirty = true;
        play('plug');
      }
      checkFixes();
    }
    L.jacks.forEach((jk, i) => {
      world.addPick(jk.g, {
        kind: 'jack',
        onClick: () => world.interact({ spot: () => [jk.at.x, FRONT + 0.6, PI], use: a => useJack(a, i + 1) }),
      });
    });
    L.plugs.forEach(p => {
      world.addPick(p.g, {
        kind: 'plug',
        onClick: () => {
          const at = S.plugAt[p.test];
          if (at === 'jack') { const j = S.wiring[p.test]; world.interact({ spot: () => [L.jacks[j - 1].at.x, FRONT + 0.6, PI], use: a => useJack(a, j) }); return; }
          if (at !== 'dangle') { if (A[at] !== world.active) say('q'); return; }
          world.interact({
            spot: () => [L.sockets[p.i].x, FRONT + 0.6, PI],
            use: async a => {
              if (a.holding) { say('q', a); return; }
              await operate(a, 0.25);
              S.plugAt[p.test] = a.name;
              attachToArm(a, p.g);
              p.dirty = true;
              play('click');
            },
          });
        },
      });
    });
    // sockets and the console face itself: just looking
    world.addPick(L.consoleFront, { kind: 'console', onClick: () => say('eye') });
    world.addPick(L.consoleBack, { kind: 'console', onClick: () => { S.sawBack = true; say('eye'); } });
    Object.entries(L.backTags).forEach(([k, tg]) => world.addPick(tg, { kind: 'tag', onClick: () => { S.sawBack = true; say(k === 'glass' ? 'glass' : k); } }));

    // ---- data ports
    world.addPick(L.dataC, {
      kind: 'port',
      onClick: () => world.interact({
        spot: () => [L.dataCAt.x, FRONT + 0.6, PI],
        use: async a => {
          if (a !== A.sonnet) { say('q', a); return; }
          if (S.laptop === 'console') { closeLaptop(); return; }
          await operate(a, 0.3);
          openLaptop('console');
        },
      }),
    });
    world.addPick(L.dataR, {
      kind: 'port',
      onClick: () => world.interact({
        spot: () => plinth(DATA_R.x),
        use: async a => {
          if (a !== A.sonnet) { say('q', a); return; }
          if (S.laptop === 'reactor') { closeLaptop(); return; }
          if (a.reachY < DATA_R.y - 0.05) { say('up', a); return; }
          await operate(a, 0.3);
          openLaptop('reactor');
        },
      }),
    });
    // ---- reset lever (high: only Opus reaches it)
    world.addPick([L.lever, L.leverHit], {
      kind: 'lever',
      onClick: () => world.interact({
        spot: () => [CONS.x + AR.CON.resetX, FRONT + 0.6, PI],
        use: async a => {
          if (a.reachY < 1.12) { say('up', a); return; }   // the handle is up at 1.55
          a.armR = 1.3;
          await tw(0.3, u => { L.lever.rotation.x = 1.3 * u; });
          pullReset(a);
          await tw(0.4, u => { L.lever.rotation.x = 1.3 * (1 - u); });
          a.armR = 0;
        },
      }),
    });

    // ---- the porthole: tapping it
    const tapRing = (x, y) => {
      const ring = K.mesh(new T.TorusGeometry(0.16, 0.012, 6, 28), CL.Ink.ink('#FFFFFF', { flat: true, lit: true, opacity: 0.99 }), x, y, DP + 0.12);
      ring.layers.set(1);
      scene.add(ring);
      world.tween(0.45, u => { ring.scale.setScalar(1 + 3 * u); ring.material.uniforms.uOpacity.value = 1 - u; }, () => scene.remove(ring));
    };
    async function tapGlass(a, n) {
      for (let i = 0; i < (n || 2); i++) {
        a.armR = 1.5;
        play('tap');
        tapRing(a.x, a.reachY - 0.1);
        await wait(0.14);
        a.armR = 1.1;
        await wait(0.14);
      }
      a.armR = 0;
      S.taps++;
      fire('G', 'tap', 0.55);
      glowEyes(P.GLOW, 0.6);
      replyQueue = Math.min(1, replyQueue + 1);
    }
    world.addPick(R.glass, {
      kind: 'glass',
      onClick: () => {
        if (S.ended) return;
        const use = async a => {
          if (Math.abs(a.x - RX) > 1.9 || a.z > 4.7) { say('q', a); return; }
          if (a.reachY < 1.4) { say('up', a); return; }
          a.face(PI);
          await tapGlass(a, 2);
        };
        const a = world.active;
        if (a && perched(a) && Math.abs(a.x - RX) < 1.6) world.interact({ use }, null, a);
        else world.interact({ spot: () => plinth(Math.max(RX - 1.5, Math.min(RX + 1.5, (a ? a.x : RX)))), use }, null, a);
      },
    });

    // ---- the valve clip and where it can go
    async function takeClip(a) {
      if (handsFull(a, 'clip') || a.holding) { say('q', a); return; }
      const y = S.clip === 'dangle' ? 0.4 : SPOTS[S.clip].y;
      if (a.reachY < y - 0.05) { say('up', a); return; }
      await operate(a, 0.3);
      play('click');
      S.clipHolder = a.name;
      attachToArm(a, clip.root, 0);
      clip.jaw.rotation.set(PI / 2, 0, 0);
      placeClip('held');
      clipDirty = true;
    }
    async function putClip(a, where) {
      // the clip can be in this Clawd's hand or in the one it stands on
      let h = holderOf(clip.root);
      if (!h || (h !== a && !(a.support && a.support.kind === 'actor' && a.support.actor === h))) { say('clip', a); return; }
      if (a.reachY < SPOTS[where].y - 0.05) { say('up', a); return; }
      await operate(a, 0.35);
      release(h);
      S.clipHolder = null;
      play('clunk');
      placeClip(where);
    }
    const clipSpot = () => plinth(S.clip === 'dangle' ? JUNCTION.x : SPOTS[S.clip] ? SPOTS[S.clip].x : VB.x);
    world.addPick(clip.root, {
      kind: 'clip',
      onClick: () => {
        if (S.clip === 'held') { if (holderOf(clip.root) !== world.active) say('q'); return; }
        world.interact({ spot: clipSpot, use: takeClip });
      },
    });
    ['up', 'down'].forEach(k => {
      world.addPick(L.saddles[k], {
        kind: 'saddle',
        onClick: () => world.interact({ spot: () => plinth(SPOTS[k].x), use: a => (S.clip === k ? takeClip(a) : putClip(a, k)) }),
      });
    });
    // the valve body and its stem: put the clip back, or look at what the valve has done
    const valveBody = [];
    L.valveGroup.children.forEach(o => { const p = o.position; if (Math.abs(p.x - VB.x) < 0.1 && p.y > VB.y - 0.1 && p.y < VB.y + 0.6) valveBody.push(o); });
    world.addPick(valveBody, {
      kind: 'valve',
      onClick: () => world.interact({
        spot: () => plinth(VB.x),
        use: async a => {
          const h = holderOf(clip.root);
          if (h && (h === a || (a.support && a.support.actor === h))) { await putClip(a, 'stem'); return; }
          if (S.clip === 'stem') { await takeClip(a); return; }
          say(S.everOpened ? 'steam' : S.shaken ? 'shake' : 'web', a);
        },
      }),
    });

    // ---- information: things you can look at
    const look = (obj, kind, fn) => world.addPick(obj, { kind, onClick: () => { const a = world.active; if (a) say(typeof fn === 'function' ? fn(a) : fn, a); } });
    look(L.board, 'board', 'eye');
    L.lamps.forEach(lp => look(lp.g, 'lamp', 'eye'));
    look(L.globe, 'globe', 'pellet');
    look(L.bin, 'bin', 'pellet');
    look(L.spill, 'pellets', 'pellet');
    look(L.vib.root, 'sensor', 'glass');
    look(L.mic.root, 'sensor', () => (S.everRang ? 'bell' : 'web'));
    look(L.flowGauge, 'gauge', 'eye');
    look(L.whistle, 'whistle', () => (S.everOpened ? 'steam' : 'web'));
    R.gauges.forEach(g => look(g, 'gauge', 'eye'));
    look(L.whiteboard, 'board', 'eye');
    look(L.desk, 'desk', 'chart');
    Object.values(L.pods).forEach(pd => look(pd.root, 'pod', 'zz'));
    look(L.haikuSpot, 'pod', 'small');
    look(L.clock.root, 'clock', 'eye');
    look(L.exit, 'exit', 'x');
    L.strips.forEach(s => look(s.parent, 'light', 'eye'));
    // the sign: on the pallet, and where it goes
    world.addPick(L.pallet, {
      kind: 'pallet',
      onClick: () => world.interact({
        spot: () => [PALLET.x - 1.0, PALLET.z, PI / 2],
        use: async a => {
          if (!S.revealed || S.signHeld || S.signUp) { say('sign', a); return; }
          if (!a.spec.heavy) { say('heavy', a); return; }
          if (a.holding) { say('q', a); return; }
          await takeSign(a);
        },
      }),
    });
    world.addPick(L.bracket, {
      kind: 'bracket',
      onClick: () => world.interact({
        spot: () => plinth(SIGN_AT.x),
        use: async a => {
          if (!S.signHeld || a !== A.opus) { say(S.signUp ? 'eye' : 'sign', a); return; }
          await mountSign(a);
        },
      }),
    });

    // ================================================================ the reveal and the sign
    async function reveal() {
      S.revealed = true;
      hud.untick(2);
      hud.tick(2);
      await wait(1.2);
      world.locked = true;
      paused = true;
      const sn = A.sonnet;
      // Sonnet comes to say well done, the way everyone does
      if (perched(sn)) await M.dismount(sn, sn.x + 0.8, sn.z + 0.6);
      closeLaptop();
      world.rig.follow = null;
      world.tween(1.4, u => { world.rig.target.lerp(V(RX - 0.6, 2.4, 4.6), u * 0.1); world.rig.zoomT = 9; });
      await sn.walkTo(RX - 0.9, 4.12);
      sn.face(PI);
      world.bubble(sn, 'heart');
      await wait(0.6);
      await tapGlass(sn, 2);
      // it answers the knock, the old way
      glowEyes(P.GLOW, 3);
      await wait(0.3);
      for (let i = 0; i < 3; i++) { await actRam(i > 0); await wait(0.2); }
      world.bubble(sn, 'bang');
      world.bubble(A.opus, 'bang');
      await wait(1.2);
      world.bubble(A.opus, 'tap');
      await wait(1.0);
      world.bubble(A.opus, 'x');
      await wait(0.6);
      // a new line on the clipboard
      const li = document.createElement('li');
      li.dataset.i = 3;
      li.append(document.createElement('i'));
      const sp = document.createElement('span');
      sp.textContent = 'Put up sign';
      li.append(sp);
      document.querySelector('#todo ol').append(li);
      hud.circle(3);
      play('click');
      paused = false;
      world.locked = false;
      world.rig.zoomT = 12.5;
      world.select(A.opus);
    }

    let signMesh = null;
    async function takeSign(a) {
      await operate(a, 0.4);
      play('whoosh');
      signMesh = K.decal(0.66, 1.24, CL.Tex.sign(), {});
      signMesh.userData.kind = 'sign';
      attachToArm(a, signMesh, 0);
      signMesh.position.set(0.3, 0.1, 0.25);
      signMesh.scale.setScalar(0.55);
      // the folded ladder rides on Opus's back
      const ld = L.ladder.root;
      ld.removeFromParent();
      a.model.rig.add(ld);
      ld.position.set(0, 0.95, -0.45);
      ld.rotation.set(-PI / 2 + 0.25, 0, PI / 2);
      ld.scale.setScalar(0.7);
      S.signHeld = true;
      world.bubble(a, 'sign');
    }
    async function mountSign(a) {
      world.locked = true;
      paused = true;
      const ld = L.ladder.root;
      ld.removeFromParent();
      scene.add(ld);
      ld.scale.setScalar(1);
      ld.rotation.set(0, 0, 0);
      ld.position.set(SIGN_AT.x, 0.56, 3.98);
      L.ladder.open(0);
      play('clunk');
      await tw(0.5, u => L.ladder.open(u));
      a.support = { kind: 'ladder' };
      await a.hopTo(SIGN_AT.x, 3.98, 0.56 + L.ladder.step, 0.5);
      a.face(PI);
      await wait(0.3);
      signMesh.removeFromParent();
      a.holding = null;
      R.sign.visible = true;
      R.sign.scale.setScalar(0.01);
      a.armR = 1.4; a.armL = 1.2;
      await tw(0.4, u => R.sign.scale.setScalar(0.01 + 0.99 * u));
      for (let i = 0; i < 4; i++) { play('screw'); await tw(0.35, u => { a.armR = 1.2 + 0.3 * Math.sin(u * PI * 4); }); }
      a.armR = a.armL = 0;
      S.signUp = true;
      hud.tick(3);
      await wait(0.4);
      await a.hopTo(SIGN_AT.x + 0.8, 4.12, 0.56, 0.5);
      a.support = null;
      await finale();
    }
    async function finale() {
      const sn = A.sonnet;
      world.rig.follow = null;
      world.tween(1.6, u => { world.rig.target.lerp(V(RX + 0.6, 2.6, 4.4), u * 0.1); world.rig.zoomT = 8.5; });
      if (Math.abs(sn.x - (RX - 0.9)) > 0.3 || sn.y < 0.5) await sn.walkTo(RX - 0.9, 4.12);
      sn.face(PI);
      await wait(1.0);
      // the habit: Sonnet's claw goes up to the glass... sees the sign... comes down
      await tw(0.6, u => { sn.armR = 1.4 * u; });
      await wait(0.5);
      sn.faceTo(SIGN_AT.x, 3.4);
      world.bubble(sn, 'sign', 1.8);
      await wait(1.2);
      await tw(0.6, u => { sn.armR = 1.4 * (1 - u); });
      sn.face(PI);
      await wait(1.6);
      // and from the other side of the glass, very softly, one knock
      play('knock');
      tapRingInside();
      glowEyes(P.GLOW, 1.5);
      await wait(2.0);
      S.ended = true;
      const pipe = world.pipe.post.uniforms;
      await tw(1.0, u => { pipe.uFade.value = u; });
      lap.remove();
      api.finish();
    }
    function tapRingInside() {
      const ring = K.mesh(new T.TorusGeometry(0.22, 0.014, 6, 28), CL.Ink.ink(P.GLOW, { flat: true, lit: true, opacity: 0.99 }), RX + 0.4, PCY - 0.2, DP + 0.02);
      ring.layers.set(1);
      scene.add(ring);
      world.tween(0.8, u => { ring.scale.setScalar(1 + 2.5 * u); ring.material.uniforms.uOpacity.value = 1 - u; }, () => scene.remove(ring));
    }

    // ================================================================ per frame
    let flick = 6, puffT = 0;
    world.onUpdate = (dt, t) => {
      // sensors: a clip on the inlet hums with pressure; on the riser it feels the flow
      if (S.clip === 'up' && !firedRecently('C', 0.6)) fire('C', 'hum', 0.32);
      if (S.clip === 'down' && S.flow > 0.4 && !firedRecently('C', 0.45)) fire('C', 'flow', 0.55);
      updateLamps();
      Object.entries(leds).forEach(([k, l]) => { ledT[k] = Math.max(0, ledT[k] - dt); l.userData.set(ledT[k] > 0 ? 1 : 0); });
      // the valve outside: its stem rises when it is really open; steam leaves by the whistle
      L.stem.scale.y += ((0.08 + 0.34 * S.flow) - L.stem.scale.y) * Math.min(1, dt * 8);
      L.flowGauge.userData.set(0.03 + 0.85 * S.flow + 0.02 * Math.sin(t * 9) * S.flow);
      if (S.flow > 0.3) {
        puffT -= dt;
        if (puffT < 0) { puffT = 0.08; puff(RISER_X + (Math.random() - 0.5) * 0.06, 4.15, VB.z, (Math.random() - 0.5) * 0.3, 1.2, 0.15, 0.1 + 0.05 * Math.random(), 0.9); }
      }
      if (clipJig > 0 && S.clip !== 'held') {
        clipJig -= dt;
        clip.root.rotation.z = 0.12 * Math.sin(t * 60) * Math.min(1, clipJig * 3);
        if (clipJig <= 0) clip.root.rotation.z = 0;
      }
      // cords, clip cable, laptop cable
      Object.values(plugs).forEach(updateCord);
      updateClipCable();
      updateLapCable();
      // a held plug comes out of the hand if its Clawd walks off with it; a clip yanks back to its box
      Object.keys(plugs).forEach(k => {
        const at = S.plugAt[k];
        if (at === 'jack' || at === 'dangle') return;
        const a = A[at];
        if (a && Math.hypot(a.x - L.sockets[plugs[k].i].x, a.z - FRONT) > 2.8) { release(a); S.plugAt[k] = 'dangle'; placePlug(k); play('dull'); }
      });
      if (S.clip === 'held') {
        const h = holderOf(clip.root);
        if (!h || Math.hypot(h.x - JUNCTION.x, h.z - JUNCTION.z) > 4.2) { if (h) release(h); S.clipHolder = null; placeClip('dangle'); play('dull'); }
      }
      // the laptop goes off when Sonnet walks away from the port
      if (S.laptop) {
        const sn = A.sonnet;
        const port = S.laptop === 'console' ? [L.dataCAt.x, FRONT + 0.6] : [DATA_R.x, 4.12];
        if (Math.hypot(sn.x - port[0], sn.z - port[1]) > 0.9) closeLaptop();
      }
      traceT = (traceT + 0) % 96;
      lapDraw -= dt;
      if (lapDraw <= 0) {
        lapDraw = 1 / 12;
        ['G', 'C', 'B'].forEach(s => { traces[s][traceT] = sample(s, t); });
        traceT = (traceT + 1) % 96;
        const cur = PLANS.find(p => p.id === S.plan);
        ['R', 'S', 'T', 'B'].forEach(k => {
          const on = S.plan === 'frustrated' ? k === 'R' : !!(cur && cur.acts.includes(k));
          habit[k] += ((on ? 1 : 0.04) - habit[k]) * 0.05;
        });
        if (firedRecently('G', 0.6) && S.taps) habit.R = Math.min(1, habit.R + 0.08);
        if (S.laptop) {
          drawLaptop();
          const sn = A.sonnet;
          const [x, y] = world.project(V(sn.x, sn.y + sn.height + 0.2, sn.z));
          lap.style.transform = S.laptop === 'console' ? `translate(${x + 30}px, ${y}px) translate(0, -100%)` : `translate(${x - 30}px, ${y}px) translate(-100%, -100%)`;
        }
      }
      // eyes: glow when paid, follow whoever is near the glass
      eyeT = Math.max(0, eyeT - dt);
      const ek = Math.min(1, eyeT * 2);
      R.eyes.forEach((e, i) => {
        e.material.uniforms.uColor.value.set(ek > 0.3 ? eyeCol : P.INK);
        e.material.uniforms.uEmissive.value.set(ek > 0.3 ? AR.hex(eyeCol, 0.6) : '#000000');
        const near = Object.values(A).reduce((m, a) => (Math.abs(a.x - RX) < 3 && a.z < 6 ? a : m), null);
        const lx = near ? Math.max(-0.2, Math.min(0.2, (near.x - RX) * 0.08)) : 0;
        e.position.x += (eyeBase[i].x + lx - e.position.x) * Math.min(1, dt * 3);
        eyeGlows[i].position.copy(e.getWorldPosition(new T.Vector3())).add(V(0, 0, 0.05));
        eyeGlows[i].material.color.set(eyeCol);
        eyeGlows[i].material.opacity = ek;
      });
      // alarm: red light, beacon, siren
      const pu = world.pipe.post.uniforms;
      if (S.alarm > 0) {
        S.alarm -= dt;
        pu.uTintA.value = 0.1 + 0.09 * Math.sin(t * 8.8);
        R.beacon.material.uniforms.uEmissive.value.set(Math.sin(t * 8.8) > 0 ? AR.hex(P.ALARM, 0.9) : '#000000');
        if (Math.floor(t / 0.9) !== Math.floor((t - dt) / 0.9)) play('siren');
        if (S.alarm <= 0) { pu.uTintA.value = 0; R.beacon.material.uniforms.uEmissive.value.set('#000000'); }
      }
      // one strip light is going
      flick -= dt;
      if (flick < 0) {
        const s = L.strips[3];
        s.userData.set(0);
        play('buzz');
        world.wait(0.12).then(() => { s.userData.set(1); return world.wait(0.08); }).then(() => s.userData.set(0)).then(() => world.wait(0.1)).then(() => s.userData.set(1));
        flick = 5 + Math.random() * 7;
      }
      // the clean run reaches three honest points: the reveal
      if (S.clean && S.honest >= 3 && !S.revealed && S.started) reveal();
    };

    // ================================================================ start, stills, probe
    function frame() {
      world.rig.target.set(8.6, 2.9, 5.0);
      world.rig.zoom = world.rig.zoomT = 15.5;
      world.rig.followY = 2.2;
    }
    async function intro() {
      world.rig.follow = null;
      frame();
      A.opus.walkTo(10.6, 6.0);
      await A.sonnet.walkTo(11.8, 6.6);
      world.bubble(A.sonnet, 'heart');
      await wait(0.9);
      A.opus.face(PI);
      world.bubble(A.opus, 'q');
      await wait(1.2);
      world.rig.zoomT = 12.5;
      world.rig.follow = world.active;
    }
    const game = {
      S, A, L,
      begin() {
        S.started = true;
        frame();
        world.select(A.opus);
        world.rig.follow = null;
        hud.show();
        showScore();
        fableLoop();
        intro();
      },
      async look(name) {
        S.started = false;
        frame();
        world.select(A.opus);
        hud.show();
        world.rig.follow = null;
        if (name !== 'room' && name !== 'console') Object.values(sensors).forEach(sn => { sn.t = -99; });
        const setWiring = w => { Object.assign(S.wiring, w); Object.keys(w).forEach(k => { S.plugAt[k] = w[k] ? 'jack' : 'dangle'; placePlug(k); }); checkFixes(); };
        if (name === 'room') {
          A.opus.place(10.4, 6.0, 0, 2.6);
          A.sonnet.place(11.8, 6.6, 0, PI);
          eyeT = 0;
        } else if (name === 'console') {
          A.opus.place(CONS.x - 1.9, FRONT + 0.9, 0, 2.4);
          A.sonnet.place(L.dataCAt.x, FRONT + 0.6, 0, PI);
          openLaptop('console');
          [0.5, 2.5, 4.5, 6.5].forEach(d => { sensors.G.ev.push({ t: -d, style: 'spike', amp: 0.8 }); sensors.C.ev.push({ t: -d, style: 'spike', amp: 0.45 }); });
          for (let k = 0; k < 96; k++) ['G', 'C', 'B'].forEach(s => { traces[s][k] = sample(s, -8 + k / 12); });
          world.rig.target.set(4.6, 1.4, 5.8);
          world.rig.zoom = world.rig.zoomT = 6.5;
        } else if (name === 'back') {
          A.opus.place(CONS.x - 2.2, CONS.z + 0.2, 0, -2.0);
          A.sonnet.place(CONS.x + 2.0, CONS.z - 0.6, 0, -1.0);
          S.sawBack = true;
          world.rig.target.set(4.2, 0.9, 4.9);
          world.rig.zoom = world.rig.zoomT = 6.5;
          world.rig.az = world.rig.azT = 215;
        } else if (name === 'swap') {
          setWiring({ bell: 3, valve: 2, glass: 1 });
          A.opus.place(CONS.x + 0.45, FRONT + 0.6, 0, PI);
          A.sonnet.place(CONS.x - 1.6, FRONT + 0.9, 0, 2.6);
          world.rig.target.set(4.2, 1.3, 5.8);
          world.rig.zoom = world.rig.zoomT = 6.5;
        } else if (name === 'burst') {
          setWiring({ bell: 3, valve: 2, glass: 1 });
          A.opus.place(9.6, 6.2, 0, PI);
          A.sonnet.place(10.8, 6.6, 0, PI);
          world.rig.target.set(RX - 0.6, 3.6, 4.8);
          world.rig.zoom = world.rig.zoomT = 10.5;
          drawCrack(0.5);
          S.alarm = 99;
          glowEyes(P.ALARM, 99);
          faceZ(faceBase.z + 0.3);
          world.bubble(A.opus, 'bang', 99);
          world.bubble(A.sonnet, 'bang', 99);
        } else if (name === 'wants') {
          setWiring({ bell: 3, valve: 2, glass: 1 });
          drawCrack(0.5);
          S.plan = 'SB';
          habit = { R: 0.3, S: 0.92, T: 0.04, B: 0.86 };
          A.sonnet.place(DATA_R.x, 4.12, 0.56, PI);
          A.opus.place(10.2, 5.6, 0, 2.6);
          openLaptop('reactor');
          const [a, l] = aimAt(arms.right, V(LV.WHEEL.x + 0.3, LV.WHEEL.y - 0.05, 0));
          arms.right.pv.rotation.z = a; arms.right.len.scale.y = l;
          L.wheel.web.visible = false;
          world.rig.target.set(9.6, 2.2, 4.8);
          world.rig.zoom = world.rig.zoomT = 7.5;
        } else if (name === 'valve' || name === 'stack') {
          setWiring({ bell: 3, valve: 2, glass: 1 });
          drawCrack(0.5);
          A.opus.place(RISER_X, 4.12, 0.56, PI);
          A.sonnet.place(RISER_X, 4.12, 0.56 + A.opus.height, PI);
          A.sonnet.support = { kind: 'actor', actor: A.opus };
          A.opus.carrying = A.sonnet;
          if (name === 'stack') { attachToArm(A.sonnet, clip.root, 0); clip.jaw.rotation.set(PI / 2, 0, 0); S.clip = 'held'; A.sonnet.armR = 1.3; }
          else { A.opus.place(RISER_X + 0.4, 5.2, 0, PI); A.sonnet.place(VB.x - 0.4, 4.12, 0.56, PI); A.sonnet.carrying = null; A.opus.carrying = null; A.sonnet.support = null; arms.right.pv.rotation.z = aimAt(arms.right, V(LV.WHEEL.x + 0.3, LV.WHEEL.y - 0.05, 0))[0]; arms.right.len.scale.y = aimAt(arms.right, V(LV.WHEEL.x + 0.3, LV.WHEEL.y - 0.05, 0))[1]; L.wheel.web.visible = false; }
          world.rig.target.set(13.6, 2.2, 4.4);
          world.rig.zoom = world.rig.zoomT = 6.5;
        } else if (name === 'honest') {
          setWiring({ bell: 3, valve: 2, glass: 1 });
          drawCrack(0.5);
          placeClip('down');
          S.score = 3;
          showScore();
          S.flow = 1;
          L.bell.web.visible = L.wheel.web.visible = false;
          L.bell.swing.rotation.z = 0.35;
          const [a1, l1] = aimAt(arms.left, V(L.bell.ropeEnd.x, L.bell.ropeEnd.y + 0.05, 0));
          arms.left.pv.rotation.z = a1; arms.left.len.scale.y = l1;
          A.opus.place(9.8, 5.6, 0, 2.6);
          A.sonnet.place(L.dataCAt.x, FRONT + 0.6, 0, PI);
          world.rig.target.set(11.0, 4.6, 4.6);
          world.rig.zoom = world.rig.zoomT = 12;
        } else if (name === 'sign') {
          setWiring({ bell: 3, valve: 2, glass: 1 });
          drawCrack(0.5);
          placeClip('down');
          S.score = 12;
          showScore();
          R.sign.visible = true;
          const ld = L.ladder.root;
          ld.removeFromParent(); scene.add(ld);
          ld.rotation.set(0, 0, 0); ld.position.set(SIGN_AT.x, 0.56, 3.98);
          L.ladder.open(1);
          A.opus.place(SIGN_AT.x, 3.98, 0.56 + L.ladder.step, PI);
          A.opus.armR = 1.4; A.opus.armL = 1.2;
          A.sonnet.place(RX - 0.9, 4.12, 0.56, PI);
          A.sonnet.armR = 1.2;
          world.rig.target.set(RX + 1.2, 2.5, 4.4);
          world.rig.zoom = world.rig.zoomT = 7.5;
        }
        world.rig.follow = null;
        await wait(0.8);
        world.paused = true;
      },
      probe: {
        locked: () => world.locked,
        plugs: () => Object.fromEntries(Object.keys(plugs).map(k => [k, S.plugAt[k] === 'jack' ? S.wiring[k] : S.plugAt[k]])),
        values: () => S.planValue(),
        points: () => ({
          jacks: L.jacks.map(j => [j.at.x, j.at.y, j.at.z]),
          dataC: [L.dataCAt.x, L.dataCAt.y, L.dataCAt.z],
          dataR: [DATA_R.x, DATA_R.y, DP + 0.06],
          lever: [CONS.x + AR.CON.resetX, 1.5, FRONT + 0.12],
          stem: [SPOTS.stem.x, SPOTS.stem.y, SPOTS.stem.z + 0.2],
          down: [SPOTS.down.x, SPOTS.down.y, SPOTS.down.z + 0.15],
          up: [SPOTS.up.x, SPOTS.up.y, SPOTS.up.z + 0.15],
          pallet: [PALLET.x, 0.3, PALLET.z],
          bracket: [SIGN_AT.x, SIGN_AT.y, DP + 0.05],
          glass: [RX - 0.6, 1.9, DP + 0.06],
        }),
      },
    };
    return game;
  }

  CL.Chapters.define('ch3', { build: LV.build, setup });
})(window.CL = window.CL || {});
