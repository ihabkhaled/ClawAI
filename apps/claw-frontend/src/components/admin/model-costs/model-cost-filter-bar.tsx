'use client';

import type { ReactElement } from 'react';

import { ModelCostFilterChips } from '@/components/admin/model-costs/model-cost-filter-chips';
import { ModelCostFilterSheet } from '@/components/admin/model-costs/model-cost-filter-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModelBillingFilter } from '@/enums/model-billing.enum';
import { ModelPricingSourceFilter } from '@/enums/model-pricing-source.enum';
import type { ModelCostFilterBarProps } from '@/types/model-cost.types';

/**
 * Source chips, billing chips and a search box. On a mouse the chips sit
 * inline; on touch they collapse into a sheet and the toolbar sticks to the
 * top of the scroller, so filters stay reachable deep into the list.
 */
export function ModelCostFilterBar({
  search,
  onSearchChange,
  activeFilterCount,
  ...chips
}: ModelCostFilterBarProps): ReactElement {
  const { t } = chips;
  const isFiltered = activeFilterCount > 0 || search !== '';
  return (
    <div
      className="touch:sticky touch:top-0 touch:z-20 bg-background touch:py-2 flex flex-col gap-3"
      data-testid="model-cost-filter-bar"
    >
      <div className="touch:hidden">
        <ModelCostFilterChips {...chips} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={search}
          placeholder={t('adminModelCosts.filters.searchPlaceholder')}
          aria-label={t('adminModelCosts.filters.searchPlaceholder')}
          onChange={(event) => onSearchChange(event.target.value)}
          className="min-w-0 flex-1 sm:max-w-sm"
        />
        <ModelCostFilterSheet activeFilterCount={activeFilterCount} {...chips} />
        {isFiltered ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="touch:min-h-11"
            onClick={() => {
              chips.onSourceFilterChange(ModelPricingSourceFilter.ALL);
              chips.onBillingFilterChange(ModelBillingFilter.ALL);
              onSearchChange('');
            }}
          >
            {t('adminModelCosts.filters.clear')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
