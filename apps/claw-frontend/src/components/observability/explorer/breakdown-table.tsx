import type { ReactElement } from 'react';

import { CostCell } from '@/components/observability/explorer/cost-cell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import type { BreakdownTableProps } from '@/types/observability-explorer.types';
import {
  formatCount,
  totalTokens,
  workflowLabel,
} from '@/utilities/observability-explorer.utility';

/** A fixed-order breakdown (by cost) of one user's usage by provider, model or workflow. */
export function BreakdownTable({
  rows,
  heading,
  firstColumnLabel,
  dimension,
  truncated,
  t,
}: BreakdownTableProps): ReactElement {
  return (
    <section className="space-y-2" aria-label={heading}>
      <h4 className="text-sm font-semibold">{heading}</h4>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('usageAnalytics.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{firstColumnLabel}</TableHead>
                <TableHead className="text-end">{t('usageAnalytics.colRequests')}</TableHead>
                <TableHead className="text-end">{t('usageAnalytics.colTokens')}</TableHead>
                <TableHead className="text-end">{t('usageAnalytics.colCost')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="min-w-0 break-all">
                    {dimension === UsageLeaderboardDimension.Workflow
                      ? workflowLabel(row.key, t)
                      : (row.providerLabel ?? row.label)}
                    {dimension === UsageLeaderboardDimension.Model && row.providerLabel !== null ? (
                      <span className="text-muted-foreground block text-xs">
                        {row.providerLabel}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatCount(row.requests)}
                  </TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {truncated ? (
        <p className="text-muted-foreground text-xs">
          {t('observabilityExplorer.breakdownTruncated')}
        </p>
      ) : null}
    </section>
  );
}
