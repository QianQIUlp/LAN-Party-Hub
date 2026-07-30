// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import Phaser from "phaser";
import QRCode from "qrcode";
import type { AvailableGameDto, PlayerSnapshot, SupportedLanguage } from "@open-party-lab/protocol";
import { bindGameSelectionHotkeys } from "../app/gameHotkeys.js";
import type { HostSocketClient } from "../app/hostSocketClient.js";
import { renderEditorialLobby } from "./lobbySelectionUi.js";
import { clampScroll, measureMaxScroll, renderScrollBar } from "./sceneScroll.js";

const lobbyQrTextureKey = "lan-party-hub-lobby-qr";

export class LobbyScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private unbindHotkeys?: () => void;
  private client?: HostSocketClient;
  private scrollY = 0;
  private maxScroll = 0;
  private qrPendingUrl = "";
  private qrReadyUrl = "";
  private dragStartY: number | null = null;
  private dragStartScrollY = 0;
  private readonly handleResize = () => this.renderFromState();
  private readonly handleWheel = (
    _pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number
  ) => {
    if (this.maxScroll <= 0) {
      return;
    }

    this.scrollY = clampScroll(this.scrollY + deltaY, this.maxScroll);
    this.renderFromState();
  };
  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer) => {
    if (this.maxScroll <= 0) {
      return;
    }

    this.dragStartY = pointer.y;
    this.dragStartScrollY = this.scrollY;
  };
  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer) => {
    if (this.dragStartY === null || !pointer.isDown || this.maxScroll <= 0) {
      return;
    }

    const nextScrollY = clampScroll(
      this.dragStartScrollY + this.dragStartY - pointer.y,
      this.maxScroll
    );

    if (Math.abs(nextScrollY - this.scrollY) < 1) {
      return;
    }

    this.scrollY = nextScrollY;
    this.renderFromState();
  };
  private readonly handlePointerUp = () => {
    this.dragStartY = null;
  };
  private readonly handleScrollKey = (event: KeyboardEvent) => {
    if (this.maxScroll <= 0 || event.repeat) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target?.isContentEditable ||
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.tagName === "SELECT"
    ) {
      return;
    }

    const pageStep = Math.max(180, this.scale.height * 0.72);
    const nextScrollY = event.key === "ArrowDown"
      ? this.scrollY + 72
      : event.key === "ArrowUp"
        ? this.scrollY - 72
        : event.key === "PageDown"
          ? this.scrollY + pageStep
          : event.key === "PageUp"
            ? this.scrollY - pageStep
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? this.maxScroll
                : null;

    if (nextScrollY === null) {
      return;
    }

    event.preventDefault();
    this.scrollY = clampScroll(nextScrollY, this.maxScroll);
    this.renderFromState();
  };

  constructor() {
    super("LobbyScene");
  }

  create(): void {
    const client = this.registry.get("hostClient") as HostSocketClient;
    const handleStartRound = () => client.startRound();

    this.client = client;
    this.unbindHotkeys = bindGameSelectionHotkeys(this, client);
    this.input.keyboard?.on("keydown-SPACE", handleStartRound);
    this.input.on("wheel", this.handleWheel);
    this.input.on("pointerdown", this.handlePointerDown);
    this.input.on("pointermove", this.handlePointerMove);
    this.input.on("pointerup", this.handlePointerUp);
    this.input.on("pointerupoutside", this.handlePointerUp);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize);
    window.addEventListener("keydown", this.handleScrollKey);

    this.unsubscribe = client.subscribe(() => {
      this.renderFromState();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      this.unbindHotkeys?.();
      this.unbindHotkeys = undefined;
      this.client = undefined;
      this.input.keyboard?.off("keydown-SPACE", handleStartRound);
      this.input.off("wheel", this.handleWheel);
      this.input.off("pointerdown", this.handlePointerDown);
      this.input.off("pointermove", this.handlePointerMove);
      this.input.off("pointerup", this.handlePointerUp);
      this.input.off("pointerupoutside", this.handlePointerUp);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize);
      window.removeEventListener("keydown", this.handleScrollKey);
    });
  }

  private renderFromState(): void {
    const state = this.client?.getState();

    if (!state) {
      return;
    }

    this.render(
      state.room?.joinUrl ?? "",
      state.room?.code ?? "----",
      state.error,
      state.room?.players ?? [],
      state.room?.availableGames ?? [],
      state.room?.language ?? state.preferredLanguage
    );
  }

  private updateScrollBounds(contentBottom: number): boolean {
    this.maxScroll = measureMaxScroll(this, contentBottom, this.scale.width < 860 ? 100 : 28);
    const nextScrollY = clampScroll(this.scrollY, this.maxScroll);

    if (nextScrollY === this.scrollY) {
      return false;
    }

    this.scrollY = nextScrollY;
    this.renderFromState();
    return true;
  }

  private ensureQrTexture(joinUrl: string): void {
    if (!joinUrl || joinUrl === this.qrReadyUrl || this.qrPendingUrl) {
      return;
    }

    const texture = this.textures.exists(lobbyQrTextureKey)
      ? this.textures.get(lobbyQrTextureKey) as Phaser.Textures.CanvasTexture
      : this.textures.createCanvas(lobbyQrTextureKey, 176, 176);

    if (!texture) {
      return;
    }

    const canvas = texture.getSourceImage() as HTMLCanvasElement;
    this.qrPendingUrl = joinUrl;

    void QRCode.toCanvas(canvas, joinUrl, {
      margin: 1,
      width: 176,
      color: {
        dark: "#10171d",
        light: "#ffffff"
      }
    }).then(() => {
      texture.refresh();
      this.qrReadyUrl = joinUrl;
      this.qrPendingUrl = "";

      if (this.scene.isActive()) {
        this.renderFromState();
      }
    }).catch(() => {
      this.qrPendingUrl = "";
    });
  }

  private render(
    joinUrl: string,
    roomCode: string,
    error: string | null,
    players: PlayerSnapshot[],
    availableGames: AvailableGameDto[],
    language: SupportedLanguage
  ): void {
    this.children.removeAll(true);
    this.ensureQrTexture(joinUrl);

    const { contentBottom } = renderEditorialLobby(this, {
      joinUrl,
      roomCode,
      error,
      players,
      games: availableGames,
      language,
      scrollY: this.scrollY,
      qrTextureKey: this.qrReadyUrl === joinUrl ? lobbyQrTextureKey : undefined,
      onSelect: (gameId) => this.client?.selectGame(gameId)
    });

    if (this.updateScrollBounds(contentBottom)) {
      return;
    }

    renderScrollBar(this, this.scrollY, this.maxScroll);
  }
}
