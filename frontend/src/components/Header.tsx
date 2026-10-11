"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Copy, Check, QrCode, Users, Shield, User, ArrowLeft } from "lucide-react";
import type { ConnectionState } from "@/hooks/useWebSocket";

interface HeaderProps {
  roomCode: string;
  role: "host" | "audience";
  connectionState: ConnectionState;
  memberCount: number;
  onOpenQr: () => void;
}

export function Header({
  roomCode,
  role,
  connectionState,
  memberCount,
  onOpenQr,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case "connected":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "connecting":
      case "reconnecting":
        return "bg-amber-50 text-amber-700 border-amber-200 animate-pulse";
      case "disconnected":
        return "bg-rose-50 text-rose-700 border-rose-200";
    }
  };

  const getStatusDot = () => {
    switch (connectionState) {
      case "connected":
        return "bg-emerald-500 shadow-[0_0_6px_#10b981]";
      case "connecting":
      case "reconnecting":
        return "bg-amber-500 shadow-[0_0_6px_#f59e0b]";
      case "disconnected":
        return "bg-rose-500 shadow-[0_0_6px_#f43f5e]";
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#EFE2D6] bg-[#FDFBF7]/90 backdrop-blur-md px-4 py-3 sm:px-6 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Left: Brand & Room Code */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#6E5D53] hover:text-[#2D2118] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Lobby</span>
          </Link>

          <div className="h-4 w-px bg-[#E5D5C6] hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-[#9C8273] font-bold">Room</span>
            <div className="flex items-center gap-1.5 rounded-xl border border-[#FED7AA] bg-[#FFF7EE] px-3 py-1 text-sm font-mono font-bold tracking-widest text-[#C2410C] shadow-inner">
              {roomCode}
              <button
                type="button"
                onClick={copyCode}
                title="Copy Room Code"
                className="ml-1 text-[#EA580C] hover:text-[#9A3412] transition-colors p-0.5 rounded cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Status Badges, Member count, Role, QR */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Member Count */}
          <div className="flex items-center gap-1.5 rounded-full border border-[#E7D6C8] bg-white px-3 py-1 text-xs text-[#5C4A3E] shadow-xs">
            <Users className="h-3.5 w-3.5 text-[#9C8273]" />
            <span className="font-bold text-[#2D2118]">{memberCount}</span>
            <span className="hidden sm:inline text-[#7A675B]">online</span>
          </div>

          {/* Role Badge */}
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs ${
              role === "host"
                ? "border-[#FED7AA] bg-[#FFF2EA] text-[#C2410C]"
                : "border-[#E7D6C8] bg-[#F7F1EB] text-[#5C4A3E]"
            }`}
          >
            {role === "host" ? (
              <>
                <Shield className="h-3.5 w-3.5 text-[#F97316]" />
                <span>Host</span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5 text-[#7A675B]" />
                <span>Audience</span>
              </>
            )}
          </div>

          {/* Connection State */}
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize shadow-xs ${getStatusColor()}`}
          >
            <span className={`h-2 w-2 rounded-full ${getStatusDot()}`} />
            <span className="hidden sm:inline">{connectionState}</span>
          </div>

          {/* QR Button */}
          <button
            type="button"
            onClick={onOpenQr}
            className="flex items-center gap-1.5 rounded-xl border border-[#FDBA74] bg-[#FFF2EA] px-3 py-1.5 text-xs font-semibold text-[#C2410C] hover:bg-[#FFE5D4] transition-all cursor-pointer shadow-xs"
            title="Show Join QR Code"
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Invite QR</span>
          </button>
        </div>
      </div>
    </header>
  );
}
