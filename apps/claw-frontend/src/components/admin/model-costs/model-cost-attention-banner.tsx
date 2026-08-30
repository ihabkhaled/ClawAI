'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';

import type { ModelCostAttentionBannerProps } from '@/types/model-cost.types';

/**
 * Names the work, in money terms.
 *
 * A fallback row is not a cosmetic gap: the request is charged at the dearest
 * rate that provider publishes for ANY model, deliberately over-charging so
 * spend stays bounded. The banner exists so an operator sees that before they
 * see the table.
 */
export function ModelCostAttentionBanner({
  fallbackCount,
  unpricedCount,
  t,
}: ModelCostAttentionBannerProps): ReactElement | null {
  if (fallbackCount === 0 && unpricedCount === 0) {
    return null;
  }

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-100 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {fallbackCount > 0 ? (
          <p>{t('adminModelCosts.banner.fallback', { count: fallbackCount })}</p>
        ) : null}
        {unpricedCount > 0 ? (
          <p>{t('adminModelCosts.banner.unpriced', { count: unpricedCount })}</p>
        ) : null}
      </div>
    </div>
  );
}
