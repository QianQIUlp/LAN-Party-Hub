import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const siteIcons = [
  { fileName: "favicon.png", size: 64 },
  { fileName: "apple-touch-icon.png", size: 180 },
  { fileName: "icon-192.png", size: 192 },
  { fileName: "icon-512.png", size: 512 }
];
const brandingDirectory = path.join(projectRoot, "assets", "branding");
const faviconTargets = [
  path.join(projectRoot, "apps", "host", "public", "favicon.png"),
  path.join(projectRoot, "apps", "controller", "public", "favicon.png")
];
const icoSizes = [16, 24, 32, 48, 64, 128, 256];

function buildIconFile(images) {
  const directorySize = 6 + images.length * 16;
  const directory = Buffer.alloc(directorySize);
  directory.writeUInt16LE(0, 0);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(images.length, 4);

  let imageOffset = directorySize;
  images.forEach(({ size, png }, index) => {
    const entryOffset = 6 + index * 16;
    directory.writeUInt8(size === 256 ? 0 : size, entryOffset);
    directory.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    directory.writeUInt8(0, entryOffset + 2);
    directory.writeUInt8(0, entryOffset + 3);
    directory.writeUInt16LE(1, entryOffset + 4);
    directory.writeUInt16LE(32, entryOffset + 6);
    directory.writeUInt32LE(png.length, entryOffset + 8);
    directory.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += png.length;
  });

  return Buffer.concat([directory, ...images.map(({ png }) => png)]);
}

async function renderIcon(browser, size) {
  const scale = size / 512;
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1
  });

  try {
    await page.setContent(`<!doctype html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; width: 100%; height: 100%; background: transparent; }
            body { display: grid; place-items: center; }
            .icon {
              display: grid;
              grid-template-columns: repeat(2, ${114 * scale}px);
              grid-template-rows: repeat(2, ${114 * scale}px);
              place-content: center;
              gap: ${56 * scale}px;
              width: ${size}px;
              height: ${size}px;
              padding: 0;
              border: ${Math.max(1, 14 * scale)}px solid #31566b;
              border-radius: ${112 * scale}px;
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

    return await page.locator(".icon").screenshot({ omitBackground: true });
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });

try {
  const sizes = [...new Set([...siteIcons.map(({ size }) => size), ...icoSizes])];
  const renderedIcons = new Map();

  for (const size of sizes) {
    renderedIcons.set(size, await renderIcon(browser, size));
  }

  const icoFrames = icoSizes.map((size) => ({ size, png: renderedIcons.get(size) }));
  const favicon = renderedIcons.get(64);
  const outputs = [
    ...siteIcons.map(({ fileName, size }) => [path.join(publicDirectory, fileName), renderedIcons.get(size)]),
    [path.join(brandingDirectory, "lan-party-hub.png"), renderedIcons.get(512)],
    [path.join(brandingDirectory, "lan-party-hub.ico"), buildIconFile(icoFrames)],
    ...faviconTargets.map((target) => [target, favicon])
  ];

  for (const [target, contents] of outputs) {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
    const relativeTarget = path.relative(projectRoot, target).replaceAll(path.sep, "/");
    const digest = createHash("sha256").update(contents).digest("hex");
    console.log(`${digest}  ${relativeTarget}`);
  }
} finally {
  await browser.close();
}
