import type { BaseRoundState, PlayerInput } from "@open-party-lab/game-core";

export const bullshitRanks = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"
] as const;

export const bullshitSuits = ["clubs", "diamonds", "hearts", "spades"] as const;

export type BullshitRank = (typeof bullshitRanks)[number];
export type BullshitSuit = (typeof bullshitSuits)[number];

export interface BullshitCard {
  id: string;
  rank: BullshitRank;
  suit: BullshitSuit;
}

export interface ToggleCardInput extends PlayerInput {
  type: "toggle_card";
  cardId: string;
}

export interface SelectRankInput extends PlayerInput {
  type: "select_rank";
  rank: BullshitRank;
}

export interface PlaySelectedInput extends PlayerInput {
  type: "play_selected";
}

export interface CheckLastPlayInput extends PlayerInput {
  type: "check";
}

export interface PassInput extends PlayerInput {
  type: "pass";
}

export type BullshitInput =
  | ToggleCardInput
  | SelectRankInput
  | PlaySelectedInput
  | CheckLastPlayInput
  | PassInput;

export interface BullshitPlayedBatch {
  playerId: string;
  cards: BullshitCard[];
  claimedRank: BullshitRank;
  playedAt: number;
}

export interface BullshitResolution {
  challengerPlayerId: string;
  challengedPlayerId: string;
  recipientPlayerId: string;
  truthful: boolean;
  revealedCards: BullshitCard[];
  pileSize: number;
  resolvedAt: number;
}

export interface BullshitState extends BaseRoundState {
  turnOrder: string[];
  currentTurnPlayerId: string | null;
  handsByPlayer: Record<string, BullshitCard[]>;
  selectedCardIdsByPlayer: Record<string, string[]>;
  selectedRankByPlayer: Record<string, BullshitRank | null>;
  activeRank: BullshitRank | null;
  pile: BullshitCard[];
  lastPlay: BullshitPlayedBatch | null;
  passedPlayerIds: string[];
  pendingWinnerPlayerId: string | null;
  winnerPlayerId: string | null;
  lastResolution: BullshitResolution | null;
}

export interface BullshitPlayerSummary {
  playerId: string;
  playerName: string;
  cardCount: number;
  hasPassed: boolean;
}

export interface BullshitLastPlaySummary {
  playerId: string;
  playerName: string;
  claimedRank: BullshitRank;
  count: number;
}

export interface BullshitPublicResolution extends BullshitResolution {
  challengerName: string;
  challengedName: string;
  recipientName: string;
}

export interface BullshitPublicState {
  activeRank: BullshitRank | null;
  pileCount: number;
  currentTurnPlayerId: string | null;
  currentTurnPlayerName: string | null;
  players: BullshitPlayerSummary[];
  lastPlay: BullshitLastPlaySummary | null;
  pendingWinnerPlayerId: string | null;
  pendingWinnerName: string | null;
  winnerPlayerId: string | null;
  winnerName: string | null;
  lastResolution: BullshitPublicResolution | null;
  message?: string;
}

export interface BullshitControllerState extends BullshitPublicState {
  ownHand: BullshitCard[];
  selectedCardIds: string[];
  selectedRank: BullshitRank | null;
  isCurrentTurn: boolean;
  canPlay: boolean;
  canCheck: boolean;
  canPass: boolean;
  passUsed: boolean;
}
