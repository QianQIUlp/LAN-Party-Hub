// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { GameManifest } from "@open-party-lab/game-core";

export const zeichnenUndErratenManifest = {
  id: "zeichnen-und-erraten",
  displayName: "你画我猜",
  description: "一名玩家在手机上作画，其他人争先猜出答案。",
  minPlayers: 2,
  maxPlayers: 4,
  hostView: "ZeichnenUndErratenHostScene",
  controllerView: "zeichnen-und-erraten",
  controllerLayout: "drawing_guess",
  supportsTeams: false,
  estimatedRoundDurationMs: 95_000,
  contentRating: "optional-adult",
  roundCompletionMode: "wait_for_ready",
  lobbySetup: {
    title: "词库范围",
    description: "选择本局可能出现的词语类型。",
    fields: [
      {
        kind: "select",
        id: "category",
        settingKey: "zeichnenUndErratenWordCategory",
        actionKey: "category",
        label: "词库",
        defaultValue: "standard",
        options: [
          {
            id: "standard",
            label: "全年龄",
            description: "默认的轻松日常词语。"
          },
          {
            id: "adult",
            label: "成人",
            description: "仅适合成年人聚会的词语。"
          },
          {
            id: "all",
            label: "混合",
            description: "同时使用全年龄和成人词库。"
          }
        ]
      }
    ]
  },
  phaseDurations: {
    roundIntroMs: 1_500,
    countdownMs: 2_000,
    resultMs: 4_000,
    scoreboardMs: 4_000
  }
} as const satisfies GameManifest;

export const manifest = zeichnenUndErratenManifest;
