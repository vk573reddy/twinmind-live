"use client";
import { Suggestion, SuggestionKind } from "@/types";

const KIND_CONFIG: Record<SuggestionKind, { label: string; color: string }> = {
  question_to_ask: { label: "Question to Ask", color: "text-violet-400 border-violet-800 bg-violet-950/40" },
  talking_point:   { label: "Talking Point",   color: "text-blue-400 border-blue-800 bg-blue-950/40" },
  answer:          { label: "Answer",           color: "text-emerald-400 border-emerald-800 bg-emerald-950/40" },
  fact_check:      { label: "Fact-Check",       color: "text-amber-400 border-amber-800 bg-amber-950/40" },
  clarification:   { label: "Clarification",    color: "text-rose-400 border-rose-800 bg-rose-950/40" },
};

interface Props {
  suggestion: Suggestion;
  onClick: (suggestion: Suggestion) => void;
  faded?: boolean;
}

export default function SuggestionCard({ suggestion, onClick, faded }: Props) {
  const config = KIND_CONFIG[suggestion.kind];
  return (
    <button
      onClick={() => onClick(suggestion)}
      className={`w-full text-left rounded-lg border px-4 py-3 transition-all hover:brightness-125 hover:scale-[1.01] ${config.color} ${faded ? "opacity-50" : "opacity-100"}`}
    >
      <div className="text-xs font-semibold uppercase tracking-wider mb-1">
        {config.label}
      </div>
      <div className="text-sm text-zinc-200 leading-snug">{suggestion.preview}</div>
    </button>
  );
}