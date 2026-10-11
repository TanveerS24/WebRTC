"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";
import {
  Sparkles,
  Radio,
  Video,
  ArrowRight,
  Shield,
  Users,
  Zap,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  // Host state
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Audience state
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Handle Host room creation
  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    setCreateError(null);
    try {
      const res = await fetch(`${config.apiUrl}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error("Failed to create room. Server returned " + res.status);
      }

      const data = (await res.json()) as { code: string; hostToken: string };
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`seminar_host_token_${data.code}`, data.hostToken);
      }
      router.push(`/room/${data.code}?token=${encodeURIComponent(data.hostToken)}`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Error connecting to backend");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Handle Audience room joining
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCodeInput.trim();
    if (!/^\d{4}$/.test(cleanCode)) {
      setJoinError("Please enter a valid 4-digit room code");
      return;
    }

    setIsJoiningRoom(true);
    setJoinError(null);
    try {
      const res = await fetch(`${config.apiUrl}/api/rooms/${cleanCode}`);
      if (!res.ok) {
        throw new Error("Unable to reach seminar server");
      }
      const data = (await res.json()) as { exists: boolean };
      if (!data.exists) {
        setJoinError(`Room ${cleanCode} does not exist or has expired`);
        return;
      }

      router.push(`/room/${cleanCode}`);
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : "Error connecting to server");
    } finally {
      setIsJoiningRoom(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8F3] text-[#2C221E] relative overflow-hidden">
      {/* Warm Peach & Ivory Background Radiance */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-100 w-200 rounded-full bg-gradient-to-b from-[#FFE3D3] via-[#FFEDE1] to-transparent opacity-80 blur-[100px]" />
        <div className="absolute top-1/3 -left-32 h-80 w-120 rounded-full bg-[#FFEADC] opacity-70 blur-[90px]" />
        <div className="absolute bottom-10 right-0 h-96 w-120 rounded-full bg-[#FFF2E8] opacity-80 blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        {/* Ivory Peach Seminar Badge & Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FED7AA] bg-[#FFF5EE] px-4 py-1.5 text-xs font-semibold text-[#C2410C] shadow-sm mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[#F97316]" />
            <span>Interactive Real-Time Architecture Seminar</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#2B1F19] leading-[1.15]">
            WebSockets vs{" "}
            <span className="bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#FB923C] bg-clip-text text-transparent">
              WebRTC
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-[#6B5A50] max-w-2xl mx-auto leading-relaxed">
            A live technical benchmark dissecting real-time protocols:
            traditional <span className="font-semibold text-[#2B1F19]">HTTP Polling</span> vs persistent{" "}
            <span className="font-semibold text-[#C2410C]">WebSockets</span> vs direct peer-to-peer{" "}
            <span className="font-semibold text-[#D97706]">WebRTC</span> media streams.
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Card 1: Host Room */}
          <div className="relative flex flex-col justify-between rounded-3xl border border-[#F0DFD1] bg-white/90 p-7 sm:p-9 shadow-xl shadow-[#D8B49C]/10 backdrop-blur-sm transition-all hover:border-[#FDBA74] hover:shadow-2xl hover:shadow-[#F97316]/10">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF2EA] text-[#EA580C] border border-[#FFDEC9] shadow-inner mb-6">
                <Shield className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold text-[#2B1F19]">Presenter / Host</h2>
              <p className="mt-3 text-sm text-[#6B5A50] leading-relaxed">
                Start a live session with an auto-generated 4-digit code. Display the audience QR invitation, broadcast live updates, launch real-time polls, and host 1:1 WebRTC video calls.
              </p>
            </div>

            <div className="mt-8">
              {createError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={isCreatingRoom}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#FB923C] hover:from-[#EA580C] hover:to-[#F97316] text-white px-6 py-4 text-sm font-bold shadow-lg shadow-[#F97316]/25 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
              >
                {isCreatingRoom ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Allocating Room...</span>
                  </>
                ) : (
                  <>
                    <span>Create Seminar Room</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Join as Audience */}
          <div className="relative flex flex-col justify-between rounded-3xl border border-[#F0DFD1] bg-[#FFFCF8]/95 p-7 sm:p-9 shadow-xl shadow-[#D8B49C]/10 backdrop-blur-sm transition-all hover:border-[#FDBA74] hover:shadow-2xl hover:shadow-[#F97316]/10">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF6EE] text-[#D97706] border border-[#FDE68A] shadow-inner mb-6">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold text-[#2B1F19]">Audience Participant</h2>
              <p className="mt-3 text-sm text-[#6B5A50] leading-relaxed">
                Join an active seminar session using the 4-digit code shown on the presenter&apos;s screen or scanned from their mobile QR code invite.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="mt-8">
              {joinError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="text"
                  maxLength={4}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="Code"
                  className="w-36 text-center tracking-widest font-mono text-lg font-bold rounded-2xl border-2 border-[#E7D6C7] bg-white px-3 py-3.5 text-[#2B1F19] placeholder-[#A8988C] focus:border-[#F97316] focus:outline-none focus:ring-4 focus:ring-[#F97316]/15 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={roomCodeInput.length !== 4 || isJoiningRoom}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#3D2C24] hover:bg-[#2B1F19] text-[#FFF7ED] px-6 py-3.5 text-sm font-bold shadow-lg shadow-[#3D2C24]/15 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {isJoiningRoom ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <span>Join Room</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Seminar Technical Modules Showcase */}
        <div className="mt-20">
          <div className="text-center mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#9C8273]">
              Three Architectural Modules Demonstrated
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[#F2E2D5] bg-white/70 p-6 shadow-md shadow-[#D8B49C]/5 hover:border-[#FDBA74] transition-all">
              <div className="flex items-center gap-3 text-[#EA580C] mb-3">
                <div className="p-2.5 rounded-xl bg-[#FFF2EA] border border-[#FFD8C7]">
                  <Zap className="h-5 w-5 text-[#EA580C]" />
                </div>
                <h4 className="font-bold text-base text-[#2B1F19]">1. Polling vs WebSockets</h4>
              </div>
              <p className="text-xs text-[#6B5A50] leading-relaxed">
                Side-by-side benchmark contrasting stale HTTP request-response polling with persistent, sub-millisecond WebSocket frame broadcasts.
              </p>
            </div>

            <div className="rounded-2xl border border-[#F2E2D5] bg-white/70 p-6 shadow-md shadow-[#D8B49C]/5 hover:border-[#FDBA74] transition-all">
              <div className="flex items-center gap-3 text-[#D97706] mb-3">
                <div className="p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
                  <Radio className="h-5 w-5 text-[#D97706]" />
                </div>
                <h4 className="font-bold text-base text-[#2B1F19]">2. Live Interactive Poll</h4>
              </div>
              <p className="text-xs text-[#6B5A50] leading-relaxed">
                Instant multi-device voting with animated percentage bars and client vote deduplication enforced via compound database constraints.
              </p>
            </div>

            <div className="rounded-2xl border border-[#F2E2D5] bg-white/70 p-6 shadow-md shadow-[#D8B49C]/5 hover:border-[#FDBA74] transition-all">
              <div className="flex items-center gap-3 text-[#B45309] mb-3">
                <div className="p-2.5 rounded-xl bg-[#FFF7ED] border border-[#FED7AA]">
                  <Video className="h-5 w-5 text-[#B45309]" />
                </div>
                <h4 className="font-bold text-base text-[#2B1F19]">3. WebRTC Video Call</h4>
              </div>
              <p className="text-xs text-[#6B5A50] leading-relaxed">
                Direct browser-to-browser media streaming with live comparison of server signaling bytes vs direct P2P media throughput and RTT latency.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
