// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
// Self-contained, serializable fish arena simulation. No DOM, canvas, or I/O.
import type {
  FishEatFishFxEvent,
  FishEatFishPlayerState,
  FishEatFishState,
  FishPowerupKey,
  FishPowerupState,
  FishSpeciesKey,
  FishState
} from "../protocol.js";
import { FISH_PLAYER_PALETTES } from "../protocol.js";

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 720;
export const SAND_Y = 636;
export const ROUND_TIME_MS = 90_000;
export const START_R = 16;
const MAX_R = 150;
const SPEED_BASE = 270;
const SPEED_MIN = 92;
const SPEED_FALL = 2.0;
const ACCEL = 8.0;
const TURN_SPEED = 8.5;

const EATEN_KEEP = 0.42;
const EATEN_FLOOR = 12;
const EATEN_INVINCIBLE_MS = 2_800;
const EATEN_BOOST_MS = 2_500;
const EATEN_BOOST_MULT = 1.35;
const EAT_PLAYER_MULT = 1.6;
const COMBO_WINDOW_MS = 20_000;
const REVENGE_RATIO = 0.5;
const REVENGE_MULT = 1.5;

const POWERUP_SPAWN_INTERVAL_MS = 7_000;
const POWERUP_MAX = 3;
const POWERUP_LIFE_MS = 12_000;
const POWERUP_PICK = 16;
const POWERUP_KEYS: Array<{ key: FishPowerupKey; durMs: number; weight: number }> = [
  { key: "star", durMs: 5_000, weight: 3 },
  { key: "shield", durMs: 4_500, weight: 3 },
  { key: "grow", durMs: 0, weight: 3 },
  { key: "freeze", durMs: 3_000, weight: 2 }
];

const EAT_NEED = 1.0;
const MOUTH_CONE = 0.38;
const BITE_RANGE = 1.12;
const GULP_TIME_MS = 300;
const GROW_POW = 0.17;
const GROW_FALL = 95;
const GROW_MIN = 0.22;
const HURT_KEEP = 0.72;
const INVINCIBLE_MS = 2_200;
const EAT_CD_MS = 300;
const MILESTONES = [30, 50, 75, 100, 125];

interface SpeciesConfig {
  rmin: number;
  rmax: number;
  speed: number;
  count: number;
  chase: boolean;
  gold?: boolean;
  nose?: boolean;
  pattern: "plain" | "bar" | "stripe" | "spot" | "shark";
  color: string;
}

const SPECIES: Record<FishSpeciesKey, SpeciesConfig> = {
  gold: { rmin: 7, rmax: 9, speed: 120, count: 1, chase: false, gold: true, pattern: "plain", color: "#ffd23f" },
  clown: { rmin: 10, rmax: 12, speed: 90, count: 6, chase: false, pattern: "bar", color: "#ff8f4d" },
  yellow: { rmin: 14, rmax: 17, speed: 82, count: 5, chase: false, pattern: "plain", color: "#ffe27a" },
  sword: { rmin: 20, rmax: 24, speed: 105, count: 2, chase: true, nose: true, pattern: "stripe", color: "#a5e3ff" },
  blue: { rmin: 30, rmax: 36, speed: 85, count: 1, chase: true, pattern: "spot", color: "#5f8dff" },
  shark: { rmin: 46, rmax: 56, speed: 78, count: 1, chase: true, nose: true, pattern: "shark", color: "#9aa7b8" }
};

export const FISH_SPECIES = SPECIES;

const DIFF_MAX = 3;const DIFF_SIZE_STEP = 0.12;
const DIFF_COUNT: Record<FishSpeciesKey, number> = { gold: 0, clown: 1, yellow: 1, sword: 0, blue: 0, shark: 0 };

const AI_GROW = 0.09;
const AI_MAX_MULT = 1.55;
const PERCEIVE_FLEE = 170;
const PERCEIVE_CHASE = 190;
const HUNT_MIN = 0.75;
const AI_TURN = 3.1;
const FLEE_BOOST = 1.15;
const CHASE_BOOST = 1.06;
const AI_EAT_CD_MS = 450;
const SPAWN_COOLDOWN_MS = 1_000;
const SPAWN_PER_STEP = 2;

export function playerPalette(colorIndex: number) {
  return FISH_PLAYER_PALETTES[colorIndex % FISH_PLAYER_PALETTES.length];
}

function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function diffFor(roundNumber: number): number {
  return Math.min(DIFF_MAX, Math.max(0, roundNumber - 1));
}

function targetCount(key: FishSpeciesKey, roundNumber: number): number {
  return SPECIES[key].count + DIFF_COUNT[key] * diffFor(roundNumber);
}

function speciesSpawnRadius(key: FishSpeciesKey, roundNumber: number): number {
  const t = SPECIES[key];
  const mul = t.chase ? 1 : 1 + diffFor(roundNumber) * DIFF_SIZE_STEP;
  return rnd(t.rmin, t.rmax) * mul;
}

function edgeSpawn(): { x: number; y: number; angleRad: number } {
  const side = (Math.random() * 4) | 0;
  let x = 0;
  let y = 0;
  if (side === 0) {
    x = -40;
    y = rnd(70, SAND_Y - 50);
  } else if (side === 1) {
    x = ARENA_WIDTH + 40;
    y = rnd(70, SAND_Y - 50);
  } else if (side === 2) {
    x = rnd(40, ARENA_WIDTH - 40);
    y = -40;
  } else {
    x = rnd(40, ARENA_WIDTH - 40);
    y = SAND_Y + 40;
  }
  const angleRad = Math.atan2(ARENA_HEIGHT / 2 - y, ARENA_WIDTH / 2 - x) + rnd(-0.7, 0.7);
  return { x, y, angleRad };
}

function makeFish(id: number, key: FishSpeciesKey, radius: number): FishState {
  const t = SPECIES[key];
  const spawn = edgeSpawn();
  return {
    id,
    key,
    x: spawn.x,
    y: spawn.y,
    angleRad: spawn.angleRad,
    radius,
    cap: Math.max(t.rmax, radius) * AI_MAX_MULT,
    maxR: t.rmax,
    speed: t.speed * rnd(0.92, 1.08),
    chase: t.chase,
    gold: Boolean(t.gold),
    phase: rnd(0, 6.28),
    gulpMs: 0,
    wanderAngle: rnd(-3, 3),
    wanderTimerMs: rnd(1_200, 2_600),
    targetPlayerId: null,
    targetFishId: null,
    fleeing: false,
    eatCooldownMs: 0,
    spawnMs: 900
  };
}

function spawnFish(state: FishEatFishState, key: FishSpeciesKey): void {
  state.fish.push(makeFish(state.fishSeq++, key, speciesSpawnRadius(key, state.roundNumber)));
}

export function createFishWorld(roundNumber: number): {
  fish: FishState[];
  powerups: FishPowerupState[];
  powerupTimerMs: number;
} {
  const fish: FishState[] = [];
  let fishSeq = 0;
  for (const key of Object.keys(SPECIES) as FishSpeciesKey[]) {
    for (let i = 0; i < targetCount(key, roundNumber); i++) {
      fish.push(makeFish(fishSeq++, key, speciesSpawnRadius(key, roundNumber)));
    }
  }
  return { fish, powerups: [], powerupTimerMs: 3_000 };
}

const SPAWN_SPOTS = [
  { x: ARENA_WIDTH * 0.3, y: ARENA_HEIGHT * 0.4, angleRad: 0 },
  { x: ARENA_WIDTH * 0.7, y: ARENA_HEIGHT * 0.4, angleRad: Math.PI },
  { x: ARENA_WIDTH * 0.3, y: ARENA_HEIGHT * 0.68, angleRad: 0 },
  { x: ARENA_WIDTH * 0.7, y: ARENA_HEIGHT * 0.68, angleRad: Math.PI }
];

export function createPlayers(playerIds: string[]): Record<string, FishEatFishPlayerState> {
  const players: Record<string, FishEatFishPlayerState> = {};
  for (let i = 0; i < playerIds.length; i++) {
    const playerId = playerIds[i];
    const spot = SPAWN_SPOTS[i % SPAWN_SPOTS.length];
    players[playerId] = {
      playerId,
      colorIndex: i % FISH_PLAYER_PALETTES.length,
      x: spot.x,
      y: spot.y,
      angleRad: spot.angleRad,
      vx: 0,
      vy: 0,
      radius: START_R,
      phase: rnd(0, 6.28),
      mouth: 0,
      munchMs: 0,
      gulpMs: 0,
      invincibleMs: 0,
      eatCooldownMs: 0,
      boostMs: 0,
      eatenFreeMs: 0,
      speedMs: 0,
      shieldMs: 0,
      slowMs: 0,
      milestoneIdx: 0,
      inputX: 0,
      inputY: 0
    };
  }
  return players;
}

export function playerSpeed(p: FishEatFishPlayerState): number {
  let spd = Math.max(SPEED_MIN, SPEED_BASE - (p.radius - START_R) * SPEED_FALL);
  if (p.boostMs > 0) spd *= EATEN_BOOST_MULT;
  if (p.speedMs > 0) spd *= 1.4;
  if (p.slowMs > 0) spd *= 0.55;
  return spd;
}

function growOf(eaterRadius: number, targetRadius: number, gold: boolean): number {
  const df = Math.max(GROW_MIN, 1 - (eaterRadius - START_R) / GROW_FALL);
  let gain = targetRadius * GROW_POW * df;
  if (gold) gain *= 2;
  return Math.max(0.8, gain);
}

function pushFx(state: FishEatFishState, event: Omit<FishEatFishFxEvent, "id">): void {
  state.fxSeq += 1;
  state.fx.push({ id: state.fxSeq, ...event });
  if (state.fx.length > 24) {
    state.fx.splice(0, state.fx.length - 24);
  }
}

function checkMilestone(state: FishEatFishState, p: FishEatFishPlayerState): void {
  const milestone = MILESTONES[p.milestoneIdx];
  if (milestone !== undefined && p.radius >= milestone) {
    pushFx(state, { type: "milestone", x: p.x, y: p.y - p.radius - 20, color: "#ffd23f" });
    p.milestoneIdx += 1;
  }
}

function tryBite(eaterRadius: number, targetRadius: number, targetInvincibleMs: number, targetShieldMs: number, eaterCdMs: number, eaterX: number, eaterY: number, eaterAngle: number, targetX: number, targetY: number): boolean {
  if (eaterRadius <= targetRadius * EAT_NEED) return false;
  if (targetInvincibleMs > 0) return false;
  if (targetShieldMs > 0) return false;
  if (eaterCdMs > 0) return false;
  const dx = targetX - eaterX;
  const dy = targetY - eaterY;
  const d = Math.hypot(dx, dy);
  if (d < 1) return false;
  const cone = Math.cos(eaterAngle) * dx + Math.sin(eaterAngle) * dy;
  if (cone <= 0) return false;
  if (cone < d * MOUTH_CONE) return false;
  return d < (eaterRadius + targetRadius * 0.7) * BITE_RANGE;
}

function markEater(state: FishEatFishState, p: FishEatFishPlayerState): void {
  p.munchMs = 220;
  p.eatCooldownMs = EAT_CD_MS;
  p.gulpMs = GULP_TIME_MS;
  checkMilestone(state, p);
}

function biteFish(state: FishEatFishState, eater: FishEatFishPlayerState | FishState, target: FishState, eaterIsPlayer: boolean, roundPlayers: FishEatFishPlayerState[]): void {
  const tx = target.x;
  const ty = target.y;
  let gain = growOf(eater.radius, target.radius, target.gold);
  let revenge = false;

  if (eaterIsPlayer) {
    const p = eater as FishEatFishPlayerState;
    const rival = roundPlayers.reduce<FishEatFishPlayerState | null>(
      (best, other) => (other.playerId !== p.playerId && (!best || other.radius > best.radius) ? other : best),
      null
    );
    if (rival && p.radius <= rival.radius * REVENGE_RATIO) {
      gain *= REVENGE_MULT;
      revenge = true;
    }
    p.radius = Math.min(MAX_R, p.radius + gain);
    markEater(state, p);
  } else {
    const f = eater as FishState;
    f.radius = Math.min(f.cap, f.radius + target.radius * AI_GROW);
    f.eatCooldownMs = AI_EAT_CD_MS;
    f.gulpMs = GULP_TIME_MS;
  }

  pushFx(state, { type: "burst", x: tx, y: ty, color: target.gold ? "#ffd23f" : "#cfeaff" });
  pushFx(state, {
    type: "text",
    x: eater.x,
    y: eater.y - eater.radius - 18,
    color: target.gold ? "#ffd23f" : "#8ff0d0",
    text: (target.gold ? "gold! " : "") + "+" + gain.toFixed(1),
    size: target.gold ? 20 : 17
  });
  if (revenge) {
    pushFx(state, { type: "text", x: eater.x, y: eater.y - eater.radius - 36, color: "#ffe08a", text: "x" + REVENGE_MULT.toFixed(1), size: 14 });
  }
  pushFx(state, { type: "ring", x: tx, y: ty, color: "rgba(143,240,208,.9)" });
  respawnFish(state, target);
}

function respawnFish(state: FishEatFishState, target: FishState): void {
  const spawn = edgeSpawn();
  target.x = spawn.x;
  target.y = spawn.y;
  target.angleRad = spawn.angleRad;
  target.targetPlayerId = null;
  target.targetFishId = null;
  target.fleeing = false;
  target.spawnMs = 900;
}

function bitePlayer(state: FishEatFishState, eater: FishState, target: FishEatFishPlayerState): void {
  const before = target.radius;
  target.radius = Math.max(12, target.radius * HURT_KEEP);
  target.invincibleMs = INVINCIBLE_MS;
  eater.radius = Math.min(eater.cap, eater.radius + before * AI_GROW);
  eater.gulpMs = GULP_TIME_MS;
  eater.eatCooldownMs = AI_EAT_CD_MS;
  pushFx(state, { type: "burst", x: target.x, y: target.y, color: "#ff6a5a" });
  pushFx(state, { type: "text", x: target.x, y: target.y - 30, color: "#ff6a5a", text: "-" + (before - target.radius).toFixed(1), size: 16 });
  pushFx(state, { type: "hurt", x: target.x, y: target.y, color: "#ff3c2d" });
}

function eatPlayer(state: FishEatFishState, winner: FishEatFishPlayerState, loser: FishEatFishPlayerState): void {
  const before = loser.radius;
  const gain = growOf(winner.radius, loser.radius, false) * EAT_PLAYER_MULT;
  winner.radius = Math.min(MAX_R, winner.radius + gain);
  markEater(state, winner);

  let lost = 0;
  if (loser.eatenFreeMs > 0) {
    loser.eatenFreeMs = 0;
    pushFx(state, { type: "text", x: loser.x, y: loser.y - 34, color: "#ffe08a", text: "safe!", size: 16 });
  } else {
    loser.radius = Math.max(EATEN_FLOOR, winner.radius * EATEN_KEEP);
    lost = before - loser.radius;
    loser.eatenFreeMs = COMBO_WINDOW_MS;
    pushFx(state, { type: "text", x: loser.x, y: loser.y - 34, color: "#ff6a5a", text: "-" + lost.toFixed(1), size: 16 });
  }
  loser.invincibleMs = Math.max(loser.invincibleMs, EATEN_INVINCIBLE_MS);
  loser.boostMs = Math.max(loser.boostMs, EATEN_BOOST_MS);

  const kx = loser.x - winner.x;
  const ky = loser.y - winner.y;
  const kl = Math.hypot(kx, ky) || 1;
  loser.vx = (kx / kl) * 330;
  loser.vy = (ky / kl) * 330;

  pushFx(state, { type: "burst", x: loser.x, y: loser.y, color: "#ff8a78" });
  pushFx(state, { type: "text", x: winner.x, y: winner.y - winner.radius - 18, color: "#ffd23f", text: "+" + gain.toFixed(1), size: 22 });
  pushFx(state, { type: "hurt", x: loser.x, y: loser.y, color: "#ff3c2d" });
  checkMilestone(state, winner);
}

function updatePlayer(p: FishEatFishPlayerState, dtMs: number): void {
  const dt = dtMs / 1000;
  const spd = playerSpeed(p);
  const ax = p.inputX;
  const ay = p.inputY;

  if (ax !== 0 || ay !== 0) {
    const targetA = Math.atan2(ay, ax);
    let d = targetA - p.angleRad;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const max = TURN_SPEED * dt;
    p.angleRad += clamp(d, -max, max);
    const k = Math.min(1, ACCEL * dt);
    p.vx += (Math.cos(p.angleRad) * spd - p.vx) * k;
    p.vy += (Math.sin(p.angleRad) * spd - p.vy) * k;
    p.mouth = Math.min(1, p.mouth + dt * 5);
  } else {
    const drag = Math.max(0, 1 - dt * 3.5);
    p.vx *= drag;
    p.vy *= drag;
    p.mouth = Math.max(0, p.mouth - dt * 4);
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;

  const m = p.radius + 6;
  if (p.x < m) {
    p.x = m;
    p.vx = Math.abs(p.vx) * 0.3;
  } else if (p.x > ARENA_WIDTH - m) {
    p.x = ARENA_WIDTH - m;
    p.vx = -Math.abs(p.vx) * 0.3;
  }
  if (p.y < m + 30) {
    p.y = m + 30;
    p.vy = Math.abs(p.vy) * 0.3;
  } else if (p.y > SAND_Y - p.radius * 0.45) {
    p.y = SAND_Y - p.radius * 0.45;
    p.vy = -Math.abs(p.vy) * 0.3;
  }

  p.phase += dt * (5 + Math.hypot(p.vx, p.vy) * 0.02);
  p.invincibleMs = Math.max(0, p.invincibleMs - dtMs);
  p.eatCooldownMs = Math.max(0, p.eatCooldownMs - dtMs);
  p.munchMs = Math.max(0, p.munchMs - dtMs);
  p.gulpMs = Math.max(0, p.gulpMs - dtMs);
  p.boostMs = Math.max(0, p.boostMs - dtMs);
  p.eatenFreeMs = Math.max(0, p.eatenFreeMs - dtMs);
  p.speedMs = Math.max(0, p.speedMs - dtMs);
  p.shieldMs = Math.max(0, p.shieldMs - dtMs);
  p.slowMs = Math.max(0, p.slowMs - dtMs);
}

function updateFish(state: FishEatFishState, f: FishState, dtMs: number): void {
  const dt = dtMs / 1000;
  f.phase += dt * (5 + f.speed * 0.02);
  f.eatCooldownMs = Math.max(0, f.eatCooldownMs - dtMs);
  f.spawnMs = Math.max(0, f.spawnMs - dtMs);
  f.gulpMs = Math.max(0, f.gulpMs - dtMs);

  let big: { x: number; y: number } | null = null;
  let dBig = 1e9;
  let small: { x: number; y: number; id?: number; playerId?: string } | null = null;
  let dSmall = 1e9;
  const fleeR = PERCEIVE_FLEE * (f.gold ? 1.7 : 1);

  for (const o of state.fish) {
    if (o.id === f.id) continue;
    const dx = o.x - f.x;
    const dy = o.y - f.y;
    const d = Math.hypot(dx, dy);
    if (o.radius > f.radius && d < fleeR && d < dBig) {
      dBig = d;
      big = o;
    }
    if (o.radius < f.radius && d < PERCEIVE_CHASE && d < dSmall) {
      dSmall = d;
      small = { x: o.x, y: o.y, id: o.id };
    }
  }
  for (const p of Object.values(state.players)) {
    const dx = p.x - f.x;
    const dy = p.y - f.y;
    const d = Math.hypot(dx, dy);
    if (p.radius > f.radius && d < fleeR && d < dBig) {
      dBig = d;
      big = p;
    }
    if (f.chase && p.radius < f.radius && p.radius >= f.maxR * HUNT_MIN && d < PERCEIVE_CHASE && d < dSmall) {
      dSmall = d;
      small = { x: p.x, y: p.y, playerId: p.playerId };
    }
  }

  f.fleeing = big !== null;
  f.targetPlayerId = null;
  f.targetFishId = null;
  let desired: number;
  if (big) {
    desired = Math.atan2(f.y - big.y, f.x - big.x);
  } else if (small && f.chase) {
    if (small.playerId) {
      f.targetPlayerId = small.playerId;
    } else if (small.id !== undefined) {
      f.targetFishId = small.id;
    }
    desired = Math.atan2(small.y - f.y, small.x - f.x);
  } else {
    desired = f.wanderAngle;
  }

  if (f.x < 70) desired = 0;
  else if (f.x > ARENA_WIDTH - 70) desired = Math.PI;
  if (f.y < 70) desired = Math.PI / 2;
  else if (f.y > SAND_Y - 50) desired = -Math.PI / 2;

  let d = desired - f.angleRad;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const max = AI_TURN * dt;
  f.angleRad += clamp(d, -max, max);

  let spd = f.speed;
  if (f.fleeing) spd *= FLEE_BOOST;
  else if (f.targetPlayerId !== null || f.targetFishId !== null) spd *= CHASE_BOOST;
  f.x += Math.cos(f.angleRad) * spd * dt;
  f.y += Math.sin(f.angleRad) * spd * dt;
  f.x = clamp(f.x, 26, ARENA_WIDTH - 26);
  f.y = clamp(f.y, 46, SAND_Y - 16);

  f.wanderTimerMs -= dtMs;
  if (f.wanderTimerMs <= 0) {
    f.wanderTimerMs = rnd(1_200, 2_800);
    f.wanderAngle = f.angleRad + rnd(-2.2, 2.2);
  }
}

function fillStep(state: FishEatFishState): void {
  for (const key of Object.keys(SPECIES) as FishSpeciesKey[]) {
    const deficit = targetCount(key, state.roundNumber) - state.fish.reduce((count, f) => (f.key === key ? count + 1 : count), 0);
    for (let i = 0; i < Math.min(deficit, SPAWN_PER_STEP); i++) {
      spawnFish(state, key);
    }
  }
}

function spawnPowerup(state: FishEatFishState): void {
  if (state.powerups.length >= POWERUP_MAX) return;
  let total = 0;
  for (const entry of POWERUP_KEYS) total += entry.weight;
  let roll = Math.random() * total;
  let key: FishPowerupKey = "star";
  for (const entry of POWERUP_KEYS) {
    roll -= entry.weight;
    if (roll <= 0) {
      key = entry.key;
      break;
    }
  }
  state.powerups.push({
    key,
    x: rnd(60, ARENA_WIDTH - 60),
    y: rnd(70, SAND_Y - 60),
    phase: rnd(0, 6.28),
    lifeMs: POWERUP_LIFE_MS
  });
}

function applyPowerup(state: FishEatFishState, p: FishEatFishPlayerState, pu: FishPowerupState): void {
  const colors: Record<FishPowerupKey, string> = {
    star: "#8ad4ff",
    shield: "#ffe08a",
    grow: "#7dff8a",
    freeze: "#9fe8ff"
  };
  state.powerups = state.powerups.filter((entry) => entry !== pu);
  pushFx(state, { type: "burst", x: pu.x, y: pu.y, color: colors[pu.key] });
  if (pu.key === "grow") {
    p.radius = Math.min(MAX_R, p.radius + 12);
    pushFx(state, { type: "text", x: p.x, y: p.y - p.radius - 18, color: colors.grow, text: "+12", size: 17 });
    checkMilestone(state, p);
  } else if (pu.key === "freeze") {
    let victim: FishEatFishPlayerState | null = null;
    let bestD = 1e9;
    for (const other of Object.values(state.players)) {
      if (other.playerId === p.playerId) continue;
      const d = Math.hypot(other.x - p.x, other.y - p.y);
      if (d < bestD) {
        bestD = d;
        victim = other;
      }
    }
    if (victim) {
      victim.slowMs = Math.max(victim.slowMs, 3_000);
      pushFx(state, { type: "text", x: victim.x, y: victim.y - victim.radius - 22, color: colors.freeze, text: "frozen!", size: 15 });
    }
  } else if (pu.key === "star") {
    p.speedMs = Math.max(p.speedMs, 5_000);
    pushFx(state, { type: "text", x: p.x, y: p.y - p.radius - 18, color: colors.star, text: "speed!", size: 17 });
  } else {
    p.shieldMs = Math.max(p.shieldMs, 4_500);
    pushFx(state, { type: "text", x: p.x, y: p.y - p.radius - 18, color: colors.shield, text: "shield!", size: 17 });
  }
}

export function simulateStep(state: FishEatFishState, dtMs: number): { finished: boolean } {
  state.timeLeftMs = Math.max(0, state.timeLeftMs - dtMs);
  const timeUp = state.timeLeftMs <= 0;

  const players = Object.values(state.players);

  for (const p of players) updatePlayer(p, dtMs);

  const eatenPlayerIds = new Set<string>();

  for (const p of players) {
    for (const f of state.fish) {
      if (tryBite(p.radius, f.radius, 0, 0, p.eatCooldownMs, p.x, p.y, p.angleRad, f.x, f.y)) {
        biteFish(state, p, f, true, players);
        break;
      }
    }
  }

  for (const winner of players) {
    if (eatenPlayerIds.has(winner.playerId)) continue;
    for (const loser of players) {
      if (loser.playerId === winner.playerId || eatenPlayerIds.has(loser.playerId)) continue;
      if (tryBite(winner.radius, loser.radius, loser.invincibleMs, loser.shieldMs, winner.eatCooldownMs, winner.x, winner.y, winner.angleRad, loser.x, loser.y)) {
        eatPlayer(state, winner, loser);
        eatenPlayerIds.add(loser.playerId);
        break;
      }
    }
  }

  for (const f of state.fish) updateFish(state, f, dtMs);

  for (const f of state.fish) {
    if (f.eatCooldownMs > 0) continue;
    let target: FishEatFishPlayerState | FishState | null = null;
    if (f.targetPlayerId) {
      target = state.players[f.targetPlayerId] ?? null;
    } else if (f.targetFishId !== null) {
      target = state.fish.find((o) => o.id === f.targetFishId) ?? null;
    }
    if (!target) continue;
    if ("playerId" in target) {
      if (tryBite(f.radius, target.radius, target.invincibleMs, target.shieldMs, f.eatCooldownMs, f.x, f.y, f.angleRad, target.x, target.y)) {
        bitePlayer(state, f, target);
      }
    } else if (tryBite(f.radius, target.radius, 0, 0, f.eatCooldownMs, f.x, f.y, f.angleRad, target.x, target.y)) {
      biteFish(state, f, target, false, players);
    }
  }

  state.powerupTimerMs -= dtMs;
  if (state.powerupTimerMs <= 0) {
    spawnPowerup(state);
    state.powerupTimerMs = POWERUP_SPAWN_INTERVAL_MS;
  }
  state.powerups = state.powerups.filter((pu) => (pu.lifeMs -= dtMs) > 0);

  for (const p of players) {
    for (const pu of state.powerups) {
      const d = Math.hypot(pu.x - p.x, pu.y - p.y);
      if (d < p.radius + POWERUP_PICK) {
        applyPowerup(state, p, pu);
        break;
      }
    }
  }

  state.spawnCooldownMs -= dtMs;
  if (state.spawnCooldownMs <= 0) {
    fillStep(state);
    state.spawnCooldownMs = SPAWN_COOLDOWN_MS;
  }

  let leaderPlayerId = "";
  let leaderRadius = -1;
  for (const p of players) {
    if (p.radius > leaderRadius) {
      leaderRadius = p.radius;
      leaderPlayerId = p.playerId;
    }
  }
  state.leaderPlayerId = leaderPlayerId || undefined;

  return { finished: timeUp };
}

export function computeRankings(state: FishEatFishState): Array<{ playerId: string; radius: number; rank: number }> {
  return Object.values(state.players)
    .sort((a, b) => b.radius - a.radius || a.playerId.localeCompare(b.playerId))
    .map((p, index) => ({ playerId: p.playerId, radius: Math.round(p.radius), rank: index + 1 }));
}

export function rankPoints(rank: number): number {
  return rank <= 1 ? 5 : rank === 2 ? 3 : rank === 3 ? 2 : 1;
}
