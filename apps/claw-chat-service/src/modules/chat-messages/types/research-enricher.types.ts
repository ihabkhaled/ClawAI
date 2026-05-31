// Types for the compare-mode research enricher. Extracted per the
// no-inline-declarations rule so the manager file stays small.

import { type ResearchMode } from '../../../common/enums/research-mode.enum';
import { type ResearchTranscript } from './research-transcript.types';

export type ResearchEnrichInput = {
  mode: ResearchMode;
  query: string;
  /** Bearer header in the form `Bearer <token>` (forwarded to research-service). */
  userAuthHeader: string;
  /** Number of search hits to request from research-service. */
  topResults?: number;
  /** Number of URLs to fetch/extract after the search step. */
  topFetch?: number;
  /**
   * Thread id for the live SSE stream. When provided, the enricher emits
   * RESEARCH_PROGRESS lifecycle frames (started / sources_found / fetching /
   * completed / failed) on the chat-service SSE bus so the FE rich-progress
   * panel can show live web-research activity. Omit it for callers that
   * don't have a thread (tests, background batch jobs).
   */
  threadId?: string;
};

// ─── Orchestration-shared input/output ─────────────────────────────────────
// Used by EVERY orchestration manager (consensus, escalation, repair,
// decompose, best-of-n, cost-ensemble, verify, pipeline, role-pack) to share
// the SAME web-research enrichment pipeline that parallel/compare already
// runs. The manager calls `enrichForOrchestration` ONCE at the top of its
// background execution method, prepends `systemPrompt` to whatever system
// prompt it would otherwise pass, and persists `transcript` on every
// assistant ChatMessage it writes (via `metadata.researchTranscript`).

export type ResearchOrchestrationInput = {
  /** Stream thread id for live SSE rich-progress frames. */
  threadId: string;
  /** Selected research mode (NONE / SEARCH / SEARCH_FETCH / SEARCH_EXTRACT). */
  mode: ResearchMode | undefined;
  /** User-typed query (almost always the user message content). */
  query: string;
  /**
   * Raw bearer token (no `Bearer ` prefix). Empty string is allowed — the
   * helper returns an empty-transcript + warning when no token is available.
   */
  userToken: string;
  /** Optional provider id requested by the user, persisted on the transcript. */
  providerId?: string;
};

export type ResearchOrchestrationResult = {
  /**
   * Null when mode=NONE/undefined OR enrichment was skipped (no token).
   * Non-null on success AND on transparent failure (warnings populated).
   */
  transcript: ResearchTranscript | null;
  /**
   * Evidence block ready to PREPEND to the manager's system prompt. Empty
   * string when there was nothing to enrich with — caller can safely
   * concatenate without further guards.
   */
  systemPrompt: string;
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
