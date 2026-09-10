// Mirrors the BE shape persisted on assistant message metadata under
// `researchTranscript` when the research enricher (search / search+fetch /
// search+extract) produced one or more evidence items for the answer. The
// FE renders this as a collapsible badge under the assistant bubble. It used
// to read "Used N sources" over `sources.length` — the deduped MIX of search
// hits and fetch results — so it announced four sources when four links were
// discovered and zero pages may have been read. It now reports pages read and
// links found as two different numbers, because they are.
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
  // Which tool produced this entry: `search` (a link the engine listed),
  // `fetch` / `scrape` (a page actually opened). Absent on older messages.
  source?: string;
};

export type ResearchTranscript = {
  sources: ResearchTranscriptSource[];
  searchRequestCount?: number;
  fetchRequestCount?: number;
  /** Pages whose CONTENT reached the model. Absent on messages written before 2026-09-10. */
  pagesRead?: number;
  /** Links the search engine listed, read or not. */
  linksFound?: number;
};

export type ResearchTranscriptPanelProps = {
  transcript: ResearchTranscript;
};

export type UseResearchTranscriptPanelReturn = {
  open: boolean;
  toggle: () => void;
  /** What the badge claims. Never a stronger claim than the data supports. */
  title: string;
  /** Whether this message carries the measured counts at all. */
  isMeasured: boolean;
  linksFoundLabel: string | null;
  searchRequestsLabel: string;
  fetchRequestsLabel: string;
};
