// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import {
  createBaseRoundState,
  roundPhaseDurations,
  transitionRoundState,
  type ScoreEntry,
  type ServerGame,
  type SupportedLanguage
} from "@open-party-lab/game-core";
import { fishEatFishManifest } from "../manifest.js";
import type { FishEatFishInput, FishEatFishState } from "../protocol.js";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  computeRankings,
  createFishWorld,
  createPlayers,
  rankPoints,
  ROUND_TIME_MS,
  SAND_Y,
  simulateStep,
  START_R
} from "./simulation.js";

const fishEatFishText = {
  "zh-CN": {
    ready: "各就各位，鱼群即将入水……",
    playing: "开吃！鱼群来了！",
    noGrowth: "本局无人吃到鱼，不计分。",
    winner: (name: string) => `${name} 体型最大，赢得本局！`,
    fallbackPlayer: "一名玩家",
    unknown: "未知玩家"
  },
  de: {
    ready: "Alle bereit, die Fische kommen ...",
    playing: "Fressen! Die Fische sind da!",
    noGrowth: "Niemand hat einen Fisch gefressen. Diese Runde zaehlt nicht.",
    winner: (name: string) => `${name} ist der groesste Fisch und gewinnt diese Runde!`,
    fallbackPlayer: "Ein Spieler",
    unknown: "Unbekannt"
  },
  en: {
    ready: "On your marks, the fish are coming ...",
    playing: "Eat! Here come the fish!",
    noGrowth: "Nobody ate a fish this round. No score.",
    winner: (name: string) => `${name} is the biggest fish and wins this round!`,
    fallbackPlayer: "A player",
    unknown: "Unknown"
  }
} satisfies Record<SupportedLanguage, {
  ready: string;
  playing: string;
  noGrowth: string;
  winner: (name: string) => string;
  fallbackPlayer: string;
  unknown: string;
}>;

function createRoundWorld(playerIds: string[], roundNumber: number) {
  const world = createFishWorld(roundNumber);
  return {
    players: createPlayers(playerIds),
    fish: world.fish,
    powerups: world.powerups,
    powerupTimerMs: world.powerupTimerMs,
    fishSeq: world.fish.length,
    fxSeq: 0,
    fx: [],
    spawnCooldownMs: 0,
    timeLeftMs: ROUND_TIME_MS,
    finishAt: null,
    leaderPlayerId: undefined,
    rankings: undefined,
    winnerPlayerId: undefined,
    winnerName: undefined
  };
}

function cloneState(state: FishEatFishState): FishEatFishState {
  return {
    ...state,
    players: Object.fromEntries(
      Object.entries(state.players).map(([playerId, player]) => [playerId, { ...player }])
    ),
    fish: state.fish.map((fish) => ({ ...fish })),
    powerups: state.powerups.map((powerup) => ({ ...powerup })),
    fx: state.fx.map((event) => ({ ...event }))
  };
}

function buildFishScore(state: FishEatFishState): ScoreEntry[] {
  const rankings = state.rankings ?? computeRankings(state);

  if (rankings.every((entry) => entry.radius <= START_R)) {
    return [];
  }

  return rankings.map((entry) => ({
    playerId: entry.playerId,
    delta: rankPoints(entry.rank),
    reason: `Size rank ${entry.rank}`
  }));
}

export const serverGame: ServerGame<FishEatFishState, FishEatFishInput> = {
  manifest: fishEatFishManifest,
  createInitialState(context) {
    const text = fishEatFishText[context.language];
    const playerIds = context.players.map((player) => player.id);
    const world = createRoundWorld(playerIds, 1);

    return {
      ...createBaseRoundState("round_intro", context.now, {
        durationMs: roundPhaseDurations.roundIntroMs,
        message: text.ready
      }),
      arenaWidth: ARENA_WIDTH,
      arenaHeight: ARENA_HEIGHT,
      sandY: SAND_Y,
      roundDurationMs: ROUND_TIME_MS,
      roundNumber: 1,
      ...world
    };
  },
  startRound(state, context) {
    const text = fishEatFishText[context.language];
    const playerIds = context.players.map((player) => player.id);
    const world = createRoundWorld(playerIds, context.roundNumber);

    return transitionRoundState(
      {
        ...state,
        arenaWidth: ARENA_WIDTH,
        arenaHeight: ARENA_HEIGHT,
        sandY: SAND_Y,
        roundDurationMs: ROUND_TIME_MS,
        roundNumber: context.roundNumber,
        ...world
      },
      "playing",
      context.now,
      {
        startedAt: context.now,
        message: text.playing
      }
    );
  },
  handleInput(state, input, context) {
    if (state.phase !== "playing") {
      return state;
    }

    const player = state.players[input.playerId];

    if (!player) {
      return state;
    }

    const magnitude = Math.hypot(input.moveX, input.moveY);
    const normalizedX = magnitude > 0 ? input.moveX / magnitude : 0;
    const normalizedY = magnitude > 0 ? input.moveY / magnitude : 0;

    if (
      Math.abs(player.inputX - normalizedX) < 0.001 &&
      Math.abs(player.inputY - normalizedY) < 0.001
    ) {
      return state;
    }

    return {
      ...state,
      players: {
        ...state.players,
        [input.playerId]: {
          ...player,
          inputX: normalizedX,
          inputY: normalizedY
        }
      },
      updatedAt: context.now
    };
  },
  tick(state, deltaMs, context) {
    if (state.phase !== "playing") {
      return state;
    }

    const next = cloneState(state);
    const result = simulateStep(next, deltaMs);
    next.updatedAt = context.now;

    if (!result.finished) {
      return next;
    }

    next.timeLeftMs = 0;
    const rankings = computeRankings(next);
    const text = fishEatFishText[context.language];
    const winner = rankings[0];
    const grew = winner !== undefined && winner.radius > START_R;

    return transitionRoundState(
      {
        ...next,
        rankings,
        winnerPlayerId: grew ? winner.playerId : undefined,
        winnerName: grew
          ? context.players.find((player) => player.id === winner.playerId)?.name ?? text.unknown
          : undefined
      },
      "locked",
      context.now,
      {
        durationMs: roundPhaseDurations.lockedMs,
        message: grew
          ? text.winner(
              context.players.find((player) => player.id === winner.playerId)?.name ??
                text.fallbackPlayer
            )
          : text.noGrowth
      }
    );
  },
  isRoundFinished(state) {
    return state.phase === "locked";
  },
  buildScore(state) {
    return buildFishScore(state);
  }
};
