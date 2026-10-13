import type { ReactElement } from 'react';

import { CostKindBadge } from '@/components/observability/explorer/cost-kind-badge';
import { KpiCard } from '@/components/observability/pages/kpi-card';
import { KpiDeltaLine } from '@/components/observability/pages/kpi-delta-line';
import { StatCard } from '@/components/observability/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { KpiGridProps } from '@/types/observability-pages.types';
import { formatCount, formatUsd } from '@/utilities/observability-explorer.utility';
import {
  formatKpiCount,
  formatOptionalCount,
  formatRatioPercent,
  toCostKind,
} from '@/utilities/observability-pages.utility';

/**
 * The period's headline numbers. The five that can be compared carry their change
 * against the previous period of the same length; cost carries its honesty badge.
 */
export function KpiGrid({ overview, t }: KpiGridProps): ReactElement {
  const { totals, deltas, health } = overview;
  const { metrics, derived } = totals;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="kpi-grid">
      <KpiCard
        title={t('usageAnalytics.cardRequests')}
        value={formatKpiCount(deltas.requests.current)}
        delta={deltas.requests}
        t={t}
      />
      <KpiCard
        title={t('usageAnalytics.cardTokens')}
        value={formatKpiCount(deltas.tokens.current)}
        delta={deltas.tokens}
        t={t}
      />
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t('usageAnalytics.cardCost')}</CardDescription>
          <CardTitle className="text-2xl">{formatUsd(deltas.costMicroUsd.current)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <CostKindBadge
            kind={toCostKind(metrics.cost.costKind)}
            partial={metrics.cost.partial}
            t={t}
          />
          <KpiDeltaLine delta={deltas.costMicroUsd} t={t} />
        </CardContent>
      </Card>
      <KpiCard
        title={t('observabilityExplorer.cardToolCalls')}
        value={formatKpiCount(deltas.toolCalls.current)}
        delta={deltas.toolCalls}
        t={t}
      />
      <KpiCard
        title={t('observabilityPages.cardActiveUsers')}
        value={formatKpiCount(deltas.activeUsers.current)}
        delta={deltas.activeUsers}
        t={t}
      />
      <StatCard
        title={t('observabilityPages.cardFirstTimeUsers')}
        value={formatCount(overview.firstTimeUsers)}
        description={t('observabilityPages.cardFirstTimeUsersHint')}
      />
      <StatCard
        title={t('observabilityPages.cardNewSignups')}
        value={formatCount(overview.newSignups)}
        description={t('observabilityPages.cardNewSignupsHint')}
      />
      <StatCard
        title={t('observabilityPages.cardCostPerRequest')}
        value={
          derived.costPerRequestMicroUsd === null ? '-' : formatUsd(derived.costPerRequestMicroUsd)
        }
        description={t('observabilityPages.cardCostPerRequestHint', {
          input: formatOptionalCount(derived.avgInputTokens),
          output: formatOptionalCount(derived.avgOutputTokens),
        })}
      />
      <StatCard
        title={t('observabilityPages.cardCacheHit')}
        value={formatRatioPercent(derived.cacheHitRate)}
        description={t('observabilityPages.cardCacheHitHint', {
          cached: formatCount(metrics.cachedTokens),
        })}
      />
      <StatCard
        title={t('observabilityPages.cardSettleRate')}
        value={formatRatioPercent(health.settleRate)}
        description={t('observabilityPages.cardSettleRateHint', {
          released: formatCount(health.released),
        })}
      />
      <StatCard
        title={t('observabilityExplorer.cardCreditRequests')}
        value={formatCount(metrics.creditRequests)}
        description={formatUsd(metrics.creditSpendMicroUsd)}
      />
      <StatCard
        title={t('observabilityPages.cardAllowanceCost')}
        value={formatUsd(metrics.allowanceCostMicroUsd)}
        description={t('observabilityPages.cardAllowanceCostHint', {
          count: formatCount(metrics.allowanceRequests),
        })}
      />
    </div>
  );
}
