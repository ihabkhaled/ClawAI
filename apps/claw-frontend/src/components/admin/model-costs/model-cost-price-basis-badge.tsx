'use client';

import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  MODEL_PRICE_BASIS_BADGE_CLASSES,
  MODEL_PRICE_BASIS_HINT_KEYS,
  MODEL_PRICE_BASIS_LABEL_KEYS,
} from '@/constants/model-cost.constants';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import { cn } from '@/lib/utils';
import type { ModelCostPriceBasisBadgeProps } from '@/types/model-cost.types';
import { toModelPriceBasis } from '@/utilities/model-cost-unpriced.utility';

/**
 * How far to trust the stored price. The hint is the tooltip (native `title`,
 * so it also works on touch long-press) and the accessible description; the
 * word is always visible, so colour never carries the meaning alone.
 */
export function ModelCostPriceBasisBadge({
  basis,
  t,
}: ModelCostPriceBasisBadgeProps): ReactElement | null {
  const known = toModelPriceBasis(basis);
  if (known === null) {
    return null;
  }
  const label = t(MODEL_PRICE_BASIS_LABEL_KEYS[known]);
  const hint = t(MODEL_PRICE_BASIS_HINT_KEYS[known]);
  return (
    <Badge
      variant={BadgeVariant.OUTLINE}
      title={hint}
      data-testid="model-cost-price-basis"
      className={cn(MODEL_PRICE_BASIS_BADGE_CLASSES[known])}
    >
      {label}
      <span className="sr-only">{`. ${hint}`}</span>
    </Badge>
  );
}
