import { describe, expect, it } from "vitest";
import type { ServerGameContext } from "@open-party-lab/game-core";
import { rouletteManifest } from "../src/manifest.js";
import type { RouletteShell, RouletteState } from "../src/protocol.js";
import {
  createRouletteLoad,
  rouletteLiveShellCount,
  rouletteMaxHealth,
  rouletteShellCount,
  serverGame
} from "../src/server/index.js";

function context(now = 1_000, roundNumber = 1): ServerGameContext {
  return {
    roomCode: "TEST",
    roundNumber,
    now,
    deltaMs: 0,
    language: "zh-CN",
    selectedGame: rouletteManifest,
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
      }
    ]
  };
}

function playingState(
  shells: RouletteShell[],
  overrides: Partial<RouletteState> = {}
): RouletteState {
  const initialContext = context();
  const initial = serverGame.createInitialState(initialContext);
  const started = serverGame.startRound(initial, initialContext);

  return {
    ...started,
    shells,
    liveShellsRemaining: shells.filter((shell) => shell === "live").length,
    blankShellsRemaining: shells.filter((shell) => shell === "blank").length,
    nextActionAt: 0,
    ...overrides
  };
}

function fire(
  state: RouletteState,
  playerId: string,
  target: "self" | "rival",
  now = 2_000
): RouletteState {
  return serverGame.handleInput(
    state,
    {
      type: "fire",
      playerId,
      target,
      sentAt: now
    },
    context(now)
  );
}

describe("roulette server game", () => {
  it("builds a six-shell hidden load with two live shells", () => {
    const shells = createRouletteLoad(() => 0.42);

    expect(shells).toHaveLength(rouletteShellCount);
    expect(shells.filter((shell) => shell === "live")).toHaveLength(
      rouletteLiveShellCount
    );
    expect(shells.filter((shell) => shell === "blank")).toHaveLength(
      rouletteShellCount - rouletteLiveShellCount
    );
  });

  it("alternates the starting player between rounds", () => {
    const firstRound = serverGame.createInitialState(context(1_000, 1));
    const secondRound = serverGame.createInitialState(context(1_000, 2));

    expect(firstRound.playerOrder[firstRound.currentPlayerIndex]).toBe("p1");
    expect(secondRound.playerOrder[secondRound.currentPlayerIndex]).toBe("p2");
  });

  it("ignores input from a player who does not own the turn", () => {
    const state = playingState(["live", "blank"]);

    expect(fire(state, "p2", "rival")).toBe(state);
  });

  it("keeps the turn after a self-targeted blank", () => {
    const state = playingState(["blank", "live"]);
    const next = fire(state, "p1", "self");

    expect(next.currentPlayerIndex).toBe(state.currentPlayerIndex);
    expect(next.healthByPlayer.p1).toBe(rouletteMaxHealth);
    expect(next.lastShot).toMatchObject({
      shooterPlayerId: "p1",
      targetPlayerId: "p1",
      target: "self",
      shell: "blank"
    });
  });

  it("damages the rival and passes the turn after a live shell", () => {
    const state = playingState(["live", "blank"]);
    const next = fire(state, "p1", "rival");

    expect(next.healthByPlayer.p2).toBe(rouletteMaxHealth - 1);
    expect(next.playerOrder[next.currentPlayerIndex]).toBe("p2");
    expect(next.lastShot?.shell).toBe("live");
  });

  it("resolves the duel and awards the survivor", () => {
    const state = playingState(["live"], {
      healthByPlayer: { p1: rouletteMaxHealth, p2: 1 }
    });
    const resolved = fire(state, "p1", "rival");

    expect(resolved.stage).toBe("resolved");
    expect(resolved.winnerPlayerId).toBe("p1");
    expect(serverGame.isRoundFinished(resolved, context(2_000))).toBe(true);
    expect(serverGame.buildScore(resolved, context(2_000))).toEqual([
      {
        playerId: "p1",
        delta: 2,
        reason: "Roulette duel victory"
      }
    ]);
  });

  it("never exposes the hidden shell order to host or controllers", () => {
    const state = playingState(["live", "blank", "blank"]);
    const publicState = serverGame.toPublicState?.(state, context());
    const currentControllerState = serverGame.toControllerStateForPlayer?.(
      state,
      context(),
      "p1"
    );
    const waitingControllerState = serverGame.toControllerStateForPlayer?.(
      state,
      context(),
      "p2"
    );

    expect(publicState).not.toHaveProperty("shells");
    expect(currentControllerState).not.toHaveProperty("shells");
    expect(currentControllerState).toMatchObject({
      playerId: "p1",
      isCurrentPlayer: true,
      canAct: true
    });
    expect(waitingControllerState).toMatchObject({
      playerId: "p2",
      isCurrentPlayer: false,
      canAct: false
    });
  });
});
