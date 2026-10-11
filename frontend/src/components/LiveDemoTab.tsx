"use client";

import React, { useState, useEffect, useCallback } from "react";
import { config } from "@/lib/config";
import type { UpdateItem } from "@/lib/protocol";
import { RefreshCw, Send, Zap, Clock, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

interface LiveDemoTabProps {
  roomCode: string;
  role: "host" | "audience";
  wsUpdates: UpdateItem[];
  onPostUpdate: (text: string) => boolean;
}

export function LiveDemoTab({
  roomCode,
  role,
  wsUpdates,
  onPostUpdate,
}: LiveDemoTabProps) {
  // HTTP Polling state (Without WebSockets)
  const [httpUpdates, setHttpUpdates] = useState<UpdateItem[]>([]);
  const [isFetchingHttp, setIsFetchingHttp] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(0);
  const [secondsSinceFetch, setSecondsSinceFetch] = useState<number>(0);

  // Host input state
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch updates via HTTP Polling
  const fetchHttpUpdates = useCallback(async () => {
    setIsFetchingHttp(true);
    try {
      const res = await fetch(`${config.apiUrl}/api/rooms/${roomCode}/updates`);
      if (res.ok) {
        const data = (await res.json()) as { updates: UpdateItem[] };
        setHttpUpdates(data.updates);
        setLastFetchedAt(Date.now());
        setSecondsSinceFetch(0);
      }
    } catch {
      // ignore
    } finally {
      setIsFetchingHttp(false);
    }
  }, [roomCode]);

  // Initial fetch on mount
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`${config.apiUrl}/api/rooms/${roomCode}/updates`);
        if (!ignore && res.ok) {
          const data = (await res.json()) as { updates: UpdateItem[] };
          setHttpUpdates(data.updates);
          setLastFetchedAt(Date.now());
        }
      } catch {
        // ignore
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [roomCode]);

  // Seconds counter for HTTP staleness indicator
  useEffect(() => {
    if (!lastFetchedAt) return;
    const interval = setInterval(() => {
      setSecondsSinceFetch(Math.floor((Date.now() - lastFetchedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastFetchedAt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const sent = onPostUpdate(inputText.trim());
    if (sent) {
      setInputText("");
    }
    setIsSubmitting(false);
  };

  const latestWsId = wsUpdates.length > 0 ? wsUpdates[wsUpdates.length - 1]?.id : null;

  return (
    <div className="space-y-6">
      {/* Seminar Concept Banner */}
      <div className="rounded-3xl border border-[#F0DDD0] bg-white/90 p-5 sm:p-7 shadow-lg shadow-[#D8B49C]/10 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#2B1F19] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F97316]" />
              Architectural Benchmark: Polling vs Real-Time WebSocket Push
            </h2>
            <p className="mt-1.5 text-xs text-[#6B5A50] leading-relaxed">
              Compare how traditional request-response HTTP polling behaves versus persistent full-duplex WebSockets.
              When an update is published, the <span className="text-[#EA580C] font-bold">WebSocket panel</span> updates instantly via server push, while the <span className="text-[#5C4A3E] font-bold">HTTP panel</span> remains completely stale until manually requested.
            </p>
          </div>
        </div>

        {/* Host Broadcast Form */}
        {role === "host" ? (
          <form onSubmit={handleSubmit} className="mt-5 pt-5 border-t border-[#F2E2D5]">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Broadcast a new message to all attendees in real-time..."
                maxLength={500}
                className="flex-1 rounded-2xl border-2 border-[#E7D6C8] bg-white px-4 py-3 text-sm text-[#2B1F19] placeholder-[#A8988C] focus:border-[#F97316] focus:outline-none focus:ring-4 focus:ring-[#F97316]/15 shadow-inner"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSubmitting}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#FB923C] hover:from-[#EA580C] hover:to-[#F97316] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#F97316]/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>Post Update</span>
              </button>
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-[#9C8273]">
              <span>Emits WebSocket frame `post_update`</span>
              <span>{inputText.length} / 500 characters</span>
            </div>
          </form>
        ) : (
          <div className="mt-4 pt-4 border-t border-[#F2E2D5] flex items-center gap-2 text-xs text-[#6B5A50]">
            <ShieldAlert className="h-4 w-4 text-[#F97316]" />
            <span>Connected as Audience. Watch the live push stream below as the presenter broadcasts messages.</span>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {/* LEFT: Without WebSockets (HTTP Polling) */}
        <div className="flex flex-col rounded-3xl border border-[#EADBCC] bg-[#FAF5EF]/90 p-6 shadow-md shadow-[#BA8C6E]/5">
          <div className="flex items-center justify-between pb-4 border-b border-[#E7D6C8]">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#A8988C]" />
                <h3 className="font-bold text-sm text-[#2B1F19]">Without WebSockets</h3>
              </div>
              <p className="text-[11px] text-[#7A675B] mt-0.5">Traditional HTTP Polling (Request / Response)</p>
            </div>

            <button
              type="button"
              onClick={fetchHttpUpdates}
              disabled={isFetchingHttp}
              className="flex items-center gap-1.5 rounded-xl border border-[#DEC9B7] bg-white px-3.5 py-1.5 text-xs font-bold text-[#3D2C24] hover:bg-[#F5ECE3] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#7A675B] ${isFetchingHttp ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Staleness Indicator */}
          <div className="mt-3.5 flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-xs border border-[#EADBCC] shadow-xs">
            <span className="flex items-center gap-1.5 text-[#7A675B]">
              <Clock className="h-3.5 w-3.5 text-[#9C8273]" />
              <span>Last fetched:</span>
            </span>
            <span className={`font-mono font-bold ${secondsSinceFetch > 10 ? "text-[#C2410C]" : "text-[#2B1F19]"}`}>
              {lastFetchedAt ? `${secondsSinceFetch}s ago (stale)` : "Never"}
            </span>
          </div>

          {/* Updates List */}
          <div className="mt-4 flex-1 space-y-2.5 min-h-75 max-h-115 overflow-y-auto pr-1">
            {httpUpdates.length === 0 ? (
              <div className="flex h-52 flex-col items-center justify-center text-center text-[#9C8273] text-xs">
                <Clock className="h-10 w-10 mb-2 stroke-[1.5] text-[#D8B49C]" />
                <p className="font-medium">No updates loaded via HTTP.</p>
                <p className="mt-1 text-[11px] text-[#A8988C]">Click &quot;Refresh&quot; to fetch latest messages.</p>
              </div>
            ) : (
              httpUpdates.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="rounded-2xl border border-[#E7D6C8] bg-white p-4 text-xs shadow-xs"
                >
                  <p className="text-[#2B1F19] font-medium whitespace-pre-wrap">{item.text}</p>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#9C8273]">
                    <span className="font-mono">ID: {item.id.slice(0, 8)}</span>
                    <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: With WebSockets (Real-Time Push) */}
        <div className="flex flex-col rounded-3xl border-2 border-[#FED7AA] bg-[#FFF8F3]/95 p-6 shadow-xl shadow-[#F97316]/10 relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-[#FED7AA]">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C] shadow-[0_0_8px_#ea580c]" />
                <h3 className="font-bold text-sm text-[#9A3412]">With WebSockets</h3>
              </div>
              <p className="text-[11px] text-[#C2410C] mt-0.5">Persistent Full-Duplex Stream (Instant Server Push)</p>
            </div>

            <span className="flex items-center gap-1 rounded-full bg-[#FFF2EA] border border-[#FDBA74] px-3 py-1 text-[11px] font-bold text-[#EA580C] shadow-xs">
              <Zap className="h-3.5 w-3.5 text-[#F97316]" />
              <span>Real-Time</span>
            </span>
          </div>

          {/* Real-time Indicator */}
          <div className="mt-3.5 flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-xs border border-[#FED7AA] shadow-xs">
            <span className="flex items-center gap-1.5 text-[#EA580C] font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Push latency:</span>
            </span>
            <span className="font-mono font-bold text-emerald-700">
              &lt; 15 ms (Instant)
            </span>
          </div>

          {/* Real-time Updates List */}
          <div className="mt-4 flex-1 space-y-2.5 min-h-75 max-h-115 overflow-y-auto pr-1">
            {wsUpdates.length === 0 ? (
              <div className="flex h-52 flex-col items-center justify-center text-center text-[#9C8273] text-xs">
                <Zap className="h-10 w-10 mb-2 stroke-[1.5] text-[#FED7AA]" />
                <p className="font-medium text-[#7A675B]">Waiting for real-time WebSocket updates...</p>
                <p className="mt-1 text-[11px] text-[#A8988C]">As soon as the host broadcasts, items appear instantly.</p>
              </div>
            ) : (
              wsUpdates.map((item, idx) => {
                const isNew = latestWsId === item.id;
                return (
                  <div
                    key={item.id || idx}
                    className={`rounded-2xl border p-4 text-xs transition-all duration-500 shadow-xs ${
                      isNew
                        ? "border-[#F97316] bg-[#FFF2EA] shadow-md shadow-[#F97316]/20"
                        : "border-[#F3E2D5] bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[#2B1F19] font-medium whitespace-pre-wrap">{item.text}</p>
                      {isNew && (
                        <span className="shrink-0 rounded-full bg-[#EA580C] text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-xs">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#9C8273]">
                      <span className="font-mono text-[#EA580C]">ID: {item.id.slice(0, 8)}</span>
                      <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
