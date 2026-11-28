/**
 * Shape of a research run returned by claw-research-service. Mirrored from
 * `apps/claw-research-service/src/modules/research/types/evidence-bundle.types.ts`
 * — we only type the fields the chat layer actually reads.
 */

import type { ResearchPlatformCategory } from '../../../common/enums/research-platform-category.enum';
import type { ResearchRenderHint } from '../../../common/enums/research-render-hint.enum';
import type { ResearchWorkflow } from '../../../common/enums/research-workflow.enum';

/** How a page was read (research-service `EvidenceFetchProvenance`): tier kind + trail of kind/outcome. */
export type ResearchFetchProvenance = {
  strategy: string;
  attempts: Array<{ kind: string; outcome: string }>;
};

export type ResearchEvidenceItem = {
  id: string;
  title: string | null;
  url: string;
  snippet: string;
  source: string;
  providerKind: string | null;
  publishedAt: string | null;
  fetchedAt: string | null;
  confidence: number;
  /** Which fetch tier served this page; absent for search hits and cache hits. */
  fetch?: ResearchFetchProvenance;
  /** B1/B2 provenance (additive): the query that found it, its round, a content hash, thread-memory reuse. */
  query?: string;
  round?: number;
  contentHash?: string;
  reusedFromRunId?: string;
};

export type ResearchEvidenceBundle = {
  intent: string;
  workflow: string;
  requestedModel: string | null;
  requestedProvider: string | null;
  providerSelection: {
    providerId: string | null;
    providerName: string | null;
    providerKind: string | null;
    selectionMode: 'explicit' | 'auto';
    fallbackUsed: boolean;
    attemptedProviders: string[];
  };
  helperModels: string[];
  toolsUsed: string[];
  items: ResearchEvidenceItem[];
  warnings: string[];
  generatedAt: string;
  mode: string;
  /** What the run did (B1/B2); absent on an older research-service. */
  stats?: ResearchBundleStats;
};

export type ResearchRunResponse = {
  id: string;
  userId: string;
  requestedModel: string | null;
  requestedProvider: string | null;
  workflow: string;
  intent: string;
  status: string;
  bundle: ResearchEvidenceBundle | Record<string, never>;
  trace: Array<{
    phase: string;
    status: string;
    latencyMs: number | null;
    message: string | null;
    timestamp: string;
  }>;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

/** research-service `ToolFetchView`: one page as a tool-calling model is shown it. */
export type ResearchToolFetchView = {
  url: string;
  title: string | null;
  content: string;
  links: string[];
  servedBy: string | null;
  archivedAt: string | null;
};

/** Result of `fetchPageViaResearch`: the page, or why research-service refused or failed it. */
export type ResearchToolFetchOutcome =
  { ok: true; view: ResearchToolFetchView } | { ok: false; status: number; message: string };

export type ResearchRequest = {
  userToken: string;
  userId: string;
  intent: string;
  workflow: ResearchWorkflow;
  searchProviderId?: string;
  requestedModel?: string;
  requestedProvider?: string;
  maxResults?: number;
  /**
   * Set to the thread id so `ResearchProgressBridgeService` can route
   * SITE_CRAWL progress ticks (published by research-service on
   * `RESEARCH_CRAWL_PROGRESS_CHANNEL`) back to this thread's SSE stream.
   * Harmless to send for every workflow — research-service ignores it
   * outside SITE_CRAWL.
   */
  correlationId?: string;
  /** Pages a SITE_CRAWL may read, chosen by the planner. */
  maxPages?: number;
  /** The planner's tier-ordering hint for the pages it opens (ADR-121 addendum 3). */
  render?: ResearchRenderHint;
  /** A planner-written search query, used instead of the raw prompt. */
  searchQuery?: string;
  /** Overrides the workflow's default HTTP timeout; set only by the research gateway. */
  timeoutMs?: number;
  // ── Research engine B1/B2 (2026-11-27): all optional and additive; sent only when set (`runResearch`). ──
  /** The chat thread (≤ 64 chars): research-service stores the run and its sources against it (thread memory). */
  threadId?: string;
  /** Extra search queries (the council's sub-questions minus the primary query), ≤ 12, each ≤ 300 chars. */
  queries?: string[];
  /** ISO 639-1/-3 lower-case codes (`/^[a-z]{2,3}$/`), ≤ 6. */
  languages?: string[];
  /** Research depth 0-5 (chat clamps to `RESEARCH_MAX_DEPTH`); sizes a search run's query count and pages read. */
  depth?: number;
  /** Source kinds (≤ 6) research-service also searches through its platform registry from depth 2 (B3). */
  platforms?: ResearchPlatformCategory[];
  /** Which research round of this turn (1-5). */
  round?: number;
  /** URLs already read earlier in this turn (≤ 60): research-service never fetches them again in this run. */
  excludeUrls?: string[];
};

/** research-service `bundle.stats` (B1/B2, additive): what one run did. Read defensively — old runs have none. */
export type ResearchBundleStats = {
  round?: number;
  queriesRun?: number;
  queries?: string[];
  languages?: string[];
  platforms?: string[];
  providersUsed?: string[];
  resultsFound?: number;
  pagesRead?: number;
  duplicatesRemoved?: number;
  reusedFromThread?: number;
  cachedSearches?: number;
};

/** A research request minus what each step sets for itself (the intent and the workflow). */
export type ResearchRequestBase = Omit<ResearchRequest, 'intent' | 'workflow'>;
