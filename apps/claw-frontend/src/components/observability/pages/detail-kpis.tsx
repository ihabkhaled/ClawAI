import type { ReactElement } from 'react';

import { CostKindBadge } from '@/components/observability/explorer/cost-kind-badge';
import { StatCard } from '@/components/observability/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DetailSectionProps } from '@/types/observability-pages.types';
import { formatCount, formatUsd, totalTokens } from '@/utilities/observability-explorer.utility';
import {
  formatDecimal,
  formatPercent,
  formatRatioPercent,
  formatSettle,
  toCostKind,
} from '@/utilities/observability-pages.utility';

/** The headline numbers of one provider or model for the period. */
export function DetailKpis({ detail, t }: DetailSectionProps): ReactElement {
  const { metrics, derived, health } = detail.entity;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="detail-kpis">
      <StatCard title={t('usageAnalytics.cardRequests')} value={formatCount(metrics.requests)} />
      <StatCard
        title={t('usageAnalytics.cardTokens')}
        value={formatCount(totalTokens(metrics))}
        description={t('usageAnalytics.cardTokensHint', {
          input: formatCount(metrics.inputTokens),
          output: formatCount(metrics.outputTokens),
        })}
      />
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t('usageAnalytics.cardCost')}</CardDescription>
          <CardTitle className="text-2xl">{formatUsd(metrics.cost.costMicroUsd)}</CardTitle>
        </CardHeader>
        <CardContent>
          <CostKindBadge
            kind={toCostKind(metrics.cost.costKind)}
            partial={metrics.cost.partial}
            t={t}
          />
        </CardContent>
      </Card>
      <StatCard
        title={t('observabilityPages.cardCostPerRequest')}
        value={
          derived.costPerRequestMicroUsd === null ? '-' : formatUsd(derived.costPerRequestMicroUsd)
        }
        description={
          derived.costPer1kTokensMicroUsd === null
            ? undefined
            : t('observabilityPages.costPer1k', {
                cost: formatUsd(derived.costPer1kTokensMicroUsd),
              })
        }
      />
      <StatCard
        title={t('observabilityPages.colShareOfCost')}
        value={formatPercent(derived.shareOfCostPct)}
        description={t('observabilityPages.shareOfRequests', {
          share: formatPercent(derived.shareOfRequestsPct),
        })}
      />
      <StatCard
        title={t('observabilityPages.colUsers')}
        value={metrics.distinctUsers === null ? '-' : formatCount(metrics.distinctUsers)}
        description={t('observabilityPages.activeDaysHint', {
          days: formatCount(metrics.activeDays),
        })}
      />
      <StatCard
        title={t('observabilityPages.cardCacheHit')}
        value={formatRatioPercent(derived.cacheHitRate)}
        description={t('observabilityPages.reasoningShare', {
          share: formatRatioPercent(derived.reasoningShare),
        })}
      />
      <StatCard
        title={t('observabilityPages.toolCallsPerRequest')}
        value={formatDecimal(derived.toolCallsPerRequest)}
        description={t('observabilityPages.toolCallsTotal', {
          count: formatCount(metrics.toolCalls),
        })}
      />
      <StatCard
        title={t('observabilityPages.colSettleRate')}
        value={formatRatioPercent(health?.settleRate ?? null)}
        description={t('observabilityPages.settleHint', {
          p50: formatSettle(health?.p50SettleMs ?? null),
          p95: formatSettle(health?.p95SettleMs ?? null),
        })}
      />
      <StatCard
        title={t('observabilityPages.colRefundRate')}
        value={formatRatioPercent(health?.refundRate ?? null)}
        description={t('observabilityPages.refundHint', {
          released: formatCount(health?.released ?? 0),
        })}
      />
      <StatCard
        title={t('observabilityPages.estimateAccuracy')}
        value={formatRatioPercent(derived.estimateAccuracy)}
        description={t('observabilityPages.estimateAccuracyHint')}
      />
    </div>
  );
}
