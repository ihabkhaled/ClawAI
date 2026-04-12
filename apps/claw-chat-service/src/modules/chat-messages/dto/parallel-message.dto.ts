import { z } from 'zod';

export const parallelMessageSchema = z.object({
  threadId: z.string().max(255, 'Thread ID must be at most 255 characters'),
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
  fileIds: z
    .array(z.string().max(255, 'File ID must be at most 255 characters'))
    .max(10, 'Maximum 10 files per message')
    .optional(),
});

export type ParallelMessageDto = z.infer<typeof parallelMessageSchema>;
