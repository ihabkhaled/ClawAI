'use client';

import type { ReactElement } from 'react';

import { StatusBadge } from '@/components/common/status-badge';
import {
  MODEL_PRICING_SOURCE_BADGE_CLASSES,
  MODEL_PRICING_SOURCE_LABEL_KEYS,
} from '@/constants/model-cost.constants';
import type { ModelCostSourceBadgeProps } from '@/types/model-cost.types';

/**
 * The pricing source, coloured by how much it should worry the operator.
 *
 * The label is translated rather than the raw enum value, and the colour comes
 * from the audited StatusBadge palette — colour alone never carries the
 * meaning here, which is why the word is always present.
 */
export function ModelCostSourceBadge({ source, t }: ModelCostSourceBadgeProps): ReactElement {
  return (
    <StatusBadge
      status={t(MODEL_PRICING_SOURCE_LABEL_KEYS[source])}
      className={MODEL_PRICING_SOURCE_BADGE_CLASSES[source]}
    />
  );
}
