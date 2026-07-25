// How a PlanFeatureRule grants a feature.
//
// DISABLED — feature is off; `limit` is ignored.
// ENABLED  — unmetered within the plan's other limits; `limit` MUST be null.
// LIMITED  — metered; `limit` MUST be a positive integer and `window` MUST be set.
export enum PlanFeatureAccessMode {
  DISABLED = 'DISABLED',
  ENABLED = 'ENABLED',
  LIMITED = 'LIMITED',
}
