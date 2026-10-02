'use client';

import type { ReactElement } from 'react';

import { StatusBadge } from '@/components/common/status-badge';
import {
  MODEL_BILLING_BADGE_CLASSES,
  MODEL_BILLING_LABEL_KEYS,
  MODEL_BILLING_SOURCE_HINT_KEYS,
} from '@/constants/model-billing.constants';
import type { ModelBillingBadgeProps } from '@/types/model-billing.types';

/**
 * "Credit" (paid from the user's credit wallet) or "Included" (never metered).
 * The hover title says WHERE the answer came from: the connector switch, the
 * provider default, or a local provider.
 */
export function ModelBillingBadge({ billing, t }: ModelBillingBadgeProps): ReactElement {
  return (
    <span
      className="inline-flex"
      title={t(MODEL_BILLING_SOURCE_HINT_KEYS[billing.source])}
      data-testid="model-billing-badge"
      data-billing-mode={billing.mode}
    >
      <StatusBadge
        status={t(MODEL_BILLING_LABEL_KEYS[billing.mode])}
        className={MODEL_BILLING_BADGE_CLASSES[billing.mode]}
      />
    </span>
  );
}
