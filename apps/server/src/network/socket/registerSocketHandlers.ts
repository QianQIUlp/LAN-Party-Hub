// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import { normalizeLanguage, type GamePlayerSetupDefinition, type SupportedLanguage } from "@open-party-lab/game-core";
import { hasActiveRound } from "@open-party-lab/protocol";
import type {
  AckResult,
  ClientToServerEvents,
  InterServerEvents,
  PlayerSetupValue,
  ServerToClientEvents,
  SocketData
} from "@open-party-lab/protocol";
import { now } from "../../core/time/now.js";
import { GameRegistry } from "../../game-engine/gameRegistry.js";
import { GameRuntime } from "../../game-engine/gameRuntime.js";
import { StateBroadcaster } from "../../game-engine/stateBroadcaster.js";
import { PlayerManager } from "../../players/playerManager.js";
import { ReconnectService } from "../../players/reconnectService.js";
import { canStartRound, explainCannotStartRound } from "../../rooms/roomLifecycle.js";
import { RoomManager } from "../../rooms/roomManager.js";

type IoServer = import("socket.io").Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export interface RegisterSocketHandlersDeps {
  io: IoServer;
  roomManager: RoomManager;
  playerManager: PlayerManager;
  reconnectService: ReconnectService;
  gameRegistry: GameRegistry;
  gameRuntime: GameRuntime;
  stateBroadcaster: StateBroadcaster;
}

function ackError<T>(message: string): AckResult<T> {
  return { ok: false, error: message };
}

function bindAuthenticatedPlayerInput(input: unknown, playerId: string): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }

  return {
    ...input,
    playerId
  };
}

function getPlayerSetupSelectionKey(setup: GamePlayerSetupDefinition): string {
  return setup.selectionKey ?? "character";
}

function normalizePlayerSetupValue(
  setup: GamePlayerSetupDefinition,
  value: PlayerSetupValue
): PlayerSetupValue | null {
  const validOptionIds = new Set(setup.options.map((option) => option.id));

  if (setup.kind === "choice") {
    return typeof value === "string" && validOptionIds.has(value) ? value : null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = [...new Set(value.filter((entry) => validOptionIds.has(entry)))].slice(0, setup.maxSelections);

  if (normalized.length !== value.length) {
    return null;
  }

  return normalized;
}

function socketText(language: SupportedLanguage) {
  if (language === "zh-CN") {
    return {
      roomNotFound: "房间不存在。",
      roomCodeNotFound: "找不到这个房间码。",
      enterPlayerName: "请输入昵称。",
      sessionNotFound: "找不到保存的玩家身份。",
      sessionRoomGone: "这个玩家身份对应的房间已经不存在。",
      sessionRestoreFailed: "无法恢复玩家身份。",
      ownSessionOnly: "你只能退出自己的玩家身份。",
      leftRoom: "你已离开房间。",
      hostLanguageOnly: "只有主机可以切换语言。",
      hostJoinOriginOnly: "只有主机可以切换手机加入地址。",
      invalidJoinOrigin: "这个地址不是本机可用的局域网地址。",
      hostKickOnly: "只有主机可以移除玩家。",
      kicked: "你已被主机移出房间。",
      playerNotFound: "找不到玩家。",
      ownCharacterOnly: "你只能为自己选择角色。",
      characterOrPlayerNotFound: "找不到角色或玩家。",
      hostSelectOnly: "只有主机可以选择游戏。",
      unknownGame: "未知游戏。",
      playerCountMismatch: (min: number, max: number) => `当前人数不符合要求；此游戏支持 ${min}–${max} 人。`,
      hostActionOnly: "只有主机可以修改游戏设置。",
      hostActionWrongGame: "这个设置不属于当前选择的游戏。",
      hostActionUnsupported: "当前游戏不支持这个设置。",
      hostStartOnly: "只有主机可以开始游戏。",
      readyAutoStart: "所有玩家再次准备后，本局会自动开始。",
      notReadyFallback: "所有玩家必须准备，并且人数需要符合游戏要求。",
      hostAbortOnly: "只有主机可以结束正在进行的游戏。",
      ownInputOnly: "你只能代表自己的玩家发送操作。"
    };
  }

  const en = language === "en";
  return {
    roomNotFound: en ? "Room not found." : "Raum nicht gefunden.",
    roomCodeNotFound: en ? "Room code not found." : "Raumcode nicht gefunden.",
    enterPlayerName: en ? "Please enter a player name." : "Bitte gib einen Spielernamen ein.",
    sessionNotFound: en ? "Session not found." : "Session nicht gefunden.",
    sessionRoomGone: en ? "The room for this session no longer exists." : "Raum zur Session existiert nicht mehr.",
    sessionRestoreFailed: en ? "Session could not be restored." : "Session konnte nicht wiederhergestellt werden.",
    ownSessionOnly: en ? "You can only leave your own session." : "Du kannst nur deine eigene Session verlassen.",
    leftRoom: en ? "You left the room." : "Du hast den Raum verlassen.",
    hostLanguageOnly: en ? "Only the host can change the language." : "Nur der Host kann die Sprache aendern.",
    hostJoinOriginOnly: en ? "Only the host can change the phone join address." : "Nur der Host kann die Beitrittsadresse aendern.",
    invalidJoinOrigin: en ? "That address is not an available local network address." : "Diese Adresse ist keine verfuegbare lokale Netzwerkadresse.",
    hostKickOnly: en ? "Only the host can kick players." : "Nur der Host kann Spieler kicken.",
    kicked: en ? "You were removed from the room by the host." : "Du wurdest vom Host aus dem Raum entfernt.",
    playerNotFound: en ? "Player not found." : "Spieler nicht gefunden.",
    ownCharacterOnly: en ? "You can only choose your own character." : "Du darfst nur deinen eigenen Charakter waehlen.",
    characterOrPlayerNotFound: en ? "Character or player not found." : "Charakter oder Spieler nicht gefunden.",
    hostSelectOnly: en ? "Only the host can choose games." : "Nur der Host kann Spiele waehlen.",
    unknownGame: en ? "Unknown game." : "Unbekanntes Spiel.",
    playerCountMismatch: (min: number, max: number) => en
      ? `The current player count is not supported; this game needs ${min}-${max} players.`
      : `Die aktuelle Spielerzahl passt nicht; dieses Spiel braucht ${min}-${max} Spieler.`,
    hostActionOnly: en ? "Only the host can send host actions." : "Nur der Host kann Host-Aktionen senden.",
    hostActionWrongGame: en
      ? "This host action does not match the currently selected game."
      : "Diese Host-Aktion passt nicht zum aktuell ausgewaehlten Spiel.",
    hostActionUnsupported: en
      ? "This host action is not supported by the current game."
      : "Diese Host-Aktion wird vom aktuellen Spiel nicht unterstuetzt.",
    hostStartOnly: en ? "Only the host can start rounds." : "Nur der Host kann Runden starten.",
    readyAutoStart: en
      ? "This round starts automatically once all players are ready again."
      : "Diese Runde startet automatisch, sobald alle Spieler wieder bereit sind.",
    notReadyFallback: en
      ? "All players must be ready and the player count must fit."
      : "Alle Spieler muessen bereit sein und die Spielerzahl muss passen.",
    hostAbortOnly: en ? "Only the host can end running rounds." : "Nur der Host kann laufende Runden beenden.",
    ownInputOnly: en
      ? "You can only send inputs for your own player."
      : "Du darfst nur Eingaben fuer deinen eigenen Spieler senden."
  };
}

function clearSocketIdentity(socket: {
  data: { role?: "host" | "controller"; roomCode?: string; playerId?: string };
  leave(roomCode: string): void;
  disconnect(close?: boolean): void;
  emit(event: "session:terminated", payload: { roomCode: string; playerId: string; reason: "left" | "kicked"; message: string }): void;
  id: string;
}) {
  if (socket.data.roomCode) {
    socket.leave(socket.data.roomCode);
  }

  delete socket.data.role;
  delete socket.data.roomCode;
  delete socket.data.playerId;
}

export function registerSocketHandlers({
  io,
  roomManager,
  playerManager,
  reconnectService,
  gameRegistry,
  gameRuntime,
  stateBroadcaster
}: RegisterSocketHandlersDeps): void {
  function getSelectedGame(room: NonNullable<ReturnType<RoomManager["getRoom"]>>) {
    return room.selectedGameId ? gameRegistry.getAvailableGame(room.selectedGameId, room.language) : undefined;
  }

  function resetInvalidPlayerSetupSelections(
    room: NonNullable<ReturnType<RoomManager["getRoom"]>>,
    selectedGame: ReturnType<typeof getSelectedGame>
  ): void {
    const setup = selectedGame?.playerSetup;

    if (!selectedGame || !setup) {
      for (const player of room.players.values()) {
        player.selectedCharacterId = null;
      }

      return;
    }

    const selectionKey = getPlayerSetupSelectionKey(setup);

    for (const player of room.players.values()) {
      const currentSelections = player.setupSelectionsByGameId[selectedGame.id] ?? {};
      const value = currentSelections[selectionKey];
      const normalized = value === undefined ? undefined : normalizePlayerSetupValue(setup, value);

      if (normalized !== null && normalized !== undefined) {
        if (setup.kind === "choice") {
          player.selectedCharacterId = normalized as string;
        }

        continue;
      }

      const nextSelections = { ...currentSelections };
      delete nextSelections[selectionKey];

      player.setupSelectionsByGameId = {
        ...player.setupSelectionsByGameId,
        [selectedGame.id]: nextSelections
      };

      if (setup.kind === "choice") {
        player.selectedCharacterId = null;
      }
    }
  }

  function resetLobbySetupConfirmation(
    room: NonNullable<ReturnType<RoomManager["getRoom"]>>,
    selectedGame: ReturnType<typeof getSelectedGame>
  ): void {
    const confirmation = selectedGame?.lobbySetup?.confirmation;

    if (!selectedGame || !confirmation) {
      return;
    }

    const currentSettings = room.gameSettingsByGameId[selectedGame.id] ?? {};
    room.gameSettingsByGameId = {
      ...room.gameSettingsByGameId,
      [selectedGame.id]: {
        ...currentSettings,
        [confirmation.settingKey]: false
      }
    };
  }

  function startReadyLockedRound(room: NonNullable<ReturnType<RoomManager["getRoom"]>>) {
    const startedState = gameRuntime.startRound(room);

    if (!startedState) {
      return false;
    }

    const selectedGame = getSelectedGame(room);

    if (selectedGame?.roundCompletionMode === "wait_for_ready") {
      playerManager.setAllReady(room, false);
    }

    stateBroadcaster.broadcastRoomState(room);
    stateBroadcaster.broadcastGameState(room);
    stateBroadcaster.broadcastScoreboard(room);

    return true;
  }

  function maybeAutoStartReadyRound(roomCode: string): boolean {
    const room = roomManager.getRoom(roomCode);

    if (!room || !room.selectedGameId) {
      return false;
    }

    if (hasActiveRound(room)) {
      return false;
    }

    const selectedGame = getSelectedGame(room);

    if (selectedGame?.roundCompletionMode !== "wait_for_ready") {
      return false;
    }

    if (room.currentRound?.phase === "finished" && selectedGame.id === "arena-survivor") {
      const roundState = room.currentRound.state as {
        result?: { outcome?: string };
      };

      if (roundState.result?.outcome !== "survived") {
        return false;
      }
    }

    if (!canStartRound(room, selectedGame)) {
      return false;
    }

    return startReadyLockedRound(room);
  }

  io.on("connection", (socket) => {
    socket.emit("server:hello", {
      serverTime: now(),
      recoveryEnabled: true
    });

    socket.on("room:create", (payload, ack) => {
      const hostName = payload.hostName?.trim() || "Host";
      const room = roomManager.ensurePrimaryRoom(hostName, normalizeLanguage(payload.language));
      const previousHostSocketId = roomManager.attachHostSocket(room, socket.id, hostName);

      if (previousHostSocketId) {
        const previousHostSocket = io.sockets.sockets.get(previousHostSocketId);

        if (previousHostSocket) {
          previousHostSocket.leave(room.code);
          delete previousHostSocket.data.role;
          delete previousHostSocket.data.roomCode;
          delete previousHostSocket.data.playerId;
        }
      }

      socket.data.role = "host";
      socket.data.roomCode = room.code;
      socket.join(room.code);

      ack({
        ok: true,
        data: {
          room: stateBroadcaster.createRoomSnapshot(room)
        }
      });

      stateBroadcaster.broadcastRoomState(room);
      stateBroadcaster.broadcastScoreboard(room);

      if (room.currentRound) {
        stateBroadcaster.broadcastGameState(room);
      }
    });

    socket.on("room:set-language", (payload, ack) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        ack(ackError("Raum nicht gefunden."));
        return;
      }
      const text = socketText(room.language);

      if (socket.data.role !== "host" || socket.data.roomCode !== room.code) {
        ack(ackError(text.hostLanguageOnly));
        return;
      }

      roomManager.setLanguage(room, normalizeLanguage(payload.language, room.language));

      ack({
        ok: true,
        data: {
          room: stateBroadcaster.createRoomSnapshot(room)
        }
      });

      stateBroadcaster.broadcastRoomState(room);
      stateBroadcaster.broadcastScoreboard(room);

      if (room.currentRound) {
        stateBroadcaster.broadcastGameState(room);
      }
    });

    socket.on("room:set-join-origin", (payload, ack) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        ack(ackError("房间不存在。"));
        return;
      }
      const text = socketText(room.language);

      if (socket.data.role !== "host" || socket.data.roomCode !== room.code) {
        ack(ackError(text.hostJoinOriginOnly));
        return;
      }

      if (!roomManager.setJoinOrigin(room, payload.origin)) {
        ack(ackError(text.invalidJoinOrigin));
        return;
      }

      const snapshot = stateBroadcaster.createRoomSnapshot(room);
      ack({ ok: true, data: { room: snapshot } });
      stateBroadcaster.broadcastRoomState(room);
    });

    socket.on("room:join", (payload, ack) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        ack(ackError("Raumcode nicht gefunden."));
        return;
      }
      const text = socketText(room.language);

      const playerName = payload.playerName.trim();

      if (!playerName) {
        ack(ackError(text.enterPlayerName));
        return;
      }

      const result = playerManager.joinPlayer(room, payload, socket.id);
      const player = result.player;

      socket.data.role = "controller";
      socket.data.roomCode = room.code;
      socket.data.playerId = player.id;
      socket.join(room.code);

      ack({
        ok: true,
        data: {
          room: stateBroadcaster.createRoomSnapshot(room),
          player: playerManager.toSnapshot(player),
          reconnectToken: player.reconnectToken
        }
      });

      stateBroadcaster.broadcastRoomState(room);
      stateBroadcaster.broadcastScoreboard(room);

      if (room.currentRound) {
        stateBroadcaster.sendControllerGameState(socket, room);
        stateBroadcaster.broadcastGameState(room);
      }
    });

    socket.on("session:resume", (payload, ack) => {
      const session = reconnectService.getSession(payload.reconnectToken);

      if (!session) {
        ack(ackError("Session nicht gefunden."));
        return;
      }

      const room = roomManager.getRoom(session.roomCode);

      if (!room) {
        ack(ackError("Raum zur Session existiert nicht mehr."));
        return;
      }
      const text = socketText(room.language);

      const player = playerManager.resumePlayer(
        room,
        payload.reconnectToken,
        payload.deviceId,
        socket.id
      );

      if (!player) {
        ack(ackError(text.sessionRestoreFailed));
        return;
      }

      socket.data.role = "controller";
      socket.data.roomCode = room.code;
      socket.data.playerId = player.id;
      socket.join(room.code);

      const roomSnapshot = stateBroadcaster.createRoomSnapshot(room);
      const playerSnapshot = playerManager.toSnapshot(player);

      ack({
        ok: true,
        data: {
          room: roomSnapshot,
          player: playerSnapshot,
          reconnectToken: player.reconnectToken
        }
      });

      socket.emit("session:resumed", {
        room: roomSnapshot,
        player: playerSnapshot,
        reconnectToken: player.reconnectToken
      });

      stateBroadcaster.broadcastRoomState(room);
      stateBroadcaster.broadcastScoreboard(room);

      if (room.currentRound) {
        stateBroadcaster.sendControllerGameState(socket, room);
        stateBroadcaster.broadcastGameState(room);
      }
    });

    socket.on("room:leave", (payload, ack) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        ack(ackError("Raum nicht gefunden."));
        return;
      }
      const text = socketText(room.language);

      if (socket.data.role !== "controller" || socket.data.roomCode !== room.code || !socket.data.playerId) {
        ack(ackError(text.ownSessionOnly));
        return;
      }

      const result = playerManager.removePlayer(room, socket.data.playerId);

      if ("error" in result) {
        ack(ackError(result.error));
        return;
      }

      ack({
        ok: true,
        data: {
          room: stateBroadcaster.createRoomSnapshot(room)
        }
      });

      socket.emit("session:terminated", {
        roomCode: room.code,
        playerId: result.player.id,
        reason: "left",
        message: text.leftRoom
      });

      clearSocketIdentity(socket);
      socket.disconnect(true);

      stateBroadcaster.broadcastRoomState(room);
      stateBroadcaster.broadcastScoreboard(room);

      if (room.currentRound) {
        stateBroadcaster.broadcastGameState(room);
      }
    });

    socket.on("player:kick", (payload, ack) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        ack(ackError("Raum nicht gefunden."));
        return;
      }
      const text = socketText(room.language);

      if (socket.data.role !== "host") {
        ack(ackError(text.hostKickOnly));
        return;
      }

      const result = playerManager.removePlayer(room, payload.playerId);

      if ("error" in result) {
        ack(ackError(result.error));
        return;
      }

      ack({
        ok: true,
        data: {
          room: stateBroadcaster.createRoomSnapshot(room)
        }
      });

      const targetSocketId = result.socketId;

      if (targetSocketId) {
        const targetSocket = io.sockets.sockets.get(targetSocketId);

        if (targetSocket) {
          targetSocket.emit("session:terminated", {
            roomCode: room.code,
            playerId: result.player.id,
            reason: "kicked",
            message: text.kicked
          });
          clearSocketIdentity(targetSocket);
          targetSocket.disconnect(true);
        }
      }

      stateBroadcaster.broadcastRoomState(room);
      stateBroadcaster.broadcastScoreboard(room);

      if (room.currentRound) {
        stateBroadcaster.broadcastGameState(room);
      }
    });

    socket.on("player:ready", (payload) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        stateBroadcaster.emitError(socket, "room/not-found", "Raum nicht gefunden.");
        return;
      }
      const text = socketText(room.language);

      const player = playerManager.setReady(room, payload.playerId, payload.isReady);

      if (!player) {
        stateBroadcaster.emitError(socket, "player/not-found", text.playerNotFound);
        return;
      }

      stateBroadcaster.broadcastRoomState(room);
      maybeAutoStartReadyRound(room.code);
    });

    socket.on("player:select-character", (payload) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        stateBroadcaster.emitError(socket, "room/not-found", "Raum nicht gefunden.");
        return;
      }
      const text = socketText(room.language);

      if (socket.data.role !== "controller" || socket.data.playerId !== payload.playerId) {
        stateBroadcaster.emitError(
          socket,
          "player/forbidden",
          text.ownCharacterOnly
        );
        return;
      }

      const selectedGame = getSelectedGame(room);
      const playerSetup = selectedGame?.playerSetup;
      const playerSetupOptions = playerSetup?.kind === "choice" ? playerSetup.options : [];

      if (!playerSetupOptions.some((option) => option.id === payload.characterId)) {
        stateBroadcaster.emitError(socket, "player/not-found", text.characterOrPlayerNotFound);
        return;
      }

      const player = playerManager.setSelectedCharacter(room, payload.playerId, payload.characterId);

      if (!player) {
        stateBroadcaster.emitError(socket, "player/not-found", text.characterOrPlayerNotFound);
        return;
      }

      if (selectedGame && playerSetup) {
        playerManager.setPlayerSetup(
          room,
          payload.playerId,
          selectedGame.id,
          getPlayerSetupSelectionKey(playerSetup),
          payload.characterId
        );
      }

      stateBroadcaster.broadcastRoomState(room);
      maybeAutoStartReadyRound(room.code);
    });

    socket.on("player:set-setup", (payload, ack) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        ack(ackError("Raum nicht gefunden."));
        return;
      }
      const text = socketText(room.language);

      if (socket.data.role !== "controller" || socket.data.playerId !== payload.playerId) {
        ack(ackError(text.ownCharacterOnly));
        return;
      }

      const selectedGame = getSelectedGame(room);
      const setup = selectedGame?.playerSetup;

      if (!selectedGame || !setup || getPlayerSetupSelectionKey(setup) !== payload.selectionKey) {
        ack(ackError(text.characterOrPlayerNotFound));
        return;
      }

      const normalizedValue = normalizePlayerSetupValue(setup, payload.value);

      if (normalizedValue === null) {
        ack(ackError(text.characterOrPlayerNotFound));
        return;
      }

      const player = playerManager.setPlayerSetup(
        room,
        payload.playerId,
        selectedGame.id,
        payload.selectionKey,
        normalizedValue
      );

      if (!player) {
        ack(ackError(text.playerNotFound));
        return;
      }

      if (setup.kind === "choice" && typeof normalizedValue === "string") {
        player.selectedCharacterId = normalizedValue;
      }

      ack({
        ok: true,
        data: {
          room: stateBroadcaster.createRoomSnapshot(room),
          player: playerManager.toSnapshot(player)
        }
      });

      stateBroadcaster.broadcastRoomState(room);
      maybeAutoStartReadyRound(room.code);
    });

    socket.on("game:select", (payload) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        stateBroadcaster.emitError(socket, "room/not-found", "Raum nicht gefunden.");
        return;
      }
      const text = socketText(room.language);

      if (socket.data.role !== "host") {
        stateBroadcaster.emitError(socket, "room/forbidden", text.hostSelectOnly);
        return;
      }

      if (payload.gameId) {
        const candidate = gameRegistry.getAvailableGame(payload.gameId, room.language);
        if (!candidate) {
          stateBroadcaster.emitError(socket, "game/not-found", text.unknownGame);
          return;
        }

        if (room.players.size < candidate.minPlayers || room.players.size > candidate.maxPlayers) {
          stateBroadcaster.emitError(
            socket,
            "game/player-count",
            text.playerCountMismatch(candidate.minPlayers, candidate.maxPlayers)
          );
          return;
        }
      }

      const previousGameId = room.selectedGameId;
      gameRuntime.selectGame(room, payload.gameId);

      if (previousGameId !== payload.gameId) {
        playerManager.setAllReady(room, false);
      }

      const selectedGame = getSelectedGame(room);
      resetInvalidPlayerSetupSelections(room, selectedGame);
      resetLobbySetupConfirmation(room, selectedGame);

      if (maybeAutoStartReadyRound(room.code)) {
        return;
      }

      stateBroadcaster.broadcastRoomState(room);
      stateBroadcaster.broadcastScoreboard(room);
    });

    socket.on("game:host-action", (payload) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        stateBroadcaster.emitError(socket, "room/not-found", "Raum nicht gefunden.");
        return;
      }
      const text = socketText(room.language);

      if (socket.data.role !== "host") {
        stateBroadcaster.emitError(socket, "room/forbidden", text.hostActionOnly);
        return;
      }

      if (room.selectedGameId !== payload.gameId) {
        stateBroadcaster.emitError(
          socket,
          "game/not-selected",
          text.hostActionWrongGame
        );
        return;
      }

      const update = gameRuntime.handleHostAction(room, {
        gameId: payload.gameId,
        action: payload.action
      });

      if (!update) {
        stateBroadcaster.emitError(
          socket,
          "game/unsupported-action",
          text.hostActionUnsupported
        );
        return;
      }

      if (maybeAutoStartReadyRound(room.code)) {
        return;
      }

      if (update.roomChanged || update.phaseChanged) {
        stateBroadcaster.broadcastRoomState(room);
      }

      if (update.stateChanged) {
        stateBroadcaster.broadcastGameState(room);
      }

      if (update.scoreChanged) {
        stateBroadcaster.broadcastScoreboard(room);
      }
    });

    socket.on("round:start", (payload) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        stateBroadcaster.emitError(socket, "room/not-found", "Raum nicht gefunden.");
        return;
      }
      const text = socketText(room.language);

      if (socket.data.role !== "host") {
        stateBroadcaster.emitError(socket, "room/forbidden", text.hostStartOnly);
        return;
      }

      const selectedGame = getSelectedGame(room);

      if (selectedGame?.roundCompletionMode === "wait_for_ready") {
        stateBroadcaster.emitError(
          socket,
          "round/not-ready",
          text.readyAutoStart
        );
        return;
      }

      if (!canStartRound(room, selectedGame)) {
        stateBroadcaster.emitError(
          socket,
          "round/not-ready",
          explainCannotStartRound(room, selectedGame) ??
            text.notReadyFallback
        );
        return;
      }

      startReadyLockedRound(room);
    });

    const handleRoundAbort: ClientToServerEvents["round:abort"] = (payload, ack) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        ack(ackError("Raum nicht gefunden."));
        return;
      }
      const text = socketText(room.language);

      if (socket.data.role !== "host") {
        ack(ackError(text.hostAbortOnly));
        return;
      }

      gameRuntime.abortRound(room);
      stateBroadcaster.clearGameStateCache(room.code);
      stateBroadcaster.broadcastRoomState(room);
      stateBroadcaster.broadcastScoreboard(room);

      ack({
        ok: true,
        data: {
          room: stateBroadcaster.createRoomSnapshot(room)
        }
      });
    };

    socket.on("round:abort" as keyof ClientToServerEvents, handleRoundAbort);

    socket.on("game:input", (payload) => {
      const room = roomManager.getRoom(payload.roomCode);

      if (!room) {
        stateBroadcaster.emitError(socket, "room/not-found", "Raum nicht gefunden.");
        return;
      }
      const text = socketText(room.language);
      const authenticatedPlayerId = socket.data.playerId;

      if (socket.data.role !== "controller" || !authenticatedPlayerId || authenticatedPlayerId !== payload.playerId) {
        stateBroadcaster.emitError(
          socket,
          "player/forbidden",
          text.ownInputOnly
        );
        return;
      }

      const update = gameRuntime.handleInput(room, {
        playerId: authenticatedPlayerId,
        input: bindAuthenticatedPlayerInput(payload.input, authenticatedPlayerId)
      });

      if (!update) {
        return;
      }

      if (update.stateChanged) {
        stateBroadcaster.broadcastGameState(room);
      }

      if (update.phaseChanged) {
        stateBroadcaster.broadcastRoomState(room);
      }

      if (update.scoreChanged) {
        stateBroadcaster.broadcastScoreboard(room);
      }
    });

    socket.on("disconnect", () => {
      const roomCode = socket.data.roomCode;

      if (!roomCode) {
        return;
      }

      const room = roomManager.getRoom(roomCode);

      if (!room) {
        return;
      }

      if (socket.data.role === "host") {
        if (roomManager.clearHostSocket(room, socket.id)) {
          stateBroadcaster.broadcastRoomState(room);
        }
        return;
      }

      if (socket.data.role === "controller") {
        playerManager.disconnectPlayer(room, socket.id);
        stateBroadcaster.broadcastRoomState(room);
      }
    });
  });
}
