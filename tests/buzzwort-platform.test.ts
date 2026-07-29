import { readFileSync } from "node:fs";
import {
  localizeGameManifest,
  type ControllerLayoutKey,
  type GameManifest
} from "@open-party-lab/game-core";
import type {
  BuzzwortControllerState,
  BuzzwortInput,
  TabuControllerState
} from "@open-party-lab/protocol";
import { describe, expect, it } from "vitest";
import { getGameVisual } from "../apps/host/src/games/gameVisuals.js";

interface KnownGame {
  id: string;
  package: string;
  repo: string;
  defaultLocalPath: string;
  alternateLocalPaths?: string[];
  legacyIds?: string[];
  legacyPackages?: string[];
}

const knownGames = JSON.parse(
  readFileSync(new URL("../config/known-games.json", import.meta.url), "utf8")
) as KnownGame[];

const buzzwortManifest = {
  id: "buzzwort",
  displayName: "Buzzwort",
  description: "Upstream fallback",
  minPlayers: 3,
  maxPlayers: 20,
  hostView: "BuzzwortHostScene",
  controllerView: "buzzwort",
  controllerLayout: "secret_card",
  supportsTeams: true,
  estimatedRoundDurationMs: 420_000,
  roundCompletionMode: "wait_for_ready"
} as const satisfies GameManifest;

const legacyTabuManifest = {
  ...buzzwortManifest,
  id: "tabu",
  displayName: "Tabu",
  controllerView: "tabu",
  controllerLayout: "single_button"
} as const satisfies GameManifest;

describe("Buzzwort platform migration", () => {
  it("uses Buzzwort as the primary optional game while retaining legacy candidates", () => {
    const buzzwort = knownGames.find((game) => game.id === "buzzwort");

    expect(buzzwort).toMatchObject({
      package: "@open-party-lab/game-buzzwort",
      repo: "https://github.com/QianQIUlp/buzzwort.git",
      sourceRepo: "https://github.com/Hartwich/buzzwort",
      sourceRevision: "10f336ecb14400e505e67b6476aaa188712539c9",
      defaultLocalPath: "local-games/buzzwort"
    });
    expect(buzzwort?.alternateLocalPaths).toEqual(
      expect.arrayContaining(["../buzzwort", "local-games/tabu", "../tabu"])
    );
    expect(buzzwort?.legacyIds).toContain("tabu");
    expect(buzzwort?.legacyPackages).toContain("@open-party-lab/game-tabu");
    expect(knownGames.some((game) => game.id === "tabu")).toBe(false);
  });

  it("localizes both the primary and legacy game IDs without deleting either catalog contract", () => {
    expect(localizeGameManifest(buzzwortManifest, "zh-CN")).toMatchObject({
      displayName: "禁词挑战"
    });
    expect(localizeGameManifest(buzzwortManifest, "de").displayName).toBe("Buzzwort");
    expect(localizeGameManifest(buzzwortManifest, "en").displayName).toBe("Buzzword");
    expect(localizeGameManifest(legacyTabuManifest, "zh-CN")).toMatchObject({
      displayName: "禁词挑战（旧版）"
    });
  });

  it("keeps the shared layout and both protocol families type-compatible", () => {
    const layout: ControllerLayoutKey = "secret_card";
    const input: BuzzwortInput = {
      type: "buzzwort_correct",
      playerId: "p1",
      sentAt: 1,
      pressedAt: 1
    };
    const protocolStates: Array<BuzzwortControllerState | TabuControllerState> = [];

    expect(layout).toBe("secret_card");
    expect(input.type).toBe("buzzwort_correct");
    expect(protocolStates).toHaveLength(0);
  });

  it("gives Buzzwort a first-class Host visual without changing legacy Tabu", () => {
    expect(getGameVisual("buzzwort")).toEqual(getGameVisual("tabu"));
  });
});
