import {
  isoWeekKey,
  secondsUntilEndOfIsoWeek,
  secondsUntilEndOfUtcDay,
  secondsUntilEndOfUtcMonth,
  utcDayKey,
  utcMonthKey,
} from '../../../common/utilities/period-key.utility';
import {
  chatsKey,
  CONCURRENCY_SLOT_TTL_SECONDS,
  concurrencyKey,
  CREDIT_HOLD_TTL_SECONDS,
  creditGrantHoldKey,
  creditPurchasedHoldKey,
  messagesKey,
  providerCostKey,
  QUOTA_UNLIMITED,
  weightedQuotaKey,
} from '../constants/quota-redis.constants';
import { QuotaRejectionWindow } from '../../../common/enums/quota-rejection-window.enum';
import {
  type QuotaAdjustmentDeltas,
  type QuotaLimits,
  type QuotaPeriodKeys,
  type WeightedReservationInput,
  type WeightedReserveResult,
} from '../types/quota.types';

// `null` means unlimited and `0` means disabled. Collapsing them here — in one
// place — is what keeps the two from blurring together at call sites.
export function toRedisLimit(value: number | null): string {
  return String(value === null ? QUOTA_UNLIMITED : value);
}

export function toRedisCostLimit(value: bigint | null): string {
  return value === null ? String(QUOTA_UNLIMITED) : value.toString();
}

export function buildPeriodKeys(now: Date): QuotaPeriodKeys {
  return { dayKey: utcDayKey(now), weekKey: isoWeekKey(now), monthKey: utcMonthKey(now) };
}

// Key order is the contract with RESERVE_QUOTA_LUA: day, week, month,
// providerCost, concurrency, chats, messages, creditGrantHolds,
// creditPurchasedHolds. The two credit keys are appended rather than inserted
// so every existing ARGV index keeps its meaning.
export function buildQuotaKeys(userId: string, periods: QuotaPeriodKeys): string[] {
  return [
    weightedQuotaKey(userId, 'DAY', periods.dayKey),
    weightedQuotaKey(userId, 'WEEK', periods.weekKey),
    weightedQuotaKey(userId, 'MONTH', periods.monthKey),
    providerCostKey(userId, periods.monthKey),
    concurrencyKey(userId),
    chatsKey(userId, periods.dayKey),
    messagesKey(userId, periods.dayKey),
    creditGrantHoldKey(userId, periods.monthKey),
    creditPurchasedHoldKey(userId),
  ];
}

export function buildReserveArgv(
  limits: QuotaLimits,
  input: WeightedReservationInput,
  now: Date,
): string[] {
  return [
    toRedisLimit(limits.dailyWeightedTokens),
    toRedisLimit(limits.weeklyWeightedTokens),
    toRedisLimit(limits.monthlyWeightedTokens),
    toRedisCostLimit(limits.monthlyProviderCostMicroUsd),
    toRedisLimit(limits.maxConcurrentRequests),
    toRedisLimit(limits.dailyChats),
    toRedisLimit(limits.dailyMessages),
    String(input.estimatedWeightedTokens),
    input.estimatedCostMicroUsd.toString(),
    String(input.chatsDelta),
    String(input.messagesDelta),
    String(secondsUntilEndOfUtcDay(now)),
    String(secondsUntilEndOfIsoWeek(now)),
    String(secondsUntilEndOfUtcMonth(now)),
    String(CONCURRENCY_SLOT_TTL_SECONDS),
    toRedisCostLimit(limits.creditGrantMicroUsd),
    toRedisCostLimit(limits.creditPurchasedMicroUsd),
    input.creditGrantMicroUsd.toString(),
    input.creditPurchasedMicroUsd.toString(),
    String(CREDIT_HOLD_TTL_SECONDS),
    String(input.concurrencyDelta),
  ];
}

// Signed deltas for ADJUST_QUOTA_LUA, in the same key order as buildQuotaKeys.
// Positive values charge, negative values give back.
export function buildAdjustArgv(input: QuotaAdjustmentDeltas): string[] {
  return [
    String(input.weightedTokenDelta),
    String(input.weightedTokenDelta),
    String(input.weightedTokenDelta),
    input.costMicroUsdDelta.toString(),
    String(input.concurrencyDelta),
    String(input.chatsDelta),
    String(input.messagesDelta),
    input.creditGrantDelta.toString(),
    input.creditPurchasedDelta.toString(),
  ];
}

function isRejectionWindow(value: string): value is QuotaRejectionWindow {
  return Object.values(QuotaRejectionWindow).includes(value as QuotaRejectionWindow);
}

// The Lua reply is `unknown` to ioredis. Parse defensively and fail CLOSED: an
// unrecognisable reply must reject the request, never wave it through.
export function parseReserveOutcome(raw: unknown): WeightedReserveResult | null {
  if (!Array.isArray(raw) || raw.length < 4) {
    return null;
  }
  const [ok, window, current, limit] = raw as ReadonlyArray<unknown>;
  if (Number(ok) === 1) {
    // The caller fills in the reservation id after the durable write succeeds.
    return { ok: true, reservationId: '', estimatedWeightedTokens: 0 };
  }
  const windowName = String(window);
  if (!isRejectionWindow(windowName)) {
    return null;
  }
  return {
    ok: false,
    window: windowName,
    current: Number(current),
    limit: Number(limit),
  };
}
