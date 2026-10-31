import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { PresenceFilter } from '@/enums/presence-filter.enum';
import { cn } from '@/lib/utils';
import type { PresenceSummaryCardProps } from '@/types';

/**
 * Online-now and active-in-24h counters that double as filters: clicking one
 * narrows the table to those users, clicking it again clears the filter.
 * The banned counter is informational.
 */
export function PresenceSummaryCards({
  summary,
  activeFilter,
  onSelectFilter,
  t,
}: PresenceSummaryCardProps): ReactElement {
  const cardClass =
    'border-border bg-card flex h-auto flex-col items-start gap-1 rounded-lg border p-4 text-start whitespace-normal';
  const activeClass = 'border-primary ring-primary/30 ring-2';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="presence-summary">
      <Button
        type="button"
        variant="outline"
        aria-pressed={activeFilter === PresenceFilter.ONLINE}
        className={cn(cardClass, activeFilter === PresenceFilter.ONLINE && activeClass)}
        onClick={() =>
          onSelectFilter(activeFilter === PresenceFilter.ONLINE ? null : PresenceFilter.ONLINE)
        }
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="bg-success inline-block h-2.5 w-2.5 rounded-full" aria-hidden="true" />
          {t('admin.presenceOnlineNow')}
        </span>
        <span className="text-2xl font-semibold" data-testid="presence-online-count">
          {summary?.onlineNow ?? '-'}
        </span>
      </Button>
      <Button
        type="button"
        variant="outline"
        aria-pressed={activeFilter === PresenceFilter.ACTIVE_24H}
        className={cn(cardClass, activeFilter === PresenceFilter.ACTIVE_24H && activeClass)}
        onClick={() =>
          onSelectFilter(
            activeFilter === PresenceFilter.ACTIVE_24H ? null : PresenceFilter.ACTIVE_24H,
          )
        }
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="bg-warning inline-block h-2.5 w-2.5 rounded-full" aria-hidden="true" />
          {t('admin.presenceActive24h')}
        </span>
        <span className="text-2xl font-semibold" data-testid="presence-active-count">
          {summary?.active24h ?? '-'}
        </span>
      </Button>
      <div className={cn(cardClass, 'bg-card')}>
        <span className="flex items-center gap-2 text-sm font-medium">
          <span
            className="bg-destructive inline-block h-2.5 w-2.5 rounded-full"
            aria-hidden="true"
          />
          {t('admin.presenceBannedNow')}
        </span>
        <span className="text-2xl font-semibold" data-testid="presence-banned-count">
          {summary?.bannedNow ?? '-'}
        </span>
      </div>
    </div>
  );
}
