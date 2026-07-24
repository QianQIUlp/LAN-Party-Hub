<!-- Modified for LAN Party Hub; see CHANGES.md and NOTICE.md. -->
# LAN Party Hub / 局域网派对中心

LAN Party Hub 是一个本地优先的浏览器派对游戏平台：Windows 电脑运行权威服务器并显示共享主屏，玩家用同一 Wi‑Fi 下的手机浏览器扫码加入；每款游戏有自己的参与人数范围。默认简体中文，不需要账号、云服务或公网连接。

> 当前状态：首个可玩版本的代码与自动化基线。五款游戏仍为 alpha，发布前还需要 Windows、Android、iPhone 和真人聚会验收。详见 [项目状态](docs/project-status.md)。

## 首版内置游戏

| 游戏 | 人数 | 大致时长 | 内容 |
| --- | ---: | ---: | --- |
| 疯狂点击 `tap-race` | 2–4 | 20 秒内 | 全年龄；率先完成 50 次有效点击 |
| 你画我猜 `zeichnen-und-erraten` | 2–4 | 约 1–2 分钟 | 全年龄默认；成人词库需主机明确选择 |
| 估个大概 `schaetzorama` | 2–4 | 约 2–3 分钟 | 全年龄；数字、百分比、排序与归类 |
| 谁是卧底 `imposter` | 3–4 | 约 2 分钟 | 全年龄默认；成人词库需主机明确选择 |
| 吹牛牌 `bullshit` | 2–52 | 视人数而定 | 全年龄；背面出牌、跟牌、质疑与每堆一次过牌 |

所有游戏源码都固定在本仓库的 `games/` 中。新克隆可以直接构建五款游戏，Release 不会临时下载游戏仓库。四款导入游戏的上游固定版本、原创游戏来源和修改说明见 [THIRD_PARTY_SOURCES.md](THIRD_PARTY_SOURCES.md)。

## Windows 便携版

GitHub Release 产物名为 `LAN-Party-Hub-windows-x64.zip`：

1. 完整解压 ZIP。
2. 双击 `LAN-Party-Hub.exe`。
3. 电脑主屏自动打开；手机连接同一 Wi‑Fi 后扫码加入。
4. 退出时右键托盘图标并选择“退出”。

便携包包含 Node.js 和全部运行资源，不要求安装开发工具。启动器支持单实例和 3000–3010 动态端口。房间数据与日志保存在发行目录的 `data/`。当前程序未签名，Windows 可能显示 SmartScreen 和防火墙提示；请允许专用网络访问。

更完整的运行说明见 [Windows 便携版文档](docs/release-build.md)。

## 从源码运行

要求 Node.js 20+、npm 10+。

```bash
npm ci
npm run games:list
npm run build
```

Windows 上可一次启动开发环境：

```powershell
npm run dev:all
```

其他平台可分别启动三个进程：

```bash
npm run dev:server
npm run dev:host
npm run dev:controller
```

默认开发地址：服务器 `http://localhost:3000`、主屏 `http://localhost:5173`、手机控制器 `http://localhost:5174`。手机必须通过电脑的局域网 IPv4 地址访问；主屏会列出服务端检测到的候选地址。

## 架构

```text
apps/server       权威房间、计时、规则、计分、持久化
apps/host         共享屏幕与主机操作，不决定游戏结果
apps/controller   手机 UI，只发送玩家意图并显示私人状态
packages/protocol 三端共享的房间与 Socket.IO 契约
packages/game-core 游戏 manifest、生命周期与目录文本
games/            五款内置游戏的固定源码
local-games/      可选外部游戏，仅用于本地开发，不进入源码控制
```

服务重启后会恢复房间、玩家身份、游戏设置和累计分数。为了避免不可靠的实时状态复活，未完成的一局会安全中止，玩家重连后回到该游戏的准备页。

## 验证

```bash
npm run test       # Vitest：平台恢复和游戏规则
npm run test:e2e   # Playwright：主屏 + 独立手机浏览器上下文
npm run typecheck  # 平台与五款内置游戏
npm run build      # 完整生产构建
npm run verify     # test → typecheck → build
```

Playwright 冒烟测试会拦截公网请求，验证离线加入、刷新恢复、人数限制，以及三人连续启动并切换全部五款游戏。CI 也会执行这些检查；Windows Release 工作流负责组装 ZIP 和 SHA-256。

## 可选游戏与新游戏

`config/known-games.json` 仍记录其他可选上游游戏。它们可以克隆到 `local-games/<game-id>`，再运行：

```bash
npm run games:sync-local
```

缺少可选游戏是正常情况。不要为可能不存在的游戏加入静态 import；注册表由脚本生成。新游戏请先阅读 [小游戏 SDK](docs/minigame-sdk.md)、[多仓库游戏](docs/multi-repo-games.md) 和 [创建游戏](docs/create-a-game.md)。

## 贡献与许可

行为修改应保持服务端、协议、主屏、控制器、测试和文档的垂直一致。开始前请阅读 [AGENTS.md](AGENTS.md) 与 [CONTRIBUTING.md](CONTRIBUTING.md)。

代码采用 Apache License 2.0，见 [LICENSE](LICENSE)。品牌、素材、词库和第三方依赖的说明见 [NOTICE.md](NOTICE.md)。

版权、修改标记和第三方来源规则见 [许可与署名政策](docs/licensing-and-attribution.md)；多 Agent 的分支、worktree、文件所有权和共享接口流程见 [并行开发规范](docs/parallel-development.md)。

## Acknowledgements

LAN Party Hub is based on [Hartwich/Open-Party-Lab](https://github.com/Hartwich/Open-Party-Lab), originally maintained by Hartwich. This repository is an independent derivative and is not an official or endorsed Open Party Lab release. Upstream and derivative notices are distributed under the Apache License 2.0 as described in [NOTICE.md](NOTICE.md) and [CHANGES.md](CHANGES.md).
