import {
  createBaseRoundState,
  roundPhaseDurations,
  transitionRoundState,
  type GamePlayerSummary,
  type ServerGame,
  type ServerGameContext,
  type SupportedLanguage
} from "@open-party-lab/game-core";
import { auctionKingManifest } from "../manifest.js";
import type {
  AuctionInstrumentId,
  AuctionKingControllerState,
  AuctionKingInput,
  AuctionKingPublicState,
  AuctionKingState,
  AuctionKitId,
  AuctionPlayerSetup,
  AuctionRoleId,
  AuctionRoundHistory,
  KnowledgeNote,
  PlayerKnowledge,
  WarehouseItem
} from "../protocol.js";
import {
  allInstrumentIds,
  auctionCatalog,
  auctionInstruments,
  auctionKits,
  auctionRoles,
  instrumentById,
  kitById,
  localize,
  rarityNames,
  rarityOrder,
  roleById
} from "./content.js";
import {
  buildCandidates,
  cloneKnowledge,
  createEmptyKnowledge,
  generateWarehouse,
  mergeKnowledge,
  randomItems,
  revealCategory,
  revealIdentity,
  revealOutline,
  revealRarity,
  visibleWarehouseItems,
  type RandomSource
} from "./warehouse.js";

export const auctionStartingFunds = 1_000_000;
export const auctionTotalRounds = 5;
export const auctionSetupDurationMs = 90_000;
export const auctionRoundDurationMs = 45_000;
export const auctionRevealDurationMs = 7_000;
export const auctionRoundThresholds = [2, 1.7, 1.5, 1.3, 1] as const;

const messages = {
  "zh-CN": {
    intro: "仓库拍卖即将开始。",
    setup: "选择角色与仪器组，然后确认准备。",
    active: (round: number, threshold: number) =>
      round === auctionTotalRounds
        ? "最终回合：最高且唯一的出价将直接成交。"
        : `第 ${round} 回合：领先第二名达到 ${threshold.toFixed(1)} 倍即可成交。`,
    reveal: "回合结束：公开本轮出价与仪器。",
    sold: (name: string, bid: number) => `${name} 以 ${bid.toLocaleString("zh-CN")} 拍得整座仓库！`,
    unsold: "五轮结束仍未产生唯一最高价，仓库流拍。",
    next: "领先倍率不足，追加情报后进入下一轮。"
  },
  en: {
    intro: "The warehouse auction is about to begin.",
    setup: "Choose a specialist and instrument kit, then confirm.",
    active: (round: number, threshold: number) =>
      round === auctionTotalRounds
        ? "Final round: the unique highest bid wins."
        : `Round ${round}: lead second place by ${threshold.toFixed(1)}× to win now.`,
    reveal: "Round closed: bids and instruments are now public.",
    sold: (name: string, bid: number) => `${name} wins the warehouse for ${bid.toLocaleString("en-US")}!`,
    unsold: "No unique high bid after five rounds. The warehouse remains unsold.",
    next: "The lead was too small. More intelligence arrives next round."
  },
  de: {
    intro: "Die Lagerauktion beginnt gleich.",
    setup: "Spezialist und Instrumentenset waehlen, dann bestaetigen.",
    active: (round: number, threshold: number) =>
      round === auctionTotalRounds
        ? "Finalrunde: Das einzige Hoechstgebot gewinnt."
        : `Runde ${round}: ${threshold.toFixed(1)}× Vorsprung auf Platz zwei gewinnt sofort.`,
    reveal: "Runde beendet: Gebote und Instrumente sind jetzt oeffentlich.",
    sold: (name: string, bid: number) => `${name} gewinnt das Lager fuer ${bid.toLocaleString("de-DE")}!`,
    unsold: "Nach fuenf Runden gibt es kein eindeutiges Hoechstgebot. Nicht verkauft.",
    next: "Der Vorsprung reicht nicht. Naechste Runde gibt es mehr Informationen."
  }
} satisfies Record<SupportedLanguage, {
  intro: string;
  setup: string;
  active: (round: number, threshold: number) => string;
  reveal: string;
  sold: (name: string, bid: number) => string;
  unsold: string;
  next: string;
}>;

function languageMessages(language: SupportedLanguage) {
  return messages[language] ?? messages["zh-CN"];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAuctionInput(value: unknown): value is AuctionKingInput {
  if (!isRecord(value) || typeof value.playerId !== "string" || typeof value.sentAt !== "number") return false;
  switch (value.type) {
    case "select_role":
      return auctionRoles.some((entry) => entry.id === value.roleId);
    case "select_kit":
      return auctionKits.some((entry) => entry.id === value.kitId);
    case "confirm_setup":
      return true;
    case "use_instrument":
      return auctionInstruments.some((entry) => entry.id === value.instrumentId);
    case "submit_bid":
      return typeof value.amount === "number" && Number.isSafeInteger(value.amount);
    default:
      return false;
  }
}

function createSetupMap(playerIds: string[]): Record<string, AuctionPlayerSetup> {
  return Object.fromEntries(
    playerIds.map((playerId) => [playerId, { roleId: null, kitId: null, confirmed: false }])
  );
}

function createFundsMap(playerIds: string[]): Record<string, number> {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, auctionStartingFunds]));
}

function createPrivateKnowledgeMap(playerIds: string[]): Record<string, PlayerKnowledge> {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, createEmptyKnowledge()]));
}

function cloneKnowledgeState(state: AuctionKingState): AuctionKingState {
  return {
    ...state,
    publicKnowledge: cloneKnowledge(state.publicKnowledge),
    privateKnowledgeByPlayerId: Object.fromEntries(
      Object.entries(state.privateKnowledgeByPlayerId).map(([playerId, knowledge]) => [
        playerId,
        cloneKnowledge(knowledge)
      ])
    ),
    auctioneerNotes: state.auctioneerNotes.map((entry) => ({ ...entry })),
    roleMemoryByPlayerId: Object.fromEntries(
      Object.entries(state.roleMemoryByPlayerId).map(([playerId, ids]) => [playerId, [...ids]])
    )
  };
}

function addNote(
  knowledge: PlayerKnowledge,
  note: Omit<KnowledgeNote, "id">
): KnowledgeNote {
  const created: KnowledgeNote = {
    ...note,
    id: `${note.source}-${note.round}-${knowledge.notes.length + 1}`
  };
  knowledge.notes.push(created);
  return created;
}

function currentStageEndsAt(state: AuctionKingState): number | null {
  if (state.stage === "setup") return state.setupEndsAt;
  if (state.stage === "round_active") return state.roundEndsAt;
  if (state.stage === "round_reveal") return state.revealEndsAt;
  return null;
}

function currentThreshold(round: number): number {
  return auctionRoundThresholds[Math.max(0, Math.min(auctionRoundThresholds.length - 1, round - 1))];
}

function publicAuctioneerIntel(
  state: AuctionKingState,
  round: number,
  language: SupportedLanguage,
  random: RandomSource
): void {
  const knowledge = state.publicKnowledge;
  const publicNote = (text: string) => {
    const note = addNote(knowledge, { source: "auctioneer", round, text });
    state.auctioneerNotes.push(note);
  };

  if (round === 1) {
    const revealed = randomItems(state.warehouse, 1, random);
    revealed.forEach((item) => revealIdentity(knowledge, item));
    publicNote(
      language === "zh-CN"
        ? `拍卖师公开展示 ${revealed.length} 件完整藏品。`
        : language === "en"
        ? `The auctioneer fully reveals ${revealed.length} collectibles.`
        : `Der Auktionator zeigt ${revealed.length} Objekte vollstaendig.`
    );
    return;
  }

  if (round === 3) {
    const outlined = randomItems(state.warehouse, 2, random, (item) => !knowledge.items[item.instanceId]?.outlineKnown);
    outlined.forEach((item) => revealOutline(knowledge, item));
    publicNote(
      language === "zh-CN"
        ? `拍卖师最后公开 ${outlined.length} 件藏品的轮廓；后续不再提供公共提示。`
        : language === "en"
        ? `The auctioneer reveals ${outlined.length} final public outlines; no more public hints follow.`
        : `Der Auktionator zeigt ${outlined.length} letzte oeffentliche Umrisse; danach folgen keine Hinweise mehr.`
    );
    return;
  }
}

function addPrivateRoleNote(
  knowledge: PlayerKnowledge,
  round: number,
  text: string
): void {
  addNote(knowledge, { source: "role", round, text });
}

function applyRoleIntel(
  state: AuctionKingState,
  playerId: string,
  roleId: AuctionRoleId,
  round: number,
  language: SupportedLanguage,
  random: RandomSource
): void {
  const knowledge = state.privateKnowledgeByPlayerId[playerId];
  if (!knowledge) return;

  if (roleId === "spectrum_cartographer") {
    const rarity = round <= 4 ? rarityOrder[round - 1] : null;
    const targets = rarity
      ? state.warehouse.items.filter((item) => item.rarity === rarity)
      : randomItems(state.warehouse, 1, random, (item) => item.rarity === "gold" || item.rarity === "red");
    targets.forEach((item) => revealOutline(knowledge, item));
    addPrivateRoleNote(
      knowledge,
      round,
      language === "zh-CN"
        ? rarity
          ? `色谱测绘：显示全部${localize(rarityNames[rarity], language)}藏品轮廓。`
          : "色谱测绘：显示一件金色或红色藏品轮廓。"
        : `Spectrum mapping reveals ${targets.length} matching outline(s).`
    );
    return;
  }

  if (roleId === "apex_hunter") {
    if (round === 1) {
      const highestIndex = Math.max(
        ...state.warehouse.items.map((item) => rarityOrder.indexOf(item.rarity))
      );
      const apex = randomItems(state.warehouse, 1, random, (item) => rarityOrder.indexOf(item.rarity) === highestIndex);
      apex.forEach((item) => revealOutline(knowledge, item));
    }
    const target = randomItems(state.warehouse, 1, random)[0];
    if (target) {
      revealOutline(knowledge, target);
      revealRarity(knowledge, target);
    }
    addPrivateRoleNote(
      knowledge,
      round,
      language === "zh-CN" ? "巅峰猎手：锁定一件藏品的品质与轮廓。" : "Apex Hunter locks one rarity and outline."
    );
    return;
  }

  if (roleId === "fog_classifier") {
    if (round <= 3) {
      const target = randomItems(state.warehouse, 1, random, (item) => !knowledge.items[item.instanceId]?.categoryKnown)[0];
      if (target) revealOutline(knowledge, target);
      addPrivateRoleNote(
        knowledge,
        round,
        language === "zh-CN" ? "雾区分类：显示一种未知类别藏品的轮廓。" : "Fog classification reveals an unknown-category outline."
      );
    } else if (round === 5) {
      const targets = state.warehouse.items.filter((item) => knowledge.items[item.instanceId]?.rarityKnown);
      targets.forEach((item) => revealOutline(knowledge, item));
      addPrivateRoleNote(
        knowledge,
        round,
        language === "zh-CN" ? `雾区分类：补全 ${targets.length} 件品质已知藏品的轮廓。` : `Fog classification completes ${targets.length} known-rarity outlines.`
      );
    }
    return;
  }

  if (roleId === "echo_archivist") {
    if (round === 1) {
      const targets = randomItems(state.warehouse, 8, random);
      targets.forEach((item) => revealOutline(knowledge, item));
      state.roleMemoryByPlayerId[playerId] = targets.map((item) => item.instanceId);
      addPrivateRoleNote(
        knowledge,
        round,
        language === "zh-CN" ? "回声记录：记下八件随机藏品的轮廓。" : "Echo archive records eight random outlines."
      );
    } else if (round === 3) {
      const ids = new Set(state.roleMemoryByPlayerId[playerId] ?? []);
      const targets = state.warehouse.items.filter((item) => ids.has(item.instanceId));
      targets.forEach((item) => revealOutline(knowledge, item));
      addPrivateRoleNote(
        knowledge,
        round,
        language === "zh-CN" ? "回声记录：再次确认第一回合的八件藏品。" : "Echo archive restores the first-round set."
      );
    }
    return;
  }

  if (roleId === "spatial_engineer") {
    const unknown = state.warehouse.items.filter((item) => !knowledge.items[item.instanceId]?.outlineKnown);
    const largestArea = Math.max(0, ...unknown.map((item) => item.width * item.height));
    const target = randomItems(state.warehouse, 1, random, (item) => item.width * item.height === largestArea)[0];
    if (target) revealOutline(knowledge, target);
    const extra = round === 4
      ? state.warehouse.items.filter((item) => item.width * item.height >= 6).reduce((sum, item) => sum + item.width * item.height, 0)
      : null;
    addPrivateRoleNote(
      knowledge,
      round,
      language === "zh-CN"
        ? extra === null
          ? "空间工程：显示一件最大占格藏品的轮廓。"
          : `空间工程：大型藏品合计占用 ${extra} 格。`
        : extra === null
        ? "Spatial engineering reveals one largest footprint."
        : `Large items occupy ${extra} cells.`
    );
    return;
  }

  const rarity = rarityOrder[Math.min(round - 1, rarityOrder.length - 1)] ?? "white";
  const values = state.warehouse.items.filter((item) => item.rarity === rarity).map((item) => item.trueValue);
  const average = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  if (round === 5) {
    knowledge.estimatedWarehouseMin = Math.round(state.warehouse.totalValue * 0.85);
    knowledge.estimatedWarehouseMax = Math.round(state.warehouse.totalValue * 1.15);
  }
  addPrivateRoleNote(
    knowledge,
    round,
    language === "zh-CN"
      ? round === 5
        ? `价值审计：整仓价值约为 ${knowledge.estimatedWarehouseMin?.toLocaleString("zh-CN")}–${knowledge.estimatedWarehouseMax?.toLocaleString("zh-CN")}。`
        : `价值审计：${localize(rarityNames[rarity], language)}藏品平均价值约 ${average.toLocaleString("zh-CN")}。`
      : round === 5
      ? `Value audit estimates ${knowledge.estimatedWarehouseMin}–${knowledge.estimatedWarehouseMax}.`
      : `${localize(rarityNames[rarity], language)} average value: ${average}.`
  );
}

function startAuctionRound(
  source: AuctionKingState,
  round: number,
  now: number,
  language: SupportedLanguage,
  random: RandomSource = Math.random
): AuctionKingState {
  const state = cloneKnowledgeState(source);
  state.currentRound = round;
  state.stage = "round_active";
  state.setupEndsAt = null;
  state.roundEndsAt = now + auctionRoundDurationMs;
  state.revealEndsAt = null;
  state.currentBidByPlayerId = {};
  state.currentInstrumentByPlayerId = Object.fromEntries(state.playerOrder.map((id) => [id, null]));
  state.updatedAt = now;
  state.message = languageMessages(language).active(round, currentThreshold(round));

  publicAuctioneerIntel(state, round, language, random);
  for (const playerId of state.playerOrder) {
    const roleId = state.setupByPlayerId[playerId]?.roleId;
    if (roleId) applyRoleIntel(state, playerId, roleId, round, language, random);
  }

  return state;
}

function allSetupConfirmed(state: AuctionKingState): boolean {
  return state.playerOrder.every((playerId) => state.setupByPlayerId[playerId]?.confirmed);
}

function confirmPlayerSetup(state: AuctionKingState, playerId: string, now: number): AuctionKingState {
  const current = state.setupByPlayerId[playerId];
  if (!current || current.confirmed || !current.roleId || !current.kitId) return state;
  const kit = kitById(current.kitId);
  if (!kit || (state.fundsByPlayerId[playerId] ?? 0) < kit.cost) return state;
  return {
    ...state,
    setupByPlayerId: {
      ...state.setupByPlayerId,
      [playerId]: { ...current, confirmed: true }
    },
    fundsByPlayerId: {
      ...state.fundsByPlayerId,
      [playerId]: (state.fundsByPlayerId[playerId] ?? auctionStartingFunds) - kit.cost
    },
    instrumentInventoryByPlayerId: {
      ...state.instrumentInventoryByPlayerId,
      [playerId]: kit.id === "none" ? [] : [...allInstrumentIds]
    },
    updatedAt: now
  };
}

function autoCompleteSetup(state: AuctionKingState, now: number): AuctionKingState {
  let next = state;
  const claimed = new Set(
    Object.values(next.setupByPlayerId).map((entry) => entry.roleId).filter((id): id is AuctionRoleId => Boolean(id))
  );
  for (const playerId of next.playerOrder) {
    const setup = next.setupByPlayerId[playerId];
    if (setup?.confirmed) continue;
    const roleId = setup?.roleId ?? auctionRoles.find((entry) => !claimed.has(entry.id))?.id ?? auctionRoles[0].id;
    claimed.add(roleId);
    next = {
      ...next,
      setupByPlayerId: {
        ...next.setupByPlayerId,
        [playerId]: { roleId, kitId: setup?.kitId ?? "none", confirmed: false }
      }
    };
    next = confirmPlayerSetup(next, playerId, now);
  }
  return { ...next, updatedAt: now };
}

export interface RoundWinnerEvaluation {
  highestBid: number;
  secondBid: number;
  leaderPlayerId: string | null;
  sold: boolean;
}

export function evaluateRoundWinner(
  bids: Record<string, number>,
  playerOrder: string[],
  round: number
): RoundWinnerEvaluation {
  const sorted = playerOrder
    .map((playerId) => ({ playerId, amount: Math.max(0, bids[playerId] ?? 0) }))
    .sort((left, right) => right.amount - left.amount);
  const highestBid = sorted[0]?.amount ?? 0;
  const secondBid = sorted[1]?.amount ?? 0;
  const tied = sorted.filter((entry) => entry.amount === highestBid).length > 1;
  const threshold = currentThreshold(round);
  const ratioMet = secondBid === 0 ? highestBid > 0 : highestBid / secondBid >= threshold;
  return {
    highestBid,
    secondBid,
    leaderPlayerId: highestBid > 0 && !tied ? sorted[0].playerId : null,
    sold: highestBid > 0 && !tied && ratioMet
  };
}

function closeRound(
  state: AuctionKingState,
  context: ServerGameContext,
  now: number
): AuctionKingState {
  const bids = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, state.currentBidByPlayerId[playerId] ?? 0]));
  const instruments = Object.fromEntries(
    state.playerOrder.map((playerId) => [playerId, state.currentInstrumentByPlayerId[playerId] ?? null])
  ) as Record<string, AuctionInstrumentId | null>;
  const evaluation = evaluateRoundWinner(bids, state.playerOrder, state.currentRound);
  const history: AuctionRoundHistory = {
    round: state.currentRound,
    threshold: currentThreshold(state.currentRound),
    bids,
    instruments,
    highestBid: evaluation.highestBid,
    secondBid: evaluation.secondBid,
    leaderPlayerId: evaluation.leaderPlayerId,
    sold: evaluation.sold,
    revealedAt: now
  };
  const playerName = context.players.find((player) => player.id === evaluation.leaderPlayerId)?.name ?? "?";
  const finalRound = state.currentRound >= auctionTotalRounds;
  const fundsByPlayerId = { ...state.fundsByPlayerId };
  if (evaluation.sold && evaluation.leaderPlayerId) {
    fundsByPlayerId[evaluation.leaderPlayerId] =
      (fundsByPlayerId[evaluation.leaderPlayerId] ?? 0) - evaluation.highestBid + state.warehouse.totalValue;
  }
  return {
    ...state,
    stage: "round_reveal",
    roundEndsAt: null,
    revealEndsAt: now + auctionRevealDurationMs,
    history: [...state.history, history],
    fundsByPlayerId,
    soldToPlayerId: evaluation.sold ? evaluation.leaderPlayerId : null,
    soldFor: evaluation.sold ? evaluation.highestBid : 0,
    trueValueRevealed: evaluation.sold || finalRound,
    updatedAt: now,
    message: evaluation.sold
      ? languageMessages(context.language).sold(playerName, evaluation.highestBid)
      : finalRound
      ? languageMessages(context.language).unsold
      : languageMessages(context.language).next
  };
}

function allPlayersBid(state: AuctionKingState): boolean {
  return state.playerOrder.every((playerId) => Object.prototype.hasOwnProperty.call(state.currentBidByPlayerId, playerId));
}

function instrumentStrength(kitId: AuctionKitId | null): number {
  return kitId ? kitById(kitId)?.strength ?? 0 : 0;
}

function useInstrument(
  source: AuctionKingState,
  playerId: string,
  instrumentId: AuctionInstrumentId,
  now: number,
  language: SupportedLanguage,
  random: RandomSource = Math.random
): AuctionKingState {
  if (source.stage !== "round_active" || source.currentInstrumentByPlayerId[playerId]) return source;
  const inventory = source.instrumentInventoryByPlayerId[playerId] ?? [];
  if (!inventory.includes(instrumentId)) return source;
  const state = cloneKnowledgeState(source);
  const knowledge = state.privateKnowledgeByPlayerId[playerId];
  const strength = instrumentStrength(state.setupByPlayerId[playerId]?.kitId ?? null);
  if (!knowledge || strength === 0) return source;
  let resultText = "";

  if (instrumentId === "largest_appraiser") {
    const largestArea = Math.max(...state.warehouse.items.map((item) => item.width * item.height));
    const target = randomItems(state.warehouse, 1, random, (item) => item.width * item.height === largestArea)[0];
    if (target) {
      revealOutline(knowledge, target);
      revealRarity(knowledge, target);
      resultText = language === "zh-CN"
        ? `最大藏品为${localize(rarityNames[target.rarity], language)}品质，占 ${target.width * target.height} 格。`
        : `Largest item rarity: ${localize(rarityNames[target.rarity], language)}.`;
    }
  } else if (instrumentId === "quality_array") {
    const count = [0, 4, 6, 10][strength] ?? 4;
    const targets = randomItems(state.warehouse, count, random, (item) => !knowledge.items[item.instanceId]?.rarityKnown);
    targets.forEach((item) => revealRarity(knowledge, item));
    resultText = language === "zh-CN" ? `显示 ${targets.length} 件藏品的品质。` : `Revealed ${targets.length} rarities.`;
  } else if (instrumentId === "outline_engine") {
    const count = [0, 6, 9, 12][strength] ?? 6;
    const targets = randomItems(state.warehouse, count, random, (item) => !knowledge.items[item.instanceId]?.outlineKnown);
    targets.forEach((item) => revealOutline(knowledge, item));
    resultText = language === "zh-CN" ? `显示 ${targets.length} 件藏品的轮廓。` : `Revealed ${targets.length} outlines.`;
  } else if (instrumentId === "gold_counter") {
    const count = state.warehouse.items.filter((item) => item.rarity === "gold").length;
    resultText = language === "zh-CN" ? `金色品质藏品共 ${count} 件。` : `Gold-rarity item count: ${count}.`;
  } else if (instrumentId === "category_spectrometer") {
    const count = [0, 3, 5, 7][strength] ?? 3;
    const targets = randomItems(state.warehouse, count, random, (item) => !knowledge.items[item.instanceId]?.categoryKnown);
    targets.forEach((item) => revealCategory(knowledge, item));
    resultText = language === "zh-CN" ? `显示 ${targets.length} 件藏品的类别。` : `Revealed ${targets.length} categories.`;
  } else {
    const error = [0, 0.3, 0.18, 0.1][strength] ?? 0.3;
    knowledge.estimatedWarehouseMin = Math.round(state.warehouse.totalValue * (1 - error));
    knowledge.estimatedWarehouseMax = Math.round(state.warehouse.totalValue * (1 + error));
    resultText = language === "zh-CN"
      ? `估值区间 ${knowledge.estimatedWarehouseMin.toLocaleString("zh-CN")}–${knowledge.estimatedWarehouseMax.toLocaleString("zh-CN")}。`
      : `Estimated range ${knowledge.estimatedWarehouseMin}–${knowledge.estimatedWarehouseMax}.`;
  }

  addNote(knowledge, {
    source: "instrument",
    round: state.currentRound,
    text: `${localize(instrumentById(instrumentId)?.name ?? { "zh-CN": instrumentId, en: instrumentId, de: instrumentId }, language)}：${resultText}`
  });

  return {
    ...state,
    instrumentInventoryByPlayerId: {
      ...state.instrumentInventoryByPlayerId,
      [playerId]: inventory.filter((id) => id !== instrumentId)
    },
    currentInstrumentByPlayerId: {
      ...state.currentInstrumentByPlayerId,
      [playerId]: instrumentId
    },
    updatedAt: now
  };
}

function playerViews(state: AuctionKingState, players: GamePlayerSummary[], language: SupportedLanguage) {
  return state.playerOrder.map((playerId) => {
    const player = players.find((entry) => entry.id === playerId);
    const roleId = state.setupByPlayerId[playerId]?.roleId ?? null;
    return {
      playerId,
      name: player?.name ?? "?",
      color: player?.color ?? "#94a3b8",
      roleId,
      roleName: roleId ? localize(roleById(roleId)?.name ?? { "zh-CN": roleId, en: roleId, de: roleId }, language) : null,
      setupConfirmed: Boolean(state.setupByPlayerId[playerId]?.confirmed)
    };
  });
}

function toPublicState(state: AuctionKingState, context: ServerGameContext): AuctionKingPublicState {
  const revealAll = state.trueValueRevealed || state.stage === "finished";
  return {
    stage: state.stage,
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    startingFunds: state.startingFunds,
    stageEndsAt: currentStageEndsAt(state),
    threshold: currentThreshold(Math.max(1, state.currentRound)),
    players: playerViews(state, context.players, context.language),
    history: state.history,
    publicNotes: state.auctioneerNotes,
    warehouse: {
      cols: state.warehouse.cols,
      rows: state.warehouse.rows,
      items: visibleWarehouseItems(state.warehouse, state.publicKnowledge, context.language, revealAll)
    },
    submittedBidByPlayerId: Object.fromEntries(
      state.playerOrder.map((playerId) => [playerId, false])
    ),
    usedInstrumentByPlayerId: Object.fromEntries(
      state.playerOrder.map((playerId) => [playerId, false])
    ),
    soldToPlayerId: state.soldToPlayerId,
    soldFor: state.soldFor,
    trueWarehouseValue: revealAll ? state.warehouse.totalValue : null
  };
}

export const serverGame: ServerGame<AuctionKingState, AuctionKingInput, AuctionKingPublicState> = {
  manifest: auctionKingManifest,

  createInitialState(context) {
    const playerIds = context.players.map((player) => player.id).slice(0, auctionKingManifest.maxPlayers);
    const warehouse = generateWarehouse();
    return {
      ...createBaseRoundState("round_intro", context.now, {
        durationMs: roundPhaseDurations.roundIntroMs,
        message: languageMessages(context.language).intro
      }),
      stage: "setup",
      setupEndsAt: null,
      roundEndsAt: null,
      revealEndsAt: null,
      currentRound: 0,
      totalRounds: auctionTotalRounds,
      startingFunds: auctionStartingFunds,
      playerOrder: playerIds,
      setupByPlayerId: createSetupMap(playerIds),
      fundsByPlayerId: createFundsMap(playerIds),
      instrumentInventoryByPlayerId: Object.fromEntries(playerIds.map((id) => [id, []])),
      roleMemoryByPlayerId: Object.fromEntries(playerIds.map((id) => [id, []])),
      currentInstrumentByPlayerId: Object.fromEntries(playerIds.map((id) => [id, null])),
      currentBidByPlayerId: {},
      warehouse,
      publicKnowledge: createEmptyKnowledge(),
      privateKnowledgeByPlayerId: createPrivateKnowledgeMap(playerIds),
      history: [],
      auctioneerNotes: [],
      soldToPlayerId: null,
      soldFor: 0,
      trueValueRevealed: false
    };
  },

  startRound(state, context) {
    return transitionRoundState(
      {
        ...state,
        stage: "setup",
        setupEndsAt: context.now + auctionSetupDurationMs,
        message: languageMessages(context.language).setup
      },
      "playing",
      context.now,
      { startedAt: context.now, message: languageMessages(context.language).setup }
    );
  },

  handleInput(state, rawInput, context) {
    if (state.phase !== "playing" || !isAuctionInput(rawInput)) return state;
    const input = rawInput;
    if (!state.playerOrder.includes(input.playerId)) return state;

    if (state.stage === "setup") {
      const current = state.setupByPlayerId[input.playerId];
      if (!current || current.confirmed) return state;

      if (input.type === "select_role") {
        const claimedByOther = Object.entries(state.setupByPlayerId).some(
          ([playerId, setup]) => playerId !== input.playerId && setup.roleId === input.roleId
        );
        if (claimedByOther) return state;
        return {
          ...state,
          setupByPlayerId: {
            ...state.setupByPlayerId,
            [input.playerId]: { ...current, roleId: input.roleId }
          },
          updatedAt: context.now
        };
      }

      if (input.type === "select_kit") {
        return {
          ...state,
          setupByPlayerId: {
            ...state.setupByPlayerId,
            [input.playerId]: { ...current, kitId: input.kitId }
          },
          updatedAt: context.now
        };
      }

      if (input.type === "confirm_setup") {
      const confirmed = confirmPlayerSetup(state, input.playerId, context.now);
        return allSetupConfirmed(confirmed)
          ? startAuctionRound(confirmed, 1, context.now, context.language)
          : { ...confirmed, updatedAt: context.now };
      }

      return state;
    }

    if (state.stage !== "round_active") return state;

    if (input.type === "use_instrument") {
      return useInstrument(state, input.playerId, input.instrumentId, context.now, context.language);
    }

    if (input.type === "submit_bid") {
      const funds = state.fundsByPlayerId[input.playerId] ?? 0;
      if (input.amount < 0 || input.amount > funds) return state;
      const next = {
        ...state,
        currentBidByPlayerId: {
          ...state.currentBidByPlayerId,
          [input.playerId]: input.amount
        },
        updatedAt: context.now
      };
      return allPlayersBid(next) ? closeRound(next, context, context.now) : next;
    }

    return state;
  },

  tick(state, _deltaMs, context) {
    if (state.phase !== "playing") return state;
    if (state.stage === "setup" && state.setupEndsAt !== null && context.now >= state.setupEndsAt) {
      const completed = autoCompleteSetup(state, context.now);
      return startAuctionRound(completed, 1, context.now, context.language);
    }
    if (state.stage === "round_active" && state.roundEndsAt !== null && context.now >= state.roundEndsAt) {
      return closeRound(state, context, context.now);
    }
    if (state.stage === "round_reveal" && state.revealEndsAt !== null && context.now >= state.revealEndsAt) {
      if (state.soldToPlayerId || state.currentRound >= auctionTotalRounds) {
        return {
          ...state,
          stage: "finished",
          revealEndsAt: null,
          trueValueRevealed: true,
          updatedAt: context.now
        };
      }
      return startAuctionRound(state, state.currentRound + 1, context.now, context.language);
    }
    return state;
  },

  isRoundFinished(state) {
    return state.stage === "finished";
  },

  buildScore(state) {
    return state.playerOrder.map((playerId) => ({
      playerId,
      delta: (state.fundsByPlayerId[playerId] ?? auctionStartingFunds) - auctionStartingFunds,
      reason: "Warehouse auction"
    }));
  },

  toPublicState(state, context) {
    return toPublicState(state, context);
  },

  toControllerStateForPlayer(state, context, playerId) {
    const publicState = toPublicState(state, context);
    const spectator = !state.playerOrder.includes(playerId);
    const privateKnowledge = state.privateKnowledgeByPlayerId[playerId] ?? createEmptyKnowledge();
    const combined = mergeKnowledge(state.publicKnowledge, privateKnowledge);
    const revealAll = state.trueValueRevealed || state.stage === "finished";
    const ownSetup = state.setupByPlayerId[playerId] ?? { roleId: null, kitId: null, confirmed: false };

    return {
      ...publicState,
      playerId,
      spectator,
      ownFunds: state.fundsByPlayerId[playerId] ?? 0,
      ownBid: Object.prototype.hasOwnProperty.call(state.currentBidByPlayerId, playerId)
        ? state.currentBidByPlayerId[playerId]
        : null,
      ownRoleId: ownSetup.roleId,
      ownKitId: ownSetup.kitId,
      setupConfirmed: ownSetup.confirmed,
      availableRoles: auctionRoles.map((role) => ({
        id: role.id,
        name: localize(role.name, context.language),
        description: localize(role.description, context.language),
        accent: role.accent,
        portraitPath: role.portraitPath
      })),
      availableKits: auctionKits.map((kit) => ({
        id: kit.id,
        name: localize(kit.name, context.language),
        description: localize(kit.description, context.language),
        cost: kit.cost,
        accent: kit.accent
      })),
      instruments: auctionInstruments.map((instrument) => ({
        id: instrument.id,
        name: localize(instrument.name, context.language),
        description: localize(instrument.description, context.language),
        iconPath: instrument.iconPath
      })),
      ownInstrumentInventory: [...(state.instrumentInventoryByPlayerId[playerId] ?? [])],
      ownCurrentInstrument: state.currentInstrumentByPlayerId[playerId] ?? null,
      privateNotes: privateKnowledge.notes,
      estimatedWarehouseMin: combined.estimatedWarehouseMin,
      estimatedWarehouseMax: combined.estimatedWarehouseMax,
      warehouse: {
        cols: state.warehouse.cols,
        rows: state.warehouse.rows,
        items: visibleWarehouseItems(state.warehouse, combined, context.language, revealAll)
      },
      candidatesByInstanceId: buildCandidates(state.warehouse, combined, context.language),
      canConfigure: state.stage === "setup" && !ownSetup.confirmed && !spectator,
      canAct: state.stage === "round_active" && !spectator
    } satisfies AuctionKingControllerState;
  }
};

export { auctionCatalog };
