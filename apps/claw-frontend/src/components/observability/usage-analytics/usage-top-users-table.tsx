import type { ReactElement } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UsageTopUsersTableProps } from '@/types/admin-usage-analytics.types';
import { formatMicroUsd } from '@/utilities/billing-dashboard.utility';

/**
 * Highest-spending users in the period. The email is masked by the server
 * (`ja***@example.com`); the user id is what to paste into the user filter.
 */
export function UsageTopUsersTable({ users, t }: UsageTopUsersTableProps): ReactElement {
  if (users.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('usageAnalytics.empty')}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('usageAnalytics.colUser')}</TableHead>
            <TableHead className="text-end">{t('usageAnalytics.colRequests')}</TableHead>
            <TableHead className="text-end">{t('usageAnalytics.colTokens')}</TableHead>
            <TableHead className="text-end">{t('usageAnalytics.colCost')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.userId}>
              <TableCell className="min-w-0">
                <span className="block font-medium break-all">
                  {user.maskedEmail ?? user.userId}
                </span>
                <span className="text-muted-foreground block text-xs break-all">{user.userId}</span>
              </TableCell>
              <TableCell className="text-end">{user.requests.toLocaleString()}</TableCell>
              <TableCell className="text-end">
                {(user.inputTokens + user.outputTokens).toLocaleString()}
              </TableCell>
              <TableCell className="text-end whitespace-nowrap">
                {formatMicroUsd(user.costMicroUsd)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
