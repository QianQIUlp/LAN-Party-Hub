import {
  createBaseRoundState,
  roundPhaseDurations,
  transitionRoundState,
  type ScoreEntry,
  type ServerGame,
  type ServerGameContext,
  type SupportedLanguage
} from "@open-party-lab/game-core";
import { rouletteManifest } from "../manifest.js";
import type {
  RouletteActionEvent,
  RouletteControllerState,
  RouletteInput,
  RouletteItem,
  RoulettePublicState,
  RouletteShell,
  RouletteState,
  RouletteTarget
} from "../protocol.js";

export const rouletteMaxHealth = 3;
export const rouletteMinShellCount = 2;
export const rouletteMaxShellCount = 8;
export const rouletteInputCooldownMs = 650;
export const rouletteInventoryCapacity = 8;
export const rouletteItemsPerReload = 2;
export const rouletteDuelWinsRequired = 2;
export const rouletteIntermissionMs = 3_200;
export const rouletteItems: readonly RouletteItem[] = [
  "field_dress",
  "lens",
  "extractor",
  "restraint",
  "overcharge",
  "inverter"
];

const rouletteText = {
  "zh-CN": {
    preparing: "命运装置正在洗入未知弹序，并发放第一批战术道具。",
    start: (name: string) => "轮到 " + name + "：先处理信息与道具，再决定目标。",
    blankSelf: (name: string) => name + " 对自己执行测试——空响，仍可继续行动。",
    blankRival: (shooter: string, target: string) => shooter + " 对 " + target + " 执行测试——空响，行动权交换。",
    liveSelf: (name: string, damage: number) => name + " 对自己执行测试——能量命中，失去 " + damage + " 点生命。",
    liveRival: (shooter: string, target: string, damage: number) => shooter + " 命中 " + target + "，造成 " + damage + " 点伤害。",
    reloaded: (live: number, blank: number) => "重新装填：" + live + " 发实弹、" + blank + " 发空包弹；双方获得新道具。",
    skipped: (name: string) => name + " 被锁扣限制，本次行动跳过。",
    duelWinner: (name: string, wins: number, needed: number) => name + " 赢下本盘（" + wins + "/" + needed + "）。",
    nextDuel: (duel: number, health: number, name: string) => "第 " + duel + " 盘开始：双方生命提升至 " + health + "，由 " + name + " 先手。",
    matchWinner: (name: string) => name + " 赢得整场命运对决！",
    healed: (name: string) => name + " 使用止痛绷带，恢复 1 点生命。",
    inspected: (name: string) => name + " 使用检视镜，确认了当前弹种。",
    extracted: (name: string, shell: RouletteShell) => name + " 用退壳扳手移除当前" + (shell === "live" ? "实弹" : "空包弹") + "。",
    restrained: (name: string, target: string) => name + " 对 " + target + " 启动锁扣，其下一次行动将被跳过。",
    boosted: (name: string) => name + " 启动增压线圈，下一次射击的实弹伤害翻倍。",
    inverted: (name: string) => name + " 启动极性逆转器，当前弹种已被翻转。",
    unknown: "未知玩家"
  },
  en: {
    preparing: "The fate engine shuffles a hidden load and deals tactical tools.",
    start: (name: string) => name + " acts first: gather information, then choose a target.",
    blankSelf: (name: string) => name + " tests themself — blank. The turn continues.",
    blankRival: (shooter: string, target: string) => shooter + " tests " + target + " — blank. Turn passes.",
    liveSelf: (name: string, damage: number) => name + " tests themself — live charge for " + damage + " damage.",
    liveRival: (shooter: string, target: string, damage: number) => shooter + " hits " + target + " for " + damage + " damage.",
    reloaded: (live: number, blank: number) => "Reloaded with " + live + " live and " + blank + " blank charges; both players draw tools.",
    skipped: (name: string) => name + " is restrained and skips this action.",
    duelWinner: (name: string, wins: number, needed: number) => name + " wins the duel (" + wins + "/" + needed + ").",
    nextDuel: (duel: number, health: number, name: string) => "Duel " + duel + " begins at " + health + " resolve. " + name + " acts first.",
    matchWinner: (name: string) => name + " wins the fate match.",
    healed: (name: string) => name + " uses a field dressing and restores 1 resolve.",
    inspected: (name: string) => name + " uses an inspection lens and learns the current charge.",
    extracted: (name: string, shell: RouletteShell) => name + " extracts a " + shell + " charge.",
    restrained: (name: string, target: string) => name + " restrains " + target + "; their next action is skipped.",
    boosted: (name: string) => name + " primes an overcharge coil. The next live shot deals double damage.",
    inverted: (name: string) => name + " reverses the polarity of the current charge.",
    unknown: "Unknown player"
  },
  de: {
    preparing: "Die Schicksalsmaschine mischt eine geheime Ladung und verteilt Werkzeuge.",
    start: (name: string) => name + " beginnt: Erst Informationen sammeln, dann ein Ziel waehlen.",
    blankSelf: (name: string) => name + " testet sich selbst — leer. Der Zug geht weiter.",
    blankRival: (shooter: string, target: string) => shooter + " testet " + target + " — leer. Zugwechsel.",
    liveSelf: (name: string, damage: number) => name + " testet sich selbst — Treffer fuer " + damage + " Schaden.",
    liveRival: (shooter: string, target: string, damage: number) => shooter + " trifft " + target + " fuer " + damage + " Schaden.",
    reloaded: (live: number, blank: number) => "Neu geladen: " + live + " scharf, " + blank + " leer; beide ziehen Werkzeuge.",
    skipped: (name: string) => name + " ist fixiert und ueberspringt diese Aktion.",
    duelWinner: (name: string, wins: number, needed: number) => name + " gewinnt das Duell (" + wins + "/" + needed + ").",
    nextDuel: (duel: number, health: number, name: string) => "Duell " + duel + " beginnt mit " + health + " Mut. " + name + " beginnt.",
    matchWinner: (name: string) => name + " gewinnt das Schicksalsmatch.",
    healed: (name: string) => name + " nutzt einen Verband und heilt 1 Mut.",
    inspected: (name: string) => name + " prueft mit der Linse die aktuelle Ladung.",
    extracted: (name: string, shell: RouletteShell) => name + " entfernt eine " + (shell === "live" ? "scharfe" : "leere") + " Ladung.",
    restrained: (name: string, target: string) => name + " fixiert " + target + "; der naechste Zug entfaellt.",
    boosted: (name: string) => name + " aktiviert die Spule. Der naechste Treffer verursacht doppelten Schaden.",
    inverted: (name: string) => name + " kehrt die aktuelle Ladung um.",
    unknown: "Unbekannter Spieler"
  }
} satisfies Record<SupportedLanguage, {
  preparing: string;
  start: (name: string) => string;
  blankSelf: (name: string) => string;
  blankRival: (shooter: string, target: string) => string;
  liveSelf: (name: string, damage: number) => string;
  liveRival: (shooter: string, target: string, damage: number) => string;
  reloaded: (live: number, blank: number) => string;
  skipped: (name: string) => string;
  duelWinner: (name: string, wins: number, needed: number) => string;
  nextDuel: (duel: number, health: number, name: string) => string;
  matchWinner: (name: string) => string;
  healed: (name: string) => string;
  inspected: (name: string) => string;
  extracted: (name: string, shell: RouletteShell) => string;
  restrained: (name: string, target: string) => string;
  boosted: (name: string) => string;
  inverted: (name: string) => string;
  unknown: string;
}>;

function randomIndex(length: number, random: () => number): number {
  return Math.max(0, Math.min(length - 1, Math.floor(random() * length)));
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
  }

  return result;
}

export function createRouletteLoad(random: () => number = Math.random): RouletteShell[] {
  const shellCount =
    rouletteMinShellCount + randomIndex(rouletteMaxShellCount - rouletteMinShellCount + 1, random);
  const lowerLiveCount = Math.floor(shellCount / 2);
  const upperLiveCount = Math.ceil(shellCount / 2);
  const liveCount =
    lowerLiveCount === upperLiveCount || random() < 0.5 ? lowerLiveCount : upperLiveCount;
  const blankCount = shellCount - liveCount;

  return shuffle(
    [
      ...Array.from({ length: liveCount }, () => "live" as const),
      ...Array.from({ length: blankCount }, () => "blank" as const)
    ],
    random
  );
}

export function drawRouletteItems(
  count: number,
  random: () => number = Math.random
): RouletteItem[] {
  return Array.from(
    { length: Math.max(0, count) },
    () => rouletteItems[randomIndex(rouletteItems.length, random)] ?? "lens"
  );
}

function countShells(
  shells: RouletteShell[]
): Pick<RouletteState, "liveShellsRemaining" | "blankShellsRemaining"> {
  return {
    liveShellsRemaining: shells.filter((shell) => shell === "live").length,
    blankShellsRemaining: shells.filter((shell) => shell === "blank").length
  };
}

function createBooleanMap(playerIds: string[], value: boolean): Record<string, boolean> {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, value]));
}

function createNumberMap(playerIds: string[], value: number): Record<string, number> {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, value]));
}

function createKnowledgeMap(playerIds: string[]): Record<string, RouletteShell | null> {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, null]));
}

function createEmptyInventories(playerIds: string[]): Record<string, RouletteItem[]> {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, []]));
}

function awardReloadItems(
  inventories: Record<string, RouletteItem[]>,
  playerIds: string[],
  random: () => number = Math.random
): Record<string, RouletteItem[]> {
  return Object.fromEntries(
    playerIds.map((playerId) => {
      const inventory = inventories[playerId] ?? [];
      const availableSlots = Math.max(0, rouletteInventoryCapacity - inventory.length);
      return [
        playerId,
        [
          ...inventory,
          ...drawRouletteItems(Math.min(rouletteItemsPerReload, availableSlots), random)
        ]
      ];
    })
  );
}

function maxHealthForDuel(duelNumber: number): number {
  return Math.min(5, rouletteMaxHealth + Math.max(0, duelNumber - 1));
}

function playerName(playerId: string, context: ServerGameContext): string {
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
    inventoryCountByPlayer: Object.fromEntries(
      state.playerOrder.map((playerId) => [
        playerId,
        state.inventoryByPlayer[playerId]?.length ?? 0
      ])
    ),
    visibleToolsByPlayer: Object.fromEntries(
      state.playerOrder.map((playerId) => [
        playerId,
        [...(state.inventoryByPlayer[playerId] ?? [])]
      ])
    ),
    restrainedPlayerIds: state.playerOrder.filter(
      (playerId) => state.skipNextTurnByPlayer[playerId]
    ),
    boostedPlayerIds: state.playerOrder.filter(
      (playerId) => (state.damageMultiplierByPlayer[playerId] ?? 1) > 1
    ),
    duelNumber: state.duelNumber,
    duelWinsRequired: state.duelWinsRequired,
    duelWinsByPlayer: state.duelWinsByPlayer,
    intermissionEndsAt: state.intermissionEndsAt,
    duelWinnerPlayerId: state.duelWinnerPlayerId,
    lastShot: state.lastShot,
    lastEvent: state.lastEvent,
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

function removeOneItem(inventory: RouletteItem[], item: RouletteItem): RouletteItem[] {
  const index = inventory.indexOf(item);
  return index < 0
    ? inventory
    : [...inventory.slice(0, index), ...inventory.slice(index + 1)];
}

function flipShell(shell: RouletteShell): RouletteShell {
  return shell === "live" ? "blank" : "live";
}

function canUseItem(state: RouletteState, playerId: string, item: RouletteItem): boolean {
  const rivalId = rivalPlayerId(state, playerId);

  switch (item) {
    case "field_dress":
      return (state.healthByPlayer[playerId] ?? 0) < state.maxHealth;
    case "lens":
      return Boolean(state.shells[0]) && state.knownCurrentShellByPlayer[playerId] === null;
    case "extractor":
    case "inverter":
      return Boolean(state.shells[0]);
    case "restraint":
      return Boolean(rivalId) && !state.skipNextTurnByPlayer[rivalId ?? ""];
    case "overcharge":
      return (state.damageMultiplierByPlayer[playerId] ?? 1) === 1;
  }
}

function handleItem(
  state: RouletteState,
  input: Extract<RouletteInput, { type: "use_item" }>,
  context: ServerGameContext
): RouletteState {
  const inventory = state.inventoryByPlayer[input.playerId] ?? [];

  if (!inventory.includes(input.item) || !canUseItem(state, input.playerId, input.item)) {
    return state;
  }

  const actorName = playerName(input.playerId, context);
  const actionNumber = state.actionNumber + 1;
  const inventoryByPlayer = {
    ...state.inventoryByPlayer,
    [input.playerId]: removeOneItem(inventory, input.item)
  };
  const baseEvent: RouletteActionEvent = {
    eventNumber: actionNumber,
    kind: "item",
    playerId: input.playerId,
    item: input.item,
    at: context.now
  };

  if (input.item === "field_dress") {
    return {
      ...state,
      inventoryByPlayer,
      healthByPlayer: {
        ...state.healthByPlayer,
        [input.playerId]: Math.min(
          state.maxHealth,
          (state.healthByPlayer[input.playerId] ?? 0) + 1
        )
      },
      actionNumber,
      lastEvent: baseEvent,
      updatedAt: context.now,
      message: rouletteText[context.language].healed(actorName)
    };
  }

  if (input.item === "lens") {
    return {
      ...state,
      inventoryByPlayer,
      knownCurrentShellByPlayer: {
        ...state.knownCurrentShellByPlayer,
        [input.playerId]: state.shells[0] ?? null
      },
      actionNumber,
      lastEvent: baseEvent,
      updatedAt: context.now,
      message: rouletteText[context.language].inspected(actorName)
    };
  }

  if (input.item === "restraint") {
    const targetPlayerId = rivalPlayerId(state, input.playerId);
    if (!targetPlayerId) {
      return state;
    }

    return {
      ...state,
      inventoryByPlayer,
      skipNextTurnByPlayer: {
        ...state.skipNextTurnByPlayer,
        [targetPlayerId]: true
      },
      actionNumber,
      lastEvent: baseEvent,
      updatedAt: context.now,
      message: rouletteText[context.language].restrained(
        actorName,
        playerName(targetPlayerId, context)
      )
    };
  }

  if (input.item === "overcharge") {
    return {
      ...state,
      inventoryByPlayer,
      damageMultiplierByPlayer: {
        ...state.damageMultiplierByPlayer,
        [input.playerId]: 2
      },
      actionNumber,
      lastEvent: baseEvent,
      updatedAt: context.now,
      message: rouletteText[context.language].boosted(actorName)
    };
  }

  if (input.item === "inverter") {
    const currentShell = state.shells[0];
    if (!currentShell) {
      return state;
    }

    const flippedShell = flipShell(currentShell);
    const shells = [flippedShell, ...state.shells.slice(1)];

    return {
      ...state,
      inventoryByPlayer,
      shells,
      ...countShells(shells),
      knownCurrentShellByPlayer: Object.fromEntries(
        state.playerOrder.map((playerId) => {
          const knownShell = state.knownCurrentShellByPlayer[playerId];
          return [playerId, knownShell === null ? null : flipShell(knownShell)];
        })
      ),
      actionNumber,
      lastEvent: baseEvent,
      updatedAt: context.now,
      message: rouletteText[context.language].inverted(actorName)
    };
  }

  const ejectedShell = state.shells[0];
  if (!ejectedShell) {
    return state;
  }

  let shells = state.shells.slice(1);
  let nextInventories = inventoryByPlayer;
  let reloadNumber = state.reloadNumber;
  let reloadMessage = "";

  if (shells.length === 0) {
    shells = createRouletteLoad();
    nextInventories = awardReloadItems(nextInventories, state.playerOrder);
    reloadNumber += 1;
    const counts = countShells(shells);
    reloadMessage = " " + rouletteText[context.language].reloaded(
      counts.liveShellsRemaining,
      counts.blankShellsRemaining
    );
  }

  return {
    ...state,
    inventoryByPlayer: nextInventories,
    shells,
    ...countShells(shells),
    reloadNumber,
    knownCurrentShellByPlayer: createKnowledgeMap(state.playerOrder),
    damageMultiplierByPlayer: {
      ...state.damageMultiplierByPlayer,
      [input.playerId]: 1
    },
    actionNumber,
    lastEvent: {
      ...baseEvent,
      revealedShell: ejectedShell
    },
    updatedAt: context.now,
    message:
      rouletteText[context.language].extracted(actorName, ejectedShell) + reloadMessage
  };
}

function shotMessage(
  shell: RouletteShell,
  target: RouletteTarget,
  shooterName: string,
  targetName: string,
  damage: number,
  language: SupportedLanguage
): string {
  const text = rouletteText[language];

  if (shell === "blank") {
    return target === "self"
      ? text.blankSelf(shooterName)
      : text.blankRival(shooterName, targetName);
  }

  return target === "self"
    ? text.liveSelf(shooterName, damage)
    : text.liveRival(shooterName, targetName, damage);
}

function nextTurn(
  state: RouletteState,
  shooterPlayerId: string,
  keepTurn: boolean
): {
  currentPlayerIndex: number;
  skipNextTurnByPlayer: Record<string, boolean>;
  skippedPlayerId?: string;
} {
  if (keepTurn) {
    return {
      currentPlayerIndex: state.currentPlayerIndex,
      skipNextTurnByPlayer: state.skipNextTurnByPlayer
    };
  }

  const shooterIndex = state.playerOrder.indexOf(shooterPlayerId);
  const nextIndex =
    shooterIndex < 0 ? state.currentPlayerIndex : (shooterIndex + 1) % state.playerOrder.length;
  const nextId = state.playerOrder[nextIndex];

  if (nextId && state.skipNextTurnByPlayer[nextId]) {
    return {
      currentPlayerIndex: shooterIndex < 0 ? state.currentPlayerIndex : shooterIndex,
      skipNextTurnByPlayer: {
        ...state.skipNextTurnByPlayer,
        [nextId]: false
      },
      skippedPlayerId: nextId
    };
  }

  return {
    currentPlayerIndex: nextIndex,
    skipNextTurnByPlayer: state.skipNextTurnByPlayer
  };
}

function buildScore(state: RouletteState): ScoreEntry[] {
  return state.winnerPlayerId
    ? [{ playerId: state.winnerPlayerId, delta: 3, reason: "Fate match victory" }]
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
    const currentPlayerIndex =
      playerOrder.length > 0 ? (context.roundNumber - 1) % playerOrder.length : 0;
    const maxHealth = maxHealthForDuel(1);
    const counts = countShells(shells);
    const inventoryByPlayer = awardReloadItems(
      createEmptyInventories(playerOrder),
      playerOrder
    );

    return {
      ...createBaseRoundState("round_intro", context.now, {
        durationMs: roundPhaseDurations.roundIntroMs,
        message: rouletteText[context.language].preparing
      }),
      stage: "duel",
      playerOrder,
      currentPlayerIndex,
      healthByPlayer: createNumberMap(playerOrder, maxHealth),
      maxHealth,
      shells,
      ...counts,
      reloadNumber: 1,
      actionNumber: 0,
      nextActionAt: context.now,
      inventoryByPlayer,
      knownCurrentShellByPlayer: createKnowledgeMap(playerOrder),
      skipNextTurnByPlayer: createBooleanMap(playerOrder, false),
      damageMultiplierByPlayer: createNumberMap(playerOrder, 1),
      duelNumber: 1,
      duelWinsRequired: rouletteDuelWinsRequired,
      duelWinsByPlayer: createNumberMap(playerOrder, 0),
      intermissionEndsAt: null,
      lastEvent: {
        eventNumber: 0,
        kind: "reload",
        liveShells: counts.liveShellsRemaining,
        blankShells: counts.blankShellsRemaining,
        at: context.now
      }
    };
  },
  startRound(state, context) {
    const firstPlayerId = currentPlayerId(state);

    return transitionRoundState(state, "playing", context.now, {
      startedAt: context.now,
      message: rouletteText[context.language].start(
        firstPlayerId
          ? playerName(firstPlayerId, context)
          : rouletteText[context.language].unknown
      )
    });
  },
  handleInput(state, input, context) {
    if (
      state.phase !== "playing"
      || state.stage !== "duel"
      || input.playerId !== currentPlayerId(state)
      || !context.players.some((player) => player.id === input.playerId)
    ) {
      return state;
    }

    if (input.type === "use_item") {
      return handleItem(state, input, context);
    }

    if (
      input.type !== "fire"
      || (input.target !== "self" && input.target !== "rival")
      || context.now < state.nextActionAt
    ) {
      return state;
    }

    const targetPlayerId = resolveTarget(state, input.playerId, input.target);
    const shell = state.shells[0];

    if (!targetPlayerId || !shell) {
      return state;
    }

    const remainingShells = state.shells.slice(1);
    const damage =
      shell === "live" ? Math.max(1, state.damageMultiplierByPlayer[input.playerId] ?? 1) : 0;
    const targetHealth = state.healthByPlayer[targetPlayerId] ?? 0;
    const nextTargetHealth = Math.max(0, targetHealth - damage);
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
      damage,
      revealedAt: context.now
    } as const;
    const lastEvent: RouletteActionEvent = {
      eventNumber: actionNumber,
      kind: "shot",
      playerId: input.playerId,
      targetPlayerId,
      shell,
      damage,
      at: context.now
    };
    const damageMultiplierByPlayer = {
      ...state.damageMultiplierByPlayer,
      [input.playerId]: 1
    };

    if (nextTargetHealth <= 0) {
      const duelWinnerPlayerId = rivalPlayerId(state, targetPlayerId);
      if (!duelWinnerPlayerId) {
        return state;
      }

      const duelWinsByPlayer = {
        ...state.duelWinsByPlayer,
        [duelWinnerPlayerId]: (state.duelWinsByPlayer[duelWinnerPlayerId] ?? 0) + 1
      };
      const wins = duelWinsByPlayer[duelWinnerPlayerId] ?? 0;
      const matchFinished = wins >= state.duelWinsRequired;
      const winnerName = playerName(duelWinnerPlayerId, context);

      return {
        ...state,
        stage: matchFinished ? "resolved" : "intermission",
        healthByPlayer,
        shells: remainingShells,
        ...countShells(remainingShells),
        damageMultiplierByPlayer,
        knownCurrentShellByPlayer: createKnowledgeMap(state.playerOrder),
        actionNumber,
        nextActionAt: context.now + rouletteInputCooldownMs,
        duelWinsByPlayer,
        duelWinnerPlayerId,
        intermissionEndsAt: matchFinished ? null : context.now + rouletteIntermissionMs,
        lastShot,
        lastEvent,
        winnerPlayerId: matchFinished ? duelWinnerPlayerId : undefined,
        updatedAt: context.now,
        message: matchFinished
          ? rouletteText[context.language].matchWinner(winnerName)
          : rouletteText[context.language].duelWinner(
              winnerName,
              wins,
              state.duelWinsRequired
            )
      };
    }

    const keepTurn = shell === "blank" && input.target === "self";
    const turn = nextTurn(state, input.playerId, keepTurn);
    let shells = remainingShells;
    let inventoryByPlayer = state.inventoryByPlayer;
    let reloadNumber = state.reloadNumber;
    let reloadMessage = "";

    if (shells.length === 0) {
      shells = createRouletteLoad();
      inventoryByPlayer = awardReloadItems(inventoryByPlayer, state.playerOrder);
      reloadNumber += 1;
      const counts = countShells(shells);
      reloadMessage = " " + rouletteText[context.language].reloaded(
        counts.liveShellsRemaining,
        counts.blankShellsRemaining
      );
    }

    const skippedMessage = turn.skippedPlayerId
      ? " " + rouletteText[context.language].skipped(
          playerName(turn.skippedPlayerId, context)
        )
      : "";
    const baseMessage = shotMessage(
      shell,
      input.target,
      shooterName,
      targetName,
      damage,
      context.language
    );

    return {
      ...state,
      healthByPlayer,
      shells,
      ...countShells(shells),
      inventoryByPlayer,
      currentPlayerIndex: turn.currentPlayerIndex,
      skipNextTurnByPlayer: turn.skipNextTurnByPlayer,
      damageMultiplierByPlayer,
      knownCurrentShellByPlayer: createKnowledgeMap(state.playerOrder),
      reloadNumber,
      actionNumber,
      nextActionAt: context.now + rouletteInputCooldownMs,
      lastShot,
      lastEvent,
      updatedAt: context.now,
      message: baseMessage + skippedMessage + reloadMessage
    };
  },
  tick(state, _deltaMs, context) {
    if (
      state.stage !== "intermission"
      || state.intermissionEndsAt === null
      || context.now < state.intermissionEndsAt
    ) {
      return state;
    }

    const duelNumber = state.duelNumber + 1;
    const maxHealth = maxHealthForDuel(duelNumber);
    const shells = createRouletteLoad();
    const counts = countShells(shells);
    const currentPlayerIndex =
      state.playerOrder.length > 0
        ? (context.roundNumber + duelNumber - 2) % state.playerOrder.length
        : 0;
    const firstPlayerId = state.playerOrder[currentPlayerIndex];
    const actionNumber = state.actionNumber + 1;

    return {
      ...state,
      stage: "duel",
      currentPlayerIndex,
      healthByPlayer: createNumberMap(state.playerOrder, maxHealth),
      maxHealth,
      shells,
      ...counts,
      reloadNumber: state.reloadNumber + 1,
      actionNumber,
      nextActionAt: context.now,
      inventoryByPlayer: awardReloadItems(
        createEmptyInventories(state.playerOrder),
        state.playerOrder
      ),
      knownCurrentShellByPlayer: createKnowledgeMap(state.playerOrder),
      skipNextTurnByPlayer: createBooleanMap(state.playerOrder, false),
      damageMultiplierByPlayer: createNumberMap(state.playerOrder, 1),
      duelNumber,
      intermissionEndsAt: null,
      duelWinnerPlayerId: undefined,
      lastShot: undefined,
      lastEvent: {
        eventNumber: actionNumber,
        kind: "reload",
        liveShells: counts.liveShellsRemaining,
        blankShells: counts.blankShellsRemaining,
        at: context.now
      },
      updatedAt: context.now,
      message: rouletteText[context.language].nextDuel(
        duelNumber,
        maxHealth,
        firstPlayerId
          ? playerName(firstPlayerId, context)
          : rouletteText[context.language].unknown
      )
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
        && currentPlayerId(state) === playerId,
      ownInventory: [...(state.inventoryByPlayer[playerId] ?? [])],
      knownCurrentShell: state.knownCurrentShellByPlayer[playerId] ?? null
    };
  }
};
