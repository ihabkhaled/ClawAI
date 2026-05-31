import { z } from 'zod';
import { RoutingMode } from '../../../generated/prisma';
import { ResearchMode } from '../../../common/enums/research-mode.enum';

// Canonical research-mode schema for every chat DTO. Replaces the inline
// OFF/SEARCH_ONLY/SEARCH_THEN_FETCH/SEARCH_FETCH_EXTRACT string union that
// previously coexisted with the NONE/SEARCH/SEARCH_FETCH/SEARCH_EXTRACT
// enum used by the compare DTO — chat-messages.service.ts was comparing
// against BOTH dialects which silently mismatched. ResearchMode (single
// source of truth) is exported from src/common/enums and re-used here.
export const researchModeSchema = z.nativeEnum(ResearchMode);

export const createMessageSchema = z.object({
  threadId: z.string().max(255, 'Thread ID must be at most 255 characters'),
  content: z
    .string()
    .min(1, 'Content must not be empty')
    .max(100000, 'Content must be at most 100000 characters'),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  provider: z.string().max(50, 'Provider must be at most 50 characters').optional(),
  model: z.string().max(255, 'Model must be at most 255 characters').optional(),
  modelDisplayName: z
    .string()
    .max(255, 'Model display name must be at most 255 characters')
    .optional(),
  fileIds: z.array(z.string().max(255)).max(10, 'Maximum 10 files per message').optional(),
  researchMode: researchModeSchema.optional(),
  researchProviderId: z.string().max(64, 'Research provider id too long').optional(),
});

export type CreateMessageDto = z.infer<typeof createMessageSchema>;
// Re-export the enum value-type for downstream consumers. Phase 2 will
// migrate every `import { ResearchMode } from '.../dto/create-message.dto'`
// to import directly from `src/common/enums/research-mode.enum` so the
// type-vs-value distinction collapses too.
export { ResearchMode };
