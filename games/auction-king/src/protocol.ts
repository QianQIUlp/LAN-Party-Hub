import type { BaseRoundState, PlayerInput } from "@open-party-lab/game-core";

export type AuctionRarity = "white" | "green" | "blue" | "purple" | "gold" | "red";
export type AuctionCategory = "relic" | "art" | "tech" | "nature" | "luxury" | "oddity";
export type AuctionRoleId =
  | "spectrum_cartographer"
  | "apex_hunter"
  | "fog_classifier"
  | "echo_archivist"
  | "spatial_engineer"
  | "value_auditor";
export type AuctionKitId = "none" | "survey" | "professional" | "deep_scan";
export type AuctionInstrumentId =
  | "largest_appraiser"
  | "quality_array"
  | "outline_engine"
  | "gold_counter"
  | "category_spectrometer"
  | "value_estimator";
export type AuctionStage = "setup" | "round_active" | "round_reveal" | "finished";

export interface LocalizedText {
  "zh-CN": string;
  en: string;
  de: string;
}

export interface AuctionCatalogItem {
  id: string;
  name: LocalizedText;
  category: AuctionCategory;
  rarity: AuctionRarity;
  value: number;
  width: number;
  height: number;
  spawnWeight: number;
  imagePath?: string;
}

export interface WarehouseItem {
  instanceId: string;
  catalogId: string;
  category: AuctionCategory;
  rarity: AuctionRarity;
  trueValue: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

export interface AuctionWarehouse {
  cols: number;
  rows: number;
  items: WarehouseItem[];
  totalValue: number;
  occupiedCells: number;
}

export interface ItemKnowledge {
  outlineKnown: boolean;
  rarityKnown: boolean;
  categoryKnown: boolean;
  identityKnown: boolean;
}

export interface KnowledgeNote {
  id: string;
  source: "auctioneer" | "role" | "instrument";
  round: number;
  text: string;
}

export interface PlayerKnowledge {
  items: Record<string, ItemKnowledge>;
  notes: KnowledgeNote[];
  estimatedWarehouseMin: number | null;
  estimatedWarehouseMax: number | null;
}

export interface AuctionPlayerSetup {
  roleId: AuctionRoleId | null;
  kitId: AuctionKitId | null;
  confirmed: boolean;
}

export interface AuctionRoundHistory {
  round: number;
  threshold: number;
  bids: Record<string, number>;
  instruments: Record<string, AuctionInstrumentId | null>;
  highestBid: number;
  secondBid: number;
  leaderPlayerId: string | null;
  sold: boolean;
  revealedAt: number;
}

export interface AuctionKingState extends BaseRoundState {
  stage: AuctionStage;
  setupEndsAt: number | null;
  roundEndsAt: number | null;
  revealEndsAt: number | null;
  currentRound: number;
  totalRounds: number;
  startingFunds: number;
  playerOrder: string[];
  setupByPlayerId: Record<string, AuctionPlayerSetup>;
  fundsByPlayerId: Record<string, number>;
  instrumentInventoryByPlayerId: Record<string, AuctionInstrumentId[]>;
  roleMemoryByPlayerId: Record<string, string[]>;
  currentInstrumentByPlayerId: Record<string, AuctionInstrumentId | null>;
  currentBidByPlayerId: Record<string, number>;
  warehouse: AuctionWarehouse;
  publicKnowledge: PlayerKnowledge;
  privateKnowledgeByPlayerId: Record<string, PlayerKnowledge>;
  history: AuctionRoundHistory[];
  auctioneerNotes: KnowledgeNote[];
  soldToPlayerId: string | null;
  soldFor: number;
  trueValueRevealed: boolean;
}

export type AuctionKingInput =
  | (PlayerInput & { type: "select_role"; roleId: AuctionRoleId })
  | (PlayerInput & { type: "select_kit"; kitId: AuctionKitId })
  | (PlayerInput & { type: "confirm_setup" })
  | (PlayerInput & { type: "use_instrument"; instrumentId: AuctionInstrumentId })
  | (PlayerInput & { type: "submit_bid"; amount: number });

export interface AuctionRoleView {
  id: AuctionRoleId;
  name: string;
  description: string;
  accent: string;
  portraitPath?: string;
}

export interface AuctionKitView {
  id: AuctionKitId;
  name: string;
  description: string;
  cost: number;
  accent: string;
}

export interface AuctionInstrumentView {
  id: AuctionInstrumentId;
  name: string;
  description: string;
  iconPath?: string;
}

export interface VisibleWarehouseItem {
  instanceId: string;
  anchorX: number;
  anchorY: number;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  outlineKnown: boolean;
  rarityKnown: boolean;
  categoryKnown: boolean;
  identityKnown: boolean;
  rarity: AuctionRarity | null;
  category: AuctionCategory | null;
  catalogId: string | null;
  name: string | null;
  imagePath?: string;
  trueValue: number | null;
}

export interface AuctionCandidateView {
  catalogId: string;
  name: string;
  category: AuctionCategory;
  rarity: AuctionRarity;
  width: number;
  height: number;
  value: number;
  imagePath?: string;
  probability: number;
  confidence: "certain" | "likely" | "possible";
  reasons: string[];
}

export interface AuctionPlayerPublicView {
  playerId: string;
  name: string;
  color: string;
  roleId: AuctionRoleId | null;
  roleName: string | null;
  setupConfirmed: boolean;
}

export interface AuctionKingPublicState {
  stage: AuctionStage;
  currentRound: number;
  totalRounds: number;
  startingFunds: number;
  stageEndsAt: number | null;
  threshold: number;
  players: AuctionPlayerPublicView[];
  history: AuctionRoundHistory[];
  publicNotes: KnowledgeNote[];
  warehouse: {
    cols: number;
    rows: number;
    items: VisibleWarehouseItem[];
  };
  submittedBidByPlayerId: Record<string, boolean>;
  usedInstrumentByPlayerId: Record<string, boolean>;
  soldToPlayerId: string | null;
  soldFor: number;
  trueWarehouseValue: number | null;
}

export interface AuctionKingControllerState extends AuctionKingPublicState {
  playerId: string;
  spectator: boolean;
  ownFunds: number;
  ownBid: number | null;
  ownRoleId: AuctionRoleId | null;
  ownKitId: AuctionKitId | null;
  setupConfirmed: boolean;
  availableRoles: AuctionRoleView[];
  availableKits: AuctionKitView[];
  instruments: AuctionInstrumentView[];
  ownInstrumentInventory: AuctionInstrumentId[];
  ownCurrentInstrument: AuctionInstrumentId | null;
  privateNotes: KnowledgeNote[];
  estimatedWarehouseMin: number | null;
  estimatedWarehouseMax: number | null;
  candidatesByInstanceId: Record<string, AuctionCandidateView[]>;
  canConfigure: boolean;
  canAct: boolean;
}
