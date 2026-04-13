import { z } from 'zod';

export const costEnsembleMessageSchema = z.object({
  content: z.string().min(1).max(10_000),
  threadId: z.string().max(255).optional(),
});

export type CostEnsembleMessageDto = z.infer<typeof costEnsembleMessageSchema>;
