# 章节怎么做

每一章是 `src/diorama/<id>/` 下的一个文件夹（`ch1` … `ch5`、`epilogue`），只动自己的文件夹和自己的测试脚本，就不会和别的章节冲突。设计见 [DESIGN.md](DESIGN.md) 第 6 节。

## 文件

```
src/diorama/<id>/manifest.js    CL.Chapters.manifest('<id>', ['props.js', 'level.js', 'play.js'])，按顺序加载
src/diorama/<id>/*.js           本章的模型、房间、规则；其中一个文件调用 CL.Chapters.define('<id>', { build, setup })
tools/playtest-<id>.mjs         用真实点击通关本章（tools/lib/drive.mjs）
docs/diorama/<id>-*.jpg         本章截图
docs/chapters/<id>.md           本章实际做成了什么：谜题链、可交互物、和设计稿的出入
```

## 接口

```js
CL.Chapters.define('ch1', {
  build(world) {                       // 搭房间：先 CL.Room.build，再摆本章的陈设
    const L = CL.Room.build(world, { clock: [22, 40] });
    // L.walls.{back,left,front,right}、L.reactor、L.reactorLamps、L.clock、L.exit、L.floor、L.grid
    return L;
  },
  setup(world, L, api) {               // 规则
    const A = { opus: world.addActor('opus'), sonnet: world.addActor('sonnet') };
    const hud = api.hud({ todo: ['Load corpus', '…'], actors: A });   // hud.tick(i) / circle(i) / badge(a, text) / show()
    const M = CL.Moves.setup(world, A, { locked: a => world.bubble(a, 'zz') });
    M.floor(L.floor); M.actors();      // 走路、选人、叠罗汉（小的站在大的上面）
    const box = M.pushable(mesh, { fits: (x, z) => true });   // Opus 推、推不动就拉
    const { puff, burst } = api.fx;    // 蒸汽
    // 结束本章：api.finish()，接下来是下一章的标题卡
    return { S, A, L, begin() {}, async look(name) {}, probe: {} };
  },
});
```

- `S` 是本章的状态（纯数据，测试会读它）；`A` 是角色；`probe` 里可以给测试加只读函数。
- `begin()`：玩家点了标题卡上的「开始」之后调用。设置镜头、选中角色、`hud.show()`。
- `look(name)`：直接摆好一个画面给截图用（`node tools/shoot3d.mjs out ch1/room`）。
- 共用的东西：`CL.Room`（房间、`run()` 画管道）、`CL.Moves`（走、跳、叠、转轮、推箱子）、`CL.Kit`（模型零件）、`CL.Tex`（2D 渲染器画的贴图、气泡图形）、`CL.Fx`（蒸汽）、`CL.Sound.play(name)`、`world.bubble(a, kind)`、`world.tween / wait / addUpdate / addPick / interact`。

## 规则

1. **只动自己的文件夹。** 需要的新模型、贴图、声音、气泡图形写在本章文件夹里。确实需要改共用文件（引擎、kit、tex）时，只做最小的增量修改，并在 `docs/chapters/<id>.md` 里写明改了什么、为什么。
2. **画面上不写字。** 只有短片本来就有的字：标签、牌子、清单、屏幕上的读数。反馈靠图形气泡、仪表、声音和物体本身。
3. **每个谜题至少两步推理，至少一条看起来对的错路**，错路也给出有用的反馈。不能有死局（推箱子的推不动就拉，就是为此）。
4. **可交互物不少于 25 个**，其中约三分之一是信息源。
5. **状态一眼可读。** 阀门、开关、拉杆的开和关要长得不一样（参考序章：球阀手柄顺着管子是开，横过来是关；闸阀开时黄杆升起）。
6. **风格跟短片一致**：用 `CL.Ink.ink()` 材质和 `CL.Kit` 零件，颜色只用 `CL.P` 色板。
7. **测试要过**：`node tools/playtest-<id>.mjs` 用真实点击通关本章，并且 `node tools/playtest.mjs`（序章）和 `node tools/playtest-flow.mjs` 仍然通过。
