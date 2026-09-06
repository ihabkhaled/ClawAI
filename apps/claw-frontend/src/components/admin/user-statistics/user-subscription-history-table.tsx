import { History } from 'lucide-react';
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
import type { UserSubscriptionHistoryTableProps } from '@/types/admin-user-statistics.types';
import { formatMinorAmount } from '@/utilities/billing.utility';
import { formatDateTimeSafe } from '@/utilities/date.utility';

/**
 * Every subscription the account has ever had, newest first.
 *
 * Cancelled, expired, refunded and charged-back rows are all included: billing
 * history is append-only, and hiding the terminal rows would leave an operator
 * unable to see the sequence that produced today's state.
 */
export function UserSubscriptionHistoryTable({
  history,
  t,
}: UserSubscriptionHistoryTableProps): ReactElement {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={History}
        title={t('admin.userSubscriptionNoHistoryTitle')}
        description={t('admin.userSubscriptionNoHistoryDescription')}
        variant={EmptyStateVariant.Compact}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.userSubscriptionHistoryPlan')}</TableHead>
            <TableHead>{t('admin.userSubscriptionHistoryStatus')}</TableHead>
            <TableHead>{t('admin.userSubscriptionHistoryInterval')}</TableHead>
            <TableHead>{t('admin.userSubscriptionHistoryAmount')}</TableHead>
            <TableHead>{t('admin.userSubscriptionHistoryPeriod')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">{entry.planSlug}</TableCell>
              <TableCell>{t(`billing.status.${entry.status}`)}</TableCell>
              <TableCell>{t(`billing.interval.${entry.billingInterval}`)}</TableCell>
              <TableCell>{formatMinorAmount(entry.amountMinor, entry.currency)}</TableCell>
              <TableCell>
                {t('admin.userSubscriptionCurrentPeriodValue', {
                  from: formatDateTimeSafe(entry.currentPeriodStart),
                  through: formatDateTimeSafe(entry.currentPeriodEnd),
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
