import { z } from 'zod';

export const createCommandSchema = z.object({
  sessionId: z.string().cuid(),
  command: z.string().min(1).max(4096),
  workingDir: z.string().max(1024).optional(),
});

export type CreateCommandDto = z.infer<typeof createCommandSchema>;
