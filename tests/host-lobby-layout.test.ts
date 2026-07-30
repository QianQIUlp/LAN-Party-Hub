import { describe, expect, it } from "vitest";
import {
  resolveEditorialLobbyLayout,
  resolveEditorialRailMetrics
} from "../apps/host/src/scenes/lobbyLayout.js";

describe("editorial host lobby layout", () => {
  const viewports = [
    { width: 320, height: 768 },
    { width: 480, height: 480 },
    { width: 719, height: 900 },
    { width: 839, height: 900 },
    { width: 859, height: 900 },
    { width: 860, height: 900 },
    { width: 960, height: 540 },
    { width: 1_024, height: 576 },
    { width: 1_279, height: 720 },
    { width: 1_280, height: 720 },
    { width: 1_440, height: 900 },
    { width: 1_638, height: 823 },
    { width: 1_769, height: 889 },
    { width: 1_920, height: 1_080 }
  ] as const;

  it.each(viewports)("keeps the 8-game catalog inside $width x $height", ({ width, height }) => {
    const layout = resolveEditorialLobbyLayout(width, height, 8);

    expect(layout.railWidth).toBeGreaterThan(0);
    expect(layout.railWidth).toBeLessThanOrEqual(width);
    expect(layout.mainX).toBeGreaterThanOrEqual(0);
    expect(layout.mainX + layout.mainWidth).toBeLessThanOrEqual(width + 0.01);
    expect(layout.gridWidth).toBeLessThanOrEqual(layout.mainWidth + 0.01);
    expect(layout.cardWidth).toBeGreaterThanOrEqual(224);
    expect(layout.cardWidth * layout.columns).toBeCloseTo(layout.gridWidth, 5);
    expect(layout.rows * layout.columns).toBeGreaterThanOrEqual(8);
    expect(layout.contentBottom).toBeGreaterThan(layout.mainTop);
  });

  it("keeps the column count stable across the stacked-to-sidebar boundary", () => {
    const stacked = resolveEditorialLobbyLayout(859, 900, 8);
    const sidebar = resolveEditorialLobbyLayout(860, 900, 8);

    expect(stacked.stacked).toBe(true);
    expect(sidebar.stacked).toBe(false);
    expect(stacked.columns).toBe(2);
    expect(sidebar.columns).toBe(2);
  });

  it("uses four editorial columns at the reference viewport", () => {
    const layout = resolveEditorialLobbyLayout(1_769, 889, 8);

    expect(layout.stacked).toBe(false);
    expect(layout.columns).toBe(4);
    expect(layout.rows).toBe(2);
    expect(layout.cardHeight).toBe(320);
    expect(layout.contentBottom).toBeLessThanOrEqual(889);
  });

  it("keeps condensed rail sections ordered on short TV viewports", () => {
    const metrics = resolveEditorialRailMetrics(576, 292);

    expect(metrics.condensed).toBe(true);
    expect(metrics.joinY).toBeGreaterThan(metrics.roomLabelY);
    expect(metrics.qrY).toBeGreaterThan(metrics.joinY);
    expect(metrics.playersTop).toBeGreaterThan(metrics.qrY + metrics.qrSize);
    expect(metrics.playersTop).toBeLessThan(576 - metrics.utilitySafeArea);
  });
});
