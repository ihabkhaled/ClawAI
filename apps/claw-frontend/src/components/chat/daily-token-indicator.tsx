'use client';

import type { ReactElement } from 'react';

import { UsageMeter } from '@/components/account/usage-meter';
import { useDailyTokenIndicator } from '@/hooks/chat/use-daily-token-indicator';

export function DailyTokenIndicator(): ReactElement | null {
  const { quota, wallet, isLoading, isWalletLoading, t, locale } = useDailyTokenIndicator();

  if (isLoading || !quota) {
    return null;
  }

  return (
    <div className="border-border bg-card w-full max-w-xs rounded-md border p-3">
      {/* The wallet is passed only once it has actually loaded. Handing the
          meter a null wallet mid-flight would flash "no credit on this plan"
          at somebody who has plenty. */}
      <UsageMeter quota={quota} wallet={isWalletLoading ? null : wallet} t={t} locale={locale} />
    </div>
  );
}
