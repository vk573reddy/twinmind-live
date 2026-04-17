import { useRef, useCallback } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { TranscriptChunk } from "@/types";

const CHUNK_INTERVAL_MS = 20_000;

export function useAudioCapture() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const store = useSessionStore();

  const sendChunk = useCallback(async () => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];
    if (blob.size < 1000) return;

    const formData = new FormData();
    formData.append("audio", blob, "chunk.webm");

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "x-groq-key": store.groqApiKey },
        body: formData,
      });
      const data = await res.json();
      if (data.text?.trim()) {
        const chunk: TranscriptChunk = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          text: data.text.trim(),
        };
        store.addTranscriptChunk(chunk);
      }
    } catch (err) {
      console.error("Transcription error:", err);
    }
  }, [store]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(1000);
      store.setIsRecording(true);
      intervalRef.current = setInterval(sendChunk, CHUNK_INTERVAL_MS);
    } catch {
      alert("Microphone access denied. Please allow mic access and reload.");
    }
  }, [sendChunk, store]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
    sendChunk();
    store.setIsRecording(false);
  }, [sendChunk, store]);

  return { start, stop };
}