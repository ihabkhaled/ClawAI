'use client';

import type { ReactElement } from 'react';

import { ModelBillingFilterChips } from '@/components/admin/model-billing/model-billing-filter-chips';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MODEL_PRICING_SOURCE_FILTER_LABEL_KEYS,
  MODEL_PRICING_SOURCE_FILTER_OPTIONS,
} from '@/constants/model-cost.constants';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import type { ModelCostFilterChipsProps } from '@/types/model-cost.types';
import { resolveModelCostFilterCount } from '@/utilities/model-cost-filter.utility';

/** Pricing-source chips and billing chips, each carrying its own count. */
export function ModelCostFilterChips({
  sourceFilter,
  counts,
  totalCount,
  onSourceFilterChange,
  billingFilter,
  billingCounts,
  onBillingFilterChange,
  t,
}: ModelCostFilterChipsProps): ReactElement {
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
      <ModelBillingFilterChips
        value={billingFilter}
        counts={billingCounts}
        totalCount={totalCount}
        onChange={onBillingFilterChange}
        t={t}
      />
    </div>
  );
}
