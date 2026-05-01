import { z } from 'zod';

import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import {
  INBOX_DEFAULT_PAGE_SIZE,
  INBOX_MAX_PAGE_SIZE,
  SEARCH_DEFAULT_TOP_K,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_QUERY_LENGTH,
} from '../constants/inbox.constants';

export const inboxQuerySchema = z.object({
  providers: z.string().optional(),
  types: z.string().optional(),
  needsAttention: z.string().optional(),
  hasSuggestion: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(INBOX_MAX_PAGE_SIZE).default(INBOX_DEFAULT_PAGE_SIZE),
});

export const searchBodySchema = z
  .object({
    query: z.string().min(SEARCH_MIN_QUERY_LENGTH).max(SEARCH_MAX_QUERY_LENGTH),
    topK: z.number().int().min(1).max(200).default(SEARCH_DEFAULT_TOP_K).optional(),
    providers: z.array(z.nativeEnum(WorkspaceProvider)).max(20).optional(),
  })
  .strict();

export const needsAttentionSchema = z.object({ needsAttention: z.boolean() }).strict();

export type InboxQueryDto = z.infer<typeof inboxQuerySchema>;
export type SearchBodyDto = z.infer<typeof searchBodySchema>;
export type NeedsAttentionDto = z.infer<typeof needsAttentionSchema>;
