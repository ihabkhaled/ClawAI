import { z } from 'zod';

import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_QUERY_LENGTH,
} from '../../../common/constants/workspace.constants';

export const workspaceSearchQuerySchema = z.object({
  query: z.string().min(SEARCH_MIN_QUERY_LENGTH).max(SEARCH_MAX_QUERY_LENGTH),
  limit: z.coerce.number().int().min(1).max(SEARCH_MAX_LIMIT).default(SEARCH_DEFAULT_LIMIT),
  types: z.array(z.nativeEnum(WorkspaceObjectType)).max(14).optional(),
  providers: z.array(z.nativeEnum(WorkspaceProvider)).max(10).optional(),
});

export type WorkspaceSearchQueryDto = z.infer<typeof workspaceSearchQuerySchema>;
