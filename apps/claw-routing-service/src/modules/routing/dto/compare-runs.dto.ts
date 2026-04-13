import { z } from 'zod';

export const compareRunsSchema = z.object({
  runId1: z.string().min(1).max(128),
  runId2: z.string().min(1).max(128),
});

export type CompareRunsDto = z.infer<typeof compareRunsSchema>;
