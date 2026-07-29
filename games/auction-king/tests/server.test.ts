import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ServerGameContext } from "@open-party-lab/game-core";
import { auctionKingManifest } from "../src/manifest.js";
import type {
  AuctionKingInput,
  AuctionKingState
} from "../src/protocol.js";
import {
  auctionRoundThresholds,
  auctionStartingFunds,
  evaluateRoundWinner,
  serverGame
} from "../src/server/index.js";
import {
  auctionWarehouseHighBand,
  auctionWarehouseLowBand,
  auctionWarehouseLowBandWeight,
  auctionWarehouseMaxValue,
  auctionWarehouseMinValue,
  buildCandidates,
  chooseWarehouseTargetValue,
  createEmptyKnowledge,
  generateWarehouse,
  revealOutline,
  revealRarity
} from "../src/server/warehouse.js";
import {
  auctionCatalog,
  auctionInstruments,
  auctionRoles
} from "../src/server/content.js";

function context(now = 1_000, playerCount = 2): ServerGameContext {
  return {
    roomCode: "TEST",
    roundNumber: 1,
    now,
    deltaMs: 0,
    language: "zh-CN",
    selectedGame: auctionKingManifest,
    previousRound: null,
    roomSettings: {},
    players: Array.from({ length: playerCount }, (_, index) => ({
      id: `p${index + 1}`,
      name: `玩家${index + 1}`,
      color: ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#14b8a6"][index] ?? "#94a3b8",
      score: 0,
      isReady: true,
      connected: true
    }))
  };
}

function input(
  state: AuctionKingState,
  payload: Omit<AuctionKingInput, "playerId" | "sentAt"> & { playerId: string },
  now: number
): AuctionKingState {
  return serverGame.handleInput(
    state,
    { ...payload, sentAt: now } as AuctionKingInput,
    context(now, state.playerOrder.length)
  );
}

function configuredState(now = 2_000): AuctionKingState {
  let state = serverGame.startRound(
    serverGame.createInitialState(context(1_000)),
    context(1_000)
  );
  state = input(state, { type: "select_role", playerId: "p1", roleId: "spectrum_cartographer" }, now);
  state = input(state, { type: "select_kit", playerId: "p1", kitId: "survey" }, now + 1);
  state = input(state, { type: "confirm_setup", playerId: "p1" }, now + 2);
  state = input(state, { type: "select_role", playerId: "p2", roleId: "apex_hunter" }, now + 3);
  state = input(state, { type: "select_kit", playerId: "p2", kitId: "none" }, now + 4);
  state = input(state, { type: "confirm_setup", playerId: "p2" }, now + 5);
  return state;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

describe("warehouse generation", () => {
  it("ships a distinct original runtime image for every role, instrument and collectible", () => {
    const gameRoot = fileURLToPath(new URL("../", import.meta.url));
    const paths = [
      "/auction-king/images/warehouse-background.png",
      ...auctionRoles.map((entry) => entry.portraitPath),
      ...auctionInstruments.map((entry) => entry.iconPath),
      ...auctionCatalog.map((entry) => entry.imagePath)
    ].filter((entry): entry is string => Boolean(entry));

    expect(paths).toHaveLength(37);
    expect(new Set(paths).size).toBe(paths.length);
    for (const assetPath of paths) {
      expect(existsSync(`${gameRoot}public/shared${assetPath}`), assetPath).toBe(true);
    }
  });

  it("creates twelve non-overlapping collectibles at 55–75% occupancy", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const warehouse = generateWarehouse(seededRandom(seed));
      const occupied = new Set<string>();

      expect(warehouse.cols).toBe(10);
      expect(warehouse.rows).toBe(8);
      expect(warehouse.items).toHaveLength(12);
      expect(warehouse.totalValue).toBeGreaterThanOrEqual(auctionWarehouseMinValue);
      expect(warehouse.totalValue).toBeLessThanOrEqual(auctionWarehouseMaxValue);
      expect(warehouse.items.reduce((sum, item) => sum + item.trueValue, 0)).toBe(warehouse.totalValue);
      expect(warehouse.occupiedCells).toBeGreaterThanOrEqual(44);
      expect(warehouse.occupiedCells).toBeLessThanOrEqual(60);

      for (const item of warehouse.items) {
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.y).toBeGreaterThanOrEqual(0);
        expect(item.x + item.width).toBeLessThanOrEqual(warehouse.cols);
        expect(item.y + item.height).toBeLessThanOrEqual(warehouse.rows);
        for (let row = item.y; row < item.y + item.height; row += 1) {
          for (let col = item.x; col < item.x + item.width; col += 1) {
            const key = `${col}:${row}`;
            expect(occupied.has(key)).toBe(false);
            occupied.add(key);
          }
        }
      }
      expect(occupied.size).toBe(warehouse.occupiedCells);
    }
  });

  it("weights warehouse values 70/30 around the 450k and 850k peaks", () => {
    const random = seededRandom(7_307);
    const samples = Array.from({ length: 20_000 }, () => chooseWarehouseTargetValue(random));
    const low = samples.filter((value) => value <= auctionWarehouseLowBand.max);
    const high = samples.filter((value) => value >= auctionWarehouseHighBand.min);
    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

    expect(samples.every((value) => value >= auctionWarehouseMinValue && value <= auctionWarehouseMaxValue)).toBe(true);
    expect(samples.every((value) => value <= auctionWarehouseLowBand.max || value >= auctionWarehouseHighBand.min)).toBe(true);
    expect(low.length / samples.length).toBeCloseTo(auctionWarehouseLowBandWeight, 1);
    expect(high.length / samples.length).toBeCloseTo(1 - auctionWarehouseLowBandWeight, 1);
    expect(average(low)).toBeGreaterThan(440_000);
    expect(average(low)).toBeLessThan(460_000);
    expect(average(high)).toBeGreaterThan(840_000);
    expect(average(high)).toBeLessThan(860_000);
  });

  it("pins the configured minimum, peaks and maximum exactly", () => {
    const sequence = (...values: number[]) => {
      let index = 0;
      return () => values[index++] ?? values.at(-1) ?? 0;
    };

    expect(chooseWarehouseTargetValue(sequence(0, 0))).toBe(300_000);
    expect(chooseWarehouseTargetValue(sequence(0.69, 0.5))).toBe(450_000);
    expect(chooseWarehouseTargetValue(sequence(0.7, 0.5))).toBe(850_000);
    expect(chooseWarehouseTargetValue(sequence(0.99, 1))).toBe(1_000_000);
  });
});

describe("round close thresholds", () => {
  it("uses 2.0, 1.7, 1.5, 1.3 and unique-high rules", () => {
    expect(auctionRoundThresholds).toEqual([2, 1.7, 1.5, 1.3, 1]);

    const losingRatios = [199, 169, 149, 129];
    const winningRatios = [200, 170, 150, 130];
    for (let round = 1; round <= 4; round += 1) {
      expect(evaluateRoundWinner({ p1: losingRatios[round - 1], p2: 100 }, ["p1", "p2"], round).sold).toBe(false);
      expect(evaluateRoundWinner({ p1: winningRatios[round - 1], p2: 100 }, ["p1", "p2"], round)).toMatchObject({
        sold: true,
        leaderPlayerId: "p1"
      });
    }

    expect(evaluateRoundWinner({ p1: 101, p2: 100 }, ["p1", "p2"], 5).sold).toBe(true);
    expect(evaluateRoundWinner({ p1: 100, p2: 100 }, ["p1", "p2"], 5)).toMatchObject({
      sold: false,
      leaderPlayerId: null
    });
  });
});

describe("setup and authoritative validation", () => {
  it("enforces unique roles and deducts a kit from bidding funds", () => {
    let state = serverGame.startRound(serverGame.createInitialState(context()), context());
    state = input(state, { type: "select_role", playerId: "p1", roleId: "spectrum_cartographer" }, 1_100);
    const duplicate = input(state, { type: "select_role", playerId: "p2", roleId: "spectrum_cartographer" }, 1_101);
    expect(duplicate).toBe(state);

    const configured = configuredState();
    expect(configured.stage).toBe("round_active");
    expect(configured.currentRound).toBe(1);
    expect(configured.fundsByPlayerId.p1).toBe(auctionStartingFunds - 10_000);
    expect(configured.instrumentInventoryByPlayerId.p1).toHaveLength(6);
    expect(configured.instrumentInventoryByPlayerId.p2).toEqual([]);
  });

  it("ignores malformed, forged and unaffordable inputs", () => {
    const state = configuredState();
    expect(serverGame.handleInput(state, { type: "submit_bid" } as never, context(3_000))).toBe(state);
    expect(serverGame.handleInput(state, {
      type: "submit_bid",
      playerId: "outsider",
      amount: 1,
      sentAt: 3_000
    }, context(3_000))).toBe(state);
    expect(input(state, { type: "submit_bid", playerId: "p1", amount: auctionStartingFunds + 1 }, 3_001)).toBe(state);
    expect(serverGame.handleInput(state, {
      type: "submit_bid",
      playerId: "p1",
      amount: Number.NaN,
      sentAt: 3_002
    }, context(3_002))).toBe(state);
  });
});

describe("private intelligence and public round history", () => {
  it("keeps instrument identity and result private until the round closes", () => {
    const state = configuredState();
    const inspected = input(state, {
      type: "use_instrument",
      playerId: "p1",
      instrumentId: "gold_counter"
    }, 3_000);
    const publicState = serverGame.toPublicState?.(inspected, context(3_000));
    const owner = serverGame.toControllerStateForPlayer?.(inspected, context(3_000), "p1");
    const rival = serverGame.toControllerStateForPlayer?.(inspected, context(3_000), "p2");

    expect(publicState?.usedInstrumentByPlayerId).toEqual({ p1: false, p2: false });
    expect(publicState?.history).toEqual([]);
    expect(publicState?.publicNotes.some((note) => note.source === "instrument")).toBe(false);
    expect(owner?.ownCurrentInstrument).toBe("gold_counter");
    expect(owner?.privateNotes.some((note) => note.source === "instrument")).toBe(true);
    expect(rival?.ownCurrentInstrument).toBeNull();
    expect(rival?.privateNotes.some((note) => note.source === "instrument")).toBe(false);
  });

  it("publishes every bid and instrument name after each round", () => {
    let state = configuredState();
    state = input(state, { type: "use_instrument", playerId: "p1", instrumentId: "gold_counter" }, 3_000);
    state = input(state, { type: "submit_bid", playerId: "p1", amount: 150_000 }, 3_010);
    state = input(state, { type: "submit_bid", playerId: "p2", amount: 100_000 }, 3_020);

    expect(state.stage).toBe("round_reveal");
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toMatchObject({
      round: 1,
      bids: { p1: 150_000, p2: 100_000 },
      instruments: { p1: "gold_counter", p2: null },
      sold: false
    });
    const publicState = serverGame.toPublicState?.(state, context(3_020));
    expect(publicState?.history[0]?.bids).toEqual({ p1: 150_000, p2: 100_000 });
    expect(publicState?.history[0]?.instruments).toEqual({ p1: "gold_counter", p2: null });
    expect(publicState?.publicNotes.some((note) => note.source === "instrument")).toBe(false);
  });

  it("publishes system hints only in rounds one and three while roles continue every round", () => {
    let state = configuredState();
    expect(state.auctioneerNotes.map((note) => note.round)).toEqual([1]);

    for (let round = 1; round < 5; round += 1) {
      const now = 3_000 + round * 100;
      state = input(state, { type: "submit_bid", playerId: "p1", amount: 100_000 }, now);
      state = input(state, { type: "submit_bid", playerId: "p2", amount: 100_000 }, now + 1);
      expect(state.stage).toBe("round_reveal");
      state = serverGame.tick?.(
        state,
        0,
        context(state.revealEndsAt ?? now + 8_000)
      ) as AuctionKingState;
      expect(state.stage).toBe("round_active");
      expect(state.currentRound).toBe(round + 1);
    }

    expect(state.auctioneerNotes.map((note) => note.round)).toEqual([1, 3]);
    expect(state.privateKnowledgeByPlayerId.p1.notes.filter((note) => note.source === "role").map((note) => note.round)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("sale and deductions", () => {
  it("sells immediately at the first-round threshold and settles funds", () => {
    let state = configuredState();
    const fundsBeforeBid = state.fundsByPlayerId.p1;
    state = input(state, { type: "submit_bid", playerId: "p1", amount: 200_000 }, 3_010);
    state = input(state, { type: "submit_bid", playerId: "p2", amount: 100_000 }, 3_020);

    expect(state.soldToPlayerId).toBe("p1");
    expect(state.soldFor).toBe(200_000);
    expect(state.history[0]?.sold).toBe(true);
    expect(state.fundsByPlayerId.p1).toBe(fundsBeforeBid - 200_000 + state.warehouse.totalValue);
    expect(serverGame.toPublicState?.(state, context(3_020))?.trueWarehouseValue).toBe(state.warehouse.totalValue);
  });

  it("treats late joiners as spectators without private warehouse data", () => {
    const state = configuredState();
    const spectator = serverGame.toControllerStateForPlayer?.(state, context(3_000, 3), "p3");
    expect(spectator).toMatchObject({
      spectator: true,
      canConfigure: false,
      canAct: false,
      ownFunds: 0,
      privateNotes: []
    });
  });

  it("builds explainable candidates only from known constraints", () => {
    const warehouse = generateWarehouse(seededRandom(99));
    const target = warehouse.items[0];
    const knowledge = createEmptyKnowledge();
    revealOutline(knowledge, target);
    revealRarity(knowledge, target);
    const candidates = buildCandidates(warehouse, knowledge, "zh-CN")[target.instanceId] ?? [];

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.rarity === target.rarity)).toBe(true);
    expect(candidates.every((candidate) =>
      (candidate.width === target.width && candidate.height === target.height) ||
      (candidate.width === target.height && candidate.height === target.width)
    )).toBe(true);
    expect(candidates.every((candidate) => candidate.reasons.includes("品质匹配"))).toBe(true);
    expect(candidates.reduce((sum, candidate) => sum + candidate.probability, 0)).toBeCloseTo(1, 8);
  });
});
