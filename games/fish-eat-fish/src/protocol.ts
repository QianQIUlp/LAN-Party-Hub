// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { BaseRoundState, PlayerInput } from "@open-party-lab/game-core";

export interface FishEatFishInput extends PlayerInput {
  type: "move";
  moveX: number;
  moveY: number;
}

export interface FishEatFishPlayerState {
  playerId: string;
  colorIndex: number;
  x: number;
  y: number;
  angleRad: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  mouth: number;
  munchMs: number;
  gulpMs: number;
  invincibleMs: number;
  eatCooldownMs: number;
  boostMs: number;
  eatenFreeMs: number;
  speedMs: number;
  shieldMs: number;
  slowMs: number;
  milestoneIdx: number;
  inputX: number;
  inputY: number;
}

export type FishSpeciesKey = "gold" | "clown" | "yellow" | "sword" | "blue" | "shark";

export interface FishState {
  id: number;
  key: FishSpeciesKey;
  x: number;
  y: number;
  angleRad: number;
  radius: number;
  cap: number;
  maxR: number;
  speed: number;
  chase: boolean;
  gold: boolean;
  phase: number;
  gulpMs: number;
  wanderAngle: number;
  wanderTimerMs: number;
  targetPlayerId: string | null;
  targetFishId: number | null;
  fleeing: boolean;
  eatCooldownMs: number;
  spawnMs: number;
}

export type FishPowerupKey = "star" | "shield" | "grow" | "freeze";

export interface FishPlayerPalette {
  body: string;
  belly: string;
  dark: string;
  pattern: "spot" | "bar" | "stripe" | "plain";
}

export const FISH_PLAYER_PALETTES: FishPlayerPalette[] = [
  { body: "#3e9bf0", belly: "#d6ecff", dark: "#2a6fc4", pattern: "spot" },
  { body: "#ff6a52", belly: "#ffd9c9", dark: "#d84830", pattern: "bar" },
  { body: "#3ec95a", belly: "#d9ffd9", dark: "#27953c", pattern: "stripe" },
  { body: "#c86bff", belly: "#f0d9ff", dark: "#9c3fd6", pattern: "spot" }
];

export interface FishPowerupState {
  key: FishPowerupKey;
  x: number;
  y: number;
  phase: number;
  lifeMs: number;
}

export interface FishEatFishFxEvent {
  id: number;
  type: "burst" | "text" | "ring" | "hurt" | "milestone";
  x: number;
  y: number;
  color: string;
  text?: string;
  size?: number;
}

export interface FishEatFishState extends BaseRoundState {  arenaWidth: number;
  arenaHeight: number;
  sandY: number;
  roundDurationMs: number;
  finishAt: number | null;
  timeLeftMs: number;
  roundNumber: number;
  fishSeq: number;
  fxSeq: number;
  players: Record<string, FishEatFishPlayerState>;
  fish: FishState[];
  powerups: FishPowerupState[];
  powerupTimerMs: number;
  spawnCooldownMs: number;
  fx: FishEatFishFxEvent[];
  leaderPlayerId?: string;
  rankings?: Array<{
    playerId: string;
    radius: number;
    rank: number;
  }>;
  winnerPlayerId?: string;
  winnerName?: string;
}
