"use client";
import { useEffect, useRef } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { useAudioCapture } from "@/lib/useAudioCapture";
import { useSuggestions } from "@/lib/useSuggestions";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TranscriptColumn() {
  const { transcript, isRecording } = useSessionStore();
  const { start, stop } = useAudioCapture();
  const { startAutoRefresh, stopAutoRefresh } = useSuggestions();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const toggle = async () => {
    if (isRecording) {
      stop();
      stopAutoRefresh();
    } else {
      await start();
      startAutoRefresh();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          1. Mic & Transcript
        </span>
        <span className={`text-xs font-medium ${isRecording ? "text-red-400" : "text-zinc-500"}`}>
          {isRecording ? "● LIVE" : "IDLE"}
        </span>
      </div>

      <div className="px-4 py-3 border-b border-zinc-800">
        <Button
          onClick={toggle}
          variant={isRecording ? "destructive" : "default"}
          className="w-full gap-2"
        >
          {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
          {isRecording ? "Stop Recording" : "Start Recording"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {transcript.length === 0 && (
          <p className="text-zinc-600 text-sm italic">
            Transcript will appear here as you speak...
          </p>
        )}
        {transcript.map((chunk) => (
          <div key={chunk.id} className="text-sm leading-relaxed">
            <span className="text-zinc-500 text-xs mr-2">
              {new Date(chunk.timestamp).toLocaleTimeString()}
            </span>
            <span className="text-zinc-200">{chunk.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}