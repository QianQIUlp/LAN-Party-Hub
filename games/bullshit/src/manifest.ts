import type { GameManifest } from "@open-party-lab/game-core";

export const bullshitManifest = {
  id: "bullshit",
  displayName: "吹牛牌",
  description: "背面出牌、真假混杂；跟牌、质疑，或者把风险传给下一位。",
  minPlayers: 2,
  maxPlayers: 52,
  hostView: "BullshitHostScene",
  controllerView: "bullshit",
  controllerLayout: "card_hand",
  supportsTeams: false,
  estimatedRoundDurationMs: 600_000,
  contentRating: "family",
  roundCompletionMode: "wait_for_ready",
  phaseDurations: {
    roundIntroMs: 1_600,
    countdownMs: 2_200,
    lockedMs: 4_000,
    resultMs: 5_000,
    scoreboardMs: 5_000
  }
} as const satisfies GameManifest;

export const manifest = bullshitManifest;
