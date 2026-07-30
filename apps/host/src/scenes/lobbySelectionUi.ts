// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import Phaser from "phaser";
import type { AvailableGameDto, PlayerSnapshot, SupportedLanguage } from "@open-party-lab/protocol";
import { getGameVisual } from "../games/gameVisuals.js";
import { getHostText, type HostText } from "../i18n/hostText.js";
import { drawGameIcon } from "./gameSelectionUi.js";
import {
  resolveEditorialLobbyLayout,
  resolveEditorialRailMetrics,
  type EditorialLobbyLayout
} from "./lobbyLayout.js";

const displayFont = '"Space Grotesk", "Noto Sans SC", "Microsoft YaHei", sans-serif';
const bodyFont = '"Nunito Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif';
const monoFont = '"IBM Plex Mono", "Noto Sans Mono CJK SC", monospace';

const editorialPalette = {
  paper: 0xf4f1ea,
  paperRaised: 0xfbf9f4,
  paperHover: 0xffffff,
  ink: 0x0e151d,
  inkSoft: 0x27313b,
  rail: 0x10171d,
  railSoft: 0x182129,
  railMuted: 0x8d99a5,
  divider: 0xd4cec3,
  dividerDark: 0x36404a,
  cobalt: 0x1767d8,
  danger: 0xc53d3d,
  success: 0x17836d
} as const;

export interface EditorialLobbyOptions {
  joinUrl: string;
  roomCode: string;
  error: string | null;
  players: PlayerSnapshot[];
  games: AvailableGameDto[];
  language: SupportedLanguage;
  scrollY: number;
  qrTextureKey?: string;
  onSelect?: (gameId: string) => void;
}

export interface EditorialLobbyRenderResult {
  contentBottom: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toCssColor(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

function parseColor(input: string | null | undefined, fallback: number): number {
  if (!input) {
    return fallback;
  }

  const parsed = Number.parseInt(input.startsWith("#") ? input.slice(1) : input, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function trimMiddle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const available = Math.max(8, maxLength - 3);
  const left = Math.ceil(available / 2);
  const right = Math.floor(available / 2);
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function fitTextWidth(
  textObject: Phaser.GameObjects.Text,
  maxWidth: number,
  initialSize: number,
  minimumSize: number
): void {
  for (let size = initialSize; size >= minimumSize && textObject.width > maxWidth; size -= 1) {
    textObject.setFontSize(size);
  }
}

function renderCompactRail(
  scene: Phaser.Scene,
  options: EditorialLobbyOptions,
  railHeight: number,
  y: number
): void {
  const { joinUrl, roomCode, players, qrTextureKey, language } = options;
  const text = getHostText(language);
  const width = scene.scale.width;
  const padding = 24;
  const connectedPlayers = players.filter((player) => player.connected).length;

  scene.add.rectangle(0, y, width, railHeight, editorialPalette.rail, 1).setOrigin(0);

  const title = scene.add.text(padding, y + 20, text.lobbyTitle, {
    fontFamily: displayFont,
    fontStyle: "bold",
    fontSize: "32px",
    color: "#f8fafc"
  });
  fitTextWidth(title, Math.max(160, width * 0.56), 32, 24);

  scene.add.text(padding, y + 61, "LAN PARTY HUB", {
    fontFamily: monoFont,
    fontSize: "12px",
    color: "#8d99a5",
    letterSpacing: 1.8
  });

  scene.add.text(padding, y + 102, text.roomCode, {
    fontFamily: bodyFont,
    fontStyle: "bold",
    fontSize: "13px",
    color: "#aeb8c1"
  });
  scene.add.text(padding, y + 121, roomCode, {
    fontFamily: monoFont,
    fontStyle: "bold",
    fontSize: "44px",
    color: "#2f80ed",
    letterSpacing: 2.4
  });

  if (joinUrl) {
    scene.add.text(padding, y + 181, `${text.join}: ${trimMiddle(joinUrl, width < 480 ? 35 : 54)}`, {
      fontFamily: bodyFont,
      fontSize: "13px",
      color: "#60a5fa",
      wordWrap: { width: Math.max(180, width - 154) }
    });
  }

  if (qrTextureKey && scene.textures.exists(qrTextureKey)) {
    const qrSize = 86;
    const qrX = width - qrSize - padding;
    scene.add.rectangle(qrX - 5, y + 92, qrSize + 10, qrSize + 10, 0xffffff, 1).setOrigin(0);
    scene.add.image(qrX, y + 97, qrTextureKey).setOrigin(0).setDisplaySize(qrSize, qrSize);
  }

  scene.add.rectangle(padding, y + railHeight - 66, width - padding * 2, 1, editorialPalette.dividerDark, 1).setOrigin(0);
  scene.add.text(padding, y + railHeight - 49, text.lobbyPlayersTitle, {
    fontFamily: displayFont,
    fontStyle: "bold",
    fontSize: "17px",
    color: "#f8fafc"
  });
  scene.add.text(width - padding, y + railHeight - 49, `${connectedPlayers} ${text.connectedShort}`, {
    fontFamily: monoFont,
    fontStyle: "bold",
    fontSize: "14px",
    color: "#60a5fa"
  }).setOrigin(1, 0);
}

function renderRailPlayerList(
  scene: Phaser.Scene,
  players: PlayerSnapshot[],
  x: number,
  y: number,
  width: number,
  height: number,
  text: HostText
): void {
  if (players.length === 0) {
    const centerX = x + width / 2;
    const countY = y + Math.min(76, height * 0.26);

    scene.add.circle(centerX, countY, 48, editorialPalette.railSoft, 0.82)
      .setStrokeStyle(1, editorialPalette.railMuted, 0.36);
    scene.add.text(centerX, countY - 34, "0", {
      fontFamily: monoFont,
      fontStyle: "bold",
      fontSize: "54px",
      color: "#8d99a5"
    }).setOrigin(0.5, 0);
    scene.add.text(centerX, countY + 66, text.lobbyWaitingFirstPlayer, {
      fontFamily: bodyFont,
      fontSize: "16px",
      color: "#d4dae0",
      align: "center",
      wordWrap: { width: Math.max(150, width - 28) }
    }).setOrigin(0.5, 0);
    return;
  }

  const rowHeight = 42;
  const maxRows = Math.max(1, Math.floor((height - 20) / rowHeight));
  const visiblePlayers = players.slice(0, maxRows);

  visiblePlayers.forEach((player, index) => {
    const rowY = y + index * rowHeight;
    const playerColor = parseColor(player.color, 0x38bdf8);
    const status = player.isReady
      ? text.ready
      : player.connected
        ? text.waiting
        : player.presence === "reconnecting"
          ? text.reconnecting
          : text.offline;

    scene.add.rectangle(x, rowY, width, rowHeight - 8, editorialPalette.railSoft, 0.9).setOrigin(0);
    scene.add.circle(x + 14, rowY + 17, 5, playerColor, 1);
    const playerName = scene.add.text(x + 28, rowY + 8, player.name, {
      fontFamily: bodyFont,
      fontStyle: "bold",
      fontSize: "15px",
      color: "#f8fafc"
    });
    fitTextWidth(playerName, Math.max(70, width - 110), 15, 12);
    scene.add.text(x + width - 10, rowY + 9, status, {
      fontFamily: bodyFont,
      fontSize: "12px",
      color: player.isReady ? "#6ee7b7" : "#aeb8c1"
    }).setOrigin(1, 0);
  });

  const hiddenPlayers = players.length - visiblePlayers.length;
  if (hiddenPlayers > 0) {
    scene.add.text(x, y + visiblePlayers.length * rowHeight, text.morePlayers(hiddenPlayers), {
      fontFamily: bodyFont,
      fontSize: "12px",
      color: "#8d99a5"
    });
  }
}

function renderWideRail(
  scene: Phaser.Scene,
  options: EditorialLobbyOptions,
  railWidth: number
): void {
  const { joinUrl, roomCode, players, qrTextureKey, language } = options;
  const text = getHostText(language);
  const height = scene.scale.height;
  const padding = clamp(railWidth * 0.09, 26, 38);
  const connectedPlayers = players.filter((player) => player.connected).length;
  const metrics = resolveEditorialRailMetrics(height, railWidth);

  scene.add.rectangle(0, 0, railWidth, height, editorialPalette.rail, 1).setOrigin(0);
  scene.add.rectangle(railWidth - 1, 0, 1, height, editorialPalette.dividerDark, 0.72).setOrigin(0);

  const title = scene.add.text(padding, metrics.titleY, text.lobbyTitle, {
    fontFamily: displayFont,
    fontStyle: "bold",
    fontSize: `${metrics.titleSize}px`,
    color: "#f8fafc"
  });
  fitTextWidth(title, railWidth - padding * 2, metrics.titleSize, 34);

  scene.add.text(padding, title.y + title.height + 4, "LAN PARTY HUB", {
    fontFamily: monoFont,
    fontStyle: "bold",
    fontSize: "14px",
    color: "#8d99a5",
    letterSpacing: 2.2
  });

  scene.add.text(padding, metrics.roomLabelY, text.roomCode, {
    fontFamily: bodyFont,
    fontStyle: "bold",
    fontSize: "16px",
    color: "#d4dae0"
  });
  const roomCodeSize = metrics.condensed ? 52 : railWidth >= 350 ? 62 : 54;
  scene.add.text(padding, metrics.roomLabelY + 28, roomCode, {
    fontFamily: monoFont,
    fontStyle: "bold",
    fontSize: `${roomCodeSize}px`,
    color: "#2f80ed",
    letterSpacing: 2.8
  });

  if (joinUrl) {
    const joinText = scene.add.text(padding, metrics.joinY, `${text.join}:  ${trimMiddle(joinUrl, railWidth >= 350 ? 58 : 43)}`, {
      fontFamily: bodyFont,
      fontSize: "13px",
      color: "#60a5fa",
      lineSpacing: 4,
      wordWrap: { width: railWidth - padding * 2, useAdvancedWrap: true }
    });
    fitTextWidth(joinText, railWidth - padding * 2, 13, 11);
  }

  if (qrTextureKey && scene.textures.exists(qrTextureKey)) {
    scene.add.rectangle(padding - 5, metrics.qrY - 5, metrics.qrSize + 10, metrics.qrSize + 10, 0xffffff, 1).setOrigin(0);
    scene.add.image(padding, metrics.qrY, qrTextureKey).setOrigin(0).setDisplaySize(metrics.qrSize, metrics.qrSize);
  }
  scene.add.text(padding + metrics.qrSize + 20, metrics.qrY + 8, text.scanQr, {
    fontFamily: bodyFont,
    fontSize: "13px",
    color: "#d4dae0",
    lineSpacing: 5,
    wordWrap: { width: Math.max(92, railWidth - padding * 2 - metrics.qrSize - 20), useAdvancedWrap: true }
  });

  scene.add.rectangle(padding, metrics.playersTop - 20, railWidth - padding * 2, 1, editorialPalette.dividerDark, 1).setOrigin(0);
  scene.add.text(padding, metrics.playersTop, text.lobbyPlayersTitle, {
    fontFamily: displayFont,
    fontStyle: "bold",
    fontSize: "20px",
    color: "#f8fafc"
  });
  scene.add.text(padding, metrics.playersTop + 31, `${connectedPlayers} ${text.connectedShort}`, {
    fontFamily: monoFont,
    fontStyle: "bold",
    fontSize: "16px",
    color: "#60a5fa"
  });

  const playerListY = metrics.playersTop + 71;
  if (metrics.condensed && players.length === 0) {
    scene.add.text(padding, metrics.playersTop + 62, text.lobbyWaitingFirstPlayer, {
      fontFamily: bodyFont,
      fontSize: "14px",
      color: "#d4dae0",
      wordWrap: { width: railWidth - padding * 2 }
    });
  } else {
    const listHeight = Math.max(44, height - playerListY - metrics.utilitySafeArea);
    renderRailPlayerList(scene, players, padding, playerListY, railWidth - padding * 2, listHeight, text);
  }

  scene.add.rectangle(padding, height - metrics.utilitySafeArea, railWidth - padding * 2, 1, editorialPalette.dividerDark, 1).setOrigin(0);
}

function renderMetaLine(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  color: number,
  width: number,
  fontSize: number
): void {
  scene.add.circle(x + 4, y + 8, 4, color, 1);
  const textObject = scene.add.text(x + 17, y, label, {
    fontFamily: bodyFont,
    fontSize: `${fontSize}px`,
    color: toCssColor(color)
  });
  fitTextWidth(textObject, Math.max(56, width - 17), fontSize, 11);
}

function renderGameCard(
  scene: Phaser.Scene,
  game: AvailableGameDto,
  index: number,
  playerCount: number,
  language: SupportedLanguage,
  x: number,
  y: number,
  width: number,
  height: number,
  onSelect?: (gameId: string) => void
): void {
  const text = getHostText(language);
  const visual = getGameVisual(game.id);
  const estimatedMinutes = Math.max(1, Math.ceil(game.estimatedRoundDurationMs / 60_000));
  const canStart = playerCount >= game.minPlayers && playerCount <= game.maxPlayers;
  const playerLabel = playerCount < game.minPlayers
    ? text.needsPlayers(game.minPlayers)
    : playerCount > game.maxPlayers
      ? text.tooManyPlayers(game.maxPlayers)
      : text.playerRange(game.minPlayers, game.maxPlayers);
  const primaryFocus = index === 0;
  const compact = width < 255;
  const dense = compact || height < 290;
  const padding = compact ? 14 : 20;
  const numberSize = compact ? 55 : dense ? 66 : 82;
  const iconSize = compact ? 74 : dense ? 92 : 108;
  const titleSize = compact ? 22 : dense ? 27 : 30;
  const metaSize = compact ? 12 : dense ? 14 : 15;
  const accent = visual.accent;
  const focusColor = canStart ? accent : editorialPalette.cobalt;

  const surface = scene.add.graphics();
  const drawSurface = (hovered: boolean): void => {
    const visible = hovered || primaryFocus;
    surface.clear();
    surface.fillStyle(hovered ? editorialPalette.paperHover : editorialPalette.paperRaised, visible ? 1 : 0);
    surface.fillRoundedRect(x + 6, y + 6, width - 12, height - 12, 12);

    if (visible) {
      surface.lineStyle(2, focusColor, 1);
      surface.strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, 12);
    }
  };
  drawSurface(false);

  scene.add.text(x + padding, y + (dense ? 20 : 32), String(index + 1), {
    fontFamily: monoFont,
    fontStyle: "bold",
    fontSize: `${numberSize}px`,
    color: toCssColor(accent)
  });

  const iconX = x + Math.min(width - iconSize - padding, compact ? 82 : 112);
  const iconY = y + (dense ? 27 : 40);
  const icon = scene.add.graphics().setPosition(iconX, iconY);
  drawGameIcon(icon, game.id, iconSize, accent, visual.accentSoft);

  const titleY = y + (dense ? 127 : 168);
  const title = scene.add.text(x + padding, titleY, game.displayName, {
    fontFamily: displayFont,
    fontStyle: "bold",
    fontSize: `${titleSize}px`,
    color: "#111820",
    wordWrap: { width: width - padding * 2, useAdvancedWrap: true }
  });
  fitTextWidth(title, width - padding * 2, titleSize, 18);

  const metaY = titleY + Math.min(50, title.height + 21);
  renderMetaLine(scene, x + padding, metaY, text.estimatedMinutes(estimatedMinutes), editorialPalette.inkSoft, width - padding * 2, metaSize);
  renderMetaLine(
    scene,
    x + padding,
    metaY + 31,
    playerLabel,
    canStart ? editorialPalette.success : editorialPalette.danger,
    width - padding * 2,
    metaSize
  );
  renderMetaLine(scene, x + padding, metaY + 62, text.contentScale(game.contentRating), accent, width - padding * 2, metaSize);

  if (canStart) {
    const badgeWidth = compact ? 72 : 88;
    scene.add.rectangle(x + width - badgeWidth - 6, y + 6, badgeWidth, 28, accent, 1).setOrigin(0);
    scene.add.text(x + width - badgeWidth / 2 - 6, y + 11, text.readyToStartTitle, {
      fontFamily: bodyFont,
      fontStyle: "bold",
      fontSize: compact ? "11px" : "12px",
      color: "#ffffff"
    }).setOrigin(0.5, 0);
  }

  const hitZone = scene.add.zone(x, y, width, height).setOrigin(0).setInteractive({ useHandCursor: canStart });
  let pressStart: { x: number; y: number } | null = null;
  hitZone.on("pointerover", () => {
    drawSurface(true);
    icon.setScale(1.035);
  });
  hitZone.on("pointerout", () => {
    drawSurface(false);
    icon.setScale(1);
  });
  hitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
    pressStart = { x: pointer.x, y: pointer.y };
  });
  hitZone.on("pointerup", (pointer: Phaser.Input.Pointer) => {
    const travel = pressStart
      ? Math.hypot(pointer.x - pressStart.x, pointer.y - pressStart.y)
      : Number.POSITIVE_INFINITY;
    pressStart = null;

    if (canStart && travel <= 10) {
      onSelect?.(game.id);
    }
  });
}

function renderMainHeader(
  scene: Phaser.Scene,
  options: EditorialLobbyOptions,
  x: number,
  y: number,
  width: number,
  padding: number,
  showInlineQuickStart: boolean
): void {
  const text = getHostText(options.language);
  const quickStartWidth = showInlineQuickStart ? clamp(width * 0.24, 238, 300) : width - padding * 2;
  const titleWidth = showInlineQuickStart ? width - padding * 3 - quickStartWidth : width - padding * 2;
  const titleSize = width >= 1_080 ? 62 : width >= 760 ? 44 : 35;
  const title = scene.add.text(x + padding, y + 36, text.lobbyCatalogTitle, {
    fontFamily: displayFont,
    fontStyle: "bold",
    fontSize: `${titleSize}px`,
    color: "#101820"
  });
  fitTextWidth(title, titleWidth, titleSize, 27);

  scene.add.text(x + padding, y + 122, text.lobbyCatalogShortcut, {
    fontFamily: bodyFont,
    fontStyle: "bold",
    fontSize: width >= 760 ? "22px" : "17px",
    color: "#27313b"
  });

  const quickStartX = showInlineQuickStart ? x + width - padding - quickStartWidth : x + padding;
  const quickStartY = showInlineQuickStart ? y + 46 : y + 153;
  scene.add.rectangle(quickStartX, quickStartY, 5, 30, editorialPalette.cobalt, 1).setOrigin(0);
  scene.add.text(quickStartX + 16, quickStartY - 1, text.quickStartTitle, {
    fontFamily: displayFont,
    fontStyle: "bold",
    fontSize: "21px",
    color: "#101820"
  });
  const quickLines = options.error
    ? [...text.quickStartLines, `${text.errorLabel}: ${options.error}`]
    : text.quickStartLines;
  scene.add.text(quickStartX + 16, quickStartY + 42, quickLines.join("\n"), {
    fontFamily: bodyFont,
    fontSize: width < 500 ? "14px" : "15px",
    color: options.error ? "#9f2f2f" : "#27313b",
    lineSpacing: 5,
    wordWrap: { width: Math.max(180, quickStartWidth - 16), useAdvancedWrap: true }
  });

}

function renderMainCatalog(
  scene: Phaser.Scene,
  options: EditorialLobbyOptions,
  layout: EditorialLobbyLayout,
  contentTop: number
): void {
  const { mainX: x, mainWidth: width, padding, gridTop, columns, rows, cardHeight, cardWidth } = layout;
  renderMainHeader(scene, options, x, contentTop, width, padding, layout.showInlineQuickStart);
  const gridY = contentTop + gridTop;

  options.games.forEach((game, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    renderGameCard(
      scene,
      game,
      index,
      options.players.length,
      options.language,
      x + padding + column * cardWidth,
      gridY + row * cardHeight,
      cardWidth,
      cardHeight,
      options.onSelect
    );
  });

  const dividers = scene.add.graphics();
  dividers.lineStyle(1, editorialPalette.divider, 1);
  for (let column = 1; column < columns; column += 1) {
    const dividerX = x + padding + column * cardWidth;
    dividers.lineBetween(dividerX, gridY + 16, dividerX, gridY + rows * cardHeight - 16);
  }
  for (let row = 1; row < rows; row += 1) {
    const dividerY = gridY + row * cardHeight;
    dividers.lineBetween(x + padding + 12, dividerY, x + width - padding - 12, dividerY);
  }

  if (options.games.length === 0) {
    scene.add.text(x + padding, gridY + 36, getHostText(options.language).noGame, {
      fontFamily: bodyFont,
      fontSize: "20px",
      color: "#64707b"
    });
  }

}

export function renderEditorialLobby(
  scene: Phaser.Scene,
  options: EditorialLobbyOptions
): EditorialLobbyRenderResult {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const layout = resolveEditorialLobbyLayout(width, height, options.games.length);

  scene.cameras.main.setBackgroundColor("#f4f1ea");
  scene.add.rectangle(0, 0, width, height, editorialPalette.paper, 1).setOrigin(0);

  if (layout.stacked) {
    const contentTop = -options.scrollY;
    renderCompactRail(scene, options, layout.railHeight, contentTop);
    renderMainCatalog(scene, options, layout, contentTop + layout.mainTop);
    return { contentBottom: layout.contentBottom };
  }

  renderWideRail(scene, options, layout.railWidth);
  renderMainCatalog(scene, options, layout, -options.scrollY);

  return { contentBottom: layout.contentBottom };
}
