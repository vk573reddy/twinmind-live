export type SuggestionKind =
  | "question_to_ask"
  | "talking_point"
  | "answer"
  | "fact_check"
  | "clarification";

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  preview: string;
  reasoning: string;
}

export interface SuggestionBatch {
  id: string;
  timestamp: number;
  suggestions: Suggestion[];
}

export interface TranscriptChunk {
  id: string;
  timestamp: number;
  text: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  kind?: SuggestionKind; // set when message came from clicking a card
}