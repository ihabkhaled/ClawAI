'use client';

import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import type { RefundTransactionCardProps } from '@/types';
import { formatMinorAmount, parseMajorAmountToMinor } from '@/utilities';

export function RefundTransactionCard({
  transaction,
  isPending,
  onRefund,
  t,
}: RefundTransactionCardProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const remainingPercent = Math.round(
    (transaction.remainingAmountMinor / transaction.capturedAmountMinor) * 100,
  );

  function openDialog(): void {
    setAmount('');
    setReason('');
    setValidationError(null);
    setIsOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const amountMinor = parseMajorAmountToMinor(amount, transaction.currency);
    if (
      amountMinor === null ||
      amountMinor > transaction.remainingAmountMinor ||
      reason.trim().length < 3
    ) {
      setValidationError(t('adminRefunds.invalidAmount'));
      return;
    }
    onRefund({
      paymentTransactionId: transaction.id,
      amountMinor,
      idempotencyKey: `refund:${transaction.id}:${globalThis.crypto.randomUUID()}`,
      reason: reason.trim(),
    });
    setIsOpen(false);
  }

  return (
    <>
      <Card>
        <CardContent className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="bg-muted rounded px-2 py-1 text-xs">{transaction.id}</code>
              <span className="border-border rounded-full border px-2 py-0.5 text-xs">
                {transaction.gateway}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground text-xs">{t('adminRefunds.user')}</dt>
                <dd className="truncate font-medium">{transaction.userId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">{t('adminRefunds.captured')}</dt>
                <dd className="font-medium">
                  {formatMinorAmount(transaction.capturedAmountMinor, transaction.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">{t('adminRefunds.remaining')}</dt>
                <dd className="text-primary font-semibold">
                  {formatMinorAmount(transaction.remainingAmountMinor, transaction.currency)}
                </dd>
              </div>
            </dl>
            <Progress
              value={remainingPercent}
              aria-label={t('adminRefunds.remainingBalance')}
              className="h-2"
            />
            <p className="text-muted-foreground text-xs">
              {t('adminRefunds.capturedOn')}: {new Date(transaction.capturedAt).toLocaleString()}
            </p>
          </div>
          <Button type="button" onClick={openDialog} disabled={isPending}>
            {isPending ? t('adminRefunds.refunding') : t('adminRefunds.refundAction')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adminRefunds.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('adminRefunds.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <label htmlFor={`refund-amount-${transaction.id}`} className="text-sm font-medium">
                {t('adminRefunds.amount')}
              </label>
              <Input
                id={`refund-amount-${transaction.id}`}
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                {t('adminRefunds.maximum')}:{' '}
                {formatMinorAmount(transaction.remainingAmountMinor, transaction.currency)}
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor={`refund-reason-${transaction.id}`} className="text-sm font-medium">
                {t('adminRefunds.reason')}
              </label>
              <Textarea
                id={`refund-reason-${transaction.id}`}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            {validationError === null ? null : (
              <p role="alert" className="text-destructive text-sm">
                {validationError}
              </p>
            )}
            <DialogFooter>
              <Button type="submit">{t('adminRefunds.confirm')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
