import type { ReactElement } from 'react';

import type { SyncHealthRowProps } from '../../types/sync-health-component.types';
import { formatRelativeAge } from '../../utilities/freshness-band.utility';
import { getFreshnessBandLabel } from '../../utilities/sync-band-label.utility';

import { StaleChip } from './stale-chip';

export function SyncHealthRow({ row, t }: SyncHealthRowProps): ReactElement {
  const bandLabel = getFreshnessBandLabel(row.freshnessBand, t);
  const successRatePct = Math.round(row.successRate24h * 100);
  return (
    <tr className="border-border hover:bg-muted/30 touch:block touch:rounded-lg touch:border border-b">
      <td
        data-label={t('workspaceSync.dashboard.col.connector')}
        className="touch:before:text-muted-foreground touch:flex touch:items-start touch:justify-between touch:gap-3 touch:before:text-xs touch:before:font-normal touch:before:content-[attr(data-label)] px-3 py-2 text-sm font-medium"
      >
        {row.name}
        <span className="text-muted-foreground ml-2 text-xs">{row.provider}</span>
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.freshness')}
        className="touch:before:text-muted-foreground touch:flex touch:items-center touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2"
      >
        <StaleChip band={row.freshnessBand} label={bandLabel} />
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.last_sync')}
        className="touch:before:text-muted-foreground touch:flex touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        {formatRelativeAge(row.lastSyncAt)}
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.cadence')}
        className="touch:before:text-muted-foreground touch:flex touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        {row.cadenceSeconds}s
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.success_rate')}
        className="touch:before:text-muted-foreground touch:flex touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        {successRatePct}%
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.avg_duration')}
        className="touch:before:text-muted-foreground touch:flex touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        {row.averageDurationMs === null ? '—' : `${row.averageDurationMs}ms`}
      </td>
      <td
        data-label={t('workspaceSync.dashboard.col.status')}
        className="text-muted-foreground touch:flex touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        {row.status}
      </td>
    </tr>
  );
}
