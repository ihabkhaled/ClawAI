// Economic tier of a model, resolved from the routing-service model registry's
// versioned per-million cost data. Plans grant access by class
// (PlanModelAccessMode.ALLOW_COST_CLASSES) so a newly-synced model lands in the
// right tier without a manual allowlist edit.
export enum ModelCostClass {
  FREE = 'FREE',
  CHEAP = 'CHEAP',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  ULTRA = 'ULTRA',
}
