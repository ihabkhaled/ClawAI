import {
  type QuotaAdjustmentDeltas,
  type QuotaLimits,
  type WeightedReservationInput,
} from '../../quota/types/quota.types';
import {
  CREDIT_GRANT_HOLD_KEY_INDEX,
  CREDIT_PURCHASED_HOLD_KEY_INDEX,
} from '../constants/credit-window.constants';
import { type CreditBucketSplit, type CreditReserveInput } from '../types/credit.types';

/**
 * The ceilings the credit windows are checked against.
 *
 * The two credit entries are the wallet's CURRENT bucket balances; the other
 * seven are `null` (unlimited) on purpose. The token windows and the
 * provider-cost ceiling measure the SAME dollars this wallet now holds —
 * 1 weighted token === 1 micro-USD — so enforcing them here as well would make
 * one request pay its cost twice and refuse it at half the advertised
 * allowance (ADR-078, ADR-080).
 */
export function buildCreditLimits(wallet: {
  grantMicroUsd: bigint;
  purchasedMicroUsd: bigint;
}): QuotaLimits {
  return {
    dailyWeightedTokens: null,
    weeklyWeightedTokens: null,
    monthlyWeightedTokens: null,
    monthlyProviderCostMicroUsd: null,
    maxConcurrentRequests: null,
    dailyChats: null,
    dailyMessages: null,
    creditGrantMicroUsd: wallet.grantMicroUsd,
    creditPurchasedMicroUsd: wallet.purchasedMicroUsd,
  };
}

/**
 * The reservation as the shared Lua script and the durable usage row see it.
 *
 * Every non-credit amount is zero, and the `amounts[i] > 0` guard in the script
 * makes those windows cost nothing to evaluate. `concurrencyDelta` is zero for
 * the same reason: a credit hold wraps a request the quota path counts, and
 * incrementing the slot here as well would halve every plan's concurrency.
 */
export function buildCreditReservationInput(
  input: CreditReserveInput,
  split: CreditBucketSplit,
): WeightedReservationInput {
  return {
    userId: input.userId,
    planId: null,
    requestId: input.requestId,
    provider: input.provider,
    model: input.model,
    workflow: input.workflow,
    estimatedWeightedTokens: 0,
    estimatedCostMicroUsd: 0n,
    chatsDelta: 0,
    messagesDelta: 0,
    concurrencyDelta: 0,
    billingPeriodKey: null,
    isPayg: true,
    creditGrantMicroUsd: split.grantMicroUsd,
    creditPurchasedMicroUsd: split.purchasedMicroUsd,
  };
}

/**
 * Splits a hold across the buckets, GRANT first, allowing for holds already
 * outstanding against each one.
 *
 * The outstanding figures come from the same two Redis counters the Lua script
 * checks, so the split is computed against exactly the numbers the atomic step
 * will compare it to. Reading them is best-effort: a missing counter reads as
 * zero, which can only make the split more grant-heavy, and the Lua check
 * remains the authority that refuses an over-draw.
 */
export function splitHoldAcrossBuckets(
  holdMicroUsd: bigint,
  wallet: { grantMicroUsd: bigint; purchasedMicroUsd: bigint },
  outstanding: CreditBucketSplit,
): CreditBucketSplit {
  const grantRoom = wallet.grantMicroUsd - outstanding.grantMicroUsd;
  const grantAvailable = grantRoom > 0n ? grantRoom : 0n;
  const fromGrant = holdMicroUsd < grantAvailable ? holdMicroUsd : grantAvailable;
  return {
    grantMicroUsd: fromGrant,
    purchasedMicroUsd: holdMicroUsd - fromGrant,
  };
}

/** Reads a Redis counter as a non-negative BigInt. A missing or junk value is zero. */
export function parseHoldCounter(raw: string | null): bigint {
  if (raw === null || !/^-?\d+$/.test(raw)) {
    return 0n;
  }
  const value = BigInt(raw);
  return value > 0n ? value : 0n;
}

/**
 * Which entries of `buildQuotaKeys` hold the two credit counters.
 *
 * Throws rather than defaulting. An empty string is a VALID Redis key, so a
 * missing index would quietly hold every user's credit under the same anonymous
 * counter instead of failing — and the first symptom would be a wrong balance,
 * not an error. `.at()` also keeps the indices out of a bracket lookup the
 * object-injection rule cannot distinguish from user input.
 */
export function creditHoldKeys(keys: readonly string[]): { grant: string; purchased: string } {
  const grant = keys.at(CREDIT_GRANT_HOLD_KEY_INDEX);
  const purchased = keys.at(CREDIT_PURCHASED_HOLD_KEY_INDEX);
  if (grant === undefined || purchased === undefined) {
    throw new Error('creditHoldKeys: quota key list is missing its credit counters');
  }
  return { grant, purchased };
}

/**
 * Deltas that give a hold back and touch nothing else.
 *
 * Negative for both credit windows, zero everywhere else, so releasing a PAYG
 * hold can never disturb a token window that a different subsystem owns.
 */
export function buildCreditReleaseDeltas(split: CreditBucketSplit): QuotaAdjustmentDeltas {
  return {
    weightedTokenDelta: 0,
    costMicroUsdDelta: 0n,
    concurrencyDelta: 0,
    chatsDelta: 0,
    messagesDelta: 0,
    creditGrantDelta: -split.grantMicroUsd,
    creditPurchasedDelta: -split.purchasedMicroUsd,
  };
}
