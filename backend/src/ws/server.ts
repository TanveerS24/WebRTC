import type { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createConnectionContext } from "./connection";
import type { WsRouter } from "./router";
import type { RoomRegistry } from "./roomRegistry";
import { logger } from "../utils/logger";

export interface WsServerInstance {
  wss: WebSocketServer;
  close(): Promise<void>;
}

// Attaches WebSocketServer to the HTTP server at /ws with heartbeat and cleanup
export function createWsServer(deps: {
  httpServer: HttpServer;
  router: WsRouter;
  registry: RoomRegistry;
}): WsServerInstance {
  const { httpServer, router, registry } = deps;

  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    maxPayload: 64 * 1024, // 64KB envelope limit (allows large SDP payloads)
  });

  // Heartbeat: 30-second interval to terminate sockets that fail to reply with pong
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as WebSocket & { isAlive?: boolean };
      if (client.isAlive === false) {
        logger.warn("Terminating dead socket connection missing heartbeat pong");
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on("connection", (socket: WebSocket) => {
    const conn = createConnectionContext(socket);
    const rawWs = socket as WebSocket & { isAlive?: boolean };
    rawWs.isAlive = true;

    socket.on("pong", () => {
      rawWs.isAlive = true;
      conn.isAlive = true;
    });

    socket.on("message", (data) => {
      void router.handleMessage(conn, data);
    });

    socket.on("close", () => {
      const roomCode = registry.leave(conn);
      if (roomCode) {
        const count = registry.getMemberCount(roomCode);
        registry.broadcast(roomCode, {
          type: "member_count",
          payload: { count },
        });

        if (conn.peerId) {
          registry.broadcast(roomCode, {
            type: "rtc_peer_left",
            payload: { peerId: conn.peerId },
          });
        }
      }
    });

    socket.on("error", (err) => {
      logger.error(`WebSocket connection error (${conn.id}):`, err);
    });
  });

  return {
    wss,
    async close(): Promise<void> {
      clearInterval(heartbeatInterval);
      return new Promise<void>((resolve, reject) => {
        wss.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}
