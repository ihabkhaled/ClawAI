import { type ModelCostRates } from '@claw/shared-types';
import {
  type CostClass,
  type CostConfidence,
  type LocalComputeOwnership,
  type ModelCostSource,
} from '../../../generated/prisma';

// Rates as supplied by a caller (admin edit, provider sync, seed). BigInt so a
// per-million micro-USD rate can never lose precision to a float.
export type ModelCostRateInput = {
  inputPerMillionMicroUsd: bigint | null;
  outputPerMillionMicroUsd: bigint | null;
  cachedInputPerMillionMicroUsd: bigint | null;
  cacheWritePerMillionMicroUsd: bigint | null;
  reasoningPerMillionMicroUsd: bigint | null;
  imagePerUnitMicroUsd: bigint | null;
  audioPerUnitMicroUsd: bigint | null;
  videoPerUnitMicroUsd: bigint | null;
  toolCallPerUnitMicroUsd: bigint | null;
  searchCallPerUnitMicroUsd: bigint | null;
};

export type PublishModelCostInput = ModelCostRateInput & {
  provider: string;
  modelKey: string;
  currency: string;
  costClass: CostClass;
  confidence: CostConfidence;
  source: ModelCostSource;
  isAdminOverride: boolean;
  localComputeOwnership: LocalComputeOwnership | null;
  createdByUserId: string | null;
  notes: string | null;
};

// Why a synced rate was or was not applied. `skippedAdminOverride` is the case
// that matters: an automated scrape must never silently replace a
// hand-negotiated enterprise rate.
export type ApplySyncedCostResult =
  | { applied: true; version: number }
  | { applied: false; reason: 'ADMIN_OVERRIDE_ACTIVE' | 'RATES_UNCHANGED' };

// What the chat service needs to price a request. `null` rates are propagated
// rather than defaulted so the caller can decide — an unpriced model is an
// unbounded liability on a limited plan, not a free one.
export type ModelCostSnapshot = ModelCostRates & {
  // False when nothing in the registry priced this model and the caller must
  // fail closed (or an administrator must explicitly allow it).
  isPriced: boolean;
  localComputeOwnership: LocalComputeOwnership | null;
};

// The numeric shape a validated DTO delivers, before it is widened to the
// BigInt columns. Kept separate from ModelCostRateInput so the conversion
// boundary is explicit rather than implied.
export type ModelCostRateDto = {
  provider: string;
  modelKey: string;
  currency: string;
  inputPerMillionMicroUsd: number | null;
  outputPerMillionMicroUsd: number | null;
  cachedInputPerMillionMicroUsd: number | null;
  cacheWritePerMillionMicroUsd: number | null;
  reasoningPerMillionMicroUsd: number | null;
  imagePerUnitMicroUsd: number | null;
  audioPerUnitMicroUsd: number | null;
  videoPerUnitMicroUsd: number | null;
  toolCallPerUnitMicroUsd: number | null;
  searchCallPerUnitMicroUsd: number | null;
  costClass: CostClass;
  localComputeOwnership: LocalComputeOwnership | null;
  notes: string | null;
};
