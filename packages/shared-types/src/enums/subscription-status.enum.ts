// Subscription lifecycle. Transitions are enforced by the payment-service state
// machine (see subscription-transitions.constants.ts) — never assigned freely.
//
// Entitlement-bearing states are ACTIVE, PAST_DUE (inside grace) and
// CANCEL_AT_PERIOD_END. Every other state revokes paid entitlement.
export enum SubscriptionStatus {
  // Created locally, no provider object yet.
  PENDING = 'PENDING',
  // Provider object exists but first payment is unconfirmed.
  INCOMPLETE = 'INCOMPLETE',
  ACTIVE = 'ACTIVE',
  // Renewal charge failed; entitlement survives until gracePeriodEndsAt.
  PAST_DUE = 'PAST_DUE',
  PAUSED = 'PAUSED',
  // Still ACTIVE in effect, but will not renew.
  CANCEL_AT_PERIOD_END = 'CANCEL_AT_PERIOD_END',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
  CHARGEBACK = 'CHARGEBACK',
  SUSPENDED = 'SUSPENDED',
}
