import { useCallback, useState } from 'react';

import {
  ModelPricingSourceFilter,
  type ModelPricingSource,
} from '@/enums/model-pricing-source.enum';
import type { UseModelCostFiltersResult } from '@/types/model-cost.types';

/** Which pricing sources the table shows, and the free-text narrowing. */
export function useModelCostFilters(): UseModelCostFiltersResult {
  const [sourceFilter, setSourceFilter] = useState<ModelPricingSource | ModelPricingSourceFilter>(
    ModelPricingSourceFilter.ALL,
  );
  const [search, setSearch] = useState('');

  const handleSetSourceFilter = useCallback(
    (value: ModelPricingSource | ModelPricingSourceFilter): void => {
      setSourceFilter(value);
    },
    [],
  );

  const handleSetSearch = useCallback((value: string): void => {
    setSearch(value);
  }, []);

  return {
    sourceFilter,
    setSourceFilter: handleSetSourceFilter,
    search,
    setSearch: handleSetSearch,
  };
}
