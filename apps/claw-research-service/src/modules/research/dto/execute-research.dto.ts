import { z } from 'zod';

import { ResearchWorkflowKind } from '../../../common/enums/research-workflow-kind.enum';
import {
  SEARCH_MAX_MAX_RESULTS,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_QUERY_LENGTH,
} from '../../../common/constants/search.constants';
import { ExtractionProfile } from '../../scrape/enums/extraction-profile.enum';

export const executeResearchSchema = z.object({
  intent: z.string().min(SEARCH_MIN_QUERY_LENGTH).max(SEARCH_MAX_QUERY_LENGTH),
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
});

export type ExecuteResearchDto = z.infer<typeof executeResearchSchema>;
