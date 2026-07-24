import type { ModelCostClass } from '../enums/model-cost-class.enum';
import type { QuotaWindow } from '../enums/quota-window.enum';

// Raw provider token counts, kept alongside the normalized figure so reporting
// can still show what actually happened per modality.
export type RawTokenBreakdown = {
  inputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  outputTokens: number;
  toolCalls: number;
  searchCalls: number;
};

// Versioned per-million pricing for one model, in integer micro-USD.
// Every field is nullable because providers publish different subsets; a null
// field contributes zero and lowers the confidence of the resulting estimate.
export type ModelCostRates = {
  provider: string;
  model: string;
  version: number;
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
  costClass: ModelCostClass;
  // True when an administrator pinned these values; automated sync must NEVER
  // overwrite an active admin override.
  isAdminOverride: boolean;
  effectiveFrom: string;
  lastVerifiedAt: string | null;
  source: string;
};

// A pre-execution hold. Reserving BEFORE the provider call is what makes the
// budget enforceable: by the time usage is known, the money is already spent.
export type QuotaReservation = {
  reservationId: string;
  userId: string;
  planId: string | null;
  subscriptionId: string | null;
  requestId: string;
  estimatedWeightedTokens: number;
  estimatedCostMicroUsd: number;
  createdAt: string;
};

// Which limit stopped a request. `window` is null for the provider-cost ceiling,
// which is not a token window.
export type QuotaRejection = {
  window: QuotaWindow | null;
  limit: number;
  used: number;
  requested: number;
  // Never populated for non-admin callers: cost ceilings are internal.
  isCostCeiling: boolean;
};

export type QuotaReservationOutcome =
  { ok: true; reservation: QuotaReservation } | { ok: false; rejection: QuotaRejection };

// Post-execution reconciliation: actual usage replaces the estimate and the
// difference is released back to every window it was held against.
export type QuotaFinalization = {
  reservationId: string;
  userId: string;
  provider: string;
  model: string;
  workflow: string;
  raw: RawTokenBreakdown;
  actualWeightedTokens: number;
  actualCostMicroUsd: number;
  // False when the provider reported no usage and registry estimates were used.
  costIsMeasured: boolean;
};
