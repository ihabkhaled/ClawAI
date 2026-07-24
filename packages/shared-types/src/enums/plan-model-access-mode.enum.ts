// How a plan's model allowlist is interpreted.
//
// Replaces the unsafe legacy rule where an EMPTY PlanModelAccess array meant
// "unrestricted", which silently exposed ULTRA-cost models to every new plan.
//
// LEGACY_UNRESTRICTED exists only so pre-existing installs keep working through
// the migration window; it behaves like the old empty-array rule and MUST be
// migrated to an explicit mode. An unknown or incomplete policy fails CLOSED for
// non-admin users.
export enum PlanModelAccessMode {
  ALLOW_ALL = 'ALLOW_ALL',
  DENY_ALL = 'DENY_ALL',
  // Only the provider/model rows explicitly listed for this plan.
  ALLOW_LIST = 'ALLOW_LIST',
  // Any model whose registry cost class is in the plan's allowed class set,
  // further narrowed by any explicit per-model rows.
  ALLOW_COST_CLASSES = 'ALLOW_COST_CLASSES',
  LEGACY_UNRESTRICTED = 'LEGACY_UNRESTRICTED',
}
