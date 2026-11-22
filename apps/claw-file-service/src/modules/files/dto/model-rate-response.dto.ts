import { ModelCostClass } from '@claw/shared-types';
import { z } from 'zod';

// Nullable on purpose: `null` = "not published", never "free".
const rateSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable();

/**
 * routing-service's `ModelCostSnapshot` (`/internal/router-models/costs`),
 * validated at the boundary — the same shape auth-service's PAYG meter parses.
 * file-service only ESTIMATES a platform cost from it; it never charges a user.
 */
export const modelRateResponseSchema = z.object({
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(256),
  version: z.number().int().min(0),
  currency: z.string().min(1).max(8),
  inputPerMillionMicroUsd: rateSchema,
  outputPerMillionMicroUsd: rateSchema,
  cachedInputPerMillionMicroUsd: rateSchema,
  cacheWritePerMillionMicroUsd: rateSchema,
  reasoningPerMillionMicroUsd: rateSchema,
  imagePerUnitMicroUsd: rateSchema,
  audioPerUnitMicroUsd: rateSchema,
  videoPerUnitMicroUsd: rateSchema,
  toolCallPerUnitMicroUsd: rateSchema,
  searchCallPerUnitMicroUsd: rateSchema,
  ttsPerCharacterMicroUsd: rateSchema.default(null),
  costClass: z.nativeEnum(ModelCostClass),
  isAdminOverride: z.boolean(),
  effectiveFrom: z.string().min(1).max(64),
  lastVerifiedAt: z.string().min(1).max(64).nullable(),
  source: z.string().min(1).max(64),
  isPriced: z.boolean(),
});

export type ModelRateResponse = z.infer<typeof modelRateResponseSchema>;
