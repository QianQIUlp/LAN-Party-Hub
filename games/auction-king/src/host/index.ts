import Phaser from "phaser";
import { auctionKingManifest } from "../manifest.js";
import { renderAuctionKingState } from "./AuctionKingRenderer.js";
import { preloadAuctionKingAssets } from "./textures.js";

interface HostClientLike {
  subscribe(callback: (state: HostAppStateLike) => void): () => void;
}

interface HostAppStateLike {
  game?: { state?: unknown; phase?: string; message?: string } | null;
  room?: { language?: "zh-CN" | "en" | "de"; players?: Array<{ id: string; name: string }> } | null;
}

export class AuctionKingHostScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private hasPreloaded = false;

  constructor() {
    super(auctionKingManifest.hostView);
  }

  preload(): void {
    // Attempt to load optional image assets.
    // If files are missing, Phaser logs a warning and the renderer
    // falls back to graphics primitives.
    preloadAuctionKingAssets(this);
    this.hasPreloaded = true;
  }

  create(): void {
    const client = this.registry.get("hostClient") as HostClientLike;
    this.unsubscribe = client.subscribe((state) => {
      const gameState = (state.game?.state ?? {}) as Record<string, unknown>;
      const playerNames = Object.fromEntries(
        (state.room?.players ?? []).map((p) => [p.id, p.name])
      );
      this.children.removeAll(true);
      this.cameras.main.setBackgroundColor("#0a0e27");
      renderAuctionKingState(
        this,
        { ...gameState, message: state.game?.message } as Parameters<typeof renderAuctionKingState>[1],
        playerNames,
        state.room?.language
      );
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
    });
  }
}

export const hostGame = {
  id: auctionKingManifest.id,
  displayName: auctionKingManifest.displayName,
  sceneKey: auctionKingManifest.hostView,
  scene: AuctionKingHostScene
} as const;
