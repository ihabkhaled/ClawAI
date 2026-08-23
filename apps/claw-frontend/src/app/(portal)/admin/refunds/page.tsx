'use client';

import type { ReactElement } from 'react';

import { RefundTransactionCard } from '@/components/admin/refunds/refund-transaction-card';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { useAdminRefunds } from '@/hooks/admin/use-admin-refunds';

export default function AdminRefundsPage(): ReactElement {
  const {
    transactions,
    isLoading,
    isError,
    error,
    pendingId,
    mutationError,
    requestRefund,
    clearMutationError,
    retry,
    t,
  } = useAdminRefunds();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('adminRefunds.title')} description={t('adminRefunds.description')} />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('adminRefunds.loading')}</p>
      ) : null}

      {isError ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
        >
          <span>{error?.message ?? t('adminRefunds.error')}</span>
          <Button type="button" size="sm" variant="outline" onClick={retry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      {mutationError === null ? null : (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
        >
          <span>{mutationError.message || t('adminRefunds.failed')}</span>
          <Button type="button" size="sm" variant="ghost" onClick={clearMutationError}>
            {t('common.close')}
          </Button>
        </div>
      )}

      {!isLoading && !isError && transactions.length === 0 ? (
        <p className="border-border bg-muted/20 text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {t('adminRefunds.empty')}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4">
        {transactions.map((transaction) => (
          <RefundTransactionCard
            key={transaction.id}
            transaction={transaction}
            isPending={pendingId === transaction.id}
            onRefund={requestRefund}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
