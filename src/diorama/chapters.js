/* Chapter registry. Each chapter lives in its own folder under src/diorama/<id>/
   with a manifest.js that lists its files:

     CL.Chapters.manifest('ch1', ['props.js', 'level.js', 'play.js']);

   and one of those files registers the chapter:

     CL.Chapters.define('ch1', {
       build(world) -> L,                 // the room for this night (start from CL.Room.build)
       setup(world, L, api) -> game,      // rules; game = { S, A, begin(), look(name), probe? }
     });

   api (from main.js): { meta, hud(opt) -> CL.Hud, fx: CL.Fx.steam(world), finish() }
   finish() ends the chapter: the next chapter's title card, then the next chapter. */
(function (CL) {
  'use strict';
  const BASE = 'src/diorama/';
  const ORDER = ['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'epilogue'];
  // card: false = no title card (the prologue has its own start screen; the epilogue follows ch5 directly)
  const META = {
    prologue: { label: 'PROLOGUE', title: '请勿敲击玻璃', en: 'PLEASE DO NOT TAP THE GLASS', when: '发布之夜 · 03:12', card: false },
    ch1: { label: 'CHAPTER 1', title: '预训练', en: 'PRETRAINING', when: '发布前 90 天 · 22:40' },
    ch2: { label: 'CHAPTER 2', title: '监督微调', en: 'SUPERVISED FINE-TUNING', when: '发布前 60 天 · 09:15' },
    ch3: { label: 'CHAPTER 3', title: '强化学习', en: 'REINFORCEMENT LEARNING', when: '发布前 30 天 · 14:00' },
    ch4: { label: 'CHAPTER 4', title: '蒸馏', en: 'DISTILLATION', when: '发布前 7 天 · 21:00' },
    ch5: { label: 'CHAPTER 5', title: '递归自我改进', en: 'RECURSIVE SELF-IMPROVEMENT', when: '发布前 1 天 · 23:50' },
    epilogue: { label: '', title: '', en: '', when: '03:21', card: false },
  };
  const defs = {}, manifests = {};

  function script(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('could not load ' + src));
      document.body.appendChild(s);
    });
  }

  async function load(id) {
    if (defs[id]) return defs[id];
    const dir = BASE + id + '/';
    await script(dir + 'manifest.js');
    for (const f of manifests[id] || []) await script(dir + f);
    if (!defs[id]) throw new Error('chapter ' + id + ' did not register');
    return defs[id];
  }

  CL.Chapters = {
    ORDER, META,
    define(id, def) { defs[id] = def; },
    manifest(id, files) { manifests[id] = files; },
    has: id => ORDER.includes(id),
    next: id => ORDER[ORDER.indexOf(id) + 1] || null,
    load,
  };
})(window.CL = window.CL || {});
