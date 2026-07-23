// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { ControllerLayoutKey, SupportedLanguage } from "@open-party-lab/game-core";
import { tapRaceManifest } from "../manifest.js";

interface ControllerGameRenderContext {
  state: {
    preferredLanguage?: SupportedLanguage;
    room?: {
      language?: SupportedLanguage;
      players?: Array<{ id: string; name: string }>;
    } | null;
    player?: {
      id: string;
    } | null;
    game?: {
      phase?: string;
      message?: string;
      state?: unknown;
    } | null;
  };
  onInput(input: unknown): void;
}

function createTapRaceInput(playerId: string) {
  const now = Date.now();

  return {
    type: "tap",
    playerId,
    sentAt: now,
    pressedAt: now
  };
}

function formatPhase(phase: string | undefined, language: SupportedLanguage | undefined): string {
  const labels = language === "zh-CN"
    ? { intro: "准备", countdown: "倒计时", playing: "比赛中", locked: "已结束", finished: "已结束", waiting: "等待中" }
    : language === "en"
      ? { intro: "Round intro", countdown: "Countdown", playing: "Playing", locked: "Locked", finished: "Finished", waiting: "Waiting" }
      : { intro: "Rundenstart", countdown: "Countdown", playing: "Laeuft", locked: "Gesperrt", finished: "Beendet", waiting: "Warten" };

  switch (phase) {
    case "round_intro":
      return labels.intro;
    case "countdown":
      return labels.countdown;
    case "playing":
      return labels.playing;
    case "locked":
      return labels.locked;
    case "finished":
      return labels.finished;
    default:
      return labels.waiting;
  }
}

export const controllerGame = {
  id: tapRaceManifest.id,
  layoutKey: "tap_mash" as ControllerLayoutKey,
  buildLayout({ state, onInput }: ControllerGameRenderContext) {
    const language = state.room?.language ?? state.preferredLanguage;
    const zh = language === "zh-CN";
    const en = language === "en";
    const playerId = state.player?.id ?? "";
    const tapRaceState = (state.game?.state ?? {}) as {
      targetTaps?: number;
      tapsByPlayer?: Record<string, number>;
    };
    const currentTaps = tapRaceState.tapsByPlayer?.[playerId] ?? 0;
    const maxTaps = tapRaceState.targetTaps ?? 50;
    const rows = (state.room?.players ?? []).map((player) => ({
      label: player.name,
      value: `${tapRaceState.tapsByPlayer?.[player.id] ?? 0} ${zh ? "次" : en ? "taps" : "Klicks"}`,
      highlighted: player.id === state.player?.id
    }));

    return {
      kind: "tap_mash",
      title: zh ? "疯狂点击" : tapRaceManifest.displayName,
      subtitle: formatPhase(state.game?.phase, language),
      buttonLabel: zh ? "点击！" : "TAP",
      helperText: state.game?.message ?? (zh ? "尽可能快地点击！" : en ? "Tap as fast as you can." : "Tippe so schnell du kannst."),
      disabled: state.game?.phase !== "playing",
      progress: {
        current: currentTaps,
        max: maxTaps
      },
      rows,
      onPress: () => onInput(createTapRaceInput(playerId))
    };
  }
} as const;
