import { z } from 'zod';
import { MemoryRetention, MemoryScope } from '../../../generated/prisma';
import { MEMORY_CONTENT_MAX_CHARS } from '../../../common/constants/content-limits.constants';

export const approveSuggestionSchema = z.object({
  editedContent: z.string().min(1).max(MEMORY_CONTENT_MAX_CHARS).optional(),
  scope: z.nativeEnum(MemoryScope).optional(),
  scopeRef: z.string().max(255).optional(),
  retentionPolicy: z.nativeEnum(MemoryRetention).optional(),
  expiresAt: z.string().datetime().optional(),
});

export type ApproveSuggestionDto = z.infer<typeof approveSuggestionSchema>;
