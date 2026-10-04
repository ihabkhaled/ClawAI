import { z } from 'zod';

export const threadSnapshotRequestSchema = z.object({
  userId: z.string().min(1).max(128),
});

export type ThreadSnapshotRequestDto = z.infer<typeof threadSnapshotRequestSchema>;
