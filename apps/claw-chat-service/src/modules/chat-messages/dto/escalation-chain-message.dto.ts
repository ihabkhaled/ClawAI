import { z } from 'zod';

const escalationStepSchema = z.object({
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(255),
  qualityThreshold: z.number().min(0).max(1).optional(),
});

export const escalationChainMessageSchema = z.object({
  threadId: z.string().max(255).optional(),
  content: z.string().min(1).max(100_000),
  chain: z.array(escalationStepSchema).min(2).max(5),
  fileIds: z.array(z.string().max(255)).max(10).optional(),
});

export type EscalationChainMessageDto = z.infer<typeof escalationChainMessageSchema>;
