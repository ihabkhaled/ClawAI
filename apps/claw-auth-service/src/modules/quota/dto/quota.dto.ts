import { z } from 'zod';

import { PlanFeatureKey } from '../../../generated/prisma';

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

export const consumeFeatureUsageSchema = z.object({
  userId: z.string().min(1).max(64),
  feature: z.nativeEnum(PlanFeatureKey),
  requestId: z.string().min(1).max(200),
});
export type ConsumeFeatureUsageDto = z.infer<typeof consumeFeatureUsageSchema>;
