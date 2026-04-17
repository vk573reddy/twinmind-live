import { useCallback } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { Suggestion, ChatMessage } from "@/types";

export function useChatActions() {
  const store = useSessionStore();

  const sendMessage = useCallback(async (userContent: string, kind?: Suggestion["kind"]) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userContent,
      timestamp: Date.now(),
      kind,
    };
    store.addChatMessage(userMsg);

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    store.addChatMessage(assistantMsg);
    store.setIsLoadingChat(true);

    try {
      const chatHistory = store.chat
        .filter((m) => m.content)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatHistory, { role: "user", content: userContent }],
          fullTranscript: store.getFullTranscript(),
          promptTemplate: store.chatPrompt,
          apiKey: store.groqApiKey,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        store.updateLastAssistantMessage(decoder.decode(value));
      }
    } catch {
      store.updateLastAssistantMessage("[Error: could not load response]");
    } finally {
      store.setIsLoadingChat(false);
    }
  }, [store]);

  const sendSuggestion = useCallback(async (suggestion: Suggestion) => {
    const detailContent = store.detailPrompt
      .replace("{{FULL_TRANSCRIPT}}", store.getFullTranscript())
      .replace("{{KIND}}", suggestion.kind)
      .replace("{{PREVIEW}}", suggestion.preview);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: suggestion.preview,
      timestamp: Date.now(),
      kind: suggestion.kind,
    };
    store.addChatMessage(userMsg);

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    store.addChatMessage(assistantMsg);
    store.setIsLoadingChat(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: detailContent }],
          fullTranscript: store.getFullTranscript(),
          promptTemplate: "{{FULL_TRANSCRIPT}}",
          apiKey: store.groqApiKey,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        store.updateLastAssistantMessage(decoder.decode(value));
      }
    } catch {
      store.updateLastAssistantMessage("[Error loading detail]");
    } finally {
      store.setIsLoadingChat(false);
    }
  }, [store]);

  return { sendMessage, sendSuggestion };
}