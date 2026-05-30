import { z } from 'zod';
import { ResearchMode } from '../../../common/enums/research-mode.enum';

export const parallelMessageSchema = z.object({
  threadId: z.string().max(255, 'Thread ID must be at most 255 characters').optional(),
  content: z
    .string()
    .min(1, 'Content must not be empty')
    .max(100_000, 'Content must be at most 100000 characters'),
  models: z
    .array(
      z.object({
        provider: z.string().max(50, 'Provider must be at most 50 characters'),
        model: z.string().max(255, 'Model must be at most 255 characters'),
      }),
    )
    .min(2, 'At least 2 models are required')
    .max(5, 'At most 5 models are allowed'),
  judgeEnabled: z.boolean().optional(),
  judgeModel: z
    .string()
    .max(255, 'Judge model must be at most 255 characters')
    .optional()
    .nullable(),
  fileIds: z
    .array(z.string().max(255, 'File ID must be at most 255 characters'))
    .max(10, 'Maximum 10 files per message')
    .optional(),
  // Compare-mode research enricher (added 2026-05-30). The user picks ONE of
  // four modes; the chat-service calls research-service before parallel lane
  // execution and pre-pends formatted evidence to the shared system prompt so
  // every lane sees the same web evidence. NONE preserves v1 behavior.
  // Distinct from the per-message ResearchWorkflow on createMessageSchema.
  researchMode: z.nativeEnum(ResearchMode).default(ResearchMode.NONE).optional(),
  researchQuery: z
    .string()
    .max(500, 'Research query must be at most 500 characters')
    .optional(),
  researchProviderId: z
    .string()
    .max(64, 'Research provider id must be at most 64 characters')
    .optional(),
});

export type ParallelMessageDto = z.infer<typeof parallelMessageSchema>;
