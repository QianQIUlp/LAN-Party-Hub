import {
  createBaseRoundState,
  roundPhaseDurations,
  transitionRoundState,
  type ScoreEntry,
  type ServerGame,
  type SupportedLanguage
} from "@open-party-lab/game-core";
import { rouletteManifest } from "../manifest.js";
import type {
  RouletteControllerState,
  RouletteInput,
  RoulettePublicState,
  RouletteShell,
  RouletteState,
  RouletteTarget
} from "../protocol.js";

export const rouletteMaxHealth = 3;
export const rouletteShellCount = 6;
export const rouletteLiveShellCount = 2;
export const rouletteInputCooldownMs = 650;

const rouletteText = {
  "zh-CN": {
    preparing: "装填完毕，弹序只有庄家知道。",
    start: (name: string) => "轮到 " + name + " 做出选择。",
    blankSelf: (name: string) => name + " 朝自己扣动扳机——空响！仍由其行动。",
    blankRival: (shooter: string, target: string) => shooter + " 瞄准 " + target + "——空响，回合交换。",
    liveSelf: (name: string) => name + " 朝自己扣动扳机——实弹！失去一点生命。",
    liveRival: (shooter: string, target: string) => shooter + " 击中了 " + target + "！",
    reloaded: "弹巢已空，庄家重新装入两发实弹和四发空包弹。",
    winner: (name: string) => name + " 活到了最后！",
    unknown: "未知玩家"
  },
  en: {
    preparing: "The chamber is loaded. Only the dealer knows the order.",
    start: (name: string) => name + " chooses first.",
    blankSelf: (name: string) => name + " takes the risk — blank. They keep the turn.",
    blankRival: (shooter: string, target: string) => shooter + " aims at " + target + " — blank. Turn passes.",
    liveSelf: (name: string) => name + " takes the risk — live shell. One resolve lost.",
    liveRival: (shooter: string, target: string) => shooter + " hits " + target + ".",
    reloaded: "The chamber is empty. Two live shells and four blanks are loaded.",
    winner: (name: string) => name + " is the last one standing.",
    unknown: "Unknown player"
  },
  de: {
    preparing: "Die Trommel ist geladen. Nur der Geber kennt die Reihenfolge.",
    start: (name: string) => name + " beginnt.",
    blankSelf: (name: string) => name + " riskiert es selbst — Platzpatrone. Der Zug bleibt.",
    blankRival: (shooter: string, target: string) => shooter + " zielt auf " + target + " — Platzpatrone. Zugwechsel.",
    liveSelf: (name: string) => name + " riskiert es selbst — scharfe Patrone. Ein Mutpunkt geht verloren.",
    liveRival: (shooter: string, target: string) => shooter + " trifft " + target + ".",
    reloaded: "Die Trommel ist leer. Zwei scharfe und vier Platzpatronen werden geladen.",
    winner: (name: string) => name + " bleibt als Letzter uebrig.",
    unknown: "Unbekannter Spieler"
  }
} satisfies Record<SupportedLanguage, {
  preparing: string;
  start: (name: string) => string;
  blankSelf: (name: string) => string;
  blankRival: (shooter: string, target: string) => string;
  liveSelf: (name: string) => string;
  liveRival: (shooter: string, target: string) => string;
  reloaded: string;
  winner: (name: string) => string;
  unknown: string;
}>;

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const candidate = Math.floor(random() * (index + 1));
    const swapIndex = Math.max(0, Math.min(index, candidate));
    [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
  }

  return result;
}

export function createRouletteLoad(random: () => number = Math.random): RouletteShell[] {
  return shuffle(
    [
      ...Array.from({ length: rouletteLiveShellCount }, () => "live" as const),
      ...Array.from(
        { length: rouletteShellCount - rouletteLiveShellCount },
        () => "blank" as const
      )
    ],
    random
  );
}

function countShells(shells: RouletteShell[]): Pick<RouletteState, "liveShellsRemaining" | "blankShellsRemaining"> {
  return {
    liveShellsRemaining: shells.filter((shell) => shell === "live").length,
    blankShellsRemaining: shells.filter((shell) => shell === "blank").length
  };
}

function playerName(playerId: string, context: Parameters<ServerGame<RouletteState>["startRound"]>[1]): string {
  return context.players.find((player) => player.id === playerId)?.name
    ?? rouletteText[context.language].unknown;
}

function currentPlayerId(state: RouletteState): string | undefined {
  return state.playerOrder[state.currentPlayerIndex];
}

function rivalPlayerId(state: RouletteState, playerId: string): string | undefined {
  return state.playerOrder.find((candidate) => candidate !== playerId);
}

function publicState(state: RouletteState): RoulettePublicState {
  return {
    stage: state.stage,
    playerOrder: state.playerOrder,
    currentPlayerId: currentPlayerId(state),
    healthByPlayer: state.healthByPlayer,
    maxHealth: state.maxHealth,
    liveShellsRemaining: state.liveShellsRemaining,
    blankShellsRemaining: state.blankShellsRemaining,
    reloadNumber: state.reloadNumber,
    actionNumber: state.actionNumber,
    lastShot: state.lastShot,
    winnerPlayerId: state.winnerPlayerId,
    message: state.message
  };
}

function resolveTarget(
  state: RouletteState,
  shooterPlayerId: string,
  target: RouletteTarget
): string | undefined {
  return target === "self" ? shooterPlayerId : rivalPlayerId(state, shooterPlayerId);
}

function nextPlayerIndex(state: RouletteState, shooterPlayerId: string): number {
  const shooterIndex = state.playerOrder.indexOf(shooterPlayerId);
  return shooterIndex < 0 ? state.currentPlayerIndex : (shooterIndex + 1) % state.playerOrder.length;
}

function shotMessage(
  shell: RouletteShell,
  target: RouletteTarget,
  shooterName: string,
  targetName: string,
  language: SupportedLanguage
): string {
  const text = rouletteText[language];

  if (shell === "blank") {
    return target === "self"
      ? text.blankSelf(shooterName)
      : text.blankRival(shooterName, targetName);
  }

  return target === "self"
    ? text.liveSelf(shooterName)
    : text.liveRival(shooterName, targetName);
}

function buildScore(state: RouletteState): ScoreEntry[] {
  return state.winnerPlayerId
    ? [{ playerId: state.winnerPlayerId, delta: 2, reason: "Roulette duel victory" }]
    : [];
}

export const serverGame: ServerGame<
  RouletteState,
  RouletteInput,
  RoulettePublicState | RouletteControllerState
> = {
  manifest: rouletteManifest,
  createInitialState(context) {
    const shells = createRouletteLoad();
    const playerOrder = context.players.map((player) => player.id);
    const currentPlayerIndex = playerOrder.length > 0
      ? (context.roundNumber - 1) % playerOrder.length
      : 0;

    return {
      ...createBaseRoundState("round_intro", context.now, {
        durationMs: roundPhaseDurations.roundIntroMs,
        message: rouletteText[context.language].preparing
      }),
      stage: "duel",
      playerOrder,
      currentPlayerIndex,
      healthByPlayer: Object.fromEntries(
        playerOrder.map((playerId) => [playerId, rouletteMaxHealth])
      ),
      maxHealth: rouletteMaxHealth,
      shells,
      ...countShells(shells),
      reloadNumber: 1,
      actionNumber: 0,
      nextActionAt: context.now
    };
  },
  startRound(state, context) {
    const firstPlayerId = currentPlayerId(state);

    return transitionRoundState(state, "playing", context.now, {
      startedAt: context.now,
      message: rouletteText[context.language].start(
        firstPlayerId ? playerName(firstPlayerId, context) : rouletteText[context.language].unknown
      )
    });
  },
  handleInput(state, input, context) {
    if (
      state.phase !== "playing"
      || state.stage !== "duel"
      || input.type !== "fire"
      || (input.target !== "self" && input.target !== "rival")
      || input.playerId !== currentPlayerId(state)
      || context.now < state.nextActionAt
    ) {
      return state;
    }

    const targetPlayerId = resolveTarget(state, input.playerId, input.target);
    const shell = state.shells[0];

    if (!targetPlayerId || !shell || !context.players.some((player) => player.id === input.playerId)) {
      return state;
    }

    const remainingShells = state.shells.slice(1);
    const targetHealth = state.healthByPlayer[targetPlayerId] ?? 0;
    const nextTargetHealth = shell === "live" ? Math.max(0, targetHealth - 1) : targetHealth;
    const healthByPlayer = {
      ...state.healthByPlayer,
      [targetPlayerId]: nextTargetHealth
    };
    const shooterName = playerName(input.playerId, context);
    const targetName = playerName(targetPlayerId, context);
    const actionNumber = state.actionNumber + 1;
    const lastShot = {
      actionNumber,
      shooterPlayerId: input.playerId,
      targetPlayerId,
      target: input.target,
      shell,
      revealedAt: context.now
    } as const;

    if (nextTargetHealth <= 0) {
      const winnerPlayerId = rivalPlayerId(state, targetPlayerId);
      const winnerName = winnerPlayerId
        ? playerName(winnerPlayerId, context)
        : rouletteText[context.language].unknown;

      return {
        ...state,
        stage: "resolved",
        healthByPlayer,
        shells: remainingShells,
        ...countShells(remainingShells),
        actionNumber,
        nextActionAt: context.now + rouletteInputCooldownMs,
        lastShot,
        winnerPlayerId,
        updatedAt: context.now,
        message: rouletteText[context.language].winner(winnerName)
      };
    }

    const keepTurn = shell === "blank" && input.target === "self";
    const shouldReload = remainingShells.length === 0;
    const shells = shouldReload ? createRouletteLoad() : remainingShells;
    const baseMessage = shotMessage(shell, input.target, shooterName, targetName, context.language);

    return {
      ...state,
      healthByPlayer,
      shells,
      ...countShells(shells),
      currentPlayerIndex: keepTurn
        ? state.currentPlayerIndex
        : nextPlayerIndex(state, input.playerId),
      reloadNumber: state.reloadNumber + (shouldReload ? 1 : 0),
      actionNumber,
      nextActionAt: context.now + rouletteInputCooldownMs,
      lastShot,
      updatedAt: context.now,
      message: shouldReload
        ? baseMessage + " " + rouletteText[context.language].reloaded
        : baseMessage
    };
  },
  isRoundFinished(state) {
    return state.stage === "resolved";
  },
  buildScore(state) {
    return buildScore(state);
  },
  toPublicState(state) {
    return publicState(state);
  },
  toControllerStateForPlayer(state, _context, playerId) {
    const visibleState = publicState(state);
    const rivalId = rivalPlayerId(state, playerId);

    return {
      ...visibleState,
      playerId,
      rivalPlayerId: rivalId,
      isCurrentPlayer: currentPlayerId(state) === playerId,
      canAct:
        state.phase === "playing"
        && state.stage === "duel"
        && currentPlayerId(state) === playerId
    };
  }
};
