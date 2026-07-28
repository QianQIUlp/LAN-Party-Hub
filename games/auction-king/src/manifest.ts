import type { GameManifest } from "@open-party-lab/game-core";

export const auctionKingManifest = {
  id: "auction-king",
  displayName: "即刻落槌",
  description: "暗拍博弈：鉴定神秘拍品，密封出价，落槌定盈亏。",
  minPlayers: 2,
  maxPlayers: 4,
  hostView: "AuctionKingHostScene",
  controllerView: "auction-king",
  controllerLayout: "choice",
  supportsTeams: false,
  estimatedRoundDurationMs: 100_000,
  contentRating: "family",
  roundCompletionMode: "wait_for_ready",
  phaseDurations: {
    roundIntroMs: 1_500,
    countdownMs: 2_000,
    lockedMs: 1_500,
    resultMs: 4_000,
    scoreboardMs: 5_000
  }
} as const satisfies GameManifest;

export const manifest = auctionKingManifest;
