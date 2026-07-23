import type { BaseRoundState, PlayerInput } from "@open-party-lab/game-core";

export type RouletteShell = "live" | "blank";
export type RouletteTarget = "self" | "rival";
export type RouletteStage = "duel" | "resolved";

export interface RouletteFireInput extends PlayerInput {
  type: "fire";
  target: RouletteTarget;
}

export type RouletteInput = RouletteFireInput;

export interface RouletteShot {
  actionNumber: number;
  shooterPlayerId: string;
  targetPlayerId: string;
  target: RouletteTarget;
  shell: RouletteShell;
  revealedAt: number;
}

export interface RouletteState extends BaseRoundState {
  stage: RouletteStage;
  playerOrder: string[];
  currentPlayerIndex: number;
  healthByPlayer: Record<string, number>;
  maxHealth: number;
  shells: RouletteShell[];
  liveShellsRemaining: number;
  blankShellsRemaining: number;
  reloadNumber: number;
  actionNumber: number;
  nextActionAt: number;
  lastShot?: RouletteShot;
  winnerPlayerId?: string;
}

export interface RoulettePublicState {
  stage: RouletteStage;
  playerOrder: string[];
  currentPlayerId?: string;
  healthByPlayer: Record<string, number>;
  maxHealth: number;
  liveShellsRemaining: number;
  blankShellsRemaining: number;
  reloadNumber: number;
  actionNumber: number;
  lastShot?: RouletteShot;
  winnerPlayerId?: string;
  message?: string;
}

export interface RouletteControllerState extends RoulettePublicState {
  playerId: string;
  rivalPlayerId?: string;
  isCurrentPlayer: boolean;
  canAct: boolean;
}
