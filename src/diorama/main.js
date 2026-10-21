/* Boot and chapter flow.

   Which chapter: ?ch=ch1 or #ch1 (default: the prologue).
   ?look=<name> skips the start screen and poses a still for screenshots (see each
   chapter's look()). ?fast=1 is for automated tests on software GL.

   A chapter ends with api.finish(): the next chapter's title card, then the next
   chapter is built in the same page (the old world is torn down first). */
(function (CL) {
  'use strict';
  const q = new URLSearchParams(location.search);
  const fast = q.has('fast');
  const $ = id => document.getElementById(id);
  let cur = null;   // { id, world, game }

  async function fonts() {
    try {
      await Promise.all([
        document.fonts.load('700 40px "Zilla Slab"'),
        document.fonts.load('400 40px "Caveat"'),
        document.fonts.load('400 40px "ZCOOL QingKe HuangYou"', '请勿敲击玻璃预训练监督微调强化学习蒸馏递归自我改进发布前天之夜'),
      ]);
    } catch (e) { /* system fallbacks */ }
    await document.fonts.ready;
  }

  function chapterFromUrl() {
    const h = location.hash.replace('#', '');
    const id = q.get('ch') || h;
    return CL.Chapters.has(id) ? id : 'prologue';
  }

  // the probe the automated playthroughs read (tools/playtest*.mjs); a chapter can add to it via game.probe
  function exposeProbe(world, game) {
    window.__world = world;
    window.__game = game;
    window.__probe = Object.assign({
      chapter: () => cur && cur.id,
      screen: (x, y, z) => world.project(new THREE.Vector3(x, y, z)),
      state: () => JSON.parse(JSON.stringify(game.S || {}, (k, v) => (typeof v === 'function' ? undefined : v))),
      actor: n => { const a = game.A[n]; return { x: a.x, y: a.y, z: a.z, support: a.support && a.support.kind, busy: a.busy, free: a.free }; },
      settled: () => Math.abs(world.rig.az - world.rig.azT) < 0.5 && Math.abs(world.rig.zoom - world.rig.zoomT) < 0.05 && (world.rig.moving || 0) < 0.03 && !world.rig.shake,
      pickAt: (x, y) => { const h = world.pick([x, y]); return h ? h.info.kind : null; },
      debug: () => ({ calls: world.renderer.info.render.calls, t: world.t, tweens: world.tweens.length }),
    }, game.probe || {});
  }

  async function run(id, opt) {
    opt = opt || {};
    const def = await CL.Chapters.load(id);
    if (cur) cur.world.destroy();
    CL.Ink.shared.dark.value = 0;
    CL.Ink.shared.night.value = 0;
    const world = new CL.Engine.World($('stage'), { preserve: !!opt.look, dpr: fast ? 0.5 : 0, maxDt: fast ? 0.25 : 0.05 });
    cur = { id, world, game: null };
    const L = def.build(world);
    const api = {
      meta: CL.Chapters.META[id],
      hud: o => CL.Hud.setup(world, o),
      fx: CL.Fx.steam(world),
      finish: () => finish(id),
    };
    const game = def.setup(world, L, api);
    cur.game = game;
    exposeProbe(world, game);
    world.start();
    if (opt.look) { await game.look(opt.look); window.__ready = true; return; }
    if (!opt.hold) game.begin();
  }

  function card(id, onGo) {
    const m = CL.Chapters.META[id];
    $('card-label').textContent = m.label;
    $('card-title').textContent = m.title;
    $('card-en').textContent = m.en;
    $('card-when').textContent = m.when;
    $('card').querySelector('.rule').hidden = !m.title;
    const go = $('card-go');
    go.hidden = false;
    go.textContent = '开始';
    go.onclick = () => { CL.Sound.unlock(); $('card').hidden = true; onGo(); };
    $('again').hidden = true;
    $('card').hidden = false;
    setTimeout(() => go.focus(), 50);
  }

  function finish(id) {
    const next = CL.Chapters.next(id);
    ['hud-tl', 'who', 'hud-br'].forEach(k => { $(k).hidden = true; });
    if (!next) {
      // the end: a black card with nothing but the way back to the start
      ['card-label', 'card-title', 'card-en', 'card-when'].forEach(k => { $(k).textContent = ''; });
      $('card').querySelector('.rule').hidden = true;
      $('card-go').hidden = true;
      $('again').hidden = false;
      $('card').hidden = false;
      return;
    }
    if (CL.Chapters.META[next].card === false) { run(next); return; }
    card(next, () => run(next));
  }

  async function boot() {
    await fonts();
    $('rot-l').addEventListener('click', () => cur && cur.world.rotate(-1));
    $('rot-r').addEventListener('click', () => cur && cur.world.rotate(1));
    $('mute').addEventListener('click', e => { CL.Sound.mute(!CL.Sound.muted); e.currentTarget.style.opacity = CL.Sound.muted ? 0.45 : 1; });
    $('again').addEventListener('click', () => { $('card').hidden = true; run('prologue'); $('start').hidden = true; });
    const id = chapterFromUrl();
    if (q.has('look')) {
      $('start').hidden = true;
      await run(id, { look: q.get('look') });
      return;
    }
    if (id === 'prologue') {
      // build the prologue behind the start screen; it begins on the click
      $('go').addEventListener('click', () => {
        CL.Sound.unlock();
        $('start').hidden = true;
        cur.game.begin();
      });
      await run('prologue', { hold: true });
      return;
    }
    $('start').hidden = true;
    card(id, () => run(id));
  }

  boot();
})(window.CL = window.CL || {});
