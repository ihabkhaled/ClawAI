import type { ReactElement } from 'react';

import { CursorPager } from '@/components/observability/explorer/cursor-pager';
import { QueryState } from '@/components/observability/explorer/query-state';
import { SearchBox } from '@/components/observability/explorer/search-box';
import { UsersTable } from '@/components/observability/explorer/users-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsageExplorerUsers } from '@/hooks/observability/use-usage-explorer-users';
import type { OpenUserTabProps } from '@/types/observability-explorer.types';
import { formatCount } from '@/utilities/observability-explorer.utility';

/** Every user with usage in the period, with full emails, search, sort and paging. */
export function UsersTab({ scope, onOpenUser, t }: OpenUserTabProps): ReactElement {
  const state = useUsageExplorerUsers(scope);
  const { page, controls } = state;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('observabilityExplorer.tabUsers')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SearchBox
            id="users-search"
            label={t('observabilityExplorer.usersSearch')}
            value={controls.searchDraft}
            onChange={controls.setSearchDraft}
          />
          {page === null ? null : (
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {t('observabilityExplorer.matchedUsers', { count: formatCount(page.matchedUsers) })}
            </p>
          )}
        </div>
        <QueryState
          isLoading={state.isLoading}
          isError={state.isError}
          isEmpty={page !== null && page.items.length === 0}
          onRetry={state.refetch}
          t={t}
        >
          {page === null ? null : (
            <>
              <UsersTable
                users={page.items}
                sort={controls.sort}
                order={controls.order}
                onSort={controls.toggleSort}
                onOpenUser={onOpenUser}
                t={t}
              />
              <CursorPager
                pager={state.pager}
                nextCursor={page.nextCursor}
                isFetching={state.isFetching}
                t={t}
              />
            </>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}
