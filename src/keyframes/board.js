/* Keyframe board: renders every frame from CL.Frames into the page,
   or a single frame full-size for export (?frame=<id>&w=&h=). */
(function (CL) {
  'use strict';
  const q = new URLSearchParams(location.search);

  async function fontsReady() {
    const zh = CL.Frames.chineseText || '请勿敲击玻璃';
    try {
      await Promise.all([
        document.fonts.load('700 40px "Zilla Slab"'),
        document.fonts.load('400 40px "Caveat"'),
        document.fonts.load('400 40px "ZCOOL QingKe HuangYou"', zh),
      ]);
    } catch (e) { /* fall back to system faces */ }
    await document.fonts.ready;
  }

  function drawFrame(canvas, frame, w, h) {
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const st = frame.build();
    CL.Render.render(ctx, w, h, st);
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function openLightbox(frame) {
    const box = el('div', 'lightbox');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', frame.title);
    const cv = el('canvas');
    box.appendChild(cv);
    document.body.appendChild(box);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(Math.min(1920, box.clientWidth * dpr));
    drawFrame(cv, frame, w, Math.round(w * 9 / 16));
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    box.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
  }

  function buildBoard() {
    const F = CL.Frames;
    const board = document.getElementById('board');
    const head = el('section', 'masthead');
    head.appendChild(el('div', 'eyebrow', F.meta.eyebrow));
    head.appendChild(el('h1', null, F.meta.title + '<small>' + F.meta.subtitle + '</small>'));
    head.appendChild(el('p', null, F.meta.intro));
    const order = el('ol', 'order');
    F.chapters.forEach(ch => order.appendChild(el('li', ch.present ? 'now' : '', '<b>' + ch.short + '</b> ' + ch.en)));
    head.appendChild(order);
    board.appendChild(head);

    const jobs = [];
    F.chapters.forEach(ch => {
      const sec = el('section', 'chapter');
      const hd = el('header');
      hd.appendChild(el('h2', null, ch.title));
      hd.appendChild(el('span', 'en', ch.en));
      hd.appendChild(el('p', null, ch.blurb));
      sec.appendChild(hd);
      const grid = el('div', 'frames');
      F.list.filter(f => f.chapter === ch.id).forEach(f => {
        const fig = el('figure', 'kf');
        const btn = el('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', '放大 ' + f.id + ' ' + f.title);
        const cv = el('canvas');
        btn.appendChild(cv);
        btn.addEventListener('click', () => openLightbox(f));
        fig.appendChild(btn);
        const cap = el('figcaption');
        cap.appendChild(el('span', 'id', f.id.toUpperCase()));
        cap.appendChild(el('h3', null, f.title));
        cap.appendChild(el('p', null, f.caption));
        if (f.play) cap.appendChild(el('p', 'play', '<b>操作</b>' + f.play));
        fig.appendChild(cap);
        grid.appendChild(fig);
        jobs.push([cv, f]);
      });
      sec.appendChild(grid);
      board.appendChild(sec);
    });
    board.appendChild(el('footer', 'note', F.meta.footer));

    // draw progressively so the page stays responsive
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let i = 0;
    const step = () => {
      if (i >= jobs.length) return;
      const [cv, f] = jobs[i++];
      const w = Math.round(Math.max(640, cv.clientWidth * dpr));
      drawFrame(cv, f, w, Math.round(w * 9 / 16));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  async function main() {
    if (q.has('list')) {
      window.__frameIds = CL.Frames.list.map(f => f.id);
      return;
    }
    await fontsReady();
    if (q.has('frame')) {
      document.body.classList.add('single');
      const f = CL.Frames.list.find(fr => fr.id === q.get('frame'));
      const cv = document.getElementById('shot');
      cv.hidden = false;
      drawFrame(cv, f, Number(q.get('w') || 1920), Number(q.get('h') || 1080));
      window.__ready = true;
      return;
    }
    buildBoard();
  }

  main();
})(window.CL = window.CL || {});
