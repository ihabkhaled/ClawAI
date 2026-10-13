import { Download } from 'lucide-react';
import type { ReactElement } from 'react';

import { QueryState } from '@/components/observability/explorer/query-state';
import { SearchBox } from '@/components/observability/explorer/search-box';
import { EntityTable } from '@/components/observability/pages/entity-table';
import { PastEndNotice } from '@/components/observability/pages/past-end-notice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useObservabilityList } from '@/hooks/observability/use-observability-list';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { useUsersCsvExport } from '@/hooks/observability/use-users-csv-export';
import type { ObservabilityListPageProps } from '@/types/observability-pages.types';
import { formatCount } from '@/utilities/observability-explorer.utility';

/**
 * A full list for the period (every user, provider, model, plan or workflow),
 * not a top-N: searchable, sortable, paged, and for users also exportable. The
 * count says how many matched, so an operator knows nothing was cut off. A page
 * past the end (a shrunk list, an old link) keeps its pager and a way back.
 */
export function ObservabilityListPage({
  kind,
  title,
  searchLabel,
  note,
  t,
}: ObservabilityListPageProps): ReactElement {
  const state = useObservabilityList(kind);
  const { sharedQuery, openUser } = useObservabilityScope();
  const { controls, result } = state;
  const csv = useUsersCsvExport(
    { search: controls.search, sort: controls.sort, order: controls.order },
    t,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{note}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SearchBox
            id={`obs-search-${kind}`}
            label={searchLabel}
            value={controls.searchDraft}
            onChange={controls.setSearchDraft}
          />
          <div className="flex flex-wrap items-center gap-3">
            {result === null ? null : (
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {t('observabilityPages.matched', { count: formatCount(result.total) })}
              </p>
            )}
            {kind === 'users' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={csv.isExporting}
                onClick={() => {
                  void csv.exportCsv();
                }}
              >
                <Download className="me-2 h-4 w-4" aria-hidden="true" />
                {csv.isExporting
                  ? t('observabilityPages.exporting')
                  : t('observabilityPages.exportCsv')}
              </Button>
            ) : null}
          </div>
        </div>
        {csv.isError ? (
          <p role="alert" className="text-destructive text-sm">
            {t('observabilityPages.exportFailed')}
          </p>
        ) : null}
        {csv.truncated ? (
          <p role="status" className="text-muted-foreground text-sm">
            {t('observabilityPages.exportTruncated')}
          </p>
        ) : null}

        <QueryState
          isLoading={state.isLoading}
          isError={state.isError}
          isEmpty={result !== null && result.items.length === 0 && controls.page <= 1}
          onRetry={state.refetch}
          t={t}
        >
          {result === null ? null : (
            <>
              {result.items.length === 0 ? (
                <PastEndNotice onBack={controls.goToFirstPage} t={t} />
              ) : (
                <EntityTable
                  kind={kind}
                  rows={result.items}
                  sort={controls.sort}
                  order={controls.order}
                  onSort={controls.toggleSort}
                  onOpenUser={openUser}
                  sharedQuery={sharedQuery}
                  t={t}
                />
              )}
              <Pagination
                page={result.page}
                pageSize={result.limit}
                totalPages={result.pageCount}
                totalItems={result.total}
                onPageChange={controls.setPage}
                onPageSizeChange={controls.setLimit}
                t={t}
              />
            </>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}
