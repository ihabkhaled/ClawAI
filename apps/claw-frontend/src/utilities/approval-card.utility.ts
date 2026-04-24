import { WorkspaceConnectorStatus } from '@/enums/workspace-connector-status.enum';

export function stringifyPayload(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return '{…}';
  }
}

export function isConnectorStale(status: WorkspaceConnectorStatus): boolean {
  return (
    status === WorkspaceConnectorStatus.DEGRADED ||
    status === WorkspaceConnectorStatus.PAUSED ||
    status === WorkspaceConnectorStatus.DISCONNECTED ||
    status === WorkspaceConnectorStatus.PENDING_AUTH
  );
}
