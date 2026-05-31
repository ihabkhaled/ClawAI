// Mirrors the BE shape persisted on assistant message metadata under
// `toolTranscript` when an Ollama Cloud agentic model called web_search /
// web_fetch one or more times. The FE renders this as an expandable
// "Used X web tools" badge under the assistant bubble.
//
// BE source: apps/claw-chat-service/src/modules/chat-messages/types/ollama-cloud-tool.types.ts
// Persistence path: chat-messages.service.ts::buildToolTranscriptMetaPart

export type OllamaToolTranscriptTurn = {
  turn: number;
  tool: string;
  args: Record<string, unknown>;
  resultPreview: string;
  durationMs: number;
  ok: boolean;
  error?: string;
};

export type OllamaToolTranscript = {
  turns: OllamaToolTranscriptTurn[];
  iterations: number;
  capReached: boolean;
  totalDurationMs: number;
};

export type OllamaToolTranscriptPanelProps = {
  transcript: OllamaToolTranscript;
};

export type UseOllamaToolTranscriptPanelReturn = {
  open: boolean;
  toggle: () => void;
};
