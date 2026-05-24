import { z } from 'zod';
import { MemorySuggestionStatus } from '../../../generated/prisma';

export const listMemorySuggestionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(MemorySuggestionStatus).optional(),
});

export type ListMemorySuggestionsQueryDto = z.infer<typeof listMemorySuggestionsQuerySchema>;
