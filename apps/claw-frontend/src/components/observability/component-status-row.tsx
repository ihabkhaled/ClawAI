import {
  STATUS_COMPONENT_LABEL_KEYS,
  UPTIME_WINDOW_LABEL_KEYS,
} from '@/constants/service-status.constants';
import { useTranslation } from '@/lib/i18n';
import type { ComponentStatusRowProps } from '@/types';
import {
  formatCoveragePercent,
  formatUptimePercent,
  isPartialCoverage,
} from '@/utilities/service-status.utility';

import { ComponentStateBadge } from './component-state-badge';

export function ComponentStatusRow({ entry }: ComponentStatusRowProps) {
  const { t, locale } = useTranslation();

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between md:gap-6">
      <div className="flex min-w-0 items-center justify-between gap-3 md:w-72 md:shrink-0">
        <span className="truncate font-medium">
          {t(STATUS_COMPONENT_LABEL_KEYS[entry.component])}
        </span>
        <ComponentStateBadge state={entry.state} />
      </div>
      <dl
        aria-label={t('observability.status.uptime')}
        className="grid grid-cols-3 gap-3 text-sm md:max-w-md md:flex-1"
      >
        {entry.uptime.map((uptime) => (
          <div key={uptime.window} className="min-w-0">
            <dt className="text-muted-foreground text-xs">
              {t(UPTIME_WINDOW_LABEL_KEYS[uptime.window])}
            </dt>
            <dd className="font-medium tabular-nums">
              {formatUptimePercent(uptime.uptimeBasisPoints, locale) ??
                t('observability.status.noData')}
            </dd>
            {uptime.uptimeBasisPoints !== null && isPartialCoverage(uptime.coverageBasisPoints) ? (
              <dd className="text-muted-foreground text-xs">
                {t('observability.status.partialCoverage', {
                  percent: formatCoveragePercent(uptime.coverageBasisPoints, locale),
                })}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
    </li>
  );
}
