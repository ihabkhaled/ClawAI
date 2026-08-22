import { Download } from 'lucide-react';
import type { ReactElement } from 'react';

import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { InvoiceTableProps } from '@/types/billing-component.types';
import type { InvoiceView } from '@/types/billing.types';
import type { DataTableColumn } from '@/types/component.types';
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
  // Five columns need ~42rem, so on a phone the table used to sit in a
  // horizontal scroller 672px wide inside a 300px card. DataTable renders the
  // same columns as stacked cards on a coarse pointer and keeps the table for
  // a mouse.
  const columns: DataTableColumn<InvoiceView>[] = [
    {
      key: 'number',
      header: t('billing.invoices.number'),
      render: (invoice) => <span className="font-medium">{invoice.number}</span>,
    },
    {
      key: 'issued',
      header: t('billing.invoices.issued'),
      render: (invoice) => formatDateTimeSafe(invoice.issuedAt),
    },
    {
      key: 'status',
      header: t('billing.invoices.status'),
      render: (invoice) => invoice.status,
    },
    {
      key: 'total',
      header: t('billing.invoices.total'),
      className: 'text-end',
      render: (invoice) => formatMinorAmount(invoice.totalMinor, invoice.currency),
    },
    {
      key: 'download',
      header: '',
      className: 'text-end',
      render: (invoice) => (
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
      ),
    },
  ];

  return (
    <Card className="max-w-full min-w-0">
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

        {!isLoading && !isError ? (
          <DataTable
            columns={columns}
            data={invoices}
            keyExtractor={(invoice) => invoice.id}
            emptyMessage={t('billing.invoices.empty')}
            mobileTitleKey="number"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
