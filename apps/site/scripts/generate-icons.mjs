import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const icons = [
  { fileName: "favicon.png", size: 64 },
  { fileName: "apple-touch-icon.png", size: 180 },
  { fileName: "icon-192.png", size: 192 },
  { fileName: "icon-512.png", size: 512 }
];

await mkdir(publicDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const icon of icons) {
    const scale = icon.size / 512;
    const page = await browser.newPage({
      viewport: { width: icon.size, height: icon.size },
      deviceScaleFactor: 1
    });

    await page.setContent(`<!doctype html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; width: 100%; height: 100%; background: transparent; }
            body { display: grid; place-items: center; }
            .icon {
              display: grid;
              grid-template-columns: repeat(2, ${82 * scale}px);
              grid-template-rows: repeat(2, ${82 * scale}px);
              gap: ${34 * scale}px;
              width: ${icon.size}px;
              height: ${icon.size}px;
              padding: ${106 * scale}px;
              border: ${10 * scale}px solid #31566b;
              border-radius: ${108 * scale}px;
              background:
                radial-gradient(circle at 50% 42%, #10273c 0, #07111f 68%),
                #07111f;
              box-shadow: inset 0 0 0 ${5 * scale}px rgba(81, 244, 231, 0.12);
            }
            .icon span { border-radius: 50%; }
            .icon span:nth-child(1) { background: #51f4e7; }
            .icon span:nth-child(2) { background: #ffc24a; }
            .icon span:nth-child(3) { background: #ff5d7d; }
            .icon span:nth-child(4) { background: #a982ff; }
          </style>
        </head>
        <body>
          <div class="icon" aria-label="LAN Party Hub icon">
            <span></span><span></span><span></span><span></span>
          </div>
        </body>
      </html>`);

    await page.locator(".icon").screenshot({
      path: `${publicDirectory}${icon.fileName}`,
      omitBackground: true
    });
    await page.close();
  }
} finally {
  await browser.close();
}
