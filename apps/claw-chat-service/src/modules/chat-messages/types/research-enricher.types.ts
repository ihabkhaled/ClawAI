// Types for the compare-mode research enricher. Extracted per the
// no-inline-declarations rule so the manager file stays small.

import { type ResearchMode } from '../../../common/enums/research-mode.enum';

export type ResearchEnrichInput = {
  mode: ResearchMode;
  query: string;
  /** Bearer header in the form `Bearer <token>` (forwarded to research-service). */
  userAuthHeader: string;
  /** Number of search hits to request from research-service. */
  topResults?: number;
  /** Number of URLs to fetch/extract after the search step. */
  topFetch?: number;
};

export type ResearchSource = {
  title: string;
  url: string;
  snippet?: string;
  extracted?: string;
};

export type ResearchEnrichResult = {
  /** Pre-formatted evidence block ready to prepend to a system prompt. */
  evidence: string;
  sources: ResearchSource[];
  mode: ResearchMode;
};

// ─── Wire shapes for research-service HTTP responses ───────────────────────

export type ResearchSearchEntry = {
  id?: string;
  title?: string | null;
  url: string;
  snippet?: string | null;
  publishedAt?: string | null;
  providerKind?: string | null;
};

export type ResearchSearchWireResponse = {
  runId?: string;
  providerKind?: string;
  results?: ResearchSearchEntry[];
  warnings?: string[];
};

export type ResearchFetchWireResponse = {
  url: string;
  finalUrl?: string;
  httpStatus?: number;
  mimeType?: string | null;
  title?: string | null;
  content?: string;
  links?: string[];
  byteSize?: number;
  cacheHit?: boolean;
  latencyMs?: number;
  rawHtml?: string;
};
