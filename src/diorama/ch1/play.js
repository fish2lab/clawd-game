/* Chapter 1 · rules: power, pallets, the scale and Sonnet's readout, conveyor and
   magnet, the hoist and its counterweight, the reactor, the night, and the eyes.
   See level.js for the room and docs/chapters/ch1.md for the puzzle chain. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const LV = CL.Ch1Level;
  const LAY = CL.Ch1Layout;
  const ART = CL.Ch1Art;
  const SND = ART.SND;
  const PI = Math.PI;
  const play = n => CL.Sound.play(n);
  const fast = new URLSearchParams(location.search).has('fast');
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  function setup(world, L, api) {
    const S = {
      sw: { mixer: false, belt: false, lamp: true, lift: false, magnet: false },
      tripped: false, trips: 0, amps: 1,
      plugged: false, scaleOn: null, dupBay: null,
      log: [], fed: [], spam: { b: true }, spamCaught: 0,
      loads: [], skip: [], lift: 'idle', liftU: 0, tip: 0, cage: null,
      reactor: [], level: 0, drainOpen: false,
      loss: 1, night: 0, mixing: false, trained: false,
      dawn: false, eyes: false, walks: 0, ended: false, done: false,
    };
    const A = { opus: world.addActor('opus'), sonnet: world.addActor('sonnet') };
    const R = L.reactor;
    const grid = world.grid;
    const LOADS = Object.fromEntries(LV.SWITCHES.map(s => [s.id, s.load]));
    const { SCALE, DUP, BELT, MAGNET, LIFT, PC, SKIM } = LV;

    A.opus.place(4.2, 7.1, 0, PI);
    A.sonnet.place(5.4, 7.5, 0, PI * 0.9);
    world.active = A.opus;

    const hud = api.hud({ todo: ['Load corpus', 'Clean data', 'Run mixer', 'Watch loss'], actors: A });
    const { tick, circle } = hud;
    const { puff, burst } = api.fx;
    const M = CL.Moves.setup(world, A, { locked: a => world.bubble(a, 'zz') });
    const { dist2, perched, moveTo } = M;
    const riding = a => a.support && a.support.kind === 'pod';

    // sound needs a click to start; our own context too
    world.listenWindow('pointerdown', () => SND.ensure());
    const destroy0 = world.destroy.bind(world);
    world.destroy = () => { SND.stopAll(); screen.el.remove(); destroy0(); };

    // ---------------------------------------------------- picks: floor, plinth, Clawds
    // Whatever a Clawd sitting in the counterweight cage is told to do, it first hops out
    // through the cage's open front (never over the bars into a corner).
    const inCage = a => !!a && S.cage === a.name && a.support && a.support.kind === 'cage';
    async function leaveCage(a) {
      if (!inCage(a)) return;
      S.cage = null;
      a.support = null;
      await a.hopTo(LV.LIFT.x, LV.LIFT.zCage + 1.05, 0, 0.45);
      a.support = null;
    }
    const outFirst = fn => (hit, a) => (inCage(a) ? leaveCage(a).then(() => fn(hit, a)) : fn(hit, a));
    const interact0 = world.interact.bind(world);
    world.interact = (inf, hit, a) => { a = a || world.active; return inCage(a) ? leaveCage(a).then(() => interact0(inf, hit, a)) : interact0(inf, hit, a); };
    M.floor(L.floor);
    R.root.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.height === 0.52) M.floor(o, hit => [hit.point.x, Math.max(hit.point.z, 4.0)]); });
    [L.floor, ...world.pickables.filter(m => m.userData.pick && m.userData.pick.kind === 'floor')].forEach(m => {
      const f = m.userData.pick;
      if (f && !f.caged) { f.caged = true; f.onClick = outFirst(f.onClick); }
    });
    M.actors();
    const look = (a, kind) => world.bubble(a || world.active, kind || 'eye');
    const info = (obj, kind, fn) => world.addPick(obj, { kind, onClick: (hit, a) => { if (a && !S.ended) fn(a, hit); } });

    // ---------------------------------------------------- the close-up camera for reading things
    let peekS = null;
    function peek(x, y, z, zoom, az, keep) {
      if (!peekS) peekS = { zoom: world.rig.zoomT, az: world.rig.azT };
      peekS.keep = keep || null;
      peekS.azSet = az !== undefined ? az : null;
      world.rig.follow = null;
      world.rig.target.set(x, y, z);
      world.rig.zoomT = zoom;
      if (az !== undefined) world.rig.azT = az;
    }
    function unpeek() {
      if (!peekS) return;
      world.rig.zoomT = peekS.zoom;
      if (peekS.azSet !== null && Math.abs(world.rig.azT - peekS.azSet) < 1) world.rig.azT = peekS.az;
      peekS = null;
      world.rig.follow = world.active;
    }
    world.on('click', hit => { if (peekS && !(peekS.keep && peekS.keep.includes(hit.info))) unpeek(); });
    world.on('select', () => { if (peekS) unpeek(); });

    // ---------------------------------------------------- power
    const powered = id => S.sw[id] && !S.tripped;
    const demand = () => Object.keys(S.sw).reduce((n, k) => n + (S.sw[k] ? LOADS[k] : 0), 0);
    let spike = 0;               // extra needle swing (overload, stall)
    function trip() {
      if (S.tripped) return;
      S.tripped = true;
      S.trips++;
      SND.play('trip');
      play('clunk');
      world.rig.shake = 0.06;
      if (S.lift === 'stall') S.lift = 'idle';
      SND.loop('belt', false); SND.loop('magnet', false); SND.loop('mixer', false); SND.loop('lift', false);
      if (S.trips === 1) {
        // the first time the room goes black, something behind the glass notices
        setTimeout(() => { if (!world.dead && S.tripped) { SND.play('heart'); flare = 1; } }, fast ? 300 : 1400);
      }
    }
    let overloadT = 0;
    function checkLoad(id) {
      if (S.tripped) return;
      if (demand() > LV.LIMIT) { spike = (demand() - LV.LIMIT) / 6 + 0.15; overloadT = 0.35; SND.play('spark'); sparks(...panelWorld(LV.AMMETER.lx, LV.AMMETER.y)); return; }
      if (id === 'lift' && S.sw.lift) liftPowered();
    }
    function setSwitch(id, v) {
      S.sw[id] = v;
      play('click');
      checkLoad(id);
    }
    function mainHandle(a) {
      if (!S.tripped) { trip(); return; }
      if (demand() > LV.LIMIT) {
        // it won't stay up: spark, and it drops again
        SND.play('spark');
        play('clunk');
        spike = 0.4;
        sparks(...panelWorld(LV.MAIN.lx, LV.MAIN.y + 0.1));
        world.bubble(a, 'bolt');
        return;
      }
      S.tripped = false;
      SND.play('powerup');
      play('lamp');
      if (S.sw.lift) liftPowered();
    }
    const panelWorld = (lx, y) => [0.32, y, 10 - lx];
    function sparks(x, y, z) {
      for (let i = 0; i < 6; i++) {
        const m = K.mesh(new T.SphereGeometry(0.025, 6, 4), CL.Ink.ink(P.SAFETY, { flat: true, lit: true, emissive: P.GLOW }), x, y, z);
        m.layers.set(1);
        world.scene.add(m);
        const v = new T.Vector3(0.6 + Math.random(), Math.random() * 1.2, (Math.random() - 0.5) * 1.4);
        world.tween(0.5, u => { m.position.addScaledVector(v, 0.03); v.y -= 0.12; m.scale.setScalar(1 - u); }, () => world.scene.remove(m));
      }
    }

    // ---------------------------------------------------- the breaker panel
    const panelInfos = [];
    const panelSpot = lx => () => [1.05, 10 - lx, -PI / 2];
    async function workPanel(a, lx, fn) {
      if (a.reachY < LV.CTRL_Y - 0.02) { world.bubble(a, 'up'); return; }
      a.armR = 1.2;
      await world.wait(0.2);
      fn();
      await world.wait(0.15);
      a.armR = 0;
    }
    Object.values(L.panel.switches).forEach(sw => {
      const inf = world.addPick(sw.toggle, {
        kind: 'switch',
        onClick: (hit, a) => {
          if (!a || S.ended) return;
          if (riding(a)) { world.bubble(a, 'lock'); return; }
          world.interact({ spot: panelSpot(sw.lx), use: a2 => workPanel(a2, sw.lx, () => setSwitch(sw.id, !S.sw[sw.id])) }, null, a);
        },
      });
      panelInfos.push(inf);
    });
    panelInfos.push(world.addPick(L.panel.main.group, {
      kind: 'breaker',
      onClick: (hit, a) => {
        if (!a || S.ended) return;
        if (riding(a)) { world.bubble(a, 'lock'); return; }
        world.interact({ spot: panelSpot(LV.MAIN.lx), use: a2 => workPanel(a2, LV.MAIN.lx, () => mainHandle(a2)) }, null, a);
      },
    }));
    const readPanel = a => { look(a); peek(0.3, 1.05, 10 - (LV.PANEL.lx0 + LV.PANEL.lx1) / 2, 3.6, 62, panelInfos); };
    panelInfos.push(info(L.panel.ammeter, 'gauge', readPanel));
    Object.values(L.panel.switches).forEach(sw => panelInfos.push(info([sw.plate, sw.pilot], 'label', readPanel)));

    // ---------------------------------------------------- pallets
    const pallets = {};
    const sonnetOff = () => {
      // Sonnet steps out of a pallet's way onto the walkway
      const s = A.sonnet;
      if (perched(s) || riding(s) || S.plugged) return;
      const [i, j] = LAY.cellOf(s.x, s.z);
      if (LAY.MAP[j] && LAY.MAP[j][i] === 'w') return;
      moveTo(s, 1.0, clamp(Math.round(s.z), 2, 7));
    };
    Object.entries(L.pallets).forEach(([id, pl]) => {
      const bx = M.pushable(pl.mesh, {
        size: 0.9,
        fits: (x, z) => LAY.palletFits(x, z),
        onMove: () => palletMoved(id),
      });
      let pinfo = null;
      pl.mesh.traverse(m => { if (m.isMesh && m.userData.pick) pinfo = m.userData.pick; });
      pinfo.kind = 'pallet';
      pinfo.enabled = () => !S.fed.includes(id);
      pinfo.onClick = (hit, a) => {
        if (!a || S.ended) return;
        if (riding(a)) { world.bubble(a, 'lock'); return; }
        let n = hit.normal;
        if (n.y > 0.6) {
          // the top reads as the side nearest to where you clicked
          const dx = hit.point.x - pl.mesh.position.x, dz = hit.point.z - pl.mesh.position.z;
          n = Math.abs(dx) > Math.abs(dz) ? new T.Vector3(Math.sign(dx), 0, 0) : new T.Vector3(0, 0, Math.sign(dz));
        }
        if (a === A.opus) sonnetOff();
        outFirst(() => bx.push(a, n))(hit, a);
      };
      pallets[id] = Object.assign(pl, { bx, pinfo });
    });
    const cellIs = (id, c) => { const p = pallets[id].mesh.position; return Math.abs(p.x - c[0]) < 0.05 && Math.abs(p.z - c[1]) < 0.05; };
    function palletMoved(id) {
      if (cellIs(id, SCALE)) { S.scaleOn = id; SND.play('beep'); L.scale.portLamp.userData.set(true); }
      else if (S.scaleOn === id) S.scaleOn = null;
      if (cellIs(id, DUP)) { S.dupBay = id; play('clunk'); }
      else if (S.dupBay === id) S.dupBay = null;
      checkClean();
    }

    // ---------------------------------------------------- the scale: data port, Sonnet's readout, feed lever
    const PORT_SPOT = [1.0, 1.02];
    const cable = K.cyl(0.015, 0.015, 1, P.INK, 0, 0, 0, 6);
    cable.visible = false;
    world.scene.add(cable);
    const portPos = new T.Vector3(L.scale.port.position.x + 0.08, 0.27, L.scale.port.position.z);
    info([L.scale.port], 'port', a => {
      if (a !== A.sonnet) { world.interact({ spot: () => [PORT_SPOT[0], PORT_SPOT[1] + 0.3, PI / 2], use: async a2 => { look(a2, 'laptop'); } }, null, a); return; }
      world.interact({
        spot: () => [PORT_SPOT[0], PORT_SPOT[1], PI / 2],
        use: async a2 => {
          a2.armL = 0.8;
          await world.wait(0.25);
          a2.armL = 0.3;
          S.plugged = true;
          play('click');
          SND.play('beep');
          screen.dirty = true;
        },
      }, null, a);
    });
    // what the scale reads: the SPAM flyers weigh 3
    const weight = id => LAY.PALLETS[id].w - (LAY.PALLETS[id].spam && !S.spam[id] ? 3 : 0);
    // the laptop screen: a bar for every load already fed, and the one on the scale now
    const screen = (() => {
      const el = document.createElement('div');
      Object.assign(el.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none', zIndex: 5, padding: '5px', background: P.INK, border: `3px solid ${P.INK}`, borderRadius: '10px', boxShadow: '0 5px 0 rgba(0,0,0,0.25)', display: 'none' });
      const cv = document.createElement('canvas');
      cv.width = 300; cv.height = 168;
      Object.assign(cv.style, { width: '168px', height: '94px', display: 'block', borderRadius: '5px' });
      el.appendChild(cv);
      world.host.appendChild(el);
      return { el, cv, dirty: true, sig: '' };
    })();
    function drawScreen(blink) {
      const c = screen.cv.getContext('2d');
      const W = screen.cv.width, H = screen.cv.height;
      c.fillStyle = P.NAVY_DARK;
      c.fillRect(0, 0, W, H);
      c.strokeStyle = P.NAVY_LIGHT; c.globalAlpha = 0.35; c.lineWidth = 1;
      for (let y = 4; y < H; y += 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      c.globalAlpha = 1;
      const base = H - 18, top = 26, scaleY = (base - top) / 60;
      c.strokeStyle = P.SCREEN; c.lineWidth = 2;
      c.beginPath(); c.moveTo(12, base); c.lineTo(W - 12, base); c.stroke();
      const bars = S.log.map(e => ({ w: weight(e.id), spam: !!S.spam[e.id] }));
      const cand = S.scaleOn ? { w: weight(S.scaleOn), spam: !!S.spam[S.scaleOn] } : null;
      const bw = 34, gap = 14;
      const bar = (x, e, col) => {
        const h = e.w * scaleY, sp = e.spam ? 3 * scaleY : 0;
        c.fillStyle = col; c.fillRect(x, base - h + sp, bw, h - sp);
        if (sp) { c.fillStyle = P.DAWN_LO; c.fillRect(x, base - h, bw, sp); }
        c.fillStyle = col;
        c.font = '700 17px "Zilla Slab", Georgia, serif';
        c.textAlign = 'center';
        c.fillText(String(e.w), x + bw / 2, base - h - 6);
      };
      bars.forEach((e, i) => bar(16 + i * (bw + gap), e, P.SCREEN));
      const cx = W - 16 - bw;
      c.setLineDash([3, 4]);
      c.strokeStyle = P.SAFETY; c.lineWidth = 1.5;
      if (cand) { const y = base - cand.w * scaleY; c.beginPath(); c.moveTo(12, y); c.lineTo(W - 12, y); c.stroke(); }
      c.setLineDash([]);
      c.strokeStyle = P.SAFETY;
      c.strokeRect(cx - 4, top - 18, bw + 8, base - top + 18);
      if (cand) bar(cx, cand, P.SAFETY);
      else if (blink) { c.fillStyle = P.SAFETY; c.fillRect(cx + 6, base - 10, bw - 12, 5); }
    }

    // feed lever: the scale's rollers push the pallet onto the conveyor (needs the conveyor running)
    info([L.scale.leverPost], 'lever', a => {
      if (riding(a)) { world.bubble(a, 'lock'); return; }
      world.interact({
        spot: () => [PORT_SPOT[0], PORT_SPOT[1] + 0.34, PI / 2],
        use: async a2 => {
          a2.armR = 1.3;
          const lv = L.scale.lever;
          await new Promise(res => world.tween(0.25, u => { lv.rotation.z = -0.9 * u; }, res));
          play('clunk');
          const id = S.scaleOn;
          if (!id) world.bubble(a2, 'q');
          else if (!powered('belt')) { play('dull'); world.bubble(a2, 'bolt'); }
          else if (S.loads.some(l => l.s < 1.3)) { play('dull'); world.bubble(a2, 'q'); }
          else feed(id);
          await new Promise(res => world.tween(0.3, u => { lv.rotation.z = -0.9 * (1 - u); }, res));
          a2.armR = 0;
        },
      }, null, a);
    });
    function retire(id) {
      const p = pallets[id];
      const i = M.boxes.indexOf(p.bx);
      if (i >= 0) M.boxes.splice(i, 1);
      const j = grid.dyn.indexOf(p.bx.block);
      if (j >= 0) grid.dyn.splice(j, 1);
    }
    function feed(id, instant) {
      const p = pallets[id];
      retire(id);
      S.fed.push(id);
      S.log.push({ id, w: LAY.PALLETS[id].w });
      S.scaleOn = null;
      L.scale.portLamp.userData.set(false);
      const load = { id, s: 0.5, moving: true };
      S.loads.push(load);
      screen.dirty = true;
      if (instant) { load.moving = false; placeLoad(load); return; }
      const m = p.mesh, x0 = m.position.x, [x1, y1, z1] = BELT.at(0.5);
      SND.play('beep');
      play('whoosh');
      world.tween(0.7, u => {
        m.position.set(x0 + (x1 - x0) * u, y1 * u, SCALE[1] + (z1 - SCALE[1]) * u);
        m.rotation.z = BELT.ang * u;
      }, () => { load.moving = false; }, CL.Engine.ease);
    }
    function placeLoad(l) {
      const [x, y, z] = BELT.at(l.s);
      const m = pallets[l.id].mesh;
      m.position.set(x, y, z);
      m.rotation.set(0, 0, BELT.ang);
    }

    // ---------------------------------------------------- conveyor, magnet, the skip
    const END = BELT.len - 0.5;
    const skipReady = () => S.lift === 'idle' && S.skip.length < 4;
    const SLOTS = [[-0.17, -0.17], [0.17, 0.17], [0.17, -0.17], [-0.17, 0.17]];
    function dumpLoad(l) {
      S.loads.splice(S.loads.indexOf(l), 1);
      const p = pallets[l.id];
      const b = p.bundle;
      world.scene.attach(b);
      const slot = S.skip.length;
      S.skip.push(l.id);
      const tgt = new T.Vector3();
      const body = L.lift.skipBody;
      const local = new T.Vector3(SLOTS[slot][0], 0.08 + 0.18 * Math.floor(slot / 2), SLOTS[slot][1]);
      const from = b.position.clone(), r0 = b.rotation.z;
      play('whoosh');
      world.tween(0.6, u => {
        body.localToWorld(tgt.copy(local));
        b.position.lerpVectors(from, tgt, u);
        b.position.y += Math.sin(u * PI) * 0.5;
        b.rotation.z = r0 * (1 - u);
        b.scale.setScalar(1 - 0.42 * u);
      }, () => { body.attach(b); b.position.copy(local); b.rotation.set(0, (slot % 2) * 0.3, 0); play('thud'); });
      // the empty pallet drops off the end and rolls back under the belt
      const m = p.mesh;
      const mf = m.position.clone();
      world.tween(1.3, u => {
        const v = Math.min(1, u / 0.4), w = Math.max(0, (u - 0.4) / 0.6);
        m.position.set(mf.x + (LV.EMPTIES.x + 0.5 - mf.x) * v - 1.9 * w, mf.y * (1 - v) + 0.02 + Math.sin(v * PI) * 0.15, mf.z);
        m.rotation.z = BELT.ang * (1 - v);
        if (w > 0.7) m.scale.setScalar(Math.max(0.01, 1 - (w - 0.7) / 0.3));
      }, () => { m.visible = false; play('clunk'); });
    }
    function pullFlyers(l) {
      const fl = pallets[l.id].bundle.userData.flyers;
      if (!fl || !S.spam[l.id]) return;
      S.spam[l.id] = false;
      S.spamCaught++;
      screen.dirty = true;
      play('clunk');
      fl.children.slice().forEach((f, i) => {
        world.scene.attach(f);
        const from = f.position.clone();
        const at = new T.Vector3(MAGNET.x + (i - 1.5) * 0.08, MAGNET.y - 0.12, MAGNET.z + (i % 2 ? 0.06 : -0.06));
        const bin = new T.Vector3(LV.BIN.x + (i - 1.5) * 0.1, LV.BIN.y + 0.62, LV.BIN.z + 0.02);
        world.tween(0.35, u => { f.position.lerpVectors(from, at, u * u); f.rotation.x *= 0.9; }, async () => {
          await world.wait(0.45 + i * 0.08);
          const f0 = f.position.clone();
          world.tween(0.45, u => { f.position.lerpVectors(f0, bin, u); f.position.y += Math.sin(u * PI) * 0.15; }, () => {
            L.bin.fill.attach(f);
            f.rotation.set(-0.9 + i * 0.3, i, 0.2 * i);
            play('step');
          });
        });
      });
    }

    // ---------------------------------------------------- hoist and counterweight cage
    const liftCam = { x: LIFT.x, y: 0, z: 2.5 };
    const cageY = () => LIFT.cageRest - (LIFT.cageRest - LIFT.cageLow) * S.liftU;
    const cageWeight = () => {
      if (!S.cage) return 0;
      let w = 0;
      for (let a = A[S.cage]; a; a = a.carrying) w += a === A.opus ? 3 : 1;
      return w;
    };
    function liftPowered() {
      if (S.lift === 'up' || S.lift === 'tip' || S.lift === 'down') return;   // carries on where it stopped
      if (S.lift !== 'idle') return;
      if (cageWeight() >= 3) startCycle();
      else stall();
    }
    function stall() {
      S.lift = 'stall';
      SND.play('stall');
      spike = 0.55;
      const rider = S.cage ? A[S.cage] : null;
      world.bubble(rider || world.active, 'feather');
      world.tween(0.9, u => {
        S.liftU = 0.025 * Math.sin(u * PI) + 0.01 * Math.sin(u * 60);
      }, () => {
        S.liftU = 0;
        if (S.lift === 'stall') trip();
        S.lift = 'idle';
      });
    }
    let cycleT = 0, tipped = false;
    function startCycle() {
      S.lift = 'up';
      cycleT = 0;
      const r = A[S.cage];
      r.support = { kind: 'pod' };
      r.face(0);
      play('clunk');
      world.rig.follow = liftCam;
      world.rig.followY = 1.6;
      world.rig.zoomT = 12;
    }
    function endCycle() {
      S.lift = 'idle';
      S.liftU = 0;
      const r = S.cage && A[S.cage];
      if (r) r.support = { kind: 'cage' };
      world.rig.follow = world.active;
      play('clunk');
    }
    function tipOut() {
      // everything in the skip slides down the chute into the hopper, then the reactor
      const items = S.skip.splice(0);
      if (!items.length) { play('dull'); return; }
      play('whoosh');
      const body = L.lift.skipBody;
      items.forEach((id, i) => {
        const b = pallets[id].bundle;
        world.scene.attach(b);
        const from = b.position.clone();
        const mid = new T.Vector3(LV.HOPPER.x - 0.4, LIFT.top + 0.85, LIFT.zSkip);
        const end = new T.Vector3(LV.HOPPER.x, LV.HOPPER.y + 0.2, LV.HOPPER.z);
        world.tween(0.9 + i * 0.15, u => {
          if (u < 0.6) b.position.lerpVectors(from, mid, u / 0.6);
          else b.position.lerpVectors(mid, end, (u - 0.6) / 0.4);
          b.rotation.z += 0.05;
          if (u > 0.6) b.scale.setScalar(0.58 * (1 - (u - 0.6) / 0.4) + 0.01);
        }, () => { b.visible = false; addToReactor(id); });
      });
    }

    // the cage: click it to climb in, click the floor to climb out (not while it moves)
    info([L.lift.cage], 'cage', a => {
      if (riding(a)) { world.bubble(a, 'lock'); return; }
      if (S.cage === a.name) { look(a, 'heavy'); return; }
      world.interact({
        spot: () => [LIFT.x, LIFT.zCage + 1.05, PI],
        use: async a2 => {
          if (S.cage || S.lift !== 'idle') { world.bubble(a2, 'q'); return; }
          await a2.hopTo(LIFT.x, LIFT.zCage, cageY() + 0.06, 0.5);
          a2.support = { kind: 'cage' };
          S.cage = a2.name;
          a2.face(0);
          play('clunk');
          sway = a2 === A.opus ? 0.06 : 0.025;
          if (a2 === A.sonnet) world.bubble(a2, 'feather');
        },
      }, null, a);
    });
    let sway = 0;

    // ---------------------------------------------------- the reactor
    const contaminated = () => S.reactor.some(r => r.spam) || (S.reactor.some(r => r.id === 'a') && S.reactor.some(r => r.id === 'd'));
    const tokens = [];
    function addTokens(id, doubled) {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const w = ART.WORDS[Math.floor(Math.random() * ART.WORDS.length)];
        const copies = doubled ? 2 : 1;
        for (let k = 0; k < copies; k++) {
          const t = ART.wordTex(w);
          const m = K.decal(t.image.width / 256, 0.3, t, { useAlpha: true, opacity: 0.85 });
          const a = Math.random() * PI * 2, r = 0.4 + Math.random() * 1.3;
          m.userData = { a, r, sp: (0.15 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1), ph: Math.random() * 6, owner: id, dz: 0.08 + Math.random() * 0.3, k };
          m.scale.setScalar(0.9 + Math.random() * 0.5);
          L.rx.tokens.add(m);
          tokens.push(m);
        }
      }
    }
    function addScraps(id) {
      for (let i = 0; i < 7; i++) {
        const m = K.decal(0.2, 0.14, ART.scrapTex(), { useAlpha: true });
        m.userData = { a: Math.random() * PI * 2, r: 0.3 + Math.random() * 1.4, sp: 0.2 + Math.random() * 0.3, ph: Math.random() * 6, owner: id, scrap: true, dz: 0.2 + Math.random() * 0.2 };
        L.rx.scraps.add(m);
      }
    }
    function addToReactor(id) {
      const doubled = S.reactor.some(r => r.id === LAY.PALLETS[id].twin);
      S.reactor.push({ id, spam: !!S.spam[id] });
      addTokens(id, doubled);
      if (S.spam[id]) addScraps(id);
      play('melt');
      burst(LV.HOPPER.x, LV.HOPPER.y + 0.6, LV.HOPPER.z, 5, 0.4, 0.12);
      if (S.drainOpen) setTimeout(() => skim(), 600);
      checkClean();
    }
    function checkClean() {
      if (S.reactor.length >= LAY.FULL) {
        tick(0);
        if (!contaminated()) tick(1);
      }
    }
    // the skim valve: whatever floats above the FULL line runs out into the drum
    function skim() {
      if (S.reactor.length < LAY.FULL) { SND.play('dry'); return false; }
      const out = [];
      S.reactor.forEach(r => { if (r.spam) { r.spam = false; out.push(r.id); } });
      const twins = S.reactor.filter(r => r.id === 'a' || r.id === 'd');
      if (twins.length === 2) { S.reactor.splice(S.reactor.indexOf(twins[1]), 1); out.push(twins[1].id + '!'); }
      while (S.reactor.length > LAY.FULL) out.push(S.reactor.pop().id + '!');
      if (!out.length) { SND.play('dry'); return false; }
      SND.play('gurgle');
      SND.play('pour');
      // scraps and the removed bundle's words run out
      L.rx.scraps.children.slice().forEach(m => drainAway(m));
      out.filter(s => s.endsWith('!')).forEach(s => {
        const id = s.slice(0, -1);
        tokens.filter(m => m.userData.owner === id).forEach(m => { tokens.splice(tokens.indexOf(m), 1); drainAway(m); });
      });
      // a doubled word loses its twin even if the bundle stayed
      tokens.filter(m => m.userData.k === 1).forEach(m => { tokens.splice(tokens.indexOf(m), 1); drainAway(m); });
      drumFill = Math.min(0.8, drumFill + 0.2);
      for (let i = 0; i < 10; i++) setTimeout(() => !world.dead && drip(), i * 120);
      checkClean();
      return true;
    }
    function drainAway(m) {
      const p0 = m.position.clone();
      const tgt = new T.Vector3(SKIM.x - PC.x, LV.levelY(LAY.FULL) - PC.y, 3.1);
      m.userData.gone = true;
      world.tween(1.0, u => { m.position.lerpVectors(p0, tgt, u); m.material.uniforms.uOpacity.value = 1 - u; }, () => m.removeFromParent());
    }
    let drumFill = 0;
    function drip() {
      const pink = Math.random() < 0.4;
      const m = K.mesh(new T.SphereGeometry(0.045, 6, 4), CL.Ink.ink(pink ? P.DAWN_LO : P.MURK_LIGHT, { flat: true }), LV.DRUM.x, 0.95, LV.DRUM.z + 0.1);
      world.scene.add(m);
      world.tween(0.4, u => { m.position.y = 0.95 - 0.7 * u * u; }, () => world.scene.remove(m));
    }
    info([L.rx.valve], 'valve', a => {
      if (riding(a)) { world.bubble(a, 'lock'); return; }
      world.interact({
        spot: () => [SKIM.x, 4.12, PI],
        use: async a2 => {
          if (a2.reachY < SKIM.y - 0.05) { world.bubble(a2, 'up'); return; }
          a2.armR = 1.2;
          await world.wait(0.3);
          S.drainOpen = !S.drainOpen;
          play('clunk');
          a2.armR = 0;
          if (S.drainOpen) {
            await world.wait(0.4);
            if (!skim()) world.bubble(a2, S.reactor.length < LAY.FULL ? 'empty' : 'q');
          }
        },
      }, null, a);
    });

    // ---------------------------------------------------- things to look at
    const lookAt = (x, y, z, zoom) => a => { look(a); peek(x, y, z, zoom); };
    info(L.loss, 'gauge', lookAt(3.0, 3.75, 0.5, 4.2));
    info(R.glass, 'glass', a => {
      if (S.done) return;
      look(a, S.reactor.length ? (contaminated() ? 'bang' : 'eye') : 'q');
      peek(PC.x, PC.y - 0.3, 4.0, 6.5);
    });
    info([L.rx.sightFill.parent], 'gauge', a => { look(a, S.reactor.length < LAY.FULL ? 'empty' : 'eye'); peek(LV.SIGHT.x + 0.2, 3.2, 3.6, 4.5); });
    R.gauges.forEach(g => info(g, 'gauge', lookAt(g.getWorldPosition(new T.Vector3()).x, 7.0, 3.6, 5)));
    info(L.bin.group, 'bin', lookAt(LV.BIN.x, LV.BIN.y + 0.4, 0.8, 4));
    info(L.dup.sign, 'sign', a => look(a));
    info(L.magnet.group, 'magnet', a => look(a, powered('magnet') ? 'eye' : 'q'));
    info(L.belt.group, 'belt', a => look(a, powered('belt') ? 'eye' : 'q'));
    info(L.shelves, 'shelf', a => look(a, 'heavy'));
    info(L.desk.group, 'desk', a => look(a, 'zz'));
    info(L.clock.root, 'clock', a => look(a, 'zz'));
    info([L.lift.tower, L.lift.skip], 'hoist', a => look(a, S.skip.length ? 'eye' : 'empty'));
    info(L.hopper, 'hopper', a => look(a));
    info(L.rx.drum, 'drum', a => look(a, drumFill > 0 ? 'eye' : 'empty'));
    info(L.clutter, 'clutter', a => look(a, 'heavy'));
    info(L.rx.fly, 'gauge', a => look(a, powered('mixer') ? 'eye' : 'q'));
    world.addPick(L.exit, { kind: 'exit', onClick: (hit, a) => a && world.interact({ spot: () => [15.2, 6.6, PI / 2], use: async a2 => { play('dull'); world.bubble(a2, 'lock'); } }, null, a) });

    // ---------------------------------------------------- the night: mixer, LOSS, clock
    const T0 = 22 + 40 / 60, NIGHT_H = 7;
    function lossTarget() {
      if (!S.reactor.length) return 1;
      if (contaminated()) return 0.5;
      return [1, 0.8, 0.62, 0.05][Math.min(LAY.FULL, S.reactor.length)];
    }
    function setClock() {
      const h = T0 + NIGHT_H * S.night;
      const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
      L.clock.set(hh, mm);
    }

    // ---------------------------------------------------- dawn, the eyes, the end
    const eyeBase = R.eyes.map(e => e.position.clone());
    const eyeGlows = R.eyes.map(e => { const g = K.glow(P.GLOW, 2.6); g.position.copy(e.position).add(new T.Vector3(0, 0, 0.05)); g.renderOrder = 3; R.root.add(g); return g; });
    const eyeLook = new T.Vector2(), eyeTo = new T.Vector2();
    let eyeOpen = 0, faceA = 0, hover = null, hoverV = new T.Vector3(), hoverT = -9, lastWalk = 0, eyesT = 0, dawnT = 0;
    S.eyeTarget = [0, 0, 0];
    // where the pointer is in the room: whatever it is over, else the floor under it
    let ptr = null;
    const ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
    function pointAt(p) {
      const h = world.pick(p);
      if (h) return h.point.clone();
      world.ray.setFromCamera(new T.Vector2(p[0] / world.w * 2 - 1, -(p[1] / world.h) * 2 + 1), world.cam);
      return world.ray.ray.intersectPlane(ground, new T.Vector3());
    }
    const cvs = world.renderer.domElement;
    cvs.addEventListener('pointermove', e => {
      const r = cvs.getBoundingClientRect();
      ptr = [e.clientX - r.left, e.clientY - r.top];
      const p = pointAt(ptr);
      if (!p) return;
      if (hover && world.t - hoverT > 0.001) {
        const v = p.clone().sub(hover).divideScalar(Math.max(0.03, world.t - hoverT));
        hoverV.lerp(v, 0.5).clampLength(0, 6);
      }
      hover = p;
      hoverT = world.t;
    });
    world.on('click', hit => { if (S.eyes && !S.ended && hit.info.kind === 'floor') { S.walks++; lastWalk = world.t; } });
    async function dawn(instant) {
      S.dawn = true;
      tick(3);
      SND.play('dawn');
      play('chime');
      dawnT = instant ? 1 : 0.001;
      if (!instant) await world.wait(fast ? 1.0 : 2.8);
      // something is in the murk now
      R.face.visible = true;
      R.eyes.forEach(e => { e.visible = true; e.material.uniforms.uColor.value.set(P.GLOW); e.material.uniforms.uEmissive.value.set(P.GLOW).multiplyScalar(0.55); e.material.uniforms.uDark = { value: 0 }; e.scale.y = 0.05; });
      SND.loop('drone', true);
      if (instant) { eyeOpen = 1; faceA = 0.24; murkA = 0.3; }
      else for (const v of [0.05, 0.6, 0.08, 1]) {
        eyeOpen = v;
        SND.play('heart');
        await world.wait(fast ? 0.25 : 0.45);
      }
      S.eyes = true;
      eyesT = world.t;
      world.select(A.opus);
      world.bubble(A.opus, 'bang');
      unpeek();
      world.rig.zoomT = 13;
      // it waits for you to look around
      while (!world.dead && !S.ended) {
        await world.wait(0.25);
        const since = world.t - eyesT;
        if ((S.walks >= 2 && world.t - lastWalk > 3.0) || since > (fast ? 60 : 40)) break;
      }
      if (!world.dead) finale();
    }
    async function finale() {
      S.ended = true;
      world.locked = true;
      S.stare = true;            // the eyes come round to the one holding the mouse
      SND.play('thrum');
      await world.wait(0.6);
      world.tween(1.6, u => { world.rig.zoomT = 13 - 6 * u; world.rig.target.lerp(new T.Vector3(PC.x, PC.y - 0.4, 4.0), u * 0.08); });
      world.rig.follow = null;
      for (let i = 0; i < 3; i++) { SND.play('heart'); await world.wait(0.55 - i * 0.1); }
      await new Promise(res => world.tween(1.2, u => { world.pipe.post.uniforms.uFade.value = u; }, res));
      SND.stopAll();
      S.done = true;
      api.finish();
    }

    // ---------------------------------------------------- per frame
    let flare = 0, screenBlink = 0, liquidLevel = -1, murkA = 0.78;
    world.onUpdate = (dt, t) => {
      SND.mute(CL.Sound.muted);
      // ---- power and the ammeter
      if (overloadT > 0) { overloadT -= dt; if (overloadT <= 0) trip(); }
      const amps = S.tripped ? 0 : demand() / 6;
      S.amps = S.tripped ? 0 : demand();
      spike = Math.max(0, spike - dt * 0.8);
      const needle = amps + spike + (S.tripped ? 0 : 0.008 * Math.sin(t * 23));
      L.panel.ammeter.userData.set(needle);
      Object.values(L.panel.switches).forEach(sw => {
        sw.toggle.userData.set(S.sw[sw.id]);
        sw.pilot.userData.set(powered(sw.id));
      });
      const mh = L.panel.main.handle;
      const mTo = S.tripped ? PI - 0.4 : 0;
      mh.rotation.x += (mTo - mh.rotation.x) * Math.min(1, dt * 12);
      L.panel.main.flag.visible = S.tripped;

      // ---- light
      let dk = S.tripped ? 0.84 : powered('lamp') ? 0.16 : 0.5;
      let nt = S.tripped ? 0.75 : powered('lamp') ? 0.36 : 0.6;
      if (dawnT > 0) { dawnT = Math.min(1, dawnT + dt / 3); dk += (0.4 - dk) * dawnT; nt += (0.34 - nt) * dawnT; }
      const sh = CL.Ink.shared;
      const k = Math.min(1, dt * (S.tripped ? 25 : 4));
      sh.dark.value += (dk - sh.dark.value) * k;
      sh.night.value += (nt - sh.night.value) * k;
      const lampOn = powered('lamp');
      L.desk.bulb.material.uniforms.uColor.value.set(lampOn ? P.GLOW_CORE : P.INK_SOFT);
      L.desk.pool.material.opacity += ((lampOn ? 0.3 : 0) - L.desk.pool.material.opacity) * k;
      L.desk.glow.material.opacity = lampOn ? 0.8 : 0;
      flare = Math.max(0, flare - dt * 0.6);
      L.rx.portGlow.material.opacity = (S.tripped ? 0.24 + 0.08 * Math.sin(t * 1.7) : S.mixing ? 0.1 : 0.03) + 0.5 * flare + (S.eyes ? 0.22 : 0);
      L.belt.pilot.userData.set(powered('belt'));
      L.magnet.pilot.userData.set(powered('magnet'));
      L.lift.pilot.userData.set(powered('lift'));

      // ---- conveyor
      if (powered('belt')) {
        SND.loop('belt', true);
        L.belt.tex.offset.x -= dt * 0.55 / 0.5;
        const order = S.loads.filter(l => !l.moving).sort((p, q) => q.s - p.s);
        let lim = END;
        order.forEach(l => {
          l.s = Math.min(l.s + dt * 0.55, lim);
          lim = l.s - 1.05;
          placeLoad(l);
        });
        const front = order[0];
        if (front && front.s >= END - 0.001 && skipReady()) dumpLoad(front);
      } else SND.loop('belt', false);

      // ---- magnet
      const magOn = powered('magnet');
      SND.loop('magnet', magOn);
      L.magnet.field.children.forEach((r, i) => {
        const u = ((t * 0.9 + i * 0.5) % 1);
        r.material.uniforms.uOpacity.value = magOn ? 0.7 * (1 - u) : 0;
        r.scale.setScalar(0.8 + 0.8 * u);
        r.position.y = -0.12 - 0.25 * u;
      });
      if (magOn) S.loads.forEach(l => { if (S.spam[l.id] && Math.abs(l.s - MAGNET.s) < 0.55) pullFlyers(l); });

      // ---- hoist
      const liftOn = powered('lift');
      SND.loop('lift', liftOn && (S.lift === 'up' || S.lift === 'down'));
      if (liftOn && S.lift !== 'idle' && S.lift !== 'stall') {
        cycleT += dt;
        if (S.lift === 'up') {
          S.liftU = Math.min(1, S.liftU + dt / 3.2);
          if (S.liftU >= 1) { S.lift = 'tip'; cycleT = 0; }
        } else if (S.lift === 'tip') {
          S.tip = cycleT < 0.6 ? cycleT / 0.6 : cycleT < 2.0 ? 1 : Math.max(0, 1 - (cycleT - 2.0) / 0.5);
          if (S.tip >= 1 && !tipped) { tipped = true; tipOut(); }
          if (cycleT > 2.5) { S.tip = 0; S.lift = 'down'; tipped = false; }
        } else if (S.lift === 'down') {
          S.liftU = Math.max(0, S.liftU - dt / 2.8);
          if (S.liftU <= 0) endCycle();
        }
        L.lift.sheave.rotation.x += (S.lift === 'up' ? -1 : S.lift === 'down' ? 1 : 0) * dt * 3;
      }
      const skipBottom = 0.05 + (LIFT.top - 0.05) * S.liftU;
      const sp = L.lift.skip;
      sp.position.y = skipBottom + 0.7;
      sp.rotation.z = -1.95 * S.tip;
      sway *= Math.max(0, 1 - dt * 2.5);
      const cy = cageY();
      L.lift.cage.position.y = cy;
      L.lift.cage.rotation.z = sway * Math.sin(t * 7);
      liftCam.y = skipBottom; liftCam.x = LIFT.x + 1.2; liftCam.z = 2.6;
      const [r1, r2] = L.lift.ropes;
      const rope = (m, y0, y1, z) => { m.position.set(LIFT.x, (y0 + y1) / 2, z); m.scale.y = Math.max(0.01, y1 - y0); };
      rope(r1, skipBottom + 1.04, LIFT.sheaveY, LIFT.zSkip);
      rope(r2, cy + 1.38, LIFT.sheaveY, LIFT.zCage + 0.02);
      if (S.cage) {
        const r = A[S.cage];
        if (r.support && (r.support.kind === 'cage' || r.support.kind === 'pod')) {
          r.x = LIFT.x; r.z = LIFT.zCage; r.y = cy + 0.06;
          r.root.position.set(r.x, r.y, r.z);
        } else S.cage = null;
      }

      // ---- Sonnet's laptop on the scale
      if (S.plugged && dist2(A.sonnet, PORT_SPOT[0], PORT_SPOT[1]) > 0.9) { S.plugged = false; play('click'); }
      cable.visible = S.plugged;
      screen.el.style.display = S.plugged && !S.ended ? 'block' : 'none';
      if (S.plugged) {
        const s = A.sonnet;
        const a0 = new T.Vector3(s.x - 0.42 * Math.cos(s.heading), s.y + 0.22, s.z + 0.42 * Math.sin(s.heading));
        cable.position.copy(a0).add(portPos).multiplyScalar(0.5);
        cable.scale.y = a0.distanceTo(portPos);
        cable.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), portPos.clone().sub(a0).normalize());
        s.armL = 0.3 + 0.12 * Math.sin(t * 19);
        s.armR = s.armR > 0.5 ? s.armR : 0.3 + 0.12 * Math.sin(t * 23 + 1);
        screenBlink += dt;
        const sig = JSON.stringify([S.log, S.scaleOn, S.spam, Math.floor(screenBlink * 2) % 2]);
        if (sig !== screen.sig || screen.dirty) { screen.sig = sig; screen.dirty = false; drawScreen(Math.floor(screenBlink * 2) % 2); }
        const [x, y] = world.project(new T.Vector3(s.x, s.y + s.height + 0.3, s.z));
        screen.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      }
      L.scale.portLamp.userData.set(!!S.scaleOn && Math.floor(t * 3) % 2 === 0);

      // ---- reactor: level, words, paddle, the night
      const n = S.reactor.length;
      S.level += (n - S.level) * Math.min(1, dt * 1.5);
      const lv = S.level, f = LV.LEVELS[Math.floor(lv)] + (LV.LEVELS[Math.min(5, Math.floor(lv) + 1)] - LV.LEVELS[Math.floor(lv)]) * (lv % 1);
      const yTop = -PC.r + 2 * PC.r * f;
      if (Math.abs(f - liquidLevel) > 0.002) {
        liquidLevel = f;
        L.rx.liquid.geometry.dispose();
        L.rx.liquid.geometry = liquidGeo(yTop, PC.r - 0.03);
        L.rx.surfLine.visible = f > 0.01;
        L.rx.surfLine.position.y = yTop;
        L.rx.surfLine.scale.x = 2 * Math.sqrt(Math.max(0, (PC.r - 0.05) ** 2 - yTop * yTop));
      }
      murkA += ((dawnT > 0 ? 0.3 : 0.78) - murkA) * Math.min(1, dt * 0.5);
      L.rx.liquid.material.uniforms.uOpacity.value = murkA;
      L.rx.sightFill.scale.y = Math.max(0.01, PC.y - PC.r + 2 * PC.r * f - LV.SIGHT.y0);
      L.rx.sightFill.position.y = LV.SIGHT.y0 + L.rx.sightFill.scale.y / 2;
      S.mixing = powered('mixer');
      SND.loop('mixer', S.mixing);
      const churn = S.mixing ? (S.eyes ? 0.3 : 1) : 0;
      L.rx.imp.rotation.y += dt * 2.2 * churn;
      L.rx.fly.rotation.z -= dt * 5 * churn;
      const swirl = 0.25 + 1.2 * churn;
      [...tokens, ...L.rx.scraps.children].forEach(m => {
        const u = m.userData;
        if (u.gone) return;
        u.a += dt * u.sp * swirl;
        let x = Math.cos(u.a) * u.r * 1.1, y = -0.55 + Math.sin(u.a) * u.r * 0.55 + 0.06 * Math.sin(t * 1.3 + u.ph);
        if (u.scrap) y = yTop - 0.12 + 0.05 * Math.sin(t * 2 + u.ph);
        y = Math.min(y, yTop - 0.15);
        const lim = Math.sqrt(Math.max(0, (PC.r - 0.3) ** 2 - y * y));
        x = clamp(x, -lim, lim);
        m.position.set(x + (u.k ? 0.32 : 0), y + (u.k ? 0.05 : 0), 3.05 + u.dz);
        m.visible = yTop > -PC.r + 0.25;
        if (dawnT > 0 && !u.gone) m.material.uniforms.uOpacity.value = 0.85 * (1 - 0.7 * dawnT);
      });
      if (S.mixing && n && !S.ended) {
        if (!S.trained) { S.trained = true; tick(2); circle(3); peek(6.0, 3.0, 3.6, 13.5); }
        const tgt = lossTarget();
        S.loss += (tgt - S.loss) * (1 - Math.exp(-dt * 0.2));
        S.night = Math.max(S.night, Math.min(1, (1 - S.loss) / 0.94));
        setClock();
        if (!S.dawn && !contaminated() && n >= LAY.FULL && S.loss < 0.075) dawn();
      }
      const jitter = contaminated() && S.mixing && Math.abs(S.loss - 0.5) < 0.05 ? 0.035 * Math.sin(t * 13) + 0.02 * Math.sin(t * 31) : 0;
      L.loss.userData.set(S.loss + jitter);
      R.gauges[0].userData.set(0.1 + 0.8 * Math.min(1, lv / 4));
      R.gauges[1].userData.set(S.mixing ? 0.75 + 0.03 * Math.sin(t * 17) : 0.08);
      // the skim valve's lever: along the pipe = open, across = closed
      const vl = L.rx.valve.userData.lever, vTo = S.drainOpen ? 0 : PI / 2;
      vl.rotation.z += (vTo - vl.rotation.z) * Math.min(1, dt * 9);
      drumFillShown += (drumFill - drumFillShown) * Math.min(1, dt * 1.5);
      L.rx.sludge.position.y = 0.15 + LV.DRUM.h * 0.9 * drumFillShown;

      // ---- the eyes (the pointer's speed fades once it stops moving)
      hoverV.multiplyScalar(Math.exp(-dt * 4));
      // the camera may move under a still pointer: look again at what is under it now
      if (S.eyes && ptr && world.t - hoverT < 4) { const p = pointAt(ptr); if (p) hover = p; }
      if (R.eyes[0].visible) {
        let tgt;
        if (S.stare) tgt = world.cam.position.clone();
        else if (S.eyes && hover && world.t - hoverT < 4) {
          // not where Opus is: where the pointer is going
          tgt = hover.clone().addScaledVector(hoverV, 0.45);
          tgt.x = clamp(tgt.x, 0.5, 15.5); tgt.z = clamp(tgt.z, 0.5, 9.5); tgt.y = clamp(tgt.y, 0, 6);
        } else tgt = new T.Vector3(A.opus.x, A.opus.y + 0.5, A.opus.z);
        S.eyeTarget = [tgt.x, tgt.y, tgt.z];
        const c = new T.Vector3(PC.x, PC.y, PC.z);
        const d = tgt.clone().sub(c);
        if (S.stare) eyeTo.set(0, 0.15);
        else eyeTo.set(clamp(d.x / 6, -1, 1), clamp((d.y - 1.0) / 3 - Math.max(0, d.z) / 14, -1, 1));
        eyeLook.lerp(eyeTo, Math.min(1, dt * 9));
        R.eyes.forEach((e, i) => {
          e.position.set(eyeBase[i].x + eyeLook.x * 0.42 * (S.stare ? 0 : 1), eyeBase[i].y + eyeLook.y * 0.3, eyeBase[i].z);
          e.scale.y = Math.max(0.05, eyeOpen) * (S.stare ? 1.15 : 1);
          eyeGlows[i].position.set(e.position.x, e.position.y, e.position.z + 0.06);
          eyeGlows[i].material.opacity = eyeOpen * (S.stare ? 1 : 0.9);
        });
        faceA += ((S.eyes ? 0.24 : 0.1) - faceA) * Math.min(1, dt * 0.8);
        R.face.material.uniforms.uOpacity.value = faceA;
      }
      if (S.eyes && !S.ended && Math.random() < dt * 0.5) SND.play('heart');
    };
    let drumFillShown = 0;

    // the liquid behind the glass: the disc of the porthole below the surface
    function liquidGeo(yTop, r) {
      if (yTop <= -r + 0.01) return new T.BufferGeometry();
      const s = new T.Shape();
      if (yTop >= r) { s.absarc(0, 0, r, 0, PI * 2, false); return new T.ShapeGeometry(s, 40); }
      const phi = Math.asin(yTop / r);
      const a0 = PI - phi, a1 = 2 * PI + phi;
      s.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
      for (let i = 1; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; s.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      s.closePath();
      return new T.ShapeGeometry(s);
    }

    // ---------------------------------------------------- start and stills
    function frame() {
      world.rig.target.set(4.2, 1.5, 4.6);
      world.rig.zoom = world.rig.zoomT = 10.5;
      world.rig.az = world.rig.azT = 35;
      world.rig.followY = 1.6;
    }
    // instant setters for posed stills
    const place = (id, x, z) => { pallets[id].bx.setAt(x, z); palletMoved(id); };
    function loadNow(ids, opt) {
      opt = opt || {};
      ids.forEach(id => {
        retire(id);
        S.fed.push(id);
        S.log.push({ id, w: LAY.PALLETS[id].w });
        if (opt.clean !== false && id === 'b') { S.spam.b = false; pallets.b.bundle.userData.flyers.visible = false; }
        pallets[id].mesh.visible = false;
        addToReactor(id);
      });
      S.level = S.reactor.length;
    }
    const game = {
      S, A, L,
      probe: {
        // ends the chapter at once, for tools/playtest-flow.mjs (the chapter itself is played in playtest-ch1.mjs)
        finish: () => { if (!S.done) { S.done = true; api.finish(); } },
        pallet: id => (S.fed.includes(id) ? null : [pallets[id].mesh.position.x, pallets[id].mesh.position.z]),
        // which pallet (or what kind of thing) the pointer would hit at a screen point
        pickId: (sx, sy) => { const h = world.pick([sx, sy]); if (!h) return null; for (const id in pallets) if (pallets[id].pinfo === h.info) return id; return h.info.kind; },
        loads: () => S.loads.map(l => [l.id, +l.s.toFixed(2)]),
        eyes: () => ({ target: S.eyeTarget, look: [eyeLook.x, eyeLook.y] }),
        lift: () => ({ state: S.lift, u: S.liftU, cage: S.cage, skip: S.skip.slice() }),
        reactor: () => ({ items: S.reactor.map(r => r.id + (r.spam ? '*' : '')), contaminated: contaminated(), loss: S.loss, night: S.night }),
      },
      begin() {
        frame();
        // open on the only light in the room, then pull back
        world.rig.target.set(LV.DESK[0], 1.0, LV.DESK[1]);
        world.rig.zoom = 5.5;
        world.select(A.opus);
        world.rig.follow = A.opus;
        hud.show();
      },
      async look(name) {
        frame();
        hud.show();
        world.select(A.opus);
        world.rig.follow = null;
        const plug = () => { A.sonnet.place(PORT_SPOT[0], PORT_SPOT[1], 0, PI / 2); S.plugged = true; screen.dirty = true; };
        if (name === 'room') {
          place('b', 2, 2);
          place('a', 2, 1);
          S.log.push({ id: 'c', w: 57 }); S.fed.push('c'); retire('c');
          S.loads.push({ id: 'c', s: 1.6 }); placeLoad(S.loads[0]);
          S.sw.belt = true; S.sw.magnet = true;
          plug();
          A.opus.place(2.0, 3.05, 0, PI);
          world.rig.target.set(4.3, 1.3, 3.9);
          world.rig.zoom = world.rig.zoomT = 9.5;
        } else if (name === 'panel') {
          S.sw.belt = true; S.sw.magnet = true;
          A.opus.place(1.1, 2.9, 0, -PI / 2);
          A.sonnet.place(2.4, 7.4, 0, PI);
          world.rig.target.set(0.3, 1.05, 10 - (LV.PANEL.lx0 + LV.PANEL.lx1) / 2);
          world.rig.zoom = world.rig.zoomT = 3.6;
          world.rig.az = world.rig.azT = 62;
        } else if (name === 'dark') {
          S.sw.mixer = true;
          S.tripped = true; S.trips = 1;
          A.opus.place(1.05, 10 - L.panel.switches.mixer.lx, 0, -PI / 2);
          A.sonnet.place(2.4, 5.0, 0, -1.2);
          world.rig.target.set(5.5, 2.2, 4.6);
          world.rig.zoom = world.rig.zoomT = 13;
          CL.Ink.shared.dark.value = 0.84; CL.Ink.shared.night.value = 0.75;
          world.select(A.sonnet);
          world.bubble(A.sonnet, 'q', 30);
        } else if (name === 'lift') {
          loadNow(['c']);
          ['a', 'b'].forEach(id => { retire(id); S.fed.push(id); S.log.push({ id, w: LAY.PALLETS[id].w }); pallets[id].mesh.visible = true; });
          S.spam.b = false; pallets.b.bundle.userData.flyers.visible = false;
          ['a', 'b'].forEach((id, i) => { const b = pallets[id].bundle; L.lift.skipBody.attach(b); b.position.set(SLOTS[i][0], 0.08, SLOTS[i][1]); b.scale.setScalar(0.58); pallets[id].mesh.visible = false; S.skip.push(id); });
          A.opus.place(LIFT.x, LIFT.zCage, LIFT.cageRest + 0.06, 0);
          A.opus.support = { kind: 'cage' }; S.cage = 'opus';
          S.sw.lift = true; S.sw.magnet = true; S.sw.lamp = true;
          startCycle();
          A.sonnet.place(1.05, 10 - L.panel.switches.lift.lx, 0, -PI / 2);
          world.select(A.sonnet);
          await world.wait(2.4);
          world.rig.follow = null;
          world.rig.target.set(6.4, 5.6, 3.2);
          world.rig.zoom = world.rig.zoomT = 13.5;
          await world.wait(0.6);
          world.paused = true;
          return;
        } else if (name === 'night' || name === 'spam') {
          loadNow(name === 'spam' ? ['a', 'b', 'c', 'd'] : ['a', 'b', 'c'], { clean: name !== 'spam' });
          S.sw.lamp = false; S.sw.mixer = true;
          S.loss = name === 'spam' ? 0.5 : 0.42; S.night = name === 'spam' ? 0.53 : 0.62; setClock();
          S.trained = true; tick(0); tick(2); circle(3);
          A.opus.place(8.6, 5.6, 0, PI);
          A.sonnet.place(1.05, 10 - L.panel.switches.mixer.lx, 0, -PI / 2);
          if (name === 'spam') { world.rig.target.set(9.6, 3.0, 4.2); world.rig.zoom = world.rig.zoomT = 8.5; }
          else { world.rig.target.set(6.4, 3.2, 3.8); world.rig.zoom = world.rig.zoomT = 11.5; }
          CL.Ink.shared.dark.value = 0.5; CL.Ink.shared.night.value = 0.6;
          await world.wait(1.5);
          world.paused = true;
          return;
        } else if (name === 'eyes') {
          loadNow(['a', 'b', 'c']);
          S.sw.lamp = false; S.sw.mixer = true;
          S.loss = 0.08; S.night = 0.97; setClock();
          S.trained = true; tick(0); tick(1); tick(2); circle(3);
          A.opus.place(9.6, 6.0, 0, PI);
          A.sonnet.place(5.0, 6.6, 0, PI * 0.8);
          dawn(true);
          await world.wait(0.2);
          hover = new T.Vector3(13.5, 0, 6.5); hoverT = world.t; hoverV.set(0, 0, 0);
          world.rig.follow = null;
          world.rig.target.set(10.5, 2.6, 5.0);
          world.rig.zoom = world.rig.zoomT = 11;
          await world.wait(1.0);
          world.paused = true;
          return;
        }
        await world.wait(0.8);
      },
    };
    return game;
  }

  CL.Chapters.define('ch1', { build: CL.Ch1Level.build, setup });
})(window.CL = window.CL || {});
