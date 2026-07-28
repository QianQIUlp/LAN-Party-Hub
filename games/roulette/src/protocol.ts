import type { BaseRoundState, PlayerInput } from "@open-party-lab/game-core";

export type RouletteShell = "live" | "blank";
export type RouletteTarget = "self" | "rival";
export type RouletteStage = "duel" | "intermission" | "resolved";
export type RouletteItem =
  | "field_dress"
  | "lens"
  | "extractor"
  | "restraint"
  | "overcharge"
  | "inverter";

export interface RouletteFireInput extends PlayerInput {
  type: "fire";
  target: RouletteTarget;
}

export interface RouletteUseItemInput extends PlayerInput {
  type: "use_item";
  item: RouletteItem;
}

export type RouletteInput = RouletteFireInput | RouletteUseItemInput;

export interface RouletteShot {
  actionNumber: number;
  shooterPlayerId: string;
  targetPlayerId: string;
  target: RouletteTarget;
  shell: RouletteShell;
  damage: number;
  revealedAt: number;
}

export type RouletteActionEvent =
  | {
      eventNumber: number;
      kind: "shot";
      playerId: string;
      targetPlayerId: string;
      shell: RouletteShell;
      damage: number;
      at: number;
    }
  | {
      eventNumber: number;
      kind: "item";
      playerId: string;
      item: RouletteItem;
      revealedShell?: RouletteShell;
      at: number;
    }
  | {
      eventNumber: number;
      kind: "reload";
      liveShells: number;
      blankShells: number;
      at: number;
    }
  | {
      eventNumber: number;
      kind: "duel_result";
      winnerPlayerId: string;
      at: number;
    };

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
  inventoryByPlayer: Record<string, RouletteItem[]>;
  knownCurrentShellByPlayer: Record<string, RouletteShell | null>;
  skipNextTurnByPlayer: Record<string, boolean>;
  damageMultiplierByPlayer: Record<string, number>;
  duelNumber: number;
  duelWinsRequired: number;
  duelWinsByPlayer: Record<string, number>;
  intermissionEndsAt: number | null;
  duelWinnerPlayerId?: string;
  lastShot?: RouletteShot;
  lastEvent?: RouletteActionEvent;
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
  inventoryCountByPlayer: Record<string, number>;
  visibleToolsByPlayer: Record<string, RouletteItem[]>;
  restrainedPlayerIds: string[];
  boostedPlayerIds: string[];
  duelNumber: number;
  duelWinsRequired: number;
  duelWinsByPlayer: Record<string, number>;
  intermissionEndsAt: number | null;
  duelWinnerPlayerId?: string;
  lastShot?: RouletteShot;
  lastEvent?: RouletteActionEvent;
  winnerPlayerId?: string;
  message?: string;
}

export interface RouletteControllerState extends RoulettePublicState {
  playerId: string;
  rivalPlayerId?: string;
  isCurrentPlayer: boolean;
  canAct: boolean;
  ownInventory: RouletteItem[];
  knownCurrentShell: RouletteShell | null;
}
