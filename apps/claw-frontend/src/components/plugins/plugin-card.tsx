import Link from 'next/link';
import { useId } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTES } from '@/constants/routes.constants';
import type { PluginCardProps } from '@/types/plugins.types';
import { categoryLabel } from '@/utilities/plugins.utility';

import { PluginIcon } from './plugin-icon';
import { PluginRiskBadge } from './plugin-risk-badge';

/** One catalog card. The whole card is the link, so the tap target is large on a phone. */
export function PluginCard({ plugin, t }: PluginCardProps): React.ReactElement {
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const summaryId = `${baseId}-summary`;
  const detailsId = `${baseId}-details`;
  return (
    <Link
      href={ROUTES.PLUGIN_DETAIL(plugin.slug)}
      aria-labelledby={nameId}
      aria-describedby={`${summaryId} ${detailsId}`}
      className="focus-visible:ring-ring block h-full min-w-0 rounded-xl focus-visible:ring-2 focus-visible:outline-none"
    >
      <Card className="hover:border-primary/50 h-full transition-colors">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <span className="bg-muted text-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <PluginIcon iconKey={plugin.iconKey} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id={nameId} className="truncate text-base font-semibold">
                {plugin.name}
              </h3>
              <p className="text-muted-foreground truncate text-xs">{plugin.publisher}</p>
            </div>
          </div>
          <p id={summaryId} className="text-muted-foreground line-clamp-3 text-sm">
            {plugin.summary}
          </p>
          <div id={detailsId} className="mt-auto flex flex-wrap items-center gap-2">
            <PluginRiskBadge risk={plugin.maxRisk} t={t} />
            <Badge variant="outline">{categoryLabel(t, plugin.category)}</Badge>
            <span className="text-muted-foreground ms-auto text-xs">
              {t('plugins.toolsCount', { value: plugin.toolCount })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
