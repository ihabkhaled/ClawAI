import type { ReactElement } from 'react';

import { AreaLineChart } from '@/components/charts/area-line-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { StackedBarChart } from '@/components/charts/stacked-bar-chart';
import { ChartCard } from '@/components/observability/pages/chart-card';
import {
  OBS_BILLING_LABEL_KEYS,
  WEEKDAY_LABEL_KEYS,
} from '@/constants/observability-pages.constants';
import type { OverviewChartsProps } from '@/types/observability-pages.types';
import { formatCount } from '@/utilities/observability-explorer.utility';
import {
  activeUserPoints,
  bucketLabels,
  costPoints,
  formatChartUsd,
  dayOfWeekSeries,
  hourOfDaySeries,
  requestPoints,
  signupPoints,
  tokenSeries,
} from '@/utilities/observability-pages.utility';

/**
 * The hub's time and activity charts: requests, cost, active users, signups and
 * tokens over the period, then when in the day and week traffic lands (UTC), and
 * who paid. Every chart has a text alternative and a legend.
 */
export function OverviewCharts({ overview, t }: OverviewChartsProps): ReactElement {
  const { series, grain } = overview;
  const hours = hourOfDaySeries(overview.hourOfDay);
  const weekdays = dayOfWeekSeries(
    overview.dayOfWeek,
    WEEKDAY_LABEL_KEYS.map((key) => t(key)),
  );
  const empty = t('usageAnalytics.seriesEmpty');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="overview-charts">
      <ChartCard title={t('observabilityExplorer.chartRequests')}>
        <AreaLineChart
          points={requestPoints(series, grain)}
          ariaLabel={t('observabilityExplorer.chartRequests')}
          emptyLabel={empty}
          formatValue={formatCount}
        />
      </ChartCard>
      <ChartCard title={t('observabilityPages.chartCost')}>
        <AreaLineChart
          points={costPoints(series, grain)}
          ariaLabel={t('observabilityPages.chartCost')}
          emptyLabel={empty}
          formatValue={formatChartUsd}
        />
      </ChartCard>
      <ChartCard title={t('observabilityPages.chartActiveUsers')}>
        <AreaLineChart
          points={activeUserPoints(series, grain)}
          ariaLabel={t('observabilityPages.chartActiveUsers')}
          emptyLabel={empty}
          formatValue={formatCount}
        />
      </ChartCard>
      <ChartCard
        title={t('observabilityPages.chartSignups')}
        description={t('observabilityPages.chartSignupsNote')}
      >
        <AreaLineChart
          points={signupPoints(overview.signupsSeries, grain)}
          ariaLabel={t('observabilityPages.chartSignups')}
          emptyLabel={empty}
          formatValue={formatCount}
        />
      </ChartCard>
      <ChartCard title={t('observabilityExplorer.chartTokens')}>
        <StackedBarChart
          labels={bucketLabels(series, grain)}
          series={tokenSeries(series, {
            input: t('usageAnalytics.seriesInput'),
            output: t('usageAnalytics.seriesOutput'),
          })}
          ariaLabel={t('usageAnalytics.seriesAria')}
          emptyLabel={empty}
          formatValue={formatCount}
        />
      </ChartCard>
      <ChartCard title={t('observabilityPages.chartBilling')}>
        <DonutChart
          slices={overview.billingSplit.map((line) => ({
            key: line.billing,
            label: t(OBS_BILLING_LABEL_KEYS[line.billing]),
            value: line.requests,
          }))}
          ariaLabel={t('observabilityPages.chartBilling')}
          emptyLabel={t('usageAnalytics.empty')}
          formatValue={formatCount}
        />
      </ChartCard>
      <ChartCard
        title={t('observabilityPages.chartHourOfDay')}
        description={t('observabilityPages.chartUtcNote')}
      >
        <StackedBarChart
          labels={hours.labels}
          series={[
            {
              key: 'requests',
              label: t('usageAnalytics.colRequests'),
              colorIndex: 0,
              values: hours.values,
            },
          ]}
          ariaLabel={t('observabilityPages.chartHourOfDay')}
          emptyLabel={empty}
          formatValue={formatCount}
        />
      </ChartCard>
      <ChartCard
        title={t('observabilityPages.chartDayOfWeek')}
        description={t('observabilityPages.chartUtcNote')}
      >
        <StackedBarChart
          labels={weekdays.labels}
          series={[
            {
              key: 'requests',
              label: t('usageAnalytics.colRequests'),
              colorIndex: 0,
              values: weekdays.values,
            },
          ]}
          ariaLabel={t('observabilityPages.chartDayOfWeek')}
          emptyLabel={empty}
          formatValue={formatCount}
        />
      </ChartCard>
    </div>
  );
}
