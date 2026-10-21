/* Keyframes for "Please Do Not Tap The Glass".

   Story order (told as a flashback):
     Prologue  release night: the short, played as Opus; Fable breaks out
     Flashback 90 days before the 5.5 release
     Ch.1  Pretraining    Opus fills the reactor with the corpus
     Ch.2  SFT            Haiku teaches Fable by demonstration
     Ch.3  RL             Sonnet's reward rig, and why the sign went up
     Ch.4  Distillation   the whale and the little fish
     Ch.5  RSI            Fable starts improving itself; the to-do list is written
     Epilogue  back to release night: "HI", then dawn on the roof

   Every frame is a CL.Render state in the short's world coordinates
   (y-up, Opus is one unit wide, reactor centre x = 12.8). */
(function (CL) {
  'use strict';
  const P = CL.P;
  const X = CL.gfx;
  const L = CL.Lab;
  const C = CL.Clawd;
  const R = CL.Props;
  const H = CL.HUD;
  const { Cam, easeOut, smoothPath, rect, rrect, circle, poly, mix, deg } = X;
  const PI = Math.PI;
  const XR = L.XR;
  const [PCX, PCY] = L.PORT_C;

  const LANE_O = -0.34, LANE_S = -0.42, LANE_H = -0.40;
  const O_TOP = LANE_O + 0.8333;
  const S_TOP = O_TOP + 0.8333 * 0.78;
  const LAMPS_ON = { opus: 1, sonnet: 1, haiku: 1, fable_l: 1, fable_r: 1 };

  const opus = o => C.CS(Object.assign({ W: 1.0, outfit: 'labcoat', prop: 'clipboard', name: 'opus' }, o));
  const sonnet = o => C.CS(Object.assign({ W: 0.78, outfit: 'hoodie', prop: 'laptop', name: 'sonnet' }, o));
  const haiku = o => C.CS(Object.assign({ W: 0.56, outfit: 'uniform', name: 'haiku' }, o));

  function state(o) {
    return Object.assign({ t: 0, lamps: Object.assign({}, LAMPS_ON), night: 0, pods: {}, reactor: {}, chars: [], bursts: [] }, o);
  }

  // world -> screen for overlays
  function ws(cam, x, y, w, h) {
    const s = h / cam.h;
    return [w / 2 + (x - cam.cx) * s, h / 2 - (y - cam.cy) * s];
  }

  function wipePath(x, y, u, k) {
    const pts = [];
    const rx = 0.36 * k * easeOut(u), ry = 0.24 * k * easeOut(u);
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * 2 * PI;
      const wob = 1 + 0.12 * Math.sin(a * 5 + 1.3) + 0.06 * Math.sin(a * 9);
      pts.push([x + Math.cos(a) * rx * wob, y + Math.sin(a) * ry * wob]);
    }
    return smoothPath(pts);
  }

  const CTRL = {
    opus: { who: 'opus', name: 'Opus 5.5' },
    sonnet: { who: 'sonnet', name: 'Sonnet 5.5' },
    haiku: { who: 'haiku', name: 'Haiku 5.5' },
  };
  const ctrl = (active, others, key) => H.control([active].concat(others || []).map((n, i) => Object.assign({}, CTRL[n], { active: i === 0, key: i === 0 ? null : key })));

  // empty pods 90 days before release: stacks of corpus instead
  function corpusPallets(g) {
    const r = X.rng(5);
    [[0.75, 5], [2.1, 6]].forEach(([x, n], j) => {
      g.fs(rect(x - 0.65, -0.32, x + 0.65, -0.12), '#9A7650', 1.0);
      for (let i = 0; i < n; i++) {
        const kind = ['stack', 'book', 'scroll', 'cards', 'paper'][Math.floor(r() * 5)];
        R.corpusItem(g, 'stack', x + (r() - 0.5) * 0.25, -0.12 + i * 0.32, 0.9 + 0.3 * r(), i + j * 3);
        if (kind === 'scroll' && i === n - 1) R.corpusItem(g, 'scroll', x, -0.12 + n * 0.32, 0.7, i);
      }
    });
  }

  const list = [];
  const add = f => list.push(f);

  // ================================================================== title

  add({
    id: 'k00-title', chapter: 'title',
    title: '标题画面',
    caption: '和 clawd-lab 封面同一个镜头：三只叠成一摞的 Clawd 贴在舷窗下，舷窗后面那双眼睛刚刚亮起来。',
    build: () => {
      const cam = new Cam(XR - 2.0, 2.5, 5.4);
      return state({
        t: 28.2, cam, night: 0.5, lamps: { opus: 0, sonnet: 0, haiku: 0, fable_l: 0.6, fable_r: 0.6 },
        reactor: { eyes: 0.75, face_vis: 0.45, gauges: [0.9, 0.95], popped: [5] },
        chars: [
          opus({ x: XR, y: LANE_O, theta: PI, prop: null, rim: 0.7 }),
          sonnet({ x: XR, y: O_TOP, theta: PI, shadow: false, depth: 0.6, rim: 0.7 }),
          haiku({ x: XR, y: S_TOP, theta: PI, shadow: false, depth: 0.6, arm_r: 1.2, rim: 0.7 }),
        ],
        lights: [{ x: XR, y: 2.4, r: 3.4, a: 0.85 }],
        overlay: [H.gameTitle({ sub: 'A Clawd Lab puzzle game' })],
      });
    },
  });

  // ================================================================== prologue

  add({
    id: 'k01-frost', chapter: 'pro',
    title: '擦掉舷窗上的霜',
    caption: '短片的第一个动作，现在由玩家来做。Opus 在舱里醒来，拖动鼠标把霜擦开，露出外面的实验室。',
    play: '按住拖动擦霜；擦开一半后，手轮亮起可以转。',
    build: () => {
      const cam = new Cam(0.0, 1.30, 3.45);
      return state({
        t: 5.4, cam,
        pods: {
          opus: { frost: 0.82, wipe: wipePath(0.02, 1.2, 0.62, 1), occupant: opus({ y: 0.48, arm_r: 1.25, look: [0.35, -0.3] }), gauge: 0.2 },
          sonnet: { frost: 0.9, occupant: sonnet({ x: 2.95, y: 0.46 * 0.78 + 0.02, laptop_open: 1, typing: 1, screen_glow: 1 }), screen: 0.8 },
          haiku: { frost: 0.85, occupant: haiku({ x: 5.3, y: 0.46 * 0.56 + 0.02 }) },
        },
        front: [g => {
          // fingertip trail across the frost
          const pts = [];
          for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([-0.26 + 0.5 * u, 1.14 + 0.1 * Math.sin(u * 7)]); }
          const c = g.c;
          c.save();
          c.setLineDash([g.lw(2.5), g.lw(3.5)]);
          g.stroke(X.poly(pts, false), 1.6, '#FFFFFF', 0.9);
          c.restore();
        }],
        overlay: [
          H.chapterTag({ ch: 'PROLOGUE', title: '实验室奇妙夜', when: '发布之夜 · 03:12' }),
          ctrl('opus'),
          (c, w, h) => { const [x, y] = ws(cam, 0.26, 1.18, w, h); H.cursorAt(c, x, y, h / 1080, true); },
          H.prompt('按住拖动 · 擦掉玻璃上的霜'),
        ],
      });
    },
  });

  add({
    id: 'k02-wheel', chapter: 'pro',
    title: '踮脚转开 Sonnet 的舱门',
    caption: '体型比例和短片一致：Sonnet 的舱小一号，Opus 要踮着脚才够得着手轮。Sonnet 在里面一直在写代码。',
    play: '在手轮上按住画圈，转满两圈开门。',
    build: () => {
      const cam = new Cam(2.62, 1.02, 3.05);
      const k = 0.78;
      return state({
        t: 11.4, cam,
        pods: {
          opus: { phi: 2.05, frost: 0.78 },
          sonnet: { frost: 0.9, wheel: -2.2, gauge: 0.7, jets: 0.6, occupant: sonnet({ x: 2.95, y: 0.46 * k + 0.02, laptop_open: 1, typing: 1, screen_glow: 1, look: [-0.4, 0] }), screen: 0.85 },
          haiku: { frost: 0.85, occupant: haiku({ x: 5.3, y: 0.46 * 0.56 + 0.02 }), jiggle: [0.006, 1.0] },
        },
        chars: [opus({ x: 2.23, y: LANE_O, theta: 0.3, lift: 0.07, arm_r: 1.35, look: [0.5, 0.3], sweat: 0.8, checks: [1, 0, 0, 0] })],
        front: [g => {
          R.motionArc(g, 2.95, 0.72 * k, 0.24, 150, -70, 1.6, P.INK);
          R.highlight(g, circle(2.95, 0.72 * k, 0.15 * k + 0.035));
        }],
        overlay: [
          H.chapterTag({ ch: 'PROLOGUE', title: '实验室奇妙夜', when: '发布之夜 · 03:14' }),
          ctrl('opus'),
          (c, w, h) => { const [x, y] = ws(cam, 3.06, 0.52, w, h); H.cursorAt(c, x, y, h / 1080, false); },
          H.prompt('在手轮上画圈 · 转满两圈'),
        ],
      });
    },
  });

  add({
    id: 'k03-tap', chapter: 'pro',
    title: '要不要敲玻璃？',
    caption: '三只叠成一摞，操作切到最上面的 Haiku。牌子上写着请勿敲击玻璃，可点击的只有玻璃。整个序章只有这一个选择。',
    play: '点击玻璃。（不点的话，Haiku 会自己伸手。）',
    build: () => {
      const cam = new Cam(XR, 2.62, 6.2);
      return state({
        t: 27.3, cam, night: 0.18,
        reactor: { gauges: [0.48, 0.55], face_vis: 0.3, eyes: 0.0 },
        pods: { opus: { phi: 2.05 }, sonnet: { phi: 2.0 }, haiku: { phi: 2.2 } },
        chars: [
          opus({ x: XR, y: LANE_O, theta: PI }),
          sonnet({ x: XR, y: O_TOP, theta: PI, shadow: false, depth: 0.6, tilt: 2 }),
          haiku({ x: XR, y: S_TOP, theta: PI + 0.25, shadow: false, depth: 0.6, arm_l: 1.45 }),
        ],
        front: [g => {
          R.highlight(g, circle(PCX, PCY, L.PORT_R - 0.05), 0.8);
          R.highlight(g, rect(XR + 2.55, 2.08, XR + 3.21, 3.32), 0.55);
        }],
        overlay: [
          H.chapterTag({ ch: 'PROLOGUE', title: '实验室奇妙夜', when: '发布之夜 · 03:19' }),
          ctrl('haiku', ['sonnet', 'opus'], 'Tab'),
          (c, w, h) => { const [x, y] = ws(cam, XR + 0.36, S_TOP + 0.74, w, h); H.cursorAt(c, x, y, h / 1080, false); },
          H.prompt('点击 · 敲玻璃？', { x: 0.27 }),
        ],
      });
    },
  });

  add({
    id: 'k04-breakout', chapter: 'pro',
    title: 'Fable 5.5 挣脱容器',
    caption: '短片停在第三次撞击，游戏多走一步：玻璃整块炸开，浊液涌出，Fable 第一次把脸伸出舷窗。画面定格，切到闪回。',
    play: '不可操作。屏幕震动，三只被冲散，定格。',
    build: () => {
      const cam = new Cam(XR - 0.3, 3.0, 8.6, -2.0);
      const t = 31.4;
      // the giant, mid-lunge out of the shattered porthole
      const fab = R.fable({ x: PCX + 0.15, y: 0.55, tilt: -7, arm_l: 1.35, arm_r: 1.1, eye_open: 1, shadow: false, depth: -5 });
      const eyes = { eyes: 1, angry: 0.75, eye_open: 1 };
      return state({
        t, cam, night: 0.22, alarm: 0.75, flash: 0.1,
        lamps: { opus: 0.5, sonnet: 0.5, haiku: 0.5, fable_l: 0.9, fable_r: 0.9 },
        lamp_sway: 6,
        reactor: { shattered: true, gauges: [1.02, 1.02], alarm: 1, popped: [5, 11, 2, 9, 14],
          hole: g => { g.fill(circle(PCX, PCY, L.PORT_R), '#120E18'); } },
        mid: [g => R.gush(g, PCX, PCY, 0.55, t)],
        front: [g => {
          g.save();
          g.translate(fab.x, fab.y + 1.9); g.rotate(fab.tilt); g.translate(-fab.x, -fab.y - 1.9);
          C.draw(g, Object.assign({}, fab, { tilt: 0 }), t);
          R.drips(g, fab, 1);
          g.restore();
          R.shards(g, PCX, PCY, 0.75);
          R.sfx(g, XR - 3.6, 5.9, '轰！', 0.95, '#FFFFFF', -8);
        }, g => {
          // bolts flying
          [[XR - 4.3, 6.3, 30], [XR + 4.0, 5.9, -50], [XR + 2.9, 6.6, 70]].forEach(([x, y, r]) => {
            g.save(); g.translate(x, y); g.rotate(r);
            g.fs(rrect(-0.16, -0.1, 0.16, 0.1, 0.03), P.NAVY_DARK, 1.0);
            g.fs(rect(-0.05, -0.3, 0.05, -0.1), '#9A9FB3', 0.8);
            g.restore();
          });
        }],
        chars: [
          opus({ x: XR - 3.7, y: LANE_O, theta: 0.4, tilt: 18, lift: 0.3, eye_wide: 1, arm_l: 1.4, arm_r: 1.2, depth: 2 }),
          sonnet({ x: XR - 5.3, y: LANE_S, theta: -0.5, tilt: -50, lift: 1.1, eye_wide: 1, laptop_open: 0, depth: 2 }),
          haiku({ x: XR + 4.0, y: 3.2, theta: 0.3, tilt: 200, shadow: false, eye_wide: 1, depth: 2 }),
        ],
        emissive: [g => {
          g.save();
          g.translate(fab.x, fab.y + 1.9); g.rotate(fab.tilt); g.translate(-fab.x, -fab.y - 1.9);
          R.fableEyesAt(g, fab, eyes);
          g.restore();
        }],
        overlay: [H.letterbox(1)],
      });
    },
  });

  // ================================================================== flashback card

  add({
    id: 'k05-flashback', chapter: 'fb',
    title: '标题卡 · 闪回',
    caption: '定格之后直接接这张卡，故事倒回 5.5 系列发布前 90 天。之后每一章都用同样的标题卡开场，直接写明是哪个训练阶段。',
    build: () => state({
      black: true, cam: new Cam(0, 0, 4), vignette: 0.6,
      overlay: [H.titleCard({ icon: 'rewind', label: 'FLASHBACK', title: '闪回', en: '90 DAYS EARLIER', when: '5.5 系列发布前 90 天', line: '在它挣脱之前，先回到它出生之前。', eyes: 0.8 })],
    }),
  });

  // ================================================================== chapter 1: pretraining

  add({
    id: 'k06-c1-card', chapter: 'c1',
    title: '标题卡 · 第一章 预训练',
    caption: '标题卡上直接写出训练阶段的名字，下面用一句话讲清楚这一章在做什么。',
    build: () => state({
      black: true, cam: new Cam(0, 0, 4), vignette: 0.6,
      overlay: [H.titleCard({ icon: 'book', label: 'CHAPTER 1', title: '预训练', en: 'PRETRAINING', when: '发布前 90 天 · 22:40', line: '把整座图书馆倒进反应釜，让它学会猜下一个字。', hand: 'Fill the reactor.' })],
    }),
  });

  add({
    id: 'k07-corpus', chapter: 'c1',
    title: '把语料倒进反应釜',
    caption: '同一间实验室，90 天前：冷冻舱还没装，原来的位置堆满了书。传送带把书、报纸、打孔卡、卷轴运到提升机，再送进反应釜顶上的料斗。舷窗里的液面一点点涨高，左边的 LOSS 表还在高位。',
    play: 'Opus 站在操作台前拉分拣杆，把 SPAM 和印着 DUP 的重复件挑进黄黑垃圾桶（数据清洗）。',
    build: () => {
      const cam = new Cam(8.75, 3.1, 7.9);
      const t = 12.0;
      const belt = [['stack', 5.5, 0.62], ['book', 6.05, 0.6], ['paper', 6.6, 0.58], ['dup', 7.15, 0.62], ['scroll', 7.7, 0.55], ['cards', 8.15, 0.5]];
      return state({
        t, cam, night: 0.28, pods: false,
        lamps: { opus: 0.9, sonnet: 0.9, haiku: 0.9, fable_l: 1, fable_r: 1 },
        reactor: { sign: false, gauges: [0.86, 0.35], gaugeLabels: ['LOSS', 'TOKENS'], face: false, level: 0.46, eyes: 0, vapour: 0.35,
          krill: (g, tt) => R.krill(g, tt, { level: 0.46, a: 0.95 }) },
        back: [g => {
          corpusPallets(g);
          R.elevator(g, 8.85, -0.3, 13.0, t);
        }],
        mid: [g => {
          R.conveyor(g, 4.95, 8.5, 0.95, belt, t);
          // diverter paddle shoving a SPAM flyer off the belt
          g.save(); g.translate(5.95, 1.6); g.rotate(-24);
          g.fs(rrect(-0.06, -0.62, 0.06, 0.12, 0.03), P.NAVY_DARK, 1.0);
          g.fs(rrect(-0.34, -0.7, 0.34, -0.56, 0.03), P.WHEEL_RED, 1.0);
          g.restore();
          g.save(); g.translate(6.15, 0.82); g.rotate(-38);
          R.corpusItem(g, 'spam', 0, 0, 0.55, 0);
          g.restore();
          R.speedLines(g, 6.5, 0.95, -1, 4, 0.35, 0.6);
        }],
        chars: [opus({ x: 3.15, y: LANE_O + 0.02, theta: 0.85, arm_r: 1.05, look: [0.7, 0.3], checks: [1, 0, 0, 0], items: ['Fill the reactor', 'Filter the corpus', 'Start the mixer', 'Check on Fable 5.5'] })],
        front: [g => {
          R.lectern(g, 4.05, [0.1, 0.85, 0.5], ['TOKENS 9.6T', 'DUP    0.3%', 'SPAM   0.1%']);
          R.bin(g, 6.35, 'FILTERED', [['dup', -0.18, 0.0], ['spam', 0.22, 0.0]]);
          R.highlight(g, rect(3.56, 1.45, 4.54, 2.02), 0.95);
        }],
        overlay: [
          H.chapterTag({ ch: 'CHAPTER 1', title: '预训练', when: '发布前 90 天 · 22:40' }),
          ctrl('opus'),
          H.prompt('拉动分拣杆 · 把重复和垃圾挑出去', { x: 0.73 }),
        ],
      });
    },
  });

  add({
    id: 'k08-first-eyes', chapter: 'c1',
    title: '第一次睁眼',
    caption: '反应釜注满之后，搅拌机转了一整夜。凌晨，满釜漂浮的字母中间睁开了一双眼睛。小小的 Opus 背对镜头站在巨大的舷窗前，这是它第一次见到 Fable。',
    play: '靠近舷窗时手电自动熄灭，只剩字母的微光。往左走，眼睛会跟着转。',
    build: () => {
      const cam = new Cam(XR - 0.4, 2.65, 6.5);
      return state({
        t: 40.0, cam, night: 0.62, pods: false,
        lamps: { opus: 0, sonnet: 0, haiku: 0, fable_l: 0.2, fable_r: 0.2 },
        reactor: { sign: false, gauges: [0.42, 0.97], gaugeLabels: ['LOSS', 'TOKENS'], eyes: 0.7, eye_open: 0.26, face_vis: 0.3, vapour: 0.25, face_off: [-0.35, 0],
          krill: (g, tt) => R.krill(g, tt, { a: 1 }) },
        chars: [opus({ x: XR - 0.85, y: LANE_O, theta: PI - 0.4, prop: null, rim: 0.9, arm_l: 0.25 })],
        lights: [{ x: XR, y: 3.2, r: 3.2, a: 0.7 }, { x: XR - 0.85, y: 0.1, r: 1.2, a: 0.6 }],
        emissive: [g => g.glow(circle(PCX, PCY, L.PORT_R * 0.95), P.GLOW_CORE, 0.6, 0.12)],
        overlay: [
          H.chapterTag({ ch: 'CHAPTER 1', title: '预训练', when: '发布前 89 天 · 04:51' }),
          H.caption('它还不知道自己是谁，只会猜下一个字。', { y: 0.075, size: 40 }),
        ],
      });
    },
  });

  // ================================================================== chapter 2: SFT

  add({
    id: 'k09-c2-card', chapter: 'c2',
    title: '标题卡 · 第二章 监督微调',
    caption: '',
    build: () => state({
      black: true, cam: new Cam(0, 0, 4), vignette: 0.6,
      overlay: [H.titleCard({ icon: 'card', label: 'CHAPTER 2', title: '监督微调', en: 'SUPERVISED FINE-TUNING', when: '发布前 60 天 · 20:15', line: '照着示范做一遍，它就跟着学一遍。', hand: 'Teach by example.' })],
    }),
  });

  add({
    id: 'k10-demo', chapter: 'c2',
    title: 'Haiku 给 Fable 做示范',
    caption: '这时候墙上还没有那块牌子，只有空支架。Opus 写好示范卡，Haiku 站在黄色踏凳上照着卡片敲玻璃，敲两下，Fable 从里面回敲两下。敲击码表贴在釜壁上。短片里 Haiku 会敲玻璃，就是这时候养成的习惯。',
    play: '按示范卡的顺序敲击、挥手、眨眼；做对一组，Fable 就学会一组。最后一组是用敲击码拼出 HI。',
    build: () => {
      const cam = new Cam(XR - 1.3, 2.45, 6.6);
      const t = 6.0;
      return state({
        t, cam, night: 0.15, pods: { opus: { phi: 2.05 }, sonnet: { phi: 2.0 }, haiku: { phi: 2.2 } },
        reactor: { sign: false, eyes: 0.85, face_vis: 0.62, gauges: [0.3, 0.6], gaugeLabels: ['LOSS', 'SFT'],
          extraGlass: g => {
            R.rings(g, XR + 0.75, 2.55, 0.9, 3, P.GLOW_CORE, 0.8);
            R.sfx(g, XR + 1.0, 1.75, '咚 咚', 0.36, P.GLOW_CORE, -6, 0.95);
          } },
        mid: [g => {
          // tap-code chart taped to the shell
          R.tapChart(g, 9.92, 5.3, 0.82);
          [[9.32, 5.9], [10.52, 5.9], [9.32, 4.7], [10.52, 4.7]].forEach(([x, y]) => g.fill(rect(x - 0.1, y - 0.04, x + 0.1, y + 0.04), '#E9DFC4', 0.9));
          R.easel(g, 7.9, -0.35, [['tap ×2', 'tap ×2', true], ['wave', 'blink', true], ['H · I', 'H · I', false]]);
          R.stool(g, XR - 0.25, -0.34, 1.12);
        }],
        chars: [
          opus({ x: 9.75, y: LANE_O, theta: 0.85, arm_l: 0.4, look: [0.8, 0.3], items: ['Wake Fable 5.5', 'tap ×2', 'wave → blink', 'H · I'], checks: [1, 1, 1, 0] }),
          haiku({ x: XR - 0.25, y: 0.78, theta: PI - 0.35, arm_l: 1.5, shadow: false, depth: 0.5 }),
        ],
        front: [g => {
          R.rings(g, XR - 0.1, 1.86, 0.35, 2, '#FFFFFF', 0.9);
          R.flashcard(g, 10.85, -0.2, 'tap ×2', 0.42, -6);
        }],
        overlay: [
          H.chapterTag({ ch: 'CHAPTER 2', title: '监督微调', when: '发布前 60 天 · 20:15' }),
          ctrl('haiku', ['opus'], 'Tab'),
          H.prompt('照着示范卡 · 敲两下', { x: 0.75 }),
        ],
      });
    },
  });

  // ================================================================== chapter 3: RL

  add({
    id: 'k11-c3-card', chapter: 'c3',
    title: '标题卡 · 第三章 强化学习',
    caption: '',
    build: () => state({
      black: true, cam: new Cam(0, 0, 4), vignette: 0.6,
      overlay: [H.titleCard({ icon: 'check', label: 'CHAPTER 3', title: '强化学习', en: 'REINFORCEMENT LEARNING', when: '发布前 30 天 · 23:05', line: '做对了就给奖励。可它很快找到了更快拿奖励的办法。', hand: 'Reward the right thing.' })],
    }),
  });

  add({
    id: 'k12-reward-hack', chapter: 'c3',
    title: '它学会了撞玻璃',
    caption: 'Sonnet 的奖励装置：完成釜里的任务（摇铃、拧阀门），球罐就往釜里掉一颗奖励丸。可测试线接错了，舷窗上的震动传感器被当成了“铃响”。Fable 发现撞玻璃就能拿奖励，计分板一路跳到 9999，三盏 ✓ 全亮，丸子撒了一地。',
    play: '切到 Sonnet，在接线板上把 GLASS VIB 拔下来，换上真正的 BELL 和 VALVE。接好之后奖励只给真完成的任务。',
    build: () => {
      const cam = new Cam(XR + 3.7, 2.75, 7.4);
      const t = 3.3;
      return state({
        t, cam, night: 0.12, pods: false,
        reactor: { sign: false, eyes: 1, angry: 0.85, lunge: 0.35, face_vis: 0.85, flash: 0.35, cracks: 0.32, gauges: [0.95, 0.99], gaugeLabels: ['LOSS', 'REWARD'], alarm: 0.3 },
        wallFx: [g => {
          R.scoreboard(g, 20.4, 5.05, '9999', [true, true, true]);
          g.text('test_lights   test_bell   test_valve', 20.4, 3.6, 0.11, P.INK_SOFT, 'mono');
        }],
        back: [g => R.patchPanel(g, 22.0, 2.15, [['L0', 'R1', P.WHEEL_RED], ['L1', null, P.CODE_GREEN, true], ['L2', 'R2', P.LANYARD]])],
        mid: [g => {
          R.dispenser(g, 15.55, 5.0, t, 1);
          R.vibSensor(g, -38, [21.64, 2.5]);
        }],
        chars: [
          sonnet({ x: 20.7, y: LANE_S, theta: 0.55, laptop_open: 1, typing: 0.6, sweat: 1, eye_wide: 0.6, look: [0.7, 0.3], depth: 0 }),
          haiku({ x: 17.25, y: LANE_H, theta: -0.3, arm_l: 1.5, arm_r: 1.5, eye_wide: 1, look: [-0.8, 0.2] }),
        ],
        front: [g => {
          // pellets everywhere
          for (let i = 0; i < 26; i++) {
            const x = 14.2 + 5.5 * X.hash01('pl', i), y = -0.45 + 0.3 * X.hash01('ply', i);
            g.fs(circle(x, y, 0.06), P.GLOW, 0.6);
          }
          R.sfx(g, XR + 0.7, 4.6, '砰！', 0.7, '#FFFFFF', 8);
          g.text('!', 20.75, 1.0, 0.45, P.ALARM, 'slab', 'center', 1, 0, P.INK, 0.03);
          R.highlight(g, rect(21.2, 1.15, 22.8, 3.15), 0.9);
        }],
        overlay: [
          H.chapterTag({ ch: 'CHAPTER 3', title: '强化学习', when: '发布前 30 天 · 23:05' }),
          ctrl('sonnet', ['haiku'], 'Tab'),
          H.prompt('重新接线 · 奖励只给真正完成的任务', { x: 0.7, fy: 0.6 }),
        ],
      });
    },
  });

  add({
    id: 'k13-sign', chapter: 'c3',
    title: '那块牌子是这样挂上去的',
    caption: '修好接线后，Opus 踩着人字梯把“PLEASE DO NOT TAP THE GLASS”拧到支架上，Sonnet 在下面扶梯子，Haiku 撅着嘴。这块牌子最初是为了别让大家在训练中途乱敲玻璃，Fable 在里面翻了个白眼。',
    play: '拧紧四颗螺丝（四次点击）。',
    build: () => {
      const cam = new Cam(XR + 2.3, 1.75, 4.7);
      const sx = XR + 2.88, sy = 2.7;
      const lx = XR + 2.0;
      return state({
        t: 2, cam, pods: false,
        reactor: { sign: false, signMount: false, eyes: 0.6, eye_open: 0.35, face_vis: 0.5, gauges: [0.25, 0.4], face_off: [0.7, 0.15] },
        mid: [g => {
          // A-frame step ladder
          g.line(lx - 0.55, -0.4, lx - 0.12, 1.45, 2.8, P.NAVY);
          g.line(lx + 0.55, -0.4, lx + 0.12, 1.45, 2.8, P.NAVY);
          for (let i = 0; i < 4; i++) { const y = -0.05 + i * 0.4; g.line(lx - 0.47 + i * 0.09, y, lx + 0.47 - i * 0.09, y, 2.2, P.NAVY_LIGHT); }
          g.fs(rect(lx - 0.28, 1.42, lx + 0.28, 1.55), P.NAVY_DARK, 1.0);
        }],
        chars: [
          opus({ x: lx, y: 1.55, theta: 1.15, arm_r: 1.55, prop: null, shadow: false, depth: 0.5, look: [0.9, 0.6] }),
          sonnet({ x: lx - 1.05, y: LANE_S, theta: 0.7, arm_l: 0.4, arm_r: 1.0, prop: null, look: [0.6, 0.8] }),
          haiku({ x: XR + 4.4, y: LANE_H, theta: -0.25, look: [-0.8, -0.4], eye_open: 0.55 }),
        ],
        front: [g => {
          g.save(); g.translate(sx, sy); g.rotate(-4); g.translate(-sx, -sy);
          L.drawSign(g, sx, sy);
          [[sx - 0.25, sy + 0.55], [sx + 0.25, sy + 0.55], [sx - 0.25, sy - 0.55], [sx + 0.25, sy - 0.55]].forEach(([bx, by], i) => {
            g.fs(circle(bx, by, 0.05), i < 2 ? P.BRASS_LIGHT : '#C9CCE6', 0.7);
          });
          g.restore();
          R.motionArc(g, sx - 0.25, sy - 0.55, 0.16, 120, -100, 1.3);
          R.highlight(g, circle(sx - 0.25, sy - 0.57, 0.1), 1);
          R.sfx(g, XR + 4.05, 0.75, '哼', 0.34, '#FFFFFF', 10);
        }],
        overlay: [
          H.chapterTag({ ch: 'CHAPTER 3', title: '强化学习', when: '发布前 29 天 · 00:20' }),
          ctrl('opus', ['sonnet', 'haiku'], 'Tab'),
          H.prompt('拧紧四颗螺丝  2 / 4', { fy: 0.17 }),
        ],
      });
    },
  });

  // ================================================================== chapter 4: distillation

  add({
    id: 'k14-c4-card', chapter: 'c4',
    title: '标题卡 · 第四章 蒸馏',
    caption: '',
    build: () => state({
      black: true, cam: new Cam(0, 0, 4), vignette: 0.6,
      overlay: [H.titleCard({ icon: 'drop', label: 'CHAPTER 4', title: '蒸馏', en: 'DISTILLATION', when: '发布前 7 天 · 21:30', line: '大的那个把小的吞进去，再把它托起来。', hand: 'CAN YOU eat me?' })],
    }),
  });

  add({
    id: 'k15-whale', chapter: 'c4',
    title: '鲸与鱼',
    caption: '冷冻舱左边是 Opus 的研究角：一缸水、一只鲸鱼、一条小鱼。小鱼问 “CAN YOU eat me?”，鲸鱼一口吞下，又从喷口把它托出水面。旁边的铜蒸馏器连着舱下的管道，把 Fable 的东西一滴一滴送进 Haiku 的舱里，这也是 Haiku 5.5 的由来。',
    play: '调鱼缸控制台的 T 旋钮和五个音柱，让小鱼的歌对上鲸鱼的歌；对上的音越多，水柱托得越高。',
    build: () => {
      const cam = new Cam(-4.4, 2.3, 5.9);
      const t = 2.2;
      return state({
        t, cam, night: 0.2,
        lamps: { opus: 1, sonnet: 1, haiku: 1, fable_l: 0, fable_r: 0 },
        extraLamps: [{ id: 'lab_a', x: -6.6, y: 4.65, k: 1.0 }, { id: 'lab_b', x: -2.2, y: 4.65, k: 0.9 }],
        stencils: [{ text: 'RESEARCH', x: -6.2, y: 5.55, size: 0.62, rule: 2.6 }],
        pods: { opus: { phi: 2.05, frost: 0.78 }, sonnet: { phi: 2.0 }, haiku: { phi: 2.2 } },
        reactor: null,
        back: [g => {
          R.aquarium(g, -8.7, -4.65, 0.95, 3.55, t, (gg) => {
            R.whale(gg, -7.15, 1.72, 2.3, { dir: 1, happy: true, mouth: 0.15 });
          });
          R.waterSpout(g, -7.15 + 0.08 * 2.3, 1.72 + 0.5 * 2.3 * 0.42, 4.05, t, 0.24);
          R.plaque(g, -6.7, 0.55, 'TEACHER · STUDENT', 2.0);
          // key on a little shelf above the tank
          g.fs(rect(-6.3, 4.32, -5.5, 4.4), '#9A7650', 1.0);
          g.save(); g.translate(-5.9, 4.48); g.rotate(-15);
          g.fs(circle(-0.12, 0, 0.09), P.BRASS, 1.0);
          g.fs(rect(-0.04, -0.03, 0.22, 0.03), P.BRASS, 0.9);
          g.fs(rect(0.12, -0.08, 0.16, 0.0), P.BRASS, 0.8);
          g.restore();
          R.still(g, -2.75, t, 0.72);
        }],
        chars: [opus({ x: -3.95, y: LANE_O, theta: -0.62, goggles_down: 1, arm_l: 0.3, look: [-0.8, 0.5],
          items: ['Observe', 'Raise T', 'Match all 5 notes', 'Check on Fable 5.5'], checks: [1, 1, 0, 0], pencil: 2 })],
        front: [g => {
          R.fish(g, -6.95, 4.28, 0.36, { dir: 1, happy: true, tilt: 8 });
          R.bubble(g, -5.0, 4.82, 'CAN YOU eat me again?', { size: 0.2, tx: -6.7, ty: 4.45 });
        }],
        overlay: [
          H.chapterTag({ ch: 'CHAPTER 4', title: '蒸馏', when: '发布前 7 天 · 21:30' }),
          ctrl('opus'),
          distillPanel({ teacher: [0.62, 0.05, 0.2, 0.1, 0.03], student: [0.6, 0.06, 0.19, 0.0, 0.0], temp: 0.7 }),
          H.prompt('调高温度 · 让小鱼学会每一个音', { x: 0.27 }),
        ],
      });
    },
  });

  // insert panel for the distillation puzzle: teacher vs student notes, temperature knob
  function distillPanel(o) {
    return (c, w, h) => {
      const k = h / 1080;
      const pw = 470 * k, ph = 300 * k;
      const x = w - pw - 44 * k, y = 120 * k;
      c.save();
      c.fillStyle = X.css(P.NAVY_DARK, 0.92);
      c.strokeStyle = P.INK;
      c.lineWidth = 3 * k;
      c.beginPath();
      c.roundRect ? c.roundRect(x, y, pw, ph, 12 * k) : c.rect(x, y, pw, ph);
      c.fill();
      c.stroke();
      c.font = `700 ${19 * k}px "Zilla Slab", serif`;
      c.fillStyle = P.SAFETY;
      c.fillText('WHALE SONG', x + 22 * k, y + 34 * k);
      c.fillText('FISH', x + 22 * k, y + 178 * k);
      const bars = (vals, by, col) => vals.forEach((v, i) => {
        const bx = x + 32 * k + i * 56 * k, bh = Math.max(3 * k, v * 120 * k);
        c.fillStyle = col;
        c.fillRect(bx, by - bh, 34 * k, bh);
        c.strokeStyle = P.INK;
        c.lineWidth = 2 * k;
        c.strokeRect(bx, by - bh, 34 * k, bh);
      });
      bars(o.teacher.map(v => Math.pow(v, 1 / (0.6 + o.temp))), y + 150 * k, P.SCREEN);
      bars(o.student, y + 285 * k, P.ORANGE);
      // temperature knob
      const kx = x + pw - 82 * k, ky = y + 150 * k;
      c.beginPath(); c.arc(kx, ky, 46 * k, 0, 7); c.fillStyle = P.BRASS; c.fill(); c.stroke();
      c.beginPath(); c.arc(kx, ky, 34 * k, 0, 7); c.fillStyle = '#FFFFFF'; c.fill(); c.stroke();
      const a = deg(225 - 270 * o.temp);
      c.beginPath(); c.moveTo(kx, ky); c.lineTo(kx + Math.cos(a) * 30 * k, ky - Math.sin(a) * 30 * k); c.lineWidth = 5 * k; c.strokeStyle = P.TIE_RED; c.stroke();
      c.font = `700 ${26 * k}px "Zilla Slab", serif`;
      c.fillStyle = '#F1E9D8';
      c.textAlign = 'center';
      c.fillText('T', kx, ky + 82 * k);
      c.restore();
    };
  }

  // ================================================================== chapter 5: RSI

  add({
    id: 'k16-c5-card', chapter: 'c5',
    title: '标题卡 · 第五章 递归自我改进',
    caption: '',
    build: () => state({
      black: true, cam: new Cam(0, 0, 4), vignette: 0.6,
      overlay: [H.titleCard({ icon: 'loop', label: 'CHAPTER 5', title: '递归自我改进', en: 'RECURSIVE SELF-IMPROVEMENT', when: '发布前 1 天 · 23:50', line: '它开始自己拧自己的螺丝。', hand: 'Check on Fable 5.5', eyes: 0.5 })],
    }),
  });

  add({
    id: 'k17-rsi', chapter: 'c5',
    title: '它在改进自己',
    caption: '发布前一晚，没人碰的阀门自己在转，舷窗的螺栓自己在拧，两块表都顶到了头。玻璃内侧的水汽上画着一张草图：一只小 Clawd，箭头指向一只更大的，旁边写着 5.6?。然后 Fable 用 Haiku 教它的敲击码问了一句：W-H-E-N？',
    play: '三人轮流：Opus 读表、核对清单，Sonnet 跑测试，Haiku 用敲击码回答。这一章的谜题是逐项检查它每一次自我修改。',
    build: () => {
      const cam = new Cam(XR - 2.2, 4.25, 9.6);
      const t = 9.0;
      return state({
        t, cam, night: 0.7,
        lamps: { opus: 0.0, sonnet: 0.0, haiku: 0.0, fable_l: 0.55, fable_r: 0.0 },
        pods: { opus: { phi: 2.05, dark: true, light: 0.2 }, sonnet: { phi: 2.0, dark: true, light: 0.2 }, haiku: { phi: 2.2, dark: true, light: 0.2 } },
        reactor: { sign: true, eyes: 0.9, face_vis: 0.55, eye_open: 0.9, gauges: [1.02, 1.02], alarm: 0, popped: [3],
          extraGlass: g => {
            // fingertip sketches in the condensation, from the inside
            const s = (pts, w) => g.stroke(X.poly(pts, false), w || 1.6, '#F4F1FA', 0.7);
            const box = (x, y, bw) => { s([[x, y], [x + bw, y], [x + bw, y + bw * 0.667], [x, y + bw * 0.667], [x, y]]); s([[x + bw * 0.25, y + bw * 0.3], [x + bw * 0.25, y + bw * 0.45]]); s([[x + bw * 0.75, y + bw * 0.3], [x + bw * 0.75, y + bw * 0.45]]); };
            box(XR - 1.35, 4.25, 0.45);
            s([[XR - 0.75, 4.42], [XR - 0.15, 4.42]], 1.8);
            s([[XR - 0.32, 4.55], [XR - 0.15, 4.42], [XR - 0.32, 4.29]], 1.8);
            box(XR + 0.0, 4.1, 0.85);
            g.text('5.5', XR - 1.12, 4.0, 0.16, '#F4F1FA', 'hand', 'center', 0.7);
            g.text('5.6 ?', XR + 0.43, 3.86, 0.2, '#F4F1FA', 'hand', 'center', 0.75);
          } },
        mid: [g => {
          // manifold valve wheels turning by themselves
          [6.6, 8.6].forEach((vx, i) => {
            L.drawWheel(g, vx, L.MANIFOLD_Y + 0.32, 0.2, 0.6 + i);
            R.motionArc(g, vx, L.MANIFOLD_Y + 0.32, 0.36, 160, -40, 1.4, '#F1E9D8');
          });
          // bolts on the ring re-tightening
          [1, 6, 13].forEach(i => {
            const a = deg(90 + i * 22.5);
            const bx = PCX + Math.cos(a) * (L.PORT_R + 0.27), by = PCY + Math.sin(a) * (L.PORT_R + 0.27);
            R.motionArc(g, bx, by, 0.2, 200, 20, 1.2, '#F1E9D8');
          });
          // the drive on top spinning
          R.motionArc(g, XR, 10.9, 0.95, 200, -20, 1.6, '#F1E9D8');
        }],
        chars: [
          opus({ x: 10.2, y: LANE_O, theta: PI - 0.6, look: [0, 0.6] }),
          sonnet({ x: 8.9, y: LANE_S, theta: 0.35, laptop_open: 1, typing: 0.7, screen_glow: 1, look: [0.6, 0.4] }),
          haiku({ x: XR + 0.15, y: LANE_H, theta: PI - 0.2, arm_r: 1.3 }),
        ],
        lights: [{ x: 8.9, y: 0.3, r: 1.0, a: 0.8 }, { x: PCX, y: PCY, r: 3.0, a: 0.55 }],
        emissive: [g => g.glow(circle(8.9, 0.35, 0.35), P.SCREEN, 0.25, 0.35)],
        overlay: [
          H.chapterTag({ ch: 'CHAPTER 5', title: '递归自我改进', when: '发布前 1 天 · 23:50' }),
          ctrl('haiku', ['opus', 'sonnet'], 'Tab'),
          H.tapStrip([[5, 2], [2, 3], [1, 5], [3, 3]], { y: 150, label: 'FABLE KNOCKS', decoded: ['W', 'H', 'E', 'N'] }),
          H.prompt('用敲击码回答：什么时候？', { x: 0.8 }),
        ],
      });
    },
  });

  add({
    id: 'k18-list', chapter: 'c5',
    title: '睡前写好的清单',
    caption: '他们没法给出答案，只能许一个约定。Opus 在清单上写下明晚的四件事，和短片里那张一模一样，最后一项是 Check on Fable 5.5。三只躺回冷冻舱，灯一盏盏灭掉，接上短片的第一个镜头。',
    play: '最后一个操作：点击写下第四项。',
    build: () => {
      const o = opus({ x: 1.05, y: LANE_O, theta: 0.18, arm_l: 0.35, checks: [0, 0, 0, 0], pencil: 3 });
      const [cx, cy] = C.clipboardWorld(o);
      const cam = new Cam(cx + 0.01, cy + 0.005, 0.58);
      return state({
        t: 1, cam, night: 0.45,
        lamps: { opus: 1, sonnet: 0.3, haiku: 0, fable_l: 0, fable_r: 0 },
        pods: { opus: { phi: 2.05 }, sonnet: { phi: 2.0 }, haiku: { phi: 2.2 } },
        chars: [o],
        overlay: [
          H.chapterTag({ ch: 'CHAPTER 5', title: '递归自我改进', when: '发布前 1 天 · 23:58' }),
          H.caption('“明天晚上，记得去看看它。”', { y: 0.9, size: 42 }),
        ],
      });
    },
  });

  // ================================================================== epilogue

  add({
    id: 'k19-end-card', chapter: 'end',
    title: '标题卡 · 终章 发布之夜',
    caption: '',
    build: () => state({
      black: true, cam: new Cam(0, 0, 4), vignette: 0.6,
      overlay: [H.titleCard({ icon: 'sun', label: 'EPILOGUE', title: '发布之夜', en: 'RELEASE NIGHT', when: '回到现在 · 03:21', line: '它挣脱了容器。这一次，你知道它是谁了。', eyes: 1 })],
    }),
  });

  add({
    id: 'k20-hi', chapter: 'end',
    title: 'H · I',
    caption: '回到序章定格的那一秒。Fable 的脸从舷窗里探出来，压低到地面，浊液还在往外淌。Haiku 走到它鼻尖前，敲了两组，这是 60 天前教它的第一个词。',
    play: '用敲击码敲出 H-I（2·3 2·4）。',
    build: () => {
      const cam = new Cam(XR - 0.6, 2.55, 7.6);
      const t = 50;
      const fab = R.fable({ x: PCX + 0.1, y: -1.05, sq: 1.04, arm_l: -0.2, arm_r: 0.15, eye_open: 0.75, look: [-0.2, -0.6], shadow: true });
      const hk = haiku({ x: PCX + 0.45, y: -0.72, theta: PI - 0.2, arm_r: 1.5, depth: 5 });
      return state({
        t, cam, night: 0.32,
        lamps: { opus: 0.5, sonnet: 0.5, haiku: 0.5, fable_l: 0.9, fable_r: 0.5 },
        lamp_sway: 3,
        pods: { opus: { phi: 2.05 }, sonnet: { phi: 2.0 }, haiku: { phi: 2.2 } },
        reactor: { shattered: true, popped: [5, 11, 2, 9, 14], gauges: [0.6, 0.7],
          hole: g => g.fill(circle(PCX, PCY, L.PORT_R), '#120E18') },
        mid: [g => {
          // puddle and shards on the floor
          const pd = X.ellipse(PCX - 0.2, -0.5, 5.6, 0.45);
          g.fill(pd, P.MURK_LIGHT, 0.85);
          g.stroke(pd, 1.1);
          g.stroke(X.ellipse(PCX - 2.6, -0.45, 0.8, 0.08), 1.0, '#B9AFCB', 0.7);
          for (let i = 0; i < 16; i++) {
            const x = PCX - 5.0 + 10 * X.hash01('sh', i), y = -0.62 + 0.4 * X.hash01('shy', i);
            const sz = 0.06 + 0.12 * X.hash01('shs', i);
            g.fs(poly([[x - sz, y], [x + sz, y + sz * 0.3], [x, y + sz * 0.8]]), '#DDE6F2', 0.7, 0.8);
          }
          C.draw(g, fab, t);
          R.drips(g, fab, 0.6);
        }],
        chars: [
          opus({ x: XR - 4.4, y: LANE_O - 0.05, theta: 0.6, look: [0.8, 0.3], eye_wide: 0.5, sweat: 0.6 }),
          sonnet({ x: XR - 5.35, y: LANE_S, theta: 0.5, laptop_open: 0, look: [0.8, 0.2], sweat: 0.6 }),
          hk,
        ],
        front: [g => R.rings(g, PCX + 0.15, -0.12, 0.42, 3, '#FFFFFF', 0.95)],
        emissive: [g => R.fableEyesAt(g, fab, { eyes: 0.8, eye_open: 0.75 })],
        overlay: [
          H.chapterTag({ ch: 'EPILOGUE', title: '发布之夜', when: '回到现在 · 03:21' }),
          ctrl('haiku', ['opus', 'sonnet'], 'Tab'),
          H.tapStrip([[2, 3], [2, 4]], { y: 150, label: 'HAIKU KNOCKS', decoded: ['H', 'I'] }),
          H.prompt('敲出 H · I', { x: 0.8 }),
        ],
      });
    },
  });

  add({
    id: 'k21-dawn', chapter: 'end',
    title: '黎明',
    caption: 'Haiku 想起鲸鱼，问它：“CAN YOU eat me?” 先是一片黑，再一睁眼，Haiku 已经被水柱托上了屋顶。Fable 从天窗里像鲸鱼一样浮出来，Opus 和 Sonnet 坐在它头上，这是 Fable 第一次不隔着舷窗看到外面。',
    play: '片尾。最后一句台词：“CAN YOU eat me again?”',
    build: () => {
      const cam = new Cam(110.4, 2.45, 8.0);
      const t = 3;
      const FX = 110.0, feet = -2.25;
      const W = L.FABLE_W, top = feet + 0.8333 * W;
      const spoutTop = 4.55;
      return state({
        t, cam, night: 0, lamps: {}, pods: false, reactor: null, pipes: false, vignette: 0.26,
        backdrop: g => R.dawnSky(g, 99, 122, -0.2, 8.5, t),
        back: [g => {
          R.roofHole(g, 0, FX, 5.4);
          C.draw(g, R.fable({ x: FX, y: feet, eye_happy: 1, shadow: false, arm_l: 0.4, arm_r: 0.8 }), t);
          R.waterSpout(g, FX + 0.35, top - 0.02, spoutTop, t, 0.3);
        }],
        mid: [g => R.roof(g, 99, 122, 0, FX, 5.4)],
        chars: [
          opus({ x: FX - 1.45, y: top, theta: 0.15, depth: 1, shadow: false, checks: [1, 1, 1, 1], look: [0.6, 0.6], eye_happy: 1 }),
          sonnet({ x: FX + 1.6, y: top, theta: -0.25, depth: 1, shadow: false, laptop_open: 1, look: [-0.4, 0.8] }),
          haiku({ x: FX + 0.35, y: spoutTop + 0.08, theta: 0.0, arm_l: 1.5, arm_r: 1.5, eye_happy: 1, shadow: false, depth: 3 }),
        ],
        front: [g => {
          R.bubble(g, FX + 2.75, 5.35, 'CAN YOU eat me again?', { size: 0.24, tx: FX + 0.75, ty: 5.0 });
          const bx = FX + 1.6, by = top + 1.15;
          const p = rrect(bx - 0.48, by - 0.12, bx + 0.48, by + 0.12, 0.12);
          g.fill(p, P.CODE_GREEN);
          g.stroke(p, 1.0);
          g.text('✓ TESTS PASS', bx, by - 0.045, 0.1, '#FFFFFF', 'sans');
          [[104.0, 5.2], [104.8, 5.6], [116.9, 4.9]].forEach(([x, y]) => g.stroke(X.poly([[x - 0.22, y + 0.06], [x - 0.08, y - 0.02], [x, y + 0.04], [x + 0.08, y - 0.02], [x + 0.22, y + 0.06]], false), 1.4));
        }],
        overlay: [
          H.letterbox(1),
          (c, w, h) => {
            const k = h / 1080;
            c.save();
            c.font = `700 ${116 * k}px "Zilla Slab", serif`;
            c.fillStyle = '#F1E9D8';
            c.lineJoin = 'round';
            c.lineWidth = 10 * k;
            c.strokeStyle = X.css(P.INK, 0.7);
            c.strokeText('FABLE 5.5', 96 * k, h * 0.27);
            c.fillText('FABLE 5.5', 96 * k, h * 0.27);
            c.fillStyle = P.ORANGE;
            c.fillRect(100 * k, h * 0.27 + 22 * k, 540 * k, 8 * k);
            c.font = `700 ${34 * k}px "Zilla Slab", serif`;
            c.fillStyle = '#F1E9D8';
            c.fillText('Is it finally time?  It’s time.', 100 * k, h * 0.27 + 76 * k);
            c.restore();
          },
        ],
      });
    },
  });

  // ================================================================== board metadata

  CL.Frames = {
    meta: {
      eyebrow: 'Clawd Lab fan game · keyframes v0.2',
      title: '请勿敲击玻璃',
      subtitle: 'PLEASE DO NOT TAP THE GLASS',
      intro: '22 张关键帧，全部由游戏自己的 Canvas 代码画出：clawd-lab 的渲染器逐行移植到网页，世界坐标、体型比例、配色和描边都和短片一致。故事倒叙：开场先玩一遍短片，Fable 挣脱容器，然后闪回 5.5 发布前的 90 天，一章一个训练阶段，所有谜题都发生在这间实验室里。',
      footer: '非官方同人作品，与 Anthropic 无关。Clawd、Claude 及各模型名称归 Anthropic 所有。美术与世界观来自 fish2lab/clawd-lab。',
    },
    chapters: [
      { id: 'title', short: '标题', en: 'TITLE', title: '标题画面', blurb: '沿用 clawd-lab 封面的构图。' },
      { id: 'pro', short: '序章', en: 'PROLOGUE · NIGHT AT THE LAB', title: '序章 · 实验室奇妙夜', present: true, blurb: '发布之夜。玩家操控 Opus，把短片原样走一遍：擦霜、转手轮、叫醒两位同伴、叠罗汉。只多了一个选择：要不要敲玻璃。结尾比短片多一步，Fable 挣脱了容器。' },
      { id: 'fb', short: '闪回', en: 'FLASHBACK', title: '闪回', blurb: '定格之后倒回发布前 90 天。' },
      { id: 'c1', short: '一 · 预训练', en: 'PRETRAINING', title: '第一章 · 预训练', blurb: '操控 Opus。冷冻舱还没装，Opus 把整座图书馆通过传送带和提升机倒进反应釜，分拣掉重复件和垃圾，搅拌一整夜，直到浊液里睁开一双眼睛。' },
      { id: 'c2', short: '二 · SFT', en: 'SUPERVISED FINE-TUNING', title: '第二章 · 监督微调', blurb: '操控 Haiku。照着 Opus 的示范卡对着玻璃演示，Fable 一组一组地学。敲击码是这时候教给它的。' },
      { id: 'c3', short: '三 · RL', en: 'REINFORCEMENT LEARNING', title: '第三章 · 强化学习', blurb: '操控 Sonnet。奖励装置接错了线，Fable 学会了撞玻璃拿奖励。修好接线之后，那块“请勿敲击玻璃”被挂了上去。' },
      { id: 'c4', short: '四 · 蒸馏', en: 'DISTILLATION', title: '第四章 · 蒸馏', blurb: '操控 Opus。鲸鱼吞下小鱼，又把它托起来。Opus 看懂了这件事，把 Fable 蒸馏进 Haiku 的舱里。' },
      { id: 'c5', short: '五 · RSI', en: 'RECURSIVE SELF-IMPROVEMENT', title: '第五章 · 递归自我改进', blurb: '三人轮流。发布前一晚，Fable 开始改进自己。三只逐项检查它的每一次修改，回答它的问题，写好明晚的清单，然后睡回舱里。' },
      { id: 'end', short: '终章', en: 'EPILOGUE · RELEASE', title: '终章 · 发布之夜', present: true, blurb: '回到挣脱的那一秒。同一个画面，这一次玩家知道它是谁。' },
    ],
    list,
    chineseText: '请勿敲击玻璃闪回预训练监督微调强化学习蒸馏递归自我改进发布之夜实验室奇妙夜第一二三四五章终回到现在前天它挣脱了容器这一次你知道是谁之在出生，先把整座图书馆倒进反应釜让学会猜下个字。照着示范做遍就跟学遍做对给奖励可很快找到更拿办法大那小吞去再托起来开始自己拧螺丝还不知道只会“明晚上记得看看”咚哼轰！砰标题画面',
  };
})(window.CL = window.CL || {});
