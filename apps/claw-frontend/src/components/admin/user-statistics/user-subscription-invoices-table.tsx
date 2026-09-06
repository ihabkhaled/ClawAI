import { Receipt } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import type { UserSubscriptionInvoicesTableProps } from '@/types/admin-user-statistics.types';
import { formatMinorAmount } from '@/utilities/billing.utility';
import { formatDateTimeSafe } from '@/utilities/date.utility';

/**
 * Recent invoices, newest first and capped server-side — deliberately NOT the
 * account's full invoice archive, which is why the heading says "recent".
 *
 * The status is the server's own immutable document state, rendered as the code
 * it is: an invoice is never rewritten, so the code is the record. Amounts are
 * integer minor units formatted only here, at render.
 */
export function UserSubscriptionInvoicesTable({
  invoices,
  t,
}: UserSubscriptionInvoicesTableProps): ReactElement {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title={t('admin.userSubscriptionNoInvoicesTitle')}
        description={t('admin.userSubscriptionNoInvoicesDescription')}
        variant={EmptyStateVariant.Compact}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.userSubscriptionInvoiceNumber')}</TableHead>
            <TableHead>{t('admin.userSubscriptionInvoiceStatus')}</TableHead>
            <TableHead>{t('admin.userSubscriptionInvoiceTotal')}</TableHead>
            <TableHead>{t('admin.userSubscriptionInvoicePaid')}</TableHead>
            <TableHead>{t('admin.userSubscriptionInvoiceIssuedAt')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.number}</TableCell>
              <TableCell>
                <Badge variant="secondary">{invoice.status}</Badge>
              </TableCell>
              <TableCell>{formatMinorAmount(invoice.totalMinor, invoice.currency)}</TableCell>
              <TableCell>{formatMinorAmount(invoice.amountPaidMinor, invoice.currency)}</TableCell>
              <TableCell>{formatDateTimeSafe(invoice.issuedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
