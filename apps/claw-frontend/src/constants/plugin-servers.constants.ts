import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { PluginServerStatus } from '@/enums/plugin-server-status.enum';
import type { PluginServerList } from '@/types/plugin-servers.types';

/** Badge colour per server status. An unknown status is shown as the server sent it. */
export const PLUGIN_SERVER_STATUS_VARIANTS: Readonly<
  Record<PluginServerStatus, 'success' | 'warning' | 'destructive' | 'outline'>
> = {
  [PluginServerStatus.Approved]: 'success',
  [PluginServerStatus.PendingApproval]: 'warning',
  [PluginServerStatus.NeedsReview]: 'warning',
  [PluginServerStatus.Rejected]: 'destructive',
  [PluginServerStatus.Unreachable]: 'destructive',
  [PluginServerStatus.Disabled]: 'outline',
};

export const PLUGIN_SERVER_STATUS_KEYS: Readonly<Record<PluginServerStatus, string>> = {
  [PluginServerStatus.Approved]: 'pluginsServers.status.approved',
  [PluginServerStatus.PendingApproval]: 'pluginsServers.status.pendingApproval',
  [PluginServerStatus.NeedsReview]: 'pluginsServers.status.needsReview',
  [PluginServerStatus.Rejected]: 'pluginsServers.status.rejected',
  [PluginServerStatus.Unreachable]: 'pluginsServers.status.unreachable',
  [PluginServerStatus.Disabled]: 'pluginsServers.status.disabled',
};

/** Server error codes to text. The backend contract names the first two; the rest are defensive. */
export const PLUGIN_SERVER_ERROR_KEYS: Readonly<Record<string, string>> = {
  PLUGIN_SERVER_URL_REFUSED: 'pluginsServers.errors.urlRefused',
  PLUGIN_SERVER_LIMIT_REACHED: 'pluginsServers.errors.limitReached',
  PLUGIN_SERVER_UNREACHABLE: 'pluginsServers.errors.unreachable',
  PLUGIN_SERVER_NOT_FOUND: 'pluginsServers.errors.notFound',
  PLUGIN_SERVER_REJECTED: 'pluginsServers.errors.rejected',
};

export const PLUGIN_SERVER_NAME_MAX_LENGTH = 80;
export const PLUGIN_SERVER_URL_MAX_LENGTH = 2048;
export const PLUGIN_SERVER_HEADER_NAME_MAX_LENGTH = 60;
export const PLUGIN_SERVER_DEFAULT_HEADER_NAME = 'Authorization';
export const PLUGIN_SERVER_DEFAULT_RISK = PluginRiskLevel.Write;

export const PLUGIN_SERVER_SKELETON_KEYS: readonly string[] = Array.from(
  { length: 3 },
  (_, index) => `plugin-server-skeleton-${index}`,
);

/** What the list is before the first answer arrives. */
export const PLUGIN_SERVERS_EMPTY_LIST: PluginServerList = { servers: [], limit: undefined };

export const PLUGIN_SERVERS_GRID_CLASSES = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';
