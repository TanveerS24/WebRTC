import type { ConnectionContext } from "../connection";
import type { RoomRegistry } from "../roomRegistry";
import type { UpdateService } from "../../services/updateService";
import { PostUpdatePayloadSchema } from "../../protocol/messages";
import { logger } from "../../utils/logger";

// Update handler enforces host-only authorization and broadcasts new updates
export function createUpdateHandler(deps: {
  updateService: UpdateService;
  registry: RoomRegistry;
}) {
  const { updateService, registry } = deps;

  return {
    async handlePostUpdate(conn: ConnectionContext, rawPayload: unknown): Promise<void> {
      // Host authorization check
      if (conn.role !== "host" || !conn.roomCode) {
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Unauthorized: only the host can post updates", code: "UNAUTHORIZED" },
        });
        return;
      }

      const parsed = PostUpdatePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        registry.sendTo(conn, {
          type: "error",
          payload: {
            message: parsed.error.issues[0]?.message ?? "Invalid update payload",
            code: "VALIDATION_FAILED",
          },
        });
        return;
      }

      try {
        const item = await updateService.postUpdate(conn.roomCode, parsed.data.text);
        logger.info(`Update posted in room ${conn.roomCode}: id=${item.id}`);

        // Broadcast to all active sockets in the room
        registry.broadcast(conn.roomCode, {
          type: "update",
          payload: item,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "ROOM_NOT_FOUND") {
          registry.sendTo(conn, {
            type: "error",
            payload: { message: "Room not found or has expired", code: "ROOM_NOT_FOUND" },
          });
          return;
        }
        throw err;
      }
    },
  };
}
