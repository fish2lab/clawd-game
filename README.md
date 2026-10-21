# 请勿敲击玻璃 · PLEASE DO NOT TAP THE GLASS

一个 Clawd 同人网页解谜游戏，承接 [clawd-lab「实验室奇妙夜」](https://github.com/fish2lab/clawd-lab)。

开场先把短片玩一遍：Opus 醒来，叫醒 Sonnet 和 Haiku，三只叠成一摞，Haiku 敲了玻璃。这一次玻璃整块炸开，Fable 5.5 挣脱了容器。然后闪回 5.5 系列发布前 90 天，一章一个训练阶段（预训练、监督微调、强化学习、蒸馏、递归自我改进），所有谜题都发生在这间实验室里。

![关键帧](docs/storyboard.jpg)

**当前状态：设计和关键帧阶段。**

- 设计方案：[docs/DESIGN.md](docs/DESIGN.md)
- 关键帧：[docs/keyframes/](docs/keyframes/)，也可以用浏览器直接打开 [keyframes.html](keyframes.html)，画面由代码实时绘制。

## 做法

clawd-lab 的渲染器（skia + Python）已经逐行移植到 Canvas 2D，所以游戏和短片共用同一个世界坐标、同样的比例、配色和描边。纯静态网页，不用框架，也不需要构建，双击 HTML 就能运行。

```bash
# 重新导出关键帧（需要 Node 和 Playwright 的 Chromium）
node tools/shoot.mjs /tmp/kf
pip install pillow && python tools/pack_keyframes.py /tmp/kf
```

## 授权

- 代码：MIT
- 字体：SIL Open Font License，许可文本在 `assets/fonts/`。`zcool-subset.woff2` 是站酷庆科黄油体的子集。
- 非官方同人作品。Clawd、Claude 及各模型名称归 Anthropic 所有，本项目与 Anthropic 无关。
