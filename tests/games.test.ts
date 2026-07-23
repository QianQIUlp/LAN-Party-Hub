import { localizeGameManifest, type ServerGameContext } from "@open-party-lab/game-core";
import { describe, expect, it } from "vitest";
import { serverGame as imposterGame } from "../games/imposter/src/server/index.js";
import { imposterManifest } from "../games/imposter/src/manifest.js";
import type { ImposterState } from "../games/imposter/src/protocol.js";
import {
  zhAdultSecretWordEntries,
  zhStandardSecretWordEntries
} from "../games/imposter/src/zhWordPacks.js";
import { serverGame as tapRaceGame } from "../games/tap-race/src/server/index.js";
import { tapRaceManifest } from "../games/tap-race/src/manifest.js";
import type { TapRaceState } from "../games/tap-race/src/protocol.js";
import { normalizeGuess } from "../games/zeichnen-und-erraten/src/server/index.js";
import { zeichnenUndErratenManifest } from "../games/zeichnen-und-erraten/src/manifest.js";
import {
  zhAdultWordPool,
  zhStandardWordPool
} from "../games/zeichnen-und-erraten/src/server/zhWordPools.js";
import { schaetzoramaChineseQuestionIds } from "../games/schaetzorama/src/server/schaetzoramaChineseText.js";
import { schaetzoramaManifest } from "../games/schaetzorama/src/manifest.js";

function context(
  selectedGame: ServerGameContext["selectedGame"],
  now = 1_000
): ServerGameContext {
  return {
    roomCode: "TEST",
    roundNumber: 1,
    players: [
      { id: "p1", name: "甲", color: "#f00", score: 0, isReady: true, connected: true },
      { id: "p2", name: "乙", color: "#0f0", score: 0, isReady: true, connected: true },
      { id: "p3", name: "丙", color: "#00f", score: 0, isReady: true, connected: true }
    ],
    now,
    deltaMs: 0,
    language: "zh-CN",
    selectedGame,
    previousRound: null,
    roomSettings: {}
  };
}

describe("bundled game contracts", () => {
  it("keeps the secret word away from the imposter", () => {
    const gameContext = context(imposterManifest);
    const state = imposterGame.createInitialState(gameContext);

    for (const player of gameContext.players) {
      const controllerState = imposterGame.toControllerStateForPlayer?.(
        state,
        gameContext,
        player.id
      );
      expect(controllerState).toBeDefined();

      if (player.id === state.imposterPlayerId) {
        expect(controllerState?.secretWord).toBeUndefined();
      } else {
        expect(controllerState?.secretWord).toBe(state.secretWord);
      }
    }
  });

  it("rejects self-votes and unknown vote targets", () => {
    const gameContext = context(imposterManifest);
    const initial = imposterGame.createInitialState(gameContext);
    const state: ImposterState = { ...initial, phase: "playing", stage: "voting" };

    expect(imposterGame.handleInput(state, {
      type: "vote_player",
      playerId: "p1",
      suspectPlayerId: "p1",
      sentAt: gameContext.now
    }, gameContext)).toBe(state);
    expect(imposterGame.handleInput(state, {
      type: "vote_player",
      playerId: "p1",
      suspectPlayerId: "missing",
      sentAt: gameContext.now
    }, gameContext)).toBe(state);
  });

  it("ships the promised Chinese word pool sizes", () => {
    expect(zhStandardWordPool.length).toBeGreaterThanOrEqual(200);
    expect(zhAdultWordPool.length).toBeGreaterThanOrEqual(60);
    expect(zhStandardSecretWordEntries.length).toBeGreaterThanOrEqual(150);
    expect(zhAdultSecretWordEntries.length).toBeGreaterThanOrEqual(50);
  });

  it("normalizes Chinese full-width and punctuation differences", () => {
    expect(normalizeGuess("　火・锅！ ", "zh-CN")).toBe(normalizeGuess("火锅", "zh-CN"));
    expect(normalizeGuess("ＡＢＣ", "zh-CN")).toBe("abc");
  });

  it("limits impossible tap frequency on the authoritative server", () => {
    const firstContext = context(tapRaceManifest, 1_000);
    const initial = tapRaceGame.createInitialState(firstContext);
    const playing = tapRaceGame.startRound(initial, firstContext);
    const input = { type: "tap" as const, playerId: "p1", sentAt: 1_000, pressedAt: 1_000 };
    const first = tapRaceGame.handleInput(playing, input, firstContext) as TapRaceState;
    const tooFast = tapRaceGame.handleInput(first, input, { ...firstContext, now: 1_010 });
    const accepted = tapRaceGame.handleInput(first, input, { ...firstContext, now: 1_030 }) as TapRaceState;

    expect(first.tapsByPlayer.p1).toBe(1);
    expect(tooFast).toBe(first);
    expect(accepted.tapsByPlayer.p1).toBe(2);
  });

  it("contains twelve Chinese questions for every estimation category", () => {
    for (const ids of Object.values(schaetzoramaChineseQuestionIds)) {
      expect(new Set(ids).size).toBeGreaterThanOrEqual(12);
    }
  });

  it("keeps every bundled game inside the first-release player range", () => {
    expect([
      tapRaceManifest,
      zeichnenUndErratenManifest,
      schaetzoramaManifest,
      imposterManifest
    ].map(({ id, minPlayers, maxPlayers }) => ({ id, minPlayers, maxPlayers }))).toEqual([
      { id: "tap-race", minPlayers: 2, maxPlayers: 4 },
      { id: "zeichnen-und-erraten", minPlayers: 2, maxPlayers: 4 },
      { id: "schaetzorama", minPlayers: 2, maxPlayers: 4 },
      { id: "imposter", minPlayers: 3, maxPlayers: 4 }
    ]);
  });

  it("localizes nested lobby fields by stable IDs", () => {
    const english = localizeGameManifest(zeichnenUndErratenManifest, "en");
    const german = localizeGameManifest(imposterManifest, "de");

    expect(english.lobbySetup?.title).toBe("Word selection");
    expect(english.lobbySetup?.fields[0]?.kind).toBe("select");
    expect(english.lobbySetup?.fields[0]?.label).toBe("Word pack");
    expect(german.lobbySetup?.fields[0]?.label).toBe("Inhalt");
  });
});
