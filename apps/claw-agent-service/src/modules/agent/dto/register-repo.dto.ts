import { z } from 'zod';

export const registerRepoSchema = z.object({
  sessionId: z.string().cuid(),
  repoPath: z.string().min(1).max(1024),
  name: z.string().min(1).max(255),
  branch: z.string().max(255).optional(),
  commitHash: z.string().max(40).optional(),
  isDirty: z.boolean().default(false),
  fileCount: z.number().int().nonnegative().default(0),
});

export type RegisterRepoDto = z.infer<typeof registerRepoSchema>;
