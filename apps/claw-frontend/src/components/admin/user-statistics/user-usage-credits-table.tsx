import { Wallet } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import type { UserUsageCreditsTableProps } from '@/types/admin-user-statistics.types';
import { formatMicroUsd } from '@/utilities/billing-dashboard.utility';

/**
 * Settled credit spend per calendar month, newest first.
 *
 * An empty list is the ordinary answer, not a failure: only `CONSUMPTION`
 * ledger rows count, and an account that has burned no pay-as-you-go credit has
 * none. It is stated as "nothing recorded" rather than rendered as a zero row,
 * because a fabricated 0.00 reads as a measurement the ledger never made.
 *
 * `consumedMicroUsd` arrives as a decimal STRING because it is a server-side
 * `bigint`. `formatMicroUsd` moves the decimal point through `BigInt`; it is
 * never parsed into a float.
 */
export function UserUsageCreditsTable({ months, t }: UserUsageCreditsTableProps): ReactElement {
  if (months.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title={t('admin.userUsageNoCreditsTitle')}
        description={t('admin.userUsageNoCreditsDescription')}
        variant={EmptyStateVariant.Compact}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.userUsageCreditsMonth')}</TableHead>
            <TableHead>{t('admin.userUsageCreditsConsumed')}</TableHead>
            <TableHead>{t('admin.userUsageCreditsEntries')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {months.map((month) => (
            <TableRow key={month.monthKey}>
              <TableCell className="font-medium">{month.monthKey}</TableCell>
              <TableCell>{formatMicroUsd(month.consumedMicroUsd)}</TableCell>
              <TableCell>{month.entryCount.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
