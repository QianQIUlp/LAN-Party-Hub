# Third-Party Source Provenance

LAN Party Hub 将下列游戏源代码作为首版内置组件。导入时使用完整 Git 提交号，以便构建和审计可复现；这些仓库均声明 Apache License 2.0。

| 游戏 | 上游源码 | 固定提交 |
| --- | --- | --- |
| `tap-race` | https://github.com/Hartwich/tap-race | `54ba192db787e4bd3862181d0381e1df6dad8730` |
| `zeichnen-und-erraten` | https://github.com/Hartwich/zeichnen-und-erraten | `bb9b1dca148ccca644ff6b970a60f21789263684` |
| `schaetzorama` | https://github.com/Hartwich/schaetzorama | `d5c52c63769d00657deb1f4437b25adb10cf401a` |
| `imposter` | https://github.com/Hartwich/imposter | `d3dc19e7b4cdcb30d4d0ac4e2a2c1a397ba30667` |

## 可选游戏集成参考（不随发行包分发）

平台的 Buzzwort 共享协议以 Apache-2.0 的
https://github.com/Hartwich/buzzwort 提交
`10f336ecb14400e505e67b6476aaa188712539c9` 为契约基线；通用 `secret_card`
控制器布局适配自 Open Party Lab 提交
`5df28a2107a1822087cb6f9e98a56cef7fca9757`。本仓库没有导入 Buzzwort 的词卡、图片、音频或其他游戏内容，外部游戏也不进入 LAN Party Hub 发行包。
## LAN Party Hub 原创游戏（非第三方）

`bullshit` 由 LAN Party Hub 项目在
https://github.com/QianQIUlp/LAN-Party-Hub 中原创实现，来源是贡献者描述的传统纸牌玩法。
代码、规则状态机和牌面 UI 均以本仓库 Git 历史为审计来源；未导入第三方牌面、字体、音频或数据集。控制器使用的两张原创像素素材由 OpenAI 内置图像生成工具于 2026-07-23 生成，其提示词边界、后处理方式与许可记录在 `games/bullshit/assets/README.md`。

`roulette`、`liars-table` 与 `auction-king` 同样由 LAN Party Hub 在本仓库内原创实现，没有外部源码提交号。本仓库 Git 历史是其代码、规则和视觉实现的审计来源；公开发行所用美术必须在对应游戏资产说明中记录原创生成或许可来源。

## 项目介绍站生成素材（非第三方）

`apps/site/public/og.png` 由 OpenAI 内置图像生成工具于 2026-07-29 为 LAN Party Hub 项目介绍站专门生成，没有使用输入图片、第三方徽标或外部素材。完整提示词、文件哈希与后处理记录见 `apps/site/ASSETS.md`。

LAN Party Hub 应用图标由仓库脚本从项目介绍站既有的四点 CSS 品牌标记确定性生成，没有使用外部图片、字体、徽标或生成媒体服务。浏览器、Windows EXE 与系统托盘资产的生成方式、尺寸和文件哈希见 `assets/branding/README.md`。

## LAN Party Hub 中的修改

- 将游戏放入根工作区 `games/<game-id>`，并由生成器同时合并可选的 `local-games/`。
- 增加简体中文 manifest、主屏、控制器、阶段、结果和错误文本。
- 增加原创或项目内维护的中文离线词库和题目内容。
- 增加服务端身份、阶段、长度、范围、重复提交和频率验证。
- 修正谁是卧底的私人信息边界：普通玩家获得秘密词，卧底只获得分类。
- 将四款导入游戏的首版人数范围收敛为 2–4 人；谁是卧底为 3–4 人。原创 `bullshit` 按 52 张牌的自然上限支持 2–52 人。
- 增加单元测试、Socket.IO 恢复测试和浏览器冒烟测试。

后续修改可通过本仓库 Git 历史审计。上游作者不对本派生版本中的修改负责。
