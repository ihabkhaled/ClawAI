import { BASIS_POINTS_DENOMINATOR, MICRO_USD_PER_MINOR_UNIT } from '@claw/shared-constants';

/**
 * The share of a payment that becomes PAYG connector credit, in micro-USD.
 *
 * `amountMinor` is what the user actually pays, in cents. `bps` is the plan's
 * conversion rate in basis points — 3000 is 30%. Pay $20.00 (2000 cents) on a
 * 30% plan and this returns 6_000_000 micro-USD: $6.00 of credit.
 *
 * All-integer on purpose, and multiplied BEFORE dividing. Money is never a
 * float here, and `amountMinor * bps` is computed in `bigint` so a large annual
 * payment cannot silently exceed `Number.MAX_SAFE_INTEGER` on the way through.
 *
 * Rounds DOWN. A fraction of a micro-USD is a millionth of a cent, and rounding
 * a grant up would hand out credit the payment did not cover — trivial once,
 * wrong at scale, and wrong in the direction that costs the platform money.
 */
export function creditFromPayment(amountMinor: number, bps: number): bigint {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return 0n;
  }
  if (!Number.isInteger(bps) || bps <= 0) {
    return 0n;
  }
  const clampedBps = BigInt(Math.min(bps, BASIS_POINTS_DENOMINATOR));
  return (
    (BigInt(amountMinor) * BigInt(MICRO_USD_PER_MINOR_UNIT) * clampedBps) /
    BigInt(BASIS_POINTS_DENOMINATOR)
  );
}

/**
 * The same conversion at face value, for a top-up.
 *
 * Separate from {@link creditFromPayment} because the two answer different
 * questions and are allowed to diverge: a plan converts only its
 * `paygCreditPercentBps` share, because the rest of the subscription buys
 * everything else the plan includes. A top-up buys nothing but credit, so it
 * converts at 100% and the platform's margin on it is zero.
 *
 * Collapsing them into one call with a default rate is how a later edit to
 * "the ratio" would silently reprice both.
 */
export function creditFromTopup(amountMinor: number, bps: number): bigint {
  return creditFromPayment(amountMinor, bps);
}

/** Display helper: the whole-percent form of a basis-point rate, for copy and logs. */
export function bpsToPercent(bps: number): number {
  return bps / (BASIS_POINTS_DENOMINATOR / 100);
}
