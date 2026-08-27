import { QUOTA_WINDOW_ORDER } from '../constants/quota-window.constants';
import type { QuotaWindowConflict, QuotaWindowQuotas } from '../types/quota-window.types';

/**
 * Catches a plan whose shorter window is more generous than its longer one.
 *
 * A daily cap above the weekly cap is not a stricter plan — it is an
 * unreachable number. The weekly ceiling binds first, so the daily figure never
 * applies, and the daily figure is what the pricing card leads with. The live
 * Free plan advertised 300,000 a day against a 20,000 weekly ceiling: a visitor
 * reading the card saw fifteen times the allowance the account actually grants,
 * and would hit the wall on the first afternoon.
 *
 * Only both-present pairs are compared. `null` means unlimited and `0` means
 * disabled; neither is "a smaller number" in the sense this checks, and
 * conflating them is how an unlimited window would start failing validation.
 */
export function findQuotaWindowConflicts(quotas: QuotaWindowQuotas): QuotaWindowConflict[] {
  const conflicts: QuotaWindowConflict[] = [];

  // `entries()` and `at()` rather than indexed reads: a computed index into an
  // object is an injection sink the security rules reject, and the pair walk
  // reads more directly this way anyway. The last rung has no longer window
  // above it, which ends the walk.
  for (const [position, shorter] of QUOTA_WINDOW_ORDER.entries()) {
    const longer = QUOTA_WINDOW_ORDER.at(position + 1);
    if (longer === undefined) {
      continue;
    }

    const shorterValue = shorter.read(quotas);
    const longerValue = longer.read(quotas);
    if (
      shorterValue === null ||
      shorterValue === undefined ||
      longerValue === null ||
      longerValue === undefined
    ) {
      continue;
    }
    // A disabled window blocks everything below it and is a deliberate setting,
    // not an accident of ordering.
    if (shorterValue === 0 || longerValue === 0) {
      continue;
    }
    if (shorterValue > longerValue) {
      conflicts.push({
        shorter: shorter.window,
        longer: longer.window,
        shorterValue,
        longerValue,
      });
    }
  }

  return conflicts;
}

/** Renders the conflicts as one sentence an operator can act on. */
export function describeQuotaWindowConflicts(conflicts: QuotaWindowConflict[]): string {
  return conflicts
    .map(
      (conflict) =>
        `${conflict.shorter} quota ${conflict.shorterValue} exceeds ${conflict.longer} quota ${conflict.longerValue}`,
    )
    .join('; ');
}
