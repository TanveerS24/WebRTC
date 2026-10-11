import type { RawData } from "ws";
import type { ConnectionContext } from "./connection";
import type { RoomRegistry } from "./roomRegistry";
import { ClientEnvelopeSchema } from "../protocol/messages";
import { logger } from "../utils/logger";

export type WsHandler = (conn: ConnectionContext, payload: unknown) => Promise<void> | void;

export type HandlerMap = Record<string, WsHandler>;

export interface WsRouter {
  handleMessage(conn: ConnectionContext, rawData: RawData): Promise<void>;
}

// Routes incoming WebSocket messages by type, validating envelope and rate limits
export function createRouter(handlers: HandlerMap, registry: RoomRegistry): WsRouter {
  return {
    async handleMessage(conn: ConnectionContext, rawData: RawData): Promise<void> {
      // 1. Enforce per-socket token bucket rate limiter
      if (!conn.rateLimiter.consume()) {
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Rate limit exceeded. Please slow down.", code: "RATE_LIMITED" },
        });
        return;
      }

      // 2. Decode raw WebSocket payload into text
      const text = typeof rawData === "string" ? rawData : rawData.toString("utf8");

      // 3. Parse JSON safely without crashing process
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(text);
      } catch {
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Invalid JSON format", code: "INVALID_JSON" },
        });
        return;
      }

      // 4. Validate envelope structure { type, payload }
      const envelope = ClientEnvelopeSchema.safeParse(parsedJson);
      if (!envelope.success) {
        registry.sendTo(conn, {
          type: "error",
          payload: {
            message: `Envelope validation failed: ${envelope.error.issues[0]?.message ?? "unknown"}`,
            code: "INVALID_ENVELOPE",
          },
        });
        return;
      }

      const { type, payload } = envelope.data;
      const handler = handlers[type];
      if (!handler) {
        registry.sendTo(conn, {
          type: "error",
          payload: { message: `Unknown message type: "${type}"`, code: "UNKNOWN_TYPE" },
        });
        return;
      }

      // 5. Execute handler wrapped in try/catch to guarantee process resilience
      try {
        await handler(conn, payload);
      } catch (err: unknown) {
        logger.error(`Handler error for message type "${type}":`, err);
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Internal server error occurred while handling message", code: "INTERNAL_ERROR" },
        });
      }
    },
  };
}
