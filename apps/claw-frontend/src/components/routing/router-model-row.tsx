import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import type { RouterModelRowProps } from '@/types/router-model-components.types';

export function RouterModelRow({ row, onSelect }: RouterModelRowProps): ReactElement {
  const { t } = useTranslation();
  return (
    <tr
      className="border-border hover:bg-muted/40 cursor-pointer border-b transition-colors max-md:block max-md:rounded-lg max-md:border"
      onClick={() => onSelect(row.id)}
    >
      <td
        data-label={t('routing.models.columnModelKey')}
        className="max-md:before:text-muted-foreground px-3 py-2 font-medium max-md:grid max-md:grid-cols-[auto_minmax(0,1fr)] max-md:gap-3 max-md:text-end max-md:before:text-start max-md:before:text-xs max-md:before:font-normal max-md:before:content-[attr(data-label)]"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <span>{row.displayName}</span>
          <span className="text-muted-foreground text-xs break-all">{row.modelKey}</span>
        </div>
      </td>
      <td
        data-label={t('routing.models.columnProvider')}
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {row.provider}
      </td>
      <td
        data-label={t('routing.models.columnLifecycle')}
        className="max-md:before:text-muted-foreground px-3 py-2 max-md:flex max-md:flex-wrap max-md:justify-end max-md:gap-1 max-md:before:me-auto max-md:before:text-xs max-md:before:content-[attr(data-label)]"
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
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {row.qualityTier}
      </td>
      <td
        data-label={t('routing.models.columnCost')}
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {row.costClass !== null ? `${row.costClass} (${row.costConfidenceLabel})` : '—'}
      </td>
      <td
        data-label={t('routing.models.columnLatency')}
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {row.latencyP95Ms !== null ? `${row.latencyP95Ms}ms` : '—'}
      </td>
      <td
        data-label="Privacy"
        className="max-md:before:text-muted-foreground px-3 py-2 text-sm max-md:flex max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {row.privacy}
      </td>
    </tr>
  );
}
