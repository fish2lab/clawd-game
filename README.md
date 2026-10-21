# 请勿敲击玻璃 · PLEASE DO NOT TAP THE GLASS

一个 Clawd 同人网页解谜游戏，承接 [clawd-lab「实验室奇妙夜」](https://github.com/fish2lab/clawd-lab) 的结尾：Haiku 敲了玻璃，Fable 撞了三下，然后一片漆黑。

四只 Clawd 各自醒在自己“受训”的房间里：Fable 在语料池（预训练），Haiku 在描红教室（SFT），Sonnet 在奖励回路（RL），Opus 在鲸鱼缸前（蒸馏）。他们要在凌晨 4 点的 RESET 之前会合，回答 Fable 敲在玻璃上的那个问题（RSI）。

**当前状态：设计阶段。** 完整方案见 [docs/DESIGN.md](docs/DESIGN.md)，包括剧情、谜题、美术、声音、技术方案和里程碑。

## 计划中的形态

- 一个静态网页（`index.html` + `src/*.js`），不用框架，也不需要构建，双击就能玩
- 画面全部由 Canvas 2D 代码绘制，声音由 WebAudio 实时合成，和 clawd-lab 一样不用位图素材
- 桌面和手机都能玩，可以部署到 GitHub Pages

## 授权

非官方同人作品。Clawd、Claude 及各模型名称归 Anthropic 所有，本项目与 Anthropic 无关。
