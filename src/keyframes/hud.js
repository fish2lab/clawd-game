/* Screen-space overlays: chapter tag, prompt chips, who-you-control chip,
   tap-code strip and full-screen chapter title cards.
   Kept close to the short's own insert graphics: cream paper, ink outlines. */
(function (CL) {
  'use strict';
  const P = CL.P;
  const X = CL.gfx;
  const ZH = '"ZCOOL QingKe HuangYou", "PingFang SC", "Microsoft YaHei", sans-serif';
  const ZHB = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", sans-serif';
  const SLAB = '"Zilla Slab", Rockwell, Georgia, serif';
  const HAND = '"Caveat", cursive';

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function paperTag(c, x, y, w, h, k, fill) {
    rr(c, x, y, w, h, 10 * k);
    c.fillStyle = fill || P.PAPER;
    c.fill();
    c.lineWidth = 3 * k;
    c.strokeStyle = P.INK;
    c.stroke();
  }

  // top-left: chapter + title, with the in-story time on a second line
  function chapterTag(o) {
    return (c, w, h) => {
      const k = h / 1080;
      c.save();
      c.font = `700 ${20 * k}px ${SLAB}`;
      const aw = c.measureText(o.ch).width;
      c.font = `${32 * k}px ${ZH}`;
      const bw = c.measureText(o.title).width;
      c.font = `${24 * k}px ${ZH}`;
      const ww = o.when ? c.measureText(o.when).width : 0;
      const tw = Math.max(aw + bw + 18 * k, ww);
      const x = 40 * k, y = 36 * k, bh = (o.when ? 92 : 58) * k;
      rr(c, x, y, tw + 44 * k, bh, 8 * k);
      c.fillStyle = X.css(P.NAVY_DARK, 0.9);
      c.fill();
      c.lineWidth = 2 * k;
      c.strokeStyle = X.css(P.INK);
      c.stroke();
      c.fillStyle = P.SAFETY;
      c.font = `700 ${20 * k}px ${SLAB}`;
      c.fillText(o.ch, x + 22 * k, y + 38 * k);
      c.fillStyle = '#F1E9D8';
      c.font = `${32 * k}px ${ZH}`;
      c.fillText(o.title, x + 40 * k + aw, y + 41 * k);
      if (o.when) {
        c.font = `${24 * k}px ${ZH}`;
        c.fillStyle = X.css('#F1E9D8', 0.72);
        c.fillText(o.when, x + 22 * k, y + 78 * k);
      }
      c.restore();
    };
  }

  // tiny clawd face for the "you control" chip
  function clawdIcon(c, x, y, s, who) {
    const col = P.ORANGE;
    c.save();
    c.translate(x, y);
    c.fillStyle = col;
    c.strokeStyle = P.INK;
    c.lineWidth = s * 0.06;
    rr(c, -s / 2, -s * 0.333, s, s * 0.667, s * 0.04);
    c.fill();
    c.stroke();
    c.fillStyle = P.INK;
    [-0.2917, 0.2917].forEach(u => c.fillRect(u * s - s * 0.042, -s * 0.12, s * 0.083, s * 0.167));
    if (who === 'opus') {
      c.fillStyle = P.BRASS;
      [-0.21, 0.21].forEach(u => { c.beginPath(); c.arc(u * s, -s * 0.3, s * 0.09, 0, 7); c.fill(); c.stroke(); });
    } else if (who === 'sonnet') {
      c.strokeStyle = P.INK;
      [-0.2917, 0.2917].forEach(u => c.strokeRect(u * s - s * 0.09, -s * 0.15, s * 0.18, s * 0.22));
    } else if (who === 'haiku') {
      c.fillStyle = P.TIE_RED;
      c.beginPath(); c.moveTo(-s * 0.04, s * 0.16); c.lineTo(s * 0.04, s * 0.16); c.lineTo(0, s * 0.33); c.closePath(); c.fill();
    }
    c.restore();
  }

  // top-right: who you are controlling (+ optional others you can switch to)
  function control(list) {
    return (c, w, h) => {
      const k = h / 1080;
      c.save();
      let x = w - 40 * k;
      list.slice().reverse().forEach(it => {
        const active = !!it.active;
        c.font = `700 ${21 * k}px ${SLAB}`;
        const tw = c.measureText(it.name).width;
        const bw = tw + 84 * k, bh = 56 * k;
        x -= bw;
        rr(c, x, 36 * k, bw, bh, bh / 2);
        c.fillStyle = active ? P.PAPER : X.css(P.NAVY_DARK, 0.7);
        c.fill();
        c.lineWidth = (active ? 3 : 2) * k;
        c.strokeStyle = active ? P.INK : X.css('#F1E9D8', 0.4);
        c.stroke();
        clawdIcon(c, x + 32 * k, 36 * k + bh / 2, 34 * k, it.who);
        c.fillStyle = active ? P.INK : X.css('#F1E9D8', 0.7);
        c.fillText(it.name, x + 58 * k, 36 * k + bh / 2 + 7 * k);
        if (it.key) {
          c.font = `700 ${16 * k}px ${SLAB}`;
          c.fillStyle = X.css('#F1E9D8', 0.75);
          c.fillText(it.key, x + bw / 2 - 6 * k, 36 * k + bh + 24 * k);
        }
        x -= 14 * k;
      });
      c.restore();
    };
  }

  function mouseIcon(c, x, y, s, btn) {
    c.save();
    c.translate(x, y);
    rr(c, -s * 0.35, -s * 0.5, s * 0.7, s, s * 0.33);
    c.fillStyle = '#FFFFFF';
    c.fill();
    c.lineWidth = s * 0.08;
    c.strokeStyle = P.INK;
    c.stroke();
    c.beginPath();
    c.moveTo(0, -s * 0.5);
    c.lineTo(0, -s * 0.08);
    c.moveTo(-s * 0.35, -s * 0.08);
    c.lineTo(s * 0.35, -s * 0.08);
    c.stroke();
    if (btn) {
      c.fillStyle = P.ORANGE;
      c.beginPath();
      c.moveTo(-s * 0.3, -s * 0.12);
      c.lineTo(-s * 0.04, -s * 0.12);
      c.lineTo(-s * 0.04, -s * 0.46);
      c.arcTo(-s * 0.3, -s * 0.46, -s * 0.3, -s * 0.12, s * 0.26);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  function keyIcon(c, x, y, s, label) {
    c.save();
    rr(c, x - s / 2, y - s / 2, s, s, s * 0.18);
    c.fillStyle = '#FFFFFF';
    c.fill();
    c.lineWidth = s * 0.07;
    c.strokeStyle = P.INK;
    c.stroke();
    c.fillStyle = P.INK;
    c.font = `700 ${s * 0.5}px ${SLAB}`;
    c.textAlign = 'center';
    c.fillText(label, x, y + s * 0.17);
    c.restore();
  }

  // prompt chip: [icon] text. Bottom centre by default; o.x / o.fy move it (fractions of the frame)
  function prompt(text, o) {
    o = o || {};
    return (c, w, h) => {
      const k = h / 1080;
      c.save();
      c.font = `700 ${30 * k}px ${ZHB}`;
      const tw = c.measureText(text).width;
      const icons = o.keys ? o.keys.length : 1;
      const iw = icons * 52 * k;
      const bw = tw + iw + 76 * k, bh = 74 * k;
      const x = (o.x !== undefined ? o.x * w : w / 2) - bw / 2;
      const y = o.fy !== undefined ? o.fy * h - bh / 2 : h - (o.y || 56) * k - bh;
      paperTag(c, x, y, bw, bh, k);
      let ix = x + 44 * k;
      if (o.keys) o.keys.forEach(kk => { keyIcon(c, ix, y + bh / 2, 42 * k, kk); ix += 52 * k; });
      else { mouseIcon(c, ix, y + bh / 2, 44 * k, true); ix += 52 * k; }
      c.fillStyle = P.INK;
      c.fillText(text, ix, y + bh / 2 + 11 * k);
      c.restore();
    };
  }

  // tap-code strip: groups of dots with the decoded letter under each pair
  function tapStrip(pairs, o) {
    o = o || {};
    return (c, w, h) => {
      const k = h / 1080;
      c.save();
      const dot = 13 * k, gap = 10 * k, pairGap = 60 * k, grpGap = 26 * k;
      const widths = pairs.map(([a, b]) => (a + b) * (dot + gap) + grpGap);
      const total = widths.reduce((s, v) => s + v, 0) + pairGap * (pairs.length - 1) + 80 * k;
      const bh = (o.decoded ? 132 : 92) * k;
      const x0 = (w - total) / 2, y0 = (o.y || 150) * k;
      rr(c, x0, y0, total, bh, 12 * k);
      c.fillStyle = X.css(P.NAVY_DARK, 0.86);
      c.fill();
      c.lineWidth = 2 * k;
      c.strokeStyle = X.css(P.GLOW, 0.6);
      c.stroke();
      c.font = `700 ${18 * k}px ${SLAB}`;
      c.fillStyle = P.GLOW;
      c.fillText(o.label || 'KNOCK', x0 + 18 * k, y0 + 28 * k);
      let x = x0 + 40 * k;
      const cy = y0 + 58 * k;
      pairs.forEach(([a, b], i) => {
        const start = x;
        for (let j = 0; j < a; j++) { c.beginPath(); c.arc(x + dot / 2, cy, dot / 2, 0, 7); c.fillStyle = P.GLOW_CORE; c.fill(); x += dot + gap; }
        x += grpGap - gap;
        for (let j = 0; j < b; j++) { c.beginPath(); c.arc(x + dot / 2, cy, dot / 2, 0, 7); c.fillStyle = P.GLOW; c.fill(); x += dot + gap; }
        if (o.decoded) {
          c.font = `700 ${38 * k}px ${SLAB}`;
          c.fillStyle = '#F1E9D8';
          c.textAlign = 'center';
          c.fillText(o.decoded[i] || '', (start + x - gap) / 2, y0 + 112 * k);
          c.textAlign = 'left';
        }
        x += pairGap;
      });
      c.restore();
    };
  }

  // small world-to-screen helper for pointing a cursor at something
  function cursorAt(c, x, y, k, press) {
    c.save();
    c.translate(x, y);
    c.rotate(-0.35);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, 46 * k);
    c.lineTo(11 * k, 35 * k);
    c.lineTo(20 * k, 54 * k);
    c.lineTo(28 * k, 50 * k);
    c.lineTo(19 * k, 32 * k);
    c.lineTo(34 * k, 32 * k);
    c.closePath();
    c.fillStyle = '#FFFFFF';
    c.fill();
    c.lineWidth = 3 * k;
    c.strokeStyle = P.INK;
    c.lineJoin = 'round';
    c.stroke();
    c.restore();
    if (press) {
      c.save();
      c.strokeStyle = X.css('#FFFFFF', 0.85);
      c.lineWidth = 3 * k;
      [16, 30].forEach(r => { c.beginPath(); c.arc(x, y, r * k, 0, 7); c.stroke(); });
      c.restore();
    }
  }

  // ------------------------------------------------------------ title cards

  // chapter title card: number, title, English name, time. Quiet on purpose.
  function titleCard(o) {
    return (c, w, h) => {
      const k = h / 1080;
      const spaced = t => t.split('').join(String.fromCharCode(8202, 8202));
      c.save();
      c.textAlign = 'center';
      c.fillStyle = X.css(P.SAFETY, 0.75);
      c.font = `700 ${22 * k}px ${SLAB}`;
      c.fillText(spaced(o.label), w / 2, h * 0.4);
      c.fillStyle = '#ECE6D8';
      c.font = `${92 * k}px ${ZH}`;
      c.fillText(o.title, w / 2, h * 0.52);
      c.fillStyle = X.css(P.ORANGE, 0.85);
      c.fillRect(w / 2 - 56 * k, h * 0.56, 112 * k, 2 * k);
      c.fillStyle = X.css('#ECE6D8', 0.55);
      c.font = `700 ${22 * k}px ${SLAB}`;
      c.fillText(spaced(o.en), w / 2, h * 0.6 + 12 * k);
      if (o.when) {
        c.fillStyle = X.css('#ECE6D8', 0.38);
        c.font = `${24 * k}px ${ZH}`;
        c.fillText(o.when, w / 2, h * 0.86);
      }
      c.restore();
    };
  }

  // the game's title (cover style), drawn over a world frame
  function gameTitle(o) {
    return (c, w, h) => {
      const k = h / 1080;
      c.save();
      const x = 90 * k;
      c.font = `700 ${40 * k}px ${SLAB}`;
      c.fillStyle = P.SAFETY;
      c.fillText('PLEASE DO NOT TAP THE GLASS'.split('').join(String.fromCharCode(8202)), x, h * 0.25);
      c.font = `${190 * k}px ${ZH}`;
      c.lineJoin = 'round';
      c.lineWidth = 26 * k;
      c.strokeStyle = '#2A2541';
      const lines = ['请勿', '敲击玻璃'];
      lines.forEach((s, i) => {
        const y = h * (0.45 + i * 0.2);
        c.strokeText(s, x, y);
        const gr = c.createLinearGradient(0, y - 160 * k, 0, y + 10 * k);
        gr.addColorStop(0, '#FFE7A8');
        gr.addColorStop(0.55, '#F0B24A');
        gr.addColorStop(1, '#E07B3A');
        c.fillStyle = gr;
        c.fillText(s, x, y);
      });
      c.font = `700 ${46 * k}px ${SLAB}`;
      c.fillStyle = '#F1E9D8';
      c.fillText(o.sub || 'A Clawd Lab puzzle game', x, h * 0.86);
      c.restore();
    };
  }

  // a black bar letterbox for cinematic beats
  function letterbox(a) {
    return (c, w, h) => {
      const bh = h * 0.09 * (a === undefined ? 1 : a);
      c.fillStyle = '#0B0A14';
      c.fillRect(0, 0, w, bh);
      c.fillRect(0, h - bh, w, bh);
    };
  }

  function caption(text, o) {
    o = o || {};
    return (c, w, h) => {
      const k = h / 1080;
      c.save();
      c.textAlign = 'center';
      c.font = `${(o.size || 44) * k}px ${o.font === 'slab' ? SLAB : ZH}`;
      c.lineJoin = 'round';
      c.lineWidth = 8 * k;
      c.strokeStyle = X.css('#0B0A14', 0.8);
      const y = h * (o.y || 0.9);
      c.strokeText(text, w / 2, y);
      c.fillStyle = o.color || '#F1E9D8';
      c.fillText(text, w / 2, y);
      c.restore();
    };
  }

  CL.HUD = { chapterTag, control, prompt, tapStrip, cursorAt, titleCard, gameTitle, letterbox, caption, clawdIcon };
})(window.CL = window.CL || {});
