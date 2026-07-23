// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import Phaser from "phaser";
import type { SupportedLanguage } from "@open-party-lab/game-core";
import { hostTheme } from "./theme.js";

interface ImposterRenderState {
  stage?: string;
  category?: string;
  currentTurnPlayerId?: string;
  clueTurnsCompleted?: number;
  clueTurnsTotal?: number;
  voteCounts?: Array<{ playerId: string; playerName: string; votes: number }>;
  secretWord?: string;
  imposterRevealName?: string;
  imposterGuess?: string;
  imposterWon?: boolean;
  resolvedReason?: string;
  message?: string;
}

export function renderImposterState(
  scene: Phaser.Scene,
  state: ImposterRenderState,
  playerNames: Record<string, string>,
  language?: SupportedLanguage
): Phaser.GameObjects.Text {
  const zh = language === "zh-CN";
  const en = language === "en";
  const votes = (state.voteCounts ?? [])
    .map((entry) => `- ${entry.playerName}: ${entry.votes} ${zh ? "票" : en ? "votes" : "Stimmen"}`)
    .join("\n");
  const currentTurnName = state.currentTurnPlayerId ? playerNames[state.currentTurnPlayerId] ?? state.currentTurnPlayerId : "-";

  const resolution = state.secretWord
    ? `\n\n${zh ? "揭晓" : en ? "Resolution" : "Aufloesung"}\n${zh ? "卧底" : "Imposter"}: ${state.imposterRevealName ?? "?"}\n${zh ? "秘密词" : en ? "Word" : "Wort"}: ${state.secretWord}\n${zh ? "卧底猜测" : en ? "Guess" : "Tipp"}: ${state.imposterGuess ?? "-"}\n${state.resolvedReason ?? ""}\n${state.imposterWon ? (zh ? "卧底获胜" : en ? "Imposter wins" : "Imposter gewinnt") : zh ? "普通玩家获胜" : en ? "Crew wins" : "Crew gewinnt"}`
    : "";

  return scene.add
    .text(
      scene.scale.width / 2,
      scene.scale.height / 2,
      `${zh ? "谁是卧底" : "Imposter"}\n\n${zh ? "阶段" : "Phase"}: ${state.stage ?? "-"}\n${zh ? "分类" : en ? "Category" : "Kategorie"}: ${state.category ?? "-"}\n${zh ? "提示进度" : en ? "Clue round" : "Hinweisphase"}: ${state.clueTurnsCompleted ?? 0}/${state.clueTurnsTotal ?? 0}\n${zh ? "当前玩家" : en ? "Current" : "Aktuell"}: ${currentTurnName}\n\n${state.message ?? (zh ? "找出卧底。" : en ? "Find the Imposter." : "Findet den Imposter.")}\n\n${zh ? "投票" : "Votes"}\n${votes || (zh ? "还没有投票" : en ? "No votes yet" : "Noch keine Stimmen")}${resolution}`,
      {
        fontFamily: hostTheme.titleFont,
        fontSize: "34px",
        color: hostTheme.text,
        align: "center",
        wordWrap: { width: scene.scale.width - 140 }
      }
    )
    .setOrigin(0.5);
}
