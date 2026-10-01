/**
 * How a user is billed for a metered provider call, as auth-service decides it.
 *
 * Exists for ONE decision: may the settled cost of a call be shown back to the
 * caller (F108, ADR-078 addendum). A user billed per use is charged that number, so
 * showing it discloses nothing they do not already pay. A subscriber pays a flat
 * price, so the same number would expose provider cost and margin.
 *
 * `UNKNOWN` is a real member, not a default. Anything auth-service cannot
 * positively classify as `PAYG` - a trial, an administrator grant, a promotion,
 * a missing assignment, a failed lookup - is `UNKNOWN`, and every consumer must
 * treat it exactly like `SUBSCRIPTION`: the cost is omitted. A caller that
 * receives a value it does not recognise must do the same (fail closed).
 */
export enum PaygBillingMode {
  /** Billed per use against purchased credit; the settled cost is what they pay. */
  PAYG = 'PAYG',
  /** Flat-price subscriber; per-call cost is internal margin and never disclosed. */
  SUBSCRIPTION = 'SUBSCRIPTION',
  /** Could not be proven PAYG. Treated as SUBSCRIPTION by every consumer. */
  UNKNOWN = 'UNKNOWN',
}
