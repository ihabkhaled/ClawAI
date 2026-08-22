import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import type { RouterModelRowProps } from '@/types/router-model-components.types';

export function RouterModelRow({ row, onSelect }: RouterModelRowProps): ReactElement {
  const { t } = useTranslation();
  return (
    <tr
      className="border-border hover:bg-muted/40 touch:block touch:rounded-lg touch:border cursor-pointer border-b transition-colors"
      onClick={() => onSelect(row.id)}
    >
      <td
        data-label={t('routing.models.columnModelKey')}
        className="touch:before:text-muted-foreground touch:grid touch:grid-cols-[auto_minmax(0,1fr)] touch:gap-3 touch:text-end touch:before:text-start touch:before:text-xs touch:before:font-normal touch:before:content-[attr(data-label)] px-3 py-2 font-medium"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <span>{row.displayName}</span>
          <span className="text-muted-foreground text-xs break-all">{row.modelKey}</span>
        </div>
      </td>
      <td
        data-label={t('routing.models.columnProvider')}
        className="touch:before:text-muted-foreground touch:flex touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        {row.provider}
      </td>
      <td
        data-label={t('routing.models.columnLifecycle')}
        className="touch:before:text-muted-foreground touch:flex touch:flex-wrap touch:justify-end touch:gap-1 touch:before:me-auto touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2"
      >
        <Badge variant={row.lifecycle === 'ACTIVE' ? 'default' : 'secondary'}>
          {row.lifecycle}
        </Badge>
        {row.isRouterOnly ? (
          <Badge variant="outline" className="ml-1">
            router-only
          </Badge>
        ) : null}
        {row.isLocal ? (
          <Badge variant="outline" className="ml-1">
            local
          </Badge>
        ) : null}
      </td>
      <td
        data-label={t('routing.models.columnQuality')}
        className="touch:before:text-muted-foreground touch:flex touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        {row.qualityTier}
      </td>
      <td
        data-label={t('routing.models.columnCost')}
        className="touch:before:text-muted-foreground touch:flex touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        {row.costClass !== null ? `${row.costClass} (${row.costConfidenceLabel})` : '—'}
      </td>
      <td
        data-label={t('routing.models.columnLatency')}
        className="touch:before:text-muted-foreground touch:flex touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        {row.latencyP95Ms !== null ? `${row.latencyP95Ms}ms` : '—'}
      </td>
      <td
        data-label="Privacy"
        className="touch:before:text-muted-foreground touch:flex touch:justify-between touch:gap-3 touch:before:text-xs touch:before:content-[attr(data-label)] px-3 py-2 text-sm"
      >
        {row.privacy}
      </td>
    </tr>
  );
}
