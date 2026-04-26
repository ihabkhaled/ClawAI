import { z } from 'zod';

export const internalGenerateSchema = z
  .object({
    provider: z.string().min(1).max(100),
    model: z.string().min(1).max(200),
    systemPrompt: z.string().min(1).max(10_000),
    userPrompt: z.string().min(1).max(200_000),
    maxTokens: z.number().int().positive().max(32_768).optional(),
  })
  .strict();

export type InternalGenerateDto = z.infer<typeof internalGenerateSchema>;
