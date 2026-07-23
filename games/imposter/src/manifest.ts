// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { GameManifest } from "@open-party-lab/game-core";

export const imposterManifest = {
  id: "imposter",
  displayName: "谁是卧底",
  description: "轮流给出提示，投票找出不知道秘密词的卧底。",
  minPlayers: 3,
  maxPlayers: 4,
  hostView: "ImposterHostScene",
  controllerView: "imposter",
  controllerLayout: "choice",
  supportsTeams: false,
  estimatedRoundDurationMs: 120_000,
  contentRating: "optional-adult",
  roundCompletionMode: "wait_for_ready",
  lobbySetup: {
    title: "词库范围",
    description: "默认使用全年龄词库，成人词库需要主机主动选择。",
    fields: [{
      kind: "select",
      id: "content-pack",
      settingKey: "imposterContentPack",
      actionKey: "contentPack",
      label: "词库",
      defaultValue: "standard",
      options: [
        { id: "standard", label: "全年龄", description: "适合所有人的日常词语。" },
        { id: "adult", label: "成人", description: "仅适合成年人聚会。" },
        { id: "all", label: "混合", description: "同时使用两类词库。" }
      ]
    }]
  },
  phaseDurations: {
    roundIntroMs: 1_600,
    countdownMs: 2_200,
    resultMs: 6_000,
    scoreboardMs: 5_000
  }
} as const satisfies GameManifest;

export const manifest = imposterManifest;
