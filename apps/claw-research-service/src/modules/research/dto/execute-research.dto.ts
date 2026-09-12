import { z } from 'zod';

import { ResearchWorkflowKind } from '../../../common/enums/research-workflow-kind.enum';
import {
  RESEARCH_MAX_INTENT_LENGTH,
  SEARCH_MAX_MAX_RESULTS,
  SEARCH_MIN_QUERY_LENGTH,
} from '../../../common/constants/search.constants';
import { ExtractionProfile } from '../../scrape/enums/extraction-profile.enum';

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
});

export type ExecuteResearchDto = z.infer<typeof executeResearchSchema>;
