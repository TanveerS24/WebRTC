import http from "http";
import { env } from "./config/env";
import { connectDb, closeDb } from "./db/client";
import { createIndexes } from "./db/indexes";
import { createRoomRepo } from "./repositories/roomRepo";
import { createUpdateRepo } from "./repositories/updateRepo";
import { createPollRepo } from "./repositories/pollRepo";
import { createRoomService } from "./services/roomService";
import { createUpdateService } from "./services/updateService";
import { createPollService } from "./services/pollService";
import { createRoomRegistry } from "./ws/roomRegistry";
import { createRouter } from "./ws/router";
import { createRoomHandler } from "./ws/handlers/room.handler";
import { createUpdateHandler } from "./ws/handlers/update.handler";
import { createPollHandler } from "./ws/handlers/poll.handler";
import { createLatencyHandler } from "./ws/handlers/latency.handler";
import { createRtcHandler } from "./ws/handlers/rtc.handler";
import { createWsServer } from "./ws/server";
import { createApp } from "./app";
import { logger } from "./utils/logger";

async function boot(): Promise<void> {
  // 1. Establish database connection and apply collection indexes
  const db = await connectDb(env.MONGODB_URI);
  await createIndexes(db);

  // 2. Data access layer
  const roomRepo = createRoomRepo(db);
  const updateRepo = createUpdateRepo(db);
  const pollRepo = createPollRepo(db);

  // 3. Business logic services
  const roomService = createRoomService({ roomRepo, updateRepo });
  const updateService = createUpdateService({ updateRepo, roomRepo });
  const pollService = createPollService({ pollRepo, roomRepo });

  // 4. In-memory WebSocket registry and action handlers
  const registry = createRoomRegistry();
  const roomHandler = createRoomHandler({ roomService, pollService, registry });
  const updateHandler = createUpdateHandler({ updateService, registry });
  const pollHandler = createPollHandler({ pollService, registry });
  const latencyHandler = createLatencyHandler(registry);
  const rtcHandler = createRtcHandler(registry);

  // 5. Message router dispatch table
  const router = createRouter(
    {
      join_room: roomHandler.handleJoinRoom,
      post_update: updateHandler.handlePostUpdate,
      poll_create: pollHandler.handlePollCreate,
      poll_vote: pollHandler.handlePollVote,
      poll_close: pollHandler.handlePollClose,
      latency_ping: latencyHandler.handleLatencyPing,
      rtc_join: rtcHandler.handleRtcJoin,
      rtc_offer: rtcHandler.handleRtcOffer,
      rtc_answer: rtcHandler.handleRtcAnswer,
      rtc_ice: rtcHandler.handleRtcIce,
      rtc_leave: rtcHandler.handleRtcLeave,
    },
    registry
  );

  // 6. HTTP and WebSocket servers
  const app = createApp({
    roomService,
    updateService,
    clientOrigin: env.CLIENT_ORIGIN,
  });
  const httpServer = http.createServer(app);
  const wsServer = createWsServer({ httpServer, router, registry });

  httpServer.listen(env.PORT, () => {
    logger.info(
      `Server listening on http://localhost:${env.PORT} (WebSocket at ws://localhost:${env.PORT}/ws)`
    );
  });

  // 7. Graceful shutdown handler
  let isShuttingDown = false;
  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      await wsServer.close();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
      await closeDb();
      logger.info("Graceful shutdown completed");
      process.exit(0);
    } catch (err) {
      logger.error("Error encountered during graceful shutdown:", err);
      process.exit(1);
    }
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

boot().catch((err) => {
  logger.error("Fatal startup error:", err);
  process.exit(1);
});
