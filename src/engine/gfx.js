/* Thin drawing layer over Canvas 2D, ported from clawd-lab's gfx.py (skia).

   World units are y-up. One unit is roughly the body width of Opus.
   Everything is drawn in world space through one camera, so the porthole
   has exactly one size no matter how the shot is framed. */
(function (CL) {
  'use strict';
  const P = CL.P;
  const PI = Math.PI;

  // ------------------------------------------------------------ colour

  function rgb(c) {
    if (Array.isArray(c)) return c;
    const h = c.charAt(0) === '#' ? c.slice(1) : c;
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  }

  function css(c, a) {
    const v = rgb(c);
    const al = a === undefined ? 1 : Math.max(0, Math.min(1, a));
    return 'rgba(' + Math.round(v[0] * 255) + ',' + Math.round(v[1] * 255) + ',' + Math.round(v[2] * 255) + ',' + al.toFixed(4) + ')';
  }

  function mix(c1, c2, t) {
    const a = rgb(c1), b = rgb(c2);
    t = clamp(t);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function shade(c, f) {
    const a = rgb(c);
    if (f < 1) return a.map(v => v * f);
    return a.map(v => v + (1 - v) * (f - 1));
  }

  // ------------------------------------------------------------ math

  function clamp(x, a, b) {
    if (a === undefined) a = 0;
    if (b === undefined) b = 1;
    return x < a ? a : x > b ? b : x;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const easeIO = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const easeOut = (t, p) => 1 - Math.pow(1 - clamp(t), p || 3);
  const easeIn = (t, p) => Math.pow(clamp(t), p || 2);
  const seg = (t, t0, t1) => (t1 <= t0 ? (t >= t1 ? 1 : 0) : clamp((t - t0) / (t1 - t0)));
  const deg = d => d * PI / 180;

  function hash01() {
    // FNV-1a over the stringified arguments, murmur3 finaliser
    let h = 2166136261 >>> 0;
    const s = Array.prototype.join.call(arguments, '|');
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35) >>> 0;
    h ^= h >>> 16;
    return (h & 0xFFFFFF) / 0x1000000;
  }

  function vnoise(x, seed) {
    const i = Math.floor(x), f = x - i;
    const a = hash01(seed || 0, i) * 2 - 1;
    const b = hash01(seed || 0, i + 1) * 2 - 1;
    const u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  }

  // small seeded PRNG for scene layouts (mulberry32)
  function rng(seed) {
    let s = seed >>> 0;
    const next = () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.uniform = (a, b) => a + (b - a) * next();
    return next;
  }

  // ------------------------------------------------------------ paths

  function rect(x0, y0, x1, y1) {
    const p = new Path2D();
    p.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    return p;
  }

  function rrect(x0, y0, x1, y1, r) {
    const xa = Math.min(x0, x1), xb = Math.max(x0, x1), ya = Math.min(y0, y1), yb = Math.max(y0, y1);
    r = Math.max(0, Math.min(r, (xb - xa) / 2, (yb - ya) / 2));
    const p = new Path2D();
    p.moveTo(xa + r, ya);
    p.lineTo(xb - r, ya);
    p.arcTo(xb, ya, xb, ya + r, r);
    p.lineTo(xb, yb - r);
    p.arcTo(xb, yb, xb - r, yb, r);
    p.lineTo(xa + r, yb);
    p.arcTo(xa, yb, xa, yb - r, r);
    p.lineTo(xa, ya + r);
    p.arcTo(xa, ya, xa + r, ya, r);
    p.closePath();
    return p;
  }

  function circle(x, y, r) {
    const p = new Path2D();
    p.arc(x, y, Math.max(r, 1e-5), 0, 2 * PI);
    p.closePath();
    return p;
  }

  function ellipse(x, y, rx, ry, rot) {
    const p = new Path2D();
    p.ellipse(x, y, Math.max(rx, 1e-5), Math.max(ry, 1e-5), rot || 0, 0, 2 * PI);
    p.closePath();
    return p;
  }

  function poly(pts, close) {
    const p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    if (close !== false) p.closePath();
    return p;
  }

  // Catmull-Rom through points -> cubic path
  function smoothPath(pts, close, tension) {
    if (close === undefined) close = true;
    if (tension === undefined) tension = 0.5;
    const n = pts.length;
    const p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    const k = tension / 3 * 2;
    const last = close ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = (close || i > 0) ? pts[(i - 1 + n) % n] : pts[i];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = (close || i + 2 < n) ? pts[(i + 2) % n] : p2;
      p.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) * k / 2, p1[1] + (p2[1] - p0[1]) * k / 2,
        p2[0] - (p3[0] - p1[0]) * k / 2, p2[1] - (p3[1] - p1[1]) * k / 2,
        p2[0], p2[1]);
    }
    if (close) p.closePath();
    return p;
  }

  // arc as an open path (degrees, skia convention: start, sweep)
  function arcPath(cx, cy, r, startDeg, sweepDeg) {
    const p = new Path2D();
    const a0 = deg(startDeg), a1 = deg(startDeg + sweepDeg);
    p.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    p.arc(cx, cy, r, a0, a1, sweepDeg < 0);
    return p;
  }

  // combine several paths (filled with evenodd this gives rings / frames)
  function join() {
    const p = new Path2D();
    for (let i = 0; i < arguments.length; i++) p.addPath(arguments[i]);
    return p;
  }

  function transformed(path, a, b, c, d, e, f) {
    const q = new Path2D();
    q.addPath(path, new DOMMatrix([a, b, c, d, e, f]));
    return q;
  }

  // ------------------------------------------------------------ polygon helpers (for projective maps)

  function ptsRRect(x0, y0, x1, y1, r, n) {
    n = n || 6;
    const xa = Math.min(x0, x1), xb = Math.max(x0, x1), ya = Math.min(y0, y1), yb = Math.max(y0, y1);
    r = Math.max(0, Math.min(r, (xb - xa) / 2, (yb - ya) / 2));
    const out = [];
    const corner = (cx, cy, a0) => {
      for (let i = 0; i <= n; i++) {
        const a = a0 + (i / n) * PI / 2;
        out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    };
    corner(xb - r, ya + r, -PI / 2);
    corner(xb - r, yb - r, 0);
    corner(xa + r, yb - r, PI / 2);
    corner(xa + r, ya + r, PI);
    return out;
  }

  function ptsCircle(x, y, r, n) {
    n = n || 28;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * PI;
      out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    return out;
  }

  const ptsRect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const mapPts = (pts, fn) => pts.map(q => fn(q[0], q[1]));

  // ------------------------------------------------------------ hatch tiles

  const hatchAlpha = {};
  function hatchTile(kind) {
    if (hatchAlpha[kind]) return hatchAlpha[kind];
    const n = 96;
    const cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const cx = cv.getContext('2d');
    const img = cx.createImageData(n, n);
    const r = rng(kind === 'diag' ? 7 : kind === 'cross' ? 11 : 13);
    const ph = r() * 6;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let a = 0;
        if (kind === 'diag') {
          const d = (x + y) % 12;
          const w = 1.25 + 0.5 * Math.sin(x * 0.21 + ph);
          a = clamp(1.4 - Math.abs(d - 6) / w);
        } else if (kind === 'cross') {
          const d1 = (x + y) % 12, d2 = ((x - y) % 12 + 12) % 12;
          a = Math.max(clamp(1.3 - Math.abs(d1 - 6) / 1.2), 0.75 * clamp(1.3 - Math.abs(d2 - 6) / 1.1));
        } else {
          const d = x % 9;
          a = clamp(1.3 - Math.abs(d - 4.5) / 1.0) * (0.7 + 0.3 * Math.sin(y * 0.13 + x));
        }
        a *= 0.65 + 0.35 * r();
        const i = (y * n + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(clamp(a) * 255);
      }
    }
    cx.putImageData(img, 0, 0);
    hatchAlpha[kind] = cv;
    return cv;
  }

  const hatchColored = {};
  function hatchCanvas(kind, color) {
    const key = kind + '|' + css(color);
    if (hatchColored[key]) return hatchColored[key];
    const a = hatchTile(kind);
    const cv = document.createElement('canvas');
    cv.width = a.width; cv.height = a.height;
    const cx = cv.getContext('2d');
    cx.fillStyle = css(color);
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.globalCompositeOperation = 'destination-in';
    cx.drawImage(a, 0, 0);
    hatchColored[key] = cv;
    return cv;
  }

  // ------------------------------------------------------------ camera / context

  class Cam {
    constructor(cx, cy, h, rot) { this.cx = cx; this.cy = cy; this.h = h; this.rot = rot || 0; }
  }

  const FONTS = {
    slab: '700 100px "Zilla Slab", "Rockwell", Georgia, serif',
    hand: '400 100px "Caveat", "Segoe Print", cursive',
    zh: '400 100px "ZCOOL QingKe HuangYou", "PingFang SC", "Microsoft YaHei", sans-serif',
    mono: '700 100px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
    sans: '700 100px "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    zhsans: '700 100px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", sans-serif',
  };

  class G {
    constructor(ctx, wpx, hpx, cam, t) {
      this.c = ctx;
      this.wpx = wpx;
      this.hpx = hpx;
      this.cam = cam;
      this.t = t || 0;
      this.s = hpx / cam.h;                       // px per world unit
      this.zoomk = Math.pow(cam.h / 4.0, 0.38);   // world line width factor
      this.view_w = cam.h * wpx / hpx;
    }

    beginWorld() {
      const c = this.c;
      c.save();
      c.translate(this.wpx / 2, this.hpx / 2);
      if (this.cam.rot) c.rotate(deg(this.cam.rot));
      c.scale(this.s, -this.s);
      c.translate(-this.cam.cx, -this.cam.cy);
    }

    end() { this.c.restore(); }
    save() { this.c.save(); }
    restore() { this.c.restore(); }
    clip(path, evenodd) { this.c.clip(path, evenodd ? 'evenodd' : 'nonzero'); }
    translate(x, y) { this.c.translate(x, y); }
    rotate(d) { this.c.rotate(deg(d)); }        // degrees, same sign as skia
    scale(x, y) { this.c.scale(x, y === undefined ? x : y); }

    visible(x0, y0, x1, y1, pad) {
      if (pad === undefined) pad = 0.5;
      const hw = this.view_w / 2 + pad, hh = this.cam.h / 2 + pad;
      const cx = this.cam.cx, cy = this.cam.cy;
      return !(x1 < cx - hw || x0 > cx + hw || y1 < cy - hh || y0 > cy + hh);
    }

    // outline width in world units (scales sub-linearly with zoom)
    lw(w) { return 0.016 * (w === undefined ? 1 : w) * this.zoomk; }

    // ---- paints
    fill(path, color, a, evenodd) {
      const c = this.c;
      c.fillStyle = css(color, a);
      c.fill(path, evenodd ? 'evenodd' : 'nonzero');
    }

    fillShader(path, shader, a, evenodd) {
      const c = this.c;
      const ga = c.globalAlpha;
      if (a !== undefined) c.globalAlpha = ga * clamp(a);
      c.fillStyle = shader;
      c.fill(path, evenodd ? 'evenodd' : 'nonzero');
      c.globalAlpha = ga;
    }

    stroke(path, w, color, a, cap) {
      const c = this.c;
      c.lineWidth = this.lw(w);
      c.lineJoin = 'round';
      c.lineCap = cap === false ? 'butt' : 'round';
      c.strokeStyle = css(color || P.INK, a);
      c.stroke(path);
    }

    fs(path, color, w, a, ink, evenodd) {
      this.fill(path, color, a, evenodd);
      if (w === undefined) w = 1;
      if (w > 0) this.stroke(path, w, ink || P.INK, a);
    }

    line(x0, y0, x1, y1, w, color, a) {
      const p = new Path2D();
      p.moveTo(x0, y0);
      p.lineTo(x1, y1);
      this.stroke(p, w, color, a);
    }

    linGrad(x0, y0, x1, y1, colors, pos, a) {
      const g = this.c.createLinearGradient(x0, y0, x1, y1);
      colors.forEach((cc, i) => g.addColorStop(pos ? pos[i] : i / Math.max(1, colors.length - 1), css(cc, a)));
      return g;
    }

    radGrad(x, y, r, colors, pos, alphas) {
      const g = this.c.createRadialGradient(x, y, 0, x, y, Math.max(r, 1e-4));
      colors.forEach((cc, i) => g.addColorStop(pos ? pos[i] : i / Math.max(1, colors.length - 1), css(cc, alphas ? alphas[i] : 1)));
      return g;
    }

    // pencil hatch anchored in world space
    hatch(path, color, a, kind, scale, rot, evenodd) {
      kind = kind || 'diag';
      const tile = 0.30 * (scale || 1) * Math.pow(this.zoomk, 0.6);
      const cv = hatchCanvas(kind, color || P.INK);
      const pat = this.c.createPattern(cv, 'repeat');
      let m = new DOMMatrix();
      if (rot) m = m.rotate(rot);
      m = m.scale(tile / cv.width, -tile / cv.height);
      pat.setTransform(m);
      const c = this.c;
      const ga = c.globalAlpha;
      c.globalAlpha = ga * clamp(a === undefined ? 0.25 : a);
      c.fillStyle = pat;
      c.fill(path, evenodd ? 'evenodd' : 'nonzero');
      c.globalAlpha = ga;
    }

    // blurred fill; sigma in world units. Uses a shadow so it works everywhere.
    soft(path, color, sigma, a, blend) {
      const c = this.c;
      const m = c.getTransform();
      const dev = new Path2D();
      dev.addPath(path, m);
      const sx = Math.hypot(m.a, m.b);
      const sigPx = Math.max(sigma * sx, 0.01);
      const OFF = 20000;
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (blend) c.globalCompositeOperation = blend;
      c.shadowColor = css(color, a);
      c.shadowBlur = sigPx * 2;
      c.shadowOffsetX = OFF;
      c.shadowOffsetY = 0;
      c.translate(-OFF, 0);
      c.fillStyle = '#000';
      c.fill(dev);
      c.restore();
    }

    glow(path, color, sigma, a, plus) {
      this.soft(path, color, sigma, a, plus === false ? null : 'lighter');
    }

    text(s, x, y, size, color, font, align, a, rot, outline, ow, scaleX) {
      const c = this.c;
      font = font || 'slab';
      c.save();
      c.font = FONTS[font] || font;
      const k = size / 100;
      const w = c.measureText(s).width;
      const dx = align === 'left' ? 0 : align === 'right' ? -w : -w / 2;
      c.translate(x, y);
      if (rot) c.rotate(deg(rot));
      c.scale(k * (scaleX || 1), -k);
      c.textBaseline = 'alphabetic';
      if (outline) {
        c.lineJoin = 'round';
        c.lineWidth = ow / k;
        c.strokeStyle = css(outline, a);
        c.strokeText(s, dx, 0);
      }
      c.fillStyle = css(color || P.INK, a);
      c.fillText(s, dx, 0);
      c.restore();
      return w * k * (scaleX || 1);
    }

    textWidth(s, size, font) {
      const c = this.c;
      c.save();
      c.font = FONTS[font || 'slab'] || font;
      const w = c.measureText(s).width;
      c.restore();
      return w * size / 100;
    }

    shadow(x, y, rx, ry, a) {
      this.soft(ellipse(x, y, rx, ry), P.INK, ry * 0.45, a === undefined ? 0.22 : a);
    }
  }

  CL.gfx = {
    rgb, css, mix, shade, clamp, lerp, smooth, easeIO, easeOut, easeIn, seg, deg, hash01, vnoise, rng,
    rect, rrect, circle, ellipse, poly, smoothPath, arcPath, join, transformed,
    ptsRRect, ptsCircle, ptsRect, mapPts, Cam, G, FONTS,
  };
})(window.CL = window.CL || {});
