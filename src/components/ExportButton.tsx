"use client";
import { useSessionStore } from "@/store/sessionStore";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ExportButton() {
  const { transcript, batches, chat } = useSessionStore();

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      transcript: transcript.map((c) => ({
        timestamp: new Date(c.timestamp).toISOString(),
        text: c.text,
      })),
      suggestionBatches: batches.map((b) => ({
        timestamp: new Date(b.timestamp).toISOString(),
        suggestions: b.suggestions.map((s) => ({
          kind: s.kind,
          preview: s.preview,
          reasoning: s.reasoning,
        })),
      })),
      chat: chat.map((m) => ({
        timestamp: new Date(m.timestamp).toISOString(),
        role: m.role,
        kind: m.kind || null,
        content: m.content,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `twinmind-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleExport} className="gap-1 text-xs">
      <Download size={14} />
      Export
    </Button>
  );
}