import type { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import type { FreshnessBand } from '../../../common/enums/freshness-band.enum';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

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

export type SyncHealthDashboard = {
  generatedAt: string;
  connectors: ConnectorSyncHealth[];
  providerSummaries: ProviderSyncSummary[];
  scheduler: {
    enabled: boolean;
    lastTickAt: string | null;
    activeRuns: number;
    dlqBacklog: number;
  };
};

export type InternalSyncHealth = {
  schedulerEnabled: boolean;
  schedulerAlive: boolean;
  lastTickAt: string | null;
  activeRuns: number;
  dlqBacklog: number;
  staleConnectors: number;
  degradedConnectors: number;
  pausedConnectors: number;
};

export type RunStatRow = {
  connectorId: string;
  status: string;
  _count: number;
  _avg: { durationMs: number | null };
};

export type ActiveRunRow = {
  connectorId: string;
  _count: number;
};

export type SyncHealthConnectorProjection = {
  id: string;
  name: string;
  provider: string;
  status: string;
  syncIntervalSeconds: number | null;
  lastSyncAt: Date | null;
  pausedAt: Date | null;
  pauseReason: string | null;
  statusReason: string | null;
};
