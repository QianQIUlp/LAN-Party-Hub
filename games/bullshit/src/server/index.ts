import {
  createBaseRoundState,
  roundPhaseDurations,
  type ScoreEntry,
  type ServerGame,
  type ServerGameContext,
  type SupportedLanguage
} from "@open-party-lab/game-core";
import { pickOne, shuffle } from "@open-party-lab/utils";
import { bullshitManifest } from "../manifest.js";
import type {
  BullshitCard,
  BullshitControllerState,
  BullshitInput,
  BullshitPublicResolution,
  BullshitPublicState,
  BullshitRank,
  BullshitState
} from "../protocol.js";
import { createStandardDeck, isBullshitRank, isTruthfulBatch, sortCards } from "./cards.js";

const bullshitText = {
  "zh-CN": {
    preparing: "洗牌并秘密发牌……",
    noPlayers: "等待玩家。",
    starts: (name: string) => `${name} 率先出牌。`,
    declares: (name: string, count: number, rank: string) => `${name} 宣称打出了 ${count} 张 ${rank}。`,
    passes: (name: string) => `${name} 选择过牌。`,
    liarCaught: (challenged: string, challenger: string, count: number) =>
      `${challenger} 抓到了 ${challenged} 的谎言；${challenged} 拿走全部 ${count} 张牌。`,
    honestChecked: (challenged: string, challenger: string, count: number) =>
      `${challenged} 说的是真话；${challenger} 拿走全部 ${count} 张牌。`,
    pendingWin: (name: string) => `${name} 已经出完手牌，最后一手仍可被质疑！`,
    winner: (name: string) => `${name} 的最后一手通过检验，赢得本局！`,
    unknown: "未知玩家"
  },
  en: {
    preparing: "Shuffling and dealing private hands ...",
    noPlayers: "Waiting for players.",
    starts: (name: string) => `${name} leads the first pile.`,
    declares: (name: string, count: number, rank: string) => `${name} claims ${count} × ${rank}.`,
    passes: (name: string) => `${name} passes.`,
    liarCaught: (challenged: string, challenger: string, count: number) =>
      `${challenger} catches ${challenged} bluffing; ${challenged} takes all ${count} cards.`,
    honestChecked: (challenged: string, challenger: string, count: number) =>
      `${challenged} was truthful; ${challenger} takes all ${count} cards.`,
    pendingWin: (name: string) => `${name} is out of cards, but the final play can still be checked!`,
    winner: (name: string) => `${name}'s final play survives and wins the round!`,
    unknown: "Unknown player"
  },
  de: {
    preparing: "Karten werden gemischt und geheim verteilt ...",
    noPlayers: "Warte auf Spieler.",
    starts: (name: string) => `${name} eroeffnet den ersten Stapel.`,
    declares: (name: string, count: number, rank: string) => `${name} behauptet: ${count} × ${rank}.`,
    passes: (name: string) => `${name} passt.`,
    liarCaught: (challenged: string, challenger: string, count: number) =>
      `${challenger} erwischt ${challenged} beim Bluffen; ${challenged} nimmt alle ${count} Karten.`,
    honestChecked: (challenged: string, challenger: string, count: number) =>
      `${challenged} sagte die Wahrheit; ${challenger} nimmt alle ${count} Karten.`,
    pendingWin: (name: string) => `${name} hat keine Karten mehr, aber der letzte Zug darf noch geprueft werden!`,
    winner: (name: string) => `${name}s letzter Zug haelt stand und gewinnt die Runde!`,
    unknown: "Unbekannter Spieler"
  }
} satisfies Record<SupportedLanguage, {
  preparing: string;
  noPlayers: string;
  starts: (name: string) => string;
  declares: (name: string, count: number, rank: string) => string;
  passes: (name: string) => string;
  liarCaught: (challenged: string, challenger: string, count: number) => string;
  honestChecked: (challenged: string, challenger: string, count: number) => string;
  pendingWin: (name: string) => string;
  winner: (name: string) => string;
  unknown: string;
}>;

function createPrivateMaps(playerIds: readonly string[]): Pick<
  BullshitState,
  "handsByPlayer" | "selectedCardIdsByPlayer" | "selectedRankByPlayer"
> {
  return {
    handsByPlayer: Object.fromEntries(playerIds.map((playerId) => [playerId, []])),
    selectedCardIdsByPlayer: Object.fromEntries(playerIds.map((playerId) => [playerId, []])),
    selectedRankByPlayer: Object.fromEntries(playerIds.map((playerId) => [playerId, null]))
  };
}

function rotateToRandomLeader(playerIds: readonly string[]): string[] {
  if (playerIds.length === 0) {
    return [];
  }

  const leader = pickOne([...playerIds]);
  const leaderIndex = playerIds.indexOf(leader);
  return [...playerIds.slice(leaderIndex), ...playerIds.slice(0, leaderIndex)];
}

export function dealDeck(playerIds: readonly string[], deck: readonly BullshitCard[]): Record<string, BullshitCard[]> {
  const hands = Object.fromEntries(playerIds.map((playerId) => [playerId, [] as BullshitCard[]]));
  if (playerIds.length === 0) {
    return hands;
  }

  deck.forEach((card, index) => {
    hands[playerIds[index % playerIds.length]]?.push(card);
  });

  for (const playerId of playerIds) {
    hands[playerId] = sortCards(hands[playerId] ?? []);
  }

  return hands;
}

function nextPlayerId(turnOrder: readonly string[], currentPlayerId: string): string | null {
  if (turnOrder.length === 0) {
    return null;
  }

  const currentIndex = turnOrder.indexOf(currentPlayerId);
  if (currentIndex < 0) {
    return turnOrder[0] ?? null;
  }

  return turnOrder[(currentIndex + 1) % turnOrder.length] ?? null;
}

function playerName(
  playerId: string | null,
  context: ServerGameContext
): string {
  if (!playerId) {
    return bullshitText[context.language].unknown;
  }

  return context.players.find((player) => player.id === playerId)?.name ?? bullshitText[context.language].unknown;
}

function clearPrivateSelections(state: BullshitState): Pick<
  BullshitState,
  "selectedCardIdsByPlayer" | "selectedRankByPlayer"
> {
  return {
    selectedCardIdsByPlayer: Object.fromEntries(state.turnOrder.map((playerId) => [playerId, []])),
    selectedRankByPlayer: Object.fromEntries(state.turnOrder.map((playerId) => [playerId, null]))
  };
}

function finishWithWinner(
  state: BullshitState,
  winnerPlayerId: string,
  now: number,
  language: SupportedLanguage,
  winnerName: string
): BullshitState {
  return {
    ...state,
    winnerPlayerId,
    pendingWinnerPlayerId: null,
    updatedAt: now,
    message: bullshitText[language].winner(winnerName)
  };
}

function buildPublicResolution(
  state: BullshitState,
  context: ServerGameContext
): BullshitPublicResolution | null {
  if (!state.lastResolution) {
    return null;
  }

  return {
    ...state.lastResolution,
    challengerName: playerName(state.lastResolution.challengerPlayerId, context),
    challengedName: playerName(state.lastResolution.challengedPlayerId, context),
    recipientName: playerName(state.lastResolution.recipientPlayerId, context)
  };
}

function buildPublicState(
  state: BullshitState,
  context: ServerGameContext
): BullshitPublicState {
  const names = new Map(context.players.map((player) => [player.id, player.name]));

  return {
    activeRank: state.activeRank,
    pileCount: state.pile.length,
    currentTurnPlayerId: state.currentTurnPlayerId,
    currentTurnPlayerName: state.currentTurnPlayerId
      ? names.get(state.currentTurnPlayerId) ?? bullshitText[context.language].unknown
      : null,
    players: state.turnOrder.map((playerId) => ({
      playerId,
      playerName: names.get(playerId) ?? bullshitText[context.language].unknown,
      cardCount: state.handsByPlayer[playerId]?.length ?? 0,
      hasPassed: state.passedPlayerIds.includes(playerId)
    })),
    lastPlay: state.lastPlay
      ? {
          playerId: state.lastPlay.playerId,
          playerName: names.get(state.lastPlay.playerId) ?? bullshitText[context.language].unknown,
          claimedRank: state.lastPlay.claimedRank,
          count: state.lastPlay.cards.length
        }
      : null,
    pendingWinnerPlayerId: state.pendingWinnerPlayerId,
    pendingWinnerName: state.pendingWinnerPlayerId
      ? names.get(state.pendingWinnerPlayerId) ?? bullshitText[context.language].unknown
      : null,
    winnerPlayerId: state.winnerPlayerId,
    winnerName: state.winnerPlayerId
      ? names.get(state.winnerPlayerId) ?? bullshitText[context.language].unknown
      : null,
    lastResolution: buildPublicResolution(state, context),
    message: state.message
  };
}

function handleToggleCard(state: BullshitState, input: BullshitInput, now: number): BullshitState {
  if (input.type !== "toggle_card" || typeof input.cardId !== "string") {
    return state;
  }

  const hand = state.handsByPlayer[input.playerId] ?? [];
  if (!hand.some((card) => card.id === input.cardId)) {
    return state;
  }

  const selected = state.selectedCardIdsByPlayer[input.playerId] ?? [];
  const nextSelected = selected.includes(input.cardId)
    ? selected.filter((cardId) => cardId !== input.cardId)
    : [...selected, input.cardId];

  return {
    ...state,
    selectedCardIdsByPlayer: {
      ...state.selectedCardIdsByPlayer,
      [input.playerId]: nextSelected
    },
    updatedAt: now
  };
}

function handleSelectRank(state: BullshitState, input: BullshitInput, now: number): BullshitState {
  if (
    input.type !== "select_rank" ||
    state.activeRank !== null ||
    state.lastPlay !== null ||
    !isBullshitRank(input.rank)
  ) {
    return state;
  }

  return {
    ...state,
    selectedRankByPlayer: {
      ...state.selectedRankByPlayer,
      [input.playerId]: input.rank
    },
    updatedAt: now
  };
}

function handlePlaySelected(
  state: BullshitState,
  input: BullshitInput,
  context: ServerGameContext
): BullshitState {
  if (input.type !== "play_selected") {
    return state;
  }

  const selectedIds = [...new Set(state.selectedCardIdsByPlayer[input.playerId] ?? [])];
  const hand = state.handsByPlayer[input.playerId] ?? [];
  const selectedCards = selectedIds
    .map((cardId) => hand.find((card) => card.id === cardId))
    .filter((card): card is BullshitCard => Boolean(card));
  const claimedRank: BullshitRank | null = state.activeRank ?? state.selectedRankByPlayer[input.playerId] ?? null;

  if (selectedCards.length === 0 || selectedCards.length !== selectedIds.length || !claimedRank) {
    return state;
  }

  if (state.pendingWinnerPlayerId && state.pendingWinnerPlayerId !== input.playerId) {
    const winnerId = state.pendingWinnerPlayerId;
    return finishWithWinner(
      state,
      winnerId,
      context.now,
      context.language,
      playerName(winnerId, context)
    );
  }

  const selectedSet = new Set(selectedIds);
  const nextHand = hand.filter((card) => !selectedSet.has(card.id));
  const nextTurn = nextPlayerId(state.turnOrder, input.playerId);
  const pendingWinnerPlayerId = nextHand.length === 0 ? input.playerId : null;
  const actorName = playerName(input.playerId, context);
  const text = bullshitText[context.language];

  return {
    ...state,
    currentTurnPlayerId: nextTurn,
    handsByPlayer: {
      ...state.handsByPlayer,
      [input.playerId]: nextHand
    },
    selectedCardIdsByPlayer: {
      ...state.selectedCardIdsByPlayer,
      [input.playerId]: []
    },
    selectedRankByPlayer: {
      ...state.selectedRankByPlayer,
      [input.playerId]: null
    },
    activeRank: claimedRank,
    pile: [...state.pile, ...selectedCards],
    lastPlay: {
      playerId: input.playerId,
      cards: selectedCards,
      claimedRank,
      playedAt: context.now
    },
    pendingWinnerPlayerId,
    lastResolution: null,
    updatedAt: context.now,
    message: pendingWinnerPlayerId
      ? text.pendingWin(actorName)
      : text.declares(actorName, selectedCards.length, claimedRank)
  };
}

function handlePass(
  state: BullshitState,
  input: BullshitInput,
  context: ServerGameContext
): BullshitState {
  if (
    input.type !== "pass" ||
    !state.lastPlay ||
    state.passedPlayerIds.includes(input.playerId)
  ) {
    return state;
  }

  const nextTurn = nextPlayerId(state.turnOrder, input.playerId);
  const nextState: BullshitState = {
    ...state,
    currentTurnPlayerId: nextTurn,
    passedPlayerIds: [...state.passedPlayerIds, input.playerId],
    selectedCardIdsByPlayer: {
      ...state.selectedCardIdsByPlayer,
      [input.playerId]: []
    },
    selectedRankByPlayer: {
      ...state.selectedRankByPlayer,
      [input.playerId]: null
    },
    updatedAt: context.now,
    message: bullshitText[context.language].passes(playerName(input.playerId, context))
  };

  if (state.pendingWinnerPlayerId && nextTurn === state.pendingWinnerPlayerId) {
    return finishWithWinner(
      nextState,
      state.pendingWinnerPlayerId,
      context.now,
      context.language,
      playerName(state.pendingWinnerPlayerId, context)
    );
  }

  return nextState;
}

function handleCheck(
  state: BullshitState,
  input: BullshitInput,
  context: ServerGameContext
): BullshitState {
  if (
    input.type !== "check" ||
    !state.lastPlay ||
    !state.activeRank ||
    input.playerId === state.lastPlay.playerId
  ) {
    return state;
  }

  const challengedPlayerId = state.lastPlay.playerId;
  const truthful = isTruthfulBatch(state.lastPlay.cards, state.activeRank);
  const recipientPlayerId = truthful ? input.playerId : challengedPlayerId;
  const recipientHand = state.handsByPlayer[recipientPlayerId] ?? [];
  const pileSize = state.pile.length;
  const resolution = {
    challengerPlayerId: input.playerId,
    challengedPlayerId,
    recipientPlayerId,
    truthful,
    revealedCards: state.lastPlay.cards,
    pileSize,
    resolvedAt: context.now
  };
  const clearedSelections = clearPrivateSelections(state);
  const challengedName = playerName(challengedPlayerId, context);
  const challengerName = playerName(input.playerId, context);
  const text = bullshitText[context.language];
  const nextState: BullshitState = {
    ...state,
    ...clearedSelections,
    currentTurnPlayerId: recipientPlayerId,
    handsByPlayer: {
      ...state.handsByPlayer,
      [recipientPlayerId]: sortCards([...recipientHand, ...state.pile])
    },
    activeRank: null,
    pile: [],
    lastPlay: null,
    passedPlayerIds: [],
    pendingWinnerPlayerId: null,
    lastResolution: resolution,
    updatedAt: context.now,
    message: truthful
      ? text.honestChecked(challengedName, challengerName, pileSize)
      : text.liarCaught(challengedName, challengerName, pileSize)
  };

  if (truthful && state.pendingWinnerPlayerId === challengedPlayerId) {
    return finishWithWinner(
      nextState,
      challengedPlayerId,
      context.now,
      context.language,
      challengedName
    );
  }

  return nextState;
}

function buildScore(state: BullshitState): ScoreEntry[] {
  return state.winnerPlayerId
    ? [{ playerId: state.winnerPlayerId, delta: 1, reason: "Bullshit win" }]
    : [];
}

export const serverGame: ServerGame<
  BullshitState,
  BullshitInput,
  BullshitPublicState | BullshitControllerState
> = {
  manifest: bullshitManifest,
  createInitialState(context) {
    const turnOrder = rotateToRandomLeader(context.players.map((player) => player.id));
    const privateMaps = createPrivateMaps(turnOrder);
    const handsByPlayer = dealDeck(turnOrder, shuffle(createStandardDeck()));
    const currentTurnPlayerId = turnOrder[0] ?? null;
    const text = bullshitText[context.language];

    return {
      ...createBaseRoundState("round_intro", context.now, {
        durationMs: roundPhaseDurations.roundIntroMs,
        message: text.preparing
      }),
      turnOrder,
      currentTurnPlayerId,
      ...privateMaps,
      handsByPlayer,
      activeRank: null,
      pile: [],
      lastPlay: null,
      passedPlayerIds: [],
      pendingWinnerPlayerId: null,
      winnerPlayerId: null,
      lastResolution: null
    };
  },
  startRound(state, context) {
    const currentName = state.currentTurnPlayerId ? playerName(state.currentTurnPlayerId, context) : null;
    return {
      ...state,
      phase: "playing",
      startedAt: context.now,
      phaseStartedAt: context.now,
      phaseEndsAt: null,
      updatedAt: context.now,
      message: currentName
        ? bullshitText[context.language].starts(currentName)
        : bullshitText[context.language].noPlayers
    };
  },
  handleInput(state, input, context) {
    if (
      state.phase !== "playing" ||
      state.winnerPlayerId ||
      !input ||
      typeof input !== "object" ||
      typeof input.playerId !== "string" ||
      input.playerId !== state.currentTurnPlayerId ||
      !state.turnOrder.includes(input.playerId)
    ) {
      return state;
    }

    if (state.pendingWinnerPlayerId === state.currentTurnPlayerId) {
      return finishWithWinner(
        state,
        state.pendingWinnerPlayerId,
        context.now,
        context.language,
        playerName(state.pendingWinnerPlayerId, context)
      );
    }

    switch (input.type) {
      case "toggle_card":
        return handleToggleCard(state, input, context.now);
      case "select_rank":
        return handleSelectRank(state, input, context.now);
      case "play_selected":
        return handlePlaySelected(state, input, context);
      case "pass":
        return handlePass(state, input, context);
      case "check":
        return handleCheck(state, input, context);
      default:
        return state;
    }
  },
  isRoundFinished(state) {
    return state.winnerPlayerId !== null;
  },
  buildScore(state) {
    return buildScore(state);
  },
  toPublicState(state, context) {
    return buildPublicState(state, context);
  },
  toControllerStateForPlayer(state, context, playerId) {
    const publicState = buildPublicState(state, context);
    const selectedCardIds = (state.selectedCardIdsByPlayer[playerId] ?? []).filter((cardId) =>
      (state.handsByPlayer[playerId] ?? []).some((card) => card.id === cardId)
    );
    const selectedRank = state.selectedRankByPlayer[playerId] ?? null;
    const isCurrentTurn = state.currentTurnPlayerId === playerId && state.winnerPlayerId === null;
    const passUsed = state.passedPlayerIds.includes(playerId);

    return {
      ...publicState,
      ownHand: state.handsByPlayer[playerId] ?? [],
      selectedCardIds,
      selectedRank,
      isCurrentTurn,
      canPlay: isCurrentTurn && selectedCardIds.length > 0 && Boolean(state.activeRank ?? selectedRank),
      canCheck: isCurrentTurn && Boolean(state.lastPlay && state.lastPlay.playerId !== playerId),
      canPass: isCurrentTurn && Boolean(state.lastPlay) && !passUsed,
      passUsed
    };
  }
};

export { createStandardDeck, isTruthfulBatch, sortCards } from "./cards.js";
