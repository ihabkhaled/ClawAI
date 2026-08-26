import type { ReactElement } from 'react';

import { Separator } from '@/components/ui/separator';
import type { ProrationBreakdownProps } from '@/types/billing-component.types';
import { formatMinorAmount } from '@/utilities/billing.utility';
import { formatDateTimeSafe } from '@/utilities/date.utility';

// Shows the arithmetic behind the amount, not just the total.
//
// The user is about to be charged a number they did not choose, derived from a
// period they are part-way through. Showing credit and charge separately is the
// difference between a considered upgrade and a chargeback.
export function ProrationBreakdown({ quote, t }: ProrationBreakdownProps): ReactElement {
  if (quote.isScheduledForPeriodEnd) {
    return (
      <div className="border-border grid grid-cols-1 gap-2 rounded-lg border p-3 text-sm">
        <p>
          {t('billing.proration.scheduled', {
            date: formatDateTimeSafe(quote.scheduledEffectiveAt),
          })}
        </p>
        <p className="text-muted-foreground">{t('billing.proration.scheduledNoCharge')}</p>
      </div>
    );
  }

  return (
    <dl className="border-border grid grid-cols-1 gap-2 rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-muted-foreground">{t('billing.proration.unusedCredit')}</dt>
        <dd>-{formatMinorAmount(quote.unusedCurrentCreditMinor, quote.currency)}</dd>
      </div>
      <div className="flex items-center justify-between gap-2">
        <dt className="text-muted-foreground">{t('billing.proration.remainingCharge')}</dt>
        <dd>{formatMinorAmount(quote.targetRemainingChargeMinor, quote.currency)}</dd>
      </div>
      <Separator />
      <div className="flex items-center justify-between gap-2 font-medium">
        <dt>{t('billing.proration.dueToday')}</dt>
        <dd>{formatMinorAmount(quote.amountDueMinor, quote.currency)}</dd>
      </div>
    </dl>
  );
}
