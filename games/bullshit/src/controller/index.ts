import type { ControllerLayoutKey, SupportedLanguage } from "@open-party-lab/game-core";
import { bullshitManifest } from "../manifest.js";
import {
  bullshitRanks,
  type BullshitCard,
  type BullshitControllerState,
  type BullshitInput,
  type BullshitRank,
  type BullshitSuit
} from "../protocol.js";

interface CardHandLayoutModel {
  kind: "card_hand";
  title: string;
  subtitle?: string;
  helperText?: string;
  language?: SupportedLanguage;
  disabled: boolean;
  isCurrentTurn: boolean;
  tableTextureUrl: string;
  cardBackUrl: string;
  checkImpactUrl: string;
  cards: Array<{
    id: string;
    rank: string;
    suit: BullshitSuit;
    suitLabel: string;
    selected: boolean;
    disabled?: boolean;
    accessibilityLabel: string;
    helperText: string;
    onToggle: () => void;
  }>;
  rankOptions: Array<{
    id: string;
    rank: string;
    label: string;
    selected: boolean;
    disabled?: boolean;
    onSelect: () => void;
  }>;
  activeRank: string | null;
  selectedRank: string | null;
  pileCount: number;
  selectedCount: number;
  lastPlayLabel?: string;
  handLabel: string;
  selectedLabel: string;
  pileLabel: string;
  claimLabel: string;
  sortLabel: string;
  rankSortLabel: string;
  suitSortLabel: string;
  playLabel: string;
  playAccessibilityLabel: string;
  playingLabel: string;
  checkLabel: string;
  checkDisplayLabel: string;
  checkSubLabel: string;
  passLabel: string;
  canPlay: boolean;
  canCheck: boolean;
  canPass: boolean;
  onPlay: () => void;
  onCheck: () => void;
  onPass: () => void;
}

interface ControllerGameRenderContext {
  state: {
    preferredLanguage?: SupportedLanguage;
    room?: {
      language?: SupportedLanguage;
      availableGames?: Array<{ id: string; displayName?: string }>;
    } | null;
    player?: { id: string } | null;
    game?: {
      phase?: string;
      state?: unknown;
    } | null;
  };
  onInput(input: unknown): void;
}

type BullshitInputWithoutMeta = BullshitInput extends infer T
  ? T extends BullshitInput
    ? Omit<T, "playerId" | "sentAt">
    : never
  : never;

const suitSymbols: Record<BullshitSuit, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠"
};

const suitNames = {
  "zh-CN": { clubs: "梅花", diamonds: "方块", hearts: "红桃", spades: "黑桃" },
  en: { clubs: "clubs", diamonds: "diamonds", hearts: "hearts", spades: "spades" },
  de: { clubs: "Kreuz", diamonds: "Karo", hearts: "Herz", spades: "Pik" }
} satisfies Record<SupportedLanguage, Record<BullshitSuit, string>>;

const tableTextureUrl = new URL("../../assets/pixel-wood-table.webp", import.meta.url).href;
const cardBackUrl = new URL("../../assets/pixel-card-back.webp", import.meta.url).href;
const checkImpactUrl = new URL("../../assets/pixel-check-impact.webp", import.meta.url).href;

function createInput(
  playerId: string,
  input: BullshitInputWithoutMeta
): BullshitInput {
  return {
    ...input,
    playerId,
    sentAt: Date.now()
  } as BullshitInput;
}

function formatCard(card: BullshitCard, language: SupportedLanguage): string {
  return `${suitSymbols[card.suit]} ${card.rank} · ${suitNames[language][card.suit]}`;
}

function resolutionText(state: BullshitControllerState, language: SupportedLanguage): string | undefined {
  const resolution = state.lastResolution;
  if (!resolution) {
    return undefined;
  }

  if (language === "zh-CN") {
    return resolution.truthful
      ? `没骗你！${resolution.recipientName} 收下 ${resolution.pileSize} 张`
      : `抓到了！${resolution.recipientName} 收下 ${resolution.pileSize} 张`;
  }

  if (language === "en") {
    return resolution.truthful
      ? `Truth! ${resolution.recipientName} takes ${resolution.pileSize}`
      : `Caught! ${resolution.recipientName} takes ${resolution.pileSize}`;
  }

  return resolution.truthful
    ? `Ehrlich! ${resolution.recipientName} nimmt ${resolution.pileSize}`
    : `Erwischt! ${resolution.recipientName} nimmt ${resolution.pileSize}`;
}

function buildHelperText(
  state: BullshitControllerState,
  phase: string | undefined,
  playerId: string,
  language: SupportedLanguage
): string | undefined {
  const zh = language === "zh-CN";
  const en = language === "en";
  const resolution = resolutionText(state, language);

  if (state.winnerPlayerId) {
    return state.winnerPlayerId === playerId
      ? zh ? "你的最后一手通过检验，你赢了！" : en ? "Your final play survived. You win!" : "Dein letzter Zug haelt stand. Du gewinnst!"
      : zh ? `${state.winnerName ?? "一名玩家"} 已经出完手牌。` : en ? `${state.winnerName ?? "A player"} is out of cards.` : `${state.winnerName ?? "Ein Spieler"} hat keine Karten mehr.`;
  }

  if (phase !== "playing") {
    return resolution;
  }

  if (resolution) {
    return resolution;
  }

  if (!state.isCurrentTurn) {
    if (state.pendingWinnerPlayerId) {
      return zh
        ? `最后一次 Check：${state.pendingWinnerName ?? "上一位玩家"}`
        : en
          ? `Last chance to Check ${state.pendingWinnerName ?? "the previous player"}`
          : `Letzter Check gegen ${state.pendingWinnerName ?? "den vorigen Spieler"}`;
    }
    return undefined;
  }

  return undefined;
}

function buildControllerState(context: ControllerGameRenderContext): BullshitControllerState {
  const gameState = (context.state.game?.state ?? {}) as Partial<BullshitControllerState>;
  return {
    activeRank: gameState.activeRank ?? null,
    pileCount: gameState.pileCount ?? 0,
    currentTurnPlayerId: gameState.currentTurnPlayerId ?? null,
    currentTurnPlayerName: gameState.currentTurnPlayerName ?? null,
    players: gameState.players ?? [],
    lastPlay: gameState.lastPlay ?? null,
    pendingWinnerPlayerId: gameState.pendingWinnerPlayerId ?? null,
    pendingWinnerName: gameState.pendingWinnerName ?? null,
    winnerPlayerId: gameState.winnerPlayerId ?? null,
    winnerName: gameState.winnerName ?? null,
    lastResolution: gameState.lastResolution ?? null,
    ownHand: gameState.ownHand ?? [],
    selectedCardIds: gameState.selectedCardIds ?? [],
    selectedRank: gameState.selectedRank ?? null,
    isCurrentTurn: gameState.isCurrentTurn ?? false,
    canPlay: gameState.canPlay ?? false,
    canCheck: gameState.canCheck ?? false,
    canPass: gameState.canPass ?? false,
    passUsed: gameState.passUsed ?? false
  };
}

export function buildBullshitControllerModel(context: ControllerGameRenderContext): CardHandLayoutModel {
  const { state, onInput } = context;
  const language = state.room?.language ?? state.preferredLanguage ?? "zh-CN";
  const zh = language === "zh-CN";
  const en = language === "en";
  const playerId = state.player?.id ?? "";
  const bullshitState = buildControllerState(context);
  const selectedSet = new Set(bullshitState.selectedCardIds);
  const selectedCount = selectedSet.size;
  const claimedRank = bullshitState.activeRank ?? bullshitState.selectedRank;
  const isPlaying = state.game?.phase === "playing";
  const canChoose = isPlaying && bullshitState.isCurrentTurn;
  const title = state.room?.availableGames?.find((game) => game.id === bullshitManifest.id)?.displayName
    ?? (zh ? "吹牛牌" : "Bullshit");
  const subtitle = bullshitState.winnerPlayerId
    ? zh ? "本局结束" : en ? "Round over" : "Runde beendet"
    : bullshitState.isCurrentTurn
      ? zh ? "轮到你" : en ? "Your turn" : "Du bist dran"
      : zh ? "等待行动" : en ? "Waiting" : "Warten";

  return {
    kind: "card_hand",
    title,
    subtitle,
    helperText: buildHelperText(bullshitState, state.game?.phase, playerId, language),
    language,
    disabled: !isPlaying,
    isCurrentTurn: bullshitState.isCurrentTurn,
    tableTextureUrl,
    cardBackUrl,
    checkImpactUrl,
    cards: bullshitState.ownHand.map((card) => {
      const selected = selectedSet.has(card.id);
      const cardName = formatCard(card, language);
      return {
        id: card.id,
        rank: card.rank,
        suit: card.suit,
        suitLabel: suitNames[language][card.suit],
        selected,
        disabled: !canChoose,
        accessibilityLabel: selected
          ? zh ? `取消选择 ${cardName}` : en ? `Deselect ${cardName}` : `${cardName} abwaehlen`
          : zh ? `选择 ${cardName}` : en ? `Select ${cardName}` : `${cardName} waehlen`,
        helperText: selected
          ? zh ? "已选择；再次点击取消。" : en ? "Selected; tap again to remove." : "Gewaehlt; erneut tippen zum Entfernen."
          : zh ? "点击加入本次背面出牌。" : en ? "Tap to add to this face-down play." : "Tippen, um diese Karte verdeckt zu legen.",
        onToggle: () => onInput(createInput(playerId, { type: "toggle_card", cardId: card.id }))
      };
    }),
    rankOptions: bullshitRanks.map((rank) => ({
      id: `rank:${rank}`,
      rank,
      label: zh ? `宣称 ${rank}` : en ? `Claim ${rank}` : `${rank} ansagen`,
      selected: bullshitState.selectedRank === rank,
      disabled: !canChoose || Boolean(bullshitState.activeRank),
      onSelect: () => onInput(createInput(playerId, { type: "select_rank", rank: rank as BullshitRank }))
    })),
    activeRank: bullshitState.activeRank,
    selectedRank: bullshitState.selectedRank,
    pileCount: bullshitState.pileCount,
    selectedCount,
    lastPlayLabel: bullshitState.lastPlay
      ? zh
        ? `${bullshitState.lastPlay.playerName} × ${bullshitState.lastPlay.count}`
        : en
          ? `${bullshitState.lastPlay.playerName} × ${bullshitState.lastPlay.count}`
          : `${bullshitState.lastPlay.playerName} × ${bullshitState.lastPlay.count}`
      : undefined,
    handLabel: zh ? "手牌" : en ? "Hand" : "Hand",
    selectedLabel: zh ? "已选" : en ? "Selected" : "Gewaehlt",
    pileLabel: zh ? "桌面牌堆" : en ? "Table pile" : "Tischstapel",
    claimLabel: zh ? "宣称" : en ? "Claim" : "Ansage",
    sortLabel: zh ? "理牌" : en ? "Sort" : "Sortieren",
    rankSortLabel: zh ? "点数" : en ? "Rank" : "Wert",
    suitSortLabel: zh ? "花色" : en ? "Suit" : "Farbe",
    playLabel: zh ? "出牌" : en ? "Play" : "Legen",
    playAccessibilityLabel: zh
      ? `背面打出 ${selectedCount} 张${claimedRank ? `，宣称 ${claimedRank}` : ""}`
      : en
        ? `Play ${selectedCount} face down${claimedRank ? ` as ${claimedRank}` : ""}`
        : `${selectedCount} verdeckt legen${claimedRank ? ` als ${claimedRank}` : ""}`,
    playingLabel: zh ? "正在出牌…" : en ? "Playing…" : "Karten fliegen…",
    checkLabel: bullshitState.lastPlay
      ? zh ? "Check：质疑最近一手" : en ? "Check the last play" : "Letzten Zug pruefen"
      : zh ? "Check" : en ? "Check" : "Pruefen",
    checkDisplayLabel: "CHECK!",
    checkSubLabel: zh ? "开牌！" : en ? "Reveal!" : "Aufdecken!",
    passLabel: bullshitState.passUsed
      ? zh ? "已过" : en ? "Passed" : "Gepasst"
      : zh ? "过牌" : en ? "Pass" : "Passen",
    canPlay: canChoose && bullshitState.canPlay,
    canCheck: canChoose && bullshitState.canCheck,
    canPass: canChoose && bullshitState.canPass,
    onPlay: () => onInput(createInput(playerId, { type: "play_selected" })),
    onCheck: () => onInput(createInput(playerId, { type: "check" })),
    onPass: () => onInput(createInput(playerId, { type: "pass" }))
  };
}

export const controllerGame = {
  id: bullshitManifest.id,
  layoutKey: "card_hand" as ControllerLayoutKey,
  buildLayout(context: ControllerGameRenderContext) {
    return buildBullshitControllerModel(context);
  }
} as const;
