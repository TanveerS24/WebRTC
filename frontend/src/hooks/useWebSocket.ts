"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { config } from "@/lib/config";
import type { ServerMessage, ClientMessageType, JoinRoomPayload } from "@/lib/protocol";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

export interface WsFrame {
  id: string;
  timestamp: number;
  direction: "in" | "out";
  type: string;
  payload: unknown;
  sizeBytes: number;
}

export interface UseWebSocketOptions {
  roomCode: string;
  role: "host" | "audience";
  hostToken?: string;
  clientId?: string;
  autoConnect?: boolean;
}

type MessageHandler = (payload: unknown) => void;

function createSessionClientId(roomCode: string): string {
  if (typeof window === "undefined") return "temp_client";
  const stored = sessionStorage.getItem(`seminar_client_id_${roomCode}`);
  if (stored) return stored;
  const generated = `peer_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
  sessionStorage.setItem(`seminar_client_id_${roomCode}`, generated);
  return generated;
}

export function useWebSocket({
  roomCode,
  role,
  hostToken,
  clientId: initialClientId,
  autoConnect = true,
}: UseWebSocketOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [frames, setFrames] = useState<WsFrame[]>([]);
  const [totalBytesSent, setTotalBytesSent] = useState<number>(0);
  const [totalBytesReceived, setTotalBytesReceived] = useState<number>(0);

  // Initialize unique clientId per session cleanly in state
  const [clientId] = useState<string>(() => initialClientId || createSessionClientId(roomCode));

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unmountedRef = useRef<boolean>(false);
  const subscribersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());

  // Record a frame into in-memory inspectable log
  const recordFrame = useCallback(
    (direction: "in" | "out", type: string, payload: unknown, sizeBytes: number) => {
      const frame: WsFrame = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        direction,
        type,
        payload,
        sizeBytes,
      };

      setFrames((prev) => [frame, ...prev.slice(0, 199)]); // Keep last 200 frames

      if (direction === "out") {
        setTotalBytesSent((prev) => prev + sizeBytes);
      } else {
        setTotalBytesReceived((prev) => prev + sizeBytes);
      }
    },
    []
  );

  // Send message through WebSocket
  const send = useCallback(
    (type: ClientMessageType | string, payload: unknown = {}) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const messageString = JSON.stringify({ type, payload });
        const sizeBytes = new TextEncoder().encode(messageString).length;
        socketRef.current.send(messageString);
        recordFrame("out", type, payload, sizeBytes);
        return true;
      }
      return false;
    },
    [recordFrame]
  );

  // Subscribe to typed messages
  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    if (!subscribersRef.current.has(type)) {
      subscribersRef.current.set(type, new Set());
    }
    const set = subscribersRef.current.get(type)!;
    set.add(handler);

    return () => {
      set.delete(handler);
      if (set.size === 0) {
        subscribersRef.current.delete(type);
      }
    };
  }, []);

  const clearFrames = useCallback(() => {
    setFrames([]);
  }, []);

  // Connection management
  useEffect(() => {
    if (!autoConnect || !roomCode) return;
    unmountedRef.current = false;

    function connect() {
      if (unmountedRef.current) return;

      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          // ignore
        }
        socketRef.current = null;
      }

      setConnectionState(reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting");

      try {
        const ws = new WebSocket(config.wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (unmountedRef.current) {
            ws.close();
            return;
          }
          setConnectionState("connected");
          reconnectAttemptsRef.current = 0;

          const joinPayload: JoinRoomPayload = {
            code: roomCode,
            role,
            clientId,
            hostToken: hostToken || undefined,
          };

          const messageString = JSON.stringify({ type: "join_room", payload: joinPayload });
          const sizeBytes = new TextEncoder().encode(messageString).length;
          ws.send(messageString);
          recordFrame("out", "join_room", joinPayload, sizeBytes);
        };

        ws.onmessage = (event) => {
          if (unmountedRef.current) return;
          try {
            const raw = typeof event.data === "string" ? event.data : "";
            const sizeBytes = new TextEncoder().encode(raw).length;
            const parsed = JSON.parse(raw) as ServerMessage;

            recordFrame("in", parsed.type, parsed.payload, sizeBytes);

            const handlers = subscribersRef.current.get(parsed.type);
            if (handlers) {
              handlers.forEach((h) => {
                try {
                  h(parsed.payload);
                } catch {
                  // Catch individual subscriber errors
                }
              });
            }
          } catch {
            // Ignore malformed message
          }
        };

        ws.onclose = () => {
          if (unmountedRef.current) return;
          setConnectionState("reconnecting");
          scheduleReconnect();
        };

        ws.onerror = () => {
          if (unmountedRef.current) return;
          setConnectionState("reconnecting");
        };
      } catch {
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      if (unmountedRef.current) return;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      const delay = Math.min(500 * Math.pow(1.5, reconnectAttemptsRef.current), 10000);
      reconnectAttemptsRef.current += 1;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setConnectionState("disconnected");
    };
  }, [roomCode, role, hostToken, autoConnect, clientId, recordFrame]);

  return {
    connectionState,
    clientId,
    frames,
    totalBytesSent,
    totalBytesReceived,
    send,
    subscribe,
    clearFrames,
  };
}
