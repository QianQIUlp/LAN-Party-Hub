import type { SupportedLanguage } from "@open-party-lab/game-core";
import { isSupportedLanguage } from "@open-party-lab/game-core";
import { logger } from "../core/logger/logger.js";
import type { ReconnectService } from "../players/reconnectService.js";
import type { PlayerRecord, RoomRecord, RoundRecord } from "../rooms/roomStore.js";
import { RoomStore } from "../rooms/roomStore.js";
import { LocalJsonStore } from "./localJsonStore.js";

const snapshotSchemaVersion = 1;

interface PersistedRoom {
  code: string;
  createdAt: number;
  language: SupportedLanguage;
  hostName: string;
  selectedGameId: string | null;
  gameSettingsByGameId: Record<string, Record<string, unknown>>;
  roundCounter: number;
  players: PlayerRecord[];
  previousRound: RoundRecord | null;
}

interface RoomSnapshotFile {
  schemaVersion: number;
  savedAt: number;
  rooms: PersistedRoom[];
}

function isSnapshotFile(value: unknown): value is RoomSnapshotFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<RoomSnapshotFile>;
  return snapshot.schemaVersion === snapshotSchemaVersion && Array.isArray(snapshot.rooms);
}

function persistedPlayer(player: PlayerRecord): PlayerRecord {
  return {
    ...player,
    connected: false,
    presence: "offline",
    socketId: null,
    isReady: false,
    reconnectGraceEndsAt: null
  };
}

function lastCompletedRound(room: RoomRecord): RoundRecord | null {
  if (room.currentRound?.phase === "finished") {
    return room.currentRound;
  }

  return room.previousRound?.phase === "finished" ? room.previousRound : null;
}

function serializeRoom(room: RoomRecord): PersistedRoom {
  return {
    code: room.code,
    createdAt: room.createdAt,
    language: room.language,
    hostName: room.hostName,
    selectedGameId: room.selectedGameId,
    gameSettingsByGameId: room.gameSettingsByGameId,
    roundCounter: room.roundCounter,
    players: [...room.players.values()].map(persistedPlayer),
    previousRound: lastCompletedRound(room)
  };
}

export class RoomPersistenceService {
  private readonly store: LocalJsonStore<RoomSnapshotFile | null>;
  private intervalHandle: NodeJS.Timeout | null = null;
  private lastSerialized = "";
  private writeChain: Promise<void> = Promise.resolve();

  constructor(
    filePath: string,
    private readonly roomStore: RoomStore,
    private readonly reconnectService: ReconnectService,
    private readonly buildJoinUrl: (roomCode: string) => string,
    private readonly listJoinOrigins: () => string[],
    private readonly intervalMs = 500
  ) {
    this.store = new LocalJsonStore(filePath);
  }

  async restore(): Promise<number> {
    const loaded = await this.store.loadWithRecovery(null);
    const snapshot = loaded.value;

    if (loaded.source === "backup") {
      logger.warn("Primary room snapshot could not be read; restored the last valid backup.", {
        error: loaded.error
      });
    } else if (loaded.source === "fallback" && loaded.error && !loaded.error.includes("ENOENT")) {
      logger.warn("Room snapshot could not be read; starting with a new room.", {
        error: loaded.error
      });
    }

    if (snapshot === null) {
      return 0;
    }

    if (!isSnapshotFile(snapshot)) {
      logger.warn("Room snapshot ignored because its schema is invalid or unsupported.", {
        expectedSchemaVersion: snapshotSchemaVersion
      });
      return 0;
    }

    let restoredRooms = 0;

    for (const persisted of snapshot.rooms) {
      if (
        !persisted ||
        typeof persisted.code !== "string" ||
        !/^[A-Z0-9]{4}$/.test(persisted.code) ||
        !isSupportedLanguage(persisted.language) ||
        !Array.isArray(persisted.players)
      ) {
        continue;
      }

      const players = persisted.players
        .filter((player) => player && typeof player.id === "string" && typeof player.reconnectToken === "string")
        .map(persistedPlayer);
      const room: RoomRecord = {
        code: persisted.code,
        createdAt: Number.isFinite(persisted.createdAt) ? persisted.createdAt : Date.now(),
        joinUrl: this.buildJoinUrl(persisted.code),
        joinOrigins: this.listJoinOrigins(),
        language: persisted.language,
        hostName: typeof persisted.hostName === "string" ? persisted.hostName : "LAN Party Hub",
        hostSocketId: null,
        selectedGameId: typeof persisted.selectedGameId === "string" ? persisted.selectedGameId : null,
        gameSettingsByGameId: persisted.gameSettingsByGameId ?? {},
        roundCounter: Number.isInteger(persisted.roundCounter) ? Math.max(0, persisted.roundCounter) : 0,
        players: new Map(players.map((player) => [player.id, player])),
        currentRound: null,
        previousRound: persisted.previousRound?.phase === "finished" ? persisted.previousRound : null
      };

      this.roomStore.create(room);
      for (const player of players) {
        this.reconnectService.restorePlayer(player, room.code);
      }
      restoredRooms += 1;
    }

    this.lastSerialized = this.serialize();
    logger.info("Room persistence restored.", { rooms: restoredRooms, schemaVersion: snapshotSchemaVersion });
    return restoredRooms;
  }

  start(): void {
    if (this.intervalHandle) {
      return;
    }

    this.intervalHandle = setInterval(() => {
      void this.flushIfChanged();
    }, this.intervalMs);
  }

  async stop(): Promise<void> {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    await this.flush(true);
    await this.writeChain;
  }

  async flushIfChanged(): Promise<void> {
    await this.flush(false);
  }

  private serialize(): string {
    return JSON.stringify(this.roomStore.values().map(serializeRoom));
  }

  private async flush(force: boolean): Promise<void> {
    const serialized = this.serialize();
    if (!force && serialized === this.lastSerialized) {
      return;
    }

    this.lastSerialized = serialized;
    const snapshot: RoomSnapshotFile = {
      schemaVersion: snapshotSchemaVersion,
      savedAt: Date.now(),
      rooms: JSON.parse(serialized) as PersistedRoom[]
    };

    this.writeChain = this.writeChain
      .then(() => this.store.save(snapshot))
      .catch((error: unknown) => {
        logger.error("Room persistence save failed.", {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    await this.writeChain;
  }
}
