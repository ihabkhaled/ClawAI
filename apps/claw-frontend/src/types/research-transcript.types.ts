// Mirrors the BE shape persisted on assistant message metadata under
// `researchTranscript` when the research enricher (search / search+fetch /
// search+extract) produced one or more evidence items for the answer. The
// FE renders this as a collapsible "Used N sources" badge under the
// assistant bubble.
//
// BE source: chat-service persists this on ChatMessage.metadata.researchTranscript
// once the enricher pipeline returns a non-empty evidence list.
export type ResearchTranscriptSource = {
  title: string;
  url: string;
  snippet: string;
  // Extracted text (markdown / plain text). Present when the run used
  // SEARCH_FETCH or SEARCH_EXTRACT and the fetch/extract step succeeded.
  extracted?: string;
  // 0..1 relevance score from the search provider, when available.
  score?: number;
  // Per-source fetch/extract latency in ms, when available.
  latencyMs?: number;
};

export type ResearchTranscript = {
  sources: ResearchTranscriptSource[];
};

export type ResearchTranscriptPanelProps = {
  transcript: ResearchTranscript;
};

export type UseResearchTranscriptPanelReturn = {
  open: boolean;
  toggle: () => void;
};
