import type { ReactElement } from 'react';

import { CostCell } from '@/components/observability/explorer/cost-cell';
import { SortableHead } from '@/components/observability/explorer/sortable-head';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UsersTableProps } from '@/types/observability-explorer.types';
import {
  formatCount,
  formatTimestamp,
  totalTokens,
  userDisplayName,
} from '@/utilities/observability-explorer.utility';

/**
 * Users ranked by consumption. The email is shown IN FULL (the endpoint returns
 * it to administrators only) and is the control that opens that user's complete
 * consumption view.
 */
export function UsersTable({
  users,
  sort,
  order,
  onSort,
  onOpenUser,
  t,
}: UsersTableProps): ReactElement {
  return (
    <div className="overflow-x-auto" data-testid="users-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('usageAnalytics.colUser')}</TableHead>
            <TableHead>{t('observabilityExplorer.colRole')}</TableHead>
            <SortableHead
              column="requests"
              label={t('usageAnalytics.colRequests')}
              sort={sort}
              order={order}
              onSort={onSort}
              alignEnd
            />
            <SortableHead
              column="tokens"
              label={t('usageAnalytics.colTokens')}
              sort={sort}
              order={order}
              onSort={onSort}
              alignEnd
            />
            <SortableHead
              column="cost"
              label={t('usageAnalytics.colCost')}
              sort={sort}
              order={order}
              onSort={onSort}
              alignEnd
            />
            <SortableHead
              column="lastSeen"
              label={t('observabilityExplorer.colLastSeen')}
              sort={sort}
              order={order}
              onSort={onSort}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.userId}>
              <TableCell className="min-w-0">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto max-w-full justify-start p-0 text-start break-all whitespace-normal"
                  aria-label={t('observabilityExplorer.openUser', { user: userDisplayName(user) })}
                  onClick={() => {
                    onOpenUser(user.userId);
                  }}
                >
                  {userDisplayName(user)}
                </Button>
                {user.username === null || user.email === null ? null : (
                  <span className="text-muted-foreground block text-xs break-all">
                    {user.username}
                  </span>
                )}
              </TableCell>
              <TableCell>{user.role ?? '-'}</TableCell>
              <TableCell className="text-end tabular-nums">{formatCount(user.requests)}</TableCell>
              <TableCell className="text-end tabular-nums">
                {formatCount(totalTokens(user))}
              </TableCell>
              <TableCell className="text-end">
                <CostCell
                  cost={{
                    costMicroUsd: user.cost.costMicroUsd,
                    costKind: user.cost.costKind,
                    partial: user.cost.partial,
                  }}
                  t={t}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatTimestamp(user.lastSeenAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
