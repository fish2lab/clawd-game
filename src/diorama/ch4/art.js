/* Chapter 4 · 蒸馏: the models, textures, bubble icons and the fish's speech
   bubble. Everything here is drawn with CL.Kit parts and CL.Ink materials, colours
   from CL.P only. The layout (where things stand) lives in level.js.

   Models face +z unless noted; the whale and the fish face +x (head at +x). */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const K = CL.Kit;
  const TX = CL.Tex;
  const X = CL.gfx;
  const { ink } = CL.Ink;
  const { rect, rrect, circle, ellipse, poly, arcPath, deg, mix } = X;
  const PI = Math.PI;

  // CL.gfx.mix gives an [r, g, b] array, which THREE.Color ignores: mixc gives '#rrggbb'
  const mixc = (a, b, t) => { const v = mix(a, b, t); return '#' + new T.Color(v[0], v[1], v[2]).getHexString(); };
  const NO_GLOW = new T.Color(0, 0, 0);   // emissive off
  // a fresh material (K.m(colour) is shared per colour, so anything that animates needs its own)
  const own = (c, o) => ink(c, Object.assign({}, o || {}));
  const glowMat = (c, e) => ink(c, { flat: true, lit: true, emissive: e || mixc(c, P.NIGHT, 0.75) });
  const onLayer1 = o => { o.traverse(m => m.layers.set(1)); return o; };

  // ------------------------------------------------------------ whale (teacher)

  // navy body, cream belly and jaw, Clawd slit eyes, a blowhole; head at +x. Origin at the body centre.
  // returns { root, body, jaw, tail, eyes, blowhole: Vector3 (local), mouth: Vector3 (local) }
  function whale() {
    const root = new T.Group();
    const body = new T.Group();
    root.add(body);
    const sph = new T.SphereGeometry(1, 28, 18);
    const hull = K.mesh(sph, K.m(P.WHALE), 0, 0, 0);
    hull.scale.set(0.9, 0.36, 0.34);
    body.add(hull);
    // a pale throat patch under the head that shows when the jaw drops
    const throat = K.mesh(sph, K.m(P.WHEEL_RED_DARK), 0.5, -0.17, 0);
    throat.scale.set(0.38, 0.1, 0.24);
    body.add(throat);
    // lower jaw / belly: cream, hinged near the middle so the front drops open
    const jaw = new T.Group();
    jaw.position.set(-0.32, -0.16, 0);
    body.add(jaw);
    const jm = K.mesh(new T.SphereGeometry(1, 24, 10, 0, PI * 2, PI / 2, PI / 2), K.m(P.WHALE_BELLY), 0.62, 0.03, 0);
    jm.scale.set(0.62, 0.17, 0.29);
    jaw.add(jm);
    // pleats along the jaw
    for (let i = 0; i < 4; i++) {
      const pl = K.box(0.7 - i * 0.12, 0.012, 0.012, P.POD_DEEP, 0.62, -0.03 - i * 0.032, 0.0, { flat: true });
      pl.position.z = 0;
      jaw.add(pl);
    }
    // eyes: the Clawd slit, one on each side of the head
    const eyes = [-1, 1].map(s => {
      const e = K.box(0.05, 0.11, 0.012, P.INK, 0.56, 0.05, s * 0.268, { flat: true });
      e.rotation.y = s * 0.5;
      body.add(e);
      return e;
    });
    // blowhole on top
    const bh = K.cyl(0.045, 0.05, 0.03, P.NAVY_DARK, 0.3, 0.335, 0, 12);
    body.add(bh);
    // flippers
    [-1, 1].forEach(s => {
      const f = K.box(0.32, 0.028, 0.12, P.WHALE, 0.2, -0.2, s * 0.31);
      f.rotation.x = s * 0.55;
      f.rotation.y = s * 0.35;
      body.add(f);
    });
    // tail: a tapered stalk and horizontal flukes, hinged at the back of the body
    const tail = new T.Group();
    tail.position.set(-0.78, 0.0, 0);
    body.add(tail);
    const stalk = K.cyl(0.07, 0.2, 0.55, P.WHALE, -0.22, 0, 0, 14);
    stalk.rotation.z = -PI / 2;
    tail.add(stalk);
    [-1, 1].forEach(s => {
      const fl = K.box(0.26, 0.03, 0.34, P.WHALE, -0.6, 0.0, s * 0.15);
      fl.rotation.y = -s * 0.5;
      tail.add(fl);
    });
    return { root, body, jaw, tail, eyes, blowhole: new T.Vector3(0.3, 0.36, 0), mouth: new T.Vector3(0.78, -0.12, 0) };
  }

  // ------------------------------------------------------------ fish (student)

  // a small terracotta box with a tail and slit eyes on both sides; head at +x
  function fish() {
    const root = new T.Group();
    const body = new T.Group();
    root.add(body);
    body.add(K.box(0.26, 0.17, 0.16, P.ORANGE, 0, 0, 0));
    const tail = new T.Group();
    tail.position.set(-0.13, 0, 0);
    body.add(tail);
    const tg = new T.ConeGeometry(0.1, 0.16, 3);
    const tm = K.mesh(tg, K.m(P.ORANGE_DARK), -0.07, 0, 0);
    tm.rotation.z = PI / 2;
    tm.scale.set(1, 1, 0.3);
    tail.add(tm);
    body.add(K.box(0.08, 0.05, 0.02, P.ORANGE_DARK, 0.0, 0.1, 0));
    const eyes = [];
    [-1, 1].forEach(s => [0.03, 0.09].forEach(x => {
      const e = K.box(0.022, 0.045, 0.006, P.INK, x, 0.015, s * 0.082, { flat: true });
      body.add(e);
      eyes.push(e);
    }));
    return { root, body, tail, eyes };
  }

  // ------------------------------------------------------------ painted textures

  // the narrow ruler stuck on the tank glass: ticks and the FULL line
  function levelScale(h, full) {
    return TX.tex(TX.paint(0.14, h, 400, g => {
      g.fs(rect(0, 0, 0.14, h), P.POD, 0.8);
      for (let y = 0.1; y < h; y += 0.1) g.line(0.0, y, Math.round(y * 10) % 5 ? 0.05 : 0.08, y, 0.5);
      g.fill(rect(0, full - 0.012, 0.14, full + 0.012), P.ALARM);
      g.text('FULL', 0.07, full + 0.03, 0.045, P.INK, 'slab');
    }, { line: 1.6 }));
  }

  // label strip: dark text on cream, slab
  function label(text, w, h, size) {
    return TX.tex(TX.paint(w, h, 300, g => {
      g.fs(rect(0, 0, w, h), P.PAPER, 1.0);
      g.stroke(rect(w * 0.03, h * 0.14, w * 0.97, h * 0.86), 0.5);
      g.text(text, w / 2, h * 0.3, size || h * 0.5, P.INK, 'slab');
    }));
  }

  // stencil-ish label straight on a navy panel
  function panelText(text, w, h, color) {
    return TX.tex(TX.paint(w, h, 300, g => {
      g.text(text, w / 2, h * 0.25, h * 0.6, color || P.SAFETY, 'slab');
    }));
  }

  // the fader plate: navy, five slots with six ticks each (0..5), the FISH label and the T dial
  // slot x positions (plate-local, from the left edge) and the slot run [v0, v1] (from the front edge)
  function faderPlate(w, d, slots, run, tx) {
    return TX.tex(TX.paint(w, d, 360, g => {
      g.fill(rect(0, 0, w, d), P.NAVY);
      g.fillShader(rect(0, 0, w, d), g.linGrad(0, 0, w, 0, [P.NAVY_LIGHT, P.NAVY, P.NAVY_DARK], [0, 0.5, 1]), 0.6);
      g.stroke(rect(0.02, 0.02, w - 0.02, d - 0.02), 0.6, P.NAVY_LIGHT);
      // the plate's y runs from the front edge (0) to the back edge (d); paint top = back
      slots.forEach(sx => {
        g.fs(rrect(sx - 0.018, run[0] - 0.02, sx + 0.018, run[1] + 0.02, 0.016), P.INK, 0.6);
        for (let k = 0; k <= 5; k++) {
          const y = run[0] + (run[1] - run[0]) * k / 5;
          g.line(sx - 0.07, y, sx - 0.035, y, k === 0 || k === 5 ? 1.0 : 0.6, P.POD);
          g.line(sx + 0.035, y, sx + 0.07, y, k === 0 || k === 5 ? 1.0 : 0.6, P.POD);
        }
      });
      g.text('FISH', (slots[0] + slots[slots.length - 1]) / 2, 0.02, 0.05, P.ORANGE_LIGHT, 'slab');
      // T dial: five marks on an arc, a red T
      const cx = tx, cy = d * 0.5, r = 0.1;
      g.fs(circle(cx, cy, r * 1.18), P.NAVY_DARK, 0.6);
      for (let k = 0; k < 5; k++) {
        const a = deg(210 - k * 60);
        g.line(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95, cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 1.15, 1.2, k === 4 ? P.ALARM : P.POD);
      }
      g.text('T', cx, cy - r * 1.62, 0.055, P.ALARM, 'slab');
    }, { line: 1.6 }));
  }

  // dial face for the SHUT / OPEN indicator under the reactor
  function shutOpenFace() {
    return TX.tex(TX.paint(1, 1, 256, g => {
      g.fs(circle(0.5, 0.5, 0.48), P.POD, 1.4);
      g.stroke(arcPath(0.5, 0.5, 0.34, 120, 60), 5, P.ALARM);
      g.stroke(arcPath(0.5, 0.5, 0.34, 0, 60), 5, P.CODE_GREEN);
      g.text('SHUT', 0.27, 0.2, 0.13, P.INK, 'slab');
      g.text('OPEN', 0.73, 0.2, 0.13, P.INK, 'slab');
      g.fs(circle(0.5, 0.5, 0.06), P.INK, 0.5);
    }, { line: 3 }));
  }

  // a scale plate behind a condenser stem: five ticks
  function stemScale(h, step) {
    return TX.tex(TX.paint(0.1, h, 400, g => {
      g.fs(rect(0, 0, 0.1, h), P.POD, 0.6);
      for (let k = 1; k <= 5; k++) g.line(0.0, 0.03 + k * step, 0.1, 0.03 + k * step, k === 5 ? 1.0 : 0.6);
    }, { line: 1.6 }));
  }

  // masking tape over a pod plate's number
  function tape(w, h) {
    return TX.tex(TX.paint(w, h, 400, g => {
      const p = poly([[0.01, 0.02], [w - 0.02, 0.0], [w, h - 0.03], [0.02, h]]);
      g.fs(p, P.BRASS_LIGHT, 0.4);
      g.hatch(p, P.INK, 0.12, 'vert', 0.3);
      g.line(w * 0.25, h * 0.5, w * 0.75, h * 0.5, 0.9, P.INK_SOFT);
    }, { line: 1.6 }));
  }

  // Opus's notebook: a whale with five bars, a fish with only one, a question mark
  function notebook() {
    return TX.tex(TX.paint(0.6, 0.42, 600, g => {
      g.fs(rect(0, 0, 0.6, 0.42), P.PAPER, 0.8);
      g.line(0.3, 0.0, 0.3, 0.42, 0.6, P.WALL_LINE);
      for (let y = 0.05; y < 0.42; y += 0.05) g.line(0.02, y, 0.58, y, 0.3, P.SKY);
      // left page: the whale and its song
      const wh = ellipse(0.13, 0.12, 0.09, 0.04);
      g.fs(wh, P.WHALE, 0.6);
      g.fs(poly([[0.04, 0.12], [0.015, 0.15], [0.02, 0.09]]), P.WHALE, 0.5);
      [2, 5, 1, 3, 1].forEach((v, i) => g.fs(rect(0.06 + i * 0.04, 0.2, 0.085 + i * 0.04, 0.2 + v * 0.03), P.SCREEN, 0.5));
      // right page: the fish with only the loudest note, and a question mark
      g.fs(rrect(0.38, 0.1, 0.44, 0.14, 0.006), P.ORANGE, 0.5);
      g.fs(poly([[0.38, 0.12], [0.36, 0.14], [0.36, 0.1]]), P.ORANGE_DARK, 0.4);
      [0, 5, 0, 0, 0].forEach((v, i) => { if (v) g.fs(rect(0.34 + i * 0.04, 0.2, 0.365 + i * 0.04, 0.2 + v * 0.03), P.ORANGE, 0.5); else g.line(0.34 + i * 0.04, 0.2, 0.365 + i * 0.04, 0.2, 0.6); });
      g.text('?', 0.53, 0.07, 0.08, P.TIE_RED, 'hand');
    }, { line: 1.4 }));
  }

  // ------------------------------------------------------------ the laptop readout (Sonnet at the data port)

  const PICTS = ['note', 'star', 'heart', 'eye', 'tap'];
  function pict(g, kind, x, y, s, col) {
    if (kind === 'note') { g.fill(ellipse(x - s * 0.15, y - s * 0.25, s * 0.2, s * 0.14, -20), col); g.line(x + s * 0.03, y - s * 0.22, x + s * 0.03, y + s * 0.4, 1.4, col); g.line(x + s * 0.03, y + s * 0.4, x + s * 0.3, y + s * 0.25, 1.4, col); }
    else if (kind === 'star') { const pts = []; for (let i = 0; i < 10; i++) { const a = deg(90 + i * 36), r = i % 2 ? s * 0.2 : s * 0.45; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } g.fill(poly(pts), col); }
    else if (kind === 'heart') { const p = new Path2D(); p.moveTo(x, y - s * 0.4); p.bezierCurveTo(x - s * 0.55, y, x - s * 0.3, y + s * 0.5, x, y + s * 0.18); p.bezierCurveTo(x + s * 0.3, y + s * 0.5, x + s * 0.55, y, x, y - s * 0.4); g.fill(p, col); }
    else if (kind === 'eye') { g.stroke(ellipse(x, y, s * 0.45, s * 0.24), 1.4, col); g.fill(rect(x - s * 0.06, y - s * 0.15, x + s * 0.06, y + s * 0.15), col); }
    else if (kind === 'tap') { g.stroke(circle(x, y, s * 0.14), 1.4, col); g.stroke(circle(x, y, s * 0.36), 1.4, col); }
  }

  // bars: five heights in notches (0..5, fractional), t: the still's T setting
  function paintReadout(cv, bars, t) {
    const w = 1.3, h = 0.85;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    const g = new X.G(c, cv.width, cv.height, new X.Cam(w / 2, h / 2, h));
    g.zoomk = 2.0 / (cv.height / h * 0.016);
    g.beginWorld();
    g.fs(rrect(0.01, 0.01, w - 0.01, h - 0.01, 0.05), P.NAVY_DARK, 1.6);
    g.fill(rrect(0.05, 0.05, w - 0.05, h - 0.05, 0.03), P.NIGHT);
    g.text('FABLE 5.5', 0.1, h - 0.13, 0.065, P.SCREEN, 'slab', 'left');
    g.text('T ' + t, w - 0.1, h - 0.13, 0.065, P.ALARM, 'slab', 'right');
    const x0 = 0.18, dx = 0.22, y0 = 0.17, step = 0.09;
    for (let k = 1; k <= 5; k++) g.line(0.1, y0 + k * step, w - 0.1, y0 + k * step, 0.5, P.NAVY_LIGHT);
    g.line(0.1, y0, w - 0.1, y0, 0.9, P.NAVY_LIGHT);
    bars.forEach((v, i) => {
      const x = x0 + i * dx;
      if (v > 0.12) {
        const r = rect(x - 0.06, y0, x + 0.06, y0 + v * step);
        g.fill(r, P.GLOW);
        g.fill(rect(x - 0.06, y0 + v * step - 0.012, x + 0.06, y0 + v * step), P.GLOW_CORE);
      }
      pict(g, PICTS[i], x, 0.095, 0.1, P.SCREEN);
    });
    g.end();
  }

  // ------------------------------------------------------------ bubble icons (registered once)

  const ICONS = {
    // a small fish
    'ch4.fish': (c, s) => {
      c.fillStyle = P.ORANGE;
      c.fillRect(0.3 * s, 0.38 * s, 0.38 * s, 0.26 * s);
      c.strokeRect(0.3 * s, 0.38 * s, 0.38 * s, 0.26 * s);
      c.beginPath(); c.moveTo(0.3 * s, 0.51 * s); c.lineTo(0.14 * s, 0.38 * s); c.lineTo(0.14 * s, 0.64 * s); c.closePath();
      c.fillStyle = P.ORANGE_DARK; c.fill(); c.stroke();
      c.fillStyle = P.INK; c.fillRect(0.56 * s, 0.44 * s, 0.04 * s, 0.08 * s);
    },
    // a water drop with an arrow down: not enough water
    'ch4.drop': (c, s) => {
      c.fillStyle = P.WATER;
      c.beginPath(); c.moveTo(0.38 * s, 0.14 * s); c.bezierCurveTo(0.22 * s, 0.4 * s, 0.2 * s, 0.56 * s, 0.38 * s, 0.62 * s);
      c.bezierCurveTo(0.56 * s, 0.56 * s, 0.54 * s, 0.4 * s, 0.38 * s, 0.14 * s); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0.72 * s, 0.3 * s); c.lineTo(0.72 * s, 0.8 * s); c.stroke();
      c.beginPath(); c.moveTo(0.6 * s, 0.68 * s); c.lineTo(0.72 * s, 0.8 * s); c.lineTo(0.84 * s, 0.68 * s); c.stroke();
    },
    // a laptop: this needs Sonnet's laptop
    'ch4.plug': (c, s) => {
      c.strokeRect(0.26 * s, 0.24 * s, 0.48 * s, 0.32 * s);
      c.fillStyle = P.SCREEN; c.fillRect(0.3 * s, 0.28 * s, 0.4 * s, 0.24 * s);
      c.beginPath(); c.moveTo(0.16 * s, 0.7 * s); c.lineTo(0.84 * s, 0.7 * s); c.lineTo(0.74 * s, 0.6 * s); c.lineTo(0.26 * s, 0.6 * s); c.closePath(); c.stroke();
    },
  };
  function registerIcons() {
    if (TX.__ch4Icons) return;
    TX.__ch4Icons = true;
    const base = TX.icon;
    TX.icon = function (kind, size) {
      const f = ICONS[kind];
      if (!f) return base(kind, size);
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const c = cv.getContext('2d');
      c.lineWidth = size * 0.07;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = P.INK;
      c.fillStyle = P.INK;
      f(c, size);
      return cv;
    };
  }

  // ------------------------------------------------------------ speech (the fish's lines, in-world English)

  function injectStyle() {
    if (document.getElementById('ch4-style')) return;
    const st = document.createElement('style');
    st.id = 'ch4-style';
    st.textContent = `
      .ch4-say { position: absolute; left: 0; top: 0; z-index: 5; pointer-events: none; white-space: nowrap;
        background: var(--paper); color: var(--ink); border: 3px solid var(--ink); border-radius: 999px;
        padding: 6px 15px 7px; font: 700 19px/1.1 "Zilla Slab", Rockwell, Georgia, serif; letter-spacing: 0.01em; }
      .ch4-say::after { content: ""; position: absolute; left: 22px; bottom: -11px; width: 14px; height: 14px; background: var(--paper);
        border-right: 3px solid var(--ink); border-bottom: 3px solid var(--ink); transform: rotate(45deg) skew(8deg, 8deg); }
      @media (max-width: 560px) { .ch4-say { font-size: 15px; padding: 5px 11px 6px; } }`;
    document.head.appendChild(st);
  }

  // a speech bubble over a moving world point; pos() -> Vector3. Returns { el, done }
  function speech(world, pos, text, dur) {
    injectStyle();
    const el = document.createElement('div');
    el.className = 'ch4-say';
    el.textContent = text;
    world.host.appendChild(el);
    const sp = { el, t: 0, dur: dur || 3.2 };
    const fn = dt => {
      if (!el.parentNode) return;
      sp.t += dt;
      const [x, y] = world.project(pos());
      const k = Math.min(1, sp.t / 0.18) * (1 - Math.max(0, (sp.t - sp.dur + 0.3) / 0.3));
      el.style.transform = `translate(${x}px, ${y}px) translate(-28px, calc(-100% - 18px)) scale(${0.7 + 0.3 * k})`;
      el.style.opacity = Math.max(0, k);
      if (sp.t > sp.dur) el.remove();
    };
    world.addUpdate(fn);
    fn(0);
    return sp;
  }

  CL.Ch4Art = {
    mixc, NO_GLOW, own, glowMat, onLayer1, whale, fish, levelScale, label, panelText, faderPlate, shutOpenFace, stemScale, tape, notebook,
    paintReadout, PICTS, registerIcons, speech,
  };
})(window.CL = window.CL || {});
