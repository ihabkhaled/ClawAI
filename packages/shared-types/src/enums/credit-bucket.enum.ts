/**
 * Which half of a user's PAYG wallet a movement touches.
 *
 * The two buckets are NOT interchangeable and the distinction is a commitment
 * to the customer, not an implementation detail:
 *
 * - `GRANT` is the monthly allowance included with a plan. It resets at each
 *   billing period and does NOT roll over — unused grant is swept, never banked.
 * - `PURCHASED` is credit the user paid cash for. It never expires and survives
 *   plan changes, cancellation of the subscription, and downgrades.
 *
 * Consequences that follow from the split and must never be reversed:
 * debits take GRANT first (spend the perishable half before the money someone
 * paid for), and refunds return to PURCHASED (returning cash as a bucket that
 * expires at the end of the month would quietly confiscate it).
 */
export enum CreditBucket {
  GRANT = 'GRANT',
  PURCHASED = 'PURCHASED',
}
