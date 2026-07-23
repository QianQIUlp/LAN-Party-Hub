// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { ControllerLayoutKey, SupportedLanguage } from "@open-party-lab/game-core";
import { zeichnenUndErratenManifest } from "../manifest.js";
import {
  createDrawingClearInput,
  createDrawingEndInput,
  createDrawingMoveInput,
  createDrawingSetColorInput,
  createDrawingStartInput,
  createGuessSubmitInput
} from "./zeichnenUndErratenBindings.js";

interface ReadyLayoutModel {
  currentPlayerReady: boolean;
  readyCount: number;
  playerCount: number;
  label: string;
  description?: string;
  language?: SupportedLanguage;
  onToggleReady: () => void;
}

interface DrawingGuessLayoutModel {
  kind: "drawing_guess";
  title: string;
  subtitle?: string;
  helperText?: string;
  language?: SupportedLanguage;
  disabled: boolean;
  ready?: ReadyLayoutModel;
  guessResetKey?: string;
  isDrawer: boolean;
  wordMask: string;
  secretWord?: string;
  currentColor?: string;
  availableColors?: string[];
  strokes: Array<{ id: string; color: string; points: Array<{ x: number; y: number }> }>;
  guessFeed: Array<{ playerName: string; guess: string; correct: boolean }>;
  winnerName?: string;
  onDrawStart: (x: number, y: number) => void;
  onDrawMove: (x: number, y: number) => void;
  onDrawEnd: () => void;
  onClearDrawing: () => void;
  onSelectColor?: (color: string) => void;
  onSubmitGuess: (guess: string) => void;
}

interface ControllerGameRenderContext {
  state: {
    preferredLanguage?: SupportedLanguage;
    room?: {
      language?: SupportedLanguage;
      selectedGameId?: string | null;
      players?: Array<{ id: string; name: string; isReady?: boolean }>;
      availableGames?: Array<{ id: string; displayName: string; roundCompletionMode?: string }>;
    } | null;
    player?: {
      id: string;
      isReady?: boolean;
    } | null;
    game?: {
      phase?: string;
      message?: string;
      roundNumber?: number;
      state?: unknown;
    } | null;
  };
  onInput(input: unknown): void;
  onSetReady?: (isReady: boolean) => void;
}

function formatPhase(phase: string | undefined, language: SupportedLanguage): string {
  const zh = language === "zh-CN";
  const en = language === "en";
  switch (phase) {
    case "round_intro":
      return zh ? "准备" : en ? "Round intro" : "Rundenvorbereitung";
    case "countdown":
      return "Countdown";
    case "playing":
      return zh ? "作画中" : en ? "Drawing" : "Zeichnen";
    case "locked":
      return zh ? "已锁定" : en ? "Locked" : "Aufgeloest";
    case "result":
      return zh ? "结果" : en ? "Result" : "Ergebnis";
    case "scoreboard":
      return zh ? "积分榜" : en ? "Scoreboard" : "Punktestand";
    case "finished":
      return zh ? "本局结束" : en ? "Round finished" : "Runde beendet";
    default:
      return zh ? "等待中" : en ? "Waiting" : "Warten";
  }
}

function buildReadyModel(context: ControllerGameRenderContext, language: SupportedLanguage): ReadyLayoutModel | undefined {
  const { state, onSetReady } = context;
  const gameId = state.room?.selectedGameId;
  const selectedGame = gameId ? state.room?.availableGames?.find((entry) => entry.id === gameId) : undefined;

  if (
    !selectedGame ||
    selectedGame.roundCompletionMode !== "wait_for_ready" ||
    state.game?.phase !== "finished" ||
    !state.room ||
    !state.player ||
    !onSetReady
  ) {
    return undefined;
  }

  const playerId = state.player.id;
  const players = state.room.players ?? [];
  const currentPlayerReady = Boolean(
    players.find((player) => player.id === playerId)?.isReady ?? state.player.isReady
  );
  const readyCount = players.filter((player) => player.isReady).length;
  const playerCount = players.length;
  const zh = language === "zh-CN";
  const en = language === "en";
  const label = zh ? "下一局" : en ? "Next Round" : "Naechste Runde";

  return {
    currentPlayerReady,
    readyCount,
    playerCount,
    label,
    description: zh
      ? `点击“${label}”，已有 ${readyCount}/${playerCount} 人准备。`
      : en
      ? `Tap "${label}". Starts when ${readyCount}/${playerCount} are ready.`
      : `Tippe auf "${label}". Start bei ${readyCount}/${playerCount} bereit.`,
    language: state.room.language,
    onToggleReady: () => onSetReady(!currentPlayerReady)
  };
}

export function buildZeichnenUndErratenControllerModel(
  context: ControllerGameRenderContext
): DrawingGuessLayoutModel {
  const { state, onInput } = context;
  const language = state.room?.language ?? state.preferredLanguage ?? "zh-CN";
  const zh = language === "zh-CN";
  const en = language === "en";
  const playerId = state.player?.id ?? "";
  const drawState = (state.game?.state ?? {}) as {
    isDrawer?: boolean;
    maskedWord?: string;
    secretWord?: string;
    currentColor?: string;
    availableColors?: string[];
    strokes?: Array<{ id: string; color: string; points: Array<{ x: number; y: number }> }>;
    guesses?: Array<{ playerName: string; guess: string; correct: boolean }>;
    winnerName?: string;
  };

  return {
    kind: "drawing_guess",
    title:
      state.room?.availableGames?.find((game) => game.id === zeichnenUndErratenManifest.id)?.displayName ??
      (zh ? "你画我猜" : en ? "Draw & Guess" : "Zeichnen & Erraten"),
    subtitle: formatPhase(state.game?.phase, language),
    helperText:
      state.game?.message ?? (zh ? "一名玩家作画，其他人猜词。" : en ? "One player draws while the others guess." : "Ein Spieler zeichnet, die anderen raten."),
    language,
    disabled: state.game?.phase !== "playing",
    ready: buildReadyModel(context, language),
    guessResetKey: `${state.game?.roundNumber ?? 0}:${state.game?.phase ?? "idle"}:${drawState.maskedWord ?? ""}`,
    isDrawer: Boolean(drawState.isDrawer),
    wordMask: drawState.maskedWord ?? "_ _ _",
    secretWord: drawState.secretWord,
    currentColor: drawState.currentColor,
    availableColors: drawState.availableColors,
    strokes: (drawState.strokes ?? []).map((stroke) => ({
      ...stroke,
      color: stroke.color ?? "#f8fafc"
    })),
    guessFeed: drawState.guesses ?? [],
    winnerName: drawState.winnerName,
    onDrawStart: (x, y) => onInput(createDrawingStartInput(playerId, x, y)),
    onDrawMove: (x, y) => onInput(createDrawingMoveInput(playerId, x, y)),
    onDrawEnd: () => onInput(createDrawingEndInput(playerId)),
    onClearDrawing: () => onInput(createDrawingClearInput(playerId)),
    onSelectColor: (color) => onInput(createDrawingSetColorInput(playerId, color)),
    onSubmitGuess: (guess) => onInput(createGuessSubmitInput(playerId, guess))
  };
}

export const controllerGame = {
  id: zeichnenUndErratenManifest.id,
  layoutKey: "drawing_guess" as ControllerLayoutKey,
  buildLayout(context: ControllerGameRenderContext) {
    return buildZeichnenUndErratenControllerModel(context);
  }
} as const;
