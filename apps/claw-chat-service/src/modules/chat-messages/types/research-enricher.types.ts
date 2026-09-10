// Types for the compare-mode research enricher. Extracted per the
// no-inline-declarations rule so the manager file stays small.

import { type ResearchMode } from '../../../common/enums/research-mode.enum';
import { type ResearchTranscript } from './research-transcript.types';

export type ResearchEnrichInput = {
  mode: ResearchMode;
  query: string;
  /**
   * The search provider the USER chose.
   *
   * Absent from this type until 2026-09-11, which is why the composer's
   * provider dropdown was decorative on every compare and orchestration flow:
   * the enricher's outbound body was literally `{ query, maxResults }`, so
   * research-service took its AUTO branch and picked the top of a score map —
   * while the transcript went on recording the provider the user had picked.
   * The UI reported a provider that did not run.
   */
  providerId?: string;
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
  searchRequestCount: number;
  fetchRequestCount: number;
  /**
   * The provider that ACTUALLY ran, as reported by research-service.
   *
   * Not the one that was requested. They differ whenever selection falls back,
   * and a transcript that records the request rather than the outcome is how
   * the UI came to name a provider that never executed.
   */
  providerId?: string;
  providerName?: string;
  /** True when the requested provider failed and another one answered. */
  fallbackUsed?: boolean;
};

/**
 * The provider fields carried out of a search, extracted rather than written as
 * a `Pick<..., 'a' | 'b'>` because the eslint config bans string-literal unions
 * in logic files — and a named type is what the next reader wants anyway.
 */
export type ResearchProviderOutcome = {
  providerId?: string;
  providerName?: string;
  fallbackUsed?: boolean;
};

export type ResearchSearchOutcome = {
  entries: ResearchSearchEntry[];
  requestCount: number;
  /** Provider that answered, echoed from research-service. */
  providerId?: string;
  providerName?: string;
  fallbackUsed?: boolean;
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
  providerId?: string;
  providerName?: string;
  providerKind?: string;
  selectionMode?: string;
  fallbackUsed?: boolean;
  results?: ResearchSearchEntry[];
  warnings?: string[];
  searchRequestCount?: number;
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
