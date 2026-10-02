'use client';

import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MODEL_BILLING_FILTER_LABEL_KEYS,
  MODEL_BILLING_FILTER_OPTIONS,
} from '@/constants/model-billing.constants';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import type { ModelBillingFilterChipsProps } from '@/types/model-billing.types';
import { resolveModelBillingFilterCount } from '@/utilities/model-billing.utility';

/** All / Credit / Included, each with its count over the whole catalogue. */
export function ModelBillingFilterChips({
  value,
  counts,
  totalCount,
  onChange,
  t,
}: ModelBillingFilterChipsProps): ReactElement {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={t('adminModelCosts.billing.filterLabel')}
      data-testid="model-billing-filter"
    >
      {MODEL_BILLING_FILTER_OPTIONS.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={option === value ? 'default' : 'outline'}
          aria-pressed={option === value}
          onClick={() => onChange(option)}
        >
          {t(MODEL_BILLING_FILTER_LABEL_KEYS[option])}
          <Badge variant={BadgeVariant.SECONDARY} className="ms-2">
            {resolveModelBillingFilterCount(option, counts, totalCount)}
          </Badge>
        </Button>
      ))}
    </div>
  );
}
