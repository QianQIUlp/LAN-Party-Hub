import type { ControllerLayoutKey, SupportedLanguage } from "@open-party-lab/game-core";
import { rouletteManifest } from "../manifest.js";
import type { RouletteControllerState, RouletteTarget } from "../protocol.js";

interface ReadyLayoutModel {
  currentPlayerReady: boolean;
  readyCount: number;
  playerCount: number;
  label: string;
  description?: string;
  language?: SupportedLanguage;
  onToggleReady: () => void;
}

interface ChoiceLayoutModel {
  kind: "choice";
  title: string;
  subtitle?: string;
  helperText?: string;
  disabled: boolean;
  ready?: ReadyLayoutModel;
  choices: Array<{
    id: string;
    label: string;
    description?: string;
    disabled?: boolean;
    onSelect: () => void;
  }>;
  stats?: Array<{ label: string; value: string; highlighted?: boolean }>;
}

interface ControllerGameRenderContext {
  state: {
    preferredLanguage?: SupportedLanguage;
    room?: {
      language?: SupportedLanguage;
      selectedGameId?: string;
      availableGames?: Array<{
        id: string;
        displayName?: string;
        roundCompletionMode?: string;
      }>;
      players?: Array<{
        id: string;
        name: string;
        isReady?: boolean;
      }>;
    } | null;
    player?: {
      id: string;
      isReady?: boolean;
    } | null;
    game?: {
      phase?: string;
      message?: string;
      state?: unknown;
    } | null;
  };
  onInput(input: unknown): void;
  onSetReady?: (isReady: boolean) => void;
}

function buildReadyModel(context: ControllerGameRenderContext): ReadyLayoutModel | undefined {
  const { state, onSetReady } = context;
  const gameId = state.room?.selectedGameId;
  const selectedGame = gameId
    ? state.room?.availableGames?.find((entry) => entry.id === gameId)
    : undefined;

  if (
    selectedGame?.roundCompletionMode !== "wait_for_ready"
    || state.game?.phase !== "finished"
    || !state.room
    || !state.player
    || !onSetReady
  ) {
    return undefined;
  }

  const players = state.room.players ?? [];
  const currentPlayerReady = Boolean(
    players.find((player) => player.id === state.player?.id)?.isReady
      ?? state.player.isReady
  );
  const readyCount = players.filter((player) => player.isReady).length;
  const playerCount = players.length;
  const language = state.room.language ?? state.preferredLanguage ?? "zh-CN";
  const zh = language === "zh-CN";
  const en = language === "en";

  return {
    currentPlayerReady,
    readyCount,
    playerCount,
    label: zh ? "下一局" : en ? "Next round" : "Naechste Runde",
    description: zh
      ? readyCount + "/" + playerCount + " 名玩家已准备。"
      : en
        ? readyCount + "/" + playerCount + " players are ready."
        : readyCount + "/" + playerCount + " Spieler sind bereit.",
    language,
    onToggleReady: () => onSetReady(!currentPlayerReady)
  };
}

function createFireInput(playerId: string, target: RouletteTarget) {
  return {
    type: "fire",
    playerId,
    target,
    sentAt: Date.now()
  } as const;
}

function healthLabel(current: number, max: number): string {
  return "●".repeat(Math.max(0, current)) + "○".repeat(Math.max(0, max - current));
}

export function buildRouletteControllerModel(
  context: ControllerGameRenderContext
): ChoiceLayoutModel {
  const { state, onInput } = context;
  const language = state.room?.language ?? state.preferredLanguage ?? "zh-CN";
  const zh = language === "zh-CN";
  const en = language === "en";
  const playerId = state.player?.id ?? "";
  const rouletteState = (state.game?.state ?? {}) as Partial<RouletteControllerState>;
  const players = state.room?.players ?? [];
  const names = Object.fromEntries(players.map((player) => [player.id, player.name]));
  const rivalPlayerId = rouletteState.rivalPlayerId;
  const rivalName = rivalPlayerId
    ? names[rivalPlayerId] ?? rivalPlayerId
    : zh ? "对手" : en ? "Rival" : "Gegner";
  const currentName = rouletteState.currentPlayerId
    ? names[rouletteState.currentPlayerId] ?? rouletteState.currentPlayerId
    : "-";
  const ownHealth = rouletteState.healthByPlayer?.[playerId] ?? 0;
  const rivalHealth = rivalPlayerId
    ? rouletteState.healthByPlayer?.[rivalPlayerId] ?? 0
    : 0;
  const maxHealth = rouletteState.maxHealth ?? 3;
  const canAct = Boolean(rouletteState.canAct) && state.game?.phase === "playing";
  const winnerName = rouletteState.winnerPlayerId
    ? names[rouletteState.winnerPlayerId] ?? rouletteState.winnerPlayerId
    : undefined;
  const title = state.room?.availableGames?.find((game) => game.id === rouletteManifest.id)?.displayName
    ?? (zh ? "命运轮盘" : en ? "Fate Chamber" : "Schicksalstrommel");

  return {
    kind: "choice",
    title,
    subtitle: winnerName
      ? zh ? winnerName + " 获胜" : en ? winnerName + " wins" : winnerName + " gewinnt"
      : canAct
        ? zh ? "轮到你选择" : en ? "Your choice" : "Du bist dran"
        : zh ? "轮到 " + currentName : en ? currentName + " is choosing" : currentName + " waehlt",
    helperText: state.game?.message
      ?? rouletteState.message
      ?? (zh
        ? "空包弹朝向自己时可以继续行动；其他结果会交换回合。"
        : en
          ? "A self-targeted blank keeps your turn. Every other result passes it."
          : "Eine eigene Platzpatrone behaelt den Zug. Sonst wechselt er."),
    disabled: !canAct,
    ready: buildReadyModel(context),
    choices: [
      {
        id: "fire:self",
        label: zh ? "朝自己扣动扳机" : en ? "Take the risk yourself" : "Auf dich selbst",
        description: zh
          ? "若为空包弹，你可以继续行动。"
          : en ? "A blank lets you act again." : "Eine Platzpatrone laesst dich erneut handeln.",
        disabled: !canAct,
        onSelect: () => onInput(createFireInput(playerId, "self"))
      },
      {
        id: "fire:rival",
        label: zh ? "瞄准 " + rivalName : en ? "Aim at " + rivalName : "Auf " + rivalName + " zielen",
        description: zh
          ? "无论结果如何，之后都会交换回合。"
          : en ? "The turn passes after the shot either way." : "Danach wechselt der Zug immer.",
        disabled: !canAct,
        onSelect: () => onInput(createFireInput(playerId, "rival"))
      }
    ],
    stats: [
      {
        label: zh ? "你的生命" : en ? "Your resolve" : "Dein Mut",
        value: healthLabel(ownHealth, maxHealth),
        highlighted: canAct
      },
      {
        label: zh ? rivalName + " 的生命" : en ? rivalName + " resolve" : "Mut von " + rivalName,
        value: healthLabel(rivalHealth, maxHealth)
      },
      {
        label: zh ? "剩余弹药" : en ? "Shells left" : "Patronen uebrig",
        value:
          (rouletteState.liveShellsRemaining ?? 0)
          + (zh ? " 实 / " : en ? " live / " : " scharf / ")
          + (rouletteState.blankShellsRemaining ?? 0)
          + (zh ? " 空" : en ? " blank" : " leer")
      },
      {
        label: zh ? "第几次装填" : en ? "Load" : "Ladung",
        value: "#" + (rouletteState.reloadNumber ?? 1)
      }
    ]
  };
}

export const controllerGame = {
  id: rouletteManifest.id,
  layoutKey: "choice" as ControllerLayoutKey,
  buildLayout(context: ControllerGameRenderContext) {
    return buildRouletteControllerModel(context);
  }
} as const;
