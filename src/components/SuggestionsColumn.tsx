"use client";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { useSuggestions } from "@/lib/useSuggestions";
import { useChatActions } from "@/lib/useChatActions";
import SuggestionCard from "@/components/SuggestionCard";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Suggestion } from "@/types";

export default function SuggestionsColumn() {
  const { batches, isLoadingSuggestions } = useSessionStore();
  const { fetchSuggestions } = useSuggestions();
  const { sendSuggestion } = useChatActions();
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 30 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          2. Live Suggestions
        </span>
        <span className="text-xs text-zinc-500">{batches.length} BATCHES</span>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <Button
          size="sm"
          variant="outline"
          onClick={fetchSuggestions}
          disabled={isLoadingSuggestions}
          className="gap-1 text-xs h-7 border-zinc-700"
        >
          <RefreshCw size={12} className={isLoadingSuggestions ? "animate-spin" : ""} />
          {isLoadingSuggestions ? "Generating..." : "↺ Reload suggestions"}
        </Button>
        <span className="text-xs text-zinc-600">auto-refresh in {countdown}s</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {batches.length === 0 && (
          <p className="text-zinc-600 text-sm italic">
            Suggestions appear here every ~30s while recording...
          </p>
        )}
        {batches.map((batch, batchIndex) => (
          <div key={batch.id}>
            {batchIndex > 0 && (
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 border-t border-zinc-800" />
                <span className="text-xs text-zinc-600">
                  — BATCH {batches.length - batchIndex} · {new Date(batch.timestamp).toLocaleTimeString()} —
                </span>
                <div className="flex-1 border-t border-zinc-800" />
              </div>
            )}
            <div className="space-y-2">
              {batch.suggestions.map((s: Suggestion) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  onClick={sendSuggestion}
                  faded={batchIndex > 0}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}