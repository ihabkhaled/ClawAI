import type { SyncHealthDashboard } from './workspace-sync.types';
import type { WorkspaceConnector } from './workspace.types';

export type UseSyncHealthDashboardResult = {
  dashboard: SyncHealthDashboard | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
};

export type UseSyncHealthPageResult = UseSyncHealthDashboardResult;

export type UseUpdateCadenceResult = {
  mutate: (connectorId: string, syncIntervalSeconds: number) => void;
  isPending: boolean;
  error: Error | null;
};

export type UsePauseResumeConnectorResult = {
  pause: (connectorId: string, reason?: string) => void;
  resume: (connectorId: string) => void;
  isPending: boolean;
  error: Error | null;
};

export type UpdateCadenceMutationInput = {
  connectorId: string;
  syncIntervalSeconds: number;
};

export type PauseConnectorMutationInput = {
  connectorId: string;
  reason?: string;
};

export type PauseMutationType = WorkspaceConnector;
