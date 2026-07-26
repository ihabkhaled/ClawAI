import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { BILLING_INTERVAL_ORDER } from '@/constants/billing.constants';
import type { BillingIntervalToggleProps } from '@/types/billing-component.types';

export function BillingIntervalToggle({
  value,
  onChange,
  t,
}: BillingIntervalToggleProps): ReactElement {
  return (
    <div
      className="border-border inline-flex rounded-lg border p-1"
      role="group"
      aria-label={t('billing.interval.toggleLabel')}
    >
      {BILLING_INTERVAL_ORDER.map((interval) => (
        <Button
          key={interval}
          type="button"
          size="sm"
          variant={interval === value ? 'default' : 'ghost'}
          aria-pressed={interval === value}
          onClick={() => onChange(interval)}
        >
          {t(`billing.interval.${interval}`)}
        </Button>
      ))}
    </div>
  );
}
