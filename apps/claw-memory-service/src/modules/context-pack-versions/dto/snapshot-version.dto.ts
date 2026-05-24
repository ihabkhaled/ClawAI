import { z } from 'zod';

export const snapshotVersionSchema = z.object({
  summary: z.string().max(255).optional(),
});

export type SnapshotVersionDto = z.infer<typeof snapshotVersionSchema>;
