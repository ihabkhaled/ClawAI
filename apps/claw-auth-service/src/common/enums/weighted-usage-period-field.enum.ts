// Which period column a durable weighted-usage aggregate is grouped by. Used by
// the reconciliation path that rebuilds or verifies the Redis counters from the
// ledger, so the counters can never drift indefinitely without detection.
export enum WeightedUsagePeriodField {
  DAY = 'dayKey',
  WEEK = 'weekKey',
  MONTH = 'monthKey',
}
