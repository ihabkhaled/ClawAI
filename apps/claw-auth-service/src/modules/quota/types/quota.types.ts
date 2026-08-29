import { type QuotaWindow } from '@claw/shared-types';
import { type QuotaRejectionWindow } from '../../../common/enums/quota-rejection-window.enum';
// The Prisma enum, not the shared-types one: the string VALUES are identical
// (so the wire payload is unchanged), but Prisma models a native enum as a
// string-literal union, which is not assignable to a TypeScript string enum.
// Using the Prisma type here keeps the whole path cast-free.
import { type PlanFeatureKey } from '../../../generated/prisma';

export type QuotaSnapshot = {
  dailyLimit: number;
  used: number;
  remaining: number;
};

export type ReserveResult =
  | { ok: true; reservationId: string; estimate: number }
  | { ok: false; reason: 'QUOTA_EXCEEDED'; snapshot: QuotaSnapshot };

export type FinalizeInput = {
  userId: string;
  planId: string | null;
  reservationId: string;
  estimate: number;
  actualTotalTokens: number;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
};

// The plan-derived ceilings a reservation is checked against. `null` means
// unlimited and `0` means disabled — they are deliberately distinct, so the
// mapping to Redis happens in exactly one place rather than at each call site.
export type QuotaLimits = {
  dailyWeightedTokens: number | null;
  weeklyWeightedTokens: number | null;
  monthlyWeightedTokens: number | null;
  monthlyProviderCostMicroUsd: bigint | null;
  maxConcurrentRequests: number | null;
  dailyChats: number | null;
  dailyMessages: number | null;
  // PAYG credit ceilings (ADR-080). NOT plan-derived like the six above: these
  // are the wallet's CURRENT bucket balances, read from Postgres per request,
  // because a balance moves with every top-up and every settlement while a plan
  // limit only moves when an administrator edits the plan.
  creditGrantMicroUsd: bigint | null;
  creditPurchasedMicroUsd: bigint | null;
};

export type WeightedReservationInput = {
  userId: string;
  planId: string | null;
  requestId: string;
  provider: string;
  model: string;
  workflow: string | null;
  // Cost-normalized estimate: 1,000,000 weighted tokens == $1.00.
  estimatedWeightedTokens: number;
  estimatedCostMicroUsd: bigint;
  // Product-limit consumption this request represents.
  chatsDelta: number;
  messagesDelta: number;
  // Concurrency slots this reservation takes. 1 for an ordinary request; 0 for
  // a PAYG credit hold, which is taken AROUND a request the quota path will
  // (once wired) already have counted — incrementing twice would halve every
  // plan's effective concurrency.
  concurrencyDelta: number;
  billingPeriodKey: string | null;
  // True when this request is metered against the PAYG wallet. The two credit
  // amounts are the hold's split across the buckets, taken GRANT first, and are
  // both 0 for a request that is not metered.
  isPayg: boolean;
  creditGrantMicroUsd: bigint;
  creditPurchasedMicroUsd: bigint;
};

// UTC bucket identifiers a reservation is charged against, resolved once per
// request so every window agrees on the same instant.
export type QuotaPeriodKeys = {
  dayKey: string;
  weekKey: string;
  monthKey: string;
};

export type WeightedReserveResult =
  | { ok: true; reservationId: string; estimatedWeightedTokens: number }
  | {
      ok: false;
      window: QuotaRejectionWindow;
      current: number;
      limit: number;
    };

export type WeightedFinalizeInput = {
  reservationId: string;
  rawInputTokens: number;
  rawCachedTokens: number;
  rawReasoningTokens: number;
  rawOutputTokens: number;
  toolCallCount: number;
  actualWeightedTokens: number;
  actualCostMicroUsd: bigint;
};

// Signed deltas applied to every Redis window when a reservation is reconciled
// or released. Positive charges, negative gives back.
//
// The two credit deltas are ALWAYS the negation of what was held, never the
// actual-minus-estimate difference the token windows use: the credit counters
// track outstanding HOLDS, and settled spend is subtracted from the wallet in
// Postgres instead. Reconciling both would charge the same dollars twice.
export type QuotaAdjustmentDeltas = {
  weightedTokenDelta: number;
  costMicroUsdDelta: bigint;
  concurrencyDelta: number;
  chatsDelta: number;
  messagesDelta: number;
  creditGrantDelta: bigint;
  creditPurchasedDelta: bigint;
};

export type QuotaUsageSnapshot = {
  window: QuotaWindow;
  periodKey: string;
  used: number;
  // null = unlimited.
  limit: number | null;
  remaining: number | null;
};

export type FeatureAllowanceSnapshot = {
  feature: PlanFeatureKey;
  allowed: boolean;
  // null = unmetered (ENABLED) or not applicable (DISABLED).
  limit: number | null;
  used: number;
  remaining: number | null;
  window: string | null;
};

export type FeatureReservationResult =
  | { ok: true; reservationId: string }
  | {
      ok: false;
      reason: 'FEATURE_DISABLED' | 'FEATURE_TRIAL_EXHAUSTED';
      used: number;
      limit: number;
    };

export type ObservedFeatureUsageInput = {
  userId: string;
  feature: PlanFeatureKey;
  requestId: string;
};

export type ObservedFeatureSnapshotInput = {
  userId: string;
  feature: PlanFeatureKey;
};

export type TokenUsageRangeInput = {
  userId: string;
  fromDate: string;
  throughDate: string;
};
