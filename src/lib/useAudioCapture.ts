import { useRef, useCallback } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { TranscriptChunk } from "@/types";

const CHUNK_INTERVAL_MS = 20_000;
const KEEP_ALIVE_INTERVAL_MS = 5_000;
const MIN_BLOB_SIZE = 5000;

export function useAudioCapture() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const store = useSessionStore();

  const sendChunk = useCallback(async () => {
    if (chunksRef.current.length === 0) return;

    // Guard: only send if recorder is still active
    if (mediaRecorderRef.current?.state !== "recording") {
      console.error("[useAudioCapture] sendChunk called but recorder state is:", mediaRecorderRef.current?.state);
      return;
    }

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];
    if (blob.size < MIN_BLOB_SIZE) return;

    const formData = new FormData();
    formData.append("audio", blob, "chunk.webm");

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "x-groq-key": store.groqApiKey },
        body: formData,
      });
      if (!res.ok) return;
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
      console.error("[useAudioCapture] Transcription error:", err);
    }

    // Verify recorder is still running after sending
    if (mediaRecorderRef.current?.state !== "recording") {
      console.error("[useAudioCapture] Recorder stopped unexpectedly after chunk send.");
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

      // 3000ms timeslice — more reliable cross-browser than 1000ms
      recorder.start(3000);
      store.setIsRecording(true);

      intervalRef.current = setInterval(sendChunk, CHUNK_INTERVAL_MS);

      // Keep-alive: check every 5s that the recorder hasn't silently stopped
      keepAliveRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state !== "recording") {
          console.error("[useAudioCapture] Keep-alive check: recorder is not in 'recording' state —", mediaRecorderRef.current?.state);
        }
      }, KEEP_ALIVE_INTERVAL_MS);
    } catch {
      alert("Microphone access denied. Please allow mic access and reload.");
    }
  }, [sendChunk, store]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    sendChunk();
    store.setIsRecording(false);
  }, [sendChunk, store]);

  return { start, stop };
}
