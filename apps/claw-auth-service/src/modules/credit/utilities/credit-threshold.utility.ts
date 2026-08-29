import type { PaygWarningThreshold } from '@claw/shared-types';

/**
 * The tightest warning threshold this balance has crossed, or `null`.
 *
 * Each threshold is a percentage AND an absolute floor, and EITHER condition
 * trips it. The floor is the part that is easy to leave out and the part that
 * matters: on a small plan, "95% consumed" can already be less than one
 * request's hold, so a pure percentage would fire the warning AFTER the user
 * was blocked — a notification that arrives too late to act on is worse than
 * none, because it teaches people to ignore the channel.
 *
 * Arithmetic stays in BigInt. `consumed * 100 >= periodGrant * percent` is the
 * same comparison as `consumed / periodGrant >= percent / 100` without ever
 * creating a float on a money path.
 *
 * A zero period grant (a plan with no allowance, or a purchased-credit-only
 * wallet) has no percentage to speak of; only the absolute floor applies.
 */
export function crossedWarningThreshold(
  availableMicroUsd: bigint,
  periodGrantMicroUsd: bigint,
  thresholds: readonly PaygWarningThreshold[],
): PaygWarningThreshold | null {
  const ordered = [...thresholds].sort((a, b) => b.percentConsumed - a.percentConsumed);
  for (const threshold of ordered) {
    if (availableMicroUsd < BigInt(threshold.minRemainingMicroUsd)) {
      return threshold;
    }
    if (periodGrantMicroUsd <= 0n) {
      continue;
    }
    const consumed = periodGrantMicroUsd - availableMicroUsd;
    if (
      consumed > 0n &&
      consumed * 100n >= periodGrantMicroUsd * BigInt(threshold.percentConsumed)
    ) {
      return threshold;
    }
  }
  return null;
}
