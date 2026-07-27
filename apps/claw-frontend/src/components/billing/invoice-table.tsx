import { Download } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { InvoiceTableProps } from '@/types/billing-component.types';
import { formatMinorAmount } from '@/utilities/billing.utility';
import { formatDateTimeSafe } from '@/utilities/date.utility';

export function InvoiceTable({
  invoices,
  isLoading,
  isError,
  onDownload,
  pendingId,
  isDownloadError,
  t,
}: InvoiceTableProps): ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('billing.invoices.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-24 w-full" /> : null}

        {isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t('billing.invoices.error')}
          </p>
        ) : null}

        {isDownloadError ? (
          <p className="text-destructive mb-3 text-sm" role="alert">
            {t('billing.invoices.downloadError')}
          </p>
        ) : null}

        {!isLoading && !isError && invoices.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('billing.invoices.empty')}</p>
        ) : null}

        {!isLoading && !isError && invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('billing.invoices.number')}</TableHead>
                  <TableHead>{t('billing.invoices.issued')}</TableHead>
                  <TableHead>{t('billing.invoices.status')}</TableHead>
                  <TableHead className="text-right">{t('billing.invoices.total')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.number}</TableCell>
                    <TableCell>{formatDateTimeSafe(invoice.issuedAt)}</TableCell>
                    <TableCell>{invoice.status}</TableCell>
                    <TableCell className="text-right">
                      {formatMinorAmount(invoice.totalMinor, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pendingId === invoice.id}
                        onClick={() => {
                          onDownload(invoice.id, invoice.number);
                        }}
                      >
                        <Download className="me-1 h-3.5 w-3.5" aria-hidden="true" />
                        {pendingId === invoice.id
                          ? t('billing.invoices.downloading')
                          : t('billing.invoices.download')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
