import type { ReactElement } from 'react';

import { QueryState } from '@/components/observability/explorer/query-state';
import { SearchBox } from '@/components/observability/explorer/search-box';
import { SortableHead } from '@/components/observability/explorer/sortable-head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  TRACING_DIMENSION_OPTIONS,
} from '@/constants/observability-explorer.constants';
import { useObservabilityTracing } from '@/hooks/observability/use-observability-tracing';
import type { ExplorerTabProps } from '@/types/observability-explorer.types';
import { formatCount, formatLatency, formatRate } from '@/utilities/observability-explorer.utility';

/**
 * Latency percentiles, token source and failure signals per provider, model or
 * context. The error rate is approximate (failures and requests live in
 * different stores), and the page says so rather than presenting it as exact.
 */
export function TracingTab({ scope, t }: ExplorerTabProps): ReactElement {
  const state = useObservabilityTracing(scope);
  const { data, controls } = state;
  const rows = data?.rows.items ?? [];
  const dimensionLabelKey =
    TRACING_DIMENSION_OPTIONS.find((option) => option.dimension === state.dimension)?.labelKey ??
    'observabilityExplorer.tracingByProvider';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('observabilityExplorer.tabTracing')}</CardTitle>
          <p className="text-muted-foreground text-xs">
            {t('observabilityExplorer.windowHours', { hours: data?.hours ?? 0 })}
            {state.clamped ? ` ${t('observabilityExplorer.windowClamped')}` : ''}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label={t('observabilityExplorer.tracingGroupBy')}
              className="flex flex-wrap gap-2"
            >
              {TRACING_DIMENSION_OPTIONS.map((option) => (
                <Button
                  key={option.dimension}
                  type="button"
                  size="sm"
                  variant={option.dimension === state.dimension ? 'default' : 'outline'}
                  aria-pressed={option.dimension === state.dimension}
                  onClick={() => {
                    state.setDimension(option.dimension);
                  }}
                >
                  {t(option.labelKey)}
                </Button>
              ))}
            </div>
            <SearchBox
              id="tracing-search"
              label={t('observabilityExplorer.searchLabel')}
              value={controls.searchDraft}
              onChange={controls.setSearchDraft}
            />
          </div>

          <QueryState
            isLoading={state.isLoading}
            isError={state.isError}
            isEmpty={data !== null && rows.length === 0}
            onRetry={state.refetch}
            t={t}
          >
            {data === null ? null : (
              <div className="space-y-4">
                <p className="text-sm">
                  {t('observabilityExplorer.tracingOverall', {
                    requests: formatCount(data.overall.requests),
                    p50: formatLatency(data.overall.p50LatencyMs),
                    p95: formatLatency(data.overall.p95LatencyMs),
                  })}
                </p>
                <div className="overflow-x-auto" data-testid="tracing-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t(dimensionLabelKey)}</TableHead>
                        <SortableHead
                          column="requests"
                          label={t('usageAnalytics.colRequests')}
                          sort={controls.sort}
                          order={controls.order}
                          onSort={controls.toggleSort}
                          alignEnd
                        />
                        <TableHead className="text-end">
                          {t('observabilityExplorer.colAvgLatency')}
                        </TableHead>
                        <TableHead className="text-end">
                          {t('observabilityExplorer.colP50')}
                        </TableHead>
                        <SortableHead
                          column="p95"
                          label={t('observabilityExplorer.colP95')}
                          sort={controls.sort}
                          order={controls.order}
                          onSort={controls.toggleSort}
                          alignEnd
                        />
                        <SortableHead
                          column="tokens"
                          label={t('usageAnalytics.colTokens')}
                          sort={controls.sort}
                          order={controls.order}
                          onSort={controls.toggleSort}
                          alignEnd
                        />
                        <TableHead className="text-end">
                          {t('observabilityExplorer.colEstimatedRequests')}
                        </TableHead>
                        <TableHead className="text-end">
                          {t('observabilityExplorer.colErrorRate')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="min-w-0 font-medium break-all">
                            {row.label}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatCount(row.requests)}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatLatency(row.avgLatencyMs)}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatLatency(row.p50LatencyMs)}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatLatency(row.p95LatencyMs)}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatCount(row.totalTokens)}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatCount(row.estimatedRequests)}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatRate(row.errorRate)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-muted-foreground text-xs">
                  {t('observabilityExplorer.tracingErrorRateNote')}
                </p>
                <Pagination
                  page={data.rows.page}
                  pageSize={TABLE_PAGE_SIZE}
                  totalPages={data.rows.totalPages}
                  totalItems={data.rows.total}
                  onPageChange={state.setPage}
                  onPageSizeChange={IGNORE_PAGE_SIZE_CHANGE}
                  hidePageSize
                  t={t}
                />
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('observabilityExplorer.tracingSignals')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data === null || data.signals.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('observabilityExplorer.tracingSignalsEmpty')}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {data.signals.map((signal) => (
                <li key={signal.action} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">{signal.action}</span>
                  <span className="font-medium tabular-nums">{formatCount(signal.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
