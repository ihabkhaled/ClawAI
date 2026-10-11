/**
 * Who stands behind a stored price. Additive to ModelPricingSource (which says
 * HOW a price was reached): this says how much to trust it.
 *
 * Precedence when more than one source could price a model:
 * ADMIN_SET > PROVIDER_PUBLISHED > ESTIMATED.
 */
export enum ModelPriceBasis {
  /** Reported by the provider's own model listing (PROVIDER_SYNC / PROVIDER_REPORTED). */
  PROVIDER_PUBLISHED = 'PROVIDER_PUBLISHED',
  /** Hand-maintained list price from the seed; correct when written, may have drifted. */
  ESTIMATED = 'ESTIMATED',
  /** Pinned by an administrator. */
  ADMIN_SET = 'ADMIN_SET',
}
