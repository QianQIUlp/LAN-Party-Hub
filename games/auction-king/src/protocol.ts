import type { BaseRoundState, PlayerInput } from "@open-party-lab/game-core";

export type AuctionRarity = "common" | "rare" | "epic" | "legendary";

export interface AuctionItem {
  id: string;
  name: string;
  category: string;
  trueValue: number;
  clues: string[];
  rarity: AuctionRarity;
}

export interface PublicAuctionItem {
  id: string;
  name: string;
  category: string;
  clues: string[];
  rarity: AuctionRarity;
  trueValue: number | null;
}

export interface AuctionRoundResult {
  round: number;
  itemId: string;
  itemName: string;
  category: string;
  rarity: AuctionRarity;
  trueValue: number;
  winnerPlayerId: string | null;
  winningBid: number;
  allBids: Record<string, number>;
}

export interface AuctionKingInput extends PlayerInput {
  type: "submit_bid";
  amount: number;
}

export interface AuctionKingState extends BaseRoundState {
  stage: "appraisal" | "bidding" | "reveal" | "finished";
  currentRound: number;
  totalRounds: number;
  startingGold: number;
  goldByPlayerId: Record<string, number>;
  currentItem: AuctionItem | null;
  usedItemIds: string[];
  bidsByPlayerId: Record<string, number>;
  roundResults: AuctionRoundResult[];
  stageEndsAt: number | null;
}

export interface AuctionKingPublicState {
  stage: AuctionKingState["stage"];
  currentRound: number;
  totalRounds: number;
  startingGold: number;
  goldByPlayerId: Record<string, number>;
  currentItem: PublicAuctionItem | null;
  bidSubmittedByPlayerId: Record<string, boolean>;
  roundResults: AuctionRoundResult[];
  stageEndsAt: number | null;
  playerProgress: Array<{
    playerId: string;
    name: string;
    color: string;
    gold: number;
    hasBid: boolean;
  }>;
}

export interface AuctionKingControllerState extends AuctionKingPublicState {
  playerId: string;
  ownBid: number | null;
  canBid: boolean;
  bidOptions: number[];
}
