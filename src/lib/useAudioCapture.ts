import { useRef, useCallback } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { TranscriptChunk } from "@/types";

const CHUNK_INTERVAL_MS = 20_000;
const MIN_BLOB_SIZE = 5000;

export function useAudioCapture() {
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // First ondataavailable chunk contains the WebM EBML header.
  // Every subsequent blob must include it or Whisper returns 500.
  const headerChunkRef = useRef<Blob | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendChunk = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") return;

    // Flush any buffered data since the last timeslice tick
    mediaRecorderRef.current.requestData();
    await new Promise((resolve) => setTimeout(resolve, 200));

    const chunks = [...chunksRef.current];
    chunksRef.current = [];

    if (chunks.length === 0) return;

    // Prepend the saved header chunk so every blob is a self-contained WebM file
    const blobParts = headerChunkRef.current ? [headerChunkRef.current, ...chunks] : chunks;
    const mimeType = mediaRecorderRef.current.mimeType;
    const blob = new Blob(blobParts, { type: mimeType });
    if (blob.size < MIN_BLOB_SIZE) return;

    const formData = new FormData();
    formData.append("audio", blob, "audio.webm");

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "x-groq-key": useSessionStore.getState().groqApiKey },
        body: formData,
      });
      if (!res.ok) {
        console.error("Transcribe failed:", res.status);
        return;
      }
      const data = await res.json();
      if (data.text?.trim()) {
        const chunk: TranscriptChunk = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          text: data.text.trim(),
        };
        useSessionStore.getState().addTranscriptChunk(chunk);
      }
    } catch (err) {
      console.error("Transcription error:", err);
    }
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      headerChunkRef.current = null;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          // Save the very first chunk — it carries the EBML/WebM header
          if (!headerChunkRef.current) {
            headerChunkRef.current = e.data;
          }
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(3000);
      useSessionStore.getState().setIsRecording(true);
      intervalRef.current = setInterval(sendChunk, CHUNK_INTERVAL_MS);
    } catch {
      alert("Microphone access denied. Please allow mic access and reload.");
    }
  }, [sendChunk]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    headerChunkRef.current = null;
    useSessionStore.getState().setIsRecording(false);
  }, []);

  return { start, stop };
}
