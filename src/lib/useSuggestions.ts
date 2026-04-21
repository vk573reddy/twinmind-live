import { useCallback, useRef } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { SuggestionBatch, Suggestion } from "@/types";

const REFRESH_INTERVAL_MS = 30_000;

export function useSuggestions() {
  const store = useSessionStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateRollingSummary = useCallback(async () => {
    const fullTranscript = store.getFullTranscript();
    if (!fullTranscript || !store.groqApiKey) return;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Summarize this meeting in 3 sentences max." }],
          fullTranscript,
          promptTemplate: "You are a summarizer. Meeting transcript: {{FULL_TRANSCRIPT}}",
          apiKey: store.groqApiKey,
        }),
      });
      if (!res.ok) return;
      const summary = await res.text();
      store.setRollingSummary(summary);
    } catch (err) {
      console.error("Summary error:", err);
    }
  }, [store]);

  const fetchSuggestions = useCallback(async () => {
    const recentTranscript = store.getRecentTranscript();
    if (!recentTranscript || !store.groqApiKey) return;

    store.setIsLoadingSuggestions(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recentTranscript,
          rollingSummary: store.rollingSummary,
          previousBatches: store.batches.slice(0, 3),
          promptTemplate: store.suggestionPrompt,
          apiKey: store.groqApiKey,
        }),
      });

      const parsed = await res.json();
      if (parsed.silent || !parsed.suggestions) return;

      const batch: SuggestionBatch = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        suggestions: parsed.suggestions.map((s: Omit<Suggestion, "id">) => ({
          ...s,
          id: crypto.randomUUID(),
        })),
      };

      store.addBatch(batch);

      if (store.batches.length > 0 && store.batches.length % 3 === 0) {
        await updateRollingSummary();
      }
    } catch (err) {
      console.error("Suggestion error:", err);
    } finally {
      store.setIsLoadingSuggestions(false);
    }
  }, [store, updateRollingSummary]);

  const startAutoRefresh = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(fetchSuggestions, REFRESH_INTERVAL_MS);
  }, [fetchSuggestions]);

  const stopAutoRefresh = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { fetchSuggestions, startAutoRefresh, stopAutoRefresh };
}