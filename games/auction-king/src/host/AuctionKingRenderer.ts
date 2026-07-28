import Phaser from "phaser";
import type { SupportedLanguage } from "@open-party-lab/game-core";
import type {
  AuctionKingPublicState,
  AuctionRoundResult,
  PublicAuctionItem
} from "../protocol.js";
import { rarityColors, rarityLabels } from "../server/auctionItems.js";
import {
  hasTexture,
  getCategoryTexture,
  getRarityFrameTexture,
  TEXTURE_KEYS
} from "./textures.js";

/* ────────────────────────── Types ────────────────────────── */

interface AuctionKingRenderState extends AuctionKingPublicState {
  message?: string;
}

interface PlayerProgress {
  playerId: string;
  name: string;
  color: string;
  gold: number;
  hasBid: boolean;
}

/* ────────────────────────── Theme ────────────────────────── */

const C = {
  bgTop: 0x0a0e27,
  bgBottom: 0x0f172a,
  bgGlow: 0x1e293b,
  cardBg: 0x111827,
  cardInner: 0x1e293b,
  text: "#f8fafc",
  textDim: "#cbd5e1",
  textMuted: "#94a3b8",
  gold: "#f59e0b",
  goldBright: "#fbbf24",
  goldNum: 0xf59e0b,
  bid: "#38bdf8",
  win: "#34d399",
  loss: "#f87171",
  panelBg: 0x0f172a,
  panelBorder: 0x334155
} as const;

const FONT = "Trebuchet MS, 'Noto Sans SC', Arial, sans-serif";

/* ────────────────────────── Helpers ────────────────────────── */

function hexToPhaser(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

function drawGradientBg(scene: Phaser.Scene, W: number, H: number): void {
  const g = scene.add.graphics();
  // Main vertical gradient
  g.fillGradientStyle(C.bgTop, C.bgTop, C.bgBottom, C.bgBottom, 1);
  g.fillRect(0, 0, W, H);
  // Center radial-ish glow
  g.fillGradientStyle(C.bgGlow, C.bgGlow, C.bgTop, C.bgTop, 0.35);
  const glowW = Math.min(W * 0.7, 900);
  const glowH = Math.min(H * 0.5, 400);
  g.fillRect((W - glowW) / 2, H * 0.15, glowW, glowH);
  g.setDepth(-100);
}

function drawImageOrGradientBg(
  scene: Phaser.Scene,
  textureKey: string,
  W: number,
  H: number
): void {
  if (hasTexture(scene, textureKey)) {
    const img = scene.add.image(W / 2, H / 2, textureKey);
    const scale = Math.max(W / img.width, H / img.height);
    img.setScale(scale).setDepth(-100);
    // Dark overlay for readability
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x0a0e27, 0.55);
    overlay.fillRect(0, 0, W, H);
    overlay.setDepth(-99);
  } else {
    drawGradientBg(scene, W, H);
  }
}

function drawRoundedPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fillAlpha: number
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(C.cardBg, fillAlpha);
  g.fillRoundedRect(x, y, w, h, radius);
  return g;
}

function drawGlowBorder(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  colorHex: string,
  intensity: number
): Phaser.GameObjects.Graphics {
  const colorNum = hexToPhaser(colorHex);
  const g = scene.add.graphics();
  // Outer glow (wider, low alpha)
  g.fillStyle(colorNum, 0.08 * intensity);
  g.fillRoundedRect(x - 8, y - 8, w + 16, h + 16, radius + 8);
  // Middle glow
  g.fillStyle(colorNum, 0.15 * intensity);
  g.fillRoundedRect(x - 4, y - 4, w + 8, h + 8, radius + 4);
  // Solid border
  g.lineStyle(3, colorNum, 0.9);
  g.strokeRoundedRect(x, y, w, h, radius);
  return g;
}

function drawStageBanner(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  text: string,
  colorHex: string
): void {
  const colorNum = hexToPhaser(colorHex);
  const g = scene.add.graphics();
  g.fillStyle(colorNum, 0.15);
  g.fillRoundedRect(x - w / 2, y, w, 32, 16);
  g.lineStyle(1, colorNum, 0.4);
  g.strokeRoundedRect(x - w / 2, y, w, 32, 16);

  scene.add
    .text(x, y + 16, text, {
      fontFamily: FONT,
      fontSize: "15px",
      color: colorHex,
      fontStyle: "bold"
    })
    .setOrigin(0.5, 0.5);
}

function drawCircularTimer(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  radius: number,
  remaining: number,
  total: number
): void {
  const g = scene.add.graphics();
  const progress = total > 0 ? Math.max(0, remaining / total) : 0;
  const isUrgent = remaining <= 5;
  const isWarning = remaining <= 10 && remaining > 5;

  const ringColor = isUrgent ? 0xef4444 : isWarning ? 0xf59e0b : 0x22d3ee;
  const bgColor = 0x1e293b;

  // Background ring
  g.lineStyle(6, bgColor, 0.8);
  g.beginPath();
  g.arc(cx, cy, radius, 0, Math.PI * 2);
  g.strokePath();

  // Progress arc
  if (progress > 0) {
    g.lineStyle(6, ringColor, 1);
    g.beginPath();
    g.arc(
      cx,
      cy,
      radius,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * progress,
      false
    );
    g.strokePath();
  }

  // Time text
  const timeColor = isUrgent ? "#f87171" : isWarning ? "#fbbf24" : "#22d3ee";
  scene.add
    .text(cx, cy, `${Math.ceil(remaining)}`, {
      fontFamily: FONT,
      fontSize: `${Math.floor(radius * 0.9)}px`,
      color: timeColor,
      fontStyle: "bold"
    })
    .setOrigin(0.5, 0.5);

  // Pulse effect for urgent
  if (isUrgent && remaining > 0) {
    const pulse = scene.add.graphics();
    pulse.lineStyle(2, 0xef4444, 0.4);
    pulse.beginPath();
    pulse.arc(cx, cy, radius + 6, 0, Math.PI * 2);
    pulse.strokePath();
    scene.tweens.add({
      targets: pulse,
      alpha: 0,
      scale: 1.3,
      duration: 800,
      repeat: -1,
      ease: "Cubic.easeOut"
    });
  }
}

function drawCategoryIllustration(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  size: number,
  category: string,
  rarityColorHex: string
): void {
  const texKey = getCategoryTexture(category);
  if (texKey && hasTexture(scene, texKey)) {
    const img = scene.add.image(cx, cy, texKey);
    const scale = Math.min(size / img.width, size / img.height);
    img.setScale(scale).setDepth(1);
    // Subtle glow behind image
    const glow = scene.add.graphics();
    const colorNum = hexToPhaser(rarityColorHex);
    glow.fillStyle(colorNum, 0.12);
    glow.fillCircle(cx, cy, size * 0.6);
    glow.setDepth(0);
  } else {
    // Fallback: decorative gradient circle with category initial
    const colorNum = hexToPhaser(rarityColorHex);
    const g = scene.add.graphics();
    // Outer glow
    g.fillStyle(colorNum, 0.1);
    g.fillCircle(cx, cy, size * 0.62);
    // Inner circle
    g.fillStyle(C.cardInner, 0.9);
    g.fillCircle(cx, cy, size * 0.5);
    // Border ring
    g.lineStyle(2, colorNum, 0.6);
    g.strokeCircle(cx, cy, size * 0.5);

    // Category character
    const initials: Record<string, string> = {
      "古董": "古",
      "珠宝": "珠",
      "艺术品": "艺",
      "奇物": "奇"
    };
    scene.add
      .text(cx, cy, initials[category] ?? "?", {
        fontFamily: FONT,
        fontSize: `${Math.floor(size * 0.5)}px`,
        color: rarityColorHex,
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0.5);
  }
}

/* ────────────────────────── Main Render ────────────────────────── */

export function renderAuctionKingState(
  scene: Phaser.Scene,
  state: AuctionKingRenderState,
  playerNames: Record<string, string>,
  language?: SupportedLanguage
): void {
  const zh = language === "zh-CN";
  const en = language === "en";
  const W = scene.scale.width;
  const H = scene.scale.height;

  const stage = state.stage;
  const round = state.currentRound;
  const total = state.totalRounds;

  // Background
  if (stage === "finished") {
    drawImageOrGradientBg(scene, TEXTURE_KEYS.bgScoreboard, W, H);
  } else {
    drawImageOrGradientBg(scene, TEXTURE_KEYS.bgAuctionHall, W, H);
  }

  // Title bar
  drawTitleBar(scene, W, zh, en, hasTexture(scene, TEXTURE_KEYS.iconGavel));

  // Round indicator
  const roundLabel = zh
    ? `第 ${round} / ${total} 轮`
    : en
    ? `Round ${round} / ${total}`
    : `Runde ${round} / ${total}`;
  scene.add
    .text(W / 2, 88, roundLabel, {
      fontFamily: FONT,
      fontSize: "18px",
      color: C.textMuted
    })
    .setOrigin(0.5, 0);

  // Timer
  if (state.stageEndsAt !== null) {
    const remaining = Math.max(0, (state.stageEndsAt - Date.now()) / 1000);
    const stageDurations: Record<string, number> = {
      appraisal: 10,
      bidding: 15,
      reveal: 5
    };
    const totalDuration = stageDurations[stage] ?? 15;
    drawCircularTimer(scene, W - 70, 60, 28, remaining, totalDuration);
  }

  // Stage-specific rendering
  if (stage === "finished") {
    renderScoreboard(scene, state, playerNames, W, H, zh, en);
    return;
  }

  // Stage banner
  const stageInfo = getStageInfo(stage, zh, en);
  drawStageBanner(scene, W / 2, 118, 200, stageInfo.label, stageInfo.color);

  // Item card
  const item = state.currentItem;
  if (item) {
    renderItemCard(scene, item, stage, W, H, zh, en, language);
  }

  // Player panels
  const progress = state.playerProgress;
  renderPlayerPanel(scene, progress, stage, state, W, H, zh, en, playerNames);

  // Message
  if (state.message) {
    scene.add
      .text(W / 2, H - 30, state.message, {
        fontFamily: FONT,
        fontSize: "16px",
        color: C.text,
        align: "center",
        wordWrap: { width: W - 120 }
      })
      .setOrigin(0.5, 1);
  }
}

/* ────────────────────────── Title Bar ────────────────────────── */

function drawTitleBar(
  scene: Phaser.Scene,
  W: number,
  zh: boolean,
  en: boolean,
  hasGavel: boolean
): void {
  const title = zh ? "即刻落槌" : en ? "Instant Gavel" : "Hammer";

  // Gavel icon
  let titleX = W / 2;
  if (hasGavel) {
    const icon = scene.add.image(W / 2 - 110, 42, TEXTURE_KEYS.iconGavel);
    icon.setScale(48 / icon.width).setOrigin(0.5, 0.5);
    titleX = W / 2 + 25;
  }

  scene.add
    .text(titleX, 42, title, {
      fontFamily: FONT,
      fontSize: "38px",
      color: C.text,
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 4
    })
    .setOrigin(0.5, 0.5);

  // Decorative line
  const line = scene.add.graphics();
  line.lineStyle(1, C.goldNum, 0.3);
  line.beginPath();
  line.moveTo(W * 0.2, 80);
  line.lineTo(W * 0.8, 80);
  line.strokePath();

  // Decorative dots
  const dotG = scene.add.graphics();
  dotG.fillStyle(C.goldNum, 0.5);
  dotG.fillCircle(W * 0.2, 80, 3);
  dotG.fillCircle(W * 0.8, 80, 3);
}

/* ────────────────────────── Stage Info ────────────────────────── */

function getStageInfo(stage: string, zh: boolean, en: boolean): { label: string; color: string } {
  switch (stage) {
    case "appraisal":
      return {
        label: zh ? "🔍 鉴定期" : en ? "🔍 Appraisal" : "🔍 Schaetzung",
        color: "#22d3ee"
      };
    case "bidding":
      return {
        label: zh ? "🔨 出价期" : en ? "🔨 Bidding" : "🔨 Gebot",
        color: "#f59e0b"
      };
    case "reveal":
      return {
        label: zh ? "✨ 揭晓" : en ? "✨ Reveal" : "✨ Aufdeckung",
        color: "#a855f7"
      };
    default:
      return { label: stage, color: "#94a3b8" };
  }
}

/* ────────────────────────── Item Card ────────────────────────── */

function renderItemCard(
  scene: Phaser.Scene,
  item: PublicAuctionItem,
  stage: string,
  W: number,
  H: number,
  zh: boolean,
  en: boolean,
  language?: SupportedLanguage
): void {
  const cardW = Math.min(520, W - 400);
  const cardH = 340;
  const cardX = (W - cardW) / 2 - 40;
  const cardY = 160;

  const rarityColor = rarityColors[item.rarity] ?? "#94a3b8";
  const rarityLabel = language
    ? (rarityLabels[item.rarity]?.[language] ?? item.rarity)
    : item.rarity;

  // Try frame texture overlay
  const frameTex = getRarityFrameTexture(item.rarity);

  // Glow border
  drawGlowBorder(scene, cardX, cardY, cardW, cardH, 16, rarityColor, 1);

  // Card background
  const bg = scene.add.graphics();
  bg.fillStyle(C.cardBg, 0.95);
  bg.fillRoundedRect(cardX, cardY, cardW, cardH, 16);
  // Inner panel
  bg.fillStyle(C.cardInner, 0.5);
  bg.fillRoundedRect(cardX + 12, cardY + 12, cardW - 24, cardH - 24, 12);

  // Category illustration area
  const illustSize = 110;
  const illustCX = cardX + cardW / 2;
  const illustCY = cardY + 75;
  drawCategoryIllustration(scene, illustCX, illustCY, illustSize, item.category, rarityColor);

  // Item name
  scene.add
    .text(cardX + cardW / 2, cardY + 155, item.name, {
      fontFamily: FONT,
      fontSize: "24px",
      color: C.text,
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: cardW - 40 }
    })
    .setOrigin(0.5, 0);

  // Category | Rarity badge
  const badgeY = cardY + 195;
  const badgeText = `${item.category}  |  ${rarityLabel}`;
  const badgeColor = rarityColor;
  const badgeG = scene.add.graphics();
  const badgeW = 200;
  badgeG.fillStyle(hexToPhaser(badgeColor), 0.15);
  badgeG.fillRoundedRect(cardX + cardW / 2 - badgeW / 2, badgeY, badgeW, 26, 13);
  badgeG.lineStyle(1, hexToPhaser(badgeColor), 0.4);
  badgeG.strokeRoundedRect(cardX + cardW / 2 - badgeW / 2, badgeY, badgeW, 26, 13);
  scene.add
    .text(cardX + cardW / 2, badgeY + 13, badgeText, {
      fontFamily: FONT,
      fontSize: "14px",
      color: badgeColor,
      fontStyle: "bold"
    })
    .setOrigin(0.5, 0.5);

  // Clues
  const clueStartY = cardY + 232;
  item.clues.forEach((clue, index) => {
    const clueY = clueStartY + index * 30;
    // Number circle
    const numG = scene.add.graphics();
    numG.fillStyle(hexToPhaser(rarityColor), 0.2);
    numG.fillCircle(cardX + 30, clueY + 10, 11);
    numG.lineStyle(1, hexToPhaser(rarityColor), 0.5);
    numG.strokeCircle(cardX + 30, clueY + 10, 11);
    scene.add
      .text(cardX + 30, clueY + 10, `${index + 1}`, {
        fontFamily: FONT,
        fontSize: "12px",
        color: rarityColor,
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0.5);
    // Clue text
    scene.add
      .text(cardX + 50, clueY + 10, clue, {
        fontFamily: FONT,
        fontSize: "14px",
        color: C.textDim,
        wordWrap: { width: cardW - 80 }
      })
      .setOrigin(0, 0.5);
  });

  // Value display
  if (item.trueValue !== null) {
    const valueY = cardY + cardH - 22;
    // Glow background for revealed value
    const valG = scene.add.graphics();
    valG.fillStyle(C.goldNum, 0.1);
    valG.fillRoundedRect(cardX + cardW / 2 - 120, valueY - 18, 240, 36, 18);
    const valueLabel = zh
      ? `💰 真实价值: ${item.trueValue}`
      : en
      ? `💰 True value: ${item.trueValue}`
      : `💰 Wert: ${item.trueValue}`;
    scene.add
      .text(cardX + cardW / 2, valueY, valueLabel, {
        fontFamily: FONT,
        fontSize: "20px",
        color: C.goldBright,
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0.5);
  } else if (stage === "appraisal" || stage === "bidding") {
    const valueY = cardY + cardH - 22;
    const mysteryText = zh ? "❓ 价值未知 ❓" : en ? "❓ Value unknown ❓" : "❓ Wert unbekannt ❓";
    scene.add
      .text(cardX + cardW / 2, valueY, mysteryText, {
        fontFamily: FONT,
        fontSize: "18px",
        color: "#475569",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0.5);
  }

  // Frame texture overlay (if available)
  if (frameTex && hasTexture(scene, frameTex)) {
    const frame = scene.add.image(cardX + cardW / 2, cardY + cardH / 2, frameTex);
    const scale = Math.max(cardW / frame.width, cardH / frame.height);
    frame.setScale(scale).setDepth(5);
  }
}

/* ────────────────────────── Player Panel ────────────────────────── */

function renderPlayerPanel(
  scene: Phaser.Scene,
  progress: PlayerProgress[],
  stage: string,
  state: AuctionKingRenderState,
  W: number,
  H: number,
  zh: boolean,
  en: boolean,
  playerNames: Record<string, string>
): void {
  if (progress.length === 0) return;

  const panelX = W - 320;
  const panelY = 160;
  const panelW = 280;
  const panelH = Math.min(progress.length * 90 + 40, H - panelY - 60);

  // Panel background
  const panelBg = scene.add.graphics();
  panelBg.fillStyle(C.panelBg, 0.85);
  panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 14);
  panelBg.lineStyle(1, C.panelBorder, 0.5);
  panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 14);

  // Panel title
  scene.add
    .text(panelX + panelW / 2, panelY + 20, zh ? "竞拍者" : en ? "Bidders" : "Bieter", {
      fontFamily: FONT,
      fontSize: "14px",
      color: C.textMuted,
      fontStyle: "bold"
    })
    .setOrigin(0.5, 0.5);

  // Player cards
  const cardH = 80;
  const cardStartY = panelY + 40;
  const cardPadding = 8;

  progress.forEach((player, index) => {
    const y = cardStartY + index * (cardH + cardPadding);
    const x = panelX + 12;
    const w = panelW - 24;
    const colorNum = hexToPhaser(player.color);

    // Player card background
    const pBg = scene.add.graphics();
    pBg.fillStyle(C.cardInner, 0.8);
    pBg.fillRoundedRect(x, y, w, cardH, 10);
    // Left accent bar
    pBg.fillStyle(colorNum, 0.8);
    pBg.fillRect(x, y, 4, cardH);
    // Border
    pBg.lineStyle(1, colorNum, 0.3);
    pBg.strokeRoundedRect(x, y, w, cardH, 10);

    // Player name
    scene.add
      .text(x + 16, y + 12, player.name, {
        fontFamily: FONT,
        fontSize: "16px",
        color: C.text,
        fontStyle: "bold"
      })
      .setOrigin(0, 0);

    // Gold display
    const goldIcon = hasTexture(scene, TEXTURE_KEYS.iconGold)
      ? "💰 "
      : "";
    scene.add
      .text(x + 16, y + 34, `${goldIcon}${player.gold}`, {
        fontFamily: FONT,
        fontSize: "20px",
        color: C.gold
      })
      .setOrigin(0, 0);

    // Bid status
    const bidText = getBidStatusText(stage, player, state, zh, en);
    if (bidText) {
      const bidColor = getBidStatusColor(stage, player, state, zh, en);
      scene.add
        .text(x + w - 12, y + cardH - 12, bidText, {
          fontFamily: FONT,
          fontSize: "13px",
          color: bidColor,
          fontStyle: "bold"
        })
        .setOrigin(1, 1);
    }
  });
}

function getBidStatusText(
  stage: string,
  player: PlayerProgress,
  state: AuctionKingRenderState,
  zh: boolean,
  en: boolean
): string {
  if (stage === "bidding") {
    return player.hasBid
      ? zh ? "✓ 已出价" : en ? "✓ Bid placed" : "✓ Gebot"
      : zh ? "思考中..." : en ? "Thinking..." : "Denkt...";
  }
  if (stage === "reveal") {
    return formatBidForReveal(state, player, zh, en);
  }
  return "";
}

function getBidStatusColor(
  stage: string,
  player: PlayerProgress,
  state: AuctionKingRenderState,
  zh: boolean,
  en: boolean
): string {
  if (stage === "bidding") {
    return player.hasBid ? C.bid : C.textMuted;
  }
  if (stage === "reveal") {
    const lastResult = state.roundResults[state.roundResults.length - 1];
    if (!lastResult) return C.textDim;
    const isWinner = lastResult.winnerPlayerId === player.playerId;
    if (isWinner) {
      const profit = lastResult.trueValue - (lastResult.allBids[player.playerId] ?? 0);
      return profit >= 0 ? C.win : C.loss;
    }
  }
  return C.textDim;
}

function formatBidForReveal(
  state: AuctionKingRenderState,
  player: PlayerProgress,
  zh: boolean,
  en: boolean
): string {
  const lastResult = state.roundResults[state.roundResults.length - 1];
  if (!lastResult) return "";
  const bid = lastResult.allBids[player.playerId] ?? 0;
  if (bid === 0) return zh ? "放弃" : en ? "Passed" : "Passen";
  const isWinner = lastResult.winnerPlayerId === player.playerId;
  if (isWinner) {
    const profit = lastResult.trueValue - bid;
    const sign = profit >= 0 ? "+" : "";
    return zh
      ? `${bid} (赢) ${sign}${profit}`
      : en
      ? `${bid} (won) ${sign}${profit}`
      : `${bid} (gewonnen) ${sign}${profit}`;
  }
  return zh ? `出价 ${bid}` : en ? `Bid ${bid}` : `Gebot ${bid}`;
}

/* ────────────────────────── Scoreboard ────────────────────────── */

function renderScoreboard(
  scene: Phaser.Scene,
  state: AuctionKingRenderState,
  playerNames: Record<string, string>,
  W: number,
  H: number,
  zh: boolean,
  en: boolean
): void {
  const progress = [...state.playerProgress].sort((a, b) => b.gold - a.gold);

  // Title
  scene.add
    .text(W / 2, 140, zh ? "🏆 最终结算 🏆" : en ? "🏆 Final Results 🏆" : "🏆 Ergebnis 🏆", {
      fontFamily: FONT,
      fontSize: "36px",
      color: C.goldBright,
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 4
    })
    .setOrigin(0.5, 0);

  // Winner announcement
  if (progress.length > 0) {
    const winnerName = progress[0].name;
    const winText = zh
      ? `${winnerName} 是竞拍之王！`
      : en
      ? `${winnerName} is the Bid King!`
      : `${winnerName} ist der Koenig!`;
    scene.add
      .text(W / 2, 190, winText, {
        fontFamily: FONT,
        fontSize: "22px",
        color: C.gold
      })
      .setOrigin(0.5, 0);
  }

  // Ranked list
  const listX = Math.max(60, W * 0.15);
  const listW = W - listX * 2;
  const startY = 250;
  const rowH = 56;
  const rowGap = 8;

  // Container background
  const listBg = scene.add.graphics();
  listBg.fillStyle(C.panelBg, 0.6);
  listBg.fillRoundedRect(listX - 10, startY - 10, listW + 20, progress.length * (rowH + rowGap) + 20, 14);

  const medals = ["🥇", "🥈", "🥉", "4"];

  progress.forEach((player, index) => {
    const y = startY + index * (rowH + rowGap);
    const colorNum = hexToPhaser(player.color);
    const isWinner = index === 0;

    // Row background
    const rowBg = scene.add.graphics();
    rowBg.fillStyle(isWinner ? 0x422006 : C.cardInner, 0.85);
    rowBg.fillRoundedRect(listX, y, listW, rowH, 10);
    // Left accent
    rowBg.fillStyle(colorNum, 0.8);
    rowBg.fillRect(listX, y, 4, rowH);
    // Border
    rowBg.lineStyle(1, isWinner ? C.goldNum : C.panelBorder, isWinner ? 0.6 : 0.3);
    rowBg.strokeRoundedRect(listX, y, listW, rowH, 10);

    // Medal / rank
    scene.add
      .text(listX + 30, y + rowH / 2, medals[index] ?? `${index + 1}`, {
        fontFamily: FONT,
        fontSize: "24px"
      })
      .setOrigin(0.5, 0.5);

    // Player name
    scene.add
      .text(listX + 60, y + rowH / 2, player.name, {
        fontFamily: FONT,
        fontSize: "20px",
        color: C.text,
        fontStyle: "bold"
      })
      .setOrigin(0, 0.5);

    // Gold amount
    const goldIcon = hasTexture(scene, TEXTURE_KEYS.iconGold) ? "💰 " : "";
    scene.add
      .text(listX + listW - 180, y + rowH / 2, `${goldIcon}${player.gold}`, {
        fontFamily: FONT,
        fontSize: "20px",
        color: C.gold,
        fontStyle: "bold"
      })
      .setOrigin(0, 0.5);

    // Profit / loss
    const profit = player.gold - state.startingGold;
    const profitColor = profit >= 0 ? C.win : C.loss;
    const profitSign = profit >= 0 ? "+" : "";
    const arrow = profit >= 0 ? "↑" : "↓";
    const profitText = `${profitSign}${profit} ${arrow}`;
    scene.add
      .text(listX + listW - 20, y + rowH / 2, profitText, {
        fontFamily: FONT,
        fontSize: "18px",
        color: profitColor,
        fontStyle: "bold"
      })
      .setOrigin(1, 0.5);
  });

  // Auction log
  if (state.roundResults.length > 0) {
    const logY = startY + progress.length * (rowH + rowGap) + 30;
    const logTitle = zh ? "📋 拍卖记录" : en ? "📋 Auction log" : "📋 Protokoll";
    scene.add
      .text(W / 2, logY, logTitle, {
        fontFamily: FONT,
        fontSize: "16px",
        color: C.textMuted,
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0);

    state.roundResults.forEach((result, index) => {
      const y = logY + 28 + index * 22;
      const winnerName = result.winnerPlayerId
        ? (playerNames[result.winnerPlayerId] ?? "?")
        : (zh ? "流拍" : en ? "No sale" : "Nicht verkauft");
      const profit = result.winnerPlayerId ? result.trueValue - result.winningBid : 0;
      const profitStr = result.winnerPlayerId
        ? profit >= 0 ? `(+${profit})` : `(${profit})`
        : "";
      const profitColor = profit >= 0 ? C.win : C.loss;
      const logText = zh
        ? `R${result.round}: ${result.itemName} → ${winnerName} (${result.winningBid})`
        : `R${result.round}: ${result.itemName} → ${winnerName} (${result.winningBid})`;

      scene.add
        .text(W / 2 - 60, y, logText, {
          fontFamily: FONT,
          fontSize: "13px",
          color: C.textMuted
        })
        .setOrigin(1, 0);

      if (profitStr) {
        scene.add
          .text(W / 2 + 60, y, profitStr, {
            fontFamily: FONT,
            fontSize: "13px",
            color: profitColor,
            fontStyle: "bold"
          })
          .setOrigin(0, 0);
      }
    });
  }
}
