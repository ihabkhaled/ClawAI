import { WorkspaceConnectorStatus } from '@/enums/workspace-connector-status.enum';

export const WORKSPACE_CONNECTOR_STATUS_VARIANT: Record<
  WorkspaceConnectorStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [WorkspaceConnectorStatus.CONNECTED]: 'default',
  [WorkspaceConnectorStatus.DEGRADED]: 'secondary',
  [WorkspaceConnectorStatus.DISCONNECTED]: 'destructive',
  [WorkspaceConnectorStatus.PENDING_AUTH]: 'outline',
  [WorkspaceConnectorStatus.PAUSED]: 'secondary',
  [WorkspaceConnectorStatus.UNKNOWN]: 'outline',
};

export const WORKSPACE_CONNECTOR_STATUS_I18N_KEY: Record<WorkspaceConnectorStatus, string> = {
  [WorkspaceConnectorStatus.CONNECTED]: 'workspaceConnectors.connected',
  [WorkspaceConnectorStatus.DEGRADED]: 'workspaceConnectors.degraded',
  [WorkspaceConnectorStatus.DISCONNECTED]: 'workspaceConnectors.disconnected',
  [WorkspaceConnectorStatus.PENDING_AUTH]: 'workspaceConnectors.pendingAuth',
  [WorkspaceConnectorStatus.PAUSED]: 'workspaceConnectors.paused',
  [WorkspaceConnectorStatus.UNKNOWN]: 'workspaceConnectors.unknown',
};
