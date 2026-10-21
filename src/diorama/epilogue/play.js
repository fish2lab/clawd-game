/* Epilogue rules: 03:21, the second after the breakout.

   1. H · I. Fable sits in the murk. It growls at the two big Clawds; it lets Haiku
      come close. Clicking Fable with Haiku knocks on it once. A pause closes a group
      of knocks, two groups make a letter (row, then column: the chart on the
      reactor's flank, or scratched on the back of the fallen sign). Every knock
      leaves a chalk mark on the floor, so what was knocked can be read. H · I is
      2, 3 · 2, 4. Anything else: Fable tilts its head and the chalk is wiped. Fable
      answers H · I the same way, in amber.
   2. CAN YOU eat me? Haiku asks. The lights go, the eyes come close, CHOMP, black.
      The clock runs on to dawn in the dark. When the lights come back, Fable lies
      low with Haiku on its back: eating was lifting.
   3. The biggest one. A crank hangs from the roof hatch at 6.1: nobody reaches it,
      not even the three stacked on the floor. Lying low, Fable's back is a floor the
      Clawds can hop onto (1.76 high). When someone on its back reaches for the
      crank, Fable stands up (4.0) to help. Only Fable, Opus, Sonnet, Haiku, in that
      order, reaches 6.1. Bigger on smaller fails as always.
      Fable is not under the crank: it lay down where it was. It follows Haiku: when
      Haiku stands still on the floor away from it, Fable crab-walks over and scoops
      Haiku onto its back, lying down right there. Taking Haiku to the crank brings
      Fable under it.
   4. The hatch opens, dawn comes in. The three sit on Fable's head and it floats
      out through the roof like a whale.
   5. FABLE 5.5. Is it finally time? It's time. CAN YOU eat me again? */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const E = CL.Epi;
  const LV = E.Level;
  const PI = Math.PI;
  const play = n => CL.Sound.play(n);
  const sfx = n => E.Sound.play(n);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = CL.Engine.ease;
  const query = new URLSearchParams(location.search);
  // tools/playtest-flow.mjs reaches this chapter from chapter 5 with ?fast=1 and clicks the
  // porthole, expecting the final card: in that test mode a click on Fable or the porthole ends it.
  const SMOKE = query.has('fast') && query.get('ch') !== 'epilogue' && !query.has('look');

  const PAUSE = 1.5;           // silence that closes a group of knocks (s)
  const LONG = 4.0;            // a single letter left this long is the whole message
  const HOP = 1.8;             // the highest hop (moves.js)
  const FW = 2.4, FD = 0.62 * 4.8 / 2, RING = 0.25;   // Fable's half width / depth, and the gap kept round it

  function setup(world, L, api) {
    E.Art.style();
    const R = L.reactor;
    const G = world.grid;
    const H = L.hatch;
    const S = {
      phase: 'hi',                  // hi -> answer -> dark -> stack -> dawn -> end
      group: 0, groups: [], letters: '', queue: 0, knocking: false, judging: false, lastKnock: 0,
      reply: [], heard: false, signBack: false,
      fable: { x: LV.P0.x, z: LV.P0.z },
      lead: null, leadT: 0, followed: 0, rises: 0,
      hatchOpen: false, ended: false,
      wrong: 0, growls: 0, heavy: 0, ups: 0,      // how often each wrong route was taken (for the playtest)
      main: true, pressure: { opus: 0, sonnet: 1, haiku: 0 },
    };
    const A = {
      opus: world.addActor('opus'),
      sonnet: world.addActor('sonnet'),
      haiku: world.addActor('haiku'),
    };
    // where the collapsed stack landed in the prologue, pushed clear of Fable
    A.opus.place(14.6, 6.5, 0, -0.5);
    A.sonnet.place(6.6, 6.7, 0, 0.9);
    A.haiku.place(8.3, 8.25, 0, 0.7);

    const fab = E.Fable.create(world);
    fab.x = LV.P0.x; fab.z = LV.P0.z;
    const M = CL.Moves.setup(world, A);
    const { perched } = M;

    const hud = api.hud({ todo: ['Exit pod', 'Wake Sonnet 5.5', 'Wake Haiku 5.5', 'Check on Fable 5.5', 'Show Fable 5.5 the sky'], actors: A });
    const li = i => document.querySelector(`#todo li[data-i="${i}"]`);
    [0, 1, 2].forEach(i => li(i) && li(i).classList.add('done'));
    hud.circle(3);
    if (li(4)) li(4).style.display = 'none';
    const { puff, burst } = api.fx;

    // lights on, alarm off, as at the end of the short
    Object.values(L.pods).forEach(pd => pd.lamp.userData.set(1));
    L.reactorLamps.forEach(l => l.userData.set(1));
    const lamps = [...L.reactorLamps, L.pods.haiku.lamp, L.pods.sonnet.lamp, L.pods.opus.lamp];
    const post = world.pipe.post.uniforms;
    const sky = E.Art.sky();

    // ---------------------------------------------------- small helpers
    const tw = (dur, fn, easing) => new Promise(res => world.tween(dur, fn, res, easing));
    const wait = s => world.wait(s);
    function bubble(a, kind, dur) {
      const cv = E.Art.icon(kind, 64);
      world.bubble(a, cv ? 'blank' : kind, dur);
      if (cv) { const b = world.bubbles[world.bubbles.length - 1]; b.el.replaceChildren(cv); }
    }
    function say(a, text, dur) {
      world.bubble(a, 'blank', dur || 2.6);
      const b = world.bubbles[world.bubbles.length - 1];
      b.el.classList.add('say');
      b.el.textContent = text;
    }
    function ring(x, y, z, r, flat) {
      const m = K.mesh(new T.TorusGeometry(r || 0.2, 0.016, 6, 32), CL.Ink.ink(P.PAPER, { flat: true, lit: true, transparent: true }), x, y, z);
      if (flat) m.rotation.x = -PI / 2;
      m.layers.set(1);
      world.scene.add(m);
      world.tween(0.5, u => { m.scale.setScalar(1 + 3 * u); m.material.uniforms.uOpacity.value = 1 - u; }, () => { world.scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
    }
    const bottom = a => { let b = a; while (b.support && b.support.kind === 'actor') b = b.support.actor; return b; };
    const stackOf = a => { const out = []; for (let r = a; r; r = r.carrying) out.push(r); return out; };

    // ---------------------------------------------------- Fable's footprint on the walk grid
    // Sitting up, Fable is a wall. Lying low, its back is a floor at fab.top, ringed by
    // blocked cells so nobody walks off the edge or into its sides; hops cross the ring.
    const base = { block: G.block.slice(), h: G.h.slice() };
    const deck = { on: false, x: 0, z: 0, hw: FW - 0.3, hd: FD - 0.3, y: 0 };
    function applyGrid() {
      G.block.set(base.block);
      G.h.set(base.h);
      if (fab.out) return;
      G.fill(fab.x - FW - RING, fab.z - FD - RING, fab.x + FW + RING, fab.z + FD + RING, k => { G.block[k] = 1; });
      if (deck.on) G.fill(deck.x - deck.hw, deck.z - deck.hd, deck.x + deck.hw, deck.z + deck.hd, k => { G.block[k] = base.block[k]; G.h[k] = deck.y; });
    }
    function setDeck(on) {
      deck.on = on;
      deck.x = fab.x; deck.z = fab.z; deck.y = fab.top;
      S.fable = { x: +fab.x.toFixed(2), z: +fab.z.toFixed(2), lying: on };
      applyGrid();
    }
    const inDeck = (x, z) => deck.on && Math.abs(x - deck.x) <= deck.hw + 0.13 && Math.abs(z - deck.z) <= deck.hd + 0.13;
    const onDeck = a => !a.support && inDeck(a.x, a.z) && a.y > deck.y - 0.3;
    const levelOf = a => (onDeck(bottom(a)) ? 'deck' : 'floor');
    const deckBases = () => Object.values(A).filter(a => onDeck(a));
    applyGrid();

    // the nearest floor cell (not on Fable's back, not on the plinth) to (x, z)
    function floorSpot(x, z) {
      const [i0, j0] = G.cellOf(x, z);
      for (let r = 0; r < 28; r++) {
        let best = null, bd = 1e9;
        for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) {
          if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r || G.blocked(i, j) || G.h[G.idx(i, j)] > 0.3) continue;
          const [cx, cz] = G.centre(i, j);
          const d = Math.hypot(cx - x, cz - z);
          if (d < bd) { bd = d; best = [cx, cz]; }
        }
        if (best) return best;
      }
      return [x, z];
    }
    // the four ways across Fable's edge near (px, pz): [point on its back, point on the floor]
    function sides(px, pz) {
      const cx = clamp(px, deck.x - deck.hw + 0.2, deck.x + deck.hw - 0.2);
      const cz = clamp(pz, deck.z - deck.hd + 0.2, deck.z + deck.hd - 0.2);
      const ox = FW + RING + 0.35, oz = FD + RING + 0.35;
      return [
        [[deck.x - deck.hw + 0.2, cz], [fab.x - ox, cz]],
        [[deck.x + deck.hw - 0.2, cz], [fab.x + ox, cz]],
        [[cx, deck.z - deck.hd + 0.2], [cx, fab.z - oz]],
        [[cx, deck.z + deck.hd - 0.2], [cx, fab.z + oz]],
      ].map(([e, l]) => {
        const f = floorSpot(l[0], l[1]);
        return { e, l: f, ok: Math.hypot(f[0] - l[0], f[1] - l[1]) < 0.6 };
      }).filter(s => s.ok);
    }
    const best = (list, cost) => list.reduce((b, s) => (!b || cost(s) < cost(b) ? s : b), null);

    // ---------------------------------------------------- moving about, on the floor and on Fable
    async function walk(a, my, x, z) {
      if (Math.hypot(a.x - x, a.z - z) < 0.12) return true;
      a.busy = 'walk';
      const ok = await a.walkTo(x, z);
      if (a.cmd !== my) return false;
      a.busy = true;
      if (!ok) world.bubble(a, 'q');
      return ok;
    }
    // inside a claimed command: get a to (x, z), hopping on or off Fable's back on the way
    async function travel(a, my, x, z) {
      a.busy = true;
      if (perched(a)) {
        if (a.carrying) { world.bubble(a, 'stack'); return false; }
        await M.dismount(a, x, z);
        if (a.cmd !== my) return false;
      }
      const want = inDeck(x, z) ? 'deck' : 'floor';
      const at = onDeck(a) ? 'deck' : 'floor';
      if (at === 'deck' && want === 'floor') {
        const s = best(sides(x, z), c => Math.hypot(a.x - c.e[0], a.z - c.e[1]) + Math.hypot(c.l[0] - x, c.l[1] - z));
        if (!s || !(await walk(a, my, s.e[0], s.e[1]))) return false;
        a.busy = true;
        await a.hopTo(s.l[0], s.l[1], 0, 0.45);
        play('step');
        if (a.cmd !== my) return false;
      } else if (at === 'floor' && want === 'deck') {
        const s = best(sides(x, z), c => Math.hypot(a.x - c.l[0], a.z - c.l[1]) + 1.5 * Math.hypot(c.e[0] - x, c.e[1] - z));
        if (!s || !(await walk(a, my, s.l[0], s.l[1]))) return false;
        a.busy = true;
        a.faceTo(s.e[0], s.e[1]);
        if (deck.y - a.y > HOP) { world.bubble(a, 'up'); return false; }
        await a.hopTo(s.e[0], s.e[1], deck.y, 0.5);
        play('step');
        if (a.cmd !== my) return false;
      }
      return walk(a, my, x, z);
    }
    async function go(a, x, z) {
      if (!a || !a.free) return;
      const my = world.claim(a, () => go(a, x, z));
      if (my === null) return;
      try { await travel(a, my, x, z); } finally { world.release(a, my); }
    }
    // walk to spot(a) -> [x, z, heading] (or stay put if spot is null), then use(a)
    async function act(a, spot, use, done) {
      if (!a || !a.free) return;
      const my = world.claim(a, () => act(a, spot, use, done));
      if (my === null) return;
      try {
        if (spot) {
          const [sx, sz, h] = spot(a);
          if (!(await travel(a, my, sx, sz))) return;
          if (h !== undefined) a.face(h);
        }
        a.busy = true;
        await use(a);
      } finally { world.release(a, my); if (done) done(); }
    }
    // climbing someone who stands on Fable's back means hopping onto the back first
    async function climb(a, b) {
      if (a.spec.W >= b.spec.W) S.heavy++;
      if (a.spec.W < b.spec.W && !(b.carrying && b.carrying !== a) && !a.carrying && levelOf(a) !== levelOf(b)) {
        const my = world.claim(a, () => climb(a, b));
        if (my === null) return;
        let ok = false;
        try {
          const lo = bottom(b);
          const d = Math.hypot(a.x - lo.x, a.z - lo.z) || 1;
          const r = lo.spec.W * 0.5 + 0.5;
          let tx = lo.x + (a.x - lo.x) / d * r, tz = lo.z + (a.z - lo.z) / d * r;
          if (levelOf(b) === 'deck') { tx = clamp(tx, deck.x - deck.hw + 0.2, deck.x + deck.hw - 0.2); tz = clamp(tz, deck.z - deck.hd + 0.2, deck.z + deck.hd - 0.2); }
          else [tx, tz] = floorSpot(tx, tz);
          ok = await travel(a, my, tx, tz);
        } finally { world.release(a, my); }
        if (!ok) return;
      }
      M.climbOnto(a, b);
    }

    // ---------------------------------------------------- picks: walking, the Clawds, Fable
    const floorClick = (hit, a) => { if (a && hit) go(a, hit.point.x, hit.point.z); };
    world.addPick([L.floor, L.pool, L.tally.meshH, L.tally.meshF], { kind: 'floor', onClick: floorClick });
    R.root.traverse(o => {
      if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.height === 0.52) {
        world.addPick(o, { kind: 'floor', onClick: (hit, a) => { if (a) go(a, hit.point.x, Math.max(hit.point.z, 4.0)); } });
      }
    });
    Object.values(A).forEach(a => world.addPick(a.root, {
      kind: 'actor', noGlow: true,
      onClick: (hit, act2) => {
        if (act2 && act2 !== a && act2.free && hit.normal.y > 0.6) climb(act2, a);
        else world.select(a);
      },
    }));
    world.addPick(fab.root, {
      kind: 'fable',
      onClick: (hit, a) => {
        if (SMOKE) { finishNow(); return; }
        if (!a) return;
        if (S.phase === 'hi') { if (a === A.haiku) knockClick(a); else growlAt(a); return; }
        if (S.phase !== 'stack' || S.fableBusy) return;
        if (!deck.on) { act(a, () => { const [x, z] = floorSpot(a.x, a.z); return [x, z]; }, async a2 => world.bubble(a2, 'up')); return; }
        const top = hit.normal.y > 0.6;
        const x = clamp(hit.point.x, deck.x - deck.hw + 0.25, deck.x + deck.hw - 0.25);
        const z = clamp(top ? hit.point.z : hit.point.z - Math.sign(hit.normal.z) * 0.6, deck.z - deck.hd + 0.25, deck.z + deck.hd - 0.25);
        go(a, x, z);
      },
    });

    // ---------------------------------------------------- 1. H · I
    const knockSpot = () => [fab.x - 0.5, fab.z + FD + RING + 0.38, PI];
    // The first click takes Haiku to Fable's feet; once there, every click is one knock.
    // Clicks during a knock queue up, so fast clicking is never lost.
    function knockClick(a) {
      if (S.judging) return;
      const [kx, kz, kh] = knockSpot();
      if (S.knocking) { S.queue++; return; }
      if (Math.hypot(a.x - kx, a.z - kz) > 0.3 || perched(a) || a.path) {
        act(a, knockSpot, async a2 => { a2.face(kh); });
        return;
      }
      if (a.busy) return;
      S.queue = 1;
      act(a, null, async a2 => {
        S.knocking = true;
        try {
          while (S.queue > 0 && S.phase === 'hi' && !S.judging) { S.queue--; await knock(a2); }
        } finally { S.knocking = false; S.queue = 0; S.lastKnock = world.t; }
      });
    }
    async function knock(a) {
      a.face(PI);
      const z0 = a.z;
      a.armR = 1.4;
      await tw(0.1, u => { a.z = z0 - 0.16 * u; });
      play('tap');
      ring(a.x - 0.1, 0.42, fab.z + FD + 0.03, 0.14);
      S.group++;
      S.lastKnock = world.t;
      sfx('chalk');
      drawTally();
      fab.look = [clamp((a.x - fab.x) / 3, -1, 1), -0.8];
      await tw(0.14, u => { a.z = z0 - 0.16 * (1 - u); });
      a.armR = 0;
      await wait(0.05);
    }
    function drawTally() {
      L.tally.haiku.draw(S.groups, S.group, 'h');
      L.tally.fable.draw(S.reply, 0, 'f');
    }
    // a pause closes the group; two groups make a letter; two letters are a message
    function closeGroup() {
      S.groups.push(S.group);
      S.group = 0;
      drawTally();
      const n = S.groups.length;
      if (S.groups[n - 1] > 5) { judge(); return; }
      if (n % 2 === 0) {
        const [r, c] = S.groups.slice(-2);
        S.letters += E.Art.GRID[r - 1][c - 1];
        // it heard a letter: it blinks and hums
        fab.blinkT = 0; sfx('mm');
        if (S.letters.length >= 2) judge();
      }
    }
    async function judge() {
      if (S.letters === 'HI') { answer(); return; }
      S.judging = true;
      S.wrong++;
      await wait(0.4);
      sfx('hm');
      bubble(fab, 'q', 1.8);
      await tw(0.4, u => { fab.roll = 9 * Math.sin(u * PI / 2); });
      await wait(0.9);
      // the chalk is wiped and Haiku tries again
      sfx('chalk');
      S.groups = []; S.group = 0; S.letters = '';
      drawTally();
      await tw(0.4, u => { fab.roll = 9 * (1 - u); });
      bubble(A.haiku, 'wave', 1.6);
      S.judging = false;
    }
    // the others get too close: it growls, and Haiku wants to try
    function growlAt(a) {
      act(a, () => { const [x, z] = floorSpot(fab.x + (a.x > fab.x ? 1.6 : -1.6), fab.z + FD + RING + 0.9); return [x, z, PI]; }, async a2 => {
        S.growls++;
        sfx('growl');
        fab.wide = 1;
        fab.look = [clamp((a2.x - fab.x) / 3, -1, 1), -0.6];
        world.rig.shake = 0.07;
        await tw(0.25, u => { fab.pitch = 0.1 * u; fab.glow = 0.85 + 0.6 * u; });
        world.bubble(a2, 'bang');
        const [bx, bz] = floorSpot(a2.x, a2.z + 0.9);
        await a2.hopTo(bx, bz, 0, 0.35);
        await tw(0.5, u => { fab.pitch = 0.1 * (1 - u); fab.glow = 1.45 - 0.6 * u; });
        fab.wide = 0;
        await wait(0.3);
        bubble(A.haiku, 'tap', 1.6);
      });
    }
    // Fable answers H · I with its own knocks on the floor
    async function answer() {
      S.phase = 'answer';
      S.heard = true;
      world.locked = true;
      world.rig.follow = null;
      await wait(0.5);
      fab.wide = 1;
      await tw(0.5, u => { fab.look = [0, -0.4 + 0.5 * u]; fab.glow = 0.85 + 0.5 * u; });
      fab.wide = 0;
      await wait(0.4);
      const pat = [2, 3, 2, 4];
      for (let g = 0; g < pat.length; g++) {
        for (let i = 0; i < pat[g]; i++) {
          await tw(0.18, u => { fab.armR = 1.5 * u; });
          await tw(0.08, u => { fab.armR = 1.5 - 1.7 * u; });
          sfx('knock');
          world.rig.shake = 0.06;
          ring(fab.x + FW + 0.45, 0.03, fab.z + 0.8, 0.3, true);
          Object.values(A).forEach(a => { if (!perched(a)) { a.sq = 0.88; world.tween(0.2, u => { a.sq = 0.88 + 0.12 * u; }); } });
          S.reply[g] = i + 1;
          L.tally.fable.draw(S.reply.slice(0, g), i + 1, 'f');
          sfx('chalk');
          await tw(0.2, u => { fab.armR = -0.2 * (1 - u); });
        }
        L.tally.fable.draw(S.reply, 0, 'f');
        await wait(g === 1 ? 0.9 : 0.6);
      }
      hud.tick(3);
      play('chime');
      await wait(0.4);
      bubble(A.haiku, 'heart', 1.4);
      await wait(1.2);
      dark();
    }

    // ---------------------------------------------------- 2. CAN YOU eat me?
    async function dark() {
      S.phase = 'dark';
      world.locked = true;
      world.rig.follow = null;
      const h = A.haiku;
      h.face(PI);
      const t0 = world.rig.target.clone();
      const mid = new T.Vector3((h.x + fab.x) / 2, 2.0, (h.z + fab.z + FD) / 2);
      tw(1.2, u => { world.rig.target.lerpVectors(t0, mid, ease(u)); world.rig.zoomT = 9; });
      await wait(1.0);
      say(h, 'CAN YOU eat me?', 2.8);
      await wait(2.6);
      // it goes very still, then the lights go
      fab.breathe = 0;
      fab.wide = 1;
      fab.look = [clamp((h.x - fab.x) / 3, -1, 1), -1];
      for (let i = 0; i < lamps.length; i++) {
        play('lamp');
        lamps[i].userData.set(0);
        const d0 = CL.Ink.shared.dark.value;
        world.tween(0.12, u => { CL.Ink.shared.dark.value = d0 + (0.9 * (i + 1) / lamps.length - d0) * u; CL.Ink.shared.night.value = 0.9 * (i + 1) / lamps.length * u; });
        await wait(0.18);
      }
      sfx('growl');
      await wait(0.8);
      // the eyes come down to Haiku
      const t1 = world.rig.target.clone();
      const eyes = new T.Vector3(fab.x, 2.6, fab.z + FD);
      for (let i = 0; i < 3; i++) {
        sfx('heart');
        await tw(0.75, u => {
          fab.pitch = 0.12 * (i + u);
          fab.glow = 1 + 0.25 * (i + u);
          world.rig.target.lerpVectors(t1, eyes, (i + u) / 3);
          world.rig.zoomT = 9 - 1.4 * (i + u);
        });
      }
      await tw(0.18, u => { fab.pitch = 0.36 + 0.3 * u; world.rig.zoomT = 4.4 - 1.6 * u; });
      sfx('chomp');
      world.rig.shake = 0.35;
      post.uFade.value = 1;
      // in the black, the night runs on to dawn
      await wait(1.6);
      for (let i = 0; i < 7; i++) {
        sfx('tick');
        L.clock.set(3 + (5 + 47 / 60 - 3 - 21 / 60) * (i + 1) / 7, (21 + (26 + 60 * 2) * (i + 1) / 7) % 60);
        await wait(0.32);
      }
      L.clock.set(5, 47);
      // when it lightens, Fable is lying low, and Haiku is on its back
      fab.pitch = 0; fab.wide = 0; fab.glow = 0.7; fab.breathe = 1;
      fab.c = 1;
      setDeck(true);
      h.place(fab.x - 0.9, fab.z + 0.2, deck.y, 0.3);
      h.support = null;
      Object.values(A).forEach(a => { if (a !== h && !onDeck(a)) nudge(a, fab.x - FW - RING, fab.x + FW + RING, fab.z - FD - RING, fab.z + FD + RING, true); });
      dawnLevel(0.18);
      CL.Ink.shared.night.value = 0.55;
      frame('stack');
      // a wide shot: Fable, the yellow crank, the hatch it is looking at
      world.rig.target.set(7.6, 4.6, 6.6);
      world.rig.zoom = world.rig.zoomT = 15.5;
      await tw(1.6, u => { post.uFade.value = 1 - u; });
      bubble(h, 'heart', 1.6);
      for (let i = lamps.length - 1; i >= 0; i--) {
        await wait(0.3);
        play('lamp');
        lamps[i].userData.set(1);
        const d0 = CL.Ink.shared.dark.value, n0 = CL.Ink.shared.night.value;
        world.tween(0.3, u => { CL.Ink.shared.dark.value = d0 * (1 - u * 0.35); CL.Ink.shared.night.value = n0 + (0.25 - n0) * u * 0.4; });
      }
      world.tween(0.6, u => { CL.Ink.shared.dark.value *= 1 - u; });
      await wait(0.4);
      fab.look = [clamp((LV.SKY.x - fab.x) / 5, -1, 1), 1];
      bubble(fab, 'sun', 2.0);
      if (li(4)) li(4).style.display = '';
      hud.circle(4);
      play('click');
      S.phase = 'stack';
      S.lead = [h.x, h.z];
      world.locked = false;
      world.select(h);
      // hold the wide shot until the player does something, then follow again
      world.rig.follow = null;
      S.holdShot = true;
    }
    world.on('click', () => { if (S.holdShot) { S.holdShot = false; world.rig.follow = world.active; } });

    // ---------------------------------------------------- 3. Fable follows Haiku
    // hop a Clawd (with whoever rides it) out of the box x0..x1, z0..z1
    function nudge(a, x0, x1, z0, z1, instant) {
      if (!(a.x > x0 - 0.4 && a.x < x1 + 0.4 && a.z > z0 - 0.4 && a.z < z1 + 0.4)) return;
      const c = [[x0 - 0.5, a.z], [x1 + 0.5, a.z], [a.x, z0 - 0.5], [a.x, z1 + 0.5]]
        .map(([x, z]) => floorSpot(x, z))
        .filter(([x, z]) => !(x > x0 - 0.3 && x < x1 + 0.3 && z > z0 - 0.3 && z < z1 + 0.3));
      const to = best(c, ([x, z]) => Math.hypot(x - a.x, z - a.z));
      if (!to) return;
      a.stop();
      if (instant) { a.place(to[0], to[1], 0); return; }
      world.bubble(a, 'bang', 1.2);
      a.hopTo(to[0], to[1], 0, 0.45);
    }
    async function follow(tx, tz) {
      const h = A.haiku;
      S.fableBusy = true;
      world.locked = true;
      S.followed++;
      const [x0, x1, z0, z1] = LV.REGION;
      const cx = clamp(tx, x0, x1), cz = clamp(tz, z0, z1);
      const eat = Math.abs(tx - cx) < FW - 0.6 && Math.abs(tz - cz) < FD - 0.4;
      const riders = deckBases();
      const off = riders.map(r => [r.x - fab.x, r.z - fab.z]);
      riders.forEach(r => r.stop());
      const ride = () => riders.forEach((r, i) => { r.x = fab.x + off[i][0]; r.z = fab.z + off[i][1]; r.y = fab.y + fab.top; });
      // up
      fab.look = [clamp((tx - fab.x) / 4, -1, 1), -0.3];
      sfx('rumble');
      await tw(0.6, u => { fab.c = 1 - u; ride(); }, ease);
      deck.on = false;
      fab.out = true; applyGrid(); fab.out = false;
      // whoever is in the way hops aside
      const bx0 = Math.min(fab.x, cx) - FW - RING, bx1 = Math.max(fab.x, cx) + FW + RING;
      const bz0 = Math.min(fab.z, cz) - FD - RING, bz1 = Math.max(fab.z, cz) + FD + RING;
      Object.values(A).forEach(a => { if (!riders.includes(a) && !perched(a) && (a !== h || !eat)) nudge(a, bx0, bx1, bz0, bz1); });
      await wait(0.3);
      // sideways, like a crab
      const sx = fab.x, sz = fab.z, dist = Math.hypot(cx - sx, cz - sz), dur = Math.max(0.5, dist / 2.4);
      const dx = (cx - sx) / (dist || 1), dz = (cz - sz) / (dist || 1);
      const ext = Math.abs(dx) * FW + Math.abs(dz) * FD;
      let scooped = !eat, landing = null;
      const w0 = fab.walk;
      await tw(dur, u => {
        fab.x = sx + (cx - sx) * u;
        fab.z = sz + (cz - sz) * u;
        fab.walk = w0 + u * dist * 2.2;
        fab.amp = Math.min(1, u * 8, (1 - u) * 8);
        ride();
        if (!scooped && dist * (1 - u) <= ext + 0.45) {
          scooped = true;
          landing = scoop(h, dur * (1 - u), cx, cz, riders, off);
        }
      });
      fab.amp = 0;
      if (landing) await landing;
      await wait(eat ? 0.2 : 0.05);
      // and down again, with Haiku on its back
      const hOn = eat && !perched(h) && h.y > 1;
      await tw(0.7, u => { fab.c = u; ride(); if (hOn) h.y = fab.top; }, ease);
      setDeck(true);
      riders.forEach(r => { r.y = deck.y; });
      if (eat && !perched(h)) { h.y = deck.y; h.support = null; }
      fab.look = [clamp((LV.SKY.x - fab.x) / 5, -1, 1), 1];
      S.lead = [h.x, h.z];
      S.fableBusy = false;
      world.locked = false;
    }
    // Haiku is tossed up and lands on Fable's back (or on top of a stack already there)
    async function scoop(h, dur, cx, cz, riders, off) {
      play('whoosh');
      fab.armL = 1.2;
      world.tween(0.4, u => { fab.armL = 1.2 * (1 - u); });
      let onto = null;
      riders.forEach((r, i) => {
        const fx = cx + off[i][0], fz = cz + off[i][1];
        if (Math.hypot(fx - h.x, fz - h.z) < 0.75) onto = stackOf(r).pop();
      });
      if (onto && onto.spec.W > h.spec.W) {
        const top = onto;
        await h.hopTo(cx + (top.x - fab.x), cz + (top.z - fab.z), fab.top + (top.topY - fab.y - fab.top), Math.max(0.5, dur));
        h.support = { kind: 'actor', actor: top };
        top.carrying = h;
      } else {
        await h.hopTo(h.x, h.z, fab.top, Math.max(0.5, dur));
        h.support = null;
      }
      play('step');
      bubble(h, 'heart', 1.4);
    }

    // ---------------------------------------------------- the crank, and Fable standing up to help
    async function rise(up) {
      const riders = deckBases();
      riders.forEach(r => r.stop());
      const c0 = fab.c, c1 = up ? 0 : 1;
      sfx('rumble');
      await tw(0.9, u => {
        fab.c = c0 + (c1 - c0) * u;
        riders.forEach(r => { r.y = fab.top; });
      }, ease);
      deck.y = fab.top;
    }
    async function crankUse(a) {
      const lo = bottom(a);
      if (Math.hypot(lo.x - LV.CRANK.x, lo.z - LV.CRANK.z) > 0.95) { world.bubble(a, 'q'); return; }
      if (levelOf(a) === 'deck' && fab.c > 0.5) {
        S.rises++;
        world.locked = true;
        a.armR = 1.5;
        await rise(true);
        a.armR = 1.5;
        await wait(0.2);
        if (a.reachY < LV.CRANK.y - 0.06) {
          S.ups++;
          world.bubble(a, 'up');
          await wait(1.0);
          a.armR = 0;
          await rise(false);
          setDeck(true);
          world.locked = false;
          return;
        }
      } else if (a.reachY < LV.CRANK.y - 0.06) { S.ups++; a.armR = 1.5; world.bubble(a, 'up'); await wait(0.6); a.armR = 0; return; }
      await M.turnWheel(a, H.crank, 3, 'z');
      openHatch(a);
    }
    world.addPick([H.crank, H.rod], {
      kind: 'wheel',
      onClick: (hit, a) => {
        if (SMOKE) { finishNow(); return; }
        if (!a || !(S.phase === 'hi' || S.phase === 'stack') || S.fableBusy) return;
        if (perched(a)) act(a, null, crankUse);
        else act(a, () => [LV.CRANK.x, LV.CRANK.z], crankUse);
      },
    });
    world.addPick([H.leaf, H.gear], { kind: 'hatch', onClick: (hit, a) => a && bubble(a, S.phase === 'stack' ? 'sun' : 'up', 1.4) });

    // ---------------------------------------------------- 4. dawn
    // k: 0 night .. 1 full dawn (the panes, the light through the hatch, the sky round the diorama)
    function dawnLevel(k) {
      H.paneMat.uniforms.uColor.value.set(k > 0 ? P.DAWN_LO : P.GLASS_DEEP);
      H.paneMat.uniforms.uEmissive.value.copy(new T.Color(P.DAWN_HI).multiplyScalar(0.35 * Math.min(1, k * 4)));
      H.paneMat.uniforms.uOpacity.value = 0.3 + 0.35 * Math.min(1, k * 4);
      sky.draw(k);
      world.scene.background = k > 0 ? sky.tex : new T.Color(P.NIGHT);
    }
    async function openHatch(a) {
      S.phase = 'dawn';
      S.hatchOpen = true;
      world.locked = true;
      world.rig.follow = null;
      hud.tick(4);
      a.armR = 0;
      sfx('latch');
      const dz0 = H.dogs.map(d => d.position.z);
      await tw(0.35, u => H.dogs.forEach((d, i) => { d.position.z = dz0[i] - 0.25 * u; }));
      play('creak');
      sfx('wind');
      const t0 = world.rig.target.clone();
      const t1 = new T.Vector3(LV.SKY.x + 0.5, 5.2, LV.SKY.z + 1.2);
      await tw(1.8, u => {
        H.leaf.rotation.x = -1.95 * u;
        world.rig.target.lerpVectors(t0, t1, u);
        world.rig.zoomT = 15.5;
      }, ease);
      play('clunk');
      sfx('chord');
      await tw(2.2, u => {
        dawnLevel(0.18 + 0.82 * u);
        H.shaft.material.opacity = 0.3 * u;
        H.patch.material.opacity = 0.32 * u;
        CL.Ink.shared.night.value = 0.25 * (1 - u);
        post.uTint.value.set(P.DAWN_LO);
        post.uTintA.value = 0.1 * u;
      });
      await float();
    }
    async function float() {
      // the three come off the stack and sit in a row on its head
      fab.happy = true;
      fab.look = [0, 0];
      const top = fab.top;
      const seats = { opus: [-1.4, -0.1], sonnet: [1.4, -0.1], haiku: [0, 0.6] };
      [A.haiku, A.sonnet, A.opus].forEach(a => {
        if (a.support && a.support.kind === 'actor') a.support.actor.carrying = null;
        a.carrying = null;
      });
      const all = Object.entries(seats).map(([n, [ox, oz]]) => {
        const a = A[n];
        const [x, z] = [fab.x + ox, fab.z + oz];
        const p = levelOf(a) === 'deck' || perched(a) ? a.hopTo(x, z, top, 0.5) : Promise.resolve(a.place(x, z, top));
        return p.then(() => { a.support = { kind: 'fable' }; a.face(0); });
      });
      await Promise.all(all);
      play('step');
      Object.values(A).forEach(a => world.bubble(a, 'heart', 1.4));
      const off = Object.values(A).map(a => [a, a.x - fab.x, a.z - fab.z]);
      const ride = () => off.forEach(([a, ox, oz]) => { a.x = fab.x + ox; a.z = fab.z + oz; a.y = fab.y + fab.top; });
      await wait(0.6);
      // back under the opening
      const sx = fab.x, sz = fab.z, w0 = fab.walk;
      const d = Math.hypot(LV.SKY.x - sx, LV.SKY.z - sz);
      if (d > 0.05) {
        await tw(Math.max(0.6, d / 2), u => {
          fab.x = sx + (LV.SKY.x - sx) * u; fab.z = sz + (LV.SKY.z - sz) * u;
          fab.walk = w0 + u * d * 2.2; fab.amp = Math.min(1, u * 8, (1 - u) * 8);
          ride();
        });
        fab.amp = 0;
      }
      fab.out = true;
      applyGrid();
      // and up, like a whale
      sfx('whale');
      const c0 = world.rig.target.clone();
      const w1 = fab.walk;
      await tw(7.5, u => {
        const e = ease(u);
        fab.y = 14 * e;
        fab.pitch = 0.05 * Math.sin(u * PI * 3);
        fab.armL = fab.armR = 0.7 + 0.5 * Math.sin(u * PI * 7);
        fab.walk = w1 + u * 6; fab.amp = 0.35 * Math.sin(u * PI);
        ride();
        world.rig.target.set(c0.x, c0.y + 10.5 * e, c0.z);
        world.rig.zoomT = 15.5 + 6 * e;
        if (u > 0.55 && !S.lastHeart) { S.lastHeart = true; bubble(A.haiku, 'sun', 1.8); }
      });
      await wait(1.2);
      await tw(1.4, u => { post.uFade.value = u; });
      credits();
    }

    // ---------------------------------------------------- 5. the end
    async function credits() {
      S.phase = 'end';
      hud.show(false);
      const c = E.Art.credits();
      S.creditsEl = true;
      await wait(0.2);
      c.show();
      await wait(3.2);
      play('pop');
      c.last();
      await wait(2.6);
      finishNow();
    }
    function finishNow() {
      if (S.ended) return;
      S.ended = true;
      api.finish();
    }

    // ---------------------------------------------------- the rest of the room
    world.addPick(L.chart, {
      kind: 'chart',
      onClick: (hit, a) => act(a, () => [15.1, 4.75], async a2 => { a2.faceTo(14.5, 1.25); world.bubble(a2, 'eye'); world.rig.zoomT = Math.min(world.rig.zoomT, 7.5); }),
    });
    world.addPick(L.sign.root, {
      kind: 'sign',
      onClick: (hit, a) => act(a, () => [LV.SIGN.x, LV.SIGN.z + 1.6, PI], async a2 => {
        await M.operate(a2, 0.3);
        play('clunk');
        S.signBack = !S.signBack;
        const r0 = L.sign.flip.rotation.y, r1 = S.signBack ? PI : 0;
        await tw(0.45, u => { L.sign.flip.rotation.y = r0 + (r1 - r0) * u; L.sign.root.position.y = 0.28 + 0.25 * Math.sin(u * PI); });
        world.bubble(a2, S.signBack ? 'eye' : 'bang');
        world.rig.zoomT = Math.min(world.rig.zoomT, 8);
      }),
    });
    world.addPick(L.clock.root, { kind: 'clock', onClick: (hit, a) => a && world.bubble(a, 'zz') });
    world.addPick(L.exit, { kind: 'exit', onClick: (hit, a) => act(a, () => [15.2, 6.6, PI / 2], async a2 => { play('dull'); world.bubble(a2, 'lock'); }) });
    world.addPick(L.locker, { kind: 'locker', onClick: (hit, a) => act(a, () => [1.25, 7.2, -PI / 2], async a2 => { play('dull'); world.bubble(a2, 'lock'); }) });
    world.addPick(L.crate, { kind: 'crate', onClick: (hit, a) => act(a, () => [2.4, 6.0, -PI / 2], async a2 => { play('dull'); world.bubble(a2, 'heavy'); }) });
    world.addPick(L.clutter, { kind: 'clutter', onClick: (hit, a) => a && world.bubble(a, 'heavy') });
    // the empty pods: back to sleep? not now
    Object.entries(L.pods).forEach(([n, pd]) => world.addPick([pd.door, pd.root], {
      kind: 'pod', onClick: (hit, a) => act(a, () => [pd.x, pd.z + 1.25 * pd.k + 0.35, PI], async a2 => { world.bubble(a2, 'zz'); }),
    }));
    // the porthole, empty now
    world.addPick([R.ring], { kind: 'porthole', onClick: (hit, a) => { if (SMOKE) { finishNow(); return; } if (a) world.bubble(a, 'eye'); } });
    // the cavity behind it and the murk at its back
    R.root.children.forEach(o => {
      const g = o.geometry, pr = g && g.parameters;
      const cavity = g && g.type === 'CylinderGeometry' && pr.radiusTop === 2.0;
      const back = g && g.type === 'PlaneGeometry' && pr.width === 4.0 && pr.height === 4.0 && o !== R.face;
      if (cavity || back) world.addPick(o, { kind: 'porthole', onClick: (hit, a) => { if (SMOKE) { finishNow(); return; } if (a) world.bubble(a, 'eye'); } });
    });
    R.gauges.forEach(g => world.addPick(g, { kind: 'gauge', onClick: (hit, a) => a && world.bubble(a, 'eye') }));
    world.addPick(L.bolts, { kind: 'bolt', onClick: (hit, a) => a && world.bubble(a, 'eye') });
    // the steam station still works, though nothing needs it tonight
    Object.values(L.valves).forEach(v => {
      world.addPick([v.lever, v.body], {
        kind: 'valve',
        onClick: (hit, a) => act(a, () => [1.5, v.z, -PI / 2], async a2 => {
          if (a2.reachY < v.y - 0.02) { world.bubble(a2, 'up'); return; }
          v.open = !v.open;
          await M.operate(a2, 0.45);
          play('clunk');
          if (S.main && v.open) play('hiss');
        }),
      });
      world.addPick(v.gauge, { kind: 'gauge', onClick: (hit, a) => a && world.bubble(a, 'eye') });
    });
    world.addPick(L.main.mesh, {
      kind: 'valve',
      onClick: (hit, a) => act(a, () => [1.45, LV0().MAIN.z + 0.4, -1.9], async a2 => {
        S.main = !S.main;
        await M.operate(a2, 0.9);
        play(S.main ? 'hiss' : 'clunk');
      }),
    });
    function LV0() { return CL.Level0; }

    // ---------------------------------------------------- per frame
    let breathT = 2, sunT = 6;
    world.onUpdate = (dt, t) => {
      // steam: the prologue's split, quietly
      const open = Object.values(L.valves).filter(v => v.open);
      const per = S.main && open.length ? 1 / open.length : 0;
      S.pressure = { sonnet: L.valves.A.open ? per : 0, opus: L.valves.B.open ? per : 0, haiku: L.valves.C.open ? per : 0 };
      Object.values(L.valves).forEach(v => {
        const to = v.open ? 0 : PI / 2;
        v.lever.rotation.x += (to - v.lever.rotation.x) * Math.min(1, dt * 9);
        v.gauge.userData.set(0.05 + 0.9 * S.pressure[v.pod]);
      });
      ['opus', 'sonnet', 'haiku'].forEach(n => {
        L.pods[n].gauge.userData.set(0.08 + 0.9 * S.pressure[n]);
        const pd = L.pods[n];
        if (S.pressure[n] > 0.01 && Math.random() < dt * 6 * S.pressure[n]) puff(pd.x + (Math.random() - 0.5) * 0.5 * pd.k, (0.9 + Math.random() * 0.8) * pd.k, pd.z + 0.8 * pd.k, (Math.random() - 0.5) * 0.3, 0.4, 0.5, 0.08 * pd.k + 0.04, 1.0);
      });
      const st = L.main.stem, sTo = S.main ? 0.5 : 0.06;
      const ds = (sTo - st.scale.y) * Math.min(1, dt * 2.2);
      st.scale.y += ds;
      L.main.mesh.rotation.z += ds * 14;

      // knocks: a pause closes the group, a lone letter left hanging is the whole message
      if (S.phase === 'hi' && !S.knocking && !S.judging) {
        if (S.group > 0 && world.t - S.lastKnock > PAUSE) closeGroup();
        else if (S.group === 0 && S.letters.length === 1 && S.groups.length === 2 && world.t - S.lastKnock > LONG) judge();
        else if (S.group === 0 && S.groups.length % 2 === 1 && world.t - S.lastKnock > LONG + PAUSE) judge();
      }
      // Fable breathes, and watches
      if (S.phase === 'hi' || S.phase === 'stack') {
        breathT -= dt;
        if (breathT < 0) { breathT = 4 + Math.random() * 2; if (S.phase === 'hi') sfx('breath'); }
        if (S.phase === 'hi' && !S.knocking && !S.judging) {
          const w = world.active || A.haiku;
          const lx = clamp((w.x - fab.x) / 4, -1, 1), ly = clamp((w.y - 2.6) / 3, -1, 0.6);
          fab.look[0] += (lx - fab.look[0]) * Math.min(1, dt * 3);
          fab.look[1] += (ly - fab.look[1]) * Math.min(1, dt * 3);
        }
      }
      // after the dark: it keeps looking up at the hatch, and follows Haiku
      if (S.phase === 'stack' && !S.fableBusy) {
        sunT -= dt;
        if (sunT < 0) { sunT = 11 + Math.random() * 4; bubble(fab, 'sun', 1.8); }
        const h = A.haiku;
        const still = !h.support && h.y < 0.3 && !h.busy && !h.path;
        const far = still && (Math.abs(h.x - fab.x) > FW + RING + 1.0 || Math.abs(h.z - fab.z) > FD + RING + 1.0);
        const moved = !S.lead || Math.hypot(h.x - S.lead[0], h.z - S.lead[1]) > 0.8;
        if (far && moved && !world.locked) {
          S.leadT += dt;
          fab.look[0] += (clamp((h.x - fab.x) / 4, -1, 1) - fab.look[0]) * Math.min(1, dt * 4);
          if (S.leadT > 0.6) { S.leadT = 0; S.lead = [h.x, h.z]; follow(h.x, h.z); }
        } else S.leadT = 0;
      }
      H.mark.position.y = (inDeck(LV.CRANK.x, LV.CRANK.z) ? deck.y : 0) + 0.013;
      H.mark.visible = S.phase === 'hi' || S.phase === 'stack';
      S.fable = { x: +fab.x.toFixed(2), z: +fab.z.toFixed(2), lying: deck.on };
    };

    // ---------------------------------------------------- framing and the start
    function frame(kind) {
      const r = world.rig;
      r.zoomMin = 4.5;
      r.zoomMax = 22;
      r.bounds = kind === 'stack' ? [3.5, 12.0, 4.0, 8.0] : [3.5, 12.5, 3.0, 8.0];
      r.followY = kind === 'stack' ? 3.4 : 1.6;
    }

    const game = {
      S, A, L,
      probe: {
        fable: () => ({ x: fab.x, z: fab.z, y: fab.y, c: fab.c, top: fab.top, busy: !!S.fableBusy }),
        deck: () => ({ on: deck.on, x: deck.x, z: deck.z, y: deck.y }),
        finish: () => finishNow(),
        knockSpot: () => knockSpot(),
      },
      begin() {
        frame('hi');
        world.rig.az = world.rig.azT = 35;
        world.rig.target.set(fab.x, 2.8, fab.z + 1.0);
        world.rig.zoom = 7.5;
        world.rig.zoomT = 12.5;
        // the three are where they fell; they pick themselves up
        const tilts = { opus: -80, sonnet: 85, haiku: -70 };
        Object.entries(tilts).forEach(([n, d], i) => {
          const a = A[n];
          a.extraTilt = d;
          setTimeout(() => {
            world.tween(0.45, u => { a.extraTilt = d * (1 - u); }, () => { a.extraTilt = 0; world.bubble(a, 'bang', 1.2); });
          }, 500 + i * 350);
        });
        fab.look = [-0.5, -0.6];
        sfx('growl');
        world.select(A.haiku);
        world.rig.follow = null;
        setTimeout(() => { if (!world.dead && S.phase === 'hi') { world.rig.follow = world.active; bubble(A.haiku, 'wave', 1.8); } }, 2400);
        hud.show();
      },
      async look(name) { await look(name); },
    };

    // posed stills for screenshots (node tools/shoot3d.mjs out epilogue/<name>)
    async function look(name) {
      frame('hi');
      hud.show();
      world.rig.follow = null;
      world.rig.az = world.rig.azT = 35;
      const r = world.rig;
      const setT = (x, y, z, zoom) => { r.target.set(x, y, z); r.zoom = r.zoomT = zoom; };
      if (name === 'room') {
        world.select(A.haiku);
        fab.look = [-0.4, -0.5];
        setT(9.2, 2.6, 5.8, 15);
      } else if (name === 'knock') {
        const [kx, kz] = knockSpot();
        A.haiku.place(kx, kz, 0, PI);
        A.haiku.armR = 1.4;
        S.groups = [2, 3, 2]; S.group = 3; S.letters = 'H';
        drawTally();
        fab.look = [0.3, -0.9];
        world.select(A.haiku);
        setT(fab.x + 0.2, 2.0, fab.z + 2.2, 8.5);
        ring(kx - 0.1, 0.42, fab.z + FD + 0.03, 0.2);
      } else if (name === 'answer') {
        const [kx, kz] = knockSpot();
        A.haiku.place(kx, kz, 0, PI);
        S.groups = [2, 3, 2, 4]; S.reply = [2, 3, 2, 3];
        drawTally();
        L.tally.fable.draw([2, 3, 2], 3, 'f');
        fab.armR = 1.4; fab.wide = 1; fab.look = [0.2, -0.3];
        hud.tick(3);
        world.select(A.haiku);
        setT(fab.x - 0.4, 2.2, fab.z + 2.0, 10);
      } else if (name === 'ask') {
        const [kx, kz] = knockSpot();
        A.haiku.place(kx, kz, 0, PI - 0.5);
        S.groups = [2, 3, 2, 4]; S.reply = [2, 3, 2, 4];
        drawTally();
        hud.tick(3);
        fab.wide = 1; fab.breathe = 0; fab.look = [-0.1, -1]; fab.pitch = 0.08; fab.glow = 1.2;
        world.select(A.haiku);
        setT(fab.x - 0.3, 2.0, fab.z + 2.4, 7.5);
        say(A.haiku, 'CAN YOU eat me?', 99);
      } else if (name === 'dark') {
        const [kx, kz] = knockSpot();
        A.haiku.place(kx, kz, 0, PI);
        lamps.forEach(l => l.userData.set(0));
        CL.Ink.shared.dark.value = 0.9; CL.Ink.shared.night.value = 0.9;
        fab.pitch = 0.42; fab.wide = 1; fab.glow = 1.7; fab.look = [0.3, -1];
        world.select(A.haiku);
        setT(fab.x + 0.6, 2.4, fab.z + 2.0, 6.5);
      } else if (name === 'hatch' || name === 'lead' || name === 'stack' || name === 'dawn' || name === 'float') {
        hud.tick(3);
        if (li(4)) li(4).style.display = '';
        hud.circle(4);
        L.clock.set(5, 47);
        S.groups = [2, 3, 2, 4]; S.reply = [2, 3, 2, 4];
        drawTally();
        CL.Ink.shared.night.value = 0.25;
        dawnLevel(0.18);
        fab.c = 1;
        if (name === 'hatch') {
          setDeck(true);
          world.select(A.haiku);
          A.haiku.place(fab.x - 0.9, fab.z + 0.2, deck.y, 0.3);
          fab.look = [-1, 1];
          setT(5.6, 6.6, 6.4, 9);
        } else if (name === 'lead') {
          setDeck(true);
          A.haiku.place(LV.CRANK.x, LV.CRANK.z, 0, 0.4);
          A.haiku.armR = 1.5;
          A.opus.place(9.0, 8.8, 0, -0.8);
          A.sonnet.place(3.0, 4.6, 0, 0.6);
          fab.look = [-1, 0.2];
          world.select(A.haiku);
          setT(7.4, 3.6, 6.6, 15.5);
          bubble(A.haiku, 'up', 9);
        } else {
          fab.x = LV.CRANK.x; fab.z = LV.CRANK.z;
          setDeck(true);
          const up = name !== 'stack';
          if (up) { fab.c = 0; deck.y = fab.top; }
          A.opus.place(fab.x, fab.z, fab.top, 0.3);
          A.sonnet.place(fab.x, fab.z, fab.top + A.opus.height, 0.3);
          A.sonnet.support = { kind: 'actor', actor: A.opus }; A.opus.carrying = A.sonnet;
          A.haiku.place(fab.x, fab.z, fab.top + A.opus.height + A.sonnet.height, 0.3);
          A.haiku.support = { kind: 'actor', actor: A.sonnet }; A.sonnet.carrying = A.haiku;
          A.haiku.armR = 1.5;
          world.select(A.haiku);
          fab.look = [0, 1];
          if (name === 'stack') setT(6.4, 3.4, 7.2, 12);
          else {
            hud.tick(4);
            H.leaf.rotation.x = -1.95;
            H.dogs.forEach(d => { d.position.z -= 0.25; });
            dawnLevel(1);
            H.shaft.material.opacity = 0.3;
            H.patch.material.opacity = 0.32;
            CL.Ink.shared.night.value = 0;
            post.uTint.value.set(P.DAWN_LO); post.uTintA.value = 0.1;
            fab.happy = true;
            fab.look = [0, 0];
            if (name === 'dawn') setT(6.0, 5.0, 7.0, 14);
            else {
              A.opus.support = A.sonnet.support = A.haiku.support = { kind: 'fable' };
              A.opus.carrying = A.sonnet.carrying = null;
              fab.x = LV.SKY.x; fab.z = LV.SKY.z; fab.y = 9.5;
              fab.out = true; applyGrid();
              const seat = (a, ox, oz) => a.place(fab.x + ox, fab.z + oz, fab.y + fab.top, 0);
              seat(A.opus, -1.4, -0.1); seat(A.sonnet, 1.4, -0.1); seat(A.haiku, 0, 0.6);
              A.haiku.armR = 0; A.opus.armR = 1.2; A.sonnet.armL = 1.2;
              fab.armL = fab.armR = 0.9; fab.amp = 0.3;
              setT(LV.SKY.x + 1.0, 11.0, LV.SKY.z + 1.0, 19);
            }
          }
        }
      } else if (name === 'end') {
        post.uFade.value = 1;
        hud.show(false);
        const c = E.Art.credits();
        c.show(); c.last();
        await new Promise(res => setTimeout(res, 1800));
      }
      world.rig.follow = null;
      hud.refresh();
      await wait(0.8);
    }

    return game;
  }

  CL.Chapters.define('epilogue', { build: CL.Epi.Level.build, setup });
})(window.CL = window.CL || {});
