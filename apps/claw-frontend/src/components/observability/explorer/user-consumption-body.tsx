import type { ReactElement } from 'react';

import { AreaLineChart } from '@/components/charts/area-line-chart';
import { StackedBarChart } from '@/components/charts/stacked-bar-chart';
import { BreakdownTable } from '@/components/observability/explorer/breakdown-table';
import { CursorPager } from '@/components/observability/explorer/cursor-pager';
import { ExplorerFiltersForm } from '@/components/observability/explorer/explorer-filters';
import { MetricCards } from '@/components/observability/explorer/metric-cards';
import { QueryState } from '@/components/observability/explorer/query-state';
import { SearchBox } from '@/components/observability/explorer/search-box';
import { UserRequestsTable } from '@/components/observability/explorer/user-requests-table';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import { useUserConsumption } from '@/hooks/observability/use-user-consumption';
import type { UserConsumptionBodyProps } from '@/types/observability-explorer.types';
import {
  buildBucketLabels,
  buildRequestPoints,
  buildTokenSeries,
  formatCount,
} from '@/utilities/observability-explorer.utility';

/**
 * Everything about one user's consumption, with its own period and filters.
 * Mounted with `key={userId}` so opening another user never shows the previous
 * user's figures while the new ones load.
 */
export function UserConsumptionBody({
  userId,
  initialScope,
  t,
}: UserConsumptionBodyProps): ReactElement {
  const state = useUserConsumption(userId, initialScope);
  const { detail, requests } = state;
  const options = detail?.filterOptions ?? { providers: [], models: [], workflows: [] };

  return (
    <div className="space-y-6">
      <ExplorerFiltersForm state={state.filters} options={options} t={t} />

      <QueryState
        isLoading={state.isLoading}
        isError={state.isError}
        isEmpty={false}
        onRetry={state.refetch}
        t={t}
      >
        {detail === null ? null : (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm break-all">
              {detail.user.email} ({detail.user.username}) - {detail.user.role} -{' '}
              {detail.user.status}
            </p>
            <MetricCards totals={detail.totals} t={t} />

            <section className="space-y-2" aria-label={t('observabilityExplorer.headingDaily')}>
              <h4 className="text-sm font-semibold">{t('observabilityExplorer.headingDaily')}</h4>
              <StackedBarChart
                labels={buildBucketLabels(detail.series, detail.grain)}
                series={buildTokenSeries(detail.series, {
                  input: t('usageAnalytics.seriesInput'),
                  output: t('usageAnalytics.seriesOutput'),
                })}
                ariaLabel={t('usageAnalytics.seriesAria')}
                emptyLabel={t('usageAnalytics.seriesEmpty')}
                formatValue={formatCount}
              />
              <AreaLineChart
                points={buildRequestPoints(detail.series, detail.grain)}
                ariaLabel={t('observabilityExplorer.chartRequests')}
                emptyLabel={t('usageAnalytics.seriesEmpty')}
                formatValue={formatCount}
              />
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <BreakdownTable
                rows={detail.models}
                heading={t('usageAnalytics.modelsHeading')}
                firstColumnLabel={t('usageAnalytics.colModel')}
                dimension={UsageLeaderboardDimension.Model}
                truncated={detail.breakdownTruncated}
                t={t}
              />
              <BreakdownTable
                rows={detail.providers}
                heading={t('observabilityExplorer.headingProviders')}
                firstColumnLabel={t('observabilityExplorer.colProvider')}
                dimension={UsageLeaderboardDimension.Provider}
                truncated={detail.breakdownTruncated}
                t={t}
              />
              <BreakdownTable
                rows={detail.workflows}
                heading={t('usageAnalytics.workflowsHeading')}
                firstColumnLabel={t('observabilityExplorer.colWorkflow')}
                dimension={UsageLeaderboardDimension.Workflow}
                truncated={detail.breakdownTruncated}
                t={t}
              />
            </div>

            <section className="space-y-2" aria-label={t('observabilityExplorer.headingHeaviest')}>
              <h4 className="text-sm font-semibold">
                {t('observabilityExplorer.headingHeaviest')}
              </h4>
              {detail.heaviestRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('usageAnalytics.empty')}</p>
              ) : (
                <UserRequestsTable
                  requests={detail.heaviestRequests}
                  sort="tokens"
                  order="desc"
                  t={t}
                />
              )}
            </section>
          </div>
        )}
      </QueryState>

      <section className="space-y-2" aria-label={t('observabilityExplorer.headingRequests')}>
        <h4 className="text-sm font-semibold">{t('observabilityExplorer.headingRequests')}</h4>
        <SearchBox
          id="user-requests-search"
          label={t('observabilityExplorer.requestsSearch')}
          value={state.controls.searchDraft}
          onChange={state.controls.setSearchDraft}
        />
        <QueryState
          isLoading={state.isRequestsLoading}
          isError={state.isRequestsError}
          isEmpty={requests !== null && requests.items.length === 0}
          onRetry={state.refetch}
          t={t}
        >
          {requests === null ? null : (
            <>
              <UserRequestsTable
                requests={requests.items}
                sort={state.controls.sort}
                order={state.controls.order}
                onSort={state.controls.toggleSort}
                t={t}
              />
              <CursorPager
                pager={state.pager}
                nextCursor={requests.nextCursor}
                isFetching={state.isRequestsFetching}
                t={t}
              />
            </>
          )}
        </QueryState>
      </section>
    </div>
  );
}
