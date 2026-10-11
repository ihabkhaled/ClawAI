/**
 * How trustworthy a cost figure is. A NULL or zero cost is never shown as a
 * plain `$0`: the kind says whether it is a real zero or a missing price.
 */
export enum UsageCostKind {
  /** Settled, provider-reported cost (`actual_cost_micro_usd` is set and above zero). */
  PRICED = 'PRICED',
  /** No settled cost; the figure is the reservation estimate. */
  FALLBACK = 'FALLBACK',
  /** No settled cost and no estimate: the model has no price on file. */
  UNPRICED = 'UNPRICED',
  /** An administrator's request, not metered or charged. */
  UNMETERED = 'UNMETERED',
}

/** Who paid for a request, derived from the ledger flags. */
export enum UsageBillingKind {
  CREDIT = 'CREDIT',
  ALLOWANCE = 'ALLOWANCE',
  UNMETERED = 'UNMETERED',
  PLAN = 'PLAN',
}

export enum UsageLeaderboardDimension {
  PROVIDER = 'provider',
  MODEL = 'model',
  WORKFLOW = 'workflow',
  USER = 'user',
}

export enum UsageSortField {
  REQUESTS = 'requests',
  TOKENS = 'tokens',
  COST = 'cost',
  LAST_SEEN = 'lastSeen',
}

export enum UsageRequestSortField {
  TIME = 'time',
  TOKENS = 'tokens',
  COST = 'cost',
}
