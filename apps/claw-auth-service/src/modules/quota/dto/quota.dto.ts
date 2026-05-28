import { z } from 'zod';

export const reserveQuotaSchema = z.object({
  userId: z.string().min(1).max(64),
  estimatedTokens: z.number().int().min(0).max(10_000_000),
});
export type ReserveQuotaDto = z.infer<typeof reserveQuotaSchema>;

export const finalizeQuotaSchema = z.object({
  userId: z.string().min(1).max(64),
  planId: z.string().min(1).max(64).nullable().optional(),
  estimatedTokens: z.number().int().min(0).max(10_000_000),
  inputTokens: z.number().int().min(0).max(10_000_000),
  outputTokens: z.number().int().min(0).max(10_000_000),
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(128),
});
export type FinalizeQuotaDto = z.infer<typeof finalizeQuotaSchema>;

export const releaseQuotaSchema = z.object({
  userId: z.string().min(1).max(64),
  estimatedTokens: z.number().int().min(0).max(10_000_000),
});
export type ReleaseQuotaDto = z.infer<typeof releaseQuotaSchema>;
