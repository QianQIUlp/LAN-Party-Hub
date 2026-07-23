# Third-Party Source Provenance

LAN Party Hub 将下列游戏源代码作为首版内置组件。导入时使用完整 Git 提交号，以便构建和审计可复现；这些仓库均声明 Apache License 2.0。

| 游戏 | 上游源码 | 固定提交 |
| --- | --- | --- |
| `tap-race` | https://github.com/Hartwich/tap-race | `54ba192db787e4bd3862181d0381e1df6dad8730` |
| `zeichnen-und-erraten` | https://github.com/Hartwich/zeichnen-und-erraten | `bb9b1dca148ccca644ff6b970a60f21789263684` |
| `schaetzorama` | https://github.com/Hartwich/schaetzorama | `d5c52c63769d00657deb1f4437b25adb10cf401a` |
| `imposter` | https://github.com/Hartwich/imposter | `d3dc19e7b4cdcb30d4d0ac4e2a2c1a397ba30667` |

## LAN Party Hub 中的修改

- 将游戏放入根工作区 `games/<game-id>`，并由生成器同时合并可选的 `local-games/`。
- 增加简体中文 manifest、主屏、控制器、阶段、结果和错误文本。
- 增加原创或项目内维护的中文离线词库和题目内容。
- 增加服务端身份、阶段、长度、范围、重复提交和频率验证。
- 修正谁是卧底的私人信息边界：普通玩家获得秘密词，卧底只获得分类。
- 将首版人数范围收敛为 2–4 人；谁是卧底为 3–4 人。
- 增加单元测试、Socket.IO 恢复测试和浏览器冒烟测试。

后续修改可通过本仓库 Git 历史审计。上游作者不对本派生版本中的修改负责。
