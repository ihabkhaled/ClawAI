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
