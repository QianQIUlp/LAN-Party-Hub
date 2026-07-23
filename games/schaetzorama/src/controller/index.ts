// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import type { ControllerLayoutKey, SupportedLanguage } from "@open-party-lab/game-core";
import { schaetzoramaManifest } from "../manifest.js";
import type {
  SchaetzoramaAnswerSet,
  SchaetzoramaCategoryId,
  SchaetzoramaControllerState,
  SchaetzoramaJokerInventory,
  SchaetzoramaJokerPreview,
  SchaetzoramaJokerSelection,
  SchaetzoramaPlayerProgress,
  SchaetzoramaPlayerRoundResult,
  SchaetzoramaPublicQuestion,
  SchaetzoramaRoundContent,
  SchaetzoramaStage,
  SchaetzoramaStanding
} from "../protocol.js";
import { createSchaetzoramaJokerInput, createSchaetzoramaPreviewInput, createSchaetzoramaSubmitInput } from "./schaetzoramaBindings.js";

interface ReadyLayoutModel {
  currentPlayerReady: boolean;
  readyCount: number;
  playerCount: number;
  label: string;
  description: string;
  language?: SupportedLanguage;
  onToggleReady: () => void;
}

interface SchaetzoramaLayoutModel {
  kind: "schaetzorama";
  title: string;
  subtitle?: string;
  helperText?: string;
  language?: SupportedLanguage;
  disabled: boolean;
  ready?: ReadyLayoutModel;
  stage: SchaetzoramaStage;
  resetKey: string;
  roundContent?: SchaetzoramaRoundContent<SchaetzoramaPublicQuestion>;
  ownAnswers: SchaetzoramaAnswerSet;
  ownJokerPreview: SchaetzoramaJokerPreview | null | undefined;
  ownJoker: SchaetzoramaJokerSelection | null | undefined;
  ownInventory: SchaetzoramaJokerInventory;
  copyTargets: Array<{
    playerId: string;
    name: string;
    answers?: SchaetzoramaAnswerSet;
  }>;
  progress: SchaetzoramaPlayerProgress[];
  answerEndsAt: number | null;
  jokerEndsAt: number | null;
  solutions: SchaetzoramaAnswerSet;
  results: SchaetzoramaPlayerRoundResult[];
  standings: SchaetzoramaStanding[];
  categoryLabels: Record<SchaetzoramaCategoryId, string>;
  canSubmitAnswers: boolean;
  canSubmitJoker: boolean;
  onSubmitAnswers: (answers: SchaetzoramaAnswerSet) => void;
  onPreviewJoker: (joker: SchaetzoramaJokerSelection) => void;
  onChooseJoker: (joker: SchaetzoramaJokerSelection | null) => void;
}

interface ControllerGameRenderContext {
  state: {
    preferredLanguage?: SupportedLanguage;
    room?: {
      language?: SupportedLanguage;
      selectedGameId?: string;
      availableGames?: Array<{ id: string; displayName?: string; roundCompletionMode?: string }>;
      players?: Array<{ id: string; name: string; isReady?: boolean }>;
    } | null;
    player?: {
      id: string;
      isReady?: boolean;
    } | null;
    game?: {
      phase?: string;
      roundNumber?: number;
      state?: unknown;
    } | null;
  };
  onInput(input: unknown): void;
  onSetReady?: (isReady: boolean) => void;
}

const germanCategoryLabels = {
  number: "Zahl",
  percent: "Prozent",
  rank: "Ranking",
  assign: "Zuordnung"
} as const;

const englishCategoryLabels = {
  number: "Number",
  percent: "Percent",
  rank: "Ranking",
  assign: "Assign"
} as const;

const chineseCategoryLabels = {
  number: "数字",
  percent: "百分比",
  rank: "排序",
  assign: "归类"
} as const;

function buildReadyModel(context: ControllerGameRenderContext): ReadyLayoutModel | undefined {
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

  const zh = state.room.language === "zh-CN";
  const en = state.room.language === "en";
  const playerId = state.player.id;
  const players = state.room.players ?? [];
  const currentPlayerReady = Boolean(
    players.find((player) => player.id === playerId)?.isReady ?? state.player.isReady
  );
  const readyCount = players.filter((player) => player.isReady).length;
  const playerCount = players.length;

  return {
    currentPlayerReady,
    readyCount,
    playerCount,
    label: zh ? "下一局" : en ? "Next Round" : "Naechste Runde",
    description: zh
      ? `${readyCount}/${playerCount} 名玩家已准备。`
      : en
      ? `${readyCount}/${playerCount} players are ready.`
      : `${readyCount}/${playerCount} Spieler sind bereit.`,
    language: state.room.language,
    onToggleReady: () => onSetReady(!currentPlayerReady)
  };
}

export function buildSchaetzoramaControllerModel(context: ControllerGameRenderContext): SchaetzoramaLayoutModel {
  const { state, onInput } = context;
  const language = state.room?.language ?? state.preferredLanguage;
  const zh = language === "zh-CN";
  const en = language === "en";
  const playerId = state.player?.id ?? "";
  const guessState = (state.game?.state ?? null) as SchaetzoramaControllerState | null;
  const phase = state.game?.phase ?? "round_intro";
  const stage = guessState?.stage ?? "answering";
  const answered = Boolean(guessState?.ownAnswers && Object.keys(guessState.ownAnswers).length > 0);
  const waitingCount = guessState?.progress.filter((entry) => !entry.answered).length ?? 0;

  return {
    kind: "schaetzorama",
    title: zh ? "估个大概" : "Schaetzorama",
    subtitle:
      stage === "revealed"
        ? zh ? "答案揭晓" : en ? "Results" : "Auswertung"
        : stage === "joker"
          ? zh ? "参考答案" : en ? "Copy time" : "Abschreiben"
          : answered
            ? zh ? "已提交" : en ? "Locked in" : "Eingeloggt"
            : zh ? "完成四道题" : en ? "Set all sliders" : "Alle Regler einstellen",
    helperText:
      stage === "revealed"
        ? zh ? "答案已经揭晓，看完后准备下一局。" : en ? "The truth is out. Ready up when everyone is done watching." : "Die Wahrheit ist draussen. Gleich darfst du wieder bereit druecken."
        : stage === "joker"
          ? guessState?.canSubmitJoker
            ? zh ? "选择一名玩家和一道题，对比答案后决定是否照抄。" : en ? "Choose one player and one task, compare both answers, then decide." : "Waehle Person und Aufgabe, vergleiche beide Antworten und entscheide dann."
            : zh ? "选择已锁定，等待其他玩家。" : en ? "Copy choice locked. Waiting for the others." : "Abschreiben entschieden. Warte auf die anderen."
          : answered
            ? zh ? `答案已提交，还在等待 ${waitingCount} 人。` : en ? `Your panel is locked. Waiting for ${waitingCount}.` : `Dein Pult ist verriegelt. Warte noch auf ${waitingCount}.`
            : zh ? "估数字、排顺序、做归类；全部完成后一起提交。" : en ? "Estimate, sort, assign. Copying opens after everyone locks in." : "Schaetzen, sortieren, zuordnen. Abschreiben oeffnet nach dem Einloggen.",
    disabled: phase !== "playing",
    ready: buildReadyModel(context),
    stage,
    resetKey: `${state.game?.roundNumber ?? 0}:${stage}:${guessState?.roundContent.roundIndex ?? 0}`,
    roundContent: guessState?.roundContent,
    ownAnswers: guessState?.ownAnswers ?? {},
    ownJokerPreview: guessState?.ownJokerPreview,
    ownJoker: guessState?.ownJoker,
    ownInventory: guessState?.ownInventory ?? { copy: 0 },
    copyTargets: guessState?.copyTargets ?? [],
    progress: guessState?.progress ?? [],
    answerEndsAt: guessState?.answerEndsAt ?? null,
    jokerEndsAt: guessState?.jokerEndsAt ?? null,
    solutions: guessState?.solutions ?? {},
    results: guessState?.results ?? [],
    standings: guessState?.standings ?? [],
    categoryLabels: zh ? chineseCategoryLabels : en ? englishCategoryLabels : germanCategoryLabels,
    language,
    canSubmitAnswers: Boolean(guessState?.canSubmitAnswers),
    canSubmitJoker: Boolean(guessState?.canSubmitJoker),
    onSubmitAnswers: (answers) => onInput(createSchaetzoramaSubmitInput(playerId, answers)),
    onPreviewJoker: (joker) => onInput(createSchaetzoramaPreviewInput(playerId, joker)),
    onChooseJoker: (joker) => onInput(createSchaetzoramaJokerInput(playerId, joker))
  };
}

export const controllerGame = {
  id: schaetzoramaManifest.id,
  layoutKey: "schaetzorama" as ControllerLayoutKey,
  buildLayout(context: ControllerGameRenderContext) {
    return buildSchaetzoramaControllerModel(context);
  }
} as const;
