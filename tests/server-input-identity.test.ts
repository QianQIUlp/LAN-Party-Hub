import type {
  AckResult,
  ClientToServerEvents,
  GameStatePayload,
  JoinRoomSuccess,
  RoomStatePayload,
  ServerToClientEvents
} from "@open-party-lab/protocol";
import { io, type Socket } from "socket.io-client";
import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../apps/server/src/app.js";
import type { AppEnv } from "../apps/server/src/core/config/env.js";

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function environment(snapshotPath: string): AppEnv {
  return {
    port: 0,
    host: "127.0.0.1",
    publicControllerOrigin: "http://127.0.0.1:5174",
    connectionRecoveryMs: 120_000,
    playerReconnectWindowMs: 120_000,
    roundTickMs: 16,
    jsonSnapshotPath: snapshotPath,
    fixedPrimaryRoomCode: "IDT0",
    webRoot: null,
    launcherControlToken: null
  };
}

async function connect(url: string): Promise<TestSocket> {
  const socket = io(url, { transports: ["websocket"], forceNew: true });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  return socket;
}

function emitAck<T>(emit: (ack: (result: AckResult<T>) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    emit((result) => result.ok ? resolve(result.data) : reject(new Error(result.error)));
  });
}

function waitForRoomState(
  socket: TestSocket,
  predicate: (payload: RoomStatePayload) => boolean
): Promise<RoomStatePayload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("room:state", onState);
      reject(new Error("Timed out waiting for room state."));
    }, 8_000);
    const onState = (payload: RoomStatePayload) => {
      if (!predicate(payload)) {
        return;
      }
      clearTimeout(timeout);
      socket.off("room:state", onState);
      resolve(payload);
    };
    socket.on("room:state", onState);
  });
}

function waitForGameState(
  socket: TestSocket,
  predicate: (payload: GameStatePayload) => boolean
): Promise<GameStatePayload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("game:state", onState);
      reject(new Error("Timed out waiting for game state."));
    }, 8_000);
    const onState = (payload: GameStatePayload) => {
      if (!predicate(payload)) {
        return;
      }
      clearTimeout(timeout);
      socket.off("game:state", onState);
      resolve(payload);
    };
    socket.on("game:state", onState);
  });
}

describe("authenticated game input identity", () => {
  it("overrides a spoofed inner player id with the authenticated controller", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lan-party-hub-input-identity-"));
    cleanupPaths.push(directory);
    const app = createApp(environment(join(directory, "rooms.json")));
    const sockets: TestSocket[] = [];

    await app.start();
    try {
      const port = (app.httpServer.address() as AddressInfo).port;
      const url = `http://127.0.0.1:${port}`;
      const host = await connect(url);
      const controllerOne = await connect(url);
      const controllerTwo = await connect(url);
      sockets.push(host, controllerOne, controllerTwo);

      const created = await emitAck<{ room: { code: string } }>((ack) =>
        host.emit("room:create", { language: "zh-CN" }, ack)
      );
      const first = await emitAck<JoinRoomSuccess>((ack) =>
        controllerOne.emit("room:join", {
          roomCode: created.room.code,
          playerName: "玩家甲",
          deviceId: "identity-one"
        }, ack)
      );
      const second = await emitAck<JoinRoomSuccess>((ack) =>
        controllerTwo.emit("room:join", {
          roomCode: created.room.code,
          playerName: "玩家乙",
          deviceId: "identity-two"
        }, ack)
      );

      const selected = waitForRoomState(host, ({ room }) => room.selectedGameId === "tap-race");
      host.emit("game:select", { roomCode: created.room.code, gameId: "tap-race" });
      await selected;

      const ready = waitForRoomState(host, ({ room }) => room.players.every((player) => player.isReady));
      controllerOne.emit("player:ready", {
        roomCode: created.room.code,
        playerId: first.player.id,
        isReady: true
      });
      controllerTwo.emit("player:ready", {
        roomCode: created.room.code,
        playerId: second.player.id,
        isReady: true
      });
      await ready;

      const playing = waitForGameState(controllerOne, ({ game }) => game.gameId === "tap-race" && game.phase === "playing");
      host.emit("round:start", { roomCode: created.room.code });
      await playing;

      const acceptedInput = waitForGameState(controllerOne, ({ game }) => {
        const state = game.state as { tapsByPlayer?: Record<string, number> };
        return (state.tapsByPlayer?.[first.player.id] ?? 0) > 0;
      });
      const timestamp = Date.now();
      controllerOne.emit("game:input", {
        roomCode: created.room.code,
        playerId: first.player.id,
        input: {
          type: "tap",
          playerId: second.player.id,
          sentAt: timestamp,
          pressedAt: timestamp
        }
      });

      const result = await acceptedInput;
      const taps = (result.game.state as { tapsByPlayer: Record<string, number> }).tapsByPlayer;
      expect(taps[first.player.id]).toBe(1);
      expect(taps[second.player.id]).toBe(0);
    } finally {
      for (const socket of sockets) {
        socket.disconnect();
      }
      await app.stop();
    }
  }, 15_000);
});
