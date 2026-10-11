import type { ConnectionContext } from "../connection";
import type { RoomRegistry } from "../roomRegistry";
import type { RoomService } from "../../services/roomService";
import type { PollService } from "../../services/pollService";
import { JoinRoomPayloadSchema } from "../../protocol/messages";
import { logger } from "../../utils/logger";

// Room handler verifies credentials, updates socket context, and joins room
export function createRoomHandler(deps: {
  roomService: RoomService;
  pollService?: PollService;
  registry: RoomRegistry;
}) {
  const { roomService, pollService, registry } = deps;

  return {
    async handleJoinRoom(conn: ConnectionContext, rawPayload: unknown): Promise<void> {
      const parsed = JoinRoomPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        registry.sendTo(conn, {
          type: "error",
          payload: {
            message: parsed.error.issues[0]?.message ?? "Invalid join_room payload",
            code: "VALIDATION_FAILED",
          },
        });
        return;
      }

      const { code, role: claimedRole, clientId, hostToken } = parsed.data;

      // Ensure room exists in database
      const exists = await roomService.roomExists(code);
      if (!exists) {
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Room not found or has expired", code: "ROOM_NOT_FOUND" },
        });
        return;
      }

      // Verify host authority: never trust client's claimed role
      let verifiedRole: "host" | "audience" = "audience";
      if (claimedRole === "host") {
        const isVerified = await roomService.verifyHost(code, hostToken);
        if (!isVerified) {
          registry.sendTo(conn, {
            type: "error",
            payload: { message: "Invalid host credentials", code: "UNAUTHORIZED_HOST" },
          });
          return;
        }
        verifiedRole = "host";
      }

      // If client was previously registered in another room, leave it first
      if (conn.roomCode && conn.roomCode !== code) {
        const previousRoom = registry.leave(conn);
        if (previousRoom) {
          registry.broadcast(previousRoom, {
            type: "member_count",
            payload: { count: registry.getMemberCount(previousRoom) },
          });
        }
      }

      // Attach session context to socket
      conn.roomCode = code;
      conn.role = verifiedRole;
      conn.clientId = clientId;
      conn.peerId = clientId;

      registry.join(code, conn);

      // Fetch update history and updated participant count
      const history = await roomService.getRoomHistory(code);
      const memberCount = registry.getMemberCount(code);
      const activePoll = pollService ? await pollService.getActivePoll(code) : null;

      logger.info(`Client ${clientId} joined room ${code} as ${verifiedRole} (total: ${memberCount})`);

      // Acknowledge join to current connection
      registry.sendTo(conn, {
        type: "joined",
        payload: {
          code,
          role: verifiedRole,
          peerId: clientId,
          history,
          activePoll,
          memberCount,
        },
      });

      // Broadcast updated member count to everyone in the room
      registry.broadcast(code, {
        type: "member_count",
        payload: { count: memberCount },
      });
    },
  };
}
