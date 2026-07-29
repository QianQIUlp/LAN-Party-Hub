import Phaser from "phaser";
import { auctionKingManifest } from "../manifest.js";
import { renderAuctionKingState } from "./AuctionKingRenderer.js";
import { preloadAuctionKingAssets } from "./textures.js";

interface HostClientLike {
  subscribe(callback: (state: HostAppStateLike) => void): () => void;
}

interface HostAppStateLike {
  game?: { state?: unknown; phase?: string; message?: string } | null;
  room?: { language?: "zh-CN" | "en" | "de" } | null;
}

export class AuctionKingHostScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private latestState: HostAppStateLike | null = null;
  private lastRenderedSecond = -1;
  private lastMotionSignature = "";

  constructor() {
    super(auctionKingManifest.hostView);
  }

  preload(): void {
    preloadAuctionKingAssets(this);
  }

  create(): void {
    const client = this.registry.get("hostClient") as HostClientLike;
    this.unsubscribe = client.subscribe((state) => {
      this.latestState = state;
      this.renderLatestState();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      this.latestState = null;
      this.lastMotionSignature = "";
    });
  }

  update(): void {
    const gameState = this.latestState?.game?.state as { stageEndsAt?: number | null } | undefined;
    if (gameState?.stageEndsAt === null || gameState?.stageEndsAt === undefined) return;
    const second = Math.max(0, Math.ceil((gameState.stageEndsAt - Date.now()) / 1000));
    if (second === this.lastRenderedSecond) return;
    this.lastRenderedSecond = second;
    this.renderLatestState();
  }

  private renderLatestState(): void {
    const state = this.latestState;
    if (!state?.game?.state) return;
    const gameState = state.game.state as Record<string, unknown>;
    const renderState: Record<string, unknown> & { message?: string } = {
      ...gameState,
      message: state.game.message
    };
    const motionSignature = JSON.stringify({
      stage: renderState.stage,
      currentRound: renderState.currentRound,
      players: renderState.players,
      history: renderState.history,
      publicNotes: renderState.publicNotes,
      warehouse: renderState.warehouse,
      soldToPlayerId: renderState.soldToPlayerId,
      message: renderState.message
    });
    const prefersReducedMotion = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = motionSignature !== this.lastMotionSignature && !prefersReducedMotion;
    this.lastMotionSignature = motionSignature;
    this.tweens.killAll();
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor("#080c0f");
    renderAuctionKingState(
      this,
      renderState as unknown as Parameters<typeof renderAuctionKingState>[1],
      state.room?.language ?? "zh-CN",
      { animate }
    );
  }
}

export const hostGame = {
  id: auctionKingManifest.id,
  displayName: auctionKingManifest.displayName,
  sceneKey: auctionKingManifest.hostView,
  scene: AuctionKingHostScene
} as const;
