import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngDimensions(png: Buffer): { width: number; height: number } {
  expect(png.subarray(0, pngSignature.length)).toEqual(pngSignature);
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20)
  };
}

describe("LAN Party Hub application icons", () => {
  it("uses the checked-in favicon on host and controller pages", async () => {
    const [hostHtml, controllerHtml, siteIcon, hostIcon, controllerIcon] = await Promise.all([
      readFile(new URL("../apps/host/index.html", import.meta.url), "utf8"),
      readFile(new URL("../apps/controller/index.html", import.meta.url), "utf8"),
      readFile(new URL("../apps/site/public/favicon.png", import.meta.url)),
      readFile(new URL("../apps/host/public/favicon.png", import.meta.url)),
      readFile(new URL("../apps/controller/public/favicon.png", import.meta.url))
    ]);

    const faviconLink = 'rel="icon" type="image/png" sizes="64x64" href="%BASE_URL%favicon.png"';
    expect(hostHtml).toContain(faviconLink);
    expect(controllerHtml).toContain(faviconLink);
    expect(hostIcon).toEqual(siteIcon);
    expect(controllerIcon).toEqual(siteIcon);
    expect(pngDimensions(hostIcon)).toEqual({ width: 64, height: 64 });
  });

  it("keeps native-size PNG frames in the Windows ICO", async () => {
    const ico = await readFile(new URL("../assets/branding/lan-party-hub.ico", import.meta.url));
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);

    const imageCount = ico.readUInt16LE(4);
    const sizes = [];
    for (let index = 0; index < imageCount; index += 1) {
      const entryOffset = 6 + index * 16;
      const widthByte = ico.readUInt8(entryOffset);
      const heightByte = ico.readUInt8(entryOffset + 1);
      const width = widthByte === 0 ? 256 : widthByte;
      const height = heightByte === 0 ? 256 : heightByte;
      const byteLength = ico.readUInt32LE(entryOffset + 8);
      const imageOffset = ico.readUInt32LE(entryOffset + 12);
      const png = ico.subarray(imageOffset, imageOffset + byteLength);

      expect(width).toBe(height);
      expect(pngDimensions(png)).toEqual({ width, height });
      sizes.push(width);
    }

    expect(sizes).toEqual([16, 24, 32, 48, 64, 128, 256]);
  });

  it("embeds the ICO in the launcher and reuses it for the tray", async () => {
    const [buildScript, launcher] = await Promise.all([
      readFile(new URL("../scripts/build-release.mjs", import.meta.url), "utf8"),
      readFile(new URL("../scripts/release/Launcher.cs", import.meta.url), "utf8")
    ]);

    expect(buildScript).toContain('"assets", "branding", "lan-party-hub.ico"');
    expect(buildScript).toContain('"Microsoft.NET", framework, "v4.0.30319", "csc.exe"');
    expect(buildScript).toContain("/target:winexe");
    expect(buildScript).toContain("/win32icon:");
    expect(launcher).toContain("Icon.ExtractAssociatedIcon(Application.ExecutablePath)");
    expect(launcher).toContain("tray.Icon = applicationIcon;");
  });
});
