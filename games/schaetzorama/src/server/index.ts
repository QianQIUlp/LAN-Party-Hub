// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import {
  createBaseRoundState,
  roundPhaseDurations,
  transitionRoundState,
  type GamePlayerSummary,
  type ServerGame,
  type SupportedLanguage
} from "@open-party-lab/game-core";
import type {
  SchaetzoramaAnswerSet,
  SchaetzoramaControllerState,
  SchaetzoramaCategoryId,
  SchaetzoramaInput,
  SchaetzoramaJokerInventory,
  SchaetzoramaJokerSelection,
  SchaetzoramaNumberQuestion,
  SchaetzoramaPublicQuestion,
  SchaetzoramaPublicState,
  SchaetzoramaQuestion,
  SchaetzoramaRoundContent,
  SchaetzoramaRankQuestion,
  SchaetzoramaAssignQuestion,
  SchaetzoramaState
} from "../protocol.js";
import { schaetzoramaManifest } from "../manifest.js";
import { schaetzoramaEnglishTextByQuestionId, schaetzoramaRounds } from "./schaetzoramaContent.js";
import {
  schaetzoramaChineseQuestionIds,
  schaetzoramaChineseTextByQuestionId
} from "./schaetzoramaChineseText.js";
import { buildSchaetzoramaResults, schaetzoramaCategoryIds } from "./schaetzoramaScoring.js";

const copyDurationMs = 35_000;
const roundsPerGame = 10;
const startingInventory: SchaetzoramaJokerInventory = {
  copy: 2
};

type UsedQuestionIdsByCategory = Record<SchaetzoramaCategoryId, string[]>;

const excludedQuestionIds = new Set([
  "chess-light-squares",
  "note-values-long-short",
  "bits-in-byte",
  "half-byte-percent",
  "data-units-small-large",
  "dozen-count",
  "weeks-in-year",
  "quarter-century-percent",
  "half-marathon-percent",
  "h2o-hydrogen-atom-percent",
  "cube-faces",
  "right-angle-circle-percent",
  "polygons-corners-small-large",
  "prime-or-composite",
  "platonic-solids-count",
  "normal-distribution-one-sigma",
  "growth-functions-rank",
  "prime-composite-hard",
  "ipv4-address-bits",
  "byte-nibble-percent",
  "algorithm-complexity-rank",
  "english-vowels-alphabet-percent",
  "earth-age-cretaceous-start-percent",
  "golden-ratio-inverse-percent",
  "kinsey-scale-heterosexual-end",
  "si-prefix-larger-smaller",
]);

function createEmptyUsedQuestionIdsByCategory(): UsedQuestionIdsByCategory {
  return {
    number: [],
    percent: [],
    rank: [],
    assign: []
  };
}

const selectableQuestionsByCategory = Object.fromEntries(
  schaetzoramaCategoryIds.map((categoryId) => [
    categoryId,
    schaetzoramaRounds
      .map((round) => round.questions[categoryId])
      .filter((question) => !excludedQuestionIds.has(question.id))
  ])
) as Record<SchaetzoramaCategoryId, SchaetzoramaQuestion[]>;

function selectableQuestionsFor(categoryId: SchaetzoramaCategoryId, language: SupportedLanguage): SchaetzoramaQuestion[] {
  const allQuestions = selectableQuestionsByCategory[categoryId];
  const questions = language === "zh-CN"
    ? allQuestions.filter((question) => schaetzoramaChineseQuestionIds[categoryId].includes(question.id))
    : allQuestions;

  if (questions.length < roundsPerGame) {
    throw new Error(`Schaetzorama needs at least ${roundsPerGame} selectable ${categoryId} questions.`);
  }

  return questions;
}

function randomQuestionFor(categoryId: SchaetzoramaCategoryId, usedQuestionIds: string[], language: SupportedLanguage): SchaetzoramaQuestion {
  const questions = selectableQuestionsFor(categoryId, language);
  const unusedQuestions = questions.filter((question) => !usedQuestionIds.includes(question.id));
  const pool = unusedQuestions.length > 0 ? unusedQuestions : questions;
  const question = pool[Math.floor(Math.random() * pool.length)];

  if (!question) {
    throw new Error(`Schaetzorama has no selectable ${categoryId} questions.`);
  }

  return question;
}

function roundInGame(roundNumber: number): number {
  return ((roundNumber - 1) % roundsPerGame) + 1;
}

function usedQuestionIdsForRound(
  previousState: SchaetzoramaState | null,
  roundNumber: number
): UsedQuestionIdsByCategory {
  if (roundInGame(roundNumber) === 1) {
    return createEmptyUsedQuestionIdsByCategory();
  }

  return previousState?.usedQuestionIdsByCategory ?? createEmptyUsedQuestionIdsByCategory();
}

function questionRoundFor(
  roundNumber: number,
  language: SupportedLanguage,
  previousState: SchaetzoramaState | null
): {
  roundContent: SchaetzoramaRoundContent;
  usedQuestionIdsByCategory: UsedQuestionIdsByCategory;
} {
  const visibleRound = roundInGame(roundNumber);
  const previousUsedQuestionIds = usedQuestionIdsForRound(previousState, roundNumber);
  const questions = Object.fromEntries(
    schaetzoramaCategoryIds.map((categoryId) => [
      categoryId,
      randomQuestionFor(categoryId, previousUsedQuestionIds[categoryId], language)
    ])
  ) as Record<SchaetzoramaCategoryId, SchaetzoramaQuestion>;

  return {
    roundContent: {
      roundIndex: visibleRound,
      roundLabel: language === "zh-CN"
        ? `估个大概 第 ${visibleRound}/10 局`
        : language === "en" ? `Schaetzorama Round ${visibleRound}/10` : `Schaetzorama Runde ${visibleRound}/10`,
      questions
    },
    usedQuestionIdsByCategory: Object.fromEntries(
      schaetzoramaCategoryIds.map((categoryId) => [
        categoryId,
        [...previousUsedQuestionIds[categoryId], questions[categoryId].id].slice(-roundsPerGame)
      ])
    ) as UsedQuestionIdsByCategory
  };
}

function createInventories(
  players: GamePlayerSummary[],
  previousState: SchaetzoramaState | null,
  roundNumber: number
): Record<string, SchaetzoramaJokerInventory> {
  const resetInventory = roundInGame(roundNumber) === 1;
  const previousInventories = previousState?.jokerInventoryByPlayerId ?? {};

  return Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        copy: resetInventory ? startingInventory.copy : previousInventories[player.id]?.copy ?? startingInventory.copy
      }
    ])
  );
}

function previousSchaetzoramaState(context: Parameters<ServerGame<SchaetzoramaState>["createInitialState"]>[0]) {
  if (context.previousRound?.gameId !== schaetzoramaManifest.id) {
    return null;
  }

  const state = context.previousRound.state as Partial<SchaetzoramaState> | null;
  return state?.roundContent ? (state as SchaetzoramaState) : null;
}

function allPlayersAnswered(state: SchaetzoramaState, players: GamePlayerSummary[]): boolean {
  return players.every((player) => Boolean(state.answersByPlayerId[player.id]));
}

function allPlayersHandledJoker(state: SchaetzoramaState, players: GamePlayerSummary[]): boolean {
  return players.every((player) => Object.prototype.hasOwnProperty.call(state.jokerByPlayerId, player.id));
}

function enterCopyStage(state: SchaetzoramaState, players: GamePlayerSummary[], now: number, language: SupportedLanguage): SchaetzoramaState {
  const answersByPlayerId = { ...state.answersByPlayerId };

  for (const player of players) {
    if (!answersByPlayerId[player.id]) {
      answersByPlayerId[player.id] = {
        answers: {},
        submittedAt: now
      };
    }
  }

  return {
    ...state,
    stage: "joker",
    answersByPlayerId,
    answerEndsAt: null,
    jokerEndsAt: now + copyDurationMs,
    updatedAt: now,
    message: language === "zh-CN"
      ? "参考阶段：选择一名玩家和一道题，对比后决定保留还是照抄。"
      : language === "en" ? "Copy phase: compare one answer, then keep yours or copy it." : "Abschreiben-Phase: Eine Antwort vergleichen, dann behalten oder abschreiben."
  };
}

function revealState(state: SchaetzoramaState, players: GamePlayerSummary[], now: number, language: SupportedLanguage): SchaetzoramaState {
  if (state.stage === "revealed") {
    return state;
  }

  return {
    ...state,
    stage: "revealed",
    answerEndsAt: null,
    jokerEndsAt: null,
    revealedAt: now,
    results: buildSchaetzoramaResults(players, state.roundContent.questions, state.answersByPlayerId, state.jokerByPlayerId),
    updatedAt: now,
    message: language === "zh-CN"
      ? "答案揭晓！看看谁最接近真相。"
      : language === "en" ? "Reveal time! The truth hits the big screen." : "Auswertung! Jetzt wird die Wahrheit aufgedreht."
  };
}

function buildStandings(players: GamePlayerSummary[], state: SchaetzoramaState) {
  const roundScoresByPlayerId = new Map(state.results.map((result) => [result.playerId, result.total]));

  return players
    .map((player) => {
      const roundScore = roundScoresByPlayerId.get(player.id) ?? 0;
      const projectedScore = state.stage === "revealed" && state.phase === "playing"
        ? player.score + roundScore
        : player.score;

      return {
        playerId: player.id,
        name: player.name,
        color: player.color,
        score: player.score,
        projectedScore,
        roundScore
      };
    })
    .sort((left, right) => right.projectedScore - left.projectedScore);
}

function stripQuestion(question: SchaetzoramaQuestion): SchaetzoramaPublicQuestion {
  if ("answer" in question) {
    const { answer: _answer, ...publicQuestion } = question;
    return publicQuestion;
  }

  if ("answerOrder" in question) {
    const { answerOrder: _answerOrder, ...publicQuestion } = question;
    return publicQuestion;
  }

  const { answers: _answers, ...publicQuestion } = question;
  return publicQuestion;
}

function localizeQuestion(question: SchaetzoramaPublicQuestion, language: SupportedLanguage): SchaetzoramaPublicQuestion {
  if (language === "de") {
    return question;
  }

  const text = language === "zh-CN"
    ? schaetzoramaChineseTextByQuestionId[question.id]
    : schaetzoramaEnglishTextByQuestionId[question.id];

  if (!text) {
    return question;
  }

  const localized = {
    ...question,
    title: text.title ?? question.title,
    shortLabel: text.shortLabel ?? question.shortLabel,
    prompt: text.prompt ?? question.prompt
  };

  if (localized.kind === "rank") {
    return {
      ...localized,
      directionLabel: text.directionLabel ?? localized.directionLabel,
      items: localized.items.map((item) => ({
        ...item,
        label: text.itemLabels?.[item.id] ?? item.label
      }))
    };
  }

  if (localized.kind === "assign") {
    return {
      ...localized,
      leftLabel: text.leftLabel ?? localized.leftLabel,
      rightLabel: text.rightLabel ?? localized.rightLabel,
      terms: localized.terms.map((term) => ({
        ...term,
        label: text.termLabels?.[term.id] ?? term.label
      }))
    };
  }

  return localized;
}

function toPublicSchaetzoramaState(state: SchaetzoramaState, players: GamePlayerSummary[], language: SupportedLanguage): SchaetzoramaPublicState {
  const numberQuestion = state.roundContent.questions.number as SchaetzoramaNumberQuestion;
  const percentQuestion = state.roundContent.questions.percent as SchaetzoramaNumberQuestion;
  const rankQuestion = state.roundContent.questions.rank as SchaetzoramaRankQuestion;
  const assignQuestion = state.roundContent.questions.assign as SchaetzoramaAssignQuestion;
  const solutions: SchaetzoramaAnswerSet =
    state.stage === "revealed"
      ? {
          number: {
            kind: "number",
            value: numberQuestion.answer
          },
          percent: {
            kind: "number",
            value: percentQuestion.answer
          },
          rank: {
            kind: "rank",
            order: rankQuestion.answerOrder
          },
          assign: {
            kind: "assign",
            assignments: assignQuestion.answers
          }
        }
      : {};

  return {
    stage: state.stage,
    roundContent: {
      ...state.roundContent,
      questions: {
        number: localizeQuestion(stripQuestion(state.roundContent.questions.number), language),
        percent: localizeQuestion(stripQuestion(state.roundContent.questions.percent), language),
        rank: localizeQuestion(stripQuestion(state.roundContent.questions.rank), language),
        assign: localizeQuestion(stripQuestion(state.roundContent.questions.assign), language)
      }
    },
    progress: players.map((player) => ({
      playerId: player.id,
      name: player.name,
      color: player.color,
      answered: Boolean(state.answersByPlayerId[player.id]),
      jokerReady: Object.prototype.hasOwnProperty.call(state.jokerByPlayerId, player.id)
    })),
    answerEndsAt: state.answerEndsAt,
    jokerEndsAt: state.jokerEndsAt,
    revealedAt: state.revealedAt,
    solutions,
    results: state.stage === "revealed" ? state.results : [],
    standings: buildStandings(players, state)
  };
}

function sanitizeAnswers(answers: SchaetzoramaAnswerSet, questions: Record<string, SchaetzoramaQuestion>): SchaetzoramaAnswerSet {
  const nextAnswers: SchaetzoramaAnswerSet = {};

  for (const categoryId of schaetzoramaCategoryIds) {
    const answer = answers[categoryId];
    const question = questions[categoryId];

    if (!answer) {
      continue;
    }

    if ((question.kind === "number" || question.kind === "percent") && answer.kind === "number") {
      if (!Number.isFinite(answer.value)) {
        continue;
      }

      nextAnswers[categoryId] = {
        kind: "number",
        value: Math.round(Math.max(question.min, Math.min(question.max, answer.value)))
      };
      continue;
    }

    if (question.kind === "rank" && answer.kind === "rank") {
      const allowedIds = new Set(question.items.map((item) => item.id));
      const order = answer.order.filter((itemId, index, list) => allowedIds.has(itemId) && list.indexOf(itemId) === index);

      if (order.length !== question.items.length) {
        continue;
      }

      nextAnswers[categoryId] = {
        kind: "rank",
        order
      };
      continue;
    }

    if (question.kind === "assign" && answer.kind === "assign") {
      const assignments = question.terms.map((term) => [term.id, answer.assignments[term.id]] as const);
      if (assignments.some(([, zone]) => zone !== "left" && zone !== "right" && zone !== "both")) {
        continue;
      }

      nextAnswers[categoryId] = {
        kind: "assign",
        assignments: Object.fromEntries(assignments)
      };
    }
  }

  return nextAnswers;
}

function isValidJoker(
  joker: SchaetzoramaJokerSelection | null,
  playerId: string,
  inventory: SchaetzoramaJokerInventory,
  players: GamePlayerSummary[]
): boolean {
  if (joker === null) {
    return true;
  }

  if (!schaetzoramaCategoryIds.includes(joker.categoryId)) {
    return false;
  }

  return inventory.copy > 0 && isValidCopyTarget(joker, playerId, players);
}

function isValidCopyTarget(joker: SchaetzoramaJokerSelection, playerId: string, players: GamePlayerSummary[]): boolean {
  return (
    joker.kind === "copy" &&
    Boolean(joker.targetPlayerId) &&
    joker.targetPlayerId !== playerId &&
    players.some((player) => player.id === joker.targetPlayerId)
  );
}

function spendJoker(inventory: SchaetzoramaJokerInventory, joker: SchaetzoramaJokerSelection | null): SchaetzoramaJokerInventory {
  if (joker?.kind === "copy") {
    return {
      ...inventory,
      copy: Math.max(0, inventory.copy - 1)
    };
  }

  return inventory;
}

function isSameJokerSelection(left: SchaetzoramaJokerSelection | undefined, right: SchaetzoramaJokerSelection): boolean {
  return (
    left?.kind === right.kind &&
    left.categoryId === right.categoryId &&
    left.targetPlayerId === right.targetPlayerId
  );
}

export const serverGame: ServerGame<SchaetzoramaState, SchaetzoramaInput, SchaetzoramaPublicState> = {
  manifest: schaetzoramaManifest,
  createInitialState(context) {
    const previousState = previousSchaetzoramaState(context);
    const questionRound = questionRoundFor(context.roundNumber, context.language, previousState);

    return {
      ...createBaseRoundState("round_intro", context.now, {
        durationMs: roundPhaseDurations.roundIntroMs,
        message: context.language === "zh-CN"
          ? "正在准备四道估算题……"
          : context.language === "en" ? "Schaetzorama is warming up the sliders." : "Schaetzorama faehrt die Regler hoch."
      }),
      stage: "answering",
      roundContent: questionRound.roundContent,
      usedQuestionIdsByCategory: questionRound.usedQuestionIdsByCategory,
      answersByPlayerId: {},
      jokerPreviewByPlayerId: {},
      jokerByPlayerId: {},
      jokerInventoryByPlayerId: createInventories(context.players, previousState, context.roundNumber),
      answerEndsAt: null,
      jokerEndsAt: null,
      revealedAt: null,
      results: []
    };
  },
  startRound(state, context) {
    return transitionRoundState(
      {
        ...state,
        stage: "answering",
        answersByPlayerId: {},
        jokerPreviewByPlayerId: {},
        jokerByPlayerId: {},
        answerEndsAt: null,
        jokerEndsAt: null,
        revealedAt: null,
        results: []
      },
      "playing",
      context.now,
      {
        startedAt: context.now,
        message: context.language === "zh-CN"
          ? "完成四道题并提交；所有人提交后进入参考阶段。"
          : context.language === "en" ? "Set all four panels. Copying comes after lock-in." : "Alle vier Pulte einstellen. Abschreiben kommt nach dem Einloggen."
      }
    );
  },
  handleInput(state, input, context) {
    if (state.phase !== "playing") {
      return state;
    }

    if (!context.players.some((player) => player.id === input.playerId)) {
      return state;
    }

    if (input.type === "submit_answers" && state.stage === "answering") {
      if (Object.prototype.hasOwnProperty.call(state.answersByPlayerId, input.playerId)) {
        return state;
      }

      const nextState: SchaetzoramaState = {
        ...state,
        answersByPlayerId: {
          ...state.answersByPlayerId,
          [input.playerId]: {
            answers: sanitizeAnswers(input.answers, state.roundContent.questions),
            submittedAt: context.now
          }
        },
        updatedAt: context.now
      };

      return allPlayersAnswered(nextState, context.players) ? enterCopyStage(nextState, context.players, context.now, context.language) : nextState;
    }

    if (input.type === "preview_joker" && state.stage === "joker") {
      if (
        Object.prototype.hasOwnProperty.call(state.jokerByPlayerId, input.playerId) ||
        Object.prototype.hasOwnProperty.call(state.jokerPreviewByPlayerId, input.playerId)
      ) {
        return state;
      }

      const inventory = state.jokerInventoryByPlayerId[input.playerId] ?? startingInventory;

      if (!isValidJoker(input.joker, input.playerId, inventory, context.players)) {
        return state;
      }

      return {
        ...state,
        jokerPreviewByPlayerId: {
          ...state.jokerPreviewByPlayerId,
          [input.playerId]: input.joker
        },
        jokerInventoryByPlayerId: {
          ...state.jokerInventoryByPlayerId,
          [input.playerId]: spendJoker(inventory, input.joker)
        },
        updatedAt: context.now
      };
    }

    if (input.type === "choose_joker" && state.stage === "joker") {
      if (Object.prototype.hasOwnProperty.call(state.jokerByPlayerId, input.playerId)) {
        return state;
      }

      const preview = state.jokerPreviewByPlayerId[input.playerId];
      const selectedJoker = input.joker?.kind === "copy" ? input.joker : null;
      const joker = selectedJoker && preview && isSameJokerSelection(preview, selectedJoker) && isValidCopyTarget(selectedJoker, input.playerId, context.players)
        ? selectedJoker
        : null;
      const nextState: SchaetzoramaState = {
        ...state,
        jokerByPlayerId: {
          ...state.jokerByPlayerId,
          [input.playerId]: joker
        },
        updatedAt: context.now
      };

      return allPlayersHandledJoker(nextState, context.players)
        ? revealState(nextState, context.players, context.now, context.language)
        : nextState;
    }

    return state;
  },
  tick(state, _deltaMs, context) {
    if (state.phase !== "playing") {
      return state;
    }

    if (state.stage === "joker" && state.jokerEndsAt !== null && context.now >= state.jokerEndsAt) {
      return revealState(state, context.players, context.now, context.language);
    }

    return state;
  },
  isRoundFinished(state) {
    return state.stage === "revealed";
  },
  buildScore(state) {
    return state.results.map((result) => ({
      playerId: result.playerId,
      delta: result.total,
      reason: "Schaetzorama"
    }));
  },
  toPublicState(state, context) {
    return toPublicSchaetzoramaState(state, context.players, context.language);
  },
  toControllerStateForPlayer(state, context, playerId) {
    const publicState = toPublicSchaetzoramaState(state, context.players, context.language);
    const inventory = state.jokerInventoryByPlayerId[playerId] ?? startingInventory;
    const preview = state.jokerPreviewByPlayerId[playerId];

    return {
      ...publicState,
      playerId,
      ownAnswers: state.answersByPlayerId[playerId]?.answers ?? {},
      ownJokerPreview: preview ?? null,
      ownJoker: Object.prototype.hasOwnProperty.call(state.jokerByPlayerId, playerId)
        ? state.jokerByPlayerId[playerId]
        : undefined,
      ownInventory: inventory,
      canSubmitAnswers:
        state.phase === "playing" &&
        state.stage === "answering" &&
        !Object.prototype.hasOwnProperty.call(state.answersByPlayerId, playerId),
      canSubmitJoker:
        state.phase === "playing" &&
        state.stage === "joker" &&
        !Object.prototype.hasOwnProperty.call(state.jokerByPlayerId, playerId),
      copyTargets: context.players
        .filter((player) => player.id !== playerId)
        .map((player) => {
          const previewAnswer =
            state.stage === "joker" && preview?.targetPlayerId === player.id
              ? state.answersByPlayerId[player.id]?.answers[preview.categoryId]
              : undefined;

          return {
            playerId: player.id,
            name: player.name,
            answers: previewAnswer ? ({ [preview.categoryId]: previewAnswer } as SchaetzoramaAnswerSet) : undefined
          };
        })
    } satisfies SchaetzoramaControllerState;
  }
};
