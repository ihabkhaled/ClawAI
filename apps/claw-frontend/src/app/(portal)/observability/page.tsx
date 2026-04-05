'use client';

import { Activity } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/observability/stat-card';
import { UsageChart } from '@/components/observability/usage-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useObservabilityPage } from '@/hooks/observability/use-observability-page';

export default function ObservabilityPage() {
  const { summary, cost, latency, auditStats, isLoading, isError } = useObservabilityPage();

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Observability"
          description="Monitor system health, request latencies, and model performance"
        />
        <LoadingSpinner label="Loading observability data..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader
          title="Observability"
          description="Monitor system health, request latencies, and model performance"
        />
        <EmptyState
          icon={Activity}
          title="Failed to load data"
          description="Could not fetch observability data. Please try again later."
        />
      </div>
    );
  }

  const hasData = summary.totalRequests > 0;

  if (!hasData) {
    return (
      <div>
        <PageHeader
          title="Observability"
          description="Monitor system health, request latencies, and model performance"
        />
        <EmptyState
          icon={Activity}
          title="No observability data yet"
          description="Metrics and performance data will populate here once requests begin flowing through the orchestration layer."
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
        title="Observability"
        description="Monitor system health, request latencies, and model performance"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={summary.totalRequests.toLocaleString()}
          description="Across all providers"
        />
        <StatCard
          title="Estimated Cost"
          value={`$${cost.estimatedCost.toFixed(4)}`}
          description={`${cost.totalTokens.toLocaleString()} total tokens`}
        />
        <StatCard
          title="Avg Latency"
          value={`${latency.avgLatency.toFixed(0)}ms`}
          description={`p50: ${latency.p50Latency.toFixed(0)}ms / p95: ${latency.p95Latency.toFixed(0)}ms`}
        />
        <StatCard
          title="Recent Failures"
          value={failureCount}
          description="HIGH + CRITICAL severity events"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Provider Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart
              title=""
              items={summary.byProvider.map((p) => ({
                label: p.provider ?? 'Unknown',
                value: p.count,
                secondaryValue: p.totalTokens,
              }))}
              valueLabel="requests"
              secondaryLabel="tokens"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart
              title=""
              items={summary.byModel.map((m) => ({
                label: m.model ?? 'Unknown',
                value: m.count,
                secondaryValue: m.totalTokens,
              }))}
              valueLabel="requests"
              secondaryLabel="tokens"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Latency Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average</span>
                <span className="font-medium">{latency.avgLatency.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">P50 (Median)</span>
                <span className="font-medium">{latency.p50Latency.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">P95</span>
                <span className="font-medium">{latency.p95Latency.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Requests</span>
                <span className="font-medium">{latency.totalRequests.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Tokens</span>
                <span className="font-medium">{cost.totalTokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Requests</span>
                <span className="font-medium">{cost.totalRequests.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated Cost</span>
                <span className="text-lg font-bold">${cost.estimatedCost.toFixed(4)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
