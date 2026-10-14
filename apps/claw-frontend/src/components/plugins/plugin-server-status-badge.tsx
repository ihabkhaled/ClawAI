import { Badge } from '@/components/ui/badge';
import {
  PLUGIN_SERVER_STATUS_KEYS,
  PLUGIN_SERVER_STATUS_VARIANTS,
} from '@/constants/plugin-servers.constants';
import type { PluginServerStatusBadgeProps } from '@/types/plugin-servers.types';
import { knownServerStatus } from '@/utilities/plugin-servers.utility';

/** The server's status. A status this build does not know is shown as the server sent it. */
export function PluginServerStatusBadge({
  status,
  t,
}: PluginServerStatusBadgeProps): React.ReactElement {
  const known = knownServerStatus(status);
  return (
    <Badge
      variant={known === undefined ? 'outline' : PLUGIN_SERVER_STATUS_VARIANTS[known]}
      data-testid="plugin-server-status"
    >
      {known === undefined ? status : t(PLUGIN_SERVER_STATUS_KEYS[known])}
    </Badge>
  );
}
