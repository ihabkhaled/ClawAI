'use client';

import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MODEL_PRICING_SOURCE_FILTER_LABEL_KEYS,
  MODEL_PRICING_SOURCE_FILTER_OPTIONS,
} from '@/constants/model-cost.constants';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import { ModelPricingSourceFilter } from '@/enums/model-pricing-source.enum';
import type { ModelCostFilterBarProps } from '@/types/model-cost.types';
import { resolveModelCostFilterCount } from '@/utilities/model-cost-filter.utility';

/** One chip per pricing source, each carrying its own count, plus a search box. */
export function ModelCostFilterBar({
  sourceFilter,
  counts,
  totalCount,
  search,
  onSourceFilterChange,
  onSearchChange,
  t,
}: ModelCostFilterBarProps): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t('adminModelCosts.filters.label')}
      >
        {MODEL_PRICING_SOURCE_FILTER_OPTIONS.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={option === sourceFilter ? 'default' : 'outline'}
            aria-pressed={option === sourceFilter}
            onClick={() => onSourceFilterChange(option)}
          >
            {t(MODEL_PRICING_SOURCE_FILTER_LABEL_KEYS[option])}
            <Badge variant={BadgeVariant.SECONDARY} className="ms-2">
              {resolveModelCostFilterCount(option, counts, totalCount)}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={search}
          placeholder={t('adminModelCosts.filters.searchPlaceholder')}
          aria-label={t('adminModelCosts.filters.searchPlaceholder')}
          onChange={(event) => onSearchChange(event.target.value)}
          className="max-w-sm"
        />
        {sourceFilter === ModelPricingSourceFilter.ALL && search === '' ? null : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onSourceFilterChange(ModelPricingSourceFilter.ALL);
              onSearchChange('');
            }}
          >
            {t('adminModelCosts.filters.clear')}
          </Button>
        )}
      </div>
    </div>
  );
}
