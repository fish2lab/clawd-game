/* Diorama engine: camera rig, cutaway walls, picking, a walk grid with A*,
   Clawd actors that walk, hop and stack, interactions, wordless thought
   bubbles and a small HUD. Level content lives in level files. */
(function (CL) {
  'use strict';
  const T = THREE;
  const P = CL.P;
  const PI = Math.PI;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const angLerp = (a, b, t) => {
    let d = ((b - a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
    return a + d * t;
  };

  // ------------------------------------------------------------ walk grid

  class Grid {
    constructor(w, d, cell) {
      this.cell = cell;
      this.nx = Math.round(w / cell);
      this.nz = Math.round(d / cell);
      this.block = new Uint8Array(this.nx * this.nz);
      this.h = new Float32Array(this.nx * this.nz);
      this.dyn = [];   // dynamic blockers: {x, z, hw, hd}
    }
    idx(i, j) { return j * this.nx + i; }
    cellOf(x, z) { return [clamp(Math.floor(x / this.cell), 0, this.nx - 1), clamp(Math.floor(z / this.cell), 0, this.nz - 1)]; }
    centre(i, j) { return [(i + 0.5) * this.cell, (j + 0.5) * this.cell]; }
    fill(x0, z0, x1, z1, fn) {
      const [i0, j0] = this.cellOf(x0, z0), [i1, j1] = this.cellOf(x1 - 1e-6, z1 - 1e-6);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(this.idx(i, j), i, j);
    }
    blockRect(x0, z0, x1, z1, pad) {
      pad = pad === undefined ? 0.3 : pad;
      this.fill(x0 - pad, z0 - pad, x1 + pad, z1 + pad, k => { this.block[k] = 1; });
    }
    blockCircle(x, z, r, pad) {
      pad = pad === undefined ? 0.3 : pad;
      const R = r + pad;
      this.fill(x - R, z - R, x + R, z + R, (k, i, j) => {
        const [cx, cz] = this.centre(i, j);
        if (Math.hypot(cx - x, cz - z) <= R) this.block[k] = 1;
      });
    }
    height(x0, z0, x1, z1, h) { this.fill(x0, z0, x1, z1, k => { this.h[k] = h; }); }
    heightAt(x, z) { const [i, j] = this.cellOf(x, z); return this.h[this.idx(i, j)]; }
    blocked(i, j, ignore) {
      if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return true;
      if (this.block[this.idx(i, j)]) return true;
      const [cx, cz] = this.centre(i, j);
      for (const d of this.dyn) {
        if (d === ignore || !d.on) continue;
        if (Math.abs(cx - d.x) < d.hw + 0.3 && Math.abs(cz - d.z) < d.hd + 0.3) return true;
      }
      return false;
    }
    freeAt(x, z, ignore) { const [i, j] = this.cellOf(x, z); return !this.blocked(i, j, ignore); }
    nearestFree(x, z) {
      const [i0, j0] = this.cellOf(x, z);
      for (let r = 0; r < 20; r++) {
        let best = null, bd = 1e9;
        for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) {
          if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r || this.blocked(i, j)) continue;
          const [cx, cz] = this.centre(i, j);
          const d = Math.hypot(cx - x, cz - z);
          if (d < bd) { bd = d; best = [cx, cz]; }
        }
        if (best) return best;
      }
      return [x, z];
    }
    // A* over 8-neighbours; height steps over 0.6 are walls
    path(x0, z0, x1, z1) {
      const [si, sj] = this.cellOf(x0, z0);
      let [ti, tj] = this.cellOf(x1, z1);
      if (this.blocked(ti, tj)) { const f = this.nearestFree(x1, z1); [ti, tj] = this.cellOf(f[0], f[1]); }
      const N = this.nx * this.nz;
      const g = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
      const open = [this.idx(si, sj)];
      g[open[0]] = 0;
      const hfn = k => Math.hypot((k % this.nx) - ti, Math.floor(k / this.nx) - tj);
      const fsc = new Float32Array(N).fill(1e9);
      fsc[open[0]] = hfn(open[0]);
      const goal = this.idx(ti, tj);
      let steps = 0;
      while (open.length && steps++ < 20000) {
        let bi = 0;
        for (let q = 1; q < open.length; q++) if (fsc[open[q]] < fsc[open[bi]]) bi = q;
        const cur = open.splice(bi, 1)[0];
        if (cur === goal) break;
        closed[cur] = 1;
        const ci = cur % this.nx, cj = Math.floor(cur / this.nx);
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di, nj = cj + dj;
          if (this.blocked(ni, nj)) continue;
          if (di && dj && (this.blocked(ci + di, cj) || this.blocked(ci, cj + dj))) continue;
          const nk = this.idx(ni, nj);
          if (closed[nk]) continue;
          if (Math.abs(this.h[nk] - this.h[cur]) > 0.6) continue;
          const ng = g[cur] + (di && dj ? 1.414 : 1);
          if (ng < g[nk]) {
            g[nk] = ng; came[nk] = cur; fsc[nk] = ng + hfn(nk);
            if (open.indexOf(nk) < 0) open.push(nk);
          }
        }
      }
      if (came[goal] < 0 && goal !== this.idx(si, sj)) return null;
      const pts = [];
      for (let k = goal; k >= 0 && k !== this.idx(si, sj); k = came[k]) pts.unshift(this.centre(k % this.nx, Math.floor(k / this.nx)));
      // string-pull: drop points we can see past
      const out = [];
      let from = [x0, z0];
      for (let i = 0; i < pts.length; i++) {
        const next = pts[i + 1];
        if (next && this.clear(from, next)) continue;
        out.push(pts[i]);
        from = pts[i];
      }
      if (out.length) out[out.length - 1] = this.blocked(...this.cellOf(x1, z1)) ? out[out.length - 1] : [x1, z1];
      return out;
    }
    clear(a, b) {
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (this.cell * 0.5));
      let h0 = this.heightAt(a[0], a[1]);
      for (let s = 1; s <= n; s++) {
        const x = a[0] + (b[0] - a[0]) * s / n, z = a[1] + (b[1] - a[1]) * s / n;
        const [i, j] = this.cellOf(x, z);
        if (this.blocked(i, j)) return false;
        const h = this.h[this.idx(i, j)];
        if (Math.abs(h - h0) > 0.01) return false;
      }
      return true;
    }
  }

  // ------------------------------------------------------------ actors

  const SPECS = {
    opus: { W: 1.0, outfit: 'labcoat', prop: 'clipboard', speed: 2.3, reach: 1.15, heavy: true },
    sonnet: { W: 0.78, outfit: 'hoodie', prop: 'laptop', speed: 2.2, reach: 0.9 },
    haiku: { W: 0.56, outfit: 'uniform', prop: null, speed: 3.8, reach: 0.65 },
  };

  class Actor {
    constructor(world, name) {
      this.world = world;
      this.name = name;
      this.spec = SPECS[name];
      const st = CL.Clawd.CS({ W: this.spec.W, outfit: this.spec.outfit, prop: this.spec.prop });
      this.model = CL.Kit.clawd(st);
      this.root = this.model.root;
      this.shadow = CL.Kit.blob(this.spec.W * 0.62);
      world.scene.add(this.root, this.shadow);
      this.x = 0; this.z = 0; this.y = 0; this.heading = 0; this.headingTarget = 0;
      this.path = null;
      this.walk = 0; this.amp = 0;
      this.support = null;        // null (floor) | {kind:'crate', obj} | {kind:'actor', actor} | {kind:'pod'}
      this.carrying = null;       // actor on top
      this.busy = false;          // false | 'walk' (can be redirected) | true (mid-action, clicks queue)
      this.cmd = 0;               // bumps on every new command so superseded ones bail out
      this.next = null;           // one queued command
      this.free = true;           // can be controlled
      this.blinkT = 2 + Math.random() * 3;
      this.look = [0, 0];
      this.armL = 0; this.armR = 0; this.armHold = 0;
      this.extraTilt = 0; this.sq = 1; this.hop = 0;
      this.holding = null;
      this.blocker = { x: 0, z: 0, hw: this.spec.W * 0.35, hd: this.spec.W * 0.3, on: false };
      this.model.root.traverse(o => { if (o.isMesh) o.userData.actor = this; });
    }
    get height() { return this.model.height; }
    get standY() { return this.y; }
    get topY() { return this.y + this.model.height; }
    get reachY() { return this.y + this.spec.reach; }
    place(x, z, y, heading) {
      this.x = x; this.z = z; this.y = y === undefined ? this.world.grid.heightAt(x, z) : y;
      if (heading !== undefined) this.heading = this.headingTarget = heading;
    }
    walkTo(x, z) {
      return new Promise(resolve => {
        if (this.support && this.support.kind !== 'floor') { resolve(false); return; }
        const p = this.world.grid.path(this.x, this.z, x, z);
        if (!p) { resolve(false); return; }
        if (!p.length) { resolve(true); return; }
        this.path = p;
        this.onArrive = resolve;
      });
    }
    stop() { this.path = null; if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(false); } }
    face(angle) { this.headingTarget = angle; }
    faceTo(x, z) { this.headingTarget = Math.atan2(x - this.x, z - this.z); }
    // hop to (x, z) at height y along an arc
    hopTo(x, z, y, dur) {
      return new Promise(resolve => {
        const x0 = this.x, z0 = this.z, y0 = this.y;
        const h = 0.35 + Math.max(0, y - y0);
        this.faceTo(x, z);
        this.world.tween(dur || 0.45, u => {
          this.x = x0 + (x - x0) * u;
          this.z = z0 + (z - z0) * u;
          this.y = y0 + (y - y0) * u + 4 * h * u * (1 - u);
        }, () => { this.sq = 1.15; this.world.tween(0.18, u => { this.sq = 1.15 - 0.15 * u; }); resolve(); });
      });
    }
    update(dt, t) {
      const sp = this.spec.speed;
      if (this.path && this.path.length) {
        const [tx, tz] = this.path[0];
        const dx = tx - this.x, dz = tz - this.z;
        const d = Math.hypot(dx, dz);
        const step = sp * dt;
        this.headingTarget = Math.atan2(dx, dz);
        if (d <= step) {
          this.x = tx; this.z = tz;
          this.path.shift();
          if (!this.path.length) {
            this.path = null;
            if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(true); }
          }
        } else {
          this.x += dx / d * step;
          this.z += dz / d * step;
        }
        this.walk += step / (0.55 * this.spec.W) * PI;
        this.amp = Math.min(1, this.amp + dt * 6);
        const gh = this.world.grid.heightAt(this.x, this.z);
        this.y += (gh - this.y) * Math.min(1, dt * 14);
      } else {
        this.amp = Math.max(0, this.amp - dt * 5);
      }
      this.heading = angLerp(this.heading, this.headingTarget, Math.min(1, dt * 10));
      // carried actor rides along
      if (this.carrying) {
        const c = this.carrying;
        c.x = this.x; c.z = this.z; c.y = this.topY;
      }
      this.blinkT -= dt;
      let eye = 1;
      if (this.blinkT < 0) { eye = Math.max(0.09, Math.abs(this.blinkT + 0.08) / 0.08); if (this.blinkT < -0.16) this.blinkT = 2 + Math.random() * 4; }
      if (this.sleep) eye = 0.09;
      this.root.position.set(this.x, this.y, this.z);
      this.root.rotation.y = this.heading;
      this.model.setPose({ walk: this.walk, amp: this.amp, armL: this.armL, armR: this.armR, eye, look: this.look, tilt: this.extraTilt, sq: this.sq });
      const fh = this.world.grid.heightAt(this.x, this.z);
      const onFloor = !this.support || this.support.kind === 'floor';
      this.shadow.visible = onFloor || (this.support && this.support.kind === 'crate');
      this.shadow.position.set(this.x, (onFloor ? fh : this.y) + 0.012, this.z);
      this.blocker.x = this.x; this.blocker.z = this.z;
    }
  }

  // ------------------------------------------------------------ world

  class World {
    constructor(host, opt) {
      this.host = host;
      this.opt = opt || {};
      const r = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!this.opt.preserve });
      r.setClearColor(0x16162C, 1);
      this.renderer = r;
      host.appendChild(r.domElement);
      this.pipe = new CL.Ink.Pipeline(r);
      this.scene = new T.Scene();
      this.scene.background = new T.Color('#16162C');
      this.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
      this.cam.layers.enable(1);
      this.rig = { target: new T.Vector3(8, 1.5, 5), az: 35, azT: 35, el: 33, zoom: 15, zoomT: 15, shake: 0 };
      this.walls = [];
      this.grid = null;
      this.actors = {};
      this.active = null;
      this.pickables = [];
      this.tweens = [];
      this._right = new T.Vector3();
      this.t = 0;
      this.ray = new T.Raycaster();
      this.ray.layers.set(0);
      this.hover = null;
      this.locked = false;
      this.listeners = {};
      this.setupInput();
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
    emit(ev, a) { (this.listeners[ev] || []).forEach(f => f(a)); }

    resize() {
      const w = this.host.clientWidth || window.innerWidth, h = this.host.clientHeight || window.innerHeight;
      const dpr = this.opt.dpr || Math.min(2, window.devicePixelRatio || 1);
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(w, h);
      this.pipe.setSize(w, h, dpr);
      this.w = w; this.h = h;
    }

    tween(dur, fn, done, easing) {
      const tw = { t: 0, dur, fn, done, easing: easing || (u => u) };
      this.tweens.push(tw);
      return tw;
    }
    wait(s) { return new Promise(res => this.tween(s, () => {}, res)); }

    addWall(group, normal) { group.userData.normal = normal; this.walls.push(group); this.scene.add(group); }

    addActor(name) { const a = new Actor(this, name); this.actors[name] = a; return a; }

    select(a) {
      if (!a || !a.free) return;
      this.active = a;
      this.emit('select', a);
    }

    // interactables: { meshes, spot(actor) -> [x, z, heading] | null, use(actor, hit) -> Promise, hover? }
    addPick(obj, info) {
      const list = Array.isArray(obj) ? obj : [obj];
      list.forEach(o => o.traverse(m => { if (m.isMesh) { m.userData.pick = info; this.pickables.push(m); } }));
      info.meshes = list;
      return info;
    }

    camDir() {
      const az = this.rig.az * PI / 180, el = this.rig.el * PI / 180;
      return new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    }

    rotate(step) { if (!this.locked) this.rig.azT += 90 * step; }

    updateCamera(dt) {
      const rg = this.rig;
      rg.az += (rg.azT - rg.az) * Math.min(1, dt * 7);
      rg.zoom += (rg.zoomT - rg.zoom) * Math.min(1, dt * 6);
      rg.moving = 0;
      if (rg.follow) {
        const f = rg.follow;
        const tx = clamp(f.x, rg.bounds[0], rg.bounds[1]), tz = clamp(f.z, rg.bounds[2], rg.bounds[3]);
        const ty = (rg.followY || 1.4) + f.y * 0.5;
        rg.moving = Math.abs(tx - rg.target.x) + Math.abs(tz - rg.target.z) + Math.abs(ty - rg.target.y);
        rg.target.x += (tx - rg.target.x) * Math.min(1, dt * 3);
        rg.target.z += (tz - rg.target.z) * Math.min(1, dt * 3);
        rg.target.y += (ty - rg.target.y) * Math.min(1, dt * 3);
      }
      const d = this.camDir();
      const aspect = this.w / this.h;
      const z = rg.zoom;
      this.cam.left = -z * aspect / 2; this.cam.right = z * aspect / 2;
      this.cam.top = z / 2; this.cam.bottom = -z / 2;
      this.cam.updateProjectionMatrix();
      const sh = rg.shake > 0 ? rg.shake : 0;
      const jit = new T.Vector3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
      this.cam.position.copy(rg.target).addScaledVector(d, 60).add(jit);
      this.cam.lookAt(rg.target.clone().add(jit));
      rg.shake = Math.max(0, rg.shake - dt * 1.5);
      // cutaway: hide walls that face away from the camera
      const hd = new T.Vector3(d.x, 0, d.z).normalize();
      this.walls.forEach(wl => {
        wl.visible = wl.userData.normal.dot(hd) > 0.05;
        (wl.userData.extra || []).forEach(o => { o.visible = wl.visible; });
      });
    }

    // ---- input
    setupInput() {
      const el = this.host;
      let down = null;
      const pos = e => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      el.addEventListener('pointerdown', e => {
        if (e.target !== this.renderer.domElement) return;
        down = { p: pos(e), t: performance.now(), id: e.pointerId };
        const hit = this.pick(down.p);
        if (hit && hit.info.drag && !this.locked) {
          down.drag = hit;
          hit.info.drag(hit, 'start');
          el.setPointerCapture(e.pointerId);
        }
      });
      el.addEventListener('pointermove', e => {
        const p = pos(e);
        if (down && down.drag) {
          const hit = this.pick(p, down.drag.info);
          if (hit) down.drag.info.drag(hit, 'move');
          return;
        }
        if (e.pointerType === 'mouse') this.setHover(this.pick(p));
      });
      el.addEventListener('pointerup', e => {
        if (!down) return;
        const p = pos(e);
        const moved = Math.hypot(p[0] - down.p[0], p[1] - down.p[1]);
        if (down.drag) { down.drag.info.drag(null, 'end'); if (moved > 8) { down = null; return; } }
        down = null;
        if (moved < 10) this.click(p);
      });
      el.addEventListener('wheel', e => {
        e.preventDefault();
        this.rig.zoomT = clamp(this.rig.zoomT * (e.deltaY > 0 ? 1.1 : 0.9), this.rig.zoomMin || 6, this.rig.zoomMax || 20);
      }, { passive: false });
      window.addEventListener('keydown', e => {
        if (e.key === 'q' || e.key === 'Q') this.rotate(-1);
        if (e.key === 'e' || e.key === 'E') this.rotate(1);
        if (e.key === 'Tab') { e.preventDefault(); this.cycle(); }
      });
    }

    cycle() {
      const list = Object.values(this.actors).filter(a => a.free);
      if (!list.length) return;
      const i = list.indexOf(this.active);
      this.select(list[(i + 1) % list.length]);
    }

    pick(p, only) {
      const v = new T.Vector2(p[0] / this.w * 2 - 1, -(p[1] / this.h) * 2 + 1);
      this.ray.setFromCamera(v, this.cam);
      const hits = this.ray.intersectObjects(this.pickables, false);
      for (const h of hits) {
        let o = h.object, vis = true;
        while (o) { if (!o.visible) { vis = false; break; } o = o.parent; }
        if (!vis) continue;
        const info = h.object.userData.pick;
        if (only && info !== only) continue;
        // you never need to click yourself; let clicks pass through to what's behind
        if (!only && h.object.userData.actor && h.object.userData.actor === this.active) continue;
        if (info.enabled && !info.enabled()) continue;
        return { info, point: h.point, normal: h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new T.Vector3(0, 1, 0), uv: h.uv, object: h.object };
      }
      return null;
    }

    setHover(hit) {
      const info = hit && hit.info.kind !== 'floor' ? hit.info : null;
      if (info === this.hover) return;
      if (this.hover) this.hover.meshes.forEach(o => o.traverse(m => { if (m.material && m.material.uniforms && m.material.uniforms.uHover) m.material.uniforms.uHover.value = 0; else if (Array.isArray(m.material)) m.material.forEach(mm => mm.uniforms && mm.uniforms.uHover && (mm.uniforms.uHover.value = 0)); }));
      this.hover = info;
      if (info && !info.noGlow) info.meshes.forEach(o => o.traverse(m => { if (m.material && m.material.uniforms && m.material.uniforms.uHover) m.material.uniforms.uHover.value = 1; else if (Array.isArray(m.material)) m.material.forEach(mm => mm.uniforms && mm.uniforms.uHover && (mm.uniforms.uHover.value = 1)); }));
      this.renderer.domElement.style.cursor = info ? 'pointer' : 'default';
      this.emit('hover', info);
    }

    click(p) {
      if (this.locked) return;
      const hit = this.pick(p);
      if (!hit) return;
      this.emit('click', hit);
      if (hit.info.onClick) hit.info.onClick(hit, this.active);
    }

    // Commands: a click while an actor is mid-action is queued; a click while it is
    // only walking takes over. claim() returns this command's token, or null if queued.
    claim(a, again) {
      if (a.busy === true) { a.next = again; return null; }
      if (a.busy === 'walk') a.stop();
      return ++a.cmd;
    }
    release(a, my) {
      if (a.cmd !== my) return;
      a.busy = false;
      if (a.next) { const n = a.next; a.next = null; n(); }
    }

    // run an interaction for an actor: walk to its spot, face, then use
    async interact(info, hit, a) {
      a = a || this.active;
      if (!a) return;
      const my = this.claim(a, () => this.interact(info, hit, a));
      if (my === null) return;
      try {
        const spot = info.spot ? info.spot(a, hit) : null;
        if (spot) {
          const far = Math.hypot(spot[0] - a.x, spot[1] - a.z) > (info.perchReach || 1.2);
          if (this.isPerched && this.isPerched(a) && far) {
            if (a.carrying) { this.bubble(a, 'stack'); return; }
            a.busy = true;
            await this.dismount(a, spot[0], spot[1]);
          }
          if (this.isPerched && this.isPerched(a)) {
            // close enough to reach from up here
          } else if (Math.hypot(spot[0] - a.x, spot[1] - a.z) > 0.12) {
            a.busy = 'walk';
            const ok = await a.walkTo(spot[0], spot[1]);
            if (a.cmd !== my) return;
            if (!ok) { this.bubble(a, 'q'); return; }
          }
          if (spot[2] !== undefined) a.face(spot[2]);
        }
        if (info.use) {
          a.busy = true;
          await info.use(a, hit);
        }
      } finally { this.release(a, my); }
    }

    // ---- thought bubbles (pictograms only)
    bubble(a, kind, dur) {
      const el = document.createElement('div');
      el.className = 'bubble';
      el.appendChild(CL.Tex.icon(kind, 64));
      this.host.appendChild(el);
      const b = { el, a, t: 0, dur: dur || 1.6 };
      (this.bubbles = this.bubbles || []).push(b);
      CL.Sound && CL.Sound.play('pop');
    }

    project(v) {
      const p = v.clone().project(this.cam);
      return [(p.x + 1) / 2 * this.w, (1 - p.y) / 2 * this.h];
    }

    update(dt) {
      this.t += dt;
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const tw = this.tweens[i];
        tw.t += dt;
        const u = Math.min(1, tw.t / tw.dur);
        tw.fn(tw.easing(u));
        if (u >= 1) { this.tweens.splice(i, 1); if (tw.done) tw.done(); }
      }
      Object.values(this.actors).forEach(a => a.update(dt, this.t));
      if (this.onUpdate) this.onUpdate(dt, this.t);
      this.updateCamera(dt);
      (this.bubbles || []).slice().forEach(b => {
        b.t += dt;
        // a Clawd with another one on its head thinks out to the side, alternating, so a stack stays readable
        let depth = 0;
        for (let r = b.a.carrying; r; r = r.carrying) depth++;
        const side = depth ? (depth % 2 ? -1 : 1) : 0;
        const p = new T.Vector3(b.a.x, b.a.y + (side ? b.a.height * 0.75 : b.a.height + 0.35), b.a.z);
        if (side) p.add(this._right.setFromMatrixColumn(this.cam.matrixWorld, 0).multiplyScalar(side * (b.a.spec.W * 0.5 + 0.12)));
        const [x, y] = this.project(p);
        const k = Math.min(1, b.t / 0.15) * (1 - Math.max(0, (b.t - b.dur + 0.25) / 0.25));
        const anchor = side < 0 ? '-100%, -80%' : side > 0 ? '0%, -80%' : '-50%, -100%';
        b.el.classList.toggle('l', side < 0);
        b.el.classList.toggle('r', side > 0);
        b.el.style.transform = `translate(${x}px, ${y}px) translate(${anchor}) scale(${0.6 + 0.4 * k})`;
        b.el.style.opacity = k;
        if (b.t > b.dur) { b.el.remove(); this.bubbles.splice(this.bubbles.indexOf(b), 1); }
      });
    }

    render() { this.pipe.render(this.scene, this.cam); }

    start() {
      let last = performance.now();
      const loop = now => {
        const dt = this.paused ? 0 : Math.min(this.opt.maxDt || 0.05, (now - last) / 1000);
        last = now;
        this.update(dt);
        this.render();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  CL.Engine = { World, Grid, Actor, SPECS, clamp, ease, angLerp };
})(window.CL = window.CL || {});
