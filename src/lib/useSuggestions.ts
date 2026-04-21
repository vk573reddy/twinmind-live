import { useCallback, useRef } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { SuggestionBatch, Suggestion } from "@/types";

const REFRESH_INTERVAL_MS = 30_000;

export function useSuggestions() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateRollingSummary = useCallback(async () => {
    const { getFullTranscript, groqApiKey, setRollingSummary } = useSessionStore.getState();
    const fullTranscript = getFullTranscript();
    if (!fullTranscript || !groqApiKey) return;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Summarize this meeting in 3 sentences max." }],
          fullTranscript,
          promptTemplate: "You are a summarizer. Meeting transcript: {{FULL_TRANSCRIPT}}",
          apiKey: groqApiKey,
        }),
      });
      if (!res.ok) return;
      const summary = await res.text();
      setRollingSummary(summary);
    } catch (err) {
      console.error("Summary error:", err);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    const { getRecentTranscript, groqApiKey, rollingSummary, suggestionPrompt, batches, setIsLoadingSuggestions, addBatch } = useSessionStore.getState();
    const recentTranscript = getRecentTranscript();
    if (!recentTranscript || !groqApiKey) return;

    const previousBatches = batches.slice(0, 3);
    console.log("[useSuggestions] previousBatches being sent:", JSON.stringify(previousBatches.map(b => b.suggestions.map(s => `[${s.kind}] ${s.preview}`))));

    setIsLoadingSuggestions(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recentTranscript,
          rollingSummary,
          previousBatches,
          promptTemplate: suggestionPrompt,
          apiKey: groqApiKey,
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

      addBatch(batch);

      const updatedBatches = useSessionStore.getState().batches;
      if (updatedBatches.length > 0 && updatedBatches.length % 3 === 0) {
        await updateRollingSummary();
      }
    } catch (err) {
      console.error("Suggestion error:", err);
    } finally {
      useSessionStore.getState().setIsLoadingSuggestions(false);
    }
  }, [updateRollingSummary]);

  const startAutoRefresh = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(fetchSuggestions, REFRESH_INTERVAL_MS);
  }, [fetchSuggestions]);

  const stopAutoRefresh = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { fetchSuggestions, startAutoRefresh, stopAutoRefresh };
}
