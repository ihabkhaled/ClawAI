/** What BillingService.settleBlock did with one block of accrued seconds. */
export enum LiveSettleOutcome {
  /** Covered by the plan's free monthly seconds. */
  FREE = 'FREE',
  /** Charged to the user's PAYG credit. */
  PAID = 'PAID',
  /** Delivered inside the one grace window of an exhaustion episode (0 micro-USD). */
  GRACE = 'GRACE',
  /** Free seconds are gone and the session holds no paid approval (or its cap is reached). */
  CREDITS_REQUIRED = 'CREDITS_REQUIRED',
  /** Credit is gone and the grace window has elapsed. */
  EXHAUSTED = 'EXHAUSTED',
  /** The meter could not be reached: nothing charged, the seconds stay pending. */
  DEFERRED = 'DEFERRED',
  /** Already settled by another caller (idempotent retry) or nothing to settle. */
  SKIPPED = 'SKIPPED',
}
