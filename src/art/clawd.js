/* Clawd, drawn as a little box that can turn in 3-D. Port of clawdlab/clawd.py.

   Proportions come straight from the terminal glyph:

        ▐▛███▜▌
       ▝▜█████▛▘
         ▘▘ ▝▝

   body 1.0 x 0.667, eye slits 0.083 x 0.167, side stubs 0.167, four legs.
   Each box face (front / sides / back) is drawn as a flat decal mapped onto
   the projected face, so outfits stay attached when a Clawd turns. */
(function (CL) {
  'use strict';
  const P = CL.P;
  const { rect, rrect, circle, poly, transformed, shade, clamp, lerp, deg, mix } = CL.gfx;
  const PI = Math.PI;

  const LEGS = [-0.375, -0.2083, 0.2083, 0.375];
  const SIDE = 0.82; // brightness of side faces

  function CS(o) {
    return Object.assign({
      W: 1.0, x: 0, y: 0,
      theta: 0,          // 0 front, +pi/2 faces screen-right, pi back
      lift: 0, sq: 1, tilt: 0,
      walk: 0, walk_amp: 0,
      eye_open: 1, look: [0, 0], eye_wide: 0, eye_happy: 0,
      arm_l: 0, arm_r: 0,
      outfit: null,      // 'labcoat' | 'hoodie' | 'uniform'
      goggles_down: 0, glint: -1,
      prop: null,        // 'clipboard' | 'laptop' | function(g, st, ctx)
      laptop_open: 0, typing: 0,
      checks: [0, 0, 0, 0], circle4: 0, pencil: -1,
      items: null,       // clipboard lines (defaults to the short's list)
      alpha: 1, shadow: true, rim: 0, screen_glow: 0,
      frozen: 0,         // frost over the body (cryo)
      sweat: 0,
      depth: null, name: '',
    }, o || {});
  }

  class Face {
    // maps face-local (u, v) into Clawd-local space, v=0 at body bottom
    constructor(g, sx, tx, y0, width, kind, bright) {
      this.g = g; this.sx = sx; this.tx = tx; this.y0 = y0;
      this.width = width; this.kind = kind; this.bright = bright === undefined ? 1 : bright;
    }
    tp(p) { return transformed(p, this.sx, 0, 0, 1, this.tx, this.y0); }
    col(c) { return this.bright !== 1 ? shade(c, this.bright) : c; }
    fs(p, c, w, a) { this.g.fs(this.tp(p), this.col(c), w === undefined ? 1 : w, a); }
    fill(p, c, a) { this.g.fill(this.tp(p), this.col(c), a); }
    stroke(p, w, c, a) { this.g.stroke(this.tp(p), w, c || P.INK, a); }
    line(u0, v0, u1, v1, w, c, a) { this.stroke(poly([[u0, v0], [u1, v1]], false), w, c, a); }
    hatch(p, a, kind, c, scale) { this.g.hatch(this.tp(p), c || P.INK, a, kind || 'diag', scale || 0.6); }
    text(s, u, v, size, color, font, a) {
      const c = this.g.c;
      c.save();
      c.transform(this.sx, 0, 0, 1, this.tx, this.y0);
      this.g.text(s, u, v, size, color || P.INK, font || 'slab', 'center', a);
      c.restore();
    }
    begin() { this.g.c.save(); this.g.c.transform(this.sx, 0, 0, 1, this.tx, this.y0); }
    end() { this.g.c.restore(); }
  }

  // ------------------------------------------------------------ eyes

  function drawEyes(F, st, W) {
    const [lx, ly] = st.look;
    const ew = 0.0833 * W, eh = 0.1667 * W, vc = 0.4167 * W;
    const op = clamp(st.eye_open, 0, 1.2);
    const wide = 1 + 0.32 * st.eye_wide;
    [0.2083 * W, 0.7917 * W].forEach(uc => {
      const u = uc + 0.035 * W * lx;
      const v = vc + 0.03 * W * ly;
      if (st.eye_happy > 0.5) {
        F.stroke(poly([[u - ew * 0.75, v - eh * 0.12], [u, v + eh * 0.32], [u + ew * 0.75, v - eh * 0.12]], false), 2.2);
        return;
      }
      const hh = eh * wide * Math.max(op, 0.09) / 2, hw = ew * wide / 2;
      F.fill(rect(u - hw, v - hh, u + hw, v + hh), P.INK);
      if (op > 0.5 && W > 0.3) {
        const s = 0.022 * W * wide;
        F.fill(rect(u + hw * 0.1, v + hh - s * 1.6, u + hw * 0.1 + s, v + hh - s * 0.6), '#FFFFFF', 0.85);
      }
    });
  }

  // ------------------------------------------------------------ outfits

  const hemOf = W => -0.075 * W;

  function outfitFront(F, st, W) {
    const o = st.outfit;
    const hem = hemOf(W);
    if (o === 'labcoat') {
      const top = 0.29 * W;
      const body = poly([[-0.03 * W, hem], [W + 0.03 * W, hem], [W + 0.03 * W, top], [0.69 * W, top],
        [0.5 * W, 0.075 * W], [0.31 * W, top], [-0.03 * W, top]]);
      F.fs(body, P.COAT);
      F.hatch(rect(0.72 * W, hem, W + 0.03 * W, top), 0.10, 'diag', null, 0.5);
      [-1, 1].forEach(s => {
        const cx = 0.5 * W;
        F.fs(poly([[cx + s * 0.19 * W, top], [cx + s * 0.005 * W, 0.085 * W], [cx + s * 0.26 * W, 0.17 * W], [cx + s * 0.235 * W, 0.235 * W]]), P.COAT_SHADE, 0.9);
      });
      [0.03 * W, -0.035 * W].forEach(v => F.fs(circle(0.5 * W, v, 0.017 * W), '#E9E4DA', 0.7));
      F.fs(rect(0.75 * W, 0.17 * W, 0.765 * W, 0.245 * W), '#3A62C4', 0.6);
      F.fs(rect(0.80 * W, 0.16 * W, 0.815 * W, 0.235 * W), P.TIE_RED, 0.6);
      F.fs(rect(0.70 * W, 0.04 * W, 0.87 * W, 0.175 * W), P.COAT, 0.8);
      F.line(0.70 * W, 0.155 * W, 0.87 * W, 0.155 * W, 0.6);
      F.fs(rect(0.10 * W, 0.115 * W, 0.27 * W, 0.17 * W), '#FFFFFF', 0.6);
      F.fill(rect(0.10 * W, 0.115 * W, 0.12 * W, 0.17 * W), P.ORANGE);
      F.text('OPUS', 0.197 * W, 0.128 * W, 0.034 * W, P.INK, 'slab');
      F.line(0.08 * W, -0.005 * W, 0.27 * W, -0.005 * W, 0.8);
    } else if (o === 'hoodie') {
      const top = 0.285 * W;
      const p = new Path2D();
      p.moveTo(-0.025 * W, hem);
      p.lineTo(W + 0.025 * W, hem);
      p.lineTo(W + 0.025 * W, top);
      p.lineTo(0.66 * W, top);
      p.quadraticCurveTo(0.5 * W, 0.20 * W, 0.34 * W, top);
      p.lineTo(-0.025 * W, top);
      p.closePath();
      F.fs(p, P.HOODIE);
      F.hatch(p, 0.10, 'cross', null, 0.45);
      const q = new Path2D();
      q.moveTo(0.33 * W, top);
      q.quadraticCurveTo(0.5 * W, 0.19 * W, 0.67 * W, top);
      F.stroke(q, 3.0, P.HOODIE_DARK);
      F.stroke(q, 0.8);
      F.fs(rect(-0.025 * W, hem, W + 0.025 * W, hem + 0.035 * W), P.HOODIE_DARK, 0.8);
      const k = poly([[0.22 * W, hem + 0.035 * W], [0.78 * W, hem + 0.035 * W], [0.71 * W, 0.105 * W], [0.29 * W, 0.105 * W]]);
      F.fs(k, P.HOODIE_LIGHT, 0.8);
      F.line(0.29 * W, 0.105 * W, 0.24 * W, hem + 0.04 * W, 0.6, P.HOODIE_DARK);
      F.stroke(poly([[0.30 * W, top + 0.005 * W], [0.5 * W, 0.075 * W], [0.70 * W, top + 0.005 * W]], false), 2.0, P.LANYARD);
      F.fs(rrect(0.43 * W, -0.02 * W, 0.57 * W, 0.085 * W, 0.01 * W), '#FFFFFF', 0.7);
      F.fill(rect(0.45 * W, 0.035 * W, 0.49 * W, 0.07 * W), P.ORANGE);
      F.line(0.45 * W, 0.015 * W, 0.55 * W, 0.015 * W, 0.5, P.INK_SOFT);
      F.line(0.45 * W, 0.0, 0.53 * W, 0.0, 0.5, P.INK_SOFT);
      [[0.43 * W, 0.40 * W], [0.57 * W, 0.61 * W]].forEach(([u0, u1]) => {
        F.stroke(poly([[u0, 0.235 * W], [u1, 0.13 * W]], false), 1.3, '#F3F1EC');
        F.fs(rect(u1 - 0.008 * W, 0.11 * W, u1 + 0.008 * W, 0.135 * W), P.INK_SOFT, 0.4);
      });
    } else if (o === 'uniform') {
      const top = 0.30 * W;
      F.fs(poly([[0.31 * W, top], [0.69 * W, top], [0.5 * W, 0.03 * W]]), P.SHIRT, 0.6);
      const tie = poly([[0.47 * W, 0.235 * W], [0.53 * W, 0.235 * W], [0.555 * W, 0.06 * W], [0.5 * W, 0.0], [0.445 * W, 0.06 * W]]);
      F.fs(tie, P.TIE_RED, 0.8);
      F.begin();
      F.g.clip(tie);
      for (let i = -3; i < 6; i++) {
        const v = 0.05 * W * i;
        F.g.stroke(poly([[0.42 * W, v], [0.6 * W, v + 0.07 * W]], false), 2.4, P.BLAZER_DARK);
      }
      F.end();
      F.fs(poly([[0.465 * W, 0.275 * W], [0.535 * W, 0.275 * W], [0.525 * W, 0.235 * W], [0.475 * W, 0.235 * W]]), P.TIE_RED, 0.8);
      [-1, 1].forEach(s => {
        F.fs(poly([[0.5 * W + s * 0.17 * W, top + 0.012 * W], [0.5 * W + s * 0.03 * W, 0.275 * W], [0.5 * W + s * 0.11 * W, 0.215 * W]]), P.SHIRT, 0.7);
      });
      const bl = poly([[-0.03 * W, hem], [W + 0.03 * W, hem], [W + 0.03 * W, top], [0.69 * W, top],
        [0.5 * W, 0.03 * W], [0.31 * W, top], [-0.03 * W, top]]);
      F.fs(bl, P.BLAZER);
      F.hatch(rect(0.7 * W, hem, W + 0.03 * W, top), 0.12, 'diag', null, 0.45);
      [-1, 1].forEach(s => {
        const cx = 0.5 * W;
        F.fs(poly([[cx + s * 0.19 * W, top], [cx + s * 0.005 * W, 0.04 * W], [cx + s * 0.25 * W, 0.15 * W], [cx + s * 0.225 * W, 0.23 * W]]), P.BLAZER_DARK, 0.8);
      });
      [-0.005 * W, -0.05 * W].forEach(v => F.fs(circle(0.5 * W, v, 0.016 * W), P.GOLD, 0.6));
      const cr = poly([[0.73 * W, 0.17 * W], [0.85 * W, 0.17 * W], [0.85 * W, 0.11 * W], [0.79 * W, 0.065 * W], [0.73 * W, 0.11 * W]]);
      F.fs(cr, P.TIE_RED, 0.6);
      F.stroke(cr, 1.0, P.GOLD);
      F.text('H', 0.79 * W, 0.098 * W, 0.05 * W, P.GOLD, 'slab');
      [0.085 * W, 0.915 * W].forEach(u => {
        F.fs(rect(u - 0.03 * W, hem, u + 0.03 * W, top + 0.012 * W), P.BACKPACK, 0.8);
        F.fs(rect(u - 0.036 * W, 0.08 * W, u + 0.036 * W, 0.11 * W), '#C9CBD1', 0.6);
      });
    }
  }

  function outfitBack(F, st, W) {
    const o = st.outfit;
    const hem = hemOf(W);
    if (o === 'labcoat') {
      const b = rect(-0.03 * W, hem, W + 0.03 * W, 0.31 * W);
      F.fs(b, P.COAT);
      F.hatch(b, 0.08, 'diag', null, 0.5);
      F.fs(rect(-0.03 * W, 0.255 * W, W + 0.03 * W, 0.33 * W), P.COAT_SHADE, 0.9);
      F.line(0.5 * W, hem, 0.5 * W, 0.04 * W, 0.8);
      F.fs(rect(0.24 * W, 0.045 * W, 0.76 * W, 0.09 * W), P.COAT, 0.8);
      [0.29 * W, 0.71 * W].forEach(u => F.fs(circle(u, 0.0675 * W, 0.013 * W), '#E9E4DA', 0.6));
    } else if (o === 'hoodie') {
      const b = rect(-0.025 * W, hem, W + 0.025 * W, 0.295 * W);
      F.fs(b, P.HOODIE);
      F.hatch(b, 0.10, 'cross', null, 0.45);
      F.fs(rect(-0.025 * W, hem, W + 0.025 * W, hem + 0.035 * W), P.HOODIE_DARK, 0.8);
      const hood = new Path2D();
      hood.moveTo(0.16 * W, 0.335 * W);
      hood.bezierCurveTo(0.15 * W, 0.20 * W, 0.30 * W, 0.075 * W, 0.5 * W, 0.045 * W);
      hood.bezierCurveTo(0.70 * W, 0.075 * W, 0.85 * W, 0.20 * W, 0.84 * W, 0.335 * W);
      hood.bezierCurveTo(0.70 * W, 0.37 * W, 0.30 * W, 0.37 * W, 0.16 * W, 0.335 * W);
      hood.closePath();
      F.fs(hood, P.HOODIE_LIGHT);
      F.hatch(hood, 0.10, 'diag', null, 0.4);
      const lining = new Path2D();
      lining.moveTo(0.22 * W, 0.33 * W);
      lining.bezierCurveTo(0.30 * W, 0.255 * W, 0.70 * W, 0.255 * W, 0.78 * W, 0.33 * W);
      lining.bezierCurveTo(0.66 * W, 0.355 * W, 0.34 * W, 0.355 * W, 0.22 * W, 0.33 * W);
      lining.closePath();
      F.fs(lining, P.HOODIE_DARK, 0.8);
      F.line(0.5 * W, 0.06 * W, 0.5 * W, 0.26 * W, 0.6, P.HOODIE_DARK);
    } else if (o === 'uniform') {
      F.fs(rect(-0.03 * W, hem, W + 0.03 * W, 0.31 * W), P.BLAZER);
      F.fs(rect(-0.03 * W, 0.265 * W, W + 0.03 * W, 0.33 * W), P.BLAZER_DARK, 0.8);
      const bp = rrect(0.13 * W, -0.05 * W, 0.87 * W, 0.42 * W, 0.08 * W);
      F.fs(bp, P.BACKPACK, 1.1);
      F.hatch(rect(0.6 * W, -0.05 * W, 0.87 * W, 0.42 * W), 0.12, 'diag', null, 0.4);
      const handle = new Path2D();
      handle.moveTo(0.42 * W, 0.415 * W);
      handle.bezierCurveTo(0.43 * W, 0.48 * W, 0.57 * W, 0.48 * W, 0.58 * W, 0.415 * W);
      F.stroke(handle, 2.2, P.BACKPACK_DARK);
      F.stroke(handle, 0.6);
      F.fs(rrect(0.23 * W, -0.02 * W, 0.77 * W, 0.17 * W, 0.05 * W), P.BACKPACK_DARK, 0.9);
      const zp = new Path2D();
      zp.moveTo(0.18 * W, 0.30 * W);
      zp.bezierCurveTo(0.22 * W, 0.38 * W, 0.78 * W, 0.38 * W, 0.82 * W, 0.30 * W);
      F.stroke(zp, 0.9);
      F.line(0.74 * W, 0.335 * W, 0.76 * W, 0.27 * W, 0.6);
      F.fs(rect(0.73 * W, 0.215 * W, 0.80 * W, 0.265 * W), P.ORANGE, 0.6);
      F.fill(rect(0.745 * W, 0.24 * W, 0.752 * W, 0.255 * W), P.INK);
      F.fill(rect(0.778 * W, 0.24 * W, 0.785 * W, 0.255 * W), P.INK);
    }
  }

  function outfitSide(F, st, W, D, backAtZero) {
    const o = st.outfit;
    const hem = hemOf(W);
    const ub = u => (backAtZero ? u : D - u);
    if (o === 'labcoat') {
      const b = rect(ub(-0.02 * W), hem, ub(D + 0.02 * W), 0.30 * W);
      F.fs(b, P.COAT);
      F.hatch(b, 0.14, 'diag', null, 0.5);
      F.line(ub(D * 0.5), hem, ub(D * 0.5), 0.29 * W, 0.6, P.INK_SOFT);
    } else if (o === 'hoodie') {
      const b = rect(ub(-0.02 * W), hem, ub(D + 0.02 * W), 0.29 * W);
      F.fs(b, P.HOODIE);
      F.hatch(b, 0.14, 'cross', null, 0.45);
      F.fs(rrect(ub(-0.075 * W), 0.08 * W, ub(0.07 * W), 0.39 * W, 0.06 * W), P.HOODIE_LIGHT);
    } else if (o === 'uniform') {
      F.fs(rect(ub(-0.02 * W), hem, ub(D + 0.02 * W), 0.30 * W), P.BLAZER);
      F.fs(rrect(ub(-0.16 * W), -0.05 * W, ub(0.02 * W), 0.42 * W, 0.05 * W), P.BACKPACK, 1.1);
      F.fs(rect(ub(0.02 * W), hem, ub(0.08 * W), 0.30 * W), P.BACKPACK, 0.8);
    }
  }

  // Opus's brass goggles: strap all round, lenses on the front face
  function goggles(F, st, W, H, kind) {
    const gd = clamp(st.goggles_down);
    const vs = lerp(H - 0.06 * W, 0.415 * W, gd);
    F.fs(rect(-0.01 * F.width, vs - 0.022 * W, F.width * 1.01, vs + 0.022 * W), '#4B3A36', 0.8);
    if (kind === 'back') F.fs(rrect(F.width * 0.44, vs - 0.035 * W, F.width * 0.56, vs + 0.035 * W, 0.01 * W), P.BRASS, 0.7);
    if (kind === 'front') {
      const vl = lerp(H - 0.025 * W, 0.415 * W, gd);
      [0.29 * W, 0.71 * W].forEach(u => {
        const u2 = lerp(u, u < 0.5 * W ? 0.2083 * W : 0.7917 * W, gd);
        F.fs(circle(u2, vl, 0.098 * W), P.BRASS, 1.0);
        F.fs(circle(u2, vl, 0.068 * W), P.GLASS, 0.8);
        F.fill(circle(u2, vl, 0.068 * W), P.GLASS_DEEP, 0.35 + 0.4 * gd);
        F.stroke(poly([[u2 - 0.035 * W, vl + 0.012 * W], [u2 - 0.005 * W, vl + 0.045 * W]], false), 1.4, '#FFFFFF');
        F.fs(circle(u2 + 0.075 * W, vl + 0.045 * W, 0.009 * W), P.BRASS_LIGHT, 0.4);
      });
      F.stroke(poly([[0.29 * W + 0.098 * W, vl], [0.71 * W - 0.098 * W, vl]], false), 2.2, P.BRASS);
    }
  }

  function glasses(F, st, W) {
    const ew = 0.0833 * W, eh = 0.1667 * W, vc = 0.4167 * W;
    const lx = 0.035 * W * st.look[0];
    const pw = 0.045 * W, ph = 0.032 * W;
    const frames = [0.2083 * W, 0.7917 * W].map(uc => {
      const u = uc + lx * 0.5;
      const r = rrect(u - ew / 2 - pw, vc - eh / 2 - ph, u + ew / 2 + pw, vc + eh / 2 + ph, 0.03 * W);
      F.fill(r, '#DDEBFF', 0.18);
      return [u, r];
    });
    frames.forEach(([, r]) => F.stroke(r, 2.6));
    F.line(frames[0][0] + ew / 2 + pw, vc + 0.03 * W, frames[1][0] - ew / 2 - pw, vc + 0.03 * W, 2.2);
    F.line(0, vc + 0.04 * W, frames[0][0] - ew / 2 - pw, vc + 0.03 * W, 1.6);
    F.line(W, vc + 0.04 * W, frames[1][0] + ew / 2 + pw, vc + 0.03 * W, 1.6);
    if (st.glint >= 0 && st.glint <= 1) {
      frames.forEach(([u, r]) => {
        F.begin();
        F.g.clip(r);
        const x = lerp(u - 0.15 * W, u + 0.15 * W, st.glint);
        F.g.fill(poly([[x - 0.02 * W, vc - 0.15 * W], [x + 0.015 * W, vc - 0.15 * W], [x + 0.045 * W, vc + 0.15 * W], [x + 0.01 * W, vc + 0.15 * W]]), '#FFFFFF', 0.9);
        F.end();
      });
    }
  }

  // ------------------------------------------------------------ props

  const TODO = ['Exit pod', 'Wake Sonnet 5.5', 'Wake Haiku 5.5', 'Check on Fable 5.5'];

  // clipboard centred at clawd-local (x, y)
  function drawClipboard(g, st, x, y, W, sx) {
    const cw = 0.36 * W, ch = 0.46 * W;
    const c = g.c;
    c.save();
    c.translate(x, y);
    c.scale(sx === undefined ? 1 : sx, 1);
    c.rotate(deg(4));
    const x0 = -cw / 2, y0 = -ch / 2;
    g.fs(rrect(x0, y0, x0 + cw, y0 + ch, 0.03 * W), '#A8734A', 1.1);
    g.hatch(rrect(x0, y0, x0 + cw, y0 + ch, 0.03 * W), P.INK, 0.12, 'diag', 0.3);
    const px0 = x0 + 0.03 * W, py0 = y0 + 0.03 * W, px1 = x0 + cw - 0.03 * W, py1 = y0 + ch - 0.06 * W;
    g.fs(rect(px0, py0, px1, py1), P.PAPER, 0.7);
    const items = st.items || TODO;
    const lh = 0.068 * W;
    if (sx > 0) {
      g.text('TO-DO', 0, py1 - 0.055 * W, 0.05 * W, P.INK, 'hand');
      items.forEach((it, i) => {
        const yy = py1 - 0.11 * W - i * lh;
        const bx = px0 + 0.02 * W;
        g.stroke(rect(bx, yy - 0.004 * W, bx + 0.028 * W, yy + 0.024 * W), 0.7);
        g.text(it, bx + 0.042 * W, yy, 0.035 * W, P.INK, 'hand', 'left');
        const p = clamp(st.checks[i] || 0);
        if (p > 0) {
          const a = [bx + 0.003 * W, yy + 0.012 * W], b = [bx + 0.013 * W, yy - 0.002 * W], cc = [bx + 0.042 * W, yy + 0.04 * W];
          let pts;
          if (p < 0.4) { const t = p / 0.4; pts = [a, [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]]; }
          else { const t = (p - 0.4) / 0.6; pts = [a, b, [lerp(b[0], cc[0], t), lerp(b[1], cc[1], t)]]; }
          g.stroke(poly(pts, false), 1.6, '#C8402F');
        }
      });
      if (st.circle4 > 0) {
        const yy = py1 - 0.11 * W - 3 * lh + 0.01 * W;
        const rx = 0.15 * W, ry = 0.028 * W, cxx = px0 + 0.045 * W + rx * 0.95;
        const sweep = clamp(st.circle4) * 1.1;
        const pts = [];
        for (let k = 0; k <= 40; k++) {
          const a = PI * 0.9 + 2 * PI * sweep * k / 40;
          pts.push([cxx + rx * Math.cos(a), yy + ry * Math.sin(a) + 0.004 * W * k / 40]);
        }
        g.stroke(poly(pts, false), 1.4, '#C8402F');
      }
    }
    if (st.pencil >= 0 && sx > 0) {
      const i = st.pencil;
      let yy = py1 - 0.11 * W - i * lh;
      let tipx = px0 + 0.05 * W + 0.01 * W * Math.sin(i * 40);
      c.save();
      c.translate(tipx, yy + 0.01 * W);
      c.rotate(deg(-35));
      const L = 0.30 * W, R = 0.016 * W;
      g.fs(poly([[0, 0], [0.035 * W, R], [0.035 * W, -R]]), '#F2D3A6', 0.6);
      g.fill(poly([[0, 0], [0.012 * W, R * 0.35], [0.012 * W, -R * 0.35]]), '#C8402F');
      g.fs(rect(0.035 * W, -R, L, R), '#C8402F', 0.7);
      g.fs(rect(L, -R, L + 0.03 * W, R), '#E8A0A8', 0.6);
      c.restore();
    }
    g.fs(rrect(-0.08 * W, y0 + ch - 0.075 * W, 0.08 * W, y0 + ch - 0.005 * W, 0.015 * W), '#C9CDD3', 0.9);
    g.fs(circle(0, y0 + ch - 0.03 * W, 0.012 * W), '#8E949E', 0.5);
    c.restore();
  }

  // open laptop, lid facing the camera (Sonnet holds it in front)
  function drawLaptop(g, st, x, y, W, t) {
    const lw = 0.50 * W, lh = 0.33 * W;
    const o = clamp(st.laptop_open);
    const jig = 0.004 * W * Math.sin(t * 60) * st.typing;
    const c = g.c;
    c.save();
    c.translate(x, y + jig);
    g.fs(rrect(-lw / 2 - 0.02 * W, -0.035 * W, lw / 2 + 0.02 * W, 0, 0.01 * W), '#9AA0AA', 0.9);
    const hgt = lh * (0.12 + 0.88 * o);
    const lid = rrect(-lw / 2, 0, lw / 2, hgt, 0.02 * W);
    g.fillShader(lid, g.linGrad(-lw / 2, 0, lw / 2, hgt, ['#E2E5EA', '#B9BEC6']));
    g.stroke(lid, 1.0);
    if (o > 0.6) {
      const k = (o - 0.6) / 0.4;
      g.fs(rrect(-0.17 * W, hgt * 0.52, -0.05 * W, hgt * 0.80, 0.02 * W), P.ORANGE, 0.6, k);
      g.fill(rect(-0.14 * W, hgt * 0.63, -0.128 * W, hgt * 0.71), P.INK, k);
      g.fill(rect(-0.093 * W, hgt * 0.63, -0.081 * W, hgt * 0.71), P.INK, k);
      g.fs(rrect(0.04 * W, hgt * 0.22, 0.19 * W, hgt * 0.42, 0.015 * W), P.INK, 0.4, k);
      g.text('LGTM', 0.115 * W, hgt * 0.27, 0.042 * W, P.CODE_GREEN, 'mono', 'center', k);
      g.fs(circle(0.12 * W, hgt * 0.72, 0.045 * W), '#3E6FD8', 0.5, k);
      g.text('</>', 0.12 * W, hgt * 0.72 - 0.014 * W, 0.034 * W, '#FFFFFF', 'mono', 'center', k);
      g.fs(rrect(-0.2 * W, hgt * 0.12, -0.08 * W, hgt * 0.36, 0.01 * W), '#F2EFE6', 0.4, k);
      g.text('✓', -0.14 * W, hgt * 0.15, 0.06 * W, P.CODE_GREEN, 'sans', 'center', k);
    }
    c.restore();
  }

  function clipboardOffset(st) {
    const W = st.W, a = 0.1667 * W, c = Math.cos(st.theta);
    return [-(W / 2 + a * 0.55) * c - 0.05 * W * c, 0.1667 * W + 0.27 * W + st.arm_l * 0.24 * W];
  }

  // ------------------------------------------------------------ main

  function draw(g, st, t) {
    t = t || 0;
    if (st.alpha <= 0.01) return;
    const W = st.W, H = 0.6667 * W, D = 0.62 * W, LEG = 0.1667 * W;
    const th = st.theta, c = Math.cos(th), s = Math.sin(th);
    const bob = Math.abs(Math.sin(st.walk)) * 0.035 * W * st.walk_amp;

    if (st.shadow) {
      const sw = (W * Math.abs(c) + D * Math.abs(s)) * 0.62;
      const k = 1 / (1 + 2.2 * Math.max(st.lift, 0) / W);
      g.shadow(st.x, st.y, sw * k, 0.07 * W * k, 0.26 * k * st.alpha);
    }

    const cv = g.c;
    cv.save();
    if (st.alpha < 1) cv.globalAlpha *= st.alpha;
    cv.translate(st.x, st.y + st.lift + bob);
    const cy = LEG + H / 2;
    if (st.tilt) {
      cv.translate(0, cy);
      cv.rotate(deg(-st.tilt));
      cv.translate(0, -cy);
    }
    if (st.sq !== 1) cv.scale(st.sq, 1 / st.sq);

    const items = [];

    LEGS.forEach((lx, i) => {
      const xc = lx * W * c;
      const dep = -lx * W * s - 0.001;
      const ph = st.walk + (i === 0 || i === 2 ? 0 : PI);
      const lift = Math.max(0, Math.sin(ph)) * 0.08 * W * st.walk_amp;
      const swing = Math.cos(ph) * 0.035 * W * st.walk_amp * (s >= 0 ? 1 : -1) * Math.min(1, Math.abs(s) + 0.3);
      const lwid = 0.0833 * W * (Math.abs(c) + 0.9 * Math.abs(s));
      items.push([dep - 10, () => g.fs(rrect(xc + swing - lwid / 2, lift - bob * 0.5, xc + swing + lwid / 2, LEG + 0.04 * W, 0.012 * W), P.ORANGE_DARK, 1.0)]);
    });

    const faces = [];
    if (c > 0.02) faces.push(['front', c * D / 2, new Face(g, c, -W / 2 * c + D / 2 * s, LEG, W, 'front')]);
    if (c < -0.02) faces.push(['back', -c * D / 2, new Face(g, -c, W / 2 * c - D / 2 * s, LEG, W, 'back')]);
    if (s > 0.02) faces.push(['side_r', s * W / 2, new Face(g, s, -W / 2 * c - D / 2 * s, LEG, D, 'side', SIDE)]);
    if (s < -0.02) faces.push(['side_l', -s * W / 2, new Face(g, -s, W / 2 * c + D / 2 * s, LEG, D, 'side', SIDE)]);

    faces.forEach(([kind, dep, F]) => {
      items.push([dep, () => {
        const body = rrect(0, 0, F.width, H, 0.035 * W);
        const base = P.ORANGE;
        F.fill(body, base);
        g.fillShader(F.tp(body), g.linGrad(0, H, 0, 0, [shade(base, 1.10 * F.bright), shade(base, 0.93 * F.bright)]), 0.55);
        if (kind.startsWith('side')) F.hatch(body, 0.13, 'diag', null, 0.5);
        else F.hatch(rect(0, 0, F.width, H * 0.45), 0.07, 'diag', null, 0.5);
        if (st.screen_glow > 0 && kind === 'front') g.fill(F.tp(rect(0.05 * W, H * 0.25, W * 0.95, H * 0.95)), P.SCREEN, 0.10 * st.screen_glow);
        if (kind === 'front') {
          drawEyes(F, st, W);
          outfitFront(F, st, W);
          if (st.outfit === 'hoodie') glasses(F, st, W);
        } else if (kind === 'back') outfitBack(F, st, W);
        else outfitSide(F, st, W, D, kind === 'side_r');
        if (st.outfit === 'labcoat') goggles(F, st, W, H, kind === 'front' ? 'front' : kind === 'back' ? 'back' : 'side');
        if (st.frozen > 0) {
          F.fill(body, '#DCEAF7', 0.55 * st.frozen);
          F.hatch(body, 0.25 * st.frozen, 'cross', '#FFFFFF', 0.35);
          for (let i = 0; i < 9; i++) {
            const u = CL.gfx.hash01('fz', i, kind) * F.width, v = CL.gfx.hash01('fzv', i, kind) * H;
            F.fill(circle(u, v, (0.01 + 0.02 * CL.gfx.hash01('fr', i)) * W), '#FFFFFF', 0.7 * st.frozen);
          }
        }
        F.stroke(body, 1.25);
        if (st.rim > 0) {
          g.soft(F.tp(rect(0, H * 0.55, F.width, H)), P.GLOW, 0.02 * W, 0.18 * st.rim, 'lighter');
          g.stroke(F.tp(poly([[0, H], [F.width, H]], false)), 2.2, P.GLOW, 0.8 * st.rim);
        }
      }]);
    });

    const a = 0.1667 * W;
    [[-1, st.arm_l], [1, st.arm_r]].forEach(([side, raise]) => {
      const xa = side * (W / 2 + a / 2 - 0.01 * W);
      const r = clamp(raise, -0.5, 1.6);
      const xc = xa * c, dep = -xa * s;
      const yc = LEG + 0.25 * W + r * 0.24 * W;
      const sg = c >= 0 ? 1 : -1;
      const ang = side * r * 38 * sg;
      const aw = a * (Math.abs(c) + 0.85 * Math.abs(s));
      items.push([dep, () => {
        cv.save();
        cv.translate(xc - side * a * 0.45 * Math.abs(c) * sg, yc);
        cv.rotate(deg(-ang));
        const dirx = side * sg;
        const x0 = -aw / 2 + side * a * 0.45 * Math.abs(c) * sg;
        g.fs(rrect(x0, -a / 2, x0 + aw, a / 2, 0.02 * W), dep >= 0 ? P.ORANGE : P.ORANGE_DARK, 1.0);
        const sleeve = { labcoat: P.COAT, hoodie: P.HOODIE, uniform: P.BLAZER }[st.outfit];
        if (sleeve && Math.abs(c) > 0.15) {
          const sl = aw * 0.58;
          const sp = dirx > 0
            ? rrect(x0 - 0.02 * W, -a / 2 - 0.012 * W, x0 + sl, a / 2 + 0.012 * W, 0.02 * W)
            : rrect(x0 + aw - sl, -a / 2 - 0.012 * W, x0 + aw + 0.02 * W, a / 2 + 0.012 * W, 0.02 * W);
          g.fs(sp, sleeve, 1.0);
          const cuff = { hoodie: P.HOODIE_DARK, uniform: P.SHIRT }[st.outfit];
          if (cuff) {
            const cx0 = dirx > 0 ? x0 + sl - 0.03 * W : x0 + aw - sl;
            g.fs(rect(cx0, -a / 2 - 0.012 * W, cx0 + 0.03 * W, a / 2 + 0.012 * W), cuff, 0.7);
          }
        }
        cv.restore();
      }]);
    });

    if (st.prop === 'clipboard') {
      const [cx_, cy_] = clipboardOffset(st);
      const dep = (W / 2) * s + 0.2 * W * c;
      items.push([dep + 0.5, () => { if (c > 0) drawClipboard(g, st, cx_, cy_, W, Math.max(0.25, c)); }]);
    } else if (st.prop === 'laptop') {
      const dep = 0.5 * D * c + 0.1;
      items.push([dep, () => {
        if (st.laptop_open > 0 && c > 0.2) drawLaptop(g, st, 0, LEG + 0.02 * W, W, t);
        else if (c > -0.5) {
          const xa = -(W / 2 + 0.02 * W) * c;
          cv.save();
          cv.translate(xa, LEG + 0.16 * W);
          cv.rotate(deg(-8));
          const hw = 0.20 * W * Math.max(Math.abs(c), 0.4);
          g.fs(rrect(-hw, -0.025 * W, hw, 0.025 * W, 0.01 * W), '#B9BEC6', 1.0);
          cv.restore();
        }
      }]);
    } else if (typeof st.prop === 'function') {
      items.push([0.5 * D * c + 0.2, () => st.prop(g, st, { W, H, LEG, c, s, t })]);
    }

    items.sort((p, q) => p[0] - q[0]);
    items.forEach(it => it[1]());

    if (st.sweat > 0) {
      [[-0.56, 0.86], [0.6, 0.78]].forEach(([u, v], i) => {
        const x = u * W, y = LEG + v * H;
        const drop = new Path2D();
        drop.moveTo(x, y + 0.07 * W);
        drop.quadraticCurveTo(x + 0.035 * W, y, x, y - 0.012 * W);
        drop.quadraticCurveTo(x - 0.035 * W, y, x, y + 0.07 * W);
        g.fs(drop, '#BFE3F5', 0.9, st.sweat * (i ? 0.8 : 1));
      });
    }
    cv.restore();
  }

  const height = W => 0.8333 * W;

  function clipboardWorld(st) {
    const [ox, oy] = clipboardOffset(st);
    const bob = Math.abs(Math.sin(st.walk)) * 0.035 * st.W * st.walk_amp;
    return [st.x + ox * st.sq, st.y + st.lift + bob + oy / st.sq];
  }

  CL.Clawd = { CS, draw, drawClipboard, drawLaptop, clipboardWorld, height, TODO, LEGS };
})(window.CL = window.CL || {});
