import { Check, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { Separator } from '@/components/ui/separator';
import type { FeatureAllowanceListProps } from '@/types/billing-component.types';
import { formatFeatureAllowanceUsage } from '@/utilities/billing.utility';

export function FeatureAllowanceList({
  features,
  t,
}: FeatureAllowanceListProps): ReactElement | null {
  if (features.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      <Separator />
      <p className="text-sm font-medium">{t('billing.features.title')}</p>
      <ul className="grid grid-cols-1 gap-1.5 text-sm">
        {features.map((allowance) => (
          <li key={allowance.feature} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              {allowance.allowed ? (
                <Check className="text-success h-4 w-4" aria-hidden="true" />
              ) : (
                <X className="text-muted-foreground h-4 w-4" aria-hidden="true" />
              )}
              <span>{t(`billing.features.${allowance.feature}`)}</span>
            </span>
            {/* A metered feature shows its counter even when currently allowed —
                "3 of 5 used" is the difference between planning and being cut
                off mid-task. */}
            <span className="text-muted-foreground">
              {formatFeatureAllowanceUsage(allowance, t)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
