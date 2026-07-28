import Phaser from "phaser";
import type { SupportedLanguage } from "@open-party-lab/game-core";
import { liarsTableManifest } from "../manifest.js";
import type {
  LiarsCardRank,
  LiarsTablePublicState
} from "../protocol.js";

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

const playerPalette = [0xdc2626, 0x2563eb, 0x16a34a, 0x9333ea];
const rankIcon: Record<LiarsCardRank, string> = {
  crown: "♛",
  moon: "☾",
  key: "K",
  wild: "✦"
};

const rankText: Record<SupportedLanguage, Record<LiarsCardRank, string>> = {
  "zh-CN": {
    crown: "皇冠",
    moon: "月亮",
    key: "钥匙",
    wild: "百搭"
  },
  en: {
    crown: "Crown",
    moon: "Moon",
    key: "Key",
    wild: "Wild"
  },
  de: {
    crown: "Krone",
    moon: "Mond",
    key: "Schluessel",
    wild: "Joker"
  }
};

export class LiarsTableHostScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private latestState?: HostAppStateLike;

  constructor() {
    super(liarsTableManifest.hostView);
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
    const gameState = appState.game?.state as LiarsTablePublicState | undefined;
    const players = appState.room?.players ?? [];
    const names = Object.fromEntries(players.map((player) => [player.id, player.name]));

    this.drawBackground(width, height);
    this.add.text(150, 24, this.text(language, "谎言牌桌", "LIARS' TABLE", "LUEGENTISCH"), {
      fontFamily: "Georgia, serif",
      fontSize: "42px",
      fontStyle: "bold",
      color: "#fff4d6"
    });
    this.add.text(
      width - 38,
      34,
      this.text(language, "房间 ", "ROOM ", "RAUM ") + (appState.room?.code ?? "----"),
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "19px",
        color: "#c9bfa9"
      }
    ).setOrigin(1, 0);

    if (!gameState) {
      this.add.text(
        width / 2,
        height / 2,
        this.text(language, "等待玩家入席……", "Waiting for players...", "Warte auf Spieler..."),
        {
          fontFamily: "Georgia, serif",
          fontSize: "34px",
          color: "#fff4d6"
        }
      ).setOrigin(0.5);
      return;
    }

    this.drawTable(width, height);
    this.drawCenterPanel(width / 2, height / 2 + 18, gameState, names, language);
    this.drawPlayers(width, height, gameState, names, language);

    const message = appState.game?.message ?? gameState.message ?? "";
    const messageWidth = Math.max(440, Math.min(900, width - 140));
    const panel = this.add.graphics();
    panel.fillStyle(0x070b09, 0.82);
    panel.fillRoundedRect(
      width / 2 - messageWidth / 2,
      height - 96,
      messageWidth,
      58,
      16
    );
    panel.lineStyle(2, 0xc69b4b, 0.52);
    panel.strokeRoundedRect(
      width / 2 - messageWidth / 2,
      height - 96,
      messageWidth,
      58,
      16
    );
    this.add.text(width / 2, height - 67, message, {
      fontFamily: "Arial, sans-serif",
      fontSize: "19px",
      color: "#fff4d6",
      align: "center",
      wordWrap: { width: messageWidth - 40 }
    }).setOrigin(0.5);
  }

  private drawBackground(width: number, height: number): void {
    this.cameras.main.setBackgroundColor(0x080b0a);
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x070a09, 0x24130f, 0x0b1d17, 0x180c0b, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0xc69b4b, 0.07);

    for (let index = 0; index < 28; index += 1) {
      const x = (index * 173) % Math.max(1, width);
      const y = 90 + ((index * 97) % Math.max(1, height - 150));
      graphics.fillCircle(x, y, 2 + (index % 3));
    }
  }

  private drawTable(width: number, height: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x071b16, 0.98);
    graphics.fillEllipse(width / 2, height / 2 + 20, width * 0.70, height * 0.55);
    graphics.lineStyle(18, 0x3d2819, 1);
    graphics.strokeEllipse(width / 2, height / 2 + 20, width * 0.70, height * 0.55);
    graphics.lineStyle(4, 0xc69b4b, 0.58);
    graphics.strokeEllipse(width / 2, height / 2 + 20, width * 0.665, height * 0.505);
    graphics.fillStyle(0xffffff, 0.025);
    graphics.fillEllipse(width / 2 - width * 0.08, height / 2 - height * 0.02, width * 0.42, height * 0.28);
  }

  private drawPlayers(
    width: number,
    height: number,
    gameState: LiarsTablePublicState,
    names: Record<string, string>,
    language: SupportedLanguage
  ): void {
    const playerIds = gameState.playerOrder;
    const centerX = width / 2;
    const centerY = height / 2 + 16;
    const radiusX = Math.min(width * 0.42, width / 2 - 132);
    const radiusY = Math.min(height * 0.37, height / 2 - 94);
    const panelWidth = Math.min(224, Math.max(176, width * 0.18));
    const panelHeight = 120;

    playerIds.forEach((playerId, index) => {
      const angle = -Math.PI / 2 + index * ((Math.PI * 2) / playerIds.length);
      const x = centerX + Math.cos(angle) * radiusX - panelWidth / 2;
      const y = centerY + Math.sin(angle) * radiusY - panelHeight / 2;
      this.drawPlayerPanel(
        x,
        y,
        panelWidth,
        panelHeight,
        playerId,
        names[playerId] ?? playerId,
        index,
        gameState,
        language
      );
    });
  }

  private drawPlayerPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    playerId: string,
    name: string,
    index: number,
    gameState: LiarsTablePublicState,
    language: SupportedLanguage
  ): void {
    const active = gameState.activePlayerIds.includes(playerId);
    const current = gameState.currentPlayerId === playerId && gameState.stage === "turn";
    const winner = gameState.winnerPlayerId === playerId;
    const health = gameState.healthByPlayer[playerId] ?? 0;
    const cards = gameState.handCountByPlayer[playerId] ?? 0;
    const risk = gameState.chamberRiskByPlayer[playerId];
    const accent = playerPalette[index % playerPalette.length] ?? 0xc69b4b;
    const graphics = this.add.graphics();
    graphics.fillStyle(active ? 0x111513 : 0x18181b, active ? 0.96 : 0.82);
    graphics.fillRoundedRect(x, y, width, height, 18);
    graphics.lineStyle(current || winner ? 5 : 2, winner ? 0x22c55e : accent, current || winner ? 1 : 0.48);
    graphics.strokeRoundedRect(x, y, width, height, 18);

    this.add.text(x + 16, y + 13, name, {
      fontFamily: "Georgia, serif",
      fontSize: "22px",
      fontStyle: "bold",
      color: active ? "#fff4d6" : "#71717a"
    });

    const status = winner
      ? this.text(language, "赢家", "WINNER", "SIEGER")
      : !active
        ? this.text(language, "离席", "OUT", "RAUS")
        : current
          ? this.text(language, "正在行动", "ACTING", "AM ZUG")
          : this.text(language, "等待", "WAITING", "WARTET");
    this.add.text(x + width - 14, y + 17, status, {
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      color: current || winner ? "#fde68a" : "#a1a1aa"
    }).setOrigin(1, 0);

    this.add.text(
      x + 16,
      y + 56,
      this.text(language, "生命 ", "RESOLVE ", "MUT ")
        + "●".repeat(Math.max(0, health))
        + "○".repeat(Math.max(0, gameState.maxHealth - health)),
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        color: active ? "#fca5a5" : "#71717a"
      }
    );
    this.add.text(
      x + 16,
      y + 84,
      this.text(language, "手牌 ", "CARDS ", "KARTEN ") + cards,
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#d4d4d8"
      }
    );
    this.add.text(
      x + width - 16,
      y + 84,
      this.text(language, "风险 ", "RISK ", "RISIKO ")
        + (risk ? risk.numerator + "/" + risk.denominator : "-"),
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#d4d4d8"
      }
    ).setOrigin(1, 0);
  }

  private drawCenterPanel(
    x: number,
    y: number,
    gameState: LiarsTablePublicState,
    names: Record<string, string>,
    language: SupportedLanguage
  ): void {
    const claim = gameState.tableRank;
    const claimLabel = rankIcon[claim] + " " + rankText[language][claim];
    this.add.text(x, y - 136, this.text(language, "桌面图腾", "TABLE SIGIL", "TISCHSYMBOL"), {
      fontFamily: "Arial, sans-serif",
      fontSize: "15px",
      color: "#b9aa8d"
    }).setOrigin(0.5);
    this.add.text(x, y - 101, claimLabel, {
      fontFamily: "Georgia, serif",
      fontSize: "40px",
      fontStyle: "bold",
      color: "#fde68a"
    }).setOrigin(0.5);

    if (gameState.stage === "reveal" && gameState.lastReveal) {
      this.drawRevealCard(x, y + 12, gameState, names, language);
      return;
    }

    if (gameState.lastPlay) {
      this.drawCardBack(x, y + 20);
      const playerName = names[gameState.lastPlay.playerId] ?? gameState.lastPlay.playerId;
      this.add.text(
        x,
        y + 112,
        this.text(language, playerName + " 的暗牌", "Hidden card from " + playerName, "Verdeckte Karte von " + playerName),
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "17px",
          color: "#d6c8ad"
        }
      ).setOrigin(0.5);
    } else {
      this.add.text(
        x,
        y + 20,
        this.text(language, "等待第一张暗牌", "Waiting for the first hidden card", "Warte auf die erste Karte"),
        {
          fontFamily: "Georgia, serif",
          fontSize: "20px",
          color: "#b9aa8d"
        }
      ).setOrigin(0.5);
    }

    this.add.text(
      x,
      y + 151,
      this.text(language, "第 ", "HAND ", "HAND ") + gameState.handNumber,
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#8f8370"
      }
    ).setOrigin(0.5);
  }

  private drawCardBack(x: number, y: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x7f1d1d, 1);
    graphics.fillRoundedRect(x - 50, y - 68, 100, 136, 12);
    graphics.lineStyle(4, 0xe7c778, 0.9);
    graphics.strokeRoundedRect(x - 50, y - 68, 100, 136, 12);
    graphics.lineStyle(2, 0xe7c778, 0.36);
    graphics.strokeRoundedRect(x - 38, y - 56, 76, 112, 8);
    this.add.text(x, y, "?", {
      fontFamily: "Georgia, serif",
      fontSize: "58px",
      fontStyle: "bold",
      color: "#fde68a"
    }).setOrigin(0.5);
  }

  private drawRevealCard(
    x: number,
    y: number,
    gameState: LiarsTablePublicState,
    names: Record<string, string>,
    language: SupportedLanguage
  ): void {
    const reveal = gameState.lastReveal;
    if (!reveal) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0xfffbeb, 1);
    graphics.fillRoundedRect(x - 54, y - 72, 108, 144, 12);
    graphics.lineStyle(5, reveal.truthful ? 0x16a34a : 0xdc2626, 1);
    graphics.strokeRoundedRect(x - 54, y - 72, 108, 144, 12);
    this.add.text(x, y - 16, rankIcon[reveal.card.rank], {
      fontFamily: "Georgia, serif",
      fontSize: "54px",
      color: "#1c1917"
    }).setOrigin(0.5);
    this.add.text(x, y + 38, rankText[language][reveal.card.rank], {
      fontFamily: "Arial, sans-serif",
      fontSize: "17px",
      color: "#1c1917"
    }).setOrigin(0.5);

    const verdict = reveal.truthful
      ? this.text(language, "宣称属实", "CLAIM TRUE", "ANSAAGE WAHR")
      : this.text(language, "谎言揭穿", "LIE CAUGHT", "LUEGE ENTDECKT");
    const loserName = names[reveal.loserPlayerId] ?? reveal.loserPlayerId;
    const chamber = reveal.chamberResult === "live"
      ? this.text(language, "命中", "HIT", "TREFFER")
      : this.text(language, "空响", "BLANK", "LEER");
    this.add.text(x, y + 100, verdict, {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "19px",
      color: reveal.truthful ? "#86efac" : "#fca5a5"
    }).setOrigin(0.5);
    this.add.text(
      x,
      y + 130,
      loserName + " · " + chamber,
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        color: reveal.chamberResult === "live" ? "#fca5a5" : "#cbd5e1"
      }
    ).setOrigin(0.5);
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
  id: liarsTableManifest.id,
  displayName: liarsTableManifest.displayName,
  sceneKey: liarsTableManifest.hostView,
  scene: LiarsTableHostScene
} as const;
