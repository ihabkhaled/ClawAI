'use client';

import { Activity } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/observability/stat-card';
import { UsageChart } from '@/components/observability/usage-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useObservabilityPage } from '@/hooks/observability/use-observability-page';
import { useTranslation } from '@/lib/i18n';

export default function ObservabilityPage() {
  const { summary, cost, latency, auditStats, isLoading, isError } = useObservabilityPage();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div>
        <PageHeader title={t('observability.title')} description={t('observability.description')} />
        <LoadingSpinner label={t('observability.loadingData')} />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title={t('observability.title')} description={t('observability.description')} />
        <EmptyState
          icon={Activity}
          title={t('observability.failedToLoad')}
          description={t('observability.failedToLoadDesc')}
        />
      </div>
    );
  }

  const hasData = summary.totalRequests > 0;

  if (!hasData) {
    return (
      <div>
        <PageHeader title={t('observability.title')} description={t('observability.description')} />
        <EmptyState
          icon={Activity}
          title={t('observability.noDataYet')}
          description={t('observability.noDataDesc')}
        />
      </div>
    );
  }

  const failureCount = auditStats.bySeverity
    .filter((s) => s._id === 'HIGH' || s._id === 'CRITICAL')
    .reduce((sum, s) => sum + s.count, 0);

  return (
    <div>
      <PageHeader
        title={t('observability.title')}
        description={t('observability.fullDescription')}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          title={t('observability.totalRequests')}
          value={summary.totalRequests.toLocaleString()}
          description={t('observability.acrossProviders')}
        />
        <StatCard
          title={t('observability.estimatedCost')}
          value={`$${cost.estimatedCost.toFixed(4)}`}
          description={`${cost.totalTokens.toLocaleString()} total tokens`}
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
                <span className="text-sm text-muted-foreground">{t('observability.avg')}</span>
                <span className="font-medium">{latency.avgLatency.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('observability.p50Median')}
                </span>
                <span className="font-medium">{latency.p50Latency.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('observability.p95')}</span>
                <span className="font-medium">{latency.p95Latency.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
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
                <span className="text-sm text-muted-foreground">
                  {t('observability.totalTokens')}
                </span>
                <span className="font-medium">{cost.totalTokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('observability.totalRequestsLabel')}
                </span>
                <span className="font-medium">{cost.totalRequests.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('observability.estimatedCostLabel')}
                </span>
                <span className="text-lg font-bold">${cost.estimatedCost.toFixed(4)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
