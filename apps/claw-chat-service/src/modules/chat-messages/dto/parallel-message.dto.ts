import { z } from 'zod';
import { ResearchMode } from '../../../common/enums/research-mode.enum';

export const parallelMessageSchema = z
  .object({
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
    // Critic toggle + model. The critic is a second-pass review the judge sees;
    // when criticEnabled is true, criticModel MUST be provided AND judgeEnabled
    // MUST also be true (refined below). Backend asserts the new plan feature
    // `allowCriticReview` (see AccessControlService).
    criticEnabled: z.boolean().optional().default(false),
    criticModel: z
      .string()
      .max(200, 'Critic model must be at most 200 characters')
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
  })
  .superRefine((value, ctx) => {
    if (value.criticEnabled !== true) {
      return;
    }
    if (value.judgeEnabled !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['criticEnabled'],
        message: 'criticEnabled requires judgeEnabled to be true',
      });
    }
    const trimmed = value.criticModel?.trim() ?? '';
    if (trimmed.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['criticModel'],
        message: 'criticModel must be provided when criticEnabled is true',
      });
    }
  });

export type ParallelMessageDto = z.infer<typeof parallelMessageSchema>;
