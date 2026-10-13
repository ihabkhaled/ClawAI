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

/** Entities the observability pages list. Static SQL fragments are keyed by these. */
export enum ObservabilityEntity {
  USER = 'user',
  PROVIDER = 'provider',
  MODEL = 'model',
  PLAN = 'plan',
  WORKFLOW = 'workflow',
}

/** Sorts the observability list pages accept. All numeric, so one comparison fits every sort. */
export enum ObservabilitySortField {
  REQUESTS = 'requests',
  TOKENS = 'tokens',
  INPUT_TOKENS = 'inputTokens',
  OUTPUT_TOKENS = 'outputTokens',
  COST = 'cost',
  COST_PER_REQUEST = 'costPerRequest',
  TOOL_CALLS = 'toolCalls',
  ACTIVE_DAYS = 'activeDays',
  LAST_SEEN = 'lastSeen',
  DISTINCT_USERS = 'distinctUsers',
}

/** How a user row carries the email: the audited list shows it in full, every preview masks it. */
export enum ObservabilityEmailMode {
  FULL = 'FULL',
  MASKED = 'MASKED',
}
