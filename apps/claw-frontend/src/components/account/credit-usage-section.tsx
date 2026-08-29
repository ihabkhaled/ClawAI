'use client';

import type { ReactElement } from 'react';

import { USAGE_TONE_BAR_CLASSES } from '@/constants/billing.constants';
import { cn } from '@/lib/utils';
import type { CreditUsageSectionProps } from '@/types/credit-component.types';
import { resolveUsageTone } from '@/utilities/billing.utility';
import {
  computeCreditConsumedPercent,
  computeCreditConsumedRatio,
  formatMicroUsd,
  hasNoCreditAllowance,
} from '@/utilities/credit.utility';

/**
 * The credit half of the usage meter.
 *
 * Extracted rather than inlined because `usage-meter.tsx` is a component file
 * and a second bar with its own tone maths does not belong inside one. It is
 * also the piece every surface that shows "how much is left" reuses, so it has
 * to be one implementation, not two that drift.
 *
 * `dualConsumptionHint` sits under the bar on purpose: the meter is exactly
 * where a user asks "why did that stop me when this bar is green?", and the
 * answer — cloud answers spend both meters, local models spend only tokens —
 * has to be readable at that moment, not one page away.
 */
export function CreditUsageSection({ wallet, t, locale }: CreditUsageSectionProps): ReactElement {
  if (wallet.adminBypass) {
    return (
      <div className="grid grid-cols-1 gap-2 border-t pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('userUsage.connectorCredit')}</span>
          <span className="font-medium">{t('userUsage.adminBypass')}</span>
        </div>
        <p className="text-muted-foreground text-xs">{t('userUsage.adminBypassHint')}</p>
      </div>
    );
  }

  if (!wallet.meteringEnabled) {
    return (
      <div className="grid grid-cols-1 gap-2 border-t pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('userUsage.connectorCredit')}</span>
          <span className="font-medium">{t('billing.credit.meteringDisabled')}</span>
        </div>
      </div>
    );
  }

  if (hasNoCreditAllowance(wallet)) {
    return (
      <div className="grid grid-cols-1 gap-2 border-t pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('userUsage.connectorCredit')}</span>
          <span className="font-medium">{t('userPlan.noCreditOnThisPlan')}</span>
        </div>
        <p className="text-muted-foreground text-xs">{t('userUsage.dualConsumptionHint')}</p>
      </div>
    );
  }

  const percent = computeCreditConsumedPercent(wallet);
  const tone = resolveUsageTone(computeCreditConsumedRatio(wallet));

  return (
    <div className="grid grid-cols-1 gap-2 border-t pt-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('userUsage.connectorCredit')}</span>
        <span className="font-medium">
          <bdi className="tabular-nums">
            {t('userUsage.creditUsedOfLimit', {
              used: formatMicroUsd(
                Math.max(wallet.periodGrantMicroUsd - wallet.grantMicroUsd, 0),
                locale,
              ),
              limit: formatMicroUsd(wallet.periodGrantMicroUsd, locale),
            })}
          </bdi>
        </span>
      </div>

      <div
        className="bg-muted h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-label={t('userUsage.connectorCredit')}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full transition-all', USAGE_TONE_BAR_CLASSES[tone])}
          style={{ width: `${String(percent)}%` }}
        />
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{t('userUsage.creditPercentUsed', { percent: String(percent) })}</span>
        <span>
          <bdi className="tabular-nums">
            {t('userUsage.creditRemaining', {
              remaining: formatMicroUsd(wallet.availableMicroUsd, locale),
            })}
          </bdi>
        </span>
      </div>

      <p className="text-muted-foreground text-xs">{t('userUsage.dualConsumptionHint')}</p>
    </div>
  );
}
