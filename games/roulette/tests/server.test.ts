import { describe, expect, it } from "vitest";
import type { ServerGameContext } from "@open-party-lab/game-core";
import { rouletteManifest } from "../src/manifest.js";
import type {
  RouletteItem,
  RouletteShell,
  RouletteState
} from "../src/protocol.js";
import {
  createRouletteLoad,
  rouletteDuelWinsRequired,
  rouletteIntermissionMs,
  rouletteInventoryCapacity,
  rouletteMaxHealth,
  rouletteMaxShellCount,
  rouletteMinShellCount,
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
    inventoryByPlayer: { p1: [], p2: [] },
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
    { type: "fire", playerId, target, sentAt: now },
    context(now)
  );
}

function useItem(
  state: RouletteState,
  playerId: string,
  item: RouletteItem,
  now = 2_000
): RouletteState {
  return serverGame.handleInput(
    state,
    { type: "use_item", playerId, item, sentAt: now },
    context(now)
  );
}

describe("roulette load", () => {
  it("creates balanced hidden loads between two and eight charges", () => {
    for (let sample = 0; sample < 200; sample += 1) {
      const shells = createRouletteLoad();
      const live = shells.filter((shell) => shell === "live").length;
      const blank = shells.filter((shell) => shell === "blank").length;

      expect(shells.length).toBeGreaterThanOrEqual(rouletteMinShellCount);
      expect(shells.length).toBeLessThanOrEqual(rouletteMaxShellCount);
      expect(live).toBeGreaterThan(0);
      expect(blank).toBeGreaterThan(0);
      expect(Math.abs(live - blank)).toBeLessThanOrEqual(1);
    }
  });

  it("caps reload rewards at eight tools", () => {
    const fullInventory = Array.from(
      { length: rouletteInventoryCapacity },
      () => "lens" as const
    );
    const state = playingState(["blank"], {
      inventoryByPlayer: { p1: fullInventory, p2: fullInventory }
    });
    const next = fire(state, "p1", "self");

    expect(next.reloadNumber).toBe(state.reloadNumber + 1);
    expect(next.inventoryByPlayer.p1).toHaveLength(rouletteInventoryCapacity);
    expect(next.inventoryByPlayer.p2).toHaveLength(rouletteInventoryCapacity);
  });
});

describe("roulette turns", () => {
  it("alternates the starting player between platform rounds", () => {
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
      shell: "blank",
      damage: 0
    });
  });

  it("damages the rival and passes the turn after a live charge", () => {
    const state = playingState(["live", "blank"]);
    const next = fire(state, "p1", "rival");

    expect(next.healthByPlayer.p2).toBe(rouletteMaxHealth - 1);
    expect(next.playerOrder[next.currentPlayerIndex]).toBe("p2");
    expect(next.lastShot?.shell).toBe("live");
  });

  it("uses a restraint to skip the rival's next turn", () => {
    const armed = playingState(["blank", "live"], {
      inventoryByPlayer: { p1: ["restraint"], p2: [] }
    });
    const restrained = useItem(armed, "p1", "restraint");
    const next = fire(restrained, "p1", "rival");

    expect(next.playerOrder[next.currentPlayerIndex]).toBe("p1");
    expect(next.skipNextTurnByPlayer.p2).toBe(false);
    expect(next.message).toContain("跳过");
  });
});

describe("roulette tactical tools", () => {
  it("heals only below the duel maximum", () => {
    const full = playingState(["live", "blank"], {
      inventoryByPlayer: { p1: ["field_dress"], p2: [] }
    });
    expect(useItem(full, "p1", "field_dress")).toBe(full);

    const wounded = {
      ...full,
      healthByPlayer: { p1: 2, p2: rouletteMaxHealth }
    };
    const healed = useItem(wounded, "p1", "field_dress");
    expect(healed.healthByPlayer.p1).toBe(rouletteMaxHealth);
    expect(healed.inventoryByPlayer.p1).toEqual([]);
  });

  it("reveals a lens result only to its owner", () => {
    const state = playingState(["live", "blank"], {
      inventoryByPlayer: { p1: ["lens"], p2: [] }
    });
    const inspected = useItem(state, "p1", "lens");
    const publicState = serverGame.toPublicState?.(inspected, context());
    const ownerState = serverGame.toControllerStateForPlayer?.(
      inspected,
      context(),
      "p1"
    );
    const rivalState = serverGame.toControllerStateForPlayer?.(
      inspected,
      context(),
      "p2"
    );

    expect(publicState).not.toHaveProperty("shells");
    expect(publicState).not.toHaveProperty("inventoryByPlayer");
    expect(publicState).not.toHaveProperty("knownCurrentShellByPlayer");
    expect(publicState).toMatchObject({
      visibleToolsByPlayer: { p1: [], p2: [] }
    });
    expect(ownerState).toMatchObject({ knownCurrentShell: "live" });
    expect(rivalState).toMatchObject({ knownCurrentShell: null });
    expect(ownerState?.lastEvent).not.toHaveProperty("revealedShell");
  });

  it("shows both tool racks while keeping charge knowledge private", () => {
    const state = playingState(["blank", "live"], {
      inventoryByPlayer: {
        p1: ["lens", "overcharge"],
        p2: ["restraint"]
      },
      knownCurrentShellByPlayer: { p1: "blank", p2: null }
    });
    const publicState = serverGame.toPublicState?.(state, context());

    expect(publicState).toMatchObject({
      visibleToolsByPlayer: {
        p1: ["lens", "overcharge"],
        p2: ["restraint"]
      }
    });
    expect(publicState).not.toHaveProperty("knownCurrentShellByPlayer");
  });

  it("flips a known current charge without leaking it publicly", () => {
    const state = playingState(["live", "blank"], {
      inventoryByPlayer: { p1: ["inverter"], p2: [] },
      knownCurrentShellByPlayer: { p1: "live", p2: "live" }
    });
    const inverted = useItem(state, "p1", "inverter");

    expect(inverted.shells[0]).toBe("blank");
    expect(inverted.knownCurrentShellByPlayer.p1).toBe("blank");
    expect(inverted.knownCurrentShellByPlayer.p2).toBe("blank");
    expect(serverGame.toPublicState?.(inverted, context())).not.toHaveProperty(
      "knownCurrentShellByPlayer"
    );
  });

  it("publicly extracts a charge, reloads an empty device, and clears overcharge", () => {
    const state = playingState(["live"], {
      inventoryByPlayer: { p1: ["extractor"], p2: [] },
      damageMultiplierByPlayer: { p1: 2, p2: 1 }
    });
    const extracted = useItem(state, "p1", "extractor");

    expect(extracted.reloadNumber).toBe(state.reloadNumber + 1);
    expect(extracted.shells.length).toBeGreaterThanOrEqual(rouletteMinShellCount);
    expect(extracted.damageMultiplierByPlayer.p1).toBe(1);
    expect(extracted.lastEvent).toMatchObject({
      kind: "item",
      item: "extractor",
      revealedShell: "live"
    });
  });

  it("deals double live damage once and consumes the boost", () => {
    const state = playingState(["live", "blank"], {
      inventoryByPlayer: { p1: ["overcharge"], p2: [] }
    });
    const boosted = useItem(state, "p1", "overcharge");
    const next = fire(boosted, "p1", "rival");

    expect(next.healthByPlayer.p2).toBe(1);
    expect(next.lastShot?.damage).toBe(2);
    expect(next.damageMultiplierByPlayer.p1).toBe(1);
  });
});

describe("roulette match", () => {
  it("can rebroadcast an unchanged state when a host scene requests hydration", () => {
    const state = playingState(["blank", "live"]);
    const result = serverGame.handleHostAction?.(
      state,
      { type: "request_host_sync" },
      context()
    );

    expect(result?.state).toEqual(state);
    expect(result?.state).not.toBe(state);
    expect(serverGame.handleHostAction?.(state, { type: "unknown" }, context())).toBeNull();
  });

  it("starts a stronger second duel after the intermission", () => {
    const state = playingState(["live"], {
      healthByPlayer: { p1: rouletteMaxHealth, p2: 1 }
    });
    const intermission = fire(state, "p1", "rival", 2_000);

    expect(intermission.stage).toBe("intermission");
    expect(intermission.duelWinsByPlayer.p1).toBe(1);
    expect(serverGame.isRoundFinished(intermission, context(2_000))).toBe(false);

    const nextDuel = serverGame.tick(
      intermission,
      rouletteIntermissionMs,
      context(2_000 + rouletteIntermissionMs)
    );
    expect(nextDuel.stage).toBe("duel");
    expect(nextDuel.duelNumber).toBe(2);
    expect(nextDuel.maxHealth).toBe(4);
    expect(nextDuel.healthByPlayer).toEqual({ p1: 4, p2: 4 });
    expect(nextDuel.inventoryByPlayer.p1).toHaveLength(2);
    expect(nextDuel.duelWinsByPlayer.p1).toBe(1);
  });

  it("resolves the match on the second duel win and awards three points", () => {
    const state = playingState(["live"], {
      healthByPlayer: { p1: rouletteMaxHealth, p2: 1 },
      duelNumber: 2,
      duelWinsByPlayer: { p1: rouletteDuelWinsRequired - 1, p2: 0 }
    });
    const resolved = fire(state, "p1", "rival");

    expect(resolved.stage).toBe("resolved");
    expect(resolved.winnerPlayerId).toBe("p1");
    expect(serverGame.isRoundFinished(resolved, context(2_000))).toBe(true);
    expect(serverGame.buildScore(resolved, context(2_000))).toEqual([
      { playerId: "p1", delta: 3, reason: "Fate match victory" }
    ]);
  });
});
