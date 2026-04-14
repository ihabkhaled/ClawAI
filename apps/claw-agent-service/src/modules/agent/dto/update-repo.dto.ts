import { z } from 'zod';

export const updateRepoSchema = z.object({
  branch: z.string().max(255).optional(),
  commitHash: z.string().max(40).optional(),
  isDirty: z.boolean().optional(),
  fileCount: z.number().int().nonnegative().optional(),
  name: z.string().min(1).max(255).optional(),
});

export type UpdateRepoDto = z.infer<typeof updateRepoSchema>;
