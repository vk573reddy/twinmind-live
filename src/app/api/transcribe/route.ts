import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File;
    const apiKey = req.headers.get("x-groq-key");

    if (!audio || !apiKey) {
      return NextResponse.json({ error: "Missing audio or API key" }, { status: 400 });
    }

    const groq = new Groq({ apiKey });

    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3",
      response_format: "text",
    });

    return NextResponse.json({ text: transcription });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}