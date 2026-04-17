import { create } from "zustand";
import { TranscriptChunk, SuggestionBatch, ChatMessage } from "@/types";
import { DEFAULT_PROMPTS } from "@/lib/prompts";

interface SessionState {
  groqApiKey: string;
  suggestionPrompt: string;
  chatPrompt: string;
  detailPrompt: string;
  suggestionContextSeconds: number;
  transcript: TranscriptChunk[];
  batches: SuggestionBatch[];
  chat: ChatMessage[];
  isRecording: boolean;
  isLoadingSuggestions: boolean;
  isLoadingChat: boolean;
  rollingSummary: string;

  setGroqApiKey: (key: string) => void;
  setPrompt: (field: "suggestionPrompt" | "chatPrompt" | "detailPrompt", value: string) => void;
  setSuggestionContextSeconds: (n: number) => void;
  addTranscriptChunk: (chunk: TranscriptChunk) => void;
  addBatch: (batch: SuggestionBatch) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (delta: string) => void;
  setIsRecording: (v: boolean) => void;
  setIsLoadingSuggestions: (v: boolean) => void;
  setIsLoadingChat: (v: boolean) => void;
  setRollingSummary: (s: string) => void;
  getRecentTranscript: () => string;
  getFullTranscript: () => string;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  groqApiKey:
    typeof window !== "undefined"
      ? localStorage.getItem("groq_api_key") ?? ""
      : "",
  suggestionPrompt: DEFAULT_PROMPTS.suggestion,
  chatPrompt: DEFAULT_PROMPTS.chat,
  detailPrompt: DEFAULT_PROMPTS.detail,
  suggestionContextSeconds: 90,

  transcript: [],
  batches: [],
  chat: [],
  isRecording: false,
  isLoadingSuggestions: false,
  isLoadingChat: false,
  rollingSummary: "",

  setGroqApiKey: (key) => {
    if (typeof window !== "undefined") localStorage.setItem("groq_api_key", key);
    set({ groqApiKey: key });
  },

  setPrompt: (field, value) => set({ [field]: value }),

  setSuggestionContextSeconds: (n) => set({ suggestionContextSeconds: n }),

  addTranscriptChunk: (chunk) =>
    set((s) => ({ transcript: [...s.transcript, chunk] })),

  addBatch: (batch) =>
    set((s) => ({ batches: [batch, ...s.batches] })),

  addChatMessage: (msg) =>
    set((s) => ({ chat: [...s.chat, msg] })),

  updateLastAssistantMessage: (delta) =>
    set((s) => {
      const chat = [...s.chat];
      const last = chat[chat.length - 1];
      if (last?.role === "assistant") {
        chat[chat.length - 1] = { ...last, content: last.content + delta };
      }
      return { chat };
    }),

  setIsRecording: (v) => set({ isRecording: v }),
  setIsLoadingSuggestions: (v) => set({ isLoadingSuggestions: v }),
  setIsLoadingChat: (v) => set({ isLoadingChat: v }),
  setRollingSummary: (s) => set({ rollingSummary: s }),

  getRecentTranscript: () => {
    const { transcript, suggestionContextSeconds } = get();
    const cutoff = Date.now() - suggestionContextSeconds * 1000;
    return transcript
      .filter((c) => c.timestamp >= cutoff)
      .map((c) => c.text)
      .join(" ");
  },

  getFullTranscript: () =>
    get()
      .transcript.map((c) => c.text)
      .join(" "),
}));