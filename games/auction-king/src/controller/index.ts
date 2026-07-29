import type { ControllerLayoutKey, SupportedLanguage } from "@open-party-lab/game-core";
import { auctionKingManifest } from "../manifest.js";
import type {
  AuctionInstrumentId,
  AuctionKingControllerState,
  AuctionKitId,
  AuctionRoleId
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

interface AuctionWarehouseLayoutModel {
  kind: "auction_warehouse";
  language: SupportedLanguage;
  roomCode?: string;
  message?: string;
  disabled: boolean;
  state: AuctionKingControllerState | null;
  ready?: ReadyLayoutModel;
  onSelectRole: (roleId: AuctionRoleId) => void;
  onSelectKit: (kitId: AuctionKitId) => void;
  onConfirmSetup: () => void;
  onUseInstrument: (instrumentId: AuctionInstrumentId) => void;
  onSubmitBid: (amount: number) => void;
}

interface ControllerGameRenderContext {
  state: {
    preferredLanguage?: SupportedLanguage;
    room?: {
      code?: string;
      language?: SupportedLanguage;
      selectedGameId?: string;
      availableGames?: Array<{ id: string; displayName?: string; roundCompletionMode?: string }>;
      players?: Array<{ id: string; name: string; isReady?: boolean }>;
    } | null;
    player?: { id: string; isReady?: boolean } | null;
    game?: { phase?: string; message?: string; state?: unknown } | null;
  };
  onInput(input: unknown): void;
  onSetReady?: (isReady: boolean) => void;
}

function buildReadyModel(context: ControllerGameRenderContext): ReadyLayoutModel | undefined {
  const { state, onSetReady } = context;
  const gameId = state.room?.selectedGameId;
  const selectedGame = gameId
    ? state.room?.availableGames?.find((entry) => entry.id === gameId)
    : undefined;

  if (
    selectedGame?.roundCompletionMode !== "wait_for_ready" ||
    state.game?.phase !== "finished" ||
    !state.room ||
    !state.player ||
    !onSetReady
  ) {
    return undefined;
  }

  const players = state.room.players ?? [];
  const currentPlayerReady = Boolean(
    players.find((player) => player.id === state.player?.id)?.isReady ?? state.player.isReady
  );
  const readyCount = players.filter((player) => player.isReady).length;
  const language = state.room.language ?? state.preferredLanguage ?? "zh-CN";
  const label = language === "zh-CN" ? "下一局" : language === "en" ? "Next auction" : "Naechste Auktion";

  return {
    currentPlayerReady,
    readyCount,
    playerCount: players.length,
    label,
    description: `${readyCount}/${players.length}`,
    language,
    onToggleReady: () => onSetReady(!currentPlayerReady)
  };
}

function sendInput(
  context: ControllerGameRenderContext,
  input: Record<string, unknown>
): void {
  context.onInput({
    ...input,
    playerId: context.state.player?.id ?? "",
    sentAt: Date.now()
  });
}

export function buildAuctionKingControllerModel(
  context: ControllerGameRenderContext
): AuctionWarehouseLayoutModel {
  const { state } = context;
  const language = state.room?.language ?? state.preferredLanguage ?? "zh-CN";
  const controllerState = state.game?.state
    ? state.game.state as AuctionKingControllerState
    : null;

  return {
    kind: "auction_warehouse",
    language,
    roomCode: state.room?.code,
    message: state.game?.message,
    disabled: state.game?.phase !== "playing",
    state: controllerState,
    ready: buildReadyModel(context),
    onSelectRole: (roleId) => sendInput(context, { type: "select_role", roleId }),
    onSelectKit: (kitId) => sendInput(context, { type: "select_kit", kitId }),
    onConfirmSetup: () => sendInput(context, { type: "confirm_setup" }),
    onUseInstrument: (instrumentId) => sendInput(context, { type: "use_instrument", instrumentId }),
    onSubmitBid: (amount) => sendInput(context, { type: "submit_bid", amount })
  };
}

export const controllerGame = {
  id: auctionKingManifest.id,
  layoutKey: "auction_warehouse" as ControllerLayoutKey,
  buildLayout(context: ControllerGameRenderContext) {
    return buildAuctionKingControllerModel(context);
  }
} as const;
