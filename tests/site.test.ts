import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { siteCopy } from "../apps/site/src/content.js";
import { renderMeta, renderPage } from "../apps/site/src/page.js";

interface KnownGame {
  id: string;
  includeInRelease?: boolean;
}

describe("project introduction site", () => {
  it("keeps both localized lineups aligned with the bundled release", async () => {
    const knownGames = JSON.parse(
      await readFile(new URL("../config/known-games.json", import.meta.url), "utf8")
    ) as KnownGame[];
    const bundledIds = knownGames
      .filter((game) => game.includeInRelease)
      .map((game) => game.id)
      .sort();

    expect(bundledIds).toHaveLength(8);
    expect(siteCopy.en.games.items.map((game) => game.id).sort()).toEqual(bundledIds);
    expect(siteCopy.zh.games.items.map((game) => game.id).sort()).toEqual(bundledIds);
  });

  it("renders crawlable localized pages without a gameplay client", () => {
    const english = renderPage("en");
    const chinese = renderPage("zh");

    expect(english).toContain("Every phone is a controller");
    expect(chinese).toContain("让每部手机都成为手柄");
    expect(english).not.toContain("socket.io");
    expect(chinese).toContain("不是云端试玩");
  });

  it("renders absolute canonical and sharing metadata", () => {
    const metadata = renderMeta("zh", "https://party.example.com");

    expect(metadata).toContain('rel="canonical" href="https://party.example.com/zh/"');
    expect(metadata).toContain('hreflang="en" href="https://party.example.com/"');
    expect(metadata).toContain('rel="icon" type="image/png" sizes="64x64" href="/favicon.png"');
    expect(metadata).toContain('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"');
    expect(metadata).toContain('property="og:image" content="https://party.example.com/og.png"');
  });
});
