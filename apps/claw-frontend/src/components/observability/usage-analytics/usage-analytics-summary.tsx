import type { ReactElement } from 'react';

import { StatCard } from '@/components/observability/stat-card';
import type { UsageAnalyticsSummaryProps } from '@/types/admin-usage-analytics.types';
import { formatMicroUsd } from '@/utilities/billing-dashboard.utility';

/**
 * Headline numbers. "USD consumed today" is its own figure (since 00:00 UTC) and
 * does not follow the period filter; the rest describe the chosen period.
 */
export function UsageAnalyticsSummary({ analytics, t }: UsageAnalyticsSummaryProps): ReactElement {
  const { totals, today } = analytics;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title={t('usageAnalytics.cardToday')}
        value={formatMicroUsd(today.costMicroUsd)}
        description={t('usageAnalytics.cardTodayHint')}
      />
      <StatCard title={t('usageAnalytics.cardCost')} value={formatMicroUsd(totals.costMicroUsd)} />
      <StatCard title={t('usageAnalytics.cardRequests')} value={totals.requests.toLocaleString()} />
      <StatCard
        title={t('usageAnalytics.cardTokens')}
        value={(totals.inputTokens + totals.outputTokens).toLocaleString()}
        description={t('usageAnalytics.cardTokensHint', {
          input: totals.inputTokens.toLocaleString(),
          output: totals.outputTokens.toLocaleString(),
        })}
      />
      <StatCard
        title={t('usageAnalytics.cardUsers')}
        value={analytics.activeUsers.toLocaleString()}
      />
    </div>
  );
}
