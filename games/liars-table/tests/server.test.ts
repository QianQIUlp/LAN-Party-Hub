import { describe, expect, it } from "vitest";
import type { ServerGameContext } from "@open-party-lab/game-core";
import { liarsTableManifest } from "../src/manifest.js";
import type { LiarsCard, LiarsTableState } from "../src/protocol.js";
import {
  createLiarsDeck,
  liarsClaimRanks,
  liarsTableHandSize,
  liarsTableMaxHealth,
  liarsTableRevealDurationMs,
  serverGame
} from "../src/server/index.js";

function context(now = 1_000, roundNumber = 1): ServerGameContext {
  return {
    roomCode: "TEST",
    roundNumber,
    now,
    deltaMs: 0,
    language: "zh-CN",
    selectedGame: liarsTableManifest,
    previousRound: null,
    roomSettings: {},
    players: [
      {
        id: "p1",
        name: "甲",
        color: "#ef4444",
        score: 0,
        isReady: true,
        connected: true
      },
      {
        id: "p2",
        name: "乙",
        color: "#3b82f6",
        score: 0,
        isReady: true,
        connected: true
      },
      {
        id: "p3",
        name: "丙",
        color: "#22c55e",
        score: 0,
        isReady: true,
        connected: true
      }
    ]
  };
}

function card(id: string, rank: LiarsCard["rank"]): LiarsCard {
  return { id, rank };
}

function playingState(overrides: Partial<LiarsTableState> = {}): LiarsTableState {
  const initialContext = context();
  const initial = serverGame.createInitialState(initialContext);
  const started = serverGame.startRound(initial, initialContext);

  return {
    ...started,
    tableRank: "crown",
    currentPlayerId: "p1",
    handsByPlayer: {
      p1: [card("p1-moon", "moon")],
      p2: [card("p2-crown", "crown")],
      p3: [card("p3-key", "key")]
    },
    dangerIndexByPlayer: { p1: 0, p2: 3, p3: 2 },
    chamberStepByPlayer: { p1: 0, p2: 0, p3: 0 },
    ...overrides
  };
}

function play(
  state: LiarsTableState,
  playerId: string,
  cardId: string,
  now = 2_000
): LiarsTableState {
  return serverGame.handleInput(
    state,
    {
      type: "play_card",
      playerId,
      cardId,
      sentAt: now
    },
    context(now)
  );
}

function challenge(
  state: LiarsTableState,
  playerId: string,
  now = 3_000
): LiarsTableState {
  return serverGame.handleInput(
    state,
    {
      type: "challenge",
      playerId,
      sentAt: now
    },
    context(now)
  );
}

describe("liars table server game", () => {
  it("builds a unique 24-card deck with three wilds", () => {
    const deck = createLiarsDeck(() => 0.42);

    expect(deck).toHaveLength(24);
    expect(new Set(deck.map((entry) => entry.id)).size).toBe(24);
    expect(deck.filter((entry) => entry.rank === "wild")).toHaveLength(3);
    for (const rank of liarsClaimRanks) {
      expect(deck.filter((entry) => entry.rank === rank)).toHaveLength(7);
    }
  });

  it("deals four private cards to every player", () => {
    const state = serverGame.createInitialState(context());

    expect(state.playerOrder).toHaveLength(3);
    for (const playerId of state.playerOrder) {
      expect(state.handsByPlayer[playerId]).toHaveLength(liarsTableHandSize);
    }
    expect(Object.values(state.healthByPlayer)).toEqual([
      liarsTableMaxHealth,
      liarsTableMaxHealth,
      liarsTableMaxHealth
    ]);
  });

  it("rejects actions from the wrong player and cards outside the hand", () => {
    const state = playingState();

    expect(play(state, "p2", "p2-crown")).toBe(state);
    expect(play(state, "p1", "forged-card")).toBe(state);
  });

  it("plays a card face down and hides its rank from public state", () => {
    const state = playingState();
    const played = play(state, "p1", "p1-moon");
    const visible = serverGame.toPublicState?.(played, context(2_000));

    expect(played.currentPlayerId).toBe("p2");
    expect(played.handsByPlayer.p1).toHaveLength(0);
    expect(played.lastPlay?.card.rank).toBe("moon");
    expect(visible?.lastPlay).toEqual({
      playerId: "p1",
      cardCount: 1,
      playedAt: 2_000
    });
    expect(visible).not.toHaveProperty("handsByPlayer");
  });

  it("punishes the liar when a false claim is challenged", () => {
    const played = play(playingState(), "p1", "p1-moon");
    const revealed = challenge(played, "p2");

    expect(revealed.stage).toBe("reveal");
    expect(revealed.lastReveal).toMatchObject({
      accusedPlayerId: "p1",
      challengerPlayerId: "p2",
      loserPlayerId: "p1",
      truthful: false,
      chamberResult: "live",
      lifeLost: true
    });
    expect(revealed.healthByPlayer.p1).toBe(liarsTableMaxHealth - 1);
  });

  it("punishes a failed challenger and advances a blank chamber", () => {
    const state = playingState({
      handsByPlayer: {
        p1: [card("p1-crown", "crown")],
        p2: [card("p2-moon", "moon")],
        p3: [card("p3-key", "key")]
      }
    });
    const played = play(state, "p1", "p1-crown");
    const revealed = challenge(played, "p2");

    expect(revealed.lastReveal).toMatchObject({
      loserPlayerId: "p2",
      truthful: true,
      chamberResult: "blank",
      lifeLost: false
    });
    expect(revealed.healthByPlayer.p2).toBe(liarsTableMaxHealth);
    expect(revealed.chamberStepByPlayer.p2).toBe(1);
  });

  it("deals a new hand only after the reveal window", () => {
    const played = play(playingState(), "p1", "p1-moon");
    const revealed = challenge(played, "p2");
    const tooEarly = serverGame.tick?.(
      revealed,
      0,
      context(3_000 + liarsTableRevealDurationMs - 1)
    );
    const nextHand = serverGame.tick?.(
      revealed,
      0,
      context(3_000 + liarsTableRevealDurationMs)
    );

    expect(tooEarly).toBe(revealed);
    expect(nextHand?.stage).toBe("turn");
    expect(nextHand?.handNumber).toBe(2);
    expect(nextHand?.lastPlay).toBeUndefined();
    for (const playerId of nextHand?.activePlayerIds ?? []) {
      expect(nextHand?.handsByPlayer[playerId]).toHaveLength(liarsTableHandSize);
    }
  });

  it("resolves when only one player survives and exposes only each controller's hand", () => {
    const state = playingState({
      activePlayerIds: ["p1", "p2"],
      healthByPlayer: { p1: 1, p2: 2, p3: 0 },
      handsByPlayer: {
        p1: [card("p1-moon", "moon")],
        p2: [card("p2-crown", "crown")],
        p3: []
      }
    });
    const p1Controller = serverGame.toControllerStateForPlayer?.(
      state,
      context(),
      "p1"
    );
    const p2Controller = serverGame.toControllerStateForPlayer?.(
      state,
      context(),
      "p2"
    );

    expect(p1Controller?.ownHand).toEqual([card("p1-moon", "moon")]);
    expect(p2Controller?.ownHand).toEqual([card("p2-crown", "crown")]);
    expect(p1Controller).not.toHaveProperty("handsByPlayer");

    const played = play(state, "p1", "p1-moon");
    const revealed = challenge(played, "p2");
    const resolved = serverGame.tick?.(
      revealed,
      0,
      context(3_000 + liarsTableRevealDurationMs)
    );

    expect(resolved?.stage).toBe("resolved");
    expect(resolved?.winnerPlayerId).toBe("p2");
    expect(serverGame.isRoundFinished(resolved as LiarsTableState, context())).toBe(true);
    expect(serverGame.buildScore(resolved as LiarsTableState, context())).toEqual([
      {
        playerId: "p2",
        delta: 3,
        reason: "Liars Table victory"
      }
    ]);
  });
});
