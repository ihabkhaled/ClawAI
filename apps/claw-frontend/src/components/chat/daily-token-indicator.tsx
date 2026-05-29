'use client';

import type { ReactElement } from 'react';

import { UsageMeter } from '@/components/account/usage-meter';
import { useDailyTokenIndicator } from '@/hooks/chat/use-daily-token-indicator';

export function DailyTokenIndicator(): ReactElement | null {
  const { quota, isLoading, t } = useDailyTokenIndicator();

  if (isLoading || !quota) {
    return null;
  }

  return (
    <div className="w-full max-w-xs rounded-md border border-border bg-card p-3">
      <UsageMeter quota={quota} t={t} />
    </div>
  );
}
