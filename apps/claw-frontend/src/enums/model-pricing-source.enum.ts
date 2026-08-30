/**
 * How routing-service actually resolved a model's rate.
 *
 * Mirrors ModelPricingSource in claw-routing-service
 * (`src/common/enums/model-pricing-source.enum.ts`). It is the column the
 * operator acts on: PROVIDER_FALLBACK and UNPRICED are the two that mean
 * "nobody published a price for this model", and a fallback is charging real
 * money at another model's dearest rate until one is published.
 */
export enum ModelPricingSource {
  PUBLISHED = 'PUBLISHED',
  DATED_FAMILY = 'DATED_FAMILY',
  PROVIDER_FALLBACK = 'PROVIDER_FALLBACK',
  LOCAL_FREE = 'LOCAL_FREE',
  UNPRICED = 'UNPRICED',
}

/**
 * The "all rows" option for the pricing-source filter. A member of its own
 * enum rather than `null`, so the filter chip list is one homogeneous array
 * and the selected chip is a single equality test.
 */
export enum ModelPricingSourceFilter {
  ALL = 'ALL',
}
