import type { ReactElement } from 'react';

import type { SyncHealthRowProps } from '../../types/sync-health-component.types';
import { formatRelativeAge } from '../../utilities/freshness-band.utility';
import { getFreshnessBandLabel } from '../../utilities/sync-band-label.utility';

import { StaleChip } from './stale-chip';

export function SyncHealthRow({ row, t }: SyncHealthRowProps): ReactElement {
  const bandLabel = getFreshnessBandLabel(row.freshnessBand, t);
  const successRatePct = Math.round(row.successRate24h * 100);
  return (
    <tr className="border-border hover:bg-muted/30 border-b max-md:block max-md:rounded-lg max-md:border">
      <td
        data-label={t('workspaceSync.dashboard.col.connector')}
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm font-medium max-md:flex max-md:items-start max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:font-normal max-md:before:content-[attr(data-label)]"
      >
        {row.name}
        <span className="text-muted-foreground ml-2 text-xs">{row.provider}</span>
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.freshness')}
        className="max-md:before:text-muted-foreground px-3 py-2 max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        <StaleChip band={row.freshnessBand} label={bandLabel} />
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.last_sync')}
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {formatRelativeAge(row.lastSyncAt)}
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.cadence')}
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {row.cadenceSeconds}s
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.success_rate')}
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {successRatePct}%
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.avg_duration')}
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {row.averageDurationMs === null ? '—' : `${row.averageDurationMs}ms`}
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.status')}
        className="text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {row.status}
      </td>
    </tr>
  );
}
