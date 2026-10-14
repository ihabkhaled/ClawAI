import { type PaygFreeAllowanceView } from '@claw/shared-types';

import {
  FREE_ALLOWANCE_COUNT_WAIVED_SURFACES,
  FREE_ALLOWANCE_ELIGIBLE_SURFACES,
  FREE_ALLOWANCE_FALLBACK_REQUEST_CEILING_MICRO_USD,
  FREE_ALLOWANCE_UNLIMITED_COUNTER_LIMIT,
} from '../constants/credit-free-allowance.constants';
import {
  type CreditFreeAllowanceAdmission,
  type CreditFreeAllowanceAffordableClamp,
  type CreditFreeAllowanceCounterKey,
  type CreditFreeAllowancePolicy,
  type CreditReserveInput,
  type PaygRateSnapshot,
} from '../types/credit.types';

/**
 * Whether a plan's allowance setting lets a request in at all.
 *
 * `null` is unlimited and `0` is disabled; they are never interchangeable
 * (rule 46 item 4). A negative or fractional value cannot be stored, but is
 * treated as disabled rather than trusted.
 */
export function isFreeAllowanceEnabled(limit: number | null): boolean {
  return limit === null || (Number.isInteger(limit) && limit > 0);
}

/**
 * True when the plan caps the allowance at a finite number of requests a month.
 * Only a capped allowance is enforced ahead of the wallet and with metering off:
 * the cap is the plan's promise ("stop at N"), an unlimited allowance promises
 * nothing to stop at (ADR-142 update 2026-10-02).
 */
export function isCappedAllowance(policy: CreditFreeAllowancePolicy): boolean {
  return policy.limit !== null;
}

/**
 * True when this request is not held to the monthly request COUNT: a waived surface (Threads)
 * under a plan whose money meter bounds the total. The limit is lifted AND the call takes no
 * slot, so one Thread's dozen calls never use up the month's other credit-connector requests
 * (D-L2-04: it drove the meter to 12 of 10). The admission records this (`countsSlot`) so a
 * give-back returns exactly what was taken.
 */
export function isCountWaived(
  input: Pick<CreditReserveInput, 'surface'>,
  policy: Pick<CreditFreeAllowancePolicy, 'budgetMicroUsd'>,
): boolean {
  return (
    policy.budgetMicroUsd !== null && FREE_ALLOWANCE_COUNT_WAIVED_SURFACES.includes(input.surface)
  );
}

/** The request limit the atomic counter enforces for this call (lifted for a waived surface). */
export function counterLimitFor(
  input: Pick<CreditReserveInput, 'surface'>,
  policy: Pick<CreditFreeAllowancePolicy, 'limit' | 'budgetMicroUsd'>,
): number {
  return toCounterLimit(isCountWaived(input, policy) ? null : policy.limit);
}

/** What an admitted free request carries into its usage row: the ceiling it was clamped to. */
export function toFreeAllowanceAdmission(
  counter: CreditFreeAllowanceCounterKey,
  input: Pick<CreditReserveInput, 'requestedMaxOutputTokens'>,
  ceiling: CreditFreeAllowanceAffordableClamp | null,
  countsSlot = true,
): CreditFreeAllowanceAdmission {
  return ceiling === null
    ? {
        counter,
        countsSlot,
        maxOutputTokens: input.requestedMaxOutputTokens,
        clamped: false,
        worstCaseCostMicroUsd: 0n,
      }
    : {
        counter,
        countsSlot,
        maxOutputTokens: ceiling.maxOutputTokens,
        clamped: ceiling.clamped,
        worstCaseCostMicroUsd: BigInt(ceiling.worstCaseCostMicroUsd),
      };
}

/** The limit handed to the atomic counter. `null` (unlimited) becomes INT4 max. */
export function toCounterLimit(limit: number | null): number {
  return limit ?? FREE_ALLOWANCE_UNLIMITED_COUNTER_LIMIT;
}

/**
 * True only for a token-priced request: an allow-listed surface that carries no
 * per-unit quantity. Both checks, so a caller that mislabels a video call as CHAT
 * but sends `videoSeconds` still cannot ride the allowance.
 */
export function isFreeAllowanceEligible(input: CreditReserveInput): boolean {
  const perUnit =
    (input.imageUnits ?? 0) > 0 ||
    (input.audioSeconds ?? 0) > 0 ||
    (input.ttsCharacters ?? 0) > 0 ||
    (input.videoSeconds ?? 0) > 0;
  return !perUnit && FREE_ALLOWANCE_ELIGIBLE_SURFACES.includes(input.surface);
}

/** First instant of the next UTC month: when the free-request counter resets. */
export function nextUtcMonthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * The most ONE free request may cost the platform, in integer micro-USD.
 *
 * `min(fallback, planCeiling / limit)`: with a plan ceiling, the allowance's
 * requests on one provider can never sum past that ceiling. Integer (BigInt)
 * division, floored; an unlimited allowance divides by nothing and is bounded by
 * the fallback alone. A ceiling of zero yields zero, which refuses every request.
 */
export function computeFreeRequestCeilingMicroUsd(
  planCeilingMicroUsd: bigint | null,
  limit: number | null,
): bigint {
  if (planCeilingMicroUsd === null || limit === null) {
    return FREE_ALLOWANCE_FALLBACK_REQUEST_CEILING_MICRO_USD;
  }
  if (limit <= 0) {
    return 0n;
  }
  const share = planCeilingMicroUsd / BigInt(limit);
  return share < FREE_ALLOWANCE_FALLBACK_REQUEST_CEILING_MICRO_USD
    ? share
    : FREE_ALLOWANCE_FALLBACK_REQUEST_CEILING_MICRO_USD;
}

/**
 * The user's ONE free-request total for `GET /credit/me` (owner decision
 * 2026-10-02: one count across every credit connector). `limit` and `remaining`
 * are `null` when unlimited; `resetsAt` is the next UTC month start.
 */
export function toFreeAllowanceView(
  limit: number | null,
  used: number,
  resetsAt: Date,
  usedPercent: number | null,
): PaygFreeAllowanceView {
  return {
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    resetsAt: resetsAt.toISOString(),
    meterUsedPercent: usedPercent,
  };
}

/**
 * How much of the month's meter is used, as a whole percentage from 0 to 100, or `null` when the
 * plan has no meter. A percentage on purpose: it tells the user how much free credit is left
 * without disclosing what the platform pays a provider (rule 28).
 */
export function meterUsedPercent(
  spentMicroUsd: bigint,
  budgetMicroUsd: bigint | null,
): number | null {
  if (budgetMicroUsd === null) {
    return null;
  }
  if (budgetMicroUsd <= 0n) {
    return 100;
  }
  const percent = Number((spentMicroUsd * 100n) / budgetMicroUsd);
  // Anything spent shows as at least 1%, so a user who has used the free credit never reads "0% used".
  return Math.min(100, Math.max(spentMicroUsd > 0n ? 1 : 0, percent));
}

/**
 * True when the model's OUTPUT price is above the plan's free-allowance limit, so the allowance
 * does not cover it. No limit set, or no output price on the rate, means it is covered (an
 * unpriced model never reaches here: the meter refuses it earlier).
 */
export function isModelAboveFreeCap(
  rate: PaygRateSnapshot,
  policy: Pick<CreditFreeAllowancePolicy, 'maxModelOutputMicroUsd'>,
): boolean {
  const cap = policy.maxModelOutputMicroUsd;
  const output = rate.rates.outputPerMillionMicroUsd;
  return cap !== null && output !== null && BigInt(output) > cap;
}
