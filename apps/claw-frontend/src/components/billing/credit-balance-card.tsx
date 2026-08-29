'use client';

import { Wallet } from 'lucide-react';
import type { ReactElement } from 'react';

import { CreditDualConsumptionNotice } from '@/components/billing/credit-dual-consumption-notice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { USAGE_TONE_BAR_CLASSES } from '@/constants/billing.constants';
import { cn } from '@/lib/utils';
import type { CreditBalanceCardProps } from '@/types/credit-component.types';
import { resolveUsageTone } from '@/utilities/billing.utility';
import {
  computeCreditConsumedPercent,
  computeCreditConsumedRatio,
  computeGrantSegmentPercent,
  computePurchasedSegmentPercent,
  formatGrantReset,
  formatMicroUsd,
  hasNoCreditAllowance,
} from '@/utilities/credit.utility';

/**
 * The wallet, as two buckets rather than one number.
 *
 * The split is a commitment to the customer, not an implementation detail:
 * GRANT is the plan's monthly allowance and is swept at the period roll, while
 * PURCHASED is money somebody paid and never expires. A single bar would let a
 * user believe the credit they bought resets on the first of the month.
 *
 * `reserved` is shown too, because `available` is already net of it — without
 * the line, a user whose request is in flight sees a balance that does not add
 * up and assumes they were charged twice.
 */
export function CreditBalanceCard({
  wallet,
  isLoading,
  isError,
  onAddCredit,
  t,
  locale,
}: CreditBalanceCardProps): ReactElement {
  const percentConsumed = wallet === null ? 0 : computeCreditConsumedPercent(wallet);
  const tone = resolveUsageTone(wallet === null ? null : computeCreditConsumedRatio(wallet));
  const grantWidth = wallet === null ? 0 : computeGrantSegmentPercent(wallet);
  const purchasedWidth = wallet === null ? 0 : computePurchasedSegmentPercent(wallet);

  return (
    <Card className="max-w-full min-w-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('billing.credit.title')}
        </CardTitle>
        {onAddCredit === undefined || wallet === null ? null : (
          <Button type="button" size="sm" onClick={onAddCredit}>
            {t('billing.credit.addCredit')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4">
        {isLoading ? <Skeleton className="h-28 w-full" /> : null}

        {isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t('billing.credit.error')}
          </p>
        ) : null}

        {!isLoading && !isError && wallet === null ? (
          <p className="text-muted-foreground text-sm">{t('billing.credit.empty')}</p>
        ) : null}

        {!isLoading && !isError && wallet !== null && wallet.adminBypass ? (
          <p className="text-muted-foreground text-sm">{t('billing.credit.adminBypass')}</p>
        ) : null}

        {!isLoading && !isError && wallet !== null && !wallet.adminBypass ? (
          <>
            {!wallet.meteringEnabled ? (
              <p className="text-muted-foreground text-sm">
                {t('billing.credit.meteringDisabled')}
              </p>
            ) : null}

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-muted-foreground text-sm">{t('billing.credit.available')}</span>
              <bdi className="text-2xl font-semibold tabular-nums">
                {formatMicroUsd(wallet.availableMicroUsd, locale)}
              </bdi>
            </div>

            {/* Two segments, one track. The reserved remainder is deliberately
                left as bare track: money held for an in-flight request is
                neither spent nor spendable, and colouring it either way would
                be a claim we cannot stand behind. */}
            <div
              className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-label={t('billing.credit.title')}
              aria-valuenow={percentConsumed}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                data-testid="credit-bar-grant"
                className={cn('h-full transition-all', USAGE_TONE_BAR_CLASSES[tone])}
                style={{ width: `${String(grantWidth)}%` }}
              />
              <div
                data-testid="credit-bar-purchased"
                className="bg-success h-full transition-all"
                style={{ width: `${String(purchasedWidth)}%` }}
              />
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <div className="grid grid-cols-1 gap-0.5">
                <dt className="text-muted-foreground text-xs">{t('billing.credit.grantBucket')}</dt>
                <dd className="font-medium tabular-nums">
                  <bdi>{formatMicroUsd(wallet.grantMicroUsd, locale)}</bdi>
                </dd>
                <dd className="text-muted-foreground text-xs">
                  {formatGrantReset(wallet, locale, t)}
                </dd>
                {/* Why this number is this number. The grant is a SHARE of what
                    the plan costs, not a figure an operator picked, so a user
                    who upgrades knows the credit moves with the price and a
                    user on a free plan knows why theirs is empty. */}
                <dd className="text-muted-foreground text-xs">
                  {t('billing.credit.grantShareNote')}
                </dd>
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                <dt className="text-muted-foreground text-xs">
                  {t('billing.credit.purchasedBucket')}
                </dt>
                <dd className="font-medium tabular-nums">
                  <bdi>{formatMicroUsd(wallet.purchasedMicroUsd, locale)}</bdi>
                </dd>
                <dd className="text-muted-foreground text-xs">
                  {t('billing.credit.neverExpires')}
                </dd>
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                <dt className="text-muted-foreground text-xs">{t('billing.credit.reserved')}</dt>
                <dd className="font-medium tabular-nums">
                  <bdi>{formatMicroUsd(wallet.reservedMicroUsd, locale)}</bdi>
                </dd>
                <dd className="text-muted-foreground text-xs">
                  {t('billing.credit.reservedHint')}
                </dd>
              </div>
            </dl>

            <p className="text-muted-foreground text-xs">
              {t('billing.credit.percentUsed', { percent: String(percentConsumed) })}
            </p>

            {hasNoCreditAllowance(wallet) ? (
              <p className="text-muted-foreground text-sm">{t('billing.credit.noAllowance')}</p>
            ) : null}
          </>
        ) : null}

        <CreditDualConsumptionNotice t={t} />
      </CardContent>
    </Card>
  );
}
