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
  billingPeriodKey: string | null;
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
