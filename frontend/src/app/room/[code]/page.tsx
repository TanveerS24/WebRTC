"use client";

import React, { useState, useEffect, useCallback, use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Header } from "@/components/Header";
import { QrCodeModal } from "@/components/QrCodeModal";
import { FramesLog } from "@/components/FramesLog";
import { LiveDemoTab } from "@/components/LiveDemoTab";
import { LivePollTab } from "@/components/LivePollTab";
import { VideoCallTab } from "@/components/VideoCallTab";
import type {
  UpdateItem,
  JoinedPayload,
  MemberCountPayload,
  UpdatePayload,
  PollState,
  PollStatePayload,
  PollResultsPayload,
  ErrorPayload,
} from "@/lib/protocol";
import { Zap, Radio, Video, AlertTriangle, Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ code: string }>;
}

function RoomContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code;
  const searchParams = useSearchParams();

  // Pure initialization of host credentials
  const [hostToken] = useState<string | undefined>(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) return urlToken;
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`seminar_host_token_${roomCode}`);
      if (stored) return stored;
    }
    return undefined;
  });

  const [role, setRole] = useState<"host" | "audience">(() => (hostToken ? "host" : "audience"));

  // Tab State
  const [activeTab, setActiveTab] = useState<"demo" | "poll" | "webrtc">("demo");
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Room & WebSocket State
  const [memberCount, setMemberCount] = useState<number>(1);
  const [wsUpdates, setWsUpdates] = useState<UpdateItem[]>([]);
  const [activePoll, setActivePoll] = useState<PollState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    connectionState,
    clientId,
    frames,
    totalBytesSent,
    totalBytesReceived,
    send,
    subscribe,
    clearFrames,
  } = useWebSocket({
    roomCode,
    role,
    hostToken,
  });

  // Handle server WebSocket events
  useEffect(() => {
    const unsubJoined = subscribe("joined", (payload) => {
      const data = payload as JoinedPayload;
      setMemberCount(data.memberCount);
      setWsUpdates(data.history || []);
      if (data.activePoll) {
        setActivePoll(data.activePoll);
      }
      setRole(data.role);
    });

    const unsubMemberCount = subscribe("member_count", (payload) => {
      const data = payload as MemberCountPayload;
      setMemberCount(data.count);
    });

    const unsubUpdate = subscribe("update", (payload) => {
      const data = payload as UpdatePayload;
      setWsUpdates((prev) => [...prev, data]);
    });

    const unsubPollState = subscribe("poll_state", (payload) => {
      const data = payload as PollStatePayload;
      setActivePoll(data.poll);
    });

    const unsubPollResults = subscribe("poll_results", (payload) => {
      const data = payload as PollResultsPayload;
      setActivePoll((prev) => {
        if (!prev || prev.id !== data.pollId) return prev;
        return {
          ...prev,
          options: data.options,
        };
      });
    });

    const unsubError = subscribe("error", (payload) => {
      const err = payload as ErrorPayload;
      setErrorMessage(err.message);
      setTimeout(() => setErrorMessage(null), 5000);
    });

    return () => {
      unsubJoined();
      unsubMemberCount();
      unsubUpdate();
      unsubPollState();
      unsubPollResults();
      unsubError();
    };
  }, [subscribe]);

  // Host action to post update
  const handlePostUpdate = useCallback(
    (text: string) => {
      return send("post_update", { text });
    },
    [send]
  );

  // Poll actions
  const handleVote = useCallback(
    (pollId: string, optionId: string) => {
      return send("poll_vote", { pollId, optionId });
    },
    [send]
  );

  const handleCreatePoll = useCallback(
    (question: string, options: string[]) => {
      return send("poll_create", { question, options });
    },
    [send]
  );

  const handleClosePoll = useCallback(
    (pollId: string) => {
      return send("poll_close", { pollId });
    },
    [send]
  );

  return (
    <div className="min-h-screen bg-[#FBF8F3] text-[#2C221E] flex flex-col">
      {/* Top Navigation & Status Bar */}
      <Header
        roomCode={roomCode}
        role={role}
        connectionState={connectionState}
        memberCount={memberCount}
        onOpenQr={() => setIsQrOpen(true)}
      />

      {/* QR Invitation Modal */}
      <QrCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        roomCode={roomCode}
      />

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-800 shadow-xl shadow-rose-900/10 backdrop-blur-md animate-in slide-in-from-top-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E8D8CA] gap-2 mb-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("demo")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap cursor-pointer rounded-t-xl ${
              activeTab === "demo"
                ? "border-[#F97316] text-[#EA580C] bg-[#FFF2EA]/60 shadow-xs"
                : "border-transparent text-[#7A675B] hover:text-[#2B1F19] hover:border-[#DEC9B7]"
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>TAB 1: Live Demo (Polling vs WebSockets)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("poll")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap cursor-pointer rounded-t-xl ${
              activeTab === "poll"
                ? "border-[#F97316] text-[#EA580C] bg-[#FFF2EA]/60 shadow-xs"
                : "border-transparent text-[#7A675B] hover:text-[#2B1F19] hover:border-[#DEC9B7]"
            }`}
          >
            <Radio className="h-4 w-4" />
            <span>TAB 2: Live Poll (Real-time Bars)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("webrtc")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap cursor-pointer rounded-t-xl ${
              activeTab === "webrtc"
                ? "border-[#F97316] text-[#EA580C] bg-[#FFF2EA]/60 shadow-xs"
                : "border-transparent text-[#7A675B] hover:text-[#2B1F19] hover:border-[#DEC9B7]"
            }`}
          >
            <Video className="h-4 w-4" />
            <span>TAB 3: Video Call (WebRTC Benchmark)</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "demo" && (
          <LiveDemoTab
            roomCode={roomCode}
            role={role}
            wsUpdates={wsUpdates}
            onPostUpdate={handlePostUpdate}
          />
        )}

        {activeTab === "poll" && (
          <LivePollTab
            role={role}
            poll={activePoll}
            onVote={handleVote}
            onCreatePoll={handleCreatePoll}
            onClosePoll={handleClosePoll}
          />
        )}

        {activeTab === "webrtc" && (
          <VideoCallTab
            roomCode={roomCode}
            clientId={clientId}
            frames={frames}
            send={send}
            subscribe={subscribe}
          />
        )}
      </main>

      {/* Real-time WebSocket Frames Inspector Drawer */}
      <FramesLog
        frames={frames}
        totalBytesSent={totalBytesSent}
        totalBytesReceived={totalBytesReceived}
        onClear={clearFrames}
      />
    </div>
  );
}

export default function RoomPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF8F3] flex flex-col items-center justify-center text-[#7A675B] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#F97316]" />
          <p className="text-sm font-bold text-[#2B1F19]">Loading seminar room...</p>
        </div>
      }
    >
      <RoomContent params={params} />
    </Suspense>
  );
}
