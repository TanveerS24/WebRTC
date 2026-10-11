import type { ConnectionContext } from "../connection";
import type { RoomRegistry } from "../roomRegistry";
import { LatencyPingPayloadSchema } from "../../protocol/messages";

export function createLatencyHandler(registry: RoomRegistry) {
  return {
    handleLatencyPing(conn: ConnectionContext, rawPayload: unknown): void {
      const parsed = LatencyPingPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) return;

      registry.sendTo(conn, {
        type: "latency_pong",
        payload: {
          sentAt: parsed.data.sentAt,
          serverAt: Date.now(),
        },
      });
    },
  };
}
