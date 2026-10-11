import type { ReactElement } from 'react';

import { CostCell } from '@/components/observability/explorer/cost-cell';
import { SortableHead } from '@/components/observability/explorer/sortable-head';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BILLING_LABEL_KEYS } from '@/constants/observability-explorer.constants';
import type { UserRequestsTableProps } from '@/types/observability-explorer.types';
import {
  formatCount,
  formatTimestamp,
  totalTokens,
  workflowLabel,
} from '@/utilities/observability-explorer.utility';

/** Individual requests: safe metadata only (provider, model, workflow, tokens, cost), never content. */
export function UserRequestsTable({
  requests,
  sort,
  order,
  onSort,
  t,
}: UserRequestsTableProps): ReactElement {
  return (
    <div className="overflow-x-auto" data-testid="user-requests-table">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead
              column="time"
              label={t('observabilityExplorer.colTime')}
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <TableHead>{t('usageAnalytics.colModel')}</TableHead>
            <TableHead>{t('observabilityExplorer.colWorkflow')}</TableHead>
            <SortableHead
              column="tokens"
              label={t('usageAnalytics.colTokens')}
              sort={sort}
              order={order}
              onSort={onSort}
              alignEnd
            />
            <TableHead>{t('observabilityExplorer.colBilling')}</TableHead>
            <SortableHead
              column="cost"
              label={t('usageAnalytics.colCost')}
              sort={sort}
              order={order}
              onSort={onSort}
              alignEnd
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="whitespace-nowrap">{formatTimestamp(request.at)}</TableCell>
              <TableCell className="min-w-0 break-all">
                {request.model}
                <span className="text-muted-foreground block text-xs">{request.providerLabel}</span>
              </TableCell>
              <TableCell>{workflowLabel(request.workflow, t)}</TableCell>
              <TableCell className="text-end tabular-nums">
                {formatCount(totalTokens(request))}
              </TableCell>
              <TableCell>{t(BILLING_LABEL_KEYS[request.billing])}</TableCell>
              <TableCell className="text-end">
                <CostCell
                  cost={{ costMicroUsd: request.costMicroUsd, costKind: request.costKind }}
                  t={t}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
