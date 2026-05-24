import { z } from 'zod';

import { AgentSuggestionStatusEnum } from '../enums/agent-suggestion-status.enum';

/**
 * V2 Stream 05 — DTOs for AgentSuggestion endpoints.
 */

export const listSuggestionsQuerySchema = z.object({
  status: z.nativeEnum(AgentSuggestionStatusEnum).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListSuggestionsQueryDto = z.infer<typeof listSuggestionsQuerySchema>;

export const reviewSuggestionSchema = z.object({
  status: z.enum(['ACCEPTED', 'DISMISSED']),
});

export type ReviewSuggestionDto = z.infer<typeof reviewSuggestionSchema>;
