import {
  LIVE_BLOCK_KEY_PREFIX,
  PRISMA_UNIQUE_VIOLATION,
} from '../constants/live-billing.constants';

/** `live:<sessionId>:<blockIndex>` — the LiveUsageCharge key and the PAYG requestId. */
export function liveBlockKey(sessionId: string, blockIndex: number): string {
  return `${LIVE_BLOCK_KEY_PREFIX}:${sessionId}:${String(blockIndex)}`;
}

/** Calendar month in UTC, "YYYY-MM". */
export function liveUsageMonth(now: Date): string {
  return now.toISOString().slice(0, 7);
}

/**
 * Price of `seconds` at a per-minute rate, integer micro-USD, rounded UP so a
 * partial minute is never under-charged by truncation (rule 37 item 3).
 */
export function liveBlockCostMicroUsd(pricePerMinuteMicroUsd: number, seconds: number): bigint {
  return seconds <= 0 || pricePerMinuteMicroUsd <= 0
    ? 0n
    : (BigInt(pricePerMinuteMicroUsd) * BigInt(seconds) + 59n) / 60n;
}

/** True when a spend of `cost` keeps the session within its optional cap. */
export function withinSpendingCap(spent: bigint, cost: bigint, cap: bigint | null): boolean {
  return cap === null || spent + cost <= cap;
}

/** Prisma's unique-constraint violation: the idempotency key was already written. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === PRISMA_UNIQUE_VIOLATION
  );
}
