import type { GameManifest } from "@open-party-lab/game-core";

export const auctionKingManifest = {
  id: "auction-king",
  displayName: "迷雾仓库",
  description: "调查同一座神秘仓库，用角色与仪器积累私人情报，在五轮递进竞拍中抢先落槌。",
  minPlayers: 2,
  maxPlayers: 6,
  hostView: "AuctionKingHostScene",
  controllerView: "auction-king",
  controllerLayout: "auction_warehouse",
  supportsTeams: false,
  estimatedRoundDurationMs: 350_000,
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
