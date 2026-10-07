import type { ReactElement } from 'react';

import { USAGE_TONE_BAR_CLASSES } from '@/constants/billing.constants';
import { cn } from '@/lib/utils';
import type { FreeAllowanceMeterProps } from '@/types/credit-component.types';
import { resolveUsageTone } from '@/utilities/billing.utility';
import { formatFreeAllowanceReset } from '@/utilities/credit.utility';

/**
 * The plan's free credit for the month, as a count and a meter: "6 of 10 free requests used" and
 * "35% of your free credit used". The meter is a percentage on purpose (rule 28): it says how much
 * is left without disclosing what a provider charges the platform.
 */
export function FreeAllowanceMeter({
  allowance,
  locale,
  t,
}: FreeAllowanceMeterProps): ReactElement {
  const percent = allowance.meterUsedPercent;
  const tone = resolveUsageTone(percent === null ? null : percent / 100);

  return (
    <section
      data-testid="free-allowance-meter"
      aria-label={t('billing.credit.freeMeter.title')}
      className="border-border grid grid-cols-1 gap-2 rounded-lg border p-3"
    >
      <h3 className="text-sm font-medium">{t('billing.credit.freeMeter.title')}</h3>
      {allowance.limit === null ? null : (
        <p className="text-sm tabular-nums">
          {t('billing.credit.freeMeter.requests', {
            used: String(allowance.used),
            limit: String(allowance.limit),
          })}
        </p>
      )}
      {percent === null ? null : (
        <>
          <div
            className="bg-muted h-2.5 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-label={t('billing.credit.freeMeter.percent', { percent: String(percent) })}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              data-testid="free-meter-bar"
              className={cn('h-full transition-all', USAGE_TONE_BAR_CLASSES[tone])}
              style={{ width: `${String(percent)}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {t('billing.credit.freeMeter.percent', { percent: String(percent) })}
          </p>
          <p className="text-muted-foreground text-xs">
            {t('billing.credit.freeMeter.coversLowerCost')}
          </p>
        </>
      )}
      <p className="text-muted-foreground text-xs">
        {formatFreeAllowanceReset(allowance.resetsAt, locale, t)}
      </p>
    </section>
  );
}
