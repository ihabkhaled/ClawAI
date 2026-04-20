import { z } from 'zod';

export const fetchRequestSchema = z.object({
  url: z.string().url().max(2048),
  timeoutMs: z.number().int().min(500).max(60_000).optional(),
  refresh: z.boolean().optional(),
});

export type FetchRequestDto = z.infer<typeof fetchRequestSchema>;
