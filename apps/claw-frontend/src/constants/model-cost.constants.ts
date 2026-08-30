import { STATUS_STYLES } from '@/constants/status-badge.constants';
import { ModelPricingSource, ModelPricingSourceFilter } from '@/enums/model-pricing-source.enum';
import { CostClass } from '@/enums/router-models.enum';
import type { ModelCostSourceCounts } from '@/types/model-cost.types';

/**
 * Micro-USD in one dollar. Every rate on this page is an integer count of
 * micro-USD per million tokens, so this is the ONLY place the decimal point
 * moves — and it moves by string surgery, never by dividing a float.
 */
export const MICRO_USD_PER_USD = 1_000_000;

/** Decimal places a micro-USD amount can carry. 10^6 → six. */
export const MICRO_USD_DECIMALS = 6;

/** Cents are always shown, so $2.5 reads as $2.50 and columns line up. */
export const MODEL_COST_RATE_MIN_DECIMALS = 2;

/**
 * What the operator may type into a rate field: a plain decimal, at most six
 * places (the resolution of a micro-USD). No sign, no exponent, no thousands
 * separator — anything else is a typo we would otherwise silently coerce.
 *
 * Expressed as BOUNDS, not a regular expression. A quantified prefix followed
 * by an optional group is what the ReDoS analyzer rejects, and this check does
 * not need a regex at all — a hand-written scan is both provably linear and
 * easier to read than the pattern it replaces.
 */
export const MODEL_COST_RATE_MAX_INTEGER_DIGITS = 12;
export const MODEL_COST_RATE_MAX_DECIMAL_PLACES = 6;

/**
 * The publish DTO's ceiling ($1,000 per million tokens), mirrored so the
 * dialog refuses a fat-fingered rate before the round trip instead of showing
 * a 400 with no field attached.
 */
export const MODEL_COST_RATE_MAX_MICRO_USD = 1_000_000_000;

/**
 * Sort weight. The page opens on the work: a fallback is charging real money
 * at another model's dearest rate, and an unpriced model is refused outright.
 * Everything already priced sinks to the bottom.
 */
export const MODEL_PRICING_SOURCE_RANK: Record<ModelPricingSource, number> = {
  [ModelPricingSource.PROVIDER_FALLBACK]: 0,
  [ModelPricingSource.UNPRICED]: 1,
  [ModelPricingSource.DATED_FAMILY]: 2,
  [ModelPricingSource.LOCAL_FREE]: 3,
  [ModelPricingSource.PUBLISHED]: 4,
};

/** Filter chips, in the order they are rendered. */
export const MODEL_PRICING_SOURCE_FILTER_OPTIONS: ReadonlyArray<
  ModelPricingSource | ModelPricingSourceFilter
> = [
  ModelPricingSourceFilter.ALL,
  ModelPricingSource.PROVIDER_FALLBACK,
  ModelPricingSource.UNPRICED,
  ModelPricingSource.DATED_FAMILY,
  ModelPricingSource.PUBLISHED,
  ModelPricingSource.LOCAL_FREE,
];

export const MODEL_PRICING_SOURCE_LABEL_KEYS: Record<ModelPricingSource, string> = {
  [ModelPricingSource.PUBLISHED]: 'adminModelCosts.source.published',
  [ModelPricingSource.DATED_FAMILY]: 'adminModelCosts.source.datedFamily',
  [ModelPricingSource.PROVIDER_FALLBACK]: 'adminModelCosts.source.providerFallback',
  [ModelPricingSource.LOCAL_FREE]: 'adminModelCosts.source.localFree',
  [ModelPricingSource.UNPRICED]: 'adminModelCosts.source.unpriced',
};

export const MODEL_PRICING_SOURCE_FILTER_LABEL_KEYS: Record<
  ModelPricingSource | ModelPricingSourceFilter,
  string
> = {
  ...MODEL_PRICING_SOURCE_LABEL_KEYS,
  [ModelPricingSourceFilter.ALL]: 'adminModelCosts.filters.all',
};

/**
 * Badge colours, taken from the audited StatusBadge palette rather than picked
 * fresh — those four tints are the ones checked for WCAG AA contrast in both
 * themes. Amber for a fallback (money is moving on a guess), red for unpriced
 * (the request is refused), green for a real price, grey for local compute.
 */
export const MODEL_PRICING_SOURCE_BADGE_CLASSES: Record<ModelPricingSource, string> = {
  [ModelPricingSource.PUBLISHED]: STATUS_STYLES['active'] ?? '',
  [ModelPricingSource.DATED_FAMILY]: STATUS_STYLES['active'] ?? '',
  [ModelPricingSource.PROVIDER_FALLBACK]: STATUS_STYLES['pending'] ?? '',
  [ModelPricingSource.LOCAL_FREE]: STATUS_STYLES['inactive'] ?? '',
  [ModelPricingSource.UNPRICED]: STATUS_STYLES['error'] ?? '',
};

export const MODEL_COST_CLASS_OPTIONS: ReadonlyArray<CostClass> = [
  CostClass.FREE,
  CostClass.CHEAP,
  CostClass.STANDARD,
  CostClass.PREMIUM,
  CostClass.ULTRA,
];

export const MODEL_COST_CLASS_LABEL_KEYS: Record<CostClass, string> = {
  [CostClass.FREE]: 'adminModelCosts.costClass.free',
  [CostClass.CHEAP]: 'adminModelCosts.costClass.cheap',
  [CostClass.STANDARD]: 'adminModelCosts.costClass.standard',
  [CostClass.PREMIUM]: 'adminModelCosts.costClass.premium',
  [CostClass.ULTRA]: 'adminModelCosts.costClass.ultra',
};

/** Zeroed tally, so a counter never has to test for an absent key. */
export const MODEL_COST_EMPTY_SOURCE_COUNTS: ModelCostSourceCounts = {
  [ModelPricingSource.PUBLISHED]: 0,
  [ModelPricingSource.DATED_FAMILY]: 0,
  [ModelPricingSource.PROVIDER_FALLBACK]: 0,
  [ModelPricingSource.LOCAL_FREE]: 0,
  [ModelPricingSource.UNPRICED]: 0,
};
