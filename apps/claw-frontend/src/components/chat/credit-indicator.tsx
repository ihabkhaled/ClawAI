'use client';

import { Wallet } from 'lucide-react';
import type { ReactElement } from 'react';

import { useCreditIndicator } from '@/hooks/credit/use-credit-indicator';
import { formatMicroUsd, isCreditMetered } from '@/utilities/credit.utility';

/**
 * The composer's credit badge, sibling of the daily-token indicator.
 *
 * Both figures have to be visible at once because either one can refuse a
 * message on its own: somebody with plenty of tokens and an empty wallet is
 * blocked while staring at a green token bar, and nothing on screen explains it.
 *
 * Renders nothing at all when the account is not metered — an administrator or a
 * disabled kill switch has no balance to spend, and a badge reading "$0.00" there
 * would be alarming and wrong.
 */
export function CreditIndicator(): ReactElement | null {
  const { wallet, isLoading, t, locale } = useCreditIndicator();

  if (isLoading || !isCreditMetered(wallet) || wallet === null) {
    return null;
  }

  return (
    <span
      className="border-border bg-card text-muted-foreground inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs"
      title={t('chat.credit.badgeHint')}
    >
      <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t('chat.credit.badgeLabel')}</span>
      <bdi className="tabular-nums">{formatMicroUsd(wallet.availableMicroUsd, locale)}</bdi>
    </span>
  );
}
