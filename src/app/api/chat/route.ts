import { NextRequest } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const { messages, fullTranscript, promptTemplate, apiKey } = await req.json();

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "No API key" }), { status: 400 });
  }

  const systemPrompt = promptTemplate.replace("{{FULL_TRANSCRIPT}}", fullTranscript || "No transcript yet");

  const groq = new Groq({ apiKey });

  const stream = await groq.chat.completions.create({
    model: "meta-llama/llama-4-maverick-17b-128e-instruct",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    stream: true,
    max_tokens: 1000,
    temperature: 0.5,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) controller.enqueue(encoder.encode(delta));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}