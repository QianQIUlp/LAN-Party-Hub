import {
  createBaseRoundState,
  roundPhaseDurations,
  transitionRoundState,
  type ScoreEntry,
  type ServerGame,
  type ServerGameContext,
  type SupportedLanguage
} from "@open-party-lab/game-core";
import { liarsTableManifest } from "../manifest.js";
import type {
  LiarsCard,
  LiarsCardRank,
  LiarsChamberResult,
  LiarsClaimRank,
  LiarsTableControllerState,
  LiarsTableInput,
  LiarsTablePublicState,
  LiarsTableState
} from "../protocol.js";

export const liarsTableMaxHealth = 2;
export const liarsTableHandSize = 4;
export const liarsTableChamberSize = 4;
export const liarsTableRevealDurationMs = 3_600;
export const liarsClaimRanks: readonly LiarsClaimRank[] = ["crown", "moon", "key"];

const copiesPerClaimRank = 7;
const wildCardCount = 3;

const liarsText = {
  "zh-CN": {
    preparing: "牌已洗好。记住：牌面是秘密，宣称是公开的。",
    turn: (name: string, rank: string) => "轮到 " + name + "。本手所有暗牌都宣称为“" + rank + "”。",
    play: (name: string, rank: string) => name + " 打出一张暗牌，并宣称它是“" + rank + "”。",
    truthful: (challenger: string, accused: string, rank: string) =>
      challenger + " 质疑失败：" + accused + " 打出的确实可以视为“" + rank + "”。",
    lie: (challenger: string, accused: string, rank: string) =>
      challenger + " 抓到了谎言：" + accused + " 打出的不是“" + rank + "”。",
    blank: "命运轮盘空响，本次没有失去生命。",
    live: "命运轮盘命中，失去一点生命。",
    nextHand: (number: number, rank: string, name: string) =>
      "第 " + number + " 手：桌面图腾是“" + rank + "”，由 " + name + " 开始。",
    winner: (name: string) => name + " 成为牌桌上最后的赢家！",
    unknown: "未知玩家",
    ranks: { crown: "皇冠", moon: "月亮", key: "钥匙", wild: "百搭" }
  },
  en: {
    preparing: "The cards are shuffled. Faces stay secret; claims are public.",
    turn: (name: string, rank: string) => name + " acts first. Every hidden card claims " + rank + ".",
    play: (name: string, rank: string) => name + " plays one hidden card and claims " + rank + ".",
    truthful: (challenger: string, accused: string, rank: string) =>
      challenger + " challenged and lost: " + accused + " really played " + rank + ".",
    lie: (challenger: string, accused: string, rank: string) =>
      challenger + " caught the lie: " + accused + " did not play " + rank + ".",
    blank: "The fate chamber clicks blank. No resolve is lost.",
    live: "The fate chamber hits. One resolve is lost.",
    nextHand: (number: number, rank: string, name: string) =>
      "Hand " + number + ": the table sigil is " + rank + ". " + name + " begins.",
    winner: (name: string) => name + " is the last player at the table.",
    unknown: "Unknown player",
    ranks: { crown: "Crown", moon: "Moon", key: "Key", wild: "Wild" }
  },
  de: {
    preparing: "Die Karten sind gemischt. Karten bleiben geheim, Ansagen sind offen.",
    turn: (name: string, rank: string) => name + " beginnt. Jede verdeckte Karte behauptet " + rank + ".",
    play: (name: string, rank: string) => name + " spielt verdeckt und behauptet " + rank + ".",
    truthful: (challenger: string, accused: string, rank: string) =>
      challenger + " verliert die Anzweiflung: " + accused + " spielte wirklich " + rank + ".",
    lie: (challenger: string, accused: string, rank: string) =>
      challenger + " entlarvt die Luege: " + accused + " spielte nicht " + rank + ".",
    blank: "Die Schicksalstrommel klickt leer. Kein Mut geht verloren.",
    live: "Die Schicksalstrommel trifft. Ein Mutpunkt geht verloren.",
    nextHand: (number: number, rank: string, name: string) =>
      "Hand " + number + ": Das Tischsymbol ist " + rank + ". " + name + " beginnt.",
    winner: (name: string) => name + " bleibt als Letzter am Tisch.",
    unknown: "Unbekannter Spieler",
    ranks: { crown: "Krone", moon: "Mond", key: "Schluessel", wild: "Joker" }
  }
} satisfies Record<SupportedLanguage, {
  preparing: string;
  turn: (name: string, rank: string) => string;
  play: (name: string, rank: string) => string;
  truthful: (challenger: string, accused: string, rank: string) => string;
  lie: (challenger: string, accused: string, rank: string) => string;
  blank: string;
  live: string;
  nextHand: (number: number, rank: string, name: string) => string;
  winner: (name: string) => string;
  unknown: string;
  ranks: Record<LiarsCardRank, string>;
}>;

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const candidate = Math.floor(random() * (index + 1));
    const swapIndex = Math.max(0, Math.min(index, candidate));
    [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
  }

  return result;
}

export function createLiarsDeck(
  random: () => number = Math.random,
  handNumber = 1
): LiarsCard[] {
  const cards: LiarsCard[] = [];

  for (const rank of liarsClaimRanks) {
    for (let copy = 0; copy < copiesPerClaimRank; copy += 1) {
      cards.push({
        id: "h" + handNumber + "-" + rank + "-" + copy,
        rank
      });
    }
  }

  for (let copy = 0; copy < wildCardCount; copy += 1) {
    cards.push({
      id: "h" + handNumber + "-wild-" + copy,
      rank: "wild"
    });
  }

  return shuffle(cards, random);
}

function pickClaimRank(random: () => number = Math.random): LiarsClaimRank {
  const index = Math.max(
    0,
    Math.min(liarsClaimRanks.length - 1, Math.floor(random() * liarsClaimRanks.length))
  );
  return liarsClaimRanks[index] ?? "crown";
}

function randomDangerIndex(random: () => number = Math.random): number {
  return Math.max(
    0,
    Math.min(liarsTableChamberSize - 1, Math.floor(random() * liarsTableChamberSize))
  );
}

function dealHands(
  activePlayerIds: string[],
  handNumber: number,
  random: () => number = Math.random
): Record<string, LiarsCard[]> {
  const deck = createLiarsDeck(random, handNumber);
  const hands: Record<string, LiarsCard[]> = {};
  let cursor = 0;

  for (const playerId of activePlayerIds) {
    hands[playerId] = deck.slice(cursor, cursor + liarsTableHandSize);
    cursor += liarsTableHandSize;
  }

  return hands;
}

function playerName(playerId: string, context: ServerGameContext): string {
  return context.players.find((player) => player.id === playerId)?.name
    ?? liarsText[context.language].unknown;
}

function rankLabel(rank: LiarsCardRank, language: SupportedLanguage): string {
  return liarsText[language].ranks[rank];
}

function alivePlayerIds(
  playerOrder: string[],
  healthByPlayer: Record<string, number>
): string[] {
  return playerOrder.filter((playerId) => (healthByPlayer[playerId] ?? 0) > 0);
}

function nextAlivePlayerId(
  playerOrder: string[],
  activePlayerIds: string[],
  afterPlayerId: string
): string | undefined {
  if (activePlayerIds.length === 0) {
    return undefined;
  }

  const startIndex = playerOrder.indexOf(afterPlayerId);
  for (let offset = 1; offset <= playerOrder.length; offset += 1) {
    const candidate = playerOrder[(Math.max(0, startIndex) + offset) % playerOrder.length];
    if (candidate && activePlayerIds.includes(candidate)) {
      return candidate;
    }
  }

  return activePlayerIds[0];
}

function chamberRiskByPlayer(state: LiarsTableState) {
  return Object.fromEntries(
    state.playerOrder.map((playerId) => [
      playerId,
      {
        numerator: 1 as const,
        denominator: Math.max(
          1,
          liarsTableChamberSize - (state.chamberStepByPlayer[playerId] ?? 0)
        )
      }
    ])
  );
}

function toPublicState(state: LiarsTableState): LiarsTablePublicState {
  return {
    stage: state.stage,
    playerOrder: state.playerOrder,
    activePlayerIds: state.activePlayerIds,
    currentPlayerId: state.currentPlayerId,
    healthByPlayer: state.healthByPlayer,
    maxHealth: state.maxHealth,
    handCountByPlayer: Object.fromEntries(
      state.playerOrder.map((playerId) => [
        playerId,
        state.handsByPlayer[playerId]?.length ?? 0
      ])
    ),
    tableRank: state.tableRank,
    lastPlay: state.lastPlay
      ? {
          playerId: state.lastPlay.playerId,
          cardCount: 1,
          playedAt: state.lastPlay.playedAt
        }
      : undefined,
    lastReveal: state.lastReveal,
    handNumber: state.handNumber,
    turnNumber: state.turnNumber,
    chamberRiskByPlayer: chamberRiskByPlayer(state),
    revealEndsAt: state.revealEndsAt,
    winnerPlayerId: state.winnerPlayerId,
    message: state.message
  };
}

function beginNextHand(
  state: LiarsTableState,
  context: ServerGameContext
): LiarsTableState {
  const activePlayerIds = alivePlayerIds(state.playerOrder, state.healthByPlayer);
  const handNumber = state.handNumber + 1;
  const starter = state.nextStarterPlayerId && activePlayerIds.includes(state.nextStarterPlayerId)
    ? state.nextStarterPlayerId
    : activePlayerIds[0];
  const tableRank = pickClaimRank();
  const starterName = starter
    ? playerName(starter, context)
    : liarsText[context.language].unknown;

  return {
    ...state,
    stage: "turn",
    activePlayerIds,
    currentPlayerId: starter,
    handsByPlayer: dealHands(activePlayerIds, handNumber),
    tableRank,
    lastPlay: undefined,
    handNumber,
    revealEndsAt: null,
    nextStarterPlayerId: undefined,
    updatedAt: context.now,
    message: liarsText[context.language].nextHand(
      handNumber,
      rankLabel(tableRank, context.language),
      starterName
    )
  };
}

function buildScore(state: LiarsTableState): ScoreEntry[] {
  return state.winnerPlayerId
    ? [{ playerId: state.winnerPlayerId, delta: 3, reason: "Liars Table victory" }]
    : [];
}

export const serverGame: ServerGame<
  LiarsTableState,
  LiarsTableInput,
  LiarsTablePublicState | LiarsTableControllerState
> = {
  manifest: liarsTableManifest,
  createInitialState(context) {
    const playerOrder = context.players.map((player) => player.id);
    const activePlayerIds = [...playerOrder];
    const firstPlayerId = activePlayerIds.length > 0
      ? activePlayerIds[(context.roundNumber - 1) % activePlayerIds.length]
      : undefined;
    const tableRank = pickClaimRank();

    return {
      ...createBaseRoundState("round_intro", context.now, {
        durationMs: roundPhaseDurations.roundIntroMs,
        message: liarsText[context.language].preparing
      }),
      stage: "turn",
      playerOrder,
      activePlayerIds,
      currentPlayerId: firstPlayerId,
      healthByPlayer: Object.fromEntries(
        playerOrder.map((playerId) => [playerId, liarsTableMaxHealth])
      ),
      maxHealth: liarsTableMaxHealth,
      handsByPlayer: dealHands(activePlayerIds, 1),
      tableRank,
      handNumber: 1,
      turnNumber: 0,
      dangerIndexByPlayer: Object.fromEntries(
        playerOrder.map((playerId) => [playerId, randomDangerIndex()])
      ),
      chamberStepByPlayer: Object.fromEntries(
        playerOrder.map((playerId) => [playerId, 0])
      ),
      revealEndsAt: null
    };
  },
  startRound(state, context) {
    const name = state.currentPlayerId
      ? playerName(state.currentPlayerId, context)
      : liarsText[context.language].unknown;

    return transitionRoundState(state, "playing", context.now, {
      startedAt: context.now,
      message: liarsText[context.language].turn(
        name,
        rankLabel(state.tableRank, context.language)
      )
    });
  },
  handleInput(state, input, context) {
    if (
      state.phase !== "playing"
      || state.stage !== "turn"
      || input.playerId !== state.currentPlayerId
      || !state.activePlayerIds.includes(input.playerId)
    ) {
      return state;
    }

    if (input.type === "play_card") {
      const hand = state.handsByPlayer[input.playerId] ?? [];
      const card = hand.find((candidate) => candidate.id === input.cardId);

      if (!card) {
        return state;
      }

      const nextPlayerId = nextAlivePlayerId(
        state.playerOrder,
        state.activePlayerIds,
        input.playerId
      );

      return {
        ...state,
        currentPlayerId: nextPlayerId,
        handsByPlayer: {
          ...state.handsByPlayer,
          [input.playerId]: hand.filter((candidate) => candidate.id !== input.cardId)
        },
        lastPlay: {
          playerId: input.playerId,
          card,
          playedAt: context.now
        },
        turnNumber: state.turnNumber + 1,
        updatedAt: context.now,
        message: liarsText[context.language].play(
          playerName(input.playerId, context),
          rankLabel(state.tableRank, context.language)
        )
      };
    }

    if (input.type === "challenge" && state.lastPlay) {
      const accusedPlayerId = state.lastPlay.playerId;
      const truthful =
        state.lastPlay.card.rank === state.tableRank
        || state.lastPlay.card.rank === "wild";
      const loserPlayerId = truthful ? input.playerId : accusedPlayerId;
      const chamberStep = state.chamberStepByPlayer[loserPlayerId] ?? 0;
      const dangerIndex = state.dangerIndexByPlayer[loserPlayerId] ?? 0;
      const chamberResult: LiarsChamberResult =
        chamberStep === dangerIndex ? "live" : "blank";
      const lifeLost = chamberResult === "live";
      const healthByPlayer = {
        ...state.healthByPlayer,
        [loserPlayerId]: lifeLost
          ? Math.max(0, (state.healthByPlayer[loserPlayerId] ?? 0) - 1)
          : state.healthByPlayer[loserPlayerId] ?? 0
      };
      const nextActivePlayerIds = alivePlayerIds(state.playerOrder, healthByPlayer);
      const nextStarterPlayerId = nextActivePlayerIds.includes(loserPlayerId)
        ? loserPlayerId
        : nextAlivePlayerId(state.playerOrder, nextActivePlayerIds, loserPlayerId);
      const dangerIndexByPlayer = {
        ...state.dangerIndexByPlayer,
        ...(lifeLost ? { [loserPlayerId]: randomDangerIndex() } : {})
      };
      const chamberStepByPlayer = {
        ...state.chamberStepByPlayer,
        [loserPlayerId]: lifeLost ? 0 : chamberStep + 1
      };
      const challengerName = playerName(input.playerId, context);
      const accusedName = playerName(accusedPlayerId, context);
      const claimLabel = rankLabel(state.tableRank, context.language);
      const verdict = truthful
        ? liarsText[context.language].truthful(challengerName, accusedName, claimLabel)
        : liarsText[context.language].lie(challengerName, accusedName, claimLabel);
      const chamberMessage = lifeLost
        ? liarsText[context.language].live
        : liarsText[context.language].blank;

      return {
        ...state,
        stage: "reveal",
        activePlayerIds: nextActivePlayerIds,
        healthByPlayer,
        dangerIndexByPlayer,
        chamberStepByPlayer,
        lastReveal: {
          accusedPlayerId,
          challengerPlayerId: input.playerId,
          loserPlayerId,
          card: state.lastPlay.card,
          truthful,
          chamberResult,
          lifeLost,
          revealedAt: context.now
        },
        revealEndsAt: context.now + liarsTableRevealDurationMs,
        nextStarterPlayerId,
        winnerPlayerId:
          nextActivePlayerIds.length === 1 ? nextActivePlayerIds[0] : undefined,
        updatedAt: context.now,
        message: verdict + " " + chamberMessage
      };
    }

    return state;
  },
  tick(state, _deltaMs, context) {
    if (
      state.stage !== "reveal"
      || state.revealEndsAt === null
      || context.now < state.revealEndsAt
    ) {
      return state;
    }

    if (state.activePlayerIds.length <= 1) {
      const winnerPlayerId = state.activePlayerIds[0];
      const winnerName = winnerPlayerId
        ? playerName(winnerPlayerId, context)
        : liarsText[context.language].unknown;

      return {
        ...state,
        stage: "resolved",
        currentPlayerId: undefined,
        revealEndsAt: null,
        winnerPlayerId,
        updatedAt: context.now,
        message: liarsText[context.language].winner(winnerName)
      };
    }

    return beginNextHand(state, context);
  },
  isRoundFinished(state) {
    return state.stage === "resolved";
  },
  buildScore(state) {
    return buildScore(state);
  },
  toPublicState(state) {
    return toPublicState(state);
  },
  toControllerStateForPlayer(state, _context, playerId) {
    const visibleState = toPublicState(state);
    const ownsTurn =
      state.phase === "playing"
      && state.stage === "turn"
      && state.currentPlayerId === playerId;

    return {
      ...visibleState,
      playerId,
      ownHand: state.handsByPlayer[playerId] ?? [],
      canPlay: ownsTurn && (state.handsByPlayer[playerId]?.length ?? 0) > 0,
      canChallenge:
        ownsTurn
        && Boolean(state.lastPlay)
        && state.lastPlay?.playerId !== playerId
    };
  }
};
