'use client';

import type { PaygLedgerEntryView } from '@claw/shared-types';
import type { ReactElement } from 'react';

import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DataTableColumn } from '@/types/component.types';
import type { CreditLedgerTableProps } from '@/types/credit-component.types';
import {
  formatMicroUsd,
  formatMicroUsdDelta,
  resolveLedgerKindLabelKey,
  resolveSurfaceLabelKey,
} from '@/utilities/credit.utility';
import { formatDateTimeSafe } from '@/utilities/date.utility';

/**
 * AC-9 — "where did my $5 go".
 *
 * Every column earns its place by closing that question: WHEN it happened, WHICH
 * product spent it, WHAT model it bought, HOW MUCH moved, and the running balance
 * so the user can check our arithmetic rather than take our word for it. An
 * unanswerable spend question becomes a support ticket and then a chargeback.
 *
 * Amounts render at four decimal places because a single cheap message costs a
 * fraction of a cent; rounding to two would show a column of $0.00 rows beside a
 * balance that visibly moved.
 */
export function CreditLedgerTable({
  entries,
  isLoading,
  isError,
  hasMore,
  isFetchingMore,
  onLoadMore,
  t,
  locale,
}: CreditLedgerTableProps): ReactElement {
  const columns: DataTableColumn<PaygLedgerEntryView>[] = [
    {
      key: 'occurredAt',
      header: t('billing.credit.ledgerDate'),
      render: (entry) => formatDateTimeSafe(entry.occurredAt),
    },
    {
      key: 'surface',
      header: t('billing.credit.ledgerSurface'),
      render: (entry) => {
        const surfaceKey = resolveSurfaceLabelKey(entry);
        return surfaceKey === null ? t(resolveLedgerKindLabelKey(entry)) : t(surfaceKey);
      },
    },
    {
      key: 'model',
      header: t('billing.credit.ledgerModel'),
      render: (entry) =>
        entry.model === null ? (
          <span className="text-muted-foreground">{t('billing.credit.ledgerNoModel')}</span>
        ) : (
          <span className="break-all">{entry.model}</span>
        ),
    },
    {
      key: 'amount',
      header: t('billing.credit.ledgerAmount'),
      className: 'text-end',
      render: (entry) => (
        <bdi
          className={cn(
            'tabular-nums',
            entry.amountMicroUsd > 0 ? 'text-success' : 'text-foreground',
          )}
        >
          {formatMicroUsdDelta(entry.amountMicroUsd, locale)}
        </bdi>
      ),
    },
    {
      key: 'balanceAfter',
      header: t('billing.credit.ledgerBalance'),
      className: 'text-end',
      render: (entry) => (
        <bdi className="tabular-nums">{formatMicroUsd(entry.balanceAfterMicroUsd, locale)}</bdi>
      ),
    },
  ];

  return (
    <Card className="max-w-full min-w-0">
      <CardHeader>
        <CardTitle className="text-lg">{t('billing.credit.ledgerTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        {isLoading ? <Skeleton className="h-32 w-full" /> : null}

        {isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t('billing.credit.ledgerError')}
          </p>
        ) : null}

        {!isLoading && !isError ? (
          <DataTable
            columns={columns}
            data={entries}
            keyExtractor={(entry) => entry.id}
            emptyMessage={t('billing.credit.ledgerEmpty')}
            mobileTitleKey="occurredAt"
          />
        ) : null}

        {!isLoading && !isError && hasMore ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isFetchingMore}
            >
              {isFetchingMore
                ? t('billing.credit.ledgerLoadingMore')
                : t('billing.credit.ledgerLoadMore')}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
