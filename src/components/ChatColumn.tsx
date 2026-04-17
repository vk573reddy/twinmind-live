"use client";
import { useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { useChatActions } from "@/lib/useChatActions";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { SuggestionKind } from "@/types";

const KIND_LABELS: Record<SuggestionKind, string> = {
  question_to_ask: "Question to Ask",
  talking_point: "Talking Point",
  answer: "Answer",
  fact_check: "Fact-Check",
  clarification: "Clarification",
};

export default function ChatColumn() {
  const { chat, isLoadingChat } = useSessionStore();
  const { sendMessage } = useChatActions();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleSend = () => {
    if (!input.trim() || isLoadingChat) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          3. Chat (Detailed Answers)
        </span>
        <span className="text-xs text-zinc-500">SESSION-ONLY</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {chat.length === 0 && (
          <p className="text-zinc-600 text-sm italic">
            Click a suggestion or type below for detailed answers...
          </p>
        )}
        {chat.map((msg) => (
          <div key={msg.id}>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              {msg.role === "user"
                ? `You${msg.kind ? ` · ${KIND_LABELS[msg.kind]}` : ""}`
                : "Assistant"}
            </div>
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "assistant" ? "text-zinc-200 pl-3 border-l-2 border-zinc-700" : "text-zinc-300"}`}>
              {msg.content}
              {msg.role === "assistant" && !msg.content && (
                <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-1" />
              )}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-zinc-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask anything..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <Button onClick={handleSend} disabled={isLoadingChat} size="sm">
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}