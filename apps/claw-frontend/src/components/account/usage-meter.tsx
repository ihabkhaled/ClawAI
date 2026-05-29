'use client';

import type { ReactElement } from 'react';

import { Progress } from '@/components/ui/progress';
import type { UsageMeterProps } from '@/types';
import { computeUsagePercent, formatTokenCount } from '@/utilities';

export function UsageMeter({ quota, t }: UsageMeterProps): ReactElement {
  if (quota.unlimited) {
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('userUsage.dailyTokens')}</span>
          <span className="font-medium">{t('userUsage.unlimited')}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t('userUsage.unlimitedHint')}</p>
      </div>
    );
  }

  const percent = computeUsagePercent(quota.used, quota.dailyLimit);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('userUsage.dailyTokens')}</span>
        <span className="font-medium">
          {t('userUsage.usedOfLimit', {
            used: formatTokenCount(quota.used),
            limit: formatTokenCount(quota.dailyLimit),
          })}
        </span>
      </div>
      <Progress value={percent} aria-label={t('userUsage.dailyTokens')} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t('userUsage.percentUsed', { percent: String(percent) })}</span>
        <span>{t('userUsage.remaining', { remaining: formatTokenCount(quota.remaining) })}</span>
      </div>
    </div>
  );
}
