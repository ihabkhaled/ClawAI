// Rolling window a LIMITED feature allowance is counted against. LIFETIME is
// per-user forever and backs the Free tier's one-shot Compare/Judge/Research/
// Critic trials — it must be durable server state, never browser storage.
export enum PlanFeatureWindow {
  LIFETIME = 'LIFETIME',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  BILLING_PERIOD = 'BILLING_PERIOD',
}
