import type { ControllerLayoutKey, SupportedLanguage } from "@open-party-lab/game-core";
import { rouletteManifest } from "../manifest.js";
import type {
  RouletteControllerState,
  RouletteItem,
  RouletteShell,
  RouletteTarget
} from "../protocol.js";

interface ReadyLayoutModel {
  currentPlayerReady: boolean;
  readyCount: number;
  playerCount: number;
  label: string;
  description?: string;
  language?: SupportedLanguage;
  onToggleReady: () => void;
}

interface ChoiceLayoutModel {
  kind: "choice";
  title: string;
  subtitle?: string;
  helperText?: string;
  disabled: boolean;
  ready?: ReadyLayoutModel;
  choices: Array<{
    id: string;
    label: string;
    description?: string;
    disabled?: boolean;
    onSelect: () => void;
  }>;
  stats?: Array<{ label: string; value: string; highlighted?: boolean }>;
}

interface ControllerGameRenderContext {
  state: {
    preferredLanguage?: SupportedLanguage;
    room?: {
      language?: SupportedLanguage;
      selectedGameId?: string;
      availableGames?: Array<{
        id: string;
        displayName?: string;
        roundCompletionMode?: string;
      }>;
      players?: Array<{
        id: string;
        name: string;
        isReady?: boolean;
      }>;
    } | null;
    player?: {
      id: string;
      isReady?: boolean;
    } | null;
    game?: {
      phase?: string;
      message?: string;
      state?: unknown;
    } | null;
  };
  onInput(input: unknown): void;
  onSetReady?: (isReady: boolean) => void;
}

const itemText = {
  "zh-CN": {
    field_dress: {
      label: "止痛绷带",
      description: "恢复 1 点生命，不能超过本盘上限。"
    },
    lens: {
      label: "检视镜",
      description: "只在你的手机上确认当前弹种。"
    },
    extractor: {
      label: "退壳扳手",
      description: "公开移除当前一发，不结束行动。"
    },
    restraint: {
      label: "锁扣",
      description: "让对手跳过下一次正常行动。"
    },
    overcharge: {
      label: "增压线圈",
      description: "下一次射击若为实弹，造成 2 点伤害。"
    },
    inverter: {
      label: "极性逆转器",
      description: "把当前实弹变为空弹，或把空弹变为实弹。"
    }
  },
  en: {
    field_dress: { label: "Field Dressing", description: "Restore 1 resolve, up to the duel maximum." },
    lens: { label: "Inspection Lens", description: "Privately identify the current charge." },
    extractor: { label: "Extractor", description: "Publicly eject the current charge without ending your turn." },
    restraint: { label: "Restraint", description: "Skip your rival's next normal action." },
    overcharge: { label: "Overcharge Coil", description: "Your next live shot deals 2 damage." },
    inverter: { label: "Polarity Inverter", description: "Flip the current charge between live and blank." }
  },
  de: {
    field_dress: { label: "Verband", description: "Heilt 1 Mut bis zum Duellmaximum." },
    lens: { label: "Prueflinse", description: "Zeigt dir privat die aktuelle Ladung." },
    extractor: { label: "Auswerfer", description: "Entfernt die aktuelle Ladung, ohne den Zug zu beenden." },
    restraint: { label: "Fixierung", description: "Ueberspringt den naechsten normalen Zug des Gegners." },
    overcharge: { label: "Ueberladung", description: "Der naechste scharfe Treffer verursacht 2 Schaden." },
    inverter: { label: "Polwender", description: "Kehrt die aktuelle Ladung zwischen scharf und leer um." }
  }
} satisfies Record<SupportedLanguage, Record<RouletteItem, {
  label: string;
  description: string;
}>>;

function buildReadyModel(context: ControllerGameRenderContext): ReadyLayoutModel | undefined {
  const { state, onSetReady } = context;
  const gameId = state.room?.selectedGameId;
  const selectedGame = gameId
    ? state.room?.availableGames?.find((entry) => entry.id === gameId)
    : undefined;

  if (
    selectedGame?.roundCompletionMode !== "wait_for_ready"
    || state.game?.phase !== "finished"
    || !state.room
    || !state.player
    || !onSetReady
  ) {
    return undefined;
  }

  const players = state.room.players ?? [];
  const currentPlayerReady = Boolean(
    players.find((player) => player.id === state.player?.id)?.isReady
      ?? state.player.isReady
  );
  const readyCount = players.filter((player) => player.isReady).length;
  const playerCount = players.length;
  const language = state.room.language ?? state.preferredLanguage ?? "zh-CN";
  const zh = language === "zh-CN";
  const en = language === "en";

  return {
    currentPlayerReady,
    readyCount,
    playerCount,
    label: zh ? "再来一场" : en ? "Play again" : "Nochmal",
    description: zh
      ? readyCount + "/" + playerCount + " 名玩家已准备。"
      : en
        ? readyCount + "/" + playerCount + " players are ready."
        : readyCount + "/" + playerCount + " Spieler sind bereit.",
    language,
    onToggleReady: () => onSetReady(!currentPlayerReady)
  };
}

function createFireInput(playerId: string, target: RouletteTarget) {
  return {
    type: "fire",
    playerId,
    target,
    sentAt: Date.now()
  } as const;
}

function createUseItemInput(playerId: string, item: RouletteItem) {
  return {
    type: "use_item",
    playerId,
    item,
    sentAt: Date.now()
  } as const;
}

function healthLabel(current: number, max: number): string {
  return "●".repeat(Math.max(0, current)) + "○".repeat(Math.max(0, max - current));
}

function shellLabel(
  shell: RouletteShell | null | undefined,
  language: SupportedLanguage
): string {
  if (shell === "live") {
    return language === "zh-CN" ? "已确认：实弹" : language === "en" ? "Known: LIVE" : "Bekannt: SCHARF";
  }
  if (shell === "blank") {
    return language === "zh-CN" ? "已确认：空包弹" : language === "en" ? "Known: BLANK" : "Bekannt: LEER";
  }
  return language === "zh-CN" ? "未知" : language === "en" ? "Unknown" : "Unbekannt";
}

function itemDisabled(
  item: RouletteItem,
  state: Partial<RouletteControllerState>,
  playerId: string,
  rivalPlayerId: string | undefined
): boolean {
  switch (item) {
    case "field_dress":
      return (state.healthByPlayer?.[playerId] ?? 0) >= (state.maxHealth ?? 3);
    case "lens":
      return state.knownCurrentShell !== null && state.knownCurrentShell !== undefined;
    case "extractor":
    case "inverter":
      return (state.liveShellsRemaining ?? 0) + (state.blankShellsRemaining ?? 0) <= 0;
    case "restraint":
      return Boolean(rivalPlayerId && state.restrainedPlayerIds?.includes(rivalPlayerId));
    case "overcharge":
      return Boolean(state.boostedPlayerIds?.includes(playerId));
  }
}

export function buildRouletteControllerModel(
  context: ControllerGameRenderContext
): ChoiceLayoutModel {
  const { state, onInput } = context;
  const language = state.room?.language ?? state.preferredLanguage ?? "zh-CN";
  const zh = language === "zh-CN";
  const en = language === "en";
  const playerId = state.player?.id ?? "";
  const rouletteState = (state.game?.state ?? {}) as Partial<RouletteControllerState>;
  const players = state.room?.players ?? [];
  const names = Object.fromEntries(players.map((player) => [player.id, player.name]));
  const rivalPlayerId = rouletteState.rivalPlayerId;
  const rivalName = rivalPlayerId
    ? names[rivalPlayerId] ?? rivalPlayerId
    : zh ? "对手" : en ? "Rival" : "Gegner";
  const currentName = rouletteState.currentPlayerId
    ? names[rouletteState.currentPlayerId] ?? rouletteState.currentPlayerId
    : "-";
  const ownHealth = rouletteState.healthByPlayer?.[playerId] ?? 0;
  const rivalHealth = rivalPlayerId
    ? rouletteState.healthByPlayer?.[rivalPlayerId] ?? 0
    : 0;
  const maxHealth = rouletteState.maxHealth ?? 3;
  const canAct = Boolean(rouletteState.canAct) && state.game?.phase === "playing";
  const winnerName = rouletteState.winnerPlayerId
    ? names[rouletteState.winnerPlayerId] ?? rouletteState.winnerPlayerId
    : undefined;
  const title = state.room?.availableGames?.find((game) => game.id === rouletteManifest.id)?.displayName
    ?? (zh ? "命运轮盘" : en ? "Fate Chamber" : "Schicksalstrommel");
  const ownInventory = rouletteState.ownInventory ?? [];
  const knownShell = rouletteState.knownCurrentShell ?? null;
  const choices: ChoiceLayoutModel["choices"] = ownInventory.map((item, index) => ({
    id: "item:" + item + ":" + index,
    label: (zh ? "使用 " : en ? "Use " : "Nutze ") + itemText[language][item].label,
    description: itemText[language][item].description,
    disabled: !canAct || itemDisabled(item, rouletteState, playerId, rivalPlayerId),
    onSelect: () => onInput(createUseItemInput(playerId, item))
  }));

  choices.push(
    {
      id: "fire:self",
      label: zh ? "对自己执行测试" : en ? "Test yourself" : "Dich selbst testen",
      description: knownShell
        ? shellLabel(knownShell, language)
        : zh
          ? "若为空包弹，你可以继续行动。"
          : en ? "A blank lets you act again." : "Eine leere Ladung laesst dich erneut handeln.",
      disabled: !canAct,
      onSelect: () => onInput(createFireInput(playerId, "self"))
    },
    {
      id: "fire:rival",
      label: zh ? "瞄准 " + rivalName : en ? "Target " + rivalName : "Auf " + rivalName + " zielen",
      description: knownShell
        ? shellLabel(knownShell, language)
        : zh
          ? "无论结果如何，之后通常会交换行动权。"
          : en ? "The turn normally passes after this shot." : "Danach wechselt der Zug normalerweise.",
      disabled: !canAct,
      onSelect: () => onInput(createFireInput(playerId, "rival"))
    }
  );

  const subtitle = winnerName
    ? zh ? winnerName + " 赢得整场对决" : en ? winnerName + " wins the match" : winnerName + " gewinnt"
    : rouletteState.stage === "intermission"
      ? zh ? "本盘结算中" : en ? "Duel resolved" : "Duell beendet"
      : canAct
        ? zh ? "轮到你：先用道具，再选择目标" : en ? "Your turn: tools, then target" : "Dein Zug: Werkzeug, dann Ziel"
        : zh ? "轮到 " + currentName : en ? currentName + " is choosing" : currentName + " waehlt";
  const duelScore = (rouletteState.duelWinsByPlayer?.[playerId] ?? 0)
    + "–"
    + (rivalPlayerId ? rouletteState.duelWinsByPlayer?.[rivalPlayerId] ?? 0 : 0);
  const effects = [
    rouletteState.boostedPlayerIds?.includes(playerId)
      ? (zh ? "增压已启用" : en ? "Overcharge armed" : "Ueberladung aktiv")
      : null,
    rivalPlayerId && rouletteState.restrainedPlayerIds?.includes(rivalPlayerId)
      ? (zh ? "对手已被锁扣" : en ? "Rival restrained" : "Gegner fixiert")
      : null
  ].filter((entry): entry is string => Boolean(entry));

  return {
    kind: "choice",
    title,
    subtitle,
    helperText: state.game?.message
      ?? rouletteState.message
      ?? (zh
        ? "公开弹量、隐藏顺序。信息道具优先，确定弹种后再制造爆发。"
        : en
          ? "Counts are public, order is hidden. Learn first, then create a damage window."
          : "Mengen sind offen, Reihenfolge geheim. Erst wissen, dann zuschlagen."),
    disabled: !canAct,
    ready: buildReadyModel(context),
    choices,
    stats: [
      {
        label: zh ? "当前弹种" : en ? "Current charge" : "Aktuelle Ladung",
        value: shellLabel(knownShell, language),
        highlighted: knownShell !== null
      },
      {
        label: zh ? "你的生命" : en ? "Your resolve" : "Dein Mut",
        value: healthLabel(ownHealth, maxHealth),
        highlighted: canAct
      },
      {
        label: zh ? rivalName + " 的生命" : en ? rivalName + " resolve" : "Mut von " + rivalName,
        value: healthLabel(rivalHealth, maxHealth)
      },
      {
        label: zh ? "整场盘分" : en ? "Match score" : "Matchstand",
        value: duelScore + " · " + (rouletteState.duelWinsRequired ?? 2) + (zh ? " 胜制" : en ? " wins" : " Siege")
      },
      {
        label: zh ? "剩余弹药" : en ? "Charges left" : "Ladungen",
        value:
          (rouletteState.liveShellsRemaining ?? 0)
          + (zh ? " 实 / " : en ? " live / " : " scharf / ")
          + (rouletteState.blankShellsRemaining ?? 0)
          + (zh ? " 空" : en ? " blank" : " leer")
      },
      {
        label: zh ? "战术道具" : en ? "Tools" : "Werkzeuge",
        value: String(ownInventory.length)
      },
      {
        label: zh ? "状态效果" : en ? "Effects" : "Effekte",
        value: effects.length > 0 ? effects.join(" · ") : (zh ? "无" : en ? "None" : "Keine")
      }
    ]
  };
}

export const controllerGame = {
  id: rouletteManifest.id,
  layoutKey: "choice" as ControllerLayoutKey,
  buildLayout(context: ControllerGameRenderContext) {
    return buildRouletteControllerModel(context);
  }
} as const;
