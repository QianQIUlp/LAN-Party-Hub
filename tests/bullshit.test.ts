import {
  createBaseRoundState,
  type ServerGameContext
} from "@open-party-lab/game-core";
import { describe, expect, it } from "vitest";
import { bullshitManifest } from "../games/bullshit/src/manifest.js";
import type {
  BullshitCard,
  BullshitInput,
  BullshitRank,
  BullshitState,
  BullshitSuit
} from "../games/bullshit/src/protocol.js";
import {
  createStandardDeck,
  dealDeck,
  serverGame
} from "../games/bullshit/src/server/index.js";

const players = [
  { id: "p1", name: "甲", color: "#f00", score: 0, isReady: true, connected: true },
  { id: "p2", name: "乙", color: "#0f0", score: 0, isReady: true, connected: true },
  { id: "p3", name: "丙", color: "#00f", score: 0, isReady: true, connected: true }
];

function context(now = 1_000): ServerGameContext {
  return {
    roomCode: "TEST",
    roundNumber: 1,
    players,
    now,
    deltaMs: 0,
    language: "zh-CN",
    selectedGame: bullshitManifest,
    previousRound: null,
    roomSettings: {}
  };
}

function card(rank: BullshitRank, suit: BullshitSuit): BullshitCard {
  return { id: `${suit}-${rank}`, rank, suit };
}

function playingState(hands: Record<string, BullshitCard[]>): BullshitState {
  return {
    ...createBaseRoundState("playing", 1_000, { startedAt: 1_000 }),
    turnOrder: ["p1", "p2", "p3"],
    currentTurnPlayerId: "p1",
    handsByPlayer: {
      p1: hands.p1 ?? [],
      p2: hands.p2 ?? [],
      p3: hands.p3 ?? []
    },
    selectedCardIdsByPlayer: { p1: [], p2: [], p3: [] },
    selectedRankByPlayer: { p1: null, p2: null, p3: null },
    activeRank: null,
    pile: [],
    lastPlay: null,
    passedPlayerIds: [],
    pendingWinnerPlayerId: null,
    winnerPlayerId: null,
    lastResolution: null
  };
}

type BullshitInputWithoutMeta = BullshitInput extends infer T
  ? T extends BullshitInput
    ? Omit<T, "playerId" | "sentAt">
    : never
  : never;

function act(
  state: BullshitState,
  playerId: string,
  input: BullshitInputWithoutMeta,
  now: number
): BullshitState {
  return serverGame.handleInput(
    state,
    { ...input, playerId, sentAt: now } as BullshitInput,
    context(now)
  );
}

function selectAndPlay(
  state: BullshitState,
  playerId: string,
  cardIds: string[],
  now: number,
  rank?: BullshitRank
): BullshitState {
  let next = state;
  if (rank) {
    next = act(next, playerId, { type: "select_rank", rank }, now);
  }
  for (const cardId of cardIds) {
    next = act(next, playerId, { type: "toggle_card", cardId }, now);
  }
  return act(next, playerId, { type: "play_selected" }, now);
}

describe("Bullshit authoritative rules", () => {
  it("builds and deals a unique 52-card deck without jokers", () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((entry) => entry.id))).toHaveLength(52);
    expect(new Set(deck.map((entry) => entry.rank))).toHaveLength(13);

    const fourHands = dealDeck(["p1", "p2", "p3", "p4"], deck);
    expect(Object.values(fourHands).map((hand) => hand.length)).toEqual([13, 13, 13, 13]);

    const threeHands = dealDeck(["p1", "p2", "p3"], deck);
    expect(Object.values(threeHands).map((hand) => hand.length)).toEqual([18, 17, 17]);
  });

  it("checks only the latest batch and gives the whole pile to a wrong challenger", () => {
    const ace = card("A", "spades");
    const spareOne = card("2", "clubs");
    const king = card("K", "hearts");
    const spareTwo = card("4", "diamonds");
    const thirdCard = card("3", "clubs");
    let state = playingState({
      p1: [ace, spareOne],
      p2: [king, spareTwo],
      p3: [thirdCard]
    });

    state = selectAndPlay(state, "p1", [ace.id], 1_010, "K");
    state = selectAndPlay(state, "p2", [king.id], 1_020);
    state = act(state, "p3", { type: "check" }, 1_030);

    expect(state.lastResolution).toMatchObject({
      challengerPlayerId: "p3",
      challengedPlayerId: "p2",
      recipientPlayerId: "p3",
      truthful: true,
      pileSize: 2
    });
    expect(state.lastResolution?.revealedCards.map((entry) => entry.id)).toEqual([king.id]);
    expect(state.handsByPlayer.p3.map((entry) => entry.id)).toEqual(expect.arrayContaining([thirdCard.id, ace.id, king.id]));
    expect(state.currentTurnPlayerId).toBe("p3");
    expect(state.activeRank).toBeNull();
    expect(state.pile).toEqual([]);
  });

  it("makes a caught liar take the pile and lead the next pile", () => {
    const fakeKing = card("A", "spades");
    const spare = card("2", "clubs");
    let state = playingState({
      p1: [fakeKing, spare],
      p2: [card("K", "hearts")],
      p3: [card("3", "clubs")]
    });

    state = selectAndPlay(state, "p1", [fakeKing.id], 1_010, "K");
    state = act(state, "p2", { type: "check" }, 1_020);

    expect(state.lastResolution).toMatchObject({
      recipientPlayerId: "p1",
      truthful: false,
      pileSize: 1
    });
    expect(state.handsByPlayer.p1.map((entry) => entry.id)).toEqual(expect.arrayContaining([fakeKing.id, spare.id]));
    expect(state.currentTurnPlayerId).toBe("p1");
    expect(state.winnerPlayerId).toBeNull();
  });

  it("allows one pass per player per active pile without changing the checked batch", () => {
    const king = card("K", "spades");
    let state = playingState({
      p1: [king, card("A", "clubs")],
      p2: [card("2", "hearts")],
      p3: [card("3", "diamonds")]
    });

    state = selectAndPlay(state, "p1", [king.id], 1_010, "K");
    state = act(state, "p2", { type: "pass" }, 1_020);
    state = act(state, "p3", { type: "pass" }, 1_030);
    state = act(state, "p1", { type: "pass" }, 1_040);
    const repeatedPass = act(state, "p2", { type: "pass" }, 1_050);

    expect(repeatedPass).toBe(state);
    expect(state.passedPlayerIds).toEqual(["p2", "p3", "p1"]);
    expect(state.lastPlay?.playerId).toBe("p1");
    expect(state.currentTurnPlayerId).toBe("p2");
  });

  it("keeps an empty hand pending until the final play survives", () => {
    const ace = card("A", "spades");
    let state = playingState({
      p1: [ace],
      p2: [card("2", "hearts")],
      p3: [card("3", "diamonds")]
    });

    state = selectAndPlay(state, "p1", [ace.id], 1_010, "A");
    expect(state.pendingWinnerPlayerId).toBe("p1");
    expect(state.winnerPlayerId).toBeNull();

    state = act(state, "p2", { type: "pass" }, 1_020);
    state = act(state, "p3", { type: "pass" }, 1_030);

    expect(state.winnerPlayerId).toBe("p1");
    expect(serverGame.isRoundFinished(state, context(1_030))).toBe(true);
  });

  it("does not confirm a pending winner from an invalid follow attempt", () => {
    const ace = card("A", "spades");
    let state = playingState({
      p1: [ace],
      p2: [card("2", "hearts")],
      p3: [card("3", "diamonds")]
    });

    state = selectAndPlay(state, "p1", [ace.id], 1_010, "A");
    const invalidFollow = act(state, "p2", { type: "play_selected" }, 1_020);

    expect(invalidFollow).toBe(state);
    expect(invalidFollow.pendingWinnerPlayerId).toBe("p1");
    expect(invalidFollow.winnerPlayerId).toBeNull();
  });

  it("awards a truthful final play after a check but cancels a lying final play", () => {
    const trueAce = card("A", "spades");
    let truthful = playingState({
      p1: [trueAce],
      p2: [card("2", "hearts")],
      p3: [card("3", "diamonds")]
    });
    truthful = selectAndPlay(truthful, "p1", [trueAce.id], 1_010, "A");
    truthful = act(truthful, "p2", { type: "check" }, 1_020);
    expect(truthful.winnerPlayerId).toBe("p1");
    expect(truthful.handsByPlayer.p2.map((entry) => entry.id)).toContain(trueAce.id);

    const fakeAce = card("K", "clubs");
    let lying = playingState({
      p1: [fakeAce],
      p2: [card("2", "hearts")],
      p3: [card("3", "diamonds")]
    });
    lying = selectAndPlay(lying, "p1", [fakeAce.id], 1_010, "A");
    lying = act(lying, "p2", { type: "check" }, 1_020);
    expect(lying.winnerPlayerId).toBeNull();
    expect(lying.pendingWinnerPlayerId).toBeNull();
    expect(lying.handsByPlayer.p1.map((entry) => entry.id)).toContain(fakeAce.id);
  });

  it("does not expose other hands or private selections", () => {
    const state = playingState({
      p1: [card("A", "spades")],
      p2: [card("K", "hearts")],
      p3: [card("3", "diamonds")]
    });
    state.selectedCardIdsByPlayer.p2 = ["hearts-K"];

    const publicState = serverGame.toPublicState?.(state, context());
    const controllerState = serverGame.toControllerStateForPlayer?.(state, context(), "p1");
    const publicJson = JSON.stringify(publicState);
    const controllerJson = JSON.stringify(controllerState);

    expect(publicJson).not.toContain("spades-A");
    expect(publicJson).not.toContain("hearts-K");
    expect(controllerJson).toContain("spades-A");
    expect(controllerJson).not.toContain("hearts-K");
  });

  it("ignores out-of-turn actions and cards not owned by the actor", () => {
    const state = playingState({
      p1: [card("A", "spades")],
      p2: [card("K", "hearts")],
      p3: [card("3", "diamonds")]
    });

    const outOfTurn = act(state, "p2", { type: "toggle_card", cardId: "hearts-K" }, 1_010);
    const foreignCard = act(state, "p1", { type: "toggle_card", cardId: "hearts-K" }, 1_020);

    expect(outOfTurn).toBe(state);
    expect(foreignCard).toBe(state);
  });
});
