import { z } from 'zod';

// chat-service reports that a provider answered "this model does not exist"
// for a model its catalog still lists (ADR-151).
export const recordModelUnavailableSchema = z.object({
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(300),
});
export type RecordModelUnavailableDto = z.infer<typeof recordModelUnavailableSchema>;
