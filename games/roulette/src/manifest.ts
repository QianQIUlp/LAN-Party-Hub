import type { GameManifest } from "@open-party-lab/game-core";

export const rouletteManifest = {
  id: "roulette",
  displayName: "命运轮盘",
  description: "在隐藏弹序中选择朝自己或对手扣动扳机，活到最后。",
  minPlayers: 2,
  maxPlayers: 2,
  hostView: "RouletteHostScene",
  controllerView: "roulette",
  controllerLayout: "choice",
  supportsTeams: false,
  estimatedRoundDurationMs: 120_000,
  contentRating: "optional-adult",
  roundCompletionMode: "wait_for_ready",
  phaseDurations: {
    roundIntroMs: 1_800,
    countdownMs: 2_200,
    lockedMs: 1_600
  }
} as const satisfies GameManifest;

export const manifest = rouletteManifest;
