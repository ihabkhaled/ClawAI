import { z } from 'zod';

export const classifySchema = z.object({
  messageContent: z.string().min(1).max(50_000),
  attachedFileMimeTypes: z.array(z.string().min(1).max(200)).max(50).optional(),
});

export type ClassifyDto = z.infer<typeof classifySchema>;
