import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { renderMeta, renderNotFound, renderPage } from "./src/page.js";

const siteRoot = fileURLToPath(new URL(".", import.meta.url));
const defaultSiteUrl = "https://lan-party-hub-qiu.pages.dev";

function normalizeSiteUrl(value: string | undefined): string {
  const candidate = value?.trim() || defaultSiteUrl;
  const parsed = new URL(candidate);

  if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
    throw new Error("SITE_URL must use http or https.");
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/$/, "");
}

function renderStaticHtml(siteUrl: string): Plugin {
  return {
    name: "lan-party-hub-site-html",
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        const isNotFound = context.path.endsWith("/404.html") || context.path === "/404.html";
        const locale = context.path.startsWith("/zh/") ? "zh" : "en";
        const language = locale === "zh" ? "zh-CN" : "en";
        const page = isNotFound ? renderNotFound() : renderPage(locale);

        return html
          .replace("%LANG%", language)
          .replace("<!-- SITE_META -->", renderMeta(locale, siteUrl, isNotFound))
          .replace("<!-- SITE_PAGE -->", page);
      }
    }
  };
}

function emitDiscoveryFiles(siteUrl: string): Plugin {
  return {
    name: "lan-party-hub-site-discovery",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
      });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}/</loc></url>\n  <url><loc>${siteUrl}/zh/</loc></url>\n</urlset>\n`
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, siteRoot, "");
  const siteUrl = normalizeSiteUrl(environment.SITE_URL ?? process.env.SITE_URL);

  return {
    plugins: [renderStaticHtml(siteUrl), emitDiscoveryFiles(siteUrl)],
    publicDir: resolve(siteRoot, "public"),
    build: {
      outDir: resolve(siteRoot, "dist"),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          home: resolve(siteRoot, "index.html"),
          chinese: resolve(siteRoot, "zh/index.html"),
          notFound: resolve(siteRoot, "404.html")
        }
      }
    },
    server: {
      host: "0.0.0.0",
      port: 5175
    },
    preview: {
      host: "0.0.0.0",
      port: 4175
    }
  };
});
