'use client';

import type { ReactElement } from 'react';

import { CreditUsageSection } from '@/components/account/credit-usage-section';
import { Progress } from '@/components/ui/progress';
import type { UsageMeterProps } from '@/types';
import { computeUsagePercent, formatTokenCount } from '@/utilities';

/**
 * Daily tokens AND pay-as-you-go credit, in one place.
 *
 * This is the screen the whole feature turns on. Before credit existed, one bar
 * told the whole truth. It no longer does: a user with tokens left and an empty
 * wallet is refused while looking at a green bar, and nothing on the page
 * explains why. So the credit meter is a first-class sibling of the token meter
 * here — the same shape the `adminBypass` branch already uses — not a footnote.
 *
 * `wallet` is optional so the read-only call sites (and every existing test)
 * keep working; when it is absent the meter is exactly what it always was.
 */
export function UsageMeter({ quota, wallet, t, locale }: UsageMeterProps): ReactElement {
  if (quota.adminBypass) {
    return (
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('userUsage.dailyTokens')}</span>
          <span className="font-medium">{t('userUsage.adminBypass')}</span>
        </div>
        <p className="text-muted-foreground text-xs">{t('userUsage.adminBypassHint')}</p>
      </div>
    );
  }

  const percent = computeUsagePercent(quota.used, quota.dailyLimit);

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-2">
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
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>{t('userUsage.percentUsed', { percent: String(percent) })}</span>
          <span>{t('userUsage.remaining', { remaining: formatTokenCount(quota.remaining) })}</span>
        </div>
      </div>

      {wallet === undefined || wallet === null ? null : (
        <CreditUsageSection wallet={wallet} t={t} locale={locale ?? ''} />
      )}
    </div>
  );
}
