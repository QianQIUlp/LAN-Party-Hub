import type { GameManifest } from "@open-party-lab/game-core";

export const rouletteManifest = {
  id: "roulette",
  displayName: "命运轮盘",
  description: "公开弹量、隐藏顺序，利用战术道具赢下三盘两胜的命运对决。",
  minPlayers: 2,
  maxPlayers: 2,
  hostView: "RouletteHostScene",
  controllerView: "roulette",
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

export const manifest = rouletteManifest;
