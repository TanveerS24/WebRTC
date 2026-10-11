import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { createHealthRouter } from "./http/routes/health.routes";
import { createRoomsRouter } from "./http/routes/rooms.routes";
import { notFoundMiddleware } from "./http/middleware/notFound";
import { errorHandlerMiddleware } from "./http/middleware/errorHandler";
import type { RoomService } from "./services/roomService";
import type { UpdateService } from "./services/updateService";

export interface AppDependencies {
  roomService: RoomService;
  updateService: UpdateService;
  clientOrigin: string;
}

// Builds Express application with helmet security headers and CORS protection
export function createApp(deps: AppDependencies): Application {
  const app = express();
  const { roomService, updateService, clientOrigin } = deps;

  // Supports comma-separated list of allowed origins
  const allowedOrigins = clientOrigin.split(",").map((s) => s.trim());

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Permit requests without origin (like curl, health probes, or local scripts)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          callback(null, true);
        } else {
          callback(new Error("CORS policy violation: origin not allowed"));
        }
      },
      credentials: true,
    })
  );
  app.use(express.json());

  // Mount API endpoints
  app.use("/health", createHealthRouter());
  app.use("/api/rooms", createRoomsRouter({ roomService, updateService }));

  // Fallback 404 & error handlers
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
