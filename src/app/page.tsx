"use client";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import TranscriptColumn from "@/components/TranscriptColumn";
import SuggestionsColumn from "@/components/SuggestionsColumn";
import ChatColumn from "@/components/ChatColumn";
import SettingsDrawer from "@/components/SettingsDrawer";
import ExportButton from "@/components/ExportButton";

export default function Home() {
  const groqApiKey = useSessionStore((s) => s.groqApiKey);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
        <h1 className="text-sm font-semibold text-zinc-300">
          TwinMind — Live Suggestions
        </h1>
        <div className="flex items-center gap-2">
          {!groqApiKey && (
            <span className="text-xs text-amber-400">⚠ Add Groq API key in Settings</span>
          )}
          <ExportButton />
          <SettingsDrawer />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden divide-x divide-zinc-800">
        <div className="w-1/3 flex flex-col overflow-hidden">
          <TranscriptColumn />
        </div>
        <div className="w-1/3 flex flex-col overflow-hidden">
          <SuggestionsColumn />
        </div>
        <div className="w-1/3 flex flex-col overflow-hidden">
          <ChatColumn />
        </div>
      </div>
    </div>
  );
}