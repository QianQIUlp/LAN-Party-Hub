# Cloudflare Pages 项目介绍站部署

`apps/site` 是 LAN Party Hub 的独立静态项目介绍站。Cloudflare Pages 只需要构建这个 workspace；不要在 Pages 中启动或部署 `apps/server`、`apps/host`、`apps/controller`。真正的房间、Socket.IO 和游戏运行时仍由 Windows 便携版在玩家的局域网中提供。

## Cloudflare Pages 设置

在 Cloudflare Dashboard 中创建 Pages 项目并连接 `QianQIUlp/LAN-Party-Hub` 后，使用以下配置：

| 设置 | 值 |
| --- | --- |
| Production branch | `main` |
| Root directory | 留空（仓库根目录） |
| Build command | `npm run site:build` |
| Build output directory | `apps/site/dist` |
| Build system | Version 3 |

环境变量：

| 名称 | 推荐值 | 用途 |
| --- | --- | --- |
| `NODE_VERSION` | `22.16.0` | 固定 Pages 构建环境；仓库代码仍兼容文档要求的 Node.js 20+ |
| `SITE_URL` | 最终公开站点的完整来源地址，例如 `https://lan-party-hub-qiu.pages.dev` | 生成 canonical、`hreflang`、Open Graph、robots 和 sitemap 绝对 URL |

如果 Pages 项目使用其他名称或之后绑定自定义域名，必须把生产环境的 `SITE_URL` 改为最终域名，不要保留示例值。Preview 环境可以设置为预期的预览来源；不设置时构建会使用 `https://lan-party-hub-qiu.pages.dev` 作为确定性的本地默认值。

推荐的 Build watch paths：

```text
apps/site/*
package.json
package-lock.json
config/known-games.json
```

`config/known-games.json` 被站点测试用来核对八款发行内置游戏；站点本身不导入游戏运行时代码。Pages 的 [monorepo 指南](https://developers.cloudflare.com/pages/configuration/monorepos/) 和 [构建配置文档](https://developers.cloudflare.com/pages/configuration/build-configuration/) 解释了根目录、构建命令和输出目录的含义。

## 分支与发布行为

- `main` 的新提交会生成生产部署。
- 同仓库 Pull Request 会生成预览部署，可在合并前检查英文 `/`、中文 `/zh/` 和 `/404.html`。
- GitHub 与 Cloudflare 的连接以及首次自定义域名绑定必须在 Cloudflare Dashboard 中完成；仓库代码不会保存 Cloudflare API Token。
- 添加自定义域名时先在 Pages 项目的 Custom domains 中登记，再修改 DNS。详见 Cloudflare 的 [自定义域名文档](https://developers.cloudflare.com/pages/configuration/custom-domains/)。

## 静态路由与响应头

站点预渲染三个 HTML 入口：

- `/`：英文介绍
- `/zh/`：中文介绍
- `/404.html`：真实的未找到页面，避免 Pages 将所有未知路径回退到首页

站点没有客户端路由，因此不需要 SPA `_redirects`。`apps/site/public/_headers` 会随构建复制到输出目录，为静态响应设置 CSP、Permissions Policy、禁止嵌入、`nosniff`，并对指纹资源启用长期缓存。Cloudflare 对 `_headers` 的解析规则见 [Headers 文档](https://developers.cloudflare.com/pages/configuration/headers/)；静态文件与 404 行为见 [Serving Pages 文档](https://developers.cloudflare.com/pages/configuration/serving-pages/)。

## 本地验证

```bash
npm ci
npm run site:build
npm run site:preview
```

构建产物位于 `apps/site/dist`，包含英文、中文、404、`_headers`、manifest、robots、sitemap 和社交分享图。完整仓库验证仍使用：

```bash
npm run legal:check
npm run typecheck
npm run build
```
