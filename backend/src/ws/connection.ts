import type { WebSocket } from "ws";
import { randomUUID } from "crypto";
import { createTokenBucket, type TokenBucket } from "./rateLimit";

export type ConnectionRole = "host" | "audience";

export interface ConnectionContext {
  readonly id: string;
  roomCode: string | null;
  role: ConnectionRole | null;
  clientId: string | null;
  peerId: string | null;
  socket: WebSocket;
  isAlive: boolean;
  rateLimiter: TokenBucket;
}

// Builds connection context wrapper holding metadata and rate limiter
export function createConnectionContext(socket: WebSocket): ConnectionContext {
  return {
    id: randomUUID(),
    roomCode: null,
    role: null,
    clientId: null,
    peerId: null,
    socket,
    isAlive: true,
    rateLimiter: createTokenBucket(20, 40),
  };
}
