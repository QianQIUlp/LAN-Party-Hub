import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { AppEnv } from "../apps/server/src/core/config/env.js";
import { createApp } from "../apps/server/src/app.js";
import type {
  AckResult,
  ClientToServerEvents,
  JoinRoomSuccess,
  ResumeSessionSuccess,
  ServerToClientEvents
} from "@open-party-lab/protocol";
import { io, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";

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
    fixedPrimaryRoomCode: "TST0",
    webRoot: null,
    launcherControlToken: null
  };
}

async function connect(url: string): Promise<TestSocket> {
  const socket = io(url, { transports: ["websocket"], forceNew: true });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  return socket;
}

function emitAck<T>(
  emit: (ack: (result: AckResult<T>) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    emit((result) => result.ok ? resolve(result.data) : reject(new Error(result.error)));
  });
}

describe("server restart recovery", () => {
  it("restores the room, selected game, scores and reconnect token without an active round", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lan-party-hub-"));
    cleanupPaths.push(directory);
    const snapshotPath = join(directory, "rooms.json");

    const firstApp = createApp(environment(snapshotPath));
    await firstApp.start();
    const firstPort = (firstApp.httpServer.address() as AddressInfo).port;
    const firstUrl = `http://127.0.0.1:${firstPort}`;
    const host = await connect(firstUrl);
    const controller = await connect(firstUrl);
    const secondController = await connect(firstUrl);

    const room = await emitAck<{ room: { code: string } }>((ack) =>
      host.emit("room:create", { language: "zh-CN" }, ack)
    );
    const joined = await emitAck<JoinRoomSuccess>((ack) =>
      controller.emit("room:join", {
        roomCode: room.room.code,
        playerName: "测试玩家",
        deviceId: "device-test"
      }, ack)
    );
    await emitAck<JoinRoomSuccess>((ack) =>
      secondController.emit("room:join", {
        roomCode: room.room.code,
        playerName: "测试玩家乙",
        deviceId: "device-test-two"
      }, ack)
    );

    host.emit("game:select", { roomCode: room.room.code, gameId: "tap-race" });
    await new Promise<void>((resolve) => {
      host.on("room:state", ({ room: nextRoom }) => {
        if (nextRoom.selectedGameId === "tap-race") resolve();
      });
    });

    host.disconnect();
    controller.disconnect();
    secondController.disconnect();
    await firstApp.stop();

    const rawSnapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as { schemaVersion: number };
    expect(rawSnapshot.schemaVersion).toBe(1);

    const secondApp = createApp(environment(snapshotPath));
    await secondApp.start();
    const secondPort = (secondApp.httpServer.address() as AddressInfo).port;
    const resumedSocket = await connect(`http://127.0.0.1:${secondPort}`);
    const resumed = await emitAck<ResumeSessionSuccess>((ack) =>
      resumedSocket.emit("session:resume", {
        reconnectToken: joined.reconnectToken,
        deviceId: "device-test"
      }, ack)
    );

    expect(resumed.room.code).toBe("TST0");
    expect(resumed.room.language).toBe("zh-CN");
    expect(resumed.room.selectedGameId).toBe("tap-race");
    expect(resumed.room.currentRound).toBeNull();
    expect(resumed.player.name).toBe("测试玩家");

    resumedSocket.disconnect();
    await secondApp.stop();
  });

  it("starts safely when the persisted JSON is corrupt", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lan-party-hub-corrupt-"));
    cleanupPaths.push(directory);
    const snapshotPath = join(directory, "rooms.json");
    await writeFile(snapshotPath, "{partial", "utf8");

    const app = createApp(environment(snapshotPath));
    await app.start();
    const port = (app.httpServer.address() as AddressInfo).port;
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const health = await response.json() as { roomCode: string; status: string };

    expect(health.status).toBe("ok");
    expect(health.roomCode).toBe("TST0");
    await app.stop();
  });

  it("ignores unsupported snapshot schemas without preventing startup", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lan-party-hub-schema-"));
    cleanupPaths.push(directory);
    const snapshotPath = join(directory, "rooms.json");
    await writeFile(snapshotPath, JSON.stringify({ schemaVersion: 999, rooms: [] }), "utf8");

    const app = createApp(environment(snapshotPath));
    await app.start();
    const port = (app.httpServer.address() as AddressInfo).port;
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const health = await response.json() as { roomCode: string };

    expect(health.roomCode).toBe("TST0");
    await app.stop();
  });
});
