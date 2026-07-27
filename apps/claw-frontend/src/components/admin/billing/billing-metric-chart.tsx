import type { ReactElement } from 'react';

import type { BillingMetricChartProps } from '@/types/admin-billing-dashboard.types';

export function BillingMetricChart({ rows, t }: BillingMetricChartProps): ReactElement {
  const maximum = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="space-y-3" role="img" aria-label={t('adminBilling.subscriptions')}>
      {rows.map((row) => (
        <div key={`${row.planPriceVersionId}:${row.status}`} className="space-y-1">
          <div className="flex justify-between gap-3 text-sm">
            <span>
              {row.planSlug} · v{row.planPriceVersionId.slice(-6)} ·{' '}
              {t(`billing.status.${row.status}`)}
            </span>
            <span className="font-medium">{row.count}</span>
          </div>
          <progress
            className="accent-primary h-2 w-full"
            max={maximum}
            value={row.count}
            aria-label={`${row.planSlug} ${t(`billing.status.${row.status}`)}`}
          />
        </div>
      ))}
    </div>
  );
}
