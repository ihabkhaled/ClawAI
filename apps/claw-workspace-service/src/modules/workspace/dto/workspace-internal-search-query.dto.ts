import { z } from 'zod';

import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_QUERY_LENGTH,
} from '../../../common/constants/workspace.constants';

export const workspaceInternalSearchQuerySchema = z.object({
  query: z.string().min(SEARCH_MIN_QUERY_LENGTH).max(SEARCH_MAX_QUERY_LENGTH),
  userId: z.string().min(1).max(128),
  limit: z.coerce.number().int().min(1).max(SEARCH_MAX_LIMIT).default(SEARCH_DEFAULT_LIMIT),
});

export type WorkspaceInternalSearchQueryDto = z.infer<typeof workspaceInternalSearchQuerySchema>;
