/**
 * Why a row exists in the append-only PAYG credit ledger.
 *
 * The ledger is the source of truth for a user's balance; the wallet row is a
 * materialized sum of it. A correction is ALWAYS a new compensating row and
 * never an edit — the same rule the payment service's financial tables follow.
 */
export enum CreditLedgerKind {
  /** Monthly plan allowance credited at a billing-period boundary. */
  PLAN_GRANT = 'PLAN_GRANT',
  /** Unused GRANT swept at the period roll. Balances PLAN_GRANT so the ledger still sums to the wallet. */
  GRANT_EXPIRY = 'GRANT_EXPIRY',
  /** Credit bought with real money. Carries the payment event id for idempotency. */
  TOPUP = 'TOPUP',
  /** A refunded or charged-back top-up, reversed against the PURCHASED bucket. */
  TOPUP_REVERSAL = 'TOPUP_REVERSAL',
  /** A pre-flight hold. Negative; released or converted to CONSUMPTION. */
  RESERVATION = 'RESERVATION',
  /** A hold given back because the request never reached the provider. */
  RESERVATION_RELEASE = 'RESERVATION_RELEASE',
  /** Settled spend. The difference between this and its RESERVATION is the reconciliation. */
  CONSUMPTION = 'CONSUMPTION',
  /** Operator correction. Requires a reason and an actor; never used to imitate a payment. */
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  /** Credit returned because the provider failed after money was already held. */
  PROVIDER_FAILURE_REFUND = 'PROVIDER_FAILURE_REFUND',
}
