import type { ReactElement } from 'react';

import { AreaLineChart } from '@/components/charts/area-line-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { StackedBarChart } from '@/components/charts/stacked-bar-chart';
import { LeaderboardSection } from '@/components/observability/explorer/leaderboard-section';
import { MetricCards } from '@/components/observability/explorer/metric-cards';
import { QueryState } from '@/components/observability/explorer/query-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import { useUsageTimeseries } from '@/hooks/observability/use-usage-timeseries';
import type { ExplorerTabProps } from '@/types/observability-explorer.types';
import {
  buildBucketLabels,
  buildCostPoints,
  buildTokenSeries,
  formatCount,
} from '@/utilities/observability-explorer.utility';

/** Tokens, cost and who paid, over time, plus consumption by workflow. */
export function ConsumptionTab({ scope, t }: ExplorerTabProps): ReactElement {
  const series = useUsageTimeseries(scope);
  const { data } = series;
  const other =
    data === null
      ? 0
      : Math.max(
          0,
          data.totals.requests - data.totals.creditRequests - data.totals.allowanceRequests,
        );

  return (
    <div className="space-y-6">
      <QueryState
        isLoading={series.isLoading}
        isError={series.isError}
        isEmpty={data !== null && data.totals.requests === 0}
        onRetry={series.refetch}
        t={t}
      >
        {data === null ? null : (
          <div className="space-y-6">
            <MetricCards totals={data.totals} t={t} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('observabilityExplorer.chartTokens')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StackedBarChart
                    labels={buildBucketLabels(data.series, data.grain)}
                    series={buildTokenSeries(data.series, {
                      input: t('usageAnalytics.seriesInput'),
                      output: t('usageAnalytics.seriesOutput'),
                    })}
                    ariaLabel={t('usageAnalytics.seriesAria')}
                    emptyLabel={t('usageAnalytics.seriesEmpty')}
                    formatValue={formatCount}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('observabilityExplorer.chartCost')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <AreaLineChart
                    points={buildCostPoints(data.series, data.grain)}
                    ariaLabel={t('observabilityExplorer.chartCost')}
                    emptyLabel={t('usageAnalytics.seriesEmpty')}
                    formatValue={(value) => `$${value.toFixed(4)}`}
                  />
                  {data.totals.cost.partial ? (
                    <p className="text-muted-foreground text-xs">
                      {t('observabilityExplorer.costPartial')}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('observabilityExplorer.chartBilling')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DonutChart
                    slices={[
                      {
                        key: 'credit',
                        label: t('observabilityExplorer.billingCredit'),
                        value: data.totals.creditRequests,
                      },
                      {
                        key: 'allowance',
                        label: t('observabilityExplorer.billingAllowance'),
                        value: data.totals.allowanceRequests,
                      },
                      {
                        key: 'other',
                        label: t('observabilityExplorer.billingOther'),
                        value: other,
                      },
                    ]}
                    ariaLabel={t('observabilityExplorer.chartBilling')}
                    emptyLabel={t('usageAnalytics.empty')}
                    formatValue={formatCount}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </QueryState>

      <LeaderboardSection
        scope={scope}
        t={t}
        dimension={UsageLeaderboardDimension.Workflow}
        heading={t('usageAnalytics.workflowsHeading')}
        firstColumnLabel={t('observabilityExplorer.colWorkflow')}
        showChart
      />
    </div>
  );
}
