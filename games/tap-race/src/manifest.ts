// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { GameManifest } from "@open-party-lab/game-core";

export const tapRaceManifest = {
  id: "tap-race",
  displayName: "疯狂点击",
  description: "在 20 秒内率先完成 50 次有效点击。",
  minPlayers: 2,
  maxPlayers: 4,
  hostView: "TapRaceHostScene",
  controllerView: "tap-race",
  controllerLayout: "tap_mash",
  supportsTeams: false,
  estimatedRoundDurationMs: 10_000,
  contentRating: "family"
} as const satisfies GameManifest;

export const manifest = tapRaceManifest;
