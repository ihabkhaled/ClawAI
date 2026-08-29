'use client';

import { Check } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CreditPackagePickerProps } from '@/types/credit-component.types';
import { formatMinorAmount } from '@/utilities/billing.utility';
import { formatMicroUsd } from '@/utilities/credit.utility';

/**
 * Which top-up to buy.
 *
 * Price and credit are shown as two separate figures, never as one "value" or a
 * derived multiplier. They are independent columns on the immutable package
 * version — the gap between them is the platform's margin, and an operator
 * changes it without a deploy — so a UI that implied a fixed ratio would start
 * lying the first time somebody retuned it.
 */
export function CreditPackagePicker({
  packages,
  selectedPackageId,
  onSelect,
  isLoading,
  isError,
  t,
  locale,
}: CreditPackagePickerProps): ReactElement {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {t('billing.credit.packagesError')}
      </p>
    );
  }

  if (packages.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('billing.credit.packagesEmpty')}</p>;
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('billing.credit.packages')}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {packages.map((pack) => {
        const isSelected = pack.id === selectedPackageId;
        return (
          <Button
            key={pack.id}
            type="button"
            variant="outline"
            role="radio"
            aria-checked={isSelected}
            onClick={() => {
              onSelect(pack.id);
            }}
            className={cn(
              'h-auto w-full flex-col items-start gap-1 px-3 py-2.5 text-start whitespace-normal',
              isSelected && 'border-primary ring-primary/30 ring-1',
            )}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <bdi className="text-base font-semibold tabular-nums">
                {formatMinorAmount(pack.priceMinor, pack.currency, locale)}
              </bdi>
              {isSelected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
            </span>
            <span className="text-muted-foreground text-xs">
              {t('billing.credit.packageCredit', {
                credit: formatMicroUsd(pack.creditMicroUsd, locale),
              })}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
