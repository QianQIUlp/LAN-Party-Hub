import Phaser from "phaser";
import { bullshitManifest } from "../manifest.js";
import type { BullshitPublicState } from "../protocol.js";
import { renderBullshitState } from "./BullshitRenderer.js";

interface HostClientLike {
  subscribe(callback: (state: HostAppStateLike) => void): () => void;
}

interface HostAppStateLike {
  game?: {
    state?: unknown;
  } | null;
  room?: {
    language?: "zh-CN" | "en" | "de";
  } | null;
}

export class BullshitHostScene extends Phaser.Scene {
  private unsubscribe?: () => void;

  constructor() {
    super(bullshitManifest.hostView);
  }

  create(): void {
    const client = this.registry.get("hostClient") as HostClientLike;

    this.unsubscribe = client.subscribe((state) => {
      const incomingState = (state.game?.state ?? {}) as Partial<BullshitPublicState>;
      const gameState: BullshitPublicState = {
        activeRank: incomingState.activeRank ?? null,
        pileCount: incomingState.pileCount ?? 0,
        currentTurnPlayerId: incomingState.currentTurnPlayerId ?? null,
        currentTurnPlayerName: incomingState.currentTurnPlayerName ?? null,
        players: incomingState.players ?? [],
        lastPlay: incomingState.lastPlay ?? null,
        pendingWinnerPlayerId: incomingState.pendingWinnerPlayerId ?? null,
        pendingWinnerName: incomingState.pendingWinnerName ?? null,
        winnerPlayerId: incomingState.winnerPlayerId ?? null,
        winnerName: incomingState.winnerName ?? null,
        lastResolution: incomingState.lastResolution ?? null,
        message: incomingState.message
      };
      this.children.removeAll(true);
      this.cameras.main.setBackgroundColor("#071a16");
      renderBullshitState(this, gameState, state.room?.language ?? "zh-CN");
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
    });
  }
}

export const hostGame = {
  id: bullshitManifest.id,
  displayName: bullshitManifest.displayName,
  sceneKey: bullshitManifest.hostView,
  scene: BullshitHostScene
} as const;
