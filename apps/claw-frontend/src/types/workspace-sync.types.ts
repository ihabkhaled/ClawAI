import type { FreshnessBand } from '../enums/freshness-band.enum';
import type { WorkspaceConnectorStatus } from '../enums/workspace-connector-status.enum';
import type { WorkspaceProvider } from '../enums/workspace-provider.enum';

export type { FreshnessBand };

export type ConnectorSyncHealth = {
  connectorId: string;
  name: string;
  provider: WorkspaceProvider;
  status: WorkspaceConnectorStatus;
  cadenceSeconds: number;
  lastSyncAt: string | null;
  nextRunAt: string | null;
  freshnessBand: FreshnessBand;
  successRate24h: number;
  averageDurationMs: number | null;
  activeRunCount: number;
  consecutiveFailures: number;
  lastErrorCode: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
};

export type ProviderSyncSummary = {
  provider: WorkspaceProvider;
  connectorCount: number;
  degradedCount: number;
  pausedCount: number;
  averageDurationMs: number | null;
  successRate24h: number;
};

export type SyncHealthDashboardSchedulerState = {
  enabled: boolean;
  lastTickAt: string | null;
  activeRuns: number;
  dlqBacklog: number;
};

export type SyncHealthDashboard = {
  generatedAt: string;
  connectors: ConnectorSyncHealth[];
  providerSummaries: ProviderSyncSummary[];
  scheduler: SyncHealthDashboardSchedulerState;
};

export type UpdateCadenceRequest = {
  syncIntervalSeconds: number;
};

export type PauseConnectorRequest = {
  reason?: string;
};
