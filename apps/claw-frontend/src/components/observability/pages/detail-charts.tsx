import type { ReactElement } from 'react';

import { AreaLineChart } from '@/components/charts/area-line-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { StackedBarChart } from '@/components/charts/stacked-bar-chart';
import { ChartCard } from '@/components/observability/pages/chart-card';
import { OBS_BILLING_LABEL_KEYS } from '@/constants/observability-pages.constants';
import type { DetailSectionProps } from '@/types/observability-pages.types';
import { formatCount } from '@/utilities/observability-explorer.utility';
import {
  bucketLabels,
  costPoints,
  formatChartUsd,
  hourOfDaySeries,
  requestPoints,
  tokenSeries,
} from '@/utilities/observability-pages.utility';

/** Requests, cost and tokens over the period, when in the day it is used, and who paid. */
export function DetailCharts({ detail, t }: DetailSectionProps): ReactElement {
  const { series, grain } = detail;
  const hours = hourOfDaySeries(detail.hourOfDay);
  const empty = t('usageAnalytics.seriesEmpty');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="detail-charts">
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
          slices={detail.billingSplit.map((line) => ({
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
    </div>
  );
}
