import { describe, expect, it, vi } from "vitest";
import type { HostAppState } from "../apps/host/src/app/hostSocketClient.js";

vi.mock("phaser", () => ({ default: {} }));

vi.mock("../apps/host/src/games/registry.js", () => ({
  hostGameRegistry: {
    "arena-survivor": {
      id: "arena-survivor",
      displayName: "Arena Survivor",
      sceneKey: "ArenaSurvivorScene"
    }
  }
}));

import { hostSceneKeys, resolveHostSceneKey } from "../apps/host/src/app/router.js";

function createResultState(selectedGameId: string, outcome: string): HostAppState {
  return {
    room: {
      lifecycle: "result",
      selectedGameId,
      currentRound: null
    },
    game: {
      state: { result: { outcome } }
    },
    sceneOverride: null
  } as unknown as HostAppState;
}

describe("host result routing", () => {
  it.each(["survived", "defeated"])(
    "keeps Arena Survivor's %s summary in its external scene",
    (outcome) => {
      expect(resolveHostSceneKey(createResultState("arena-survivor", outcome))).toBe(
        "ArenaSurvivorScene"
      );
    }
  );

  it("keeps other games on the shared scoreboard", () => {
    expect(resolveHostSceneKey(createResultState("tap-race", "defeated"))).toBe(
      hostSceneKeys.scoreboard
    );
  });
});
