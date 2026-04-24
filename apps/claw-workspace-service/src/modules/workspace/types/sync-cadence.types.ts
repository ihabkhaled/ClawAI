import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import type { WorkspaceSyncTriggeredBy } from '@claw/shared-types';

export type SyncCadenceConfig = {
  provider: WorkspaceProvider;
  intervalSeconds: number;
  backfillWindowDays: number;
  priority: number;
  supportsDeltaSync: boolean;
  supportsWebhookSync: boolean;
  nativeCursorKind: string | null;
};

export type SchedulerTickPayload = {
  connectorId: string;
  provider: WorkspaceProvider;
  userId: string;
  scheduledAt: string;
  triggeredBy: WorkspaceSyncTriggeredBy;
  runKey: string;
};

export type ConnectorSyncEligibility = {
  connectorId: string;
  provider: WorkspaceProvider;
  userId: string;
  cadenceSeconds: number;
  lastSyncAt: Date | null;
  lastTickAt: Date | null;
  nextRunAt: Date;
  isEligible: boolean;
};

export type PauseRequest = {
  connectorId: string;
  actorUserId: string;
  reason: string | null;
};

// Repository projection shapes — extracted to avoid string-literal-union lint.
export type ScheduleCandidateFields =
  | 'id'
  | 'userId'
  | 'provider'
  | 'status'
  | 'syncIntervalSeconds'
  | 'lastSyncAt'
  | 'lastTickAt';

export type StaleCandidateFields =
  | 'id'
  | 'userId'
  | 'provider'
  | 'status'
  | 'lastSyncAt'
  | 'syncIntervalSeconds';
