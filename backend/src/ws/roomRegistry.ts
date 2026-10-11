import { WebSocket } from "ws";
import type { ConnectionContext } from "./connection";
import type { ServerMessage } from "../protocol/messages";
import { logger } from "../utils/logger";

export interface RoomRegistry {
  join(roomCode: string, conn: ConnectionContext): void;
  leave(conn: ConnectionContext): string | null;
  getMembers(roomCode: string): ConnectionContext[];
  getMemberCount(roomCode: string): number;
  broadcast(roomCode: string, message: ServerMessage, excludeConnId?: string): void;
  sendTo(conn: ConnectionContext, message: ServerMessage): void;
  findByPeerId(roomCode: string, peerId: string): ConnectionContext | undefined;
}

// In-memory room registry tracking room memberships and message dispatch
export function createRoomRegistry(): RoomRegistry {
  const rooms = new Map<string, Set<ConnectionContext>>();

  function sendTo(conn: ConnectionContext, message: ServerMessage): void {
    if (conn.socket.readyState === WebSocket.OPEN) {
      try {
        conn.socket.send(JSON.stringify(message));
      } catch (err) {
        logger.error(`Failed to send message to connection ${conn.id}:`, err);
      }
    }
  }

  return {
    join(roomCode: string, conn: ConnectionContext): void {
      let room = rooms.get(roomCode);
      if (!room) {
        room = new Set<ConnectionContext>();
        rooms.set(roomCode, room);
      }
      room.add(conn);
      conn.roomCode = roomCode;
    },

    leave(conn: ConnectionContext): string | null {
      const code = conn.roomCode;
      if (!code) return null;
      const room = rooms.get(code);
      if (room) {
        room.delete(conn);
        if (room.size === 0) {
          rooms.delete(code);
        }
      }
      conn.roomCode = null;
      return code;
    },

    getMembers(roomCode: string): ConnectionContext[] {
      const room = rooms.get(roomCode);
      return room ? Array.from(room) : [];
    },

    getMemberCount(roomCode: string): number {
      return rooms.get(roomCode)?.size ?? 0;
    },

    broadcast(roomCode: string, message: ServerMessage, excludeConnId?: string): void {
      const members = rooms.get(roomCode);
      if (!members) return;
      for (const member of members) {
        if (excludeConnId && member.id === excludeConnId) continue;
        sendTo(member, message);
      }
    },

    sendTo,

    findByPeerId(roomCode: string, peerId: string): ConnectionContext | undefined {
      const members = rooms.get(roomCode);
      if (!members) return undefined;
      for (const m of members) {
        if (m.peerId === peerId || m.clientId === peerId) return m;
      }
      return undefined;
    },
  };
}
