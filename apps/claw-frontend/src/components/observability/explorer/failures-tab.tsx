import type { ReactElement } from 'react';

import { HorizontalBarChart } from '@/components/charts/horizontal-bar-chart';
import { QueryState } from '@/components/observability/explorer/query-state';
import { SearchBox } from '@/components/observability/explorer/search-box';
import { SortableHead } from '@/components/observability/explorer/sortable-head';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  IGNORE_PAGE_SIZE_CHANGE,
  TABLE_PAGE_SIZE,
} from '@/constants/observability-explorer.constants';
import { useObservabilityFailures } from '@/hooks/observability/use-observability-failures';
import type { ExplorerTabProps } from '@/types/observability-explorer.types';
import {
  countsToBars,
  formatCount,
  formatTimestamp,
} from '@/utilities/observability-explorer.utility';

/**
 * HIGH and CRITICAL audit events in the SAME period as the rest of the page,
 * grouped by action. Workspace-sync noise is counted but hidden unless asked for.
 */
export function FailuresTab({ scope, t }: ExplorerTabProps): ReactElement {
  const state = useObservabilityFailures(scope);
  const { data, controls } = state;
  const rows = data?.groups.items ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('observabilityExplorer.tabFailures')}</CardTitle>
          <p className="text-muted-foreground text-xs">
            {t('observabilityExplorer.failuresWindow', { hours: data?.hours ?? 0 })}
            {state.clamped ? ` ${t('observabilityExplorer.windowClamped')}` : ''}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {data === null ? null : (
            <p className="text-sm font-medium" aria-live="polite">
              {t('observabilityExplorer.failuresTotal', {
                count: formatCount(data.totals.failures),
              })}
              {state.includeSync || data.totals.syncNoise === 0
                ? ''
                : ` - ${t('observabilityExplorer.failuresSyncHidden', {
                    count: formatCount(data.totals.syncNoise),
                  })}`}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <SearchBox
              id="failures-search"
              label={t('observabilityExplorer.failuresSearch')}
              value={controls.searchDraft}
              onChange={controls.setSearchDraft}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="failures-include-sync"
                checked={state.includeSync}
                onCheckedChange={(checked) => {
                  state.setIncludeSync(checked === true);
                }}
              />
              <label htmlFor="failures-include-sync" className="text-sm">
                {t('observabilityExplorer.failuresIncludeSync')}
              </label>
            </div>
          </div>

          <QueryState
            isLoading={state.isLoading}
            isError={state.isError}
            isEmpty={data !== null && rows.length === 0}
            onRetry={state.refetch}
            t={t}
          >
            {data === null ? null : (
              <>
                <div className="overflow-x-auto" data-testid="failures-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('observabilityExplorer.colAction')}</TableHead>
                        <TableHead>{t('observabilityExplorer.colSource')}</TableHead>
                        <TableHead>{t('observabilityExplorer.colSeverity')}</TableHead>
                        <SortableHead
                          column="count"
                          label={t('observabilityExplorer.colCount')}
                          sort={controls.sort}
                          order={controls.order}
                          onSort={controls.toggleSort}
                          alignEnd
                        />
                        <SortableHead
                          column="lastSeen"
                          label={t('observabilityExplorer.colLastSeen')}
                          sort={controls.sort}
                          order={controls.order}
                          onSort={controls.toggleSort}
                        />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={`${row.action}-${row.source}-${row.severity}`}>
                          <TableCell className="min-w-0 font-medium break-all">
                            {row.action}
                          </TableCell>
                          <TableCell>{row.source}</TableCell>
                          <TableCell>{row.severity}</TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatCount(row.count)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatTimestamp(row.lastSeenAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Pagination
                  page={data.groups.page}
                  pageSize={TABLE_PAGE_SIZE}
                  totalPages={data.groups.totalPages}
                  totalItems={data.groups.total}
                  onPageChange={state.setPage}
                  onPageSizeChange={IGNORE_PAGE_SIZE_CHANGE}
                  hidePageSize
                  t={t}
                />
              </>
            )}
          </QueryState>
        </CardContent>
      </Card>

      {data === null ? null : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('observabilityExplorer.headingBySource')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart
                data={countsToBars(data.bySource)}
                ariaLabel={t('observabilityExplorer.headingBySource')}
                emptyLabel={t('usageAnalytics.empty')}
                formatValue={formatCount}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('observabilityExplorer.headingTopProviders')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart
                data={countsToBars(data.topProviders)}
                ariaLabel={t('observabilityExplorer.headingTopProviders')}
                emptyLabel={t('usageAnalytics.empty')}
                formatValue={formatCount}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('observabilityExplorer.headingTopModels')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart
                data={countsToBars(data.topModels)}
                ariaLabel={t('observabilityExplorer.headingTopModels')}
                emptyLabel={t('usageAnalytics.empty')}
                formatValue={formatCount}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
