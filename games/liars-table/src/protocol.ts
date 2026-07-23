import type { BaseRoundState, PlayerInput } from "@open-party-lab/game-core";

export type LiarsClaimRank = "crown" | "moon" | "key";
export type LiarsCardRank = LiarsClaimRank | "wild";
export type LiarsTableStage = "turn" | "reveal" | "resolved";
export type LiarsChamberResult = "blank" | "live";

export interface LiarsCard {
  id: string;
  rank: LiarsCardRank;
}

export type LiarsTableInput =
  | (PlayerInput & {
      type: "play_card";
      cardId: string;
    })
  | (PlayerInput & {
      type: "challenge";
    });

export interface LiarsPrivatePlay {
  playerId: string;
  card: LiarsCard;
  playedAt: number;
}

export interface LiarsPublicPlay {
  playerId: string;
  cardCount: 1;
  playedAt: number;
}

export interface LiarsReveal {
  accusedPlayerId: string;
  challengerPlayerId: string;
  loserPlayerId: string;
  card: LiarsCard;
  truthful: boolean;
  chamberResult: LiarsChamberResult;
  lifeLost: boolean;
  revealedAt: number;
}

export interface LiarsTableState extends BaseRoundState {
  stage: LiarsTableStage;
  playerOrder: string[];
  activePlayerIds: string[];
  currentPlayerId?: string;
  healthByPlayer: Record<string, number>;
  maxHealth: number;
  handsByPlayer: Record<string, LiarsCard[]>;
  tableRank: LiarsClaimRank;
  lastPlay?: LiarsPrivatePlay;
  lastReveal?: LiarsReveal;
  handNumber: number;
  turnNumber: number;
  dangerIndexByPlayer: Record<string, number>;
  chamberStepByPlayer: Record<string, number>;
  revealEndsAt: number | null;
  nextStarterPlayerId?: string;
  winnerPlayerId?: string;
}

export interface LiarsChamberRisk {
  numerator: 1;
  denominator: number;
}

export interface LiarsTablePublicState {
  stage: LiarsTableStage;
  playerOrder: string[];
  activePlayerIds: string[];
  currentPlayerId?: string;
  healthByPlayer: Record<string, number>;
  maxHealth: number;
  handCountByPlayer: Record<string, number>;
  tableRank: LiarsClaimRank;
  lastPlay?: LiarsPublicPlay;
  lastReveal?: LiarsReveal;
  handNumber: number;
  turnNumber: number;
  chamberRiskByPlayer: Record<string, LiarsChamberRisk>;
  revealEndsAt: number | null;
  winnerPlayerId?: string;
  message?: string;
}

export interface LiarsTableControllerState extends LiarsTablePublicState {
  playerId: string;
  ownHand: LiarsCard[];
  canPlay: boolean;
  canChallenge: boolean;
}
