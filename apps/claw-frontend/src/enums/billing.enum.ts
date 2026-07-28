// Mirrors @claw/shared-types. Duplicated rather than imported because the
// frontend does not depend on backend packages, and a string-literal union
// would violate the no-literal-unions rule.

export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum SubscriptionStatus {
  PENDING = 'PENDING',
  INCOMPLETE = 'INCOMPLETE',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  PAUSED = 'PAUSED',
  CANCEL_AT_PERIOD_END = 'CANCEL_AT_PERIOD_END',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
  CHARGEBACK = 'CHARGEBACK',
  SUSPENDED = 'SUSPENDED',
}

export enum PlanFeature {
  COMPARE_MODE = 'COMPARE_MODE',
  JUDGE_MODE = 'JUDGE_MODE',
  RESEARCH_MODE = 'RESEARCH_MODE',
  CRITIC_REVIEW = 'CRITIC_REVIEW',
  WORKSPACES = 'WORKSPACES',
  MEMORY = 'MEMORY',
  CONTEXT_PACKS = 'CONTEXT_PACKS',
}

export enum BillingGateway {
  PAYPAL = 'PAYPAL',
  PAYMOB = 'PAYMOB',
}

export enum BillingReturnPhase {
  COMPLETING = 'COMPLETING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

// Drives the colour of a usage bar. Derived from the ratio, never stored, so a
// limit change is reflected immediately rather than on the next write.
export enum UsageTone {
  UNLIMITED = 'UNLIMITED',
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  EXHAUSTED = 'EXHAUSTED',
}
