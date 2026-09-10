// Normalized research-transcript shape persisted on every assistant
// ChatMessage that ran the ResearchEnricherManager. Mirrors the
// buildToolTranscriptMetaPart pattern: a single typed metadata fragment that
// the FE renders under an expandable "Used N web sources" badge after a page
// refresh. Distinct from the legacy `metadata.research` bundle (full
// EvidenceBundle from /research/runs) — this is the lightweight enricher's
// flat source list with timing + warnings.

import type { ResearchMode } from '../../../common/enums/research-mode.enum';

export type ResearchTranscriptSource = {
  title: string;
  url: string;
  snippet?: string;
  extracted?: string;
  score?: number;
  /**
   * Which tool produced this entry: `search` (a link the engine listed),
   * `fetch` (a page actually opened), `scrape` (a page opened and parsed) or
   * `repo`.
   *
   * Dropped entirely until 2026-09-10, which is why the panel could not tell
   * the difference between a link it had found and a page it had read — and
   * counted both as "sources".
   */
  source?: string;
};

export type ResearchTranscript = {
  mode: ResearchMode;
  providerId?: string;
  providerName?: string;
  query: string;
  sources: ResearchTranscriptSource[];
  latencyMs: number;
  warnings: string[];
  searchRequestCount: number;
  fetchRequestCount: number;
  /**
   * Pages whose CONTENT reached the model, i.e. items produced by a fetch or a
   * scrape.
   *
   * The badge above this used to read `sources.length`, which is the deduped
   * mix of search hits and fetch results. In `SEARCH_FETCH_EXTRACT`,
   * `maxResults` defaults to 4 and fetching tops out at 3 with every failure
   * downgraded to a warning — so "Used 4 sources" was emitted when four links
   * were DISCOVERED and zero may have been read.
   */
  pagesRead: number;
  /** Links the search engine listed, read or not. */
  linksFound: number;
};
