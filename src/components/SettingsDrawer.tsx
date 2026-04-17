"use client";
import { useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { DEFAULT_PROMPTS } from "@/lib/prompts";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default function SettingsDrawer() {
  const [open, setOpen] = useState(false);
  const store = useSessionStore();

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Settings size={16} />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative ml-auto w-[480px] h-full bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-100">Settings</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300 text-xl">✕</button>
            </div>

            <Section title="Groq API Key">
              <input
                type="password"
                value={store.groqApiKey}
                onChange={(e) => store.setGroqApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
              />
              <p className="text-xs text-zinc-600">Stored in localStorage. Never sent anywhere except Groq.</p>
            </Section>

            <Section title={`Suggestion Context Window: ${store.suggestionContextSeconds}s`}>
              <input
                type="range" min={30} max={300} step={30}
                value={store.suggestionContextSeconds}
                onChange={(e) => store.setSuggestionContextSeconds(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-xs text-zinc-600">
                <span>30s</span><span>300s</span>
              </div>
            </Section>

            <PromptField
              label="Live Suggestion Prompt"
              value={store.suggestionPrompt}
              defaultValue={DEFAULT_PROMPTS.suggestion}
              onChange={(v) => store.setPrompt("suggestionPrompt", v)}
            />
            <PromptField
              label="Detailed Answer Prompt (on card click)"
              value={store.detailPrompt}
              defaultValue={DEFAULT_PROMPTS.detail}
              onChange={(v) => store.setPrompt("detailPrompt", v)}
            />
            <PromptField
              label="Chat System Prompt"
              value={store.chatPrompt}
              defaultValue={DEFAULT_PROMPTS.chat}
              onChange={(v) => store.setPrompt("chatPrompt", v)}
            />
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</label>
      {children}
    </div>
  );
}

function PromptField({ label, value, defaultValue, onChange }: {
  label: string; value: string; defaultValue: string; onChange: (v: string) => void;
}) {
  return (
    <Section title={label}>
      <textarea
        rows={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none resize-none"
      />
      <button
        onClick={() => onChange(defaultValue)}
        className="text-xs text-zinc-500 hover:text-zinc-300 underline"
      >
        Reset to default
      </button>
    </Section>
  );
}