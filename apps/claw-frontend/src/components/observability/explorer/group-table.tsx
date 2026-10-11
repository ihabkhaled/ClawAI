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
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import type { GroupTableProps } from '@/types/observability-explorer.types';
import {
  formatCount,
  groupRowLabel,
  totalTokens,
} from '@/utilities/observability-explorer.utility';

/**
 * One ranked table for every grouping (provider, model, workflow, user). The
 * provider name is the server's normalised label, so `local-ollama` and
 * `LOCAL_OLLAMA` are one row, and a missing workflow reads "Unknown", never "Chat".
 */
export function GroupTable({
  rows,
  firstColumnLabel,
  sort,
  order,
  onSort,
  onOpenUser,
  dimension,
  t,
}: GroupTableProps): ReactElement {
  return (
    <div className="overflow-x-auto" data-testid="group-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{firstColumnLabel}</TableHead>
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
          {rows.map((row) => {
            const label = groupRowLabel(row, dimension, t);
            return (
              <TableRow key={row.key}>
                <TableCell className="min-w-0 break-all">
                  {dimension === UsageLeaderboardDimension.User &&
                  onOpenUser !== undefined &&
                  row.userId !== null ? (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto max-w-full justify-start p-0 text-start break-all whitespace-normal"
                      aria-label={t('observabilityExplorer.openUser', { user: label })}
                      onClick={() => {
                        onOpenUser(row.userId ?? '');
                      }}
                    >
                      {label}
                    </Button>
                  ) : (
                    <span className="font-medium">{label}</span>
                  )}
                  {dimension === UsageLeaderboardDimension.Model && row.providerLabel !== null ? (
                    <span className="text-muted-foreground block text-xs">{row.providerLabel}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-end tabular-nums">{formatCount(row.requests)}</TableCell>
                <TableCell className="text-end tabular-nums">
                  {formatCount(totalTokens(row))}
                </TableCell>
                <TableCell className="text-end">
                  <CostCell
                    cost={{
                      costMicroUsd: row.cost.costMicroUsd,
                      costKind: row.cost.costKind,
                      partial: row.cost.partial,
                    }}
                    t={t}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.lastSeenAt === null ? '-' : row.lastSeenAt.slice(0, 16).replace('T', ' ')}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
