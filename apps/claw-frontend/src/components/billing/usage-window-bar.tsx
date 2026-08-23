import type { ReactElement } from 'react';

import { USAGE_TONE_BAR_CLASSES } from '@/constants/billing.constants';
import { UsageTone } from '@/enums/billing.enum';
import { cn } from '@/lib/utils';
import type { UsageWindowBarProps } from '@/types/billing-component.types';
import {
  computeUsageRatio,
  computeUsageWindowPercent,
  formatQuotaLimit,
  resolveUsageTone,
} from '@/utilities/billing.utility';

export function UsageWindowBar({ label, window, t }: UsageWindowBarProps): ReactElement {
  const ratio = computeUsageRatio(window.used, window.limit);
  const tone = resolveUsageTone(ratio);
  const percent = computeUsageWindowPercent(window);
  const isUnlimited = tone === UsageTone.UNLIMITED;

  return (
    <div className="grid grid-cols-1 gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {isUnlimited
            ? t('billing.usage.usedUnlimited', { used: window.used.toLocaleString() })
            : t('billing.usage.usedOfLimit', {
                used: window.used.toLocaleString(),
                limit: formatQuotaLimit(window.limit, t),
              })}
        </span>
      </div>
      {/* Rendered as a plain div rather than the Progress primitive so the bar
          can carry a tone colour. The aria attributes keep it a real
          progressbar for assistive technology. */}
      <div
        className="bg-muted h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full transition-all', USAGE_TONE_BAR_CLASSES[tone])}
          style={{ width: `${isUnlimited ? 100 : percent}%` }}
        />
      </div>
    </div>
  );
}
