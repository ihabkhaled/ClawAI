import { ModelCostClass } from '@claw/shared-types';
import { z } from 'zod';

// A per-million rate is micro-USD and is nullable because providers publish
// different subsets. `null` is propagated rather than defaulted to 0: "we do
// not know what this costs" must never round down to "free" on a money path.
const rateSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable();

/**
 * routing-service's `ModelCostSnapshot`, validated at the boundary.
 *
 * Parsed rather than trusted because this answer decides how much of a
 * customer's money one request may spend. An unexpected shape from a
 * mis-deployed routing-service must fail closed here, not surface as `NaN`
 * inside the affordability clamp — `NaN` compares false against every ceiling,
 * so it would wave the request straight through.
 */
export const modelCostResponseSchema = z.object({
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
  costClass: z.nativeEnum(ModelCostClass),
  isAdminOverride: z.boolean(),
  effectiveFrom: z.string().min(1).max(64),
  lastVerifiedAt: z.string().min(1).max(64).nullable(),
  source: z.string().min(1).max(64),
  isPriced: z.boolean(),
  // Non-null means the answer came from the LOCAL-compute path. For a metered
  // provider that is a red flag, not a discount — see `isUsablePaygRate`.
  localComputeOwnership: z.string().min(1).max(64).nullable(),
});

export type ModelCostResponse = z.infer<typeof modelCostResponseSchema>;
