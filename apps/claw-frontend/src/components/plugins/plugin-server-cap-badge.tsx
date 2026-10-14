import { Gauge } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { PluginServerCapState } from '@/enums/plugin-server-cap-state.enum';
import type { PluginServerCapBadgeProps } from '@/types/plugin-servers.types';

/** "2 of 5 servers". Unlimited says so, and 0 says the plan has none. Nothing is shown when the cap is unknown. */
export function PluginServerCapBadge({
  cap,
  t,
}: PluginServerCapBadgeProps): React.ReactElement | null {
  if (cap.state === PluginServerCapState.Unknown) {
    return null;
  }
  const atLimit =
    cap.state === PluginServerCapState.Disabled ||
    (cap.state === PluginServerCapState.Limited && !cap.canAdd);
  let label = t('pluginsServers.cap.unlimited', { current: cap.current });
  if (cap.state === PluginServerCapState.Disabled) {
    label = t('pluginsServers.cap.disabled');
  } else if (cap.state === PluginServerCapState.Limited) {
    label = t('pluginsServers.cap.used', { current: cap.current, limit: cap.limit ?? 0 });
  }
  return (
    <Badge
      variant={atLimit ? 'warning' : 'secondary'}
      className="gap-1.5"
      data-testid="plugin-server-cap"
    >
      <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Badge>
  );
}
