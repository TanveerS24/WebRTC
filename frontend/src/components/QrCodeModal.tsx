"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, Smartphone } from "lucide-react";

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export function QrCodeModal({ isOpen, onClose, roomCode }: QrCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/room/${roomCode}` : "";

  if (!isOpen) return null;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B1F19]/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-3xl border border-[#F2E0D2] bg-[#FFFCF8] p-7 shadow-2xl shadow-[#3D2C24]/15 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#9C8273] hover:bg-[#F5EAE0] hover:text-[#2B1F19] transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF2EA] text-[#EA580C] border border-[#FFDEC9] shadow-inner mb-4">
            <Smartphone className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-[#2B1F19]">Join Seminar Room</h3>
          <p className="mt-1 text-xs text-[#6B5A50]">
            Scan with your smartphone camera to join room <span className="font-mono font-bold text-[#EA580C]">{roomCode}</span>
          </p>

          <div className="mt-6 flex justify-center rounded-2xl border-2 border-[#F3E2D5] bg-white p-4 shadow-sm">
            {joinUrl ? (
              <QRCodeSVG
                value={joinUrl}
                size={200}
                level="M"
                includeMargin={false}
              />
            ) : null}
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#E7D6C8] bg-white p-1.5 text-xs shadow-inner">
            <input
              type="text"
              readOnly
              value={joinUrl}
              className="flex-1 bg-transparent px-2 text-[#6B5A50] font-mono select-all outline-none text-[11px]"
            />
            <button
              type="button"
              onClick={copyUrl}
              className="flex items-center gap-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white px-3 py-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
