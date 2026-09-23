import { Activity } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import type { UsageOverviewProps } from '@/types';

import { StatCard } from './stat-card';
import { UsageChart } from './usage-chart';

/**
 * LLM usage: requests, cost, latency, failures. Its loading, error and empty
 * states are its own, so an empty usage ledger no longer hides the
 * service-status section above it.
 */
export function UsageOverview({
  summary,
  cost,
  latency,
  auditStats,
  isLoading,
  isError,
}: UsageOverviewProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <LoadingSpinner label={t('observability.loadingData')} />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={Activity}
        title={t('observability.failedToLoad')}
        description={t('observability.failedToLoadDesc')}
      />
    );
  }

  if (summary.totalRequests <= 0) {
    return (
      <EmptyState
        icon={Activity}
        title={t('observability.noDataYet')}
        description={t('observability.noDataDesc')}
      />
    );
  }

  const failureCount = auditStats.bySeverity
    .filter((s) => s._id === 'HIGH' || s._id === 'CRITICAL')
    .reduce((sum, s) => sum + s.count, 0);

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          title={t('observability.totalRequests')}
          value={summary.totalRequests.toLocaleString()}
          description={t('observability.acrossProviders')}
        />
        <StatCard
          title={t('observability.estimatedCost')}
          value={`$${cost.estimatedCost.toFixed(4)}`}
          description={t('observability.totalTokensCount', {
            count: cost.totalTokens.toLocaleString(),
          })}
        />
        <StatCard
          title={t('observability.avgLatency')}
          value={`${latency.avgLatency.toFixed(0)}ms`}
          description={`p50: ${latency.p50Latency.toFixed(0)}ms / p95: ${latency.p95Latency.toFixed(0)}ms`}
        />
        <StatCard
          title={t('observability.recentFailures')}
          value={failureCount}
          description={t('observability.highCriticalSeverity')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('observability.providerUsage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart
              title=""
              items={summary.byProvider.map((p) => ({
                label: p.provider ?? t('common.unknown'),
                value: p.count,
                secondaryValue: p.totalTokens,
              }))}
              valueLabel={t('observability.requests')}
              secondaryLabel={t('observability.tokens')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('observability.modelUsage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart
              title=""
              items={summary.byModel.map((m) => ({
                label: m.model ?? t('common.unknown'),
                value: m.count,
                secondaryValue: m.totalTokens,
              }))}
              valueLabel={t('observability.requests')}
              secondaryLabel={t('observability.tokens')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('observability.latencyBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('observability.avg')}</span>
                <span className="font-medium">{latency.avgLatency.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {t('observability.p50Median')}
                </span>
                <span className="font-medium">{latency.p50Latency.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('observability.p95')}</span>
                <span className="font-medium">{latency.p95Latency.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {t('observability.totalRequestsLabel')}
                </span>
                <span className="font-medium">{latency.totalRequests.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('observability.costSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {t('observability.totalTokens')}
                </span>
                <span className="font-medium">{cost.totalTokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {t('observability.totalRequestsLabel')}
                </span>
                <span className="font-medium">{cost.totalRequests.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {t('observability.estimatedCostLabel')}
                </span>
                <span className="text-lg font-bold">${cost.estimatedCost.toFixed(4)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
