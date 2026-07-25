// Provenance of a user's current plan entitlement. Keeping admin grants
// distinguishable from paid subscriptions is a hard requirement: an admin grant
// must NEVER fabricate a payment transaction or look like one in reporting.
export enum EntitlementGrantType {
  PAID_SUBSCRIPTION = 'PAID_SUBSCRIPTION',
  ADMIN_GRANT = 'ADMIN_GRANT',
  PROMOTIONAL = 'PROMOTIONAL',
  // Backfilled from a pre-billing manual assignment during the catalog migration.
  MIGRATION = 'MIGRATION',
  FREE_DEFAULT = 'FREE_DEFAULT',
}
