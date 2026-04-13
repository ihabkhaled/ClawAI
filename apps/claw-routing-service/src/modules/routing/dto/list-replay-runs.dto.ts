import { z } from 'zod';

export const listReplayRunsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListReplayRunsDto = z.infer<typeof listReplayRunsSchema>;
