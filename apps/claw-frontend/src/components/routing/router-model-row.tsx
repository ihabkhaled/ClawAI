import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import type { RouterModelRowProps } from '@/types/router-model-components.types';

export function RouterModelRow({ row, onSelect }: RouterModelRowProps): ReactElement {
  return (
    <tr
      className="cursor-pointer border-b border-border transition-colors hover:bg-muted/40"
      onClick={() => onSelect(row.id)}
    >
      <td className="px-3 py-2 font-medium">
        <div className="flex flex-col gap-1">
          <span>{row.displayName}</span>
          <span className="text-xs text-muted-foreground">{row.modelKey}</span>
        </div>
      </td>
      <td className="px-3 py-2 text-sm">{row.provider}</td>
      <td className="px-3 py-2">
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
      <td className="px-3 py-2 text-sm">{row.qualityTier}</td>
      <td className="px-3 py-2 text-sm">
        {row.costClass !== null ? `${row.costClass} (${row.costConfidenceLabel})` : '—'}
      </td>
      <td className="px-3 py-2 text-sm">
        {row.latencyP95Ms !== null ? `${row.latencyP95Ms}ms` : '—'}
      </td>
      <td className="px-3 py-2 text-sm">{row.privacy}</td>
    </tr>
  );
}
