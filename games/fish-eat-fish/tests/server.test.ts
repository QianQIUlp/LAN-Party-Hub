import { describe, expect, it } from "vitest";
import type { ServerGameContext } from "@open-party-lab/game-core";
import { fishEatFishManifest } from "../src/manifest.js";
import type { FishEatFishState } from "../src/protocol.js";
import { serverGame } from "../src/server/index.js";
import { createFishWorld, createPlayers, rankPoints, ROUND_TIME_MS } from "../src/server/simulation.js";

function context(now = 1_000, roundNumber = 1, playerIds = ["p1", "p2"]): ServerGameContext {
  return {
    roomCode: "TEST",
    roundNumber,
    now,
    deltaMs: 0,
    language: "zh-CN",
    selectedGame: fishEatFishManifest,
    previousRound: null,
    roomSettings: {},
    players: playerIds.map((id, index) => ({
      id,
      name: `玩家${index + 1}`,
      color: "#ffffff",
      score: 0,
      isReady: true,
      connected: true
    }))
  };
}

function playingState(overrides: Partial<FishEatFishState> = {}, playerIds = ["p1", "p2"]): FishEatFishState {
  const initialContext = context(1_000, 1, playerIds);
  const initial = serverGame.createInitialState(initialContext);
  return {
    ...serverGame.startRound(initial, initialContext),
    ...overrides
  };
}

function moveInput(playerId: string, moveX: number, moveY: number) {
  return { type: "move" as const, playerId, sentAt: 1_000, moveX, moveY };
}

describe("fish-eat-fish server", () => {
  it("supports a single player", () => {
    const state = playingState({}, ["p1"]);
    expect(Object.keys(state.players)).toEqual(["p1"]);
    expect(fishEatFishManifest.minPlayers).toBe(1);
  });

  it("starts a round in playing phase with full fish world", () => {
    const state = playingState();
    expect(state.phase).toBe("playing");
    expect(state.timeLeftMs).toBe(ROUND_TIME_MS);
    expect(state.finishAt).toBe(null);
    expect(state.fish.length).toBeGreaterThan(10);
    expect(state.players.p1).toBeDefined();
    expect(state.players.p2).toBeDefined();
  });

  it("applies joystick input as normalized direction", () => {
    const state = playingState();
    const next = serverGame.handleInput(state, moveInput("p1", 3, 4), context()) as FishEatFishState;
    expect(next.players.p1.inputX).toBeCloseTo(0.6);
    expect(next.players.p1.inputY).toBeCloseTo(0.8);
  });

  it("ignores unknown players and repeated directions", () => {
    const state = playingState();
    const unknown = serverGame.handleInput(state, moveInput("ghost", 1, 0), context());
    expect(unknown).toBe(state);
    const applied = serverGame.handleInput(state, moveInput("p1", 1, 0), context()) as FishEatFishState;
    const repeated = serverGame.handleInput(applied, moveInput("p1", 1, 0), context());
    expect(repeated).toBe(applied);
  });

  it("moves players and fish on tick", () => {
    const state = playingState();
    const moved = serverGame.handleInput(state, moveInput("p1", 1, 0), context()) as FishEatFishState;
    const ticked = serverGame.tick(moved, 100, context()) as FishEatFishState;
    expect(ticked).not.toBe(moved);
    expect(ticked.players.p1.x).toBeGreaterThan(moved.players.p1.x);
    expect(ticked.timeLeftMs).toBe(ROUND_TIME_MS - 100);
  });

  it("ends the round with rankings and score after the timer", () => {
    const state = playingState();
    state.players.p1.radius = 40;
    state.players.p2.radius = 24;
    const ticked = serverGame.tick(state, ROUND_TIME_MS, context()) as FishEatFishState;
    expect(ticked.phase).toBe("locked");
    expect(ticked.rankings).toBeDefined();
    expect(ticked.rankings?.[0]?.playerId).toBe("p1");
    expect(ticked.winnerPlayerId).toBe("p1");
    const scores = serverGame.buildScore(ticked);
    expect(scores).toEqual([
      { playerId: "p1", delta: 5, reason: "Size rank 1" },
      { playerId: "p2", delta: 3, reason: "Size rank 2" }
    ]);
  });

  it("gives no score when nobody grew", () => {
    const state = playingState();
    const ticked = serverGame.tick(state, ROUND_TIME_MS, context()) as FishEatFishState;
    expect(ticked.phase).toBe("locked");
    expect(ticked.winnerPlayerId).toBeUndefined();
    expect(serverGame.buildScore(ticked)).toEqual([]);
  });

  it("supports three and four player rankings", () => {
    const four = ["p1", "p2", "p3", "p4"];
    const state = playingState({}, four);
    state.players.p1.radius = 40;
    state.players.p2.radius = 24;
    state.players.p3.radius = 55;
    state.players.p4.radius = 20;
    const ticked = serverGame.tick(state, ROUND_TIME_MS, context(1_000, 1, four)) as FishEatFishState;
    expect(ticked.rankings?.map((entry) => entry.playerId)).toEqual(["p3", "p1", "p2", "p4"]);
    const scores = serverGame.buildScore(ticked);
    expect(scores.map((entry) => entry.delta)).toEqual([5, 3, 2, 1]);
  });

  it("ships a stable rank point table", () => {
    expect([1, 2, 3, 4, 5].map(rankPoints)).toEqual([5, 3, 2, 1, 1]);
  });

  it("builds a full fish world with all species present", () => {
    const world = createFishWorld(1);
    const keys = new Set(world.fish.map((fish) => fish.key));
    expect(keys.size).toBe(6);
  });

  it("creates players at spread spawn points", () => {
    const players = createPlayers(["p1", "p2", "p3", "p4"]);
    const xPositions = new Set(Object.values(players).map((player) => player.x));
    expect(xPositions.size).toBeGreaterThan(1);
  });
});
