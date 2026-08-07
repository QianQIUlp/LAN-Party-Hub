// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import Phaser from "phaser";
import { fishEatFishManifest } from "../manifest.js";
import type { FishEatFishState } from "../protocol.js";
import { FishEatFishRenderer } from "./FishEatFishRenderer.js";

interface HostClientLike {
  subscribe(callback: (state: HostAppStateLike) => void): () => void;
}

interface HostAppStateLike {
  game?: {
    state?: unknown;
  } | null;
  room?: {
    language?: "zh-CN" | "de" | "en";
    players?: Array<{ id: string; name: string }>;
  } | null;
}

export class FishEatFishHostScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private fishRenderer?: FishEatFishRenderer;
  private latest?: {
    state: FishEatFishState;
    playerNames: Map<string, string>;
    language: string;
  };

  constructor() {
    super(fishEatFishManifest.hostView);
  }

  create(): void {
    const client = this.registry.get("hostClient") as HostClientLike;
    this.fishRenderer = new FishEatFishRenderer(this);

    this.unsubscribe = client.subscribe((state) => {
      const gameState = state.game?.state as FishEatFishState | undefined;

      if (!gameState) {
        this.latest = undefined;
        return;
      }

      const playerNames = new Map(
        (state.room?.players ?? []).map((player) => [player.id, player.name])
      );

      this.latest = {
        state: gameState,
        playerNames,
        language: state.room?.language ?? "zh-CN"
      };
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      this.fishRenderer?.destroy();
      this.fishRenderer = undefined;
      this.latest = undefined;
    });
  }

  update(time: number, delta: number): void {
    if (!this.fishRenderer || !this.latest) {
      return;
    }

    this.fishRenderer.update(this.latest.state, this.latest.playerNames, this.latest.language, time, delta);
  }
}

export const hostGame = {
  id: fishEatFishManifest.id,
  displayName: fishEatFishManifest.displayName,
  sceneKey: fishEatFishManifest.hostView,
  scene: FishEatFishHostScene
} as const;
