"use client";

import React, { useState } from "react";
import { Terminal, ChevronUp, ChevronDown, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { WsFrame } from "@/hooks/useWebSocket";

interface FramesLogProps {
  frames: WsFrame[];
  totalBytesSent: number;
  totalBytesReceived: number;
  onClear: () => void;
}

export function FramesLog({
  frames,
  totalBytesSent,
  totalBytesReceived,
  onClear,
}: FramesLogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterDirection, setFilterDirection] = useState<"all" | "in" | "out">("all");
  const [expandedFrameId, setExpandedFrameId] = useState<string | null>(null);

  const filteredFrames = frames.filter((f) => {
    if (filterDirection === "all") return true;
    return f.direction === filterDirection;
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toTimeString().split(" ")[0]}.${d.getMilliseconds().toString().padStart(3, "0")}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#E8D8CA] bg-[#FFFDFC]/95 backdrop-blur-md shadow-2xl shadow-[#3D2C24]/10 transition-all">
      {/* Bar Header */}
      <div className="flex items-center justify-between px-4 py-2.5 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 font-mono font-bold text-[#2B1F19] hover:text-[#EA580C] transition-colors cursor-pointer"
          >
            <Terminal className="h-4 w-4 text-[#F97316]" />
            <span>WebSocket Frame Inspector</span>
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>

          <span className="rounded-full bg-[#FFF2EA] border border-[#FFDEC9] px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#EA580C]">
            {frames.length} frames
          </span>

          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-[#7A675B]">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <ArrowDownLeft className="h-3.5 w-3.5" /> In: {formatBytes(totalBytesReceived)}
            </span>
            <span className="flex items-center gap-1 text-[#EA580C] font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" /> Out: {formatBytes(totalBytesSent)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              {/* Filter */}
              <div className="flex items-center rounded-xl border border-[#E7D6C8] bg-white p-0.5 text-[11px] shadow-xs">
                <button
                  type="button"
                  onClick={() => setFilterDirection("all")}
                  className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer transition-colors ${
                    filterDirection === "all" ? "bg-[#3D2C24] text-white" : "text-[#7A675B] hover:text-[#2B1F19]"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDirection("in")}
                  className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer transition-colors ${
                    filterDirection === "in" ? "bg-emerald-600 text-white" : "text-[#7A675B] hover:text-[#2B1F19]"
                  }`}
                >
                  In
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDirection("out")}
                  className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer transition-colors ${
                    filterDirection === "out" ? "bg-[#EA580C] text-white" : "text-[#7A675B] hover:text-[#2B1F19]"
                  }`}
                >
                  Out
                </button>
              </div>

              {/* Clear */}
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1 rounded-xl border border-[#DEC9B7] bg-white px-2.5 py-1 text-[11px] font-bold text-[#7A675B] hover:bg-[#F5ECE3] hover:text-[#2B1F19] transition-colors cursor-pointer shadow-xs"
                title="Clear Frame Log"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Logs Table */}
      {isOpen && (
        <div className="max-h-64 overflow-y-auto border-t border-[#E8D8CA] bg-[#FAF6F0] px-4 py-2 font-mono text-xs">
          {filteredFrames.length === 0 ? (
            <div className="py-6 text-center text-[#9C8273] text-xs">No WebSocket frames recorded yet.</div>
          ) : (
            <div className="space-y-1.5">
              {filteredFrames.map((frame) => {
                const isExpanded = expandedFrameId === frame.id;
                return (
                  <div
                    key={frame.id}
                    className="rounded-xl border border-[#E7D6C8] bg-white hover:border-[#FDBA74] transition-colors shadow-xs"
                  >
                    <div
                      onClick={() => setExpandedFrameId(isExpanded ? null : frame.id)}
                      className="flex cursor-pointer items-center justify-between px-3 py-2 select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        {frame.direction === "in" ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-200">
                            <ArrowDownLeft className="h-2.5 w-2.5" /> RECV
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-[#FFF2EA] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#EA580C] border border-[#FFDEC9]">
                            <ArrowUpRight className="h-2.5 w-2.5" /> SEND
                          </span>
                        )}

                        <span className="font-bold text-[#2B1F19]">{frame.type}</span>
                        <span className="text-[10px] text-[#9C8273] font-medium">{formatBytes(frame.sizeBytes)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-[#7A675B]">
                        <span>{formatTime(frame.timestamp)}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-[#9C8273] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#E8D8CA] bg-[#FFFDFC] p-3 text-[11px] text-[#2B1F19] overflow-x-auto">
                        <pre className="text-[#3D2C24]">
                          {JSON.stringify(
                            {
                              type: frame.type,
                              payload: frame.payload,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
