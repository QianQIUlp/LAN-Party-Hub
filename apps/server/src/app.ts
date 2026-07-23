// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import { listPublicControllerOrigins, loadEnv, type AppEnv } from "./core/config/env.js";
import { logger } from "./core/logger/logger.js";
import { now } from "./core/time/now.js";
import { GameRegistry } from "./game-engine/gameRegistry.js";
import { GameRuntime } from "./game-engine/gameRuntime.js";
import { GameTransitionService } from "./game-engine/gameTransitionService.js";
import { RoundManager } from "./game-engine/roundManager.js";
import { RoundTimerService } from "./game-engine/roundTimerService.js";
import { ScoreManager } from "./game-engine/scoreManager.js";
import { StateBroadcaster } from "./game-engine/stateBroadcaster.js";
import { createHttpServer } from "./network/http/createHttpServer.js";
import { buildJoinUrl } from "./network/qr/buildJoinUrl.js";
import { createIo } from "./network/socket/createIo.js";
import { registerSocketHandlers } from "./network/socket/registerSocketHandlers.js";
import { SocketSessionStore } from "./network/socket/socketSessionStore.js";
import { RoomPersistenceService } from "./persistence/roomPersistenceService.js";
import { PlayerManager } from "./players/playerManager.js";
import { PlayerPresenceTracker } from "./players/playerPresenceTracker.js";
import { PlayerStore } from "./players/playerStore.js";
import { ReconnectService } from "./players/reconnectService.js";
import { RoomManager } from "./rooms/roomManager.js";
import { RoomStore } from "./rooms/roomStore.js";

export function createApp(environment: AppEnv = loadEnv()) {
  const roomStore = new RoomStore();
  let handleControlShutdown: (() => void) | undefined;
  const httpServer = createHttpServer(environment, () => {
    const room = roomStore.first();
    return {
      roomCode: room?.code ?? null,
      joinUrl: room?.joinUrl ?? null,
      joinOrigins: room?.joinOrigins ?? listPublicControllerOrigins(environment),
      persistencePath: environment.jsonSnapshotPath
    };
  }, () => handleControlShutdown?.());
  const io = createIo(httpServer, environment);

  const playerStore = new PlayerStore();
  const sessionStore = new SocketSessionStore();
  const createJoinUrl = (roomCode: string) => buildJoinUrl(environment.publicControllerOrigin, roomCode);
  const roomManager = new RoomManager(
    roomStore,
    createJoinUrl,
    () => listPublicControllerOrigins(environment),
    now,
    environment.fixedPrimaryRoomCode
  );
  const reconnectService = new ReconnectService(sessionStore, now);
  const persistenceService = new RoomPersistenceService(
    environment.jsonSnapshotPath,
    roomStore,
    reconnectService,
    createJoinUrl,
    () => listPublicControllerOrigins(environment)
  );
  const playerPresenceTracker = new PlayerPresenceTracker(
    environment.playerReconnectWindowMs,
    now
  );
  const playerManager = new PlayerManager(
    playerStore,
    playerPresenceTracker,
    reconnectService,
    now
  );
  const gameRegistry = new GameRegistry();
  const scoreManager = new ScoreManager(now);
  const roundManager = new RoundManager();
  const gameTransitionService = new GameTransitionService(roundManager, scoreManager);
  const gameRuntime = new GameRuntime(
    gameRegistry,
    roundManager,
    gameTransitionService,
    now
  );
  const stateBroadcaster = new StateBroadcaster(
    io,
    gameRegistry,
    gameRuntime,
    scoreManager
  );
  const roundTimerService = new RoundTimerService(
    roomStore,
    playerManager,
    gameRegistry,
    gameRuntime,
    stateBroadcaster,
    environment.roundTickMs
  );

  registerSocketHandlers({
    io,
    roomManager,
    playerManager,
    reconnectService,
    gameRegistry,
    gameRuntime,
    stateBroadcaster
  });

  let started = false;
  let stopping = false;

  const app = {
    env: environment,
    httpServer,
    io,
    async start(): Promise<void> {
      if (started) {
        return;
      }

      await persistenceService.restore();
      const primaryRoom = roomManager.ensurePrimaryRoom("LAN Party Hub");

      await new Promise<void>((resolve, reject) => {
        const handleListenError = (error: NodeJS.ErrnoException) => {
          if (error.code === "EADDRINUSE") {
            reject(
              new Error(
                `Port ${environment.port} is already in use. Stop the existing dev server with npm run dev:stop or set PORT to a free port.`
              )
            );
            return;
          }

          reject(error);
        };

        httpServer.once("error", handleListenError);
        httpServer.listen(environment.port, environment.host, () => {
          httpServer.off("error", handleListenError);
          resolve();
        });
      });

      roundTimerService.start();
      persistenceService.start();
      started = true;

      logger.info("Party platform server listening.", {
        host: environment.host,
        port: environment.port,
        controllerOrigin: environment.publicControllerOrigin,
        roomCode: primaryRoom.code,
        reconnectWindowMs: environment.playerReconnectWindowMs,
        roundTickMs: environment.roundTickMs
      });
    },
    async stop(): Promise<void> {
      if (stopping) {
        return;
      }

      stopping = true;
      roundTimerService.stop();
      await persistenceService.stop();

      if (started) {
        await new Promise<void>((resolve) => {
          io.close(() => resolve());
        });
      }

      started = false;
      logger.info("LAN Party Hub server stopped.");
    }
  };

  handleControlShutdown = () => {
    void app.stop();
  };

  return app;
}
