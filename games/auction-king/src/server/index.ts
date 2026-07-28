import {
  createBaseRoundState,
  roundPhaseDurations,
  transitionRoundState,
  type GamePlayerSummary,
  type ScoreEntry,
  type ServerGame,
  type SupportedLanguage
} from "@open-party-lab/game-core";
import { auctionKingManifest } from "../manifest.js";
import type {
  AuctionKingControllerState,
  AuctionKingInput,
  AuctionKingPublicState,
  AuctionKingState,
  AuctionItem,
  AuctionRoundResult,
  PublicAuctionItem
} from "../protocol.js";
import { bidOptions, randomItems } from "./auctionItems.js";

const totalRounds = 3;
const startingGold = 1000;
const appraisalDurationMs = 10_000;
const biddingDurationMs = 15_000;
const revealDurationMs = 5_000;

const auctionText = {
  "zh-CN": {
    intro: "欢迎来到即刻落槌！",
    appraisal: "鉴定中……仔细看线索。",
    bidding: "出价时间！暗拍密封，最高价者得。",
    reveal: "落槌！",
    finished: "拍卖结束，看看谁是竞拍之王！",
    noWinner: "无人出价，流拍。",
    tieNoSale: "最高出价相同，流拍！",
    pass: "放弃",
    gold: "金币",
    round: (n: number, total: number) => `第 ${n} / ${total} 轮`,
    wins: (name: string) => `${name} 拍得！`,
    profit: (amount: number) => amount >= 0 ? `盈利 ${amount}` : `亏损 ${Math.abs(amount)}`,
    bidPlaced: "已出价，等待其他玩家。",
    waitingBid: "选择你的出价",
    notEnoughGold: "金币不足"
  },
  en: {
    intro: "Welcome to Instant Gavel!",
    appraisal: "Appraising... study the clues.",
    bidding: "Bidding time! Sealed bids, highest wins.",
    reveal: "Hammer down!",
    finished: "Auction over — who is the Bid King?",
    noWinner: "No bids, item passed.",
    tieNoSale: "Tied high bid, no sale!",
    pass: "Pass",
    gold: "Gold",
    round: (n: number, total: number) => `Round ${n} / ${total}`,
    wins: (name: string) => `${name} wins the item!`,
    profit: (amount: number) => amount >= 0 ? `Profit ${amount}` : `Loss ${Math.abs(amount)}`,
    bidPlaced: "Bid placed, waiting for others.",
    waitingBid: "Choose your bid",
    notEnoughGold: "Not enough gold"
  },
  de: {
    intro: "Willkommen beim Hammer!",
    appraisal: "Begutachtung... Hinweise beachten.",
    bidding: "Gebotszeit! Verdeckt, Hoechstes gewinnt.",
    reveal: "Zuschlag!",
    finished: "Auktion beendet — wer ist der Koenig?",
    noWinner: "Keine Gebote, nicht verkauft.",
    tieNoSale: "Gleichstand, nicht verkauft!",
    pass: "Passen",
    gold: "Gold",
    round: (n: number, total: number) => `Runde ${n} / ${total}`,
    wins: (name: string) => `${name} erhaelt den Zuschlag!`,
    profit: (amount: number) => amount >= 0 ? `Gewinn ${amount}` : `Verlust ${Math.abs(amount)}`,
    bidPlaced: "Gebot abgegeben, warte auf andere.",
    waitingBid: "Waehle dein Gebot",
    notEnoughGold: "Nicht genug Gold"
  }
} satisfies Record<SupportedLanguage, Record<string, unknown>>;

function txt(language: SupportedLanguage) {
  return auctionText[language] ?? auctionText["zh-CN"];
}

function createGoldMap(playerIds: string[]): Record<string, number> {
  return Object.fromEntries(playerIds.map((id) => [id, startingGold]));
}

function toPublicItem(item: AuctionItem | null, stage: AuctionKingState["stage"]): PublicAuctionItem | null {
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    clues: item.clues,
    rarity: item.rarity,
    trueValue: stage === "reveal" || stage === "finished" ? item.trueValue : null
  };
}

function determineWinner(
  bids: Record<string, number>,
  players: GamePlayerSummary[]
): { winnerId: string | null; winningBid: number; tie: boolean } {
  const playerBids = players
    .map((p) => ({ playerId: p.id, bid: bids[p.id] ?? 0 }))
    .filter((entry) => entry.bid > 0);

  if (playerBids.length === 0) {
    return { winnerId: null, winningBid: 0, tie: false };
  }

  playerBids.sort((a, b) => b.bid - a.bid);

  if (playerBids.length >= 2 && playerBids[0].bid === playerBids[1].bid) {
    return { winnerId: null, winningBid: playerBids[0].bid, tie: true };
  }

  return { winnerId: playerBids[0].playerId, winningBid: playerBids[0].bid, tie: false };
}

function settleRound(
  state: AuctionKingState,
  players: GamePlayerSummary[],
  now: number,
  language: SupportedLanguage
): AuctionKingState {
  const t = txt(language);
  const item = state.currentItem;
  if (!item) return state;

  const bids = { ...state.bidsByPlayerId };

  for (const player of players) {
    if (!Object.prototype.hasOwnProperty.call(bids, player.id)) {
      bids[player.id] = 0;
    }
  }

  const { winnerId, winningBid, tie } = determineWinner(bids, players);
  const gold = { ...state.goldByPlayerId };

  if (winnerId) {
    gold[winnerId] = (gold[winnerId] ?? startingGold) - winningBid + item.trueValue;
  }

  const result: AuctionRoundResult = {
    round: state.currentRound,
    itemId: item.id,
    itemName: item.name,
    category: item.category,
    rarity: item.rarity,
    trueValue: item.trueValue,
    winnerPlayerId: winnerId,
    winningBid,
    allBids: bids
  };

  let message: string;
  if (tie) {
    message = t.tieNoSale;
  } else if (winnerId) {
    const winnerName = players.find((p) => p.id === winnerId)?.name ?? "?";
    const profit = item.trueValue - winningBid;
    message = `${t.wins(winnerName)} ${t.profit(profit)}`;
  } else {
    message = t.noWinner;
  }

  return {
    ...state,
    bidsByPlayerId: bids,
    goldByPlayerId: gold,
    roundResults: [...state.roundResults, result],
    stageEndsAt: now + revealDurationMs,
    updatedAt: now,
    message
  };
}

function startNextRound(
  state: AuctionKingState,
  now: number,
  language: SupportedLanguage
): AuctionKingState {
  const t = txt(language);
  const items = randomItems(1, state.usedItemIds);
  const nextItem = items[0];

  return {
    ...state,
    currentRound: state.currentRound + 1,
    currentItem: nextItem,
    usedItemIds: [...state.usedItemIds, nextItem.id],
    bidsByPlayerId: {},
    stage: "appraisal",
    stageEndsAt: now + appraisalDurationMs,
    updatedAt: now,
    message: t.appraisal
  };
}

function buildPlayerProgress(
  players: GamePlayerSummary[],
  state: AuctionKingState
): AuctionKingPublicState["playerProgress"] {
  return players.map((player) => ({
    playerId: player.id,
    name: player.name,
    color: player.color,
    gold: state.goldByPlayerId[player.id] ?? startingGold,
    hasBid: Object.prototype.hasOwnProperty.call(state.bidsByPlayerId, player.id)
  }));
}

function toPublicState(
  state: AuctionKingState,
  players: GamePlayerSummary[]
): AuctionKingPublicState {
  return {
    stage: state.stage,
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    startingGold: state.startingGold,
    goldByPlayerId: state.goldByPlayerId,
    currentItem: toPublicItem(state.currentItem, state.stage),
    bidSubmittedByPlayerId: Object.fromEntries(
      players.map((p) => [p.id, Object.prototype.hasOwnProperty.call(state.bidsByPlayerId, p.id)])
    ),
    roundResults: state.roundResults,
    stageEndsAt: state.stageEndsAt,
    playerProgress: buildPlayerProgress(players, state)
  };
}

export const serverGame: ServerGame<
  AuctionKingState,
  AuctionKingInput,
  AuctionKingPublicState
> = {
  manifest: auctionKingManifest,

  createInitialState(context) {
    const t = txt(context.language);
    const playerIds = context.players.map((p) => p.id);
    const items = randomItems(totalRounds, []);
    const firstItem = items[0];
    const usedIds = items.map((item) => item.id);

    return {
      ...createBaseRoundState("round_intro", context.now, {
        durationMs: roundPhaseDurations.roundIntroMs,
        message: t.intro
      }),
      stage: "appraisal",
      currentRound: 1,
      totalRounds,
      startingGold,
      goldByPlayerId: createGoldMap(playerIds),
      currentItem: firstItem,
      usedItemIds: usedIds,
      bidsByPlayerId: {},
      roundResults: [],
      stageEndsAt: null
    };
  },

  startRound(state, context) {
    const t = txt(context.language);
    return transitionRoundState(
      {
        ...state,
        stage: "appraisal",
        stageEndsAt: context.now + appraisalDurationMs,
        message: t.appraisal
      },
      "playing",
      context.now,
      { startedAt: context.now, message: t.appraisal }
    );
  },

  handleInput(state, input, context) {
    if (state.phase !== "playing" || state.stage !== "bidding") {
      return state;
    }

    if (!context.players.some((p) => p.id === input.playerId)) {
      return state;
    }

    if (Object.prototype.hasOwnProperty.call(state.bidsByPlayerId, input.playerId)) {
      return state;
    }

    if (!bidOptions.includes(input.amount)) {
      return state;
    }

    const playerGold = state.goldByPlayerId[input.playerId] ?? 0;
    if (input.amount > 0 && input.amount > playerGold) {
      return state;
    }

    const nextBids = {
      ...state.bidsByPlayerId,
      [input.playerId]: input.amount
    };

    const allBid = context.players.every((p) =>
      Object.prototype.hasOwnProperty.call(nextBids, p.id)
    );

    if (allBid) {
      const settled = settleRound(
        { ...state, bidsByPlayerId: nextBids, updatedAt: context.now },
        context.players,
        context.now,
        context.language
      );
      return { ...settled, stage: "reveal" };
    }

    return {
      ...state,
      bidsByPlayerId: nextBids,
      updatedAt: context.now
    };
  },

  tick(state, _deltaMs, context) {
    if (state.phase !== "playing") {
      return state;
    }

    const t = txt(context.language);
    const now = context.now;

    if (state.stage === "appraisal" && state.stageEndsAt !== null && now >= state.stageEndsAt) {
      return {
        ...state,
        stage: "bidding",
        stageEndsAt: now + biddingDurationMs,
        updatedAt: now,
        message: t.bidding
      };
    }

    if (state.stage === "bidding" && state.stageEndsAt !== null && now >= state.stageEndsAt) {
      const settled = settleRound(state, context.players, now, context.language);
      return { ...settled, stage: "reveal" };
    }

    if (state.stage === "reveal" && state.stageEndsAt !== null && now >= state.stageEndsAt) {
      if (state.currentRound >= state.totalRounds) {
        return {
          ...state,
          stage: "finished",
          currentItem: null,
          stageEndsAt: null,
          updatedAt: now,
          message: t.finished
        };
      }

      return startNextRound(state, now, context.language);
    }

    return state;
  },

  isRoundFinished(state) {
    return state.stage === "finished";
  },

  buildScore(state) {
    return Object.entries(state.goldByPlayerId).map(([playerId, gold]) => ({
      playerId,
      delta: gold - startingGold,
      reason: "Auction King"
    }));
  },

  toPublicState(state, context) {
    return toPublicState(state, context.players);
  },

  toControllerStateForPlayer(state, context, playerId) {
    const publicState = toPublicState(state, context.players);
    const playerGold = state.goldByPlayerId[playerId] ?? startingGold;
    const ownBid = Object.prototype.hasOwnProperty.call(state.bidsByPlayerId, playerId)
      ? state.bidsByPlayerId[playerId]
      : null;

    const canBid =
      state.phase === "playing" &&
      state.stage === "bidding" &&
      !Object.prototype.hasOwnProperty.call(state.bidsByPlayerId, playerId);

    const affordableBidOptions = bidOptions.filter(
      (amount) => amount === 0 || amount <= playerGold
    );

    return {
      ...publicState,
      playerId,
      ownBid,
      canBid,
      bidOptions: affordableBidOptions
    } satisfies AuctionKingControllerState;
  }
};
