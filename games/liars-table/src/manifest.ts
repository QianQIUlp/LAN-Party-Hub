import type { GameManifest } from "@open-party-lab/game-core";

export const liarsTableManifest = {
  id: "liars-table",
  displayName: "谎言牌桌",
  description: "秘密出牌、宣称桌面图腾并决定何时质疑，成为最后留在牌桌上的玩家。",
  minPlayers: 3,
  maxPlayers: 4,
  hostView: "LiarsTableHostScene",
  controllerView: "liars-table",
  controllerLayout: "choice",
  supportsTeams: false,
  estimatedRoundDurationMs: 300_000,
  contentRating: "optional-adult",
  roundCompletionMode: "wait_for_ready",
  phaseDurations: {
    roundIntroMs: 1_800,
    countdownMs: 2_200,
    lockedMs: 1_600
  }
} as const satisfies GameManifest;

export const manifest = liarsTableManifest;
