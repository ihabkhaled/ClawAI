import type { ReactElement } from 'react';

import type { SyncHealthRowProps } from '../../types/sync-health-component.types';
import { formatRelativeAge } from '../../utilities/freshness-band.utility';
import { getFreshnessBandLabel } from '../../utilities/sync-band-label.utility';

import { StaleChip } from './stale-chip';

export function SyncHealthRow({ row, t }: SyncHealthRowProps): ReactElement {
  const bandLabel = getFreshnessBandLabel(row.freshnessBand, t);
  const successRatePct = Math.round(row.successRate24h * 100);
  return (
    <tr className="border-b border-border hover:bg-muted/30">
      <td className="px-3 py-2 text-sm font-medium">
        {row.name}
        <span className="ml-2 text-xs text-muted-foreground">{row.provider}</span>
      </td>
      <td className="px-3 py-2">
        <StaleChip band={row.freshnessBand} label={bandLabel} />
      </td>
      <td className="px-3 py-2 text-sm">{formatRelativeAge(row.lastSyncAt)}</td>
      <td className="px-3 py-2 text-sm">{row.cadenceSeconds}s</td>
      <td className="px-3 py-2 text-sm">{successRatePct}%</td>
      <td className="px-3 py-2 text-sm">
        {row.averageDurationMs === null ? '—' : `${row.averageDurationMs}ms`}
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{row.status}</td>
    </tr>
  );
}
