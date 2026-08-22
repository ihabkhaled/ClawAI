import type { ReactElement } from 'react';

import { BillingMetricChart } from '@/components/admin/billing/billing-metric-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UseAdminBillingDashboardResult } from '@/types/admin-billing-dashboard.types';
import { formatMinorAmount } from '@/utilities';
import { formatBasisPoints, formatMicroUsd } from '@/utilities/billing-dashboard.utility';

export function BillingDashboardContent({
  dashboard,
  t,
  locale,
}: UseAdminBillingDashboardResult): ReactElement | null {
  if (dashboard === null) {
    return null;
  }
  const cards = [
    { label: t('adminBilling.revenue'), value: formatMicroUsd(dashboard.revenueMicroUsd) },
    {
      label: t('adminBilling.providerCost'),
      value: formatMicroUsd(dashboard.providerCostMicroUsd),
    },
    { label: t('adminBilling.margin'), value: formatMicroUsd(dashboard.marginMicroUsd) },
    {
      label: t('adminBilling.churn'),
      value: formatBasisPoints(dashboard.churnBasisPoints),
    },
    { label: t('adminBilling.failedPayments'), value: String(dashboard.failedPayments) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{card.value}</CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('adminBilling.subscriptions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.subscriptionCounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('adminBilling.empty')}</p>
          ) : (
            <BillingMetricChart rows={dashboard.subscriptionCounts} t={t} />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('adminBilling.nonUsdRevenue')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {dashboard.revenueByCurrency
            .filter((row) => row.currency !== 'USD')
            .map((row) => (
              <span key={row.currency} className="rounded-md border px-3 py-2 text-sm">
                {formatMinorAmount(row.amountMinor, row.currency, locale)}
              </span>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
