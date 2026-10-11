import type { ReactElement } from 'react';

import { HorizontalBarChart } from '@/components/charts/horizontal-bar-chart';
import { CursorPager } from '@/components/observability/explorer/cursor-pager';
import { GroupTable } from '@/components/observability/explorer/group-table';
import { QueryState } from '@/components/observability/explorer/query-state';
import { SearchBox } from '@/components/observability/explorer/search-box';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MAX_BAR_ROWS } from '@/constants/observability-explorer.constants';
import { UsageCostKind } from '@/enums/usage-cost-kind.enum';
import { useUsageLeaderboard } from '@/hooks/observability/use-usage-leaderboard';
import type { LeaderboardSectionProps } from '@/types/observability-explorer.types';
import {
  buildBarData,
  formatUsd,
  groupRowLabel,
  microAsNumber,
} from '@/utilities/observability-explorer.utility';

/**
 * One ranked grouping (provider, model, workflow or user) as an optional cost
 * chart plus a searchable, sortable, pageable table.
 */
export function LeaderboardSection({
  scope,
  t,
  dimension,
  heading,
  firstColumnLabel,
  pageSize,
  compact = false,
  showChart = false,
  onOpenUser,
}: LeaderboardSectionProps): ReactElement {
  const state = useUsageLeaderboard(scope, dimension, pageSize);
  const { page, controls } = state;
  const rows = page?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {compact ? null : (
          <SearchBox
            id={`leaderboard-search-${dimension}`}
            label={t('observabilityExplorer.searchLabel')}
            value={controls.searchDraft}
            onChange={controls.setSearchDraft}
          />
        )}
        <QueryState
          isLoading={state.isLoading}
          isError={state.isError}
          isEmpty={page !== null && rows.length === 0}
          onRetry={state.refetch}
          t={t}
        >
          {showChart ? (
            <HorizontalBarChart
              data={buildBarData(
                rows.filter((row) => row.cost.costKind !== UsageCostKind.Unpriced),
                (row) => microAsNumber(row.cost.costMicroUsd),
                (row) => groupRowLabel(row, dimension, t),
                MAX_BAR_ROWS,
              )}
              ariaLabel={heading}
              emptyLabel={t('usageAnalytics.empty')}
              formatValue={(value) => formatUsd(String(Math.round(value)))}
            />
          ) : null}
          <GroupTable
            rows={rows}
            firstColumnLabel={firstColumnLabel}
            sort={controls.sort}
            order={controls.order}
            onSort={controls.toggleSort}
            onOpenUser={onOpenUser}
            dimension={dimension}
            t={t}
          />
          {compact ? null : (
            <CursorPager
              pager={state.pager}
              nextCursor={page?.nextCursor ?? null}
              isFetching={state.isFetching}
              t={t}
            />
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}
