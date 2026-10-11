"use client";

import React, { useState } from "react";
import type { PollState } from "@/lib/protocol";
import {
  Plus,
  Trash2,
  Lock,
  CheckCircle2,
  Vote,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface LivePollTabProps {
  role: "host" | "audience";
  poll: PollState | null;
  onVote: (pollId: string, optionId: string) => boolean;
  onCreatePoll: (question: string, options: string[]) => boolean;
  onClosePoll: (pollId: string) => boolean;
}

export function LivePollTab({
  role,
  poll,
  onVote,
  onCreatePoll,
  onClosePoll,
}: LivePollTabProps) {
  // Host poll creation form state
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["WebSockets", "WebRTC", "HTTP Polling"]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Voting state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const addOptionField = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const removeOptionField = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOptionText = (index: number, text: string) => {
    const next = [...options];
    next[index] = text;
    setOptions(next);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const cleanQuestion = question.trim();
    const cleanOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!cleanQuestion) {
      setCreateError("Please enter a question");
      return;
    }
    if (cleanOptions.length < 2) {
      setCreateError("Please provide at least 2 non-empty options");
      return;
    }

    const sent = onCreatePoll(cleanQuestion, cleanOptions);
    if (sent) {
      setIsCreating(false);
      setQuestion("");
      setOptions(["Option 1", "Option 2"]);
      setHasVoted(false);
      setSelectedOptionId(null);
    }
  };

  const handleCastVote = (optionId: string) => {
    if (!poll || poll.status === "closed" || hasVoted) return;

    setSelectedOptionId(optionId);
    const sent = onVote(poll.id, optionId);
    if (sent) {
      setHasVoted(true);
    }
  };

  const totalVotes = poll ? poll.options.reduce((sum, opt) => sum + opt.votes, 0) : 0;

  // Rich Ivory-Peach harmonious gradients for animated bars
  const barColors = [
    "from-[#FF8A65] to-[#FF7043]", // Coral Peach
    "from-[#FFA726] to-[#FB8C00]", // Warm Amber
    "from-[#FFB74D] to-[#FFA726]", // Apricot
    "from-[#FF7043] to-[#F4511E]", // Deep Terracotta
    "from-[#E57373] to-[#EF5350]", // Warm Rose Peach
    "from-[#FFB300] to-[#FB8C00]", // Golden Honey
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Concept Explanation Banner */}
      <div className="rounded-3xl border border-[#F0DDD0] bg-white/90 p-5 sm:p-7 shadow-lg shadow-[#D8B49C]/10 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#2B1F19] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F97316]" />
              Live Interactive Poll: Multi-Client Push & Deduplication
            </h2>
            <p className="mt-1.5 text-xs text-[#6B5A50] leading-relaxed">
              When any client casts a vote, the server atomically records the vote in MongoDB with a unique compound index,
              then immediately broadcasts the updated tally over WebSockets to all connected devices.
            </p>
          </div>

          {role === "host" && (
            <div className="flex items-center gap-2 shrink-0">
              {!isCreating && (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#FB923C] hover:from-[#EA580C] hover:to-[#F97316] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#F97316]/20 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Poll</span>
                </button>
              )}
              {poll && poll.status === "open" && (
                <button
                  type="button"
                  onClick={() => onClosePoll(poll.id)}
                  className="flex items-center gap-1.5 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  <span>Close Poll</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Host Poll Creator Drawer */}
        {role === "host" && isCreating && (
          <form onSubmit={handleCreateSubmit} className="mt-6 pt-6 border-t border-[#F2E2D5]">
            <h3 className="text-sm font-bold text-[#2B1F19] mb-3">Create New Seminar Poll</h3>
            {createError && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#6B5A50] mb-1.5">Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Which protocol should be chosen for peer-to-peer audio and video?"
                  maxLength={200}
                  className="w-full rounded-2xl border-2 border-[#E7D6C8] bg-white px-4 py-2.5 text-sm text-[#2B1F19] placeholder-[#A8988C] focus:border-[#F97316] focus:outline-none focus:ring-4 focus:ring-[#F97316]/15 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B5A50] mb-1.5">Options (2 to 6)</label>
                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOptionText(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        maxLength={100}
                        className="flex-1 rounded-xl border border-[#E7D6C8] bg-white px-3.5 py-2 text-sm text-[#2B1F19] placeholder-[#A8988C] focus:border-[#F97316] focus:outline-none"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOptionField(idx)}
                          className="p-2 text-[#9C8273] hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={addOptionField}
                    className="mt-2.5 text-xs text-[#EA580C] hover:text-[#C2410C] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Option</span>
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-xl border border-[#DEC9B7] bg-white px-4 py-2 text-xs font-bold text-[#6B5A50] hover:bg-[#F5ECE3] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#FB923C] hover:from-[#EA580C] hover:to-[#F97316] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#F97316]/20 transition-all cursor-pointer"
              >
                Launch Poll
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Active Poll Display */}
      {!poll ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#E5D5C6] bg-white/50 py-16 text-center">
          <HelpCircle className="h-12 w-12 text-[#D4BFAD] mb-3" />
          <h3 className="text-base font-bold text-[#2B1F19]">No Active Poll</h3>
          <p className="mt-1 text-xs text-[#7A675B] max-w-sm">
            {role === "host"
              ? "Click 'New Poll' above to launch a live audience question."
              : "Waiting for the presenter to launch a poll. When started, it will appear here in real-time."}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#F0DDD0] bg-white/95 p-7 shadow-xl shadow-[#D8B49C]/10">
          {/* Poll Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#F2E2D5]">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    poll.status === "open"
                      ? "bg-[#EA580C] shadow-[0_0_8px_#ea580c]"
                      : "bg-[#9C8273]"
                  }`}
                />
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-[#EA580C]">
                  {poll.status === "open" ? "Voting Open" : "Poll Closed"}
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#2B1F19] mt-1.5">{poll.question}</h3>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-[#FFF7EE] border border-[#FED7AA] px-3.5 py-1.5 text-xs text-[#C2410C]">
              <Vote className="h-4 w-4" />
              <span>
                Total Votes: <strong className="font-mono text-sm">{totalVotes}</strong>
              </span>
            </div>
          </div>

          {/* ResultsBars & Voting Grid */}
          <div className="mt-6 space-y-4">
            {poll.options.map((option, idx) => {
              const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              const isSelected = selectedOptionId === option.id;
              const colorGradient = barColors[idx % barColors.length];

              return (
                <div
                  key={option.id}
                  className={`relative overflow-hidden rounded-2xl border p-4.5 transition-all shadow-xs ${
                    isSelected
                      ? "border-[#F97316] bg-[#FFF8F3] shadow-md shadow-[#F97316]/15"
                      : "border-[#EADBCC] bg-white hover:border-[#FDBA74]"
                  }`}
                >
                  {/* Animated Background Percentage Bar (Pure CSS / Tailwind, zero chart libraries) */}
                  <div
                    className={`absolute inset-y-0 left-0 bg-linear-to-r ${colorGradient} opacity-25 transition-all duration-700 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />

                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {poll.status === "open" && !hasVoted && (
                        <button
                          type="button"
                          onClick={() => handleCastVote(option.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF2EA] border border-[#FDBA74] text-[#EA580C] hover:bg-[#F97316] hover:text-white transition-all shadow-xs cursor-pointer"
                          title="Vote for this option"
                        >
                          <Vote className="h-4 w-4" />
                        </button>
                      )}

                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      )}

                      <span className="text-sm font-bold text-[#2B1F19]">{option.label}</span>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <span className="font-mono text-base font-bold text-[#2B1F19]">{percentage}%</span>
                      <span className="text-xs text-[#7A675B] font-mono">
                        ({option.votes} {option.votes === 1 ? "vote" : "votes"})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vote confirmation notice */}
          {hasVoted && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 shadow-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Your vote was recorded and broadcast live! Attempting to vote again is blocked by unique compound database constraints.
              </span>
            </div>
          )}

          {poll.status === "closed" && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[#F7F1EB] border border-[#E2D5C6] p-3.5 text-xs text-[#6B5A50] shadow-xs">
              <Lock className="h-4 w-4 shrink-0 text-[#9C8273]" />
              <span>This poll has been closed by the host. Results are locked and further votes are rejected.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
