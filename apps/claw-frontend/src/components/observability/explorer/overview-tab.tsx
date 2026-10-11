import type { ReactElement } from 'react';

import { AreaLineChart } from '@/components/charts/area-line-chart';
import { LeaderboardSection } from '@/components/observability/explorer/leaderboard-section';
import { MetricCards } from '@/components/observability/explorer/metric-cards';
import { QueryState } from '@/components/observability/explorer/query-state';
import { ServiceStatusSection } from '@/components/observability/service-status-section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TOP_USERS_LIMIT } from '@/constants/observability-explorer.constants';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import { useServiceStatus } from '@/hooks/observability/use-service-status';
import { useUsageTimeseries } from '@/hooks/observability/use-usage-timeseries';
import type { OpenUserTabProps } from '@/types/observability-explorer.types';
import {
  buildRequestPoints,
  formatCount,
  formatTimestamp,
} from '@/utilities/observability-explorer.utility';

/** Service health, the period's headline numbers, requests over time and the heaviest users. */
export function OverviewTab({ scope, onOpenUser, t }: OpenUserTabProps): ReactElement {
  const serviceStatus = useServiceStatus();
  const series = useUsageTimeseries(scope);
  const { data } = series;

  return (
    <div className="space-y-6">
      <ServiceStatusSection {...serviceStatus} />

      <QueryState
        isLoading={series.isLoading}
        isError={series.isError}
        isEmpty={data !== null && data.totals.requests === 0}
        onRetry={series.refetch}
        t={t}
      >
        {data === null ? null : (
          <div className="space-y-6">
            <p className="text-muted-foreground text-xs">
              {t('usageAnalytics.rangeSummary', {
                from: formatTimestamp(data.from),
                to: formatTimestamp(data.to),
                grain:
                  data.grain === 'HOUR'
                    ? t('usageAnalytics.grainHour')
                    : t('usageAnalytics.grainDay'),
              })}
            </p>
            <MetricCards totals={data.totals} t={t} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('observabilityExplorer.chartRequests')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AreaLineChart
                  points={buildRequestPoints(data.series, data.grain)}
                  ariaLabel={t('observabilityExplorer.chartRequests')}
                  emptyLabel={t('usageAnalytics.seriesEmpty')}
                  formatValue={formatCount}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </QueryState>

      <LeaderboardSection
        scope={scope}
        t={t}
        dimension={UsageLeaderboardDimension.User}
        heading={t('usageAnalytics.topUsersHeading')}
        firstColumnLabel={t('usageAnalytics.colUser')}
        pageSize={TOP_USERS_LIMIT}
        compact
        onOpenUser={onOpenUser}
      />
    </div>
  );
}
