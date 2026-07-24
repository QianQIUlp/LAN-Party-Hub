import type Phaser from "phaser";
import type {
  BullshitCard,
  BullshitPublicResolution,
  BullshitPublicState,
  BullshitSuit
} from "../protocol.js";

type Language = "zh-CN" | "en" | "de";

const suitSymbols: Record<BullshitSuit, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠"
};

const palette = {
  background: 0x071a16,
  table: 0x0b3b2e,
  tableEdge: 0x145c47,
  surface: 0x10231f,
  text: "#f8fafc",
  muted: "#a7c7bd",
  accent: 0xf4c95d,
  accentText: "#f4c95d",
  dangerText: "#fca5a5",
  success: 0x22c55e,
  successText: "#86efac",
  cardBack: 0x312e81,
  cardBackLine: 0x818cf8
} as const;

function textFor(language: Language) {
  if (language === "zh-CN") {
    return {
      title: "吹牛牌",
      waiting: "等待出牌",
      current: (name: string) => `轮到 ${name}`,
      claim: "宣称",
      lastPlay: (name: string, count: number, rank: string) => `${name} × ${count} · ${rank}`,
      pending: (name: string) => `${name} · 最后一手待确认`,
      truthful: "真话",
      bluff: "抓到了！",
      takesPile: (name: string, count: number) => `${name} 收下 ${count} 张`,
      winner: (name: string) => `${name} 获胜！`,
      pass: "已过",
      hiddenPlayers: (count: number) => `另有 ${count} 名玩家`
    };
  }

  if (language === "en") {
    return {
      title: "Bullshit",
      waiting: "Waiting for a play",
      current: (name: string) => `${name}'s turn`,
      claim: "Claim",
      lastPlay: (name: string, count: number, rank: string) => `${name} × ${count} · ${rank}`,
      pending: (name: string) => `${name} · final play pending`,
      truthful: "TRUTH",
      bluff: "CAUGHT!",
      takesPile: (name: string, count: number) => `${name} takes ${count}`,
      winner: (name: string) => `${name} wins!`,
      pass: "passed",
      hiddenPlayers: (count: number) => `${count} more players`
    };
  }

  return {
    title: "Bullshit",
    waiting: "Warte auf einen Zug",
    current: (name: string) => `${name} ist dran`,
    claim: "Ansage",
    lastPlay: (name: string, count: number, rank: string) => `${name} × ${count} · ${rank}`,
    pending: (name: string) => `${name} · letzter Zug offen`,
    truthful: "EHRLICH",
    bluff: "ERWISCHT!",
    takesPile: (name: string, count: number) => `${name} nimmt ${count}`,
    winner: (name: string) => `${name} gewinnt!`,
    pass: "gepasst",
    hiddenPlayers: (count: number) => `${count} weitere Spieler`
  };
}

function addCenteredText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number,
  color: string = palette.text,
  weight = "600"
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: `${size}px`,
    fontStyle: weight === "700" ? "bold" : "normal",
    color,
    align: "center",
    wordWrap: { width: Math.max(280, scene.scale.width - 120) }
  }).setOrigin(0.5);
}

function drawCardBack(scene: Phaser.Scene, x: number, y: number, width: number, height: number): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0xf8fafc, 1);
  graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 10);
  graphics.fillStyle(palette.cardBack, 1);
  graphics.fillRoundedRect(x - width / 2 + 5, y - height / 2 + 5, width - 10, height - 10, 7);
  graphics.lineStyle(2, palette.cardBackLine, 0.72);
  graphics.strokeRoundedRect(x - width / 2 + 11, y - height / 2 + 11, width - 22, height - 22, 5);
  graphics.fillStyle(palette.cardBackLine, 0.42);
  for (let row = y - height / 2 + 18; row <= y + height / 2 - 18; row += 12) {
    for (let column = x - width / 2 + 18; column <= x + width / 2 - 18; column += 12) {
      graphics.fillCircle(column, row, 1.6);
    }
  }
}

function drawCardFace(scene: Phaser.Scene, card: BullshitCard, x: number, y: number, width: number, height: number): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0xf8fafc, 1);
  graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 9);
  graphics.lineStyle(2, 0xcbd5e1, 1);
  graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 9);
  const red = card.suit === "diamonds" || card.suit === "hearts";
  const color = red ? "#dc2626" : "#111827";
  scene.add.text(x - width / 2 + 8, y - height / 2 + 6, `${card.rank}\n${suitSymbols[card.suit]}`, {
    fontFamily: "Georgia, serif",
    fontSize: `${Math.max(14, Math.floor(width * 0.23))}px`,
    color,
    align: "center",
    lineSpacing: -4
  });
  scene.add.text(x, y + 4, suitSymbols[card.suit], {
    fontFamily: "Georgia, serif",
    fontSize: `${Math.max(24, Math.floor(width * 0.48))}px`,
    color
  }).setOrigin(0.5);
}

function drawResolution(
  scene: Phaser.Scene,
  resolution: BullshitPublicResolution,
  language: Language,
  centerY: number
): void {
  const text = textFor(language);
  const cards = resolution.revealedCards;
  const maxVisible = Math.min(cards.length, 8);
  const availableWidth = Math.min(scene.scale.width - 160, 900);
  const cardWidth = Math.min(92, Math.max(54, availableWidth / Math.max(4, maxVisible) - 12));
  const cardHeight = cardWidth * 1.38;
  const gap = Math.min(cardWidth + 10, availableWidth / Math.max(1, maxVisible));
  const startX = scene.scale.width / 2 - ((maxVisible - 1) * gap) / 2;

  addCenteredText(
    scene,
    scene.scale.width / 2,
    centerY - cardHeight / 2 - 36,
    resolution.truthful ? text.truthful : text.bluff,
    24,
    resolution.truthful ? palette.successText : palette.dangerText,
    "700"
  );

  cards.slice(0, maxVisible).forEach((card, index) => {
    drawCardFace(scene, card, startX + index * gap, centerY, cardWidth, cardHeight);
  });

  if (cards.length > maxVisible) {
    addCenteredText(scene, startX + (maxVisible - 1) * gap + cardWidth * 0.8, centerY, `+${cards.length - maxVisible}`, 22);
  }

  addCenteredText(
    scene,
    scene.scale.width / 2,
    centerY + cardHeight / 2 + 30,
    text.takesPile(resolution.recipientName, resolution.pileSize),
    20,
    palette.muted
  );
}

function drawPile(scene: Phaser.Scene, state: BullshitPublicState, language: Language, centerY: number): void {
  const text = textFor(language);
  const pileCount = state.pileCount ?? 0;
  const visibleCards = Math.min(6, Math.max(1, pileCount));
  const cardWidth = Math.min(126, scene.scale.width * 0.085);
  const cardHeight = cardWidth * 1.38;

  if (pileCount === 0) {
    const outline = scene.add.graphics();
    outline.lineStyle(3, palette.tableEdge, 0.9);
    outline.strokeRoundedRect(
      scene.scale.width / 2 - cardWidth / 2,
      centerY - cardHeight / 2,
      cardWidth,
      cardHeight,
      12
    );
  } else {
    for (let index = 0; index < visibleCards; index += 1) {
      const offset = (index - (visibleCards - 1) / 2) * 5;
      drawCardBack(scene, scene.scale.width / 2 + offset, centerY + offset * 0.45, cardWidth, cardHeight);
    }
  }

  addCenteredText(
    scene,
    scene.scale.width / 2,
    centerY,
    String(pileCount),
    Math.max(28, Math.floor(cardWidth * 0.38)),
    pileCount > 0 ? palette.text : palette.muted,
    "700"
  );
  addCenteredText(
    scene,
    scene.scale.width / 2,
    centerY + cardHeight / 2 + 28,
    `${text.claim}: ${state.activeRank ?? "–"}`,
    22,
    palette.accentText,
    "700"
  );
}

function drawPlayers(scene: Phaser.Scene, state: BullshitPublicState, language: Language, top: number): void {
  const text = textFor(language);
  const players = state.players ?? [];
  if (players.length === 0) {
    return;
  }

  const availableHeight = Math.max(90, scene.scale.height - top - 26);
  const maxRows = Math.max(2, Math.floor(availableHeight / 44));
  const columns = Math.max(1, Math.ceil(players.length / maxRows));
  const visibleColumns = Math.min(columns, 8);
  const visibleCount = Math.min(players.length, visibleColumns * maxRows);
  const visiblePlayers = players.slice(0, visibleCount);
  const gap = 10;
  const horizontalPadding = 32;
  const columnWidth = (scene.scale.width - horizontalPadding * 2 - gap * (visibleColumns - 1)) / visibleColumns;
  const rowHeight = Math.min(42, availableHeight / Math.ceil(visiblePlayers.length / visibleColumns));

  visiblePlayers.forEach((player, index) => {
    const column = index % visibleColumns;
    const row = Math.floor(index / visibleColumns);
    const x = horizontalPadding + column * (columnWidth + gap);
    const y = top + row * rowHeight;
    const current = player.playerId === state.currentTurnPlayerId;
    const pending = player.playerId === state.pendingWinnerPlayerId;
    const graphics = scene.add.graphics();
    graphics.fillStyle(current ? 0x1d4f3e : palette.surface, 0.96);
    graphics.fillRoundedRect(x, y, columnWidth, Math.max(30, rowHeight - 5), 9);
    graphics.lineStyle(2, pending ? palette.accent : current ? palette.success : palette.tableEdge, current || pending ? 1 : 0.55);
    graphics.strokeRoundedRect(x, y, columnWidth, Math.max(30, rowHeight - 5), 9);

    const suffix = player.hasPassed ? ` · ${text.pass}` : "";
    scene.add.text(x + 12, y + Math.max(30, rowHeight - 5) / 2, `${player.playerName}${suffix}`, {
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: `${Math.max(12, Math.min(18, rowHeight * 0.42))}px`,
      color: current ? palette.successText : palette.text
    }).setOrigin(0, 0.5);
    scene.add.text(x + columnWidth - 12, y + Math.max(30, rowHeight - 5) / 2, `${player.cardCount}`, {
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: `${Math.max(13, Math.min(20, rowHeight * 0.46))}px`,
      fontStyle: "bold",
      color: pending ? palette.accentText : palette.text
    }).setOrigin(1, 0.5);
  });

  if (visibleCount < players.length) {
    scene.add.text(scene.scale.width - 32, scene.scale.height - 12, text.hiddenPlayers(players.length - visibleCount), {
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: "14px",
      color: palette.muted
    }).setOrigin(1, 1);
  }
}

export function renderBullshitState(
  scene: Phaser.Scene,
  state: BullshitPublicState,
  language: Language = "zh-CN"
): void {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const text = textFor(language);
  const background = scene.add.graphics();
  background.fillStyle(palette.background, 1);
  background.fillRect(0, 0, width, height);
  background.fillStyle(palette.table, 1);
  background.fillRoundedRect(20, 18, width - 40, height - 36, 32);
  background.lineStyle(3, palette.tableEdge, 0.85);
  background.strokeRoundedRect(20, 18, width - 40, height - 36, 32);

  addCenteredText(scene, width / 2, 60, state.winnerName ? text.winner(state.winnerName) : text.title, 42, palette.text, "700");

  const turnLine = state.winnerName
    ? text.winner(state.winnerName)
    : state.currentTurnPlayerName
      ? text.current(state.currentTurnPlayerName)
      : text.waiting;
  addCenteredText(scene, width / 2, 108, turnLine, 24, state.winnerName ? palette.accentText : palette.text);

  if (state.pendingWinnerName && !state.winnerName) {
    addCenteredText(scene, width / 2, 150, text.pending(state.pendingWinnerName), 18, palette.accentText, "700");
  } else if (state.lastPlay && !state.lastResolution) {
    addCenteredText(
      scene,
      width / 2,
      150,
      text.lastPlay(state.lastPlay.playerName, state.lastPlay.count, state.lastPlay.claimedRank),
      18,
      palette.muted
    );
  }

  const playerAreaTop = Math.max(430, height * 0.62);
  const centerY = Math.min(playerAreaTop - 120, Math.max(270, height * 0.38));
  if (state.lastResolution) {
    drawResolution(scene, state.lastResolution, language, centerY);
  } else {
    drawPile(scene, state, language, centerY);
  }

  drawPlayers(scene, state, language, playerAreaTop);
}
