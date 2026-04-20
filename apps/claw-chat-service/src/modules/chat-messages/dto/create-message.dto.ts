import { z } from 'zod';
import { RoutingMode } from '../../../generated/prisma';

export const researchModeSchema = z.enum([
  'OFF',
  'SEARCH_ONLY',
  'SEARCH_THEN_FETCH',
  'SEARCH_FETCH_EXTRACT',
]);

export const createMessageSchema = z.object({
  threadId: z.string().max(255, 'Thread ID must be at most 255 characters'),
  content: z
    .string()
    .min(1, 'Content must not be empty')
    .max(100000, 'Content must be at most 100000 characters'),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  provider: z.string().max(50, 'Provider must be at most 50 characters').optional(),
  model: z.string().max(255, 'Model must be at most 255 characters').optional(),
  fileIds: z.array(z.string().max(255)).max(10, 'Maximum 10 files per message').optional(),
  researchMode: researchModeSchema.optional(),
  researchProviderId: z.string().max(64, 'Research provider id too long').optional(),
});

export type CreateMessageDto = z.infer<typeof createMessageSchema>;
export type ResearchMode = z.infer<typeof researchModeSchema>;
