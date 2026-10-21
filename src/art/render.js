/* Frame compositor: world pass, lighting, emissive pass and film finish.
   Port of clawdlab/render.py.

   A frame state looks like:
   { t, cam: Cam, shake: [sx, sy], cam_rot, night, lamps: {id: 0..1}, lamp_sway,
     pods: {opus: {...}}, reactor: {...}, chars: [CS], bursts: [Burst],
     back: [fn(g)], front: [fn(g)], top: [fn(g)], lights: [{x, y, r, a}],
     emissive: [fn(g)], overlay: [fn(ctx, w, h)], alarm, flash, fade, black } */
(function (CL) {
  'use strict';
  const P = CL.P;
  const X = CL.gfx;
  const L = CL.Lab;
  const { rect, circle, ellipse } = X;

  const grainCache = {};
  function paperImage(w, h) {
    const key = w + 'x' + h;
    if (grainCache[key]) return grainCache[key];
    const hw = Math.ceil(w / 2), hh = Math.ceil(h / 2);
    const r = X.rng(3);
    // soft blotches: coarse noise, bilinear upsampled
    const bw = Math.ceil(hw / 32) + 2, bh = Math.ceil(hh / 32) + 2;
    const lo = new Float32Array(bw * bh);
    for (let i = 0; i < lo.length; i++) lo[i] = r();
    const cv = document.createElement('canvas');
    cv.width = hw; cv.height = hh;
    const cx = cv.getContext('2d');
    const img = cx.createImageData(hw, hh);
    for (let y = 0; y < hh; y++) {
      const fy = y / 32, y0 = Math.floor(fy), ty = fy - y0;
      for (let x = 0; x < hw; x++) {
        const fx = x / 32, x0 = Math.floor(fx), tx = fx - x0;
        const a = lo[y0 * bw + x0], b = lo[y0 * bw + x0 + 1], c = lo[(y0 + 1) * bw + x0], d = lo[(y0 + 1) * bw + x0 + 1];
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const blot = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
        const gn = (r() + r() + r() - 1.5) * 2;   // ~normal
        const v = Math.max(0, Math.min(1, 1 - 0.022 * Math.abs(gn) - 0.018 * blot));
        const i = (y * hw + x) * 4;
        img.data[i] = v * 255; img.data[i + 1] = v * 252; img.data[i + 2] = v * 246; img.data[i + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
    grainCache[key] = cv;
    return cv;
  }

  let darkLayer = null;
  function layer(w, h) {
    if (!darkLayer) darkLayer = document.createElement('canvas');
    if (darkLayer.width !== w || darkLayer.height !== h) { darkLayer.width = w; darkLayer.height = h; }
    return darkLayer;
  }

  function drawWorld(g, st) {
    const t = st.t || 0;
    if (st.backdrop) st.backdrop(g, t);
    else {
      L.drawWall(g, st);
      L.drawFloor(g, st);
    }
    (st.wallFx || []).forEach(fn => fn(g, t));
    L.drawLightCones(g, st);
    if (st.pipes !== false) L.drawPipes(g, st);
    (st.back || []).forEach(fn => fn(g, t));
    if (st.reactor) L.drawReactor(g, st.reactor, t);
    if (st.pods !== false) ['opus', 'sonnet', 'haiku'].forEach(n => L.drawPod(g, n, (st.pods || {})[n] || {}, t));
    L.lampsOf(st).forEach(Lp => {
      if (g.visible(Lp.x - 1, Lp.y - 0.5, Lp.x + 1, L.CEIL)) L.drawLamp(g, Lp, st.lamps[Lp.id] || 0, st.lamp_sway);
    });
    (st.mid || []).forEach(fn => fn(g, t));
    (st.bursts || []).forEach(b => { if (!b.front) b.draw(g, t); });
    const chars = (st.chars || []).slice().sort((a, b) => (a.depth !== null ? a.depth : -a.y) - (b.depth !== null ? b.depth : -b.y));
    chars.forEach(c => CL.Clawd.draw(g, c, t));
    (st.bursts || []).forEach(b => { if (b.front) b.draw(g, t); });
    (st.front || []).forEach(fn => fn(g, t));
  }

  // darkness with lamp pools cut out, then emissive glows on top
  function drawLighting(g, st) {
    const night = st.night || 0;
    const c = g.c;
    if (night > 0.005) {
      const lay = layer(g.wpx, g.hpx);
      const lc = lay.getContext('2d');
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.clearRect(0, 0, lay.width, lay.height);
      lc.setTransform(c.getTransform());
      lc.fillStyle = X.css(st.nightColor || P.NIGHT, 0.86 * night);
      lc.fillRect(g.cam.cx - g.view_w * 2, -40, g.view_w * 4, 80);
      lc.globalCompositeOperation = 'destination-out';
      const cut = (x, y, r, on) => {
        const gr = lc.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(0,0,0,' + (0.95 * on) + ')');
        gr.addColorStop(0.55, 'rgba(0,0,0,' + (0.6 * on) + ')');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = gr;
        lc.fillRect(x - r, y - r, 2 * r, 2 * r);
      };
      L.lampsOf(st).forEach(Lp => {
        const on = st.lamps[Lp.id] || 0;
        if (on <= 0.01) return;
        const [lx, ly] = L.lampPos(Lp, st.lamp_sway);
        cut(lx, ly * 0.45, 2.3 * Lp.k + 0.25 * ly, on);
      });
      (st.lights || []).forEach(li => cut(li.x, li.y, li.r, li.a === undefined ? 1 : li.a));
      lc.globalCompositeOperation = 'source-over';
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(lay, 0, 0);
      c.restore();
    }
    L.lampsOf(st).forEach(Lp => {
      const on = st.lamps[Lp.id] || 0;
      if (on <= 0.01) return;
      const [lx, ly] = L.lampPos(Lp, st.lamp_sway);
      g.glow(ellipse(lx, ly - 0.02 * Lp.k, 0.16 * Lp.k, 0.09 * Lp.k), '#FFF2C8', 0.12 * Lp.k, on);
    });
    if (night > 0.05 && st.pods !== false) {
      Object.keys(L.PODS).forEach(name => {
        const ps = (st.pods || {})[name] || {};
        if (ps.dark) return;
        const { k, x } = L.PODS[name];
        const a = night * (0.6 + 0.4 * (ps.light === undefined ? 1 : ps.light));
        g.glow(X.rrect(x - 0.45 * k, 0.95 * k, x + 0.45 * k, 1.78 * k, 0.12 * k), P.POD_INSIDE_GLOW, 0.12 * k, 0.45 * a);
      });
    }
    const rs = st.reactor;
    if (rs && (rs.eyes || 0) > 0.01 && !rs.shattered) {
      g.glow(circle(L.PORT_C[0], L.PORT_C[1], L.PORT_R * 0.9), P.GLOW, 0.9, 0.12 * rs.eyes);
    }
    (st.emissive || []).forEach(fn => fn(g, st.t || 0));
  }

  function finish(c, st, w, h) {
    if ((st.alarm || 0) > 0.005) {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, X.css(P.ALARM, 0.35 * st.alarm));
      gr.addColorStop(1, X.css(P.ALARM, 0.05 * st.alarm));
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    }
    if (st.tint) {
      c.fillStyle = X.css(st.tint[0], st.tint[1]);
      c.fillRect(0, 0, w, h);
    }
    const vr = Math.hypot(w, h) * 0.56;
    const vg = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, vr);
    vg.addColorStop(0, 'rgba(11,10,20,0)');
    vg.addColorStop(0.55, 'rgba(11,10,20,0.06)');
    vg.addColorStop(1, 'rgba(11,10,20,' + (st.vignette === undefined ? 0.34 : st.vignette) + ')');
    c.fillStyle = vg;
    c.fillRect(0, 0, w, h);
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.imageSmoothingEnabled = false;
    c.drawImage(paperImage(w, h), 0, 0, Math.ceil(w / 2) * 2, Math.ceil(h / 2) * 2);
    c.restore();
    if (st.flash > 0) { c.fillStyle = X.css('#FFF6E6', 0.6 * st.flash); c.fillRect(0, 0, w, h); }
    if (st.fade > 0) { c.fillStyle = X.css('#0B0A14', st.fade); c.fillRect(0, 0, w, h); }
    (st.overlay || []).forEach(fn => fn(c, w, h));
  }

  function render(ctx, w, h, st) {
    st.lamps = st.lamps || {};
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = st.black ? '#0B0A14' : P.WALL;
    ctx.fillRect(0, 0, w, h);
    let cam = st.cam;
    if (st.shake || st.cam_rot) {
      const sh = st.shake || [0, 0];
      cam = new X.Cam(cam.cx + sh[0], cam.cy + sh[1], cam.h, st.cam_rot || 0);
    }
    const g = new X.G(ctx, w, h, cam, st.t || 0);
    if (!st.black) {
      g.beginWorld();
      drawWorld(g, st);
      drawLighting(g, st);
      (st.top || []).forEach(fn => fn(g, st.t || 0));
      g.end();
    }
    finish(ctx, st, w, h);
    ctx.restore();
    return g;
  }

  CL.Render = { render, paperImage };
})(window.CL = window.CL || {});
