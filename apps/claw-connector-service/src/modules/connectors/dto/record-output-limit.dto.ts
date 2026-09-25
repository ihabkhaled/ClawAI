import { z } from 'zod';

// chat-service reports an output ceiling a provider stated while refusing a
// request ("must be less than or equal to `16384`"). Bounded: a ceiling below
// 1 or above 2M tokens is a parse error, not a model property (ADR-125).
export const recordOutputLimitSchema = z.object({
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(300),
  maxOutputTokens: z.number().int().min(1).max(2_000_000),
});
export type RecordOutputLimitDto = z.infer<typeof recordOutputLimitSchema>;
