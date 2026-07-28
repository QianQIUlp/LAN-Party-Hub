import Phaser from "phaser";
import type { SupportedLanguage } from "@open-party-lab/game-core";
import type {
  AuctionKingPublicState,
  AuctionRoundHistory,
  VisibleWarehouseItem
} from "../protocol.js";
import {
  auctionInstruments,
  localize
} from "../server/content.js";
import {
  backgroundTextureKey,
  hasTexture,
  instrumentTextureKey,
  itemTextureKey
} from "./textures.js";

interface AuctionKingRenderState extends AuctionKingPublicState {
  message?: string;
}

const colors = {
  background: 0x080c0f,
  panel: 0x141a1c,
  panelSoft: 0x1b2224,
  line: 0x5a4a34,
  text: "#f5f0e6",
  muted: "#94a09f",
  gold: "#e4bd6c",
  goldNumber: 0xe4bd6c,
  mint: "#60d3bd",
  mintNumber: 0x60d3bd,
  copper: "#b86f40"
} as const;

const rarityColors: Record<string, number> = {
  white: 0xcbd5d9,
  green: 0x45c486,
  blue: 0x4aa9ff,
  purple: 0xa96cff,
  gold: 0xf2bf51,
  red: 0xff5b68
};

const fontFamily = "Inter, 'Noto Sans SC', 'Microsoft YaHei', Arial, sans-serif";

function copy(language: SupportedLanguage) {
  if (language === "en") {
    return {
      title: "VEILED WAREHOUSE",
      setup: "PRE-AUCTION LOADOUT",
      setupBody: "Specialist choices are public. Their discoveries remain private.",
      ready: "LOADOUT LOCKED",
      choosing: "CHOOSING LOADOUT",
      round: "ROUND",
      report: "ROUND REPORT",
      final: "AUCTION COMPLETE",
      condition: "CLOSE CONDITION",
      unique: "UNIQUE HIGH BID",
      lead: "LEAD OVER SECOND",
      publicIntel: "AUCTIONEER PUBLIC INTEL",
      warehouse: "PUBLIC WAREHOUSE MAP",
      history: "PUBLIC BID & INSTRUMENT HISTORY",
      noReport: "Waiting for the first report…",
      sold: "WAREHOUSE SOLD",
      unsold: "WAREHOUSE UNSOLD",
      winner: "WINNER",
      bid: "WINNING BID",
      value: "TRUE VALUE",
      noInstrument: "NONE",
      hidden: "SEALED"
    };
  }
  if (language === "de") {
    return {
      title: "VERSCHLEIERTES LAGER",
      setup: "AUSRUESTUNGSPHASE",
      setupBody: "Spezialisten sind oeffentlich. Ihre Erkenntnisse bleiben privat.",
      ready: "AUSWAHL GESPERRT",
      choosing: "AUSWAHL LAEUFT",
      round: "RUNDE",
      report: "RUNDENBERICHT",
      final: "AUKTION BEENDET",
      condition: "ZUSCHLAGSREGEL",
      unique: "EINDEUTIGES HOECHSTGEBOT",
      lead: "VORSPRUNG AUF PLATZ ZWEI",
      publicIntel: "OEFFENTLICHER AUKTIONSBERICHT",
      warehouse: "OEFFENTLICHE LAGERKARTE",
      history: "OEFFENTLICHE GEBOTE & INSTRUMENTE",
      noReport: "Warte auf den ersten Bericht…",
      sold: "LAGER VERKAUFT",
      unsold: "LAGER NICHT VERKAUFT",
      winner: "GEWINNER",
      bid: "SIEGERGEBOT",
      value: "WAHRER WERT",
      noInstrument: "KEINS",
      hidden: "VERSIEGELT"
    };
  }
  return {
    title: "迷雾仓库",
    setup: "拍卖前配置",
    setupBody: "角色选择公开，角色与仪器获得的具体情报仅本人可见",
    ready: "配置已锁定",
    choosing: "正在选择",
    round: "竞拍回合",
    report: "本轮公开结算",
    final: "拍卖结束",
    condition: "本轮成交条件",
    unique: "唯一最高价",
    lead: "领先第二名",
    publicIntel: "拍卖师公开情报",
    warehouse: "公共仓库视图",
    history: "公开出价与仪器历史",
    noReport: "等待首份公开情报…",
    sold: "整座仓库已成交",
    unsold: "整座仓库流拍",
    winner: "拍得玩家",
    bid: "成交价格",
    value: "真实价值",
    noInstrument: "未使用",
    hidden: "等待公开"
  };
}

function formatMoney(value: number, language: SupportedLanguage): string {
  return new Intl.NumberFormat(language === "zh-CN" ? "zh-CN" : language === "de" ? "de-DE" : "en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(value)));
}

function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number,
  color: string = colors.text,
  style: Phaser.Types.GameObjects.Text.TextStyle = {}
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, {
    fontFamily,
    fontSize: `${Math.max(8, Math.round(size))}px`,
    color,
    ...style
  });
}

function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 0.95
): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(colors.panel, alpha);
  graphics.fillRoundedRect(x, y, width, height, 13);
  graphics.lineStyle(1, colors.line, 0.5);
  graphics.strokeRoundedRect(x, y, width, height, 13);
}

function drawBackground(scene: Phaser.Scene, width: number, height: number): void {
  if (hasTexture(scene, backgroundTextureKey)) {
    const image = scene.add.image(width / 2, height / 2, backgroundTextureKey);
    image.setScale(Math.max(width / image.width, height / image.height));
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x05090a, 0.66);
    overlay.setDepth(0);
    image.setDepth(-1);
    return;
  }
  scene.cameras.main.setBackgroundColor(colors.background);
  const graphics = scene.add.graphics();
  graphics.fillGradientStyle(0x121c1a, 0x0b1011, 0x17120e, 0x080c0f, 1);
  graphics.fillRect(0, 0, width, height);
}

function drawHeader(
  scene: Phaser.Scene,
  state: AuctionKingRenderState,
  language: SupportedLanguage,
  width: number,
  scale: number
): number {
  const t = copy(language);
  const headerHeight = 70 * scale;
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x080c0f, 0.88);
  graphics.fillRect(0, 0, width, headerHeight);
  graphics.lineStyle(1, colors.line, 0.45);
  graphics.lineBetween(0, headerHeight, width, headerHeight);

  addText(scene, 28 * scale, 14 * scale, "LAN PARTY / SHARED AUCTION", 9 * scale, colors.gold, {
    fontStyle: "bold",
    letterSpacing: 2
  });
  addText(scene, 28 * scale, 31 * scale, t.title, 24 * scale, colors.text, {
    fontStyle: "bold",
    letterSpacing: 2
  });

  const stage = state.stage === "setup"
    ? t.setup
    : state.stage === "round_reveal"
    ? t.report
    : state.stage === "finished"
    ? t.final
    : `${t.round} ${state.currentRound} / ${state.totalRounds}`;
  const stageText = addText(scene, width / 2, 20 * scale, stage, 14 * scale, colors.text, {
    fontStyle: "bold",
    align: "center"
  }).setOrigin(0.5, 0);
  stageText.setBackgroundColor("rgba(25,31,35,0.84)").setPadding(16 * scale, 8 * scale);

  if (state.stageEndsAt !== null) {
    const remaining = Math.max(0, Math.ceil((state.stageEndsAt - Date.now()) / 1000));
    const timer = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
    addText(scene, width - 34 * scale, 20 * scale, timer, 22 * scale, remaining <= 10 ? "#ff707c" : colors.gold, {
      fontStyle: "bold"
    }).setOrigin(1, 0);
  }
  return headerHeight;
}

function renderSetup(
  scene: Phaser.Scene,
  state: AuctionKingRenderState,
  language: SupportedLanguage,
  width: number,
  height: number,
  top: number,
  scale: number
): void {
  const t = copy(language);
  const contentY = top + 18 * scale;
  const contentH = height - contentY - 24 * scale;
  panel(scene, 28 * scale, contentY, width - 56 * scale, contentH);
  addText(scene, width / 2, contentY + 25 * scale, t.setupBody, 15 * scale, colors.muted, {
    align: "center"
  }).setOrigin(0.5, 0);

  const playerCount = Math.max(1, state.players.length);
  const gap = 12 * scale;
  const cardWidth = Math.min(250 * scale, (width - 100 * scale - gap * (playerCount - 1)) / playerCount);
  const totalWidth = cardWidth * playerCount + gap * (playerCount - 1);
  const startX = (width - totalWidth) / 2;
  const cardY = contentY + 80 * scale;
  const cardH = Math.min(310 * scale, contentH - 125 * scale);

  state.players.forEach((player, index) => {
    const x = startX + index * (cardWidth + gap);
    const card = scene.add.graphics();
    const color = Phaser.Display.Color.HexStringToColor(player.color || "#94a3b8").color;
    card.fillStyle(colors.panelSoft, 0.92);
    card.fillRoundedRect(x, cardY, cardWidth, cardH, 12);
    card.lineStyle(player.setupConfirmed ? 2 : 1, player.setupConfirmed ? colors.goldNumber : color, player.setupConfirmed ? 0.9 : 0.45);
    card.strokeRoundedRect(x, cardY, cardWidth, cardH, 12);
    card.fillStyle(color, 0.85);
    card.fillRect(x, cardY, cardWidth, 5 * scale);

    addText(scene, x + cardWidth / 2, cardY + 28 * scale, player.name, 18 * scale, colors.text, {
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: cardWidth - 20 * scale }
    }).setOrigin(0.5, 0);
    addText(scene, x + cardWidth / 2, cardY + cardH / 2 - 12 * scale, player.roleName ?? "—", 14 * scale, player.roleId ? colors.gold : colors.muted, {
      align: "center",
      wordWrap: { width: cardWidth - 24 * scale }
    }).setOrigin(0.5, 0.5);
    const status = player.setupConfirmed ? t.ready : t.choosing;
    addText(scene, x + cardWidth / 2, cardY + cardH - 36 * scale, status, 10 * scale, player.setupConfirmed ? colors.mint : colors.muted, {
      fontStyle: "bold",
      align: "center",
      letterSpacing: 1
    }).setOrigin(0.5, 0);
  });
}

function instrumentLabel(instrumentId: string | null, language: SupportedLanguage): string {
  if (!instrumentId) return copy(language).noInstrument;
  const instrument = auctionInstruments.find((entry) => entry.id === instrumentId);
  return instrument ? localize(instrument.name, language) : instrumentId;
}

function drawPlayerHistory(
  scene: Phaser.Scene,
  state: AuctionKingRenderState,
  language: SupportedLanguage,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number
): void {
  const t = copy(language);
  panel(scene, x, y, width, height);
  addText(scene, x + 12 * scale, y + 11 * scale, t.history, 10 * scale, colors.gold, {
    fontStyle: "bold",
    letterSpacing: 1
  });
  const titleH = 34 * scale;
  const rowGap = 5 * scale;
  const rowH = (height - titleH - 10 * scale - rowGap * Math.max(0, state.players.length - 1)) / Math.max(1, state.players.length);

  state.players.forEach((player, playerIndex) => {
    const rowY = y + titleH + playerIndex * (rowH + rowGap);
    const graphics = scene.add.graphics();
    graphics.fillStyle(colors.panelSoft, playerIndex % 2 === 0 ? 0.72 : 0.5);
    graphics.fillRoundedRect(x + 7 * scale, rowY, width - 14 * scale, rowH, 7 * scale);
    const playerColor = Phaser.Display.Color.HexStringToColor(player.color || "#94a3b8").color;
    graphics.fillStyle(playerColor, 0.9);
    graphics.fillRect(x + 7 * scale, rowY, 4 * scale, rowH);

    const identityW = width * 0.29;
    addText(scene, x + 17 * scale, rowY + 9 * scale, player.name, 11 * scale, colors.text, {
      fontStyle: "bold",
      wordWrap: { width: identityW - 15 * scale }
    });
    addText(scene, x + 17 * scale, rowY + 27 * scale, player.roleName ?? "—", 8 * scale, colors.muted, {
      wordWrap: { width: identityW - 15 * scale }
    });

    const historyX = x + identityW;
    const historyW = width - identityW - 10 * scale;
    const cellGap = 3 * scale;
    const cellW = (historyW - cellGap * 4) / 5;
    for (let round = 1; round <= 5; round += 1) {
      const cellX = historyX + (round - 1) * (cellW + cellGap);
      const cell = scene.add.graphics();
      cell.fillStyle(0x070a0b, 0.58);
      cell.fillRoundedRect(cellX, rowY + 5 * scale, cellW, rowH - 10 * scale, 5 * scale);
      cell.lineStyle(1, colors.line, 0.3);
      cell.strokeRoundedRect(cellX, rowY + 5 * scale, cellW, rowH - 10 * scale, 5 * scale);
      addText(scene, cellX + cellW - 3 * scale, rowY + 6 * scale, `R${round}`, 6 * scale, "#606a6b").setOrigin(1, 0);
      const history = state.history.find((entry) => entry.round === round);
      if (history) {
        const instrumentId = history.instruments[player.playerId] ?? null;
        const texture = instrumentId ? instrumentTextureKey(instrumentId) : null;
        if (texture && hasTexture(scene, texture)) {
          const icon = scene.add.image(cellX + cellW / 2, rowY + rowH * 0.39, texture);
          icon.setDisplaySize(Math.min(26 * scale, cellW * 0.55), Math.min(26 * scale, rowH * 0.38));
        } else {
          addText(scene, cellX + cellW / 2, rowY + rowH * 0.31, instrumentLabel(instrumentId, language).slice(0, 5), 6.2 * scale, colors.muted, {
            align: "center",
            wordWrap: { width: cellW - 4 * scale }
          }).setOrigin(0.5, 0);
        }
        addText(scene, cellX + cellW / 2, rowY + rowH - 15 * scale, formatMoney(history.bids[player.playerId] ?? 0, language), 7 * scale, colors.gold, {
          fontStyle: "bold",
          align: "center"
        }).setOrigin(0.5, 0);
      } else if (state.stage === "round_active" && state.currentRound === round) {
        addText(scene, cellX + cellW / 2, rowY + rowH / 2 - 2 * scale, t.hidden, 6.5 * scale, colors.muted, {
          align: "center",
          wordWrap: { width: cellW - 6 * scale }
        }).setOrigin(0.5, 0.5);
      }
    }
  });
}

function drawPublicIntel(
  scene: Phaser.Scene,
  state: AuctionKingRenderState,
  language: SupportedLanguage,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number
): void {
  const t = copy(language);
  panel(scene, x, y, width, height);
  addText(scene, x + 12 * scale, y + 11 * scale, t.publicIntel, 10 * scale, colors.mint, {
    fontStyle: "bold",
    letterSpacing: 1
  });
  const notes = [...state.publicNotes].sort((left, right) => right.round - left.round);
  if (notes.length === 0) {
    addText(scene, x + width / 2, y + height / 2, t.noReport, 13 * scale, colors.muted, {
      align: "center"
    }).setOrigin(0.5);
    return;
  }
  const cardGap = 7 * scale;
  const cardH = Math.min(78 * scale, (height - 50 * scale - cardGap * (notes.length - 1)) / Math.min(notes.length, 5));
  notes.slice(0, 5).forEach((note, index) => {
    const cardY = y + 36 * scale + index * (cardH + cardGap);
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x1a2726, 0.76);
    graphics.fillRoundedRect(x + 8 * scale, cardY, width - 16 * scale, cardH, 8 * scale);
    graphics.lineStyle(1, 0x35645d, 0.45);
    graphics.strokeRoundedRect(x + 8 * scale, cardY, width - 16 * scale, cardH, 8 * scale);
    addText(scene, x + 17 * scale, cardY + 8 * scale, `ROUND ${note.round}`, 7 * scale, colors.mint, {
      fontStyle: "bold",
      letterSpacing: 1
    });
    addText(scene, x + 17 * scale, cardY + 23 * scale, note.text, 10 * scale, colors.text, {
      wordWrap: { width: width - 34 * scale, useAdvancedWrap: true },
      lineSpacing: 2 * scale
    });
  });
}

function drawVisibleItem(
  scene: Phaser.Scene,
  item: VisibleWarehouseItem,
  gridX: number,
  gridY: number,
  cellW: number,
  cellH: number,
  scale: number
): void {
  const x = gridX + (item.outlineKnown ? item.x ?? item.anchorX : item.anchorX) * cellW + 2 * scale;
  const y = gridY + (item.outlineKnown ? item.y ?? item.anchorY : item.anchorY) * cellH + 2 * scale;
  const width = (item.outlineKnown ? item.width ?? 1 : 1) * cellW - 4 * scale;
  const height = (item.outlineKnown ? item.height ?? 1 : 1) * cellH - 4 * scale;
  const rarity = item.rarity ? rarityColors[item.rarity] ?? 0x87929b : 0x87929b;
  const graphics = scene.add.graphics();
  graphics.fillStyle(item.rarityKnown ? rarity : 0x777f80, item.rarityKnown ? 0.48 : 0.33);
  graphics.fillRoundedRect(x, y, width, height, 5 * scale);
  graphics.lineStyle(item.rarityKnown ? 2 * scale : 1 * scale, rarity, item.rarityKnown ? 0.95 : 0.7);
  graphics.strokeRoundedRect(x, y, width, height, 5 * scale);

  if (item.identityKnown && item.catalogId) {
    const texture = itemTextureKey(item.catalogId);
    if (hasTexture(scene, texture)) {
      const image = scene.add.image(x + width / 2, y + height / 2 - 5 * scale, texture);
      const availableW = Math.max(12, width - 8 * scale);
      const availableH = Math.max(12, height - 18 * scale);
      image.setScale(Math.min(availableW / image.width, availableH / image.height));
    }
    if (item.name && width > 56 * scale && height > 32 * scale) {
      addText(scene, x + width / 2, y + height - 10 * scale, item.name, 7 * scale, colors.text, {
        align: "center",
        wordWrap: { width: width - 5 * scale }
      }).setOrigin(0.5, 0);
    }
  }
}

function drawWarehouse(
  scene: Phaser.Scene,
  state: AuctionKingRenderState,
  language: SupportedLanguage,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number
): void {
  const t = copy(language);
  panel(scene, x, y, width, height);
  addText(scene, x + 12 * scale, y + 11 * scale, t.warehouse, 10 * scale, colors.gold, {
    fontStyle: "bold",
    letterSpacing: 1
  });
  const padding = 10 * scale;
  const header = 35 * scale;
  const maxW = width - padding * 2;
  const maxH = height - header - padding;
  const aspect = state.warehouse.cols / state.warehouse.rows;
  let gridW = maxW;
  let gridH = gridW / aspect;
  if (gridH > maxH) {
    gridH = maxH;
    gridW = gridH * aspect;
  }
  const gridX = x + (width - gridW) / 2;
  const gridY = y + header + (maxH - gridH) / 2;
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x050809, 0.94);
  graphics.fillRoundedRect(gridX, gridY, gridW, gridH, 7 * scale);
  const cellW = gridW / state.warehouse.cols;
  const cellH = gridH / state.warehouse.rows;
  graphics.lineStyle(1, 0x5c6666, 0.23);
  for (let col = 1; col < state.warehouse.cols; col += 1) {
    graphics.lineBetween(gridX + col * cellW, gridY, gridX + col * cellW, gridY + gridH);
  }
  for (let row = 1; row < state.warehouse.rows; row += 1) {
    graphics.lineBetween(gridX, gridY + row * cellH, gridX + gridW, gridY + row * cellH);
  }
  state.warehouse.items.forEach((item) => drawVisibleItem(scene, item, gridX, gridY, cellW, cellH, scale));
}

function drawRoundStatus(
  scene: Phaser.Scene,
  state: AuctionKingRenderState,
  language: SupportedLanguage,
  x: number,
  y: number,
  width: number,
  scale: number
): void {
  const t = copy(language);
  panel(scene, x, y, width, 68 * scale, 0.92);
  addText(scene, x + 13 * scale, y + 10 * scale, t.condition, 8 * scale, colors.muted, {
    letterSpacing: 1
  });
  const condition = state.currentRound >= 5 ? t.unique : `${state.threshold.toFixed(1)}× ${t.lead}`;
  addText(scene, x + 13 * scale, y + 28 * scale, condition, 17 * scale, colors.gold, {
    fontStyle: "bold"
  });
  if (state.message) {
    addText(scene, x + width - 13 * scale, y + 18 * scale, state.message, 10 * scale, colors.text, {
      align: "right",
      wordWrap: { width: width * 0.56, useAdvancedWrap: true }
    }).setOrigin(1, 0);
  }
}

function drawFinalOverlay(
  scene: Phaser.Scene,
  state: AuctionKingRenderState,
  language: SupportedLanguage,
  width: number,
  height: number,
  scale: number
): void {
  if (state.stage !== "finished") return;
  const t = copy(language);
  const winner = state.players.find((player) => player.playerId === state.soldToPlayerId);
  const overlayW = Math.min(720 * scale, width * 0.62);
  const overlayH = 160 * scale;
  const x = (width - overlayW) / 2;
  const y = (height - overlayH) / 2;
  const blocker = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.62);
  blocker.setDepth(20);
  const graphics = scene.add.graphics().setDepth(21);
  graphics.fillStyle(0x171d1e, 0.98);
  graphics.fillRoundedRect(x, y, overlayW, overlayH, 16 * scale);
  graphics.lineStyle(2, colors.goldNumber, 0.72);
  graphics.strokeRoundedRect(x, y, overlayW, overlayH, 16 * scale);
  addText(scene, width / 2, y + 18 * scale, winner ? t.sold : t.unsold, 11 * scale, winner ? colors.gold : colors.muted, {
    fontStyle: "bold",
    letterSpacing: 2
  }).setOrigin(0.5, 0).setDepth(22);
  addText(scene, width / 2, y + 45 * scale, winner?.name ?? t.unsold, 30 * scale, colors.text, {
    fontStyle: "bold"
  }).setOrigin(0.5, 0).setDepth(22);
  const summary = winner
    ? `${t.bid}  ${formatMoney(state.soldFor, language)}     ${t.value}  ${formatMoney(state.trueWarehouseValue ?? 0, language)}`
    : `${t.value}  ${formatMoney(state.trueWarehouseValue ?? 0, language)}`;
  addText(scene, width / 2, y + 105 * scale, summary, 13 * scale, colors.gold, {
    align: "center"
  }).setOrigin(0.5, 0).setDepth(22);
}

export function renderAuctionKingState(
  scene: Phaser.Scene,
  state: AuctionKingRenderState,
  language: SupportedLanguage = "zh-CN"
): void {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const scale = Math.max(0.68, Math.min(1.35, Math.min(width / 1280, height / 720)));
  drawBackground(scene, width, height);
  const top = drawHeader(scene, state, language, width, scale);

  if (state.stage === "setup") {
    renderSetup(scene, state, language, width, height, top, scale);
    return;
  }

  const outer = 16 * scale;
  const statusH = 68 * scale;
  const contentY = top + outer;
  drawRoundStatus(scene, state, language, outer, contentY, width - outer * 2, scale);
  const columnsY = contentY + statusH + 9 * scale;
  const columnsH = height - columnsY - outer;
  const gap = 9 * scale;
  const availableW = width - outer * 2 - gap * 2;
  const playerW = availableW * 0.36;
  const intelW = availableW * 0.27;
  const warehouseW = availableW - playerW - intelW;
  drawPlayerHistory(scene, state, language, outer, columnsY, playerW, columnsH, scale);
  drawPublicIntel(scene, state, language, outer + playerW + gap, columnsY, intelW, columnsH, scale);
  drawWarehouse(scene, state, language, outer + playerW + gap + intelW + gap, columnsY, warehouseW, columnsH, scale);
  drawFinalOverlay(scene, state, language, width, height, scale);
}

export function latestRoundHistory(state: AuctionKingPublicState): AuctionRoundHistory | null {
  return state.history[state.history.length - 1] ?? null;
}
