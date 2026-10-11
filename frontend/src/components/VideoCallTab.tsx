"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { config } from "@/lib/config";
import type { WsFrame } from "@/hooks/useWebSocket";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  Activity,
  ArrowRightLeft,
  Server,
  Network,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface VideoCallTabProps {
  roomCode: string;
  clientId: string;
  frames: WsFrame[];
  send: (type: string, payload?: unknown) => boolean;
  subscribe: (type: string, handler: (payload: unknown) => void) => () => void;
}

export function VideoCallTab({
  clientId,
  frames,
  send,
  subscribe,
}: VideoCallTabProps) {
  // Call States
  const [isInCall, setIsInCall] = useState(false);
  const [isCallFull, setIsCallFull] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);

  // Mute / Cam Toggles
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // Metrics: TrafficCompare & LatencyCompare
  const [peerMediaBytes, setPeerMediaBytes] = useState<number>(0);
  const [wsRttMs, setWsRttMs] = useState<number | null>(null);
  const [dcRttMs, setDcRttMs] = useState<number | null>(null);

  // Media & WebRTC Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // ICE Candidates queue arriving before remote description
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDescriptionRef = useRef<boolean>(false);

  // Ping tracking for RTT
  const wsPingTimestampRef = useRef<number | null>(null);
  const dcPingTimestampRef = useRef<number | null>(null);

  // Calculate total signaling bytes transferred across WebSocket frames
  const signalingBytes = frames
    .filter((f) => f.type.startsWith("rtc_") || f.type.startsWith("latency_"))
    .reduce((sum, f) => sum + f.sizeBytes, 0);

  // Clean teardown helper
  const leaveCall = useCallback(() => {
    send("rtc_leave", {});

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    pendingIceCandidatesRef.current = [];
    hasRemoteDescriptionRef.current = false;
    setRemotePeerId(null);
    setIsInCall(false);
    setIsCallFull(false);
    setDcRttMs(null);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [send]);

  // Setup PeerConnection with STUN & optional TURN
  const createPeerConnection = useCallback(
    (targetPeerId: string): RTCPeerConnection => {
      const iceServers: RTCIceServer[] = [
        { urls: "stun:stun.l.google.com:19302" },
      ];

      if (config.turnUrl) {
        iceServers.push({
          urls: config.turnUrl,
          username: config.turnUsername,
          credential: config.turnCredential,
        });
      }

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      hasRemoteDescriptionRef.current = false;
      pendingIceCandidatesRef.current = [];

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send("rtc_ice", {
            to: targetPeerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      const setupDataChannelHandlers = (dc: RTCDataChannel) => {
        dc.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "dc_ping") {
              dc.send(JSON.stringify({ type: "dc_pong", sentAt: data.sentAt }));
            } else if (data.type === "dc_pong") {
              const rtt = Date.now() - (data.sentAt as number);
              setDcRttMs(rtt);
            }
          } catch {
            // ignore
          }
        };
      };

      const dc = pc.createDataChannel("latency_channel");
      dataChannelRef.current = dc;
      setupDataChannelHandlers(dc);

      pc.ondatachannel = (event) => {
        dataChannelRef.current = event.channel;
        setupDataChannelHandlers(event.channel);
      };

      return pc;
    },
    [send]
  );

  const startCall = async () => {
    setMediaError(null);
    setIsCallFull(false);

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setMediaError(
        "Camera and microphone require a Secure Context (HTTPS or localhost). Please run via HTTPS or tunneling."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsInCall(true);
      send("rtc_join", {});
    } catch (err: unknown) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setMediaError("Permission denied: Please allow camera and microphone access in your browser.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setMediaError("No camera or microphone found on this device.");
        } else {
          setMediaError(`Media device error: ${err.message}`);
        }
      } else {
        setMediaError("Failed to initialize camera or microphone.");
      }
    }
  };

  const flushPendingIceCandidates = async (pc: RTCPeerConnection) => {
    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // ignore
        }
      }
    }
  };

  useEffect(() => {
    const unsubPeers = subscribe("rtc_peers", async (payload) => {
      const { peers } = payload as { peers: string[] };
      const target = peers[0];
      if (!target) return;

      setRemotePeerId(target);
      const pc = createPeerConnection(target);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send("rtc_offer", { to: target, sdp: offer });
      } catch {
        // ignore
      }
    });

    const unsubOffer = subscribe("rtc_offer", async (payload) => {
      const { from, sdp } = payload as { from: string; sdp: RTCSessionDescriptionInit };
      setRemotePeerId(from);
      const pc = pcRef.current || createPeerConnection(from);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        hasRemoteDescriptionRef.current = true;
        await flushPendingIceCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send("rtc_answer", { to: from, sdp: answer });
      } catch {
        // ignore
      }
    });

    const unsubAnswer = subscribe("rtc_answer", async (payload) => {
      const { sdp } = payload as { from: string; sdp: RTCSessionDescriptionInit };
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          hasRemoteDescriptionRef.current = true;
          await flushPendingIceCandidates(pcRef.current);
        } catch {
          // ignore
        }
      }
    });

    const unsubIce = subscribe("rtc_ice", async (payload) => {
      const { candidate } = payload as { from: string; candidate: RTCIceCandidateInit };
      if (!candidate) return;

      if (pcRef.current && hasRemoteDescriptionRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // ignore
        }
      } else {
        pendingIceCandidatesRef.current.push(candidate);
      }
    });

    const unsubPeerLeft = subscribe("rtc_peer_left", (payload) => {
      const { peerId } = payload as { peerId: string };
      if (peerId === remotePeerId) {
        setRemotePeerId(null);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      }
    });

    const unsubFull = subscribe("rtc_full", () => {
      setIsCallFull(true);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setIsInCall(false);
    });

    const unsubPong = subscribe("latency_pong", (payload) => {
      const { sentAt } = payload as { sentAt: number };
      const rtt = Date.now() - sentAt;
      setWsRttMs(rtt);
    });

    return () => {
      unsubPeers();
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubPeerLeft();
      unsubFull();
      unsubPong();
    };
  }, [createPeerConnection, remotePeerId, send, subscribe]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (pcRef.current) {
        try {
          const stats = await pcRef.current.getStats();
          let totalBytes = 0;
          stats.forEach((report) => {
            if (report.type === "inbound-rtp" || report.type === "outbound-rtp") {
              const bytes = (report.bytesReceived as number) || (report.bytesSent as number) || 0;
              totalBytes += bytes;
            }
          });
          if (totalBytes > 0) {
            setPeerMediaBytes(totalBytes);
          }
        } catch {
          // ignore
        }
      }

      const now = Date.now();
      wsPingTimestampRef.current = now;
      send("latency_ping", { sentAt: now });

      if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
        dcPingTimestampRef.current = now;
        try {
          dataChannelRef.current.send(JSON.stringify({ type: "dc_ping", sentAt: now }));
        } catch {
          // ignore
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [send]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Seminar Concept Header */}
      <div className="rounded-3xl border border-[#F0DDD0] bg-white/90 p-5 sm:p-7 shadow-lg shadow-[#D8B49C]/10 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#2B1F19] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F97316]" />
              WebRTC Video Call: Peer-to-Peer Media & Live Benchmark
            </h2>
            <p className="mt-1.5 text-xs text-[#6B5A50] leading-relaxed">
              WebSockets handle the lightweight signaling (SDP offers/answers and ICE candidate exchange). Once negotiated,
              high-bandwidth audio/video flows <span className="text-[#EA580C] font-bold">directly peer-to-peer</span>, bypassing the server completely.
            </p>
          </div>

          {!isInCall ? (
            <button
              type="button"
              onClick={startCall}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#FB923C] hover:from-[#EA580C] hover:to-[#F97316] px-6 py-3 text-xs font-bold text-white shadow-lg shadow-[#F97316]/25 hover:-translate-y-0.5 transition-all shrink-0 cursor-pointer"
            >
              <PhoneCall className="h-4 w-4" />
              <span>Join Video Call</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={leaveCall}
              className="flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:-translate-y-0.5 transition-all shrink-0 cursor-pointer"
            >
              <PhoneOff className="h-4 w-4" />
              <span>Leave Call</span>
            </button>
          )}
        </div>

        {/* Errors & Full Notifications */}
        {mediaError && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{mediaError}</span>
          </div>
        )}

        {isCallFull && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              The video call is currently full (max 2 participants for the 1:1 demonstration). Please wait for a participant to leave.
            </span>
          </div>
        )}
      </div>

      {/* Video Streams Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Local Video Stream */}
        <div className="relative aspect-video rounded-3xl border-2 border-[#E7D6C8] bg-[#2B1F19] overflow-hidden shadow-xl flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover -scale-x-100 ${!isInCall || isVideoMuted ? "hidden" : "block"}`}
          />

          {(!isInCall || isVideoMuted) && (
            <div className="flex flex-col items-center justify-center text-[#D8B49C]">
              <VideoOff className="h-12 w-12 mb-2 stroke-[1.5]" />
              <p className="text-xs">{isInCall ? "Camera is muted" : "Camera off (Click 'Join Video Call')"}</p>
            </div>
          )}

          <div className="absolute top-4 left-4 rounded-xl bg-black/60 backdrop-blur-md px-3 py-1.5 text-[11px] font-bold text-white border border-white/20">
            You ({clientId.slice(0, 10)})
          </div>

          {/* In-Call Media Controls Overlay */}
          {isInCall && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-black/75 backdrop-blur-md px-4 py-2 border border-white/20">
              <button
                type="button"
                onClick={toggleAudio}
                className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                  isAudioMuted ? "bg-rose-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
                }`}
                title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                  isVideoMuted ? "bg-rose-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
                }`}
                title={isVideoMuted ? "Turn Video On" : "Turn Video Off"}
              >
                {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Remote Video Stream */}
        <div className="relative aspect-video rounded-3xl border-2 border-[#E7D6C8] bg-[#2B1F19] overflow-hidden shadow-xl flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-cover ${!remotePeerId ? "hidden" : "block"}`}
          />

          {!remotePeerId && (
            <div className="flex flex-col items-center justify-center text-center p-6 text-[#D8B49C]">
              <Network className="h-12 w-12 mb-2 stroke-[1.5]" />
              <p className="text-xs font-bold text-white">Waiting for peer connection...</p>
              <p className="mt-1 text-[11px] text-[#A8988C] max-w-xs">
                Open a second browser tab or scan the QR on mobile and join the call to establish P2P media.
              </p>
            </div>
          )}

          {remotePeerId && (
            <div className="absolute top-4 left-4 rounded-xl bg-black/60 backdrop-blur-md px-3 py-1.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Remote Peer ({remotePeerId.slice(0, 10)})</span>
            </div>
          )}
        </div>
      </div>

      {/* TrafficCompare & LatencyCompare Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. TrafficCompare */}
        <div className="rounded-3xl border border-[#F0DDD0] bg-white/90 p-6 shadow-md shadow-[#D8B49C]/10">
          <div className="flex items-center gap-2 pb-3.5 border-b border-[#F2E2D5]">
            <Activity className="h-5 w-5 text-[#EA580C]" />
            <h3 className="font-bold text-sm text-[#2B1F19]">TrafficCompare Benchmark</h3>
          </div>

          <p className="mt-2.5 text-xs text-[#6B5A50] leading-normal">
            Notice how our server bandwidth stays flat after the initial SDP/ICE exchange, while
            direct peer-to-peer media throughput climbs continuously!
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3.5">
            <div className="rounded-2xl border border-[#EADBCC] bg-[#FFFBF7] p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-[#7A675B] text-xs mb-1 font-semibold">
                <Server className="h-4 w-4 text-[#C2410C]" />
                <span>Server Signaling</span>
              </div>
              <div className="font-mono text-xl font-black text-[#2B1F19]">{formatBytes(signalingBytes)}</div>
              <div className="text-[10px] text-[#9C8273] mt-1">Through backend WebSocket</div>
            </div>

            <div className="rounded-2xl border-2 border-[#FED7AA] bg-[#FFF2EA] p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-[#EA580C] text-xs mb-1 font-bold">
                <ArrowRightLeft className="h-4 w-4 text-[#EA580C]" />
                <span>Peer Connection</span>
              </div>
              <div className="font-mono text-xl font-black text-[#9A3412]">{formatBytes(peerMediaBytes)}</div>
              <div className="text-[10px] text-[#C2410C] mt-1">Direct via RTCPeerConnection</div>
            </div>
          </div>
        </div>

        {/* 2. LatencyCompare */}
        <div className="rounded-3xl border border-[#F0DDD0] bg-white/90 p-6 shadow-md shadow-[#D8B49C]/10">
          <div className="flex items-center gap-2 pb-3.5 border-b border-[#F2E2D5]">
            <ArrowRightLeft className="h-5 w-5 text-[#D97706]" />
            <h3 className="font-bold text-sm text-[#2B1F19]">LatencyCompare (Round-Trip Time)</h3>
          </div>

          <p className="mt-2.5 text-xs text-[#6B5A50] leading-normal">
            Side-by-side RTT benchmark comparing round-trip time passing through the central server vs direct
            RTCDataChannel peer transport (measured every 2 seconds).
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3.5">
            <div className="rounded-2xl border border-[#EADBCC] bg-[#FFFBF7] p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-[#7A675B] text-xs mb-1 font-semibold">
                <Server className="h-4 w-4 text-[#D97706]" />
                <span>WebSocket RTT</span>
              </div>
              <div className="font-mono text-xl font-black text-[#2B1F19]">
                {wsRttMs !== null ? `${wsRttMs} ms` : "--"}
              </div>
              <div className="text-[10px] text-[#9C8273] mt-1">Via central server relay</div>
            </div>

            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs mb-1 font-bold">
                <Network className="h-4 w-4 text-emerald-600" />
                <span>RTCDataChannel RTT</span>
              </div>
              <div className="font-mono text-xl font-black text-emerald-900">
                {dcRttMs !== null ? `${dcRttMs} ms` : "--"}
              </div>
              <div className="text-[10px] text-emerald-700 mt-1">Direct peer-to-peer data channel</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
