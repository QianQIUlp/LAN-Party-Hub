import type { ControllerLayoutKey, SupportedLanguage } from "@open-party-lab/game-core";
import { auctionKingManifest } from "../manifest.js";
import type { AuctionKingControllerState } from "../protocol.js";
import { rarityLabels } from "../server/auctionItems.js";

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
  feed?: string[];
}

interface ControllerGameRenderContext {
  state: {
    preferredLanguage?: SupportedLanguage;
    room?: {
      language?: SupportedLanguage;
      selectedGameId?: string;
      availableGames?: Array<{ id: string; displayName?: string; roundCompletionMode?: string }>;
      players?: Array<{ id: string; name: string; isReady?: boolean }>;
    } | null;
    player?: { id: string; isReady?: boolean } | null;
    game?: { phase?: string; message?: string; state?: unknown } | null;
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
    selectedGame?.roundCompletionMode !== "wait_for_ready" ||
    state.game?.phase !== "finished" ||
    !state.room ||
    !state.player ||
    !onSetReady
  ) {
    return undefined;
  }

  const players = state.room?.players ?? [];
  const playerId = state.player.id;
  const currentPlayerReady = Boolean(
    players.find((player) => player.id === playerId)?.isReady ?? state.player.isReady
  );
  const readyCount = players.filter((player) => player.isReady).length;
  const playerCount = players.length;
  const zh = state.room.language === "zh-CN";
  const en = state.room.language === "en";

  return {
    currentPlayerReady,
    readyCount,
    playerCount,
    label: zh ? "下一局" : en ? "Next Round" : "Naechste Runde",
    description: zh
      ? `${readyCount}/${playerCount} 名玩家已准备。`
      : en
      ? `${readyCount}/${playerCount} players are ready.`
      : `${readyCount}/${playerCount} Spieler sind bereit.`,
    language: state.room.language,
    onToggleReady: () => onSetReady(!currentPlayerReady)
  };
}

function formatBidLabel(amount: number, zh: boolean, en: boolean): string {
  if (amount === 0) {
    return zh ? "放弃" : en ? "Pass" : "Passen";
  }
  return `${amount}`;
}

export function buildAuctionKingControllerModel(context: ControllerGameRenderContext): ChoiceLayoutModel {
  const { state, onInput } = context;
  const auctionState = (state.game?.state ?? {}) as AuctionKingControllerState;
  const language = state.room?.language ?? state.preferredLanguage ?? "zh-CN";
  const zh = language === "zh-CN";
  const en = language === "en";
  const playerId = state.player?.id ?? "";
  const phase = state.game?.phase;
  const stage = auctionState.stage ?? "appraisal";
  const players = state.room?.players ?? [];
  const playerNames = Object.fromEntries(players.map((p) => [p.id, p.name]));

  const title = zh ? "🔨 即刻落槌" : en ? "🔨 Instant Gavel" : "🔨 Hammer";
  const roundLabel = zh
    ? `第 ${auctionState.currentRound ?? 1} / ${auctionState.totalRounds ?? 3} 轮`
    : en
    ? `Round ${auctionState.currentRound ?? 1} / ${auctionState.totalRounds ?? 3}`
    : `Runde ${auctionState.currentRound ?? 1} / ${auctionState.totalRounds ?? 3}`;

  const item = auctionState.currentItem;
  const ownGold = auctionState.goldByPlayerId?.[playerId] ?? 1000;
  const ownBid = auctionState.ownBid;
  const canBid = auctionState.canBid ?? false;
  const bidOptions = auctionState.bidOptions ?? [];

  const choices: ChoiceLayoutModel["choices"] = [];

  if (stage === "bidding" && canBid) {
    for (const amount of bidOptions) {
      const isPass = amount === 0;
      const affordable = amount === 0 || amount <= ownGold;
      const label = isPass
        ? (zh ? "🚫 放弃" : en ? "🚫 Pass" : "🚫 Passen")
        : `💰 ${amount}`;
      choices.push({
        id: `bid:${amount}`,
        label,
        description: isPass
          ? (zh ? "本轮不出价" : en ? "Skip this round" : "Diese Runde aussetzen")
          : affordable
            ? (zh ? "出价后保密，最高独得" : undefined)
            : (zh ? "金币不足" : en ? "Not enough gold" : "Nicht genug Gold"),
        disabled: !affordable || phase !== "playing",
        onSelect: () =>
          onInput({
            type: "submit_bid",
            playerId,
            amount,
            sentAt: Date.now()
          })
      });
    }
  }

  if (stage === "bidding" && !canBid && ownBid !== null) {
    const ownBidLabel = ownBid === 0
      ? (zh ? "已放弃" : en ? "Passed" : "Passen")
      : `${ownBid}`;
    choices.push({
      id: "bid:placed",
      label: zh ? `✓ 已出价: ${ownBidLabel}` : en ? `✓ Bid: ${ownBidLabel}` : `✓ Gebot: ${ownBidLabel}`,
      disabled: true,
      onSelect: () => {}
    });
  }

  const feed: string[] = [];

  if (item) {
    const rarityLabel = rarityLabels[item.rarity]?.[language] ?? item.rarity;
    const rarityEmoji: Record<string, string> = {
      legendary: "🌟", epic: "💜", rare: "💙", common: "⚪"
    };
    const catEmoji: Record<string, string> = {
      "古董": "🏺", "珠宝": "💎", "艺术品": "🎨", "奇物": "🔮"
    };
    feed.push(`${catEmoji[item.category] ?? "📦"} ${item.category} | ${rarityEmoji[item.rarity] ?? ""} ${rarityLabel}`);
    item.clues.forEach((clue, i) => {
      feed.push(`${i + 1}. ${clue}`);
    });
  }

  for (const result of auctionState.roundResults ?? []) {
    const winnerName = result.winnerPlayerId
      ? (playerNames[result.winnerPlayerId] ?? "?")
      : (zh ? "流拍" : en ? "No sale" : "Nicht verkauft");
    const profit = result.winnerPlayerId ? result.trueValue - result.winningBid : 0;
    const profitStr = result.winnerPlayerId
      ? profit >= 0
        ? `+${profit}`
        : `${profit}`
      : "";
    feed.push(
      zh
        ? `R${result.round}: ${result.itemName} → ${winnerName} (${result.winningBid}) ${profitStr}`
        : `R${result.round}: ${result.itemName} → ${winnerName} (${result.winningBid}) ${profitStr}`
    );
  }

  const helperText =
    state.game?.message ??
    (stage === "appraisal"
      ? zh
        ? "仔细看线索，估价待会儿出价。"
        : en
        ? "Study the clues, bid coming up."
        : "Hinweise beachten, Gebot kommt."
      : stage === "bidding" && canBid
        ? zh
          ? "选择你的出价！出价保密，最高者得。"
          : en
          ? "Choose your bid! Sealed, highest wins."
          : "Waehle dein Gebot! Verdeckt, Hoechstes gewinnt."
        : stage === "bidding" && !canBid
          ? zh
            ? "已出价，等待其他玩家。"
            : en
            ? "Bid placed, waiting for others."
            : "Gebot abgegeben, warte auf andere."
          : stage === "reveal"
            ? zh
              ? "落槌揭晓！"
              : en
              ? "Hammer down!"
              : "Zuschlag!"
            : undefined);

  const stats: ChoiceLayoutModel["stats"] = [
    { label: zh ? "💰 金币" : en ? "💰 Gold" : "💰 Gold", value: `${ownGold}`, highlighted: true },
    { label: zh ? "🎯 轮次" : en ? "🎯 Round" : "🎯 Runde", value: `${auctionState.currentRound ?? 1}/${auctionState.totalRounds ?? 3}` }
  ];

  if (item && stage === "reveal" && item.trueValue !== null) {
    stats.push({
      label: zh ? "✨ 真值" : en ? "✨ True value" : "✨ Wert",
      value: `${item.trueValue}`,
      highlighted: true
    });
  }

  if (ownBid !== null && stage !== "bidding") {
    stats.push({
      label: zh ? "📝 我的出价" : en ? "📝 My bid" : "📝 Mein Gebot",
      value: formatBidLabel(ownBid, zh, en)
    });
  }

  return {
    kind: "choice",
    title,
    subtitle: roundLabel,
    helperText,
    disabled: phase !== "playing" && stage !== "finished",
    choices,
    ready: buildReadyModel(context),
    stats,
    feed
  };
}

export const controllerGame = {
  id: auctionKingManifest.id,
  layoutKey: "choice" as ControllerLayoutKey,
  buildLayout(context: ControllerGameRenderContext) {
    return buildAuctionKingControllerModel(context);
  }
} as const;
