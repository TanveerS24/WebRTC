import type { ConnectionContext } from "../connection";
import type { RoomRegistry } from "../roomRegistry";
import {
  RtcOfferPayloadSchema,
  RtcAnswerPayloadSchema,
  RtcIcePayloadSchema,
} from "../../protocol/messages";
import { logger } from "../../utils/logger";

export function createRtcHandler(registry: RoomRegistry) {
  // Map of roomCode -> Set of peerIds currently active in video call
  const activeCalls = new Map<string, Set<string>>();

  function getCallPeers(roomCode: string): Set<string> {
    let set = activeCalls.get(roomCode);
    if (!set) {
      set = new Set<string>();
      activeCalls.set(roomCode, set);
    }
    return set;
  }

  function removePeerFromCall(roomCode: string, peerId: string): void {
    const set = activeCalls.get(roomCode);
    if (set) {
      set.delete(peerId);
      if (set.size === 0) {
        activeCalls.delete(roomCode);
      }
    }
  }

  return {
    handleRtcJoin(conn: ConnectionContext): void {
      if (!conn.roomCode || !conn.peerId) {
        registry.sendTo(conn, {
          type: "error",
          payload: { message: "Must be in a room to join video call", code: "NOT_IN_ROOM" },
        });
        return;
      }

      const callPeers = getCallPeers(conn.roomCode);

      // Max 2 peers in video call: 1:1 demonstration
      if (callPeers.size >= 2 && !callPeers.has(conn.peerId)) {
        logger.warn(`Peer ${conn.peerId} rejected from full video call in room ${conn.roomCode}`);
        registry.sendTo(conn, {
          type: "rtc_full",
          payload: {},
        });
        return;
      }

      // Collect existing peers in call (excluding current peer)
      const otherPeers = Array.from(callPeers).filter((id) => id !== conn.peerId);

      // Add to call
      callPeers.add(conn.peerId);
      logger.info(`Peer ${conn.peerId} joined WebRTC call in room ${conn.roomCode} (active: ${callPeers.size})`);

      // Send existing peers list to the joining peer
      registry.sendTo(conn, {
        type: "rtc_peers",
        payload: { peers: otherPeers },
      });
    },

    handleRtcOffer(conn: ConnectionContext, rawPayload: unknown): void {
      if (!conn.roomCode || !conn.peerId) return;
      const parsed = RtcOfferPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) return;

      const target = registry.findByPeerId(conn.roomCode, parsed.data.to);
      if (target) {
        registry.sendTo(target, {
          type: "rtc_offer",
          payload: { from: conn.peerId, sdp: parsed.data.sdp },
        });
      }
    },

    handleRtcAnswer(conn: ConnectionContext, rawPayload: unknown): void {
      if (!conn.roomCode || !conn.peerId) return;
      const parsed = RtcAnswerPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) return;

      const target = registry.findByPeerId(conn.roomCode, parsed.data.to);
      if (target) {
        registry.sendTo(target, {
          type: "rtc_answer",
          payload: { from: conn.peerId, sdp: parsed.data.sdp },
        });
      }
    },

    handleRtcIce(conn: ConnectionContext, rawPayload: unknown): void {
      if (!conn.roomCode || !conn.peerId) return;
      const parsed = RtcIcePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) return;

      const target = registry.findByPeerId(conn.roomCode, parsed.data.to);
      if (target) {
        registry.sendTo(target, {
          type: "rtc_ice",
          payload: { from: conn.peerId, candidate: parsed.data.candidate },
        });
      }
    },

    handleRtcLeave(conn: ConnectionContext): void {
      if (!conn.roomCode || !conn.peerId) return;
      removePeerFromCall(conn.roomCode, conn.peerId);
      logger.info(`Peer ${conn.peerId} left WebRTC call in room ${conn.roomCode}`);

      registry.broadcast(conn.roomCode, {
        type: "rtc_peer_left",
        payload: { peerId: conn.peerId },
      });
    },

    cleanupPeer(roomCode: string, peerId: string): void {
      removePeerFromCall(roomCode, peerId);
    },
  };
}
