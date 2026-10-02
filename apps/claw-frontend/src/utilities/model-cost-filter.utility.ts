import { ModelBillingFilter } from '@/enums/model-billing.enum';
import {
  ModelPricingSourceFilter,
  type ModelPricingSource,
} from '@/enums/model-pricing-source.enum';
import type { ModelCostSourceCounts } from '@/types/model-cost.types';

/**
 * The number a filter chip shows. ALL carries the whole catalogue's size;
 * every other chip carries its own source's tally — both counted over the
 * UNFILTERED rows, so a chip never reads zero just because another chip is
 * currently selected.
 */
export function resolveModelCostFilterCount(
  option: ModelPricingSource | ModelPricingSourceFilter,
  counts: ModelCostSourceCounts,
  totalCount: number,
): number {
  return option === ModelPricingSourceFilter.ALL ? totalCount : counts[option];
}

/** How many chip filters are narrowing the list, for the touch "Filters" button. */
export function countActiveModelCostFilters(
  sourceFilter: ModelPricingSource | ModelPricingSourceFilter,
  billingFilter: ModelBillingFilter,
): number {
  return (
    (sourceFilter === ModelPricingSourceFilter.ALL ? 0 : 1) +
    (billingFilter === ModelBillingFilter.ALL ? 0 : 1)
  );
}

/** The key that resets "Show more" when any filter or the search changes. */
export function buildModelCostListResetKey(
  sourceFilter: ModelPricingSource | ModelPricingSourceFilter,
  billingFilter: ModelBillingFilter,
  search: string,
): string {
  return `${sourceFilter}|${billingFilter}|${search}`;
}
