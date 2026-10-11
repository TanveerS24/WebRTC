import type { ConnectionContext } from "../connection";
import type { RoomRegistry } from "../roomRegistry";
import type { PollService } from "../../services/pollService";
import {
  PollCreatePayloadSchema,
  PollVotePayloadSchema,
  PollClosePayloadSchema,
} from "../../protocol/messages";
import { logger } from "../../utils/logger";

export function createPollHandler(deps: {
  pollService: PollService;
  registry: RoomRegistry;
}) {
  const { pollService, registry } = deps;

  return {
    async handlePollCreate(conn: ConnectionContext, rawPayload: unknown): Promise<void> {
      if (conn.role !== "host" || !conn.roomCode) {
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Unauthorized: only host can create polls", code: "UNAUTHORIZED" },
        });
        return;
      }

      const parsed = PollCreatePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        registry.sendTo(conn, {
          type: "error",
          payload: {
            message: parsed.error.issues[0]?.message ?? "Invalid poll create payload",
            code: "VALIDATION_FAILED",
          },
        });
        return;
      }

      try {
        const poll = await pollService.createPoll(
          conn.roomCode,
          parsed.data.question,
          parsed.data.options
        );

        logger.info(`Poll created in room ${conn.roomCode}: ${poll.id}`);

        // Broadcast new poll state to everyone in the room
        registry.broadcast(conn.roomCode, {
          type: "poll_state",
          payload: { poll },
        });
      } catch (err: unknown) {
        logger.error("Error creating poll:", err);
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Failed to create poll", code: "INTERNAL_ERROR" },
        });
      }
    },

    async handlePollVote(conn: ConnectionContext, rawPayload: unknown): Promise<void> {
      if (!conn.roomCode || !conn.clientId) {
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Must be joined in a room to vote", code: "NOT_JOINED" },
        });
        return;
      }

      const parsed = PollVotePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        registry.sendTo(conn, {
          type: "error",
          payload: {
            message: parsed.error.issues[0]?.message ?? "Invalid poll vote payload",
            code: "VALIDATION_FAILED",
          },
        });
        return;
      }

      try {
        const result = await pollService.recordVote(
          parsed.data.pollId,
          conn.clientId,
          parsed.data.optionId
        );

        logger.info(`Vote recorded on poll ${parsed.data.pollId} by ${conn.clientId}`);

        // Broadcast updated results to everyone in the room
        registry.broadcast(conn.roomCode, {
          type: "poll_results",
          payload: {
            pollId: parsed.data.pollId,
            options: result.options,
            total: result.total,
          },
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message === "ALREADY_VOTED") {
            registry.sendTo(conn, {
              type: "error",
              payload: { message: "You have already voted on this poll", code: "ALREADY_VOTED" },
            });
            return;
          }
          if (err.message === "POLL_CLOSED") {
            registry.sendTo(conn, {
              type: "error",
              payload: { message: "This poll is now closed", code: "POLL_CLOSED" },
            });
            return;
          }
        }
        logger.error("Vote failed:", err);
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Failed to record vote", code: "VOTE_FAILED" },
        });
      }
    },

    async handlePollClose(conn: ConnectionContext, rawPayload: unknown): Promise<void> {
      if (conn.role !== "host" || !conn.roomCode) {
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Unauthorized: only host can close polls", code: "UNAUTHORIZED" },
        });
        return;
      }

      const parsed = PollClosePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        registry.sendTo(conn, {
          type: "error",
          payload: {
            message: parsed.error.issues[0]?.message ?? "Invalid poll close payload",
            code: "VALIDATION_FAILED",
          },
        });
        return;
      }

      try {
        const closed = await pollService.closePoll(parsed.data.pollId);
        logger.info(`Poll ${parsed.data.pollId} closed in room ${conn.roomCode}`);

        registry.broadcast(conn.roomCode, {
          type: "poll_state",
          payload: { poll: closed },
        });
      } catch (err: unknown) {
        logger.error("Close poll failed:", err);
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Failed to close poll", code: "CLOSE_FAILED" },
        });
      }
    },
  };
}
