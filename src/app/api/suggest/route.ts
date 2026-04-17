import { NextRequest } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const { recentTranscript, rollingSummary, previousBatches, promptTemplate, apiKey } =
    await req.json();

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "No API key" }), { status: 400 });
  }

  const previousBatchesText =
    previousBatches?.length
      ? previousBatches
          .map(
            (b: { suggestions: { kind: string; preview: string }[] }, i: number) =>
              `Batch ${i + 1}: ` +
              b.suggestions
                .map((s: { kind: string; preview: string }) => `[${s.kind}] ${s.preview}`)
                .join(" | ")
          )
          .join("\n")
      : "None yet";

  const prompt = promptTemplate
    .replace("{{ROLLING_SUMMARY}}", rollingSummary || "None yet")
    .replace("{{RECENT_TRANSCRIPT}}", recentTranscript || "")
    .replace("{{PREVIOUS_BATCHES}}", previousBatchesText);

  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 600,
    temperature: 0.4,
  });

  const content = completion.choices[0]?.message?.content || "{}";
  return new Response(content, { headers: { "Content-Type": "application/json" } });
}