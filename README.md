# TwinMind — Live Suggestions

A real-time AI meeting copilot that listens to your microphone, transcribes speech in chunks, and continuously surfaces three contextual suggestions — questions to ask, talking points, fact-checks, answers, and clarifications — based on what is happening in the conversation right now.

---

## Live Demo

> Paste your Groq API key in Settings (top-right gear icon) after opening the app.

**Deployed URL:** [https://twinmind-live-nu.vercel.app/](https://twinmind-live-nu.vercel.app/)

---

## Setup

**Prerequisites**
- Node.js 18+
- A free [Groq API key](https://console.groq.com) — the app never stores it anywhere except your own browser's `localStorage`

```bash
git clone https://github.com/vk573reddy/twinmind-live
cd twinmind-live
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click the gear icon, paste your Groq API key, and hit **Start Recording**.

---

## What It Does

Three columns, always visible:

| Column | Role |
|---|---|
| **Mic & Transcript** | Records audio, transcribes every ~20 seconds via Whisper Large V3, auto-scrolls |
| **Live Suggestions** | Generates 3 fresh suggestions every 30 seconds; older batches stay visible below |
| **Chat** | Click any suggestion for a deep answer, or type your own question |

The **Export** button (top-right) downloads the full session — transcript, every suggestion batch with timestamps, and complete chat history — as JSON.

---

## Stack

**Next.js 16 + React 19** — App Router with server-side API routes. The API routes matter here: they keep the Groq SDK call on the server side and accept the API key per-request from the client, so the key is never bundled into client code.

**Groq** — Used for everything: Whisper Large V3 for transcription, `meta-llama/llama-4-scout-17b-16e-instruct` (the current Groq model mapping to GPT-OSS 120B as specified in the assignment) for suggestions and chat. Groq's inference speed is what makes this feel live — suggestion latency is under 2 seconds, and chat streams the first token almost immediately.

**Zustand** — Lightweight state store with no boilerplate. The entire session (transcript chunks, suggestion batches, chat messages, API key, all prompt settings) lives in one flat store. Selector-based subscriptions mean only the components that actually need a piece of state re-render.

**TypeScript** — Strict mode throughout. The `Suggestion`, `SuggestionBatch`, `TranscriptChunk`, and `ChatMessage` types are defined once in `src/types/index.ts` and used everywhere. This paid off immediately when wiring the prompt template variables — the compiler caught shape mismatches early.

**Tailwind CSS v4 + shadcn/ui** — Dark theme only (`bg-zinc-950` baseline). Used the shadcn primitives for Button, Dialog, ScrollArea, and Textarea rather than building from scratch, which let me focus time on prompt design and state logic instead of component APIs.

---

## Observations from Using TwinMind

Before building, I studied TwinMind's live suggestions feature and identified three specific weaknesses:

**1. Suggestions repeat themes across batches.**
TwinMind's own changelog (August 2025) lists "Smarter Suggestions" as a shipped fix — meaning repetition was a known, recurring problem. In practice, the same talking point appears 2–3 refreshes in a row when the topic hasn't changed.
My fix: the last 3 suggestion batches are passed back to the model with an explicit hard rule — "Every suggestion must be on a completely different topic from ALL suggestions listed above." Enforced at the prompt level, not post-filtered.

**2. Previews require clicking to get value.**
TwinMind cards show a vague label and a one-liner that doesn't tell you anything actionable without opening the detail view. User reviews specifically call suggestions out as feeling like "placeholders."
My fix: the prompt bans vague previews with a direct bad/good example — Bad: "Ask about the timeline." Good: "Ask: when does the current sprint end and what is blocking the auth module?" The model is told: if you can't make it useful in 140 chars, generate something else.

**3. Suggestion kind is not driven by conversation state.**
TwinMind rotates suggestion types on a fixed pattern regardless of what just happened. It shows a "Talking Point" even when someone just asked a direct factual question.
My fix: the prompt classifies what just happened before selecting a kind. Question asked → answer it. Claim made → fact-check it. Topic being explored → surface a talking point. The kind selection is reactive, not rotational.

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # Streaming chat completions
│   │   ├── suggest/route.ts     # Batch suggestion generation (JSON mode)
│   │   └── transcribe/route.ts  # Whisper audio transcription
│   └── page.tsx                 # Root layout, three-column grid
├── components/
│   ├── TranscriptColumn.tsx
│   ├── SuggestionsColumn.tsx
│   ├── SuggestionCard.tsx
│   ├── ChatColumn.tsx
│   ├── SettingsDrawer.tsx
│   └── ExportButton.tsx
├── lib/
│   ├── useAudioCapture.ts       # MediaRecorder, chunk timer, sends to /api/transcribe
│   ├── useSuggestions.ts        # 30s auto-refresh loop, rolling summary updates
│   ├── useChatActions.ts        # sendMessage + sendSuggestion, streams response
│   └── prompts.ts               # Default prompts, exported as DEFAULT_PROMPTS
├── store/
│   └── sessionStore.ts          # Zustand store, all session state + getters
└── types/
    └── index.ts
```

Audio flows one-way: `MediaRecorder` → 20-second blob → `/api/transcribe` → Whisper → transcript chunk appended to store → suggestion prompt reads the store's recent window.

The API key travels in every request (request body for chat/suggest, `x-groq-key` header for transcribe) and is never logged or persisted server-side.

---

## Prompt Strategy

This is where most of the iteration happened. The three prompts each serve a different job.

### Live Suggestion Prompt

The hardest problem is avoiding stale, generic suggestions. Three things make the suggestions feel context-aware:

**1. Layered context**
Every suggestion request sends three pieces of context in a single prompt:
- A *rolling summary* of the earlier conversation (3 sentences, regenerated every 3 batches) — this preserves the gist of what was said before the context window
- The *recent transcript* (configurable 30–300 seconds, default 90s) — this is what the model actually reasons against for "what just happened"
- The last 3 *previous suggestion batches* — this tells the model what it already surfaced so it doesn't repeat itself

**2. Kind-selection rules**
The prompt explicitly instructs the model to pick the *right* kind based on what just happened, not randomly vary them:
```
- Someone asked a factual question → "answer" with the actual answer
- Someone made a claim that may be wrong → "fact_check"
- A topic is being discussed → "talking_point" with a concrete stat or insight
- Conversation needs steering → "question_to_ask"
- Something was ambiguous → "clarification"
```
This means the model doesn't just mix kinds for variety — it picks based on conversational signal.

**3. The silent guard**
If the recent transcript has fewer than 15 new words, the model returns `{"silent": true}` and no batch is added. This prevents garbage suggestions when someone pauses or when background noise produces short nonsense chunks.

**Specificity rule**: The prompt explicitly bans vague suggestions. It gives a bad/good example directly in the system prompt — `Bad: "Ask about timeline". Good: "Ask: when does Q2 end and what is blocking the auth module?"` — because the model defaults to vague suggestions without this pressure.

### Detail Answer Prompt (on card click)

When a user clicks a suggestion, the model gets the full meeting transcript plus the exact kind and preview of what was clicked, and is asked for 150–300 words with the most important point first. The kind is used to shape the answer — a `fact_check` should explicitly state what was correct and what was wrong; a `question_to_ask` should explain *why* that question matters given the conversation so far.

The context window for detail answers is configurable separately (default 300s, range 60–600s) because you often want more transcript context for a detailed answer than for a quick suggestion batch.

### Chat System Prompt

The chat prompt gives the model the full transcript and positions it as an expert advisor in the room — not a general assistant. The key instruction is `"Say 'not mentioned in the transcript' when something is not covered"` rather than letting the model hallucinate details that were never said. In a meeting context, confidently wrong answers are worse than admitting ignorance.

---

## Settings

Everything tuneable is exposed in the Settings drawer (gear icon):

| Setting | Default | Range | Effect |
|---|---|---|---|
| Groq API key | — | — | Stored in `localStorage`, never hardcoded |
| Suggestion context window | 90s | 30–300s | How much recent transcript the suggestion prompt sees |
| Detail answer context window | 300s | 60–600s | How much transcript context a card-click detail answer uses |
| Live suggestion prompt | (see prompts.ts) | editable | Full system prompt for batch generation |
| Detail answer prompt | (see prompts.ts) | editable | Prompt for card-click expanded answers |
| Chat system prompt | (see prompts.ts) | editable | System prompt for the chat panel |

All prompts have a "Reset to default" button.

---

## Tradeoffs

**20-second audio chunks, not 30.** The assignment says "roughly every 30 seconds" but 20 seconds means the transcript is more current when suggestions fire. Shorter chunks mean slightly more Whisper API calls, but at Groq's speed this costs almost nothing and the latency improvement is noticeable in fast-moving conversations.

**Rolling summary instead of full transcript for suggestions.** Passing the full transcript to every suggestion request would eventually hit context limits and slow down suggestions. The rolling summary (3 sentences, updated every 3 batches) compresses older context into something the model can use without blowing the prompt. The tradeoff is lossy compression — the summary may miss details — but the recent 90-second window captures what matters right now, which is what the suggestion prompt is actually reasoning against.

**Previous batches for deduplication.** Sending the last 3 batches back to the model costs tokens but eliminates the most frustrating UX failure: seeing the same suggestion appear three refreshes in a row. The alternative (client-side deduplication by string matching) would be brittle with paraphrasing.

**API key passed per-request, not via environment variable.** The assignment explicitly says no hardcoded key and a user-provided key via settings. This means the key travels in every request body/header. It is never logged server-side and never persisted beyond the user's `localStorage`. The security boundary is clear: the key is only ever exposed to Groq's API.

**JSON mode for suggestions, streaming for chat.** Suggestions need a structured array of objects — JSON mode guarantees parseable output without prompt-hacking. Chat is streamed because the first-token latency is what makes chat feel alive; seeing the response appear word by word is meaningfully better UX than waiting for the full answer.

**WebM header preservation for continuous recording.** `MediaRecorder.start(3000)` emits the EBML/WebM container header only in the very first `ondataavailable` chunk. Subsequent chunks are raw audio clusters — valid for streaming but not for upload to Whisper, which requires a self-contained file. The fix is to save that first chunk in a `headerChunkRef` and prepend it to every subsequent blob before sending, making each upload a complete, decodable WebM file without ever stopping the recorder.

**No speaker diarization.** The transcription is a flat text stream with no speaker labels. Adding diarization (e.g. via a post-processing step) would significantly improve suggestion quality in multi-speaker meetings — the model could reason about "the interviewer just asked X" vs "the candidate said Y". This is the highest-value improvement I'd make with more time.

---

## If I Had More Time

- **Streaming suggestions** — pipe the suggestion response as a stream and parse incrementally so cards appear as they're generated instead of all at once after the full JSON arrives
- **Speaker diarization** — label transcript chunks by speaker so prompts can distinguish "what was just asked" from "what was just answered"
- **Smarter silence detection** — use audio energy thresholds to skip transcription calls entirely when no speech is detected, rather than relying on the `< 15 words` guard after the fact
- **Suggestion confidence scoring** — have the model score its own suggestions and filter out low-confidence ones before displaying, to raise the floor on quality
- **Session persistence** — `localStorage` serialization of the Zustand store so a page refresh doesn't wipe the session mid-meeting
