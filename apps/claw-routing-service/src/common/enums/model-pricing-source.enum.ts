/**
 * How a model's rate was actually resolved.
 *
 * This is the column an operator acts on. `ModelCostService.getSnapshot`
 * silently walks four different paths to reach a price, and three of them mean
 * "nobody published a rate for THIS model" — which the caller could not tell
 * from a real published price without being told.
 *
 * PROVIDER_FALLBACK is the one that costs money: the request is charged at the
 * dearest rate the provider publishes for ANY model, deliberately pessimistic
 * so spend stays bounded. It over-charges by design and is meant to be
 * temporary — every row carrying it is a model waiting for a real price.
 */
export enum ModelPricingSource {
  /** This exact model has its own active price row. */
  PUBLISHED = 'PUBLISHED',
  /**
   * Priced through an alias: a dated snapshot resolved to its family
   * (`claude-haiku-4-5-20251001` → `claude-haiku-4-5`), or a decorated
   * provider id normalised (`models/gemini-2.5-flash` → `gemini-2.5-flash`).
   * A real price, reached under a different key.
   */
  DATED_FAMILY = 'DATED_FAMILY',
  /** No price for this model — charged at the provider's dearest known rate. */
  PROVIDER_FALLBACK = 'PROVIDER_FALLBACK',
  /** A local runtime: cost comes from the platform's own compute configuration. */
  LOCAL_FREE = 'LOCAL_FREE',
  /** Nothing priced it, and no fallback was available. The request is refused. */
  UNPRICED = 'UNPRICED',
}
