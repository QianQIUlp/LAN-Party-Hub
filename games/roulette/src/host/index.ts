import Phaser from "phaser";
import type { SupportedLanguage } from "@open-party-lab/game-core";
import { rouletteManifest } from "../manifest.js";
import type { RoulettePublicState } from "../protocol.js";

interface HostClientLike {
  subscribe(callback: (state: HostAppStateLike) => void): () => void;
}

interface HostAppStateLike {
  game?: {
    phase?: string;
    state?: unknown;
    message?: string;
  } | null;
  room?: {
    code?: string;
    language?: SupportedLanguage;
    players?: Array<{ id: string; name: string; color?: string }>;
  } | null;
}

const palette = {
  background: 0x09090b,
  wine: 0x450a0a,
  brass: 0xd6a84b,
  ivory: "#fff7dc",
  muted: "#c7b99a",
  live: 0xdc2626,
  blank: 0x64748b,
  panel: 0x171717
};

export class RouletteHostScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private latestState?: HostAppStateLike;

  constructor() {
    super(rouletteManifest.hostView);
  }

  create(): void {
    const client = this.registry.get("hostClient") as HostClientLike;

    this.unsubscribe = client.subscribe((state) => {
      this.latestState = state;
      this.redraw();
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.redraw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      this.scale.off(Phaser.Scale.Events.RESIZE, this.redraw, this);
    });
  }

  private redraw(): void {
    if (!this.latestState) {
      return;
    }

    this.children.removeAll(true);
    this.render(this.latestState);
  }

  private render(appState: HostAppStateLike): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const language = appState.room?.language ?? "zh-CN";
    const gameState = appState.game?.state as RoulettePublicState | undefined;
    const players = appState.room?.players ?? [];
    const names = Object.fromEntries(players.map((player) => [player.id, player.name]));

    this.drawBackground(width, height);
    this.add.text(42, 28, this.text(language, "命运轮盘", "FATE CHAMBER", "SCHICKSALSTROMMEL"), {
      fontFamily: "Georgia, serif",
      fontSize: "44px",
      fontStyle: "bold",
      color: palette.ivory
    });
    this.add.text(
      width - 42,
      42,
      this.text(language, "房间 ", "ROOM ", "RAUM ") + (appState.room?.code ?? "----"),
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: palette.muted
      }
    ).setOrigin(1, 0);

    if (!gameState) {
      this.add.text(
        width / 2,
        height / 2,
        this.text(language, "等待庄家装填……", "Waiting for the dealer...", "Warte auf den Geber..."),
        {
          fontFamily: "Georgia, serif",
          fontSize: "34px",
          color: palette.ivory
        }
      ).setOrigin(0.5);
      return;
    }

    const leftPlayerId = gameState.playerOrder[0];
    const rightPlayerId = gameState.playerOrder[1];
    const cardWidth = Math.min(330, Math.max(250, width * 0.27));
    const cardHeight = Math.min(330, Math.max(240, height * 0.42));
    const cardY = Math.max(150, height * 0.23);

    if (leftPlayerId) {
      this.drawPlayerCard(
        42,
        cardY,
        cardWidth,
        cardHeight,
        leftPlayerId,
        names[leftPlayerId] ?? leftPlayerId,
        gameState,
        language
      );
    }

    if (rightPlayerId) {
      this.drawPlayerCard(
        width - cardWidth - 42,
        cardY,
        cardWidth,
        cardHeight,
        rightPlayerId,
        names[rightPlayerId] ?? rightPlayerId,
        gameState,
        language
      );
    }

    this.drawChamber(width / 2, cardY + cardHeight * 0.42, gameState, language);
    this.drawLastShot(width / 2, cardY + cardHeight * 0.82, gameState, names, language);

    const message = appState.game?.message ?? gameState.message ?? "";
    const messageWidth = Math.max(360, Math.min(780, width - 180));
    const messagePanel = this.add.graphics();
    messagePanel.fillStyle(0x000000, 0.42);
    messagePanel.fillRoundedRect(
      width / 2 - messageWidth / 2,
      height - 112,
      messageWidth,
      72,
      18
    );
    messagePanel.lineStyle(2, palette.brass, 0.56);
    messagePanel.strokeRoundedRect(
      width / 2 - messageWidth / 2,
      height - 112,
      messageWidth,
      72,
      18
    );
    this.add.text(width / 2, height - 76, message, {
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",
      color: palette.ivory,
      align: "center",
      wordWrap: { width: messageWidth - 48 }
    }).setOrigin(0.5);
  }

  private drawBackground(width: number, height: number): void {
    this.cameras.main.setBackgroundColor(palette.background);
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(palette.background, palette.wine, palette.background, 0x1c0b0b, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(1, palette.brass, 0.08);

    for (let offset = -height; offset < width; offset += 72) {
      graphics.lineBetween(offset, 0, offset + height, height);
    }

    graphics.fillStyle(0x000000, 0.24);
    graphics.fillEllipse(width / 2, height * 0.72, width * 0.92, height * 0.46);
  }

  private drawPlayerCard(
    x: number,
    y: number,
    width: number,
    height: number,
    playerId: string,
    name: string,
    gameState: RoulettePublicState,
    language: SupportedLanguage
  ): void {
    const isCurrent = gameState.currentPlayerId === playerId && gameState.stage === "duel";
    const isWinner = gameState.winnerPlayerId === playerId;
    const health = gameState.healthByPlayer[playerId] ?? 0;
    const graphics = this.add.graphics();
    graphics.fillStyle(palette.panel, 0.88);
    graphics.fillRoundedRect(x, y, width, height, 24);
    graphics.lineStyle(isCurrent || isWinner ? 5 : 2, isWinner ? 0x22c55e : palette.brass, isCurrent ? 1 : 0.45);
    graphics.strokeRoundedRect(x, y, width, height, 24);

    this.add.text(x + width / 2, y + 30, name, {
      fontFamily: "Georgia, serif",
      fontSize: "30px",
      fontStyle: "bold",
      color: palette.ivory
    }).setOrigin(0.5, 0);

    const status = isWinner
      ? this.text(language, "最后赢家", "LAST STANDING", "LETZTER SPIELER")
      : isCurrent
        ? this.text(language, "正在选择", "CHOOSING", "AM ZUG")
        : this.text(language, "等待", "WAITING", "WARTET");

    this.add.text(x + width / 2, y + 78, status, {
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      color: isCurrent || isWinner ? "#facc15" : palette.muted
    }).setOrigin(0.5, 0);

    this.add.text(
      x + width / 2,
      y + 126,
      this.text(language, "生命", "RESOLVE", "MUT"),
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        color: palette.muted
      }
    ).setOrigin(0.5, 0);

    const spacing = 54;
    const totalWidth = (gameState.maxHealth - 1) * spacing;
    for (let index = 0; index < gameState.maxHealth; index += 1) {
      const alive = index < health;
      const centerX = x + width / 2 - totalWidth / 2 + index * spacing;
      const centerY = y + 190;
      graphics.fillStyle(alive ? 0xb91c1c : 0x27272a, 1);
      graphics.fillCircle(centerX, centerY, 18);
      graphics.lineStyle(3, alive ? 0xfca5a5 : 0x52525b, 0.9);
      graphics.strokeCircle(centerX, centerY, 18);
    }
  }

  private drawChamber(
    x: number,
    y: number,
    gameState: RoulettePublicState,
    language: SupportedLanguage
  ): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x111827, 0.96);
    graphics.fillCircle(x, y, 104);
    graphics.lineStyle(7, palette.brass, 0.9);
    graphics.strokeCircle(x, y, 104);
    graphics.fillStyle(0x27272a, 1);
    graphics.fillCircle(x, y, 32);

    const totalRemaining = gameState.liveShellsRemaining + gameState.blankShellsRemaining;
    for (let index = 0; index < 6; index += 1) {
      const angle = -Math.PI / 2 + index * (Math.PI / 3);
      const slotX = x + Math.cos(angle) * 67;
      const slotY = y + Math.sin(angle) * 67;
      const occupied = index < totalRemaining;
      graphics.fillStyle(occupied ? 0xb08d42 : 0x09090b, occupied ? 0.9 : 1);
      graphics.fillCircle(slotX, slotY, 16);
      graphics.lineStyle(2, occupied ? 0xffe6a7 : 0x3f3f46, 0.75);
      graphics.strokeCircle(slotX, slotY, 16);
    }

    this.add.text(x, y - 152, this.text(language, "剩余弹药", "SHELLS LEFT", "PATRONEN"), {
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      color: palette.muted
    }).setOrigin(0.5);
    this.add.text(
      x,
      y + 134,
      gameState.liveShellsRemaining
        + this.text(language, " 发实弹  ·  ", " LIVE  ·  ", " SCHARF  ·  ")
        + gameState.blankShellsRemaining
        + this.text(language, " 发空包弹", " BLANK", " LEER"),
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: palette.ivory
      }
    ).setOrigin(0.5);
    this.add.text(x, y + 164, "#" + gameState.reloadNumber, {
      fontFamily: "Arial, sans-serif",
      fontSize: "15px",
      color: palette.muted
    }).setOrigin(0.5);
  }

  private drawLastShot(
    x: number,
    y: number,
    gameState: RoulettePublicState,
    names: Record<string, string>,
    language: SupportedLanguage
  ): void {
    const lastShot = gameState.lastShot;

    if (!lastShot) {
      this.add.text(
        x,
        y,
        this.text(language, "等待第一次扣动扳机", "Waiting for the first choice", "Warte auf die erste Wahl"),
        {
          fontFamily: "Georgia, serif",
          fontSize: "20px",
          color: palette.muted
        }
      ).setOrigin(0.5);
      return;
    }

    const isLive = lastShot.shell === "live";
    const targetName = names[lastShot.targetPlayerId] ?? lastShot.targetPlayerId;
    const label = isLive
      ? this.text(language, "实弹", "LIVE", "SCHARF")
      : this.text(language, "空包弹", "BLANK", "LEER");
    const detail = this.text(language, "目标：", "Target: ", "Ziel: ") + targetName;
    const badge = this.add.graphics();
    badge.fillStyle(isLive ? palette.live : palette.blank, 0.96);
    badge.fillRoundedRect(x - 74, y - 24, 148, 48, 16);
    this.add.text(x, y, label, {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "22px",
      color: "#ffffff"
    }).setOrigin(0.5);
    this.add.text(x, y + 38, detail, {
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      color: palette.muted
    }).setOrigin(0.5);
  }

  private text(
    language: SupportedLanguage,
    chinese: string,
    english: string,
    german: string
  ): string {
    return language === "zh-CN" ? chinese : language === "en" ? english : german;
  }
}

export const hostGame = {
  id: rouletteManifest.id,
  displayName: rouletteManifest.displayName,
  sceneKey: rouletteManifest.hostView,
  scene: RouletteHostScene
} as const;
