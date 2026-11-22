/** Workspace connector, workspace action and agent event payloads (split from event-payloads.type.ts). */
import { type WorkspaceConnectorStatus, type WorkspaceProvider } from '../enums';
import type { BaseEventPayload } from './event-payloads.type';

// ---- Workspace Connector Events ----

export interface WorkspaceConnectorCreatedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  name: string;
  userId: string;
}

export interface WorkspaceConnectorUpdatedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  changes: Record<string, unknown>;
  userId: string;
}

export interface WorkspaceConnectorDeletedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  userId: string;
}

export interface WorkspaceConnectorSyncedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  objectsDiscovered: number;
  objectsSynced: number;
  userId: string;
}

export interface WorkspaceConnectorHealthCheckedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  status: WorkspaceConnectorStatus;
  latencyMs?: number;
}

export interface WorkspaceObjectSyncedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  userId: string;
  objectCount: number;
  deltaUsed: boolean;
}

// ---- Workspace Sync Lifecycle Events (Stream 01 Phase 5) ----

export type WorkspaceSyncTriggeredBy = 'cron' | 'manual' | 'priority' | 'dlq_retry';
export type WorkspaceSyncErrorClass =
  | 'RateLimitedException'
  | 'OAuthExpiredException'
  | 'ProviderUnavailableException'
  | 'AdapterException'
  | 'UnknownException';
export type WorkspaceSyncPauseReason =
  'user_requested' | 'quiet_hours' | 'budget_exceeded' | 'circuit_open' | 'deploy_freeze';

export interface WorkspaceSyncRunStartedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  userId: string;
  runId: string;
  isDelta: boolean;
  isDryRun: boolean;
  cursorIn: string | null;
  triggeredBy: WorkspaceSyncTriggeredBy;
  actorUserId: string | null;
}

export interface WorkspaceSyncRunCompletedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  userId: string;
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  cursorIn: string | null;
  cursorOut: string | null;
  objectsFound: number;
  objectsSynced: number;
  objectsFailed: number;
  retryCount: number;
  triggeredBy: WorkspaceSyncTriggeredBy;
}

export interface WorkspaceSyncRunFailedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  userId: string;
  runId: string;
  startedAt: string;
  failedAt: string;
  durationMs: number;
  retryCount: number;
  terminal: boolean;
  errorClass: WorkspaceSyncErrorClass;
  errorMessage: string;
  dlqPublished: boolean;
  triggeredBy: WorkspaceSyncTriggeredBy;
}

export interface WorkspaceSyncStaleDetectedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  userId: string;
  lastSyncAt: string | null;
  cadenceSeconds: number;
  overdueSeconds: number;
  staleMultiplier: number;
}

export interface WorkspaceSyncManualTriggeredPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  actorUserId: string;
  priority: boolean;
  dryRun: boolean;
  reusedInFlight: boolean;
  reusedRunId: string | null;
}

export interface WorkspaceSyncPausedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  actorUserId: string;
  reason: WorkspaceSyncPauseReason;
}

export interface WorkspaceSyncResumedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  actorUserId: string;
}

export interface WorkspaceSyncRateLimitedPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  retryAfterMs: number;
  strikes: number;
  endpointHint: string | null;
}

export interface WorkspaceSyncDlqSentPayload extends BaseEventPayload {
  connectorId: string;
  provider: WorkspaceProvider;
  runId: string;
  queue: string;
  errorClass: WorkspaceSyncErrorClass;
  attemptsConsumed: number;
}

// ---- Workspace Action Events ----

export interface WorkspaceActionDraftedPayload extends BaseEventPayload {
  actionId: string;
  userId: string;
  connectorId: string;
  provider: WorkspaceProvider;
  actionType: string;
}

export interface WorkspaceActionApprovedPayload extends BaseEventPayload {
  actionId: string;
  userId: string;
  reviewedBy: string;
}

export interface WorkspaceActionRejectedPayload extends BaseEventPayload {
  actionId: string;
  userId: string;
  reviewedBy: string;
  reason?: string;
}

export interface WorkspaceActionExecutedPayload extends BaseEventPayload {
  actionId: string;
  userId: string;
  provider: WorkspaceProvider;
  actionType: string;
  externalUrl?: string;
}

export interface WorkspaceActionFailedPayload extends BaseEventPayload {
  actionId: string;
  userId: string;
  provider: WorkspaceProvider;
  actionType: string;
  errorMessage: string;
}

export interface WorkspaceActionEditedPayload extends BaseEventPayload {
  actionId: string;
  userId: string;
  actorUserId: string;
  connectorId: string;
  provider: WorkspaceProvider;
  actionType: string;
  previousVersion: number;
  newVersion: number;
}

export interface WorkspaceActionBulkApprovedPayload extends BaseEventPayload {
  bulkGroupId: string;
  actionIds: string[];
  actorUserId: string;
  total: number;
}

export interface WorkspaceActionStaleBlockedPayload extends BaseEventPayload {
  actionId: string;
  userId: string;
  connectorId: string;
  provider: WorkspaceProvider;
  connectorStatus: string;
  reason: string;
}

// ---- Agent Device / Auth Events ----

export interface AgentDevicePairedPayload extends BaseEventPayload {
  deviceId: string;
  userId: string;
  scopes: string[];
  hostname: string;
  os: string;
  platform: string;
  agentVersion: string;
}

export interface AgentDeviceRevokedPayload extends BaseEventPayload {
  deviceId: string;
  userId: string;
  reason: string;
  revokedByUserId?: string;
}

export interface AgentTokenRotatedPayload extends BaseEventPayload {
  deviceId: string;
  userId: string;
  oldJti: string;
  newJti: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AgentTokenReuseDetectedPayload extends BaseEventPayload {
  deviceId: string;
  userId: string;
  presentedJti: string;
  usedAtOriginal?: string;
  ipAddress?: string;
}

export interface AgentPolicyViolatedPayload extends BaseEventPayload {
  commandId: string;
  sessionId: string;
  userId: string;
  matchedPolicyId?: string;
  matchedPolicyName?: string;
  riskScore: number;
  riskLabel: string;
}

export interface AgentCommandCancelledPayload extends BaseEventPayload {
  commandId: string;
  sessionId: string;
  userId: string;
  reason: string;
  requestedByUserId?: string;
}

export interface AgentCommandStreamedPayload extends BaseEventPayload {
  commandId: string;
  sessionId: string;
  userId: string;
  bytesStreamed: number;
  finalChunk: boolean;
}
