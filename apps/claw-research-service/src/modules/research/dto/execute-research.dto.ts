import { z } from 'zod';

import { ResearchWorkflowKind } from '../../../common/enums/research-workflow-kind.enum';
import {
  RESEARCH_MAX_INTENT_LENGTH,
  SEARCH_MAX_MAX_RESULTS,
  SEARCH_MIN_QUERY_LENGTH,
} from '../../../common/constants/search.constants';
import { FetchRenderHint } from '../../fetch/enums/fetch-render-hint.enum';
import { ExtractionProfile } from '../../scrape/enums/extraction-profile.enum';
import { CRAWL_MAX_PAGES_CEILING } from '../../../common/constants/crawl.constants';
import {
  RESEARCH_EXCLUDE_URL_MAX_LENGTH,
  RESEARCH_EXPANSION_QUERY_MAX_LENGTH,
  RESEARCH_LANGUAGE_CODE_PATTERN,
  RESEARCH_MAX_DEPTH,
  RESEARCH_MAX_EXCLUDE_URLS,
  RESEARCH_MAX_EXPANSION_QUERIES,
  RESEARCH_MAX_LANGUAGES,
  RESEARCH_MAX_PLATFORM_CATEGORIES,
  RESEARCH_MAX_ROUND,
  RESEARCH_THREAD_ID_MAX_LENGTH,
} from '../../../common/constants/research-engine.constants';
import { PlatformCategory } from '../../../generated/prisma';

export const executeResearchSchema = z.object({
  /**
   * The user's prompt, not a search query.
   *
   * Capped at SEARCH_MAX_QUERY_LENGTH (500) until 2026-09-11, which meant a
   * prompt longer than that 400'd the whole run: chat-service swallowed the
   * failure to null, produced no transcript and raised no warning, so research
   * was silently disabled by writing a long message. The derived search query
   * is clamped instead, with a warning.
   */
  intent: z.string().min(SEARCH_MIN_QUERY_LENGTH).max(RESEARCH_MAX_INTENT_LENGTH),
  workflow: z.nativeEnum(ResearchWorkflowKind).default(ResearchWorkflowKind.SEARCH_ONLY),
  /** Provider id for search — optional; falls back to first-enabled. */
  searchProviderId: z.string().max(64).optional(),
  /** Preserved through the run and returned in the bundle. */
  requestedModel: z.string().max(200).optional(),
  requestedProvider: z.string().max(64).optional(),
  maxResults: z.number().int().min(1).max(SEARCH_MAX_MAX_RESULTS).optional(),
  /** Evidence bundle mode — "detailed" or "compressed". */
  mode: z.enum(['detailed', 'compressed']).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  /**
   * Scrape profile applied by SEARCH_FETCH_EXTRACT. Defaults to ARTICLE.
   * Ignored by other workflows.
   */
  extractionProfile: z.nativeEnum(ExtractionProfile).optional(),
  /**
   * Opaque caller-supplied id for routing SITE_CRAWL progress ticks
   * (`RESEARCH_CRAWL_PROGRESS_CHANNEL`) back to whoever is waiting on this
   * run — chat-service sets it to the thread id. Not persisted as anything
   * meaningful here; research-service never interprets it. Ignored by every
   * workflow except SITE_CRAWL, since only that one runs long enough for
   * intermediate progress to matter.
   */
  correlationId: z.string().max(128).optional(),
  /**
   * How many pages a SITE_CRAWL may read. Chosen by chat-service's planner from
   * the question ("summarise this page" vs "what does this whole site offer").
   * Bounded by CRAWL_MAX_PAGES_CEILING; omitted means CRAWL_DEFAULT_MAX_PAGES.
   */
  maxPages: z.number().int().min(1).max(CRAWL_MAX_PAGES_CEILING).optional(),
  /**
   * A search query written by the planner, used instead of the clamped prompt.
   * A prompt is not a query: "compare what example.com charges with its
   * competitors" searches far better as "example.com competitors pricing".
   */
  /**
   * The planner model's guess that the named page needs JS rendering or
   * anti-bot handling. Reorders fetch tiers for the pages the user named only;
   * every robots/SSRF/refusal invariant still applies (ADR-121 addendum 3).
   */
  render: z.nativeEnum(FetchRenderHint).optional(),
  searchQuery: z.string().min(SEARCH_MIN_QUERY_LENGTH).max(500).optional(),
  /*
   * Research engine B1+B2 (2026-11-28). All optional and additive: a request
   * that sends none of them runs exactly today's pipeline (no cache, no stats).
   */
  /** The chat thread: enables thread memory and is stored on the run and its sources. */
  threadId: z.string().min(1).max(RESEARCH_THREAD_ID_MAX_LENGTH).optional(),
  /** Extra search queries (expansion). The primary query stays `searchQuery ?? intent`. */
  queries: z
    .array(z.string().trim().min(SEARCH_MIN_QUERY_LENGTH).max(RESEARCH_EXPANSION_QUERY_MAX_LENGTH))
    .max(RESEARCH_MAX_EXPANSION_QUERIES)
    .optional(),
  /** ISO 639-1/-3 lower-case codes; recorded now, used for retrieval in B3. */
  languages: z
    .array(z.string().regex(RESEARCH_LANGUAGE_CODE_PATTERN))
    .max(RESEARCH_MAX_LANGUAGES)
    .optional(),
  /** Research depth 0-5: drives query count and pages fetched (`RESEARCH_DEPTH_BUDGETS`). */
  depth: z.number().int().min(0).max(RESEARCH_MAX_DEPTH).optional(),
  /** Which research round of this turn; stored on sources, echoed in `bundle.stats`. */
  round: z.number().int().min(1).max(RESEARCH_MAX_ROUND).optional(),
  /** URLs already read earlier in this turn: never fetched again, search hits for them dropped. */
  excludeUrls: z
    .array(z.string().min(1).max(RESEARCH_EXCLUDE_URL_MAX_LENGTH))
    .max(RESEARCH_MAX_EXCLUDE_URLS)
    .optional(),
  /**
   * Research engine B3: platform categories the council asked for. Used only
   * with `depth >= 2` (official APIs + site searches of those categories);
   * otherwise ignored, and it never switches a request into engine mode alone.
   */
  platforms: z
    .array(z.nativeEnum(PlatformCategory))
    .max(RESEARCH_MAX_PLATFORM_CATEGORIES)
    .optional(),
});

export type ExecuteResearchDto = z.infer<typeof executeResearchSchema>;
