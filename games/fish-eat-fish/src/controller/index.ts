// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { ControllerLayoutKey, SupportedLanguage } from "@open-party-lab/game-core";
import { fishEatFishManifest } from "../manifest.js";
import type { FishEatFishState } from "../protocol.js";
import { FISH_PLAYER_PALETTES } from "../protocol.js";

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
      roundNumber?: number;
      state?: unknown;
    } | null;
  };
  onInput(input: unknown): void;
}

function formatPhase(phase: string | undefined, language: SupportedLanguage | undefined): string {
  const labels =
    language === "zh-CN"
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
  id: fishEatFishManifest.id,
  layoutKey: "virtual_joystick" as ControllerLayoutKey,
  buildLayout({ state, onInput }: ControllerGameRenderContext) {
    const language = state.room?.language ?? state.preferredLanguage;
    const zh = language === "zh-CN";
    const en = language === "en";
    const playerId = state.player?.id ?? "";
    const fishState = (state.game?.state ?? {}) as Partial<FishEatFishState>;
    const players = state.room?.players ?? [];
    const roundNumber = state.game?.roundNumber ?? 0;
    const myPlayer = playerId ? fishState.players?.[playerId] : undefined;
    const sizeLabel = zh ? "体型" : en ? "Size" : "Groesse";
    const stats = players.map((player) => ({
      label: player.name,
      value: `${Math.round(fishState.players?.[player.id]?.radius ?? 0)}`,
      highlighted: player.id === playerId
    }));

    return {
      kind: "virtual_joystick" as const,
      title: zh ? "大鱼吃小鱼" : fishEatFishManifest.displayName,
      subtitle: `${formatPhase(state.game?.phase, language)}${roundNumber > 0 ? ` · ${zh ? "第" : en ? "Round" : "Runde"} ${roundNumber}` : ""}`,
      helperText:
        state.game?.message ??
        (zh ? "推动摇杆游动，嘴朝前吃掉更小的鱼！" : en ? "Push the stick to swim and eat smaller fish!" : "Stick bewegen, um zu schwimmen und kleinere Fische zu fressen!"),
      disabled: state.game?.phase !== "playing",
      accentColor: myPlayer ? FISH_PLAYER_PALETTES[myPlayer.colorIndex % FISH_PLAYER_PALETTES.length].body : undefined,
      resetKey: `${state.room?.players?.length ?? 0}-${roundNumber}-${state.game?.phase ?? ""}`,
      centerLabel: zh ? "游" : en ? "SWIM" : "SCHWIMM",
      stats: stats.length ? stats : undefined,
      onMoveChange: (moveX: number, moveY: number) =>
        onInput({
          type: "move",
          playerId,
          sentAt: Date.now(),
          moveX,
          moveY
        })
    };
  }
} as const;
