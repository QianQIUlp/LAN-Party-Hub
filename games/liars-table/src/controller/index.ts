import type { ControllerLayoutKey, SupportedLanguage } from "@open-party-lab/game-core";
import { liarsTableManifest } from "../manifest.js";
import type {
  LiarsCard,
  LiarsCardRank,
  LiarsClaimRank,
  LiarsTableControllerState
} from "../protocol.js";

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

const rankIcon: Record<LiarsCardRank, string> = {
  crown: "♛",
  moon: "☾",
  key: "K",
  wild: "✦"
};

const rankText: Record<SupportedLanguage, Record<LiarsCardRank, string>> = {
  "zh-CN": {
    crown: "皇冠",
    moon: "月亮",
    key: "钥匙",
    wild: "百搭"
  },
  en: {
    crown: "Crown",
    moon: "Moon",
    key: "Key",
    wild: "Wild"
  },
  de: {
    crown: "Krone",
    moon: "Mond",
    key: "Schluessel",
    wild: "Joker"
  }
};

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

function cardLabel(card: LiarsCard, language: SupportedLanguage): string {
  return rankIcon[card.rank] + " " + rankText[language][card.rank];
}

function claimLabel(rank: LiarsClaimRank, language: SupportedLanguage): string {
  return rankIcon[rank] + " " + rankText[language][rank];
}

function healthLabel(current: number, max: number): string {
  return "●".repeat(Math.max(0, current)) + "○".repeat(Math.max(0, max - current));
}

export function buildLiarsTableControllerModel(
  context: ControllerGameRenderContext
): ChoiceLayoutModel {
  const { state, onInput } = context;
  const language = state.room?.language ?? state.preferredLanguage ?? "zh-CN";
  const zh = language === "zh-CN";
  const en = language === "en";
  const playerId = state.player?.id ?? "";
  const gameState = (state.game?.state ?? {}) as Partial<LiarsTableControllerState>;
  const players = state.room?.players ?? [];
  const names = Object.fromEntries(players.map((player) => [player.id, player.name]));
  const currentName = gameState.currentPlayerId
    ? names[gameState.currentPlayerId] ?? gameState.currentPlayerId
    : "-";
  const ownHealth = gameState.healthByPlayer?.[playerId] ?? 0;
  const maxHealth = gameState.maxHealth ?? 2;
  const risk = gameState.chamberRiskByPlayer?.[playerId];
  const tableRank = gameState.tableRank ?? "crown";
  const ownHand = gameState.ownHand ?? [];
  const phase = state.game?.phase;
  const canPlay = Boolean(gameState.canPlay) && phase === "playing";
  const canChallenge = Boolean(gameState.canChallenge) && phase === "playing";
  const ownsTurn = gameState.currentPlayerId === playerId && gameState.stage === "turn";
  const isEliminated =
    Boolean(gameState.healthByPlayer)
    && (gameState.healthByPlayer?.[playerId] ?? 0) <= 0;
  const winnerName = gameState.winnerPlayerId
    ? names[gameState.winnerPlayerId] ?? gameState.winnerPlayerId
    : undefined;
  const title = state.room?.availableGames?.find((game) => game.id === liarsTableManifest.id)?.displayName
    ?? (zh ? "谎言牌桌" : en ? "Liars' Table" : "Luegentisch");
  const choices: ChoiceLayoutModel["choices"] = [];

  if (gameState.stage === "turn") {
    if (canChallenge) {
      choices.push({
        id: "challenge",
        label: zh ? "质疑上一张牌" : en ? "Challenge the last claim" : "Letzte Ansage anzweifeln",
        description: zh
          ? "翻开上一张暗牌；判断错误的人接受命运轮盘。"
          : en
            ? "Reveal the last card. Whoever is wrong faces the fate chamber."
            : "Decke die Karte auf. Wer falsch liegt, muss an die Schicksalstrommel.",
        onSelect: () => onInput({
          type: "challenge",
          playerId,
          sentAt: Date.now()
        })
      });
    }

    for (const card of ownHand) {
      choices.push({
        id: "play:" + card.id,
        label: (zh ? "暗中打出 " : en ? "Play hidden: " : "Verdeckt spielen: ") + cardLabel(card, language),
        description: zh
          ? "公开宣称它是 " + claimLabel(tableRank, language)
          : en
            ? "Publicly claim " + claimLabel(tableRank, language)
            : "Oeffentlich als " + claimLabel(tableRank, language) + " ansagen",
        disabled: !canPlay,
        onSelect: () => onInput({
          type: "play_card",
          playerId,
          cardId: card.id,
          sentAt: Date.now()
        })
      });
    }
  }

  let subtitle: string;
  if (winnerName) {
    subtitle = zh ? winnerName + " 获胜" : en ? winnerName + " wins" : winnerName + " gewinnt";
  } else if (isEliminated) {
    subtitle = zh ? "你已离开牌桌" : en ? "You are out" : "Du bist ausgeschieden";
  } else if (gameState.stage === "reveal") {
    subtitle = zh ? "正在揭晓与执行惩罚" : en ? "Reveal and fate chamber" : "Aufdeckung und Schicksal";
  } else if (ownsTurn) {
    subtitle = zh ? "轮到你：出牌或质疑" : en ? "Your turn: play or challenge" : "Dein Zug: spielen oder zweifeln";
  } else {
    subtitle = zh ? "等待 " + currentName : en ? "Waiting for " + currentName : "Warte auf " + currentName;
  }

  return {
    kind: "choice",
    title,
    subtitle,
    helperText: state.game?.message
      ?? gameState.message
      ?? (zh
        ? "你的真实牌面只会显示在手机上。桌面图腾决定每张暗牌的公开宣称。"
        : en
          ? "Only your phone shows your cards. The table sigil defines every public claim."
          : "Nur dein Handy zeigt deine Karten. Das Tischsymbol bestimmt jede Ansage."),
    disabled: !ownsTurn || gameState.stage !== "turn",
    ready: buildReadyModel(context),
    choices,
    stats: [
      {
        label: zh ? "桌面图腾" : en ? "Table sigil" : "Tischsymbol",
        value: claimLabel(tableRank, language),
        highlighted: true
      },
      {
        label: zh ? "你的生命" : en ? "Your resolve" : "Dein Mut",
        value: healthLabel(ownHealth, maxHealth)
      },
      {
        label: zh ? "命运风险" : en ? "Fate risk" : "Schicksalsrisiko",
        value: risk ? risk.numerator + "/" + risk.denominator : "1/4"
      },
      {
        label: zh ? "手牌" : en ? "Cards" : "Karten",
        value: String(ownHand.length)
      },
      {
        label: zh ? "当前手数" : en ? "Hand" : "Hand",
        value: "#" + (gameState.handNumber ?? 1)
      }
    ]
  };
}

export const controllerGame = {
  id: liarsTableManifest.id,
  layoutKey: "choice" as ControllerLayoutKey,
  buildLayout(context: ControllerGameRenderContext) {
    return buildLiarsTableControllerModel(context);
  }
} as const;
