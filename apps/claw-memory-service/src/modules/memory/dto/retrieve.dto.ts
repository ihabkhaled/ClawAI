import { z } from 'zod';

export const retrieveRequestSchema = z.object({
  userId: z.string().min(1).max(255),
  threadId: z.string().max(255).optional(),
  workspaceId: z.string().max(255).optional(),
  projectId: z.string().max(255).optional(),
  intent: z.string().max(8192).default(''),
  attachedPackIds: z.array(z.string().max(255)).max(20).default([]),
  attachedMemoryIds: z.array(z.string().max(255)).max(40).default([]),
  tokenBudget: z.number().int().min(64).max(200_000).default(4096),
  includeMemory: z.boolean().default(true),
  includeContext: z.boolean().default(true),
  semanticBudgetMemory: z.number().int().min(0).max(50).optional(),
  semanticBudgetContext: z.number().int().min(0).max(100).optional(),
});

export const recordUsageRequestSchema = z.object({
  rows: z
    .array(
      z.object({
        memoryId: z.string().min(1).max(255),
        userId: z.string().min(1).max(255),
        threadId: z.string().min(1).max(255),
        messageId: z.string().min(1).max(255),
        score: z.number().min(0).max(1),
        reason: z.string().max(128),
      }),
    )
    .max(100),
});

export type RetrieveRequestDto = z.infer<typeof retrieveRequestSchema>;
export type RecordUsageRequestDto = z.infer<typeof recordUsageRequestSchema>;
