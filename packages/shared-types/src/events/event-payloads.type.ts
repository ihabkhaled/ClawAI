import {
  type AuditAction,
  type AuditSeverity,
  type ConnectorProvider,
  type ConnectorStatus,
  type FileIngestionStatus,
  type LogLevel,
  type MemoryType,
  type RoutingMode,
  type UserRole,
  type WorkspaceConnectorStatus,
  type WorkspaceProvider,
} from '../enums';

// ---- Base ----

export interface BaseEventPayload {
  timestamp: string;
  correlationId?: string;
}

// ---- User Events ----

export interface UserCreatedPayload extends BaseEventPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface UserLoginPayload extends BaseEventPayload {
  userId: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserLogoutPayload extends BaseEventPayload {
  userId: string;
}

export interface UserRoleChangedPayload extends BaseEventPayload {
  userId: string;
  previousRole: UserRole;
  newRole: UserRole;
  changedBy: string;
}

export interface UserDeactivatedPayload extends BaseEventPayload {
  userId: string;
  deactivatedBy: string;
}

// ---- Message Events ----

export interface MessageCreatedPayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  userId: string;
  content: string;
  routingMode?: RoutingMode;
  forcedProvider?: string;
  forcedModel?: string;
}

export interface MessageRoutedPayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  selectedProvider: string;
  selectedModel: string;
  routingMode: RoutingMode;
  fallbackProvider?: string;
  fallbackModel?: string;
}

export interface MessageCompletedPayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  assistantMessageId: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  estimatedCost?: number;
  executionSuccess?: boolean;
  finalStatus?: string;
  errorMessage?: string;
  usedFallback?: boolean;
  routingMode?: RoutingMode;
  routerModel?: string | null;
  detectedCategory?: string;
  reRouted?: boolean;
  originalProvider?: string;
  originalModel?: string;
  judgeDecision?: string;
  judgeConfidence?: number;
  criticScore?: number;
  executionPath?: string;
  targetLatencyMs?: number;
}

export interface MessageFeedbackSetPayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  feedback: 'positive' | 'negative' | null;
  routingMessageId?: string;
  provider?: string;
  model?: string;
  routingMode?: RoutingMode;
  routerModel?: string | null;
  judgeDecision?: string;
  judgeConfidence?: number;
  detectedCategory?: string;
}

// ---- Connector Events ----

export interface ConnectorCreatedPayload extends BaseEventPayload {
  connectorId: string;
  provider: ConnectorProvider;
  name: string;
  userId: string;
}

export interface ConnectorUpdatedPayload extends BaseEventPayload {
  connectorId: string;
  provider: ConnectorProvider;
  changes: Record<string, unknown>;
}

export interface ConnectorDeletedPayload extends BaseEventPayload {
  connectorId: string;
  provider: ConnectorProvider;
}

export interface ConnectorSyncedPayload extends BaseEventPayload {
  connectorId: string;
  provider: ConnectorProvider;
  modelsDiscovered: number;
}

export interface ConnectorHealthCheckedPayload extends BaseEventPayload {
  connectorId: string;
  provider: ConnectorProvider;
  status: ConnectorStatus;
  latencyMs?: number;
}

// ---- Routing Events ----

export interface RoutingDecisionMadePayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  routingMode: RoutingMode;
  selectedConnectorId: string;
  selectedModelId: string;
  reason: string;
  candidateCount: number;
}

// ---- File Events ----

export interface FileUploadedPayload extends BaseEventPayload {
  fileId: string;
  threadId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface FileChunkedPayload extends BaseEventPayload {
  fileId: string;
  chunkCount: number;
  status: FileIngestionStatus;
}

// ---- Memory Events ----

export interface MemoryExtractedPayload extends BaseEventPayload {
  memoryId: string;
  threadId: string;
  userId: string;
  type: MemoryType;
  content: string;
}

// ---- Audit Events ----

export interface AuditEventPayload extends BaseEventPayload {
  userId: string;
  action: AuditAction;
  severity: AuditSeverity;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

// ---- Health Events ----

export interface HealthCheckPayload extends BaseEventPayload {
  serviceName: string;
  status: string;
  details?: Record<string, unknown>;
}

// ---- Server Log Events ----

export interface ServerLogPayload extends BaseEventPayload {
  level: LogLevel;
  message: string;
  serviceName: string;
  module?: string;
  controller?: string;
  service?: string;
  manager?: string;
  repository?: string;
  action?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  traceId?: string;
  userId?: string;
  threadId?: string;
  messageId?: string;
  connectorId?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  metadata?: Record<string, unknown>;
}

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
  | 'user_requested'
  | 'quiet_hours'
  | 'budget_exceeded'
  | 'circuit_open'
  | 'deploy_freeze';

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

// ---- Union type for all payloads ----

export type EventPayload =
  | UserCreatedPayload
  | UserLoginPayload
  | UserLogoutPayload
  | UserRoleChangedPayload
  | UserDeactivatedPayload
  | MessageCreatedPayload
  | MessageRoutedPayload
  | MessageCompletedPayload
  | MessageFeedbackSetPayload
  | ConnectorCreatedPayload
  | ConnectorUpdatedPayload
  | ConnectorDeletedPayload
  | ConnectorSyncedPayload
  | ConnectorHealthCheckedPayload
  | RoutingDecisionMadePayload
  | FileUploadedPayload
  | FileChunkedPayload
  | MemoryExtractedPayload
  | AuditEventPayload
  | HealthCheckPayload
  | ServerLogPayload
  | WorkspaceConnectorCreatedPayload
  | WorkspaceConnectorUpdatedPayload
  | WorkspaceConnectorDeletedPayload
  | WorkspaceConnectorSyncedPayload
  | WorkspaceConnectorHealthCheckedPayload
  | WorkspaceObjectSyncedPayload
  | WorkspaceSyncRunStartedPayload
  | WorkspaceSyncRunCompletedPayload
  | WorkspaceSyncRunFailedPayload
  | WorkspaceSyncStaleDetectedPayload
  | WorkspaceSyncManualTriggeredPayload
  | WorkspaceSyncPausedPayload
  | WorkspaceSyncResumedPayload
  | WorkspaceSyncRateLimitedPayload
  | WorkspaceSyncDlqSentPayload
  | WorkspaceActionDraftedPayload
  | WorkspaceActionApprovedPayload
  | WorkspaceActionRejectedPayload
  | WorkspaceActionExecutedPayload
  | WorkspaceActionFailedPayload
  | AgentDevicePairedPayload
  | AgentDeviceRevokedPayload
  | AgentTokenRotatedPayload
  | AgentTokenReuseDetectedPayload
  | AgentPolicyViolatedPayload
  | AgentCommandCancelledPayload
  | AgentCommandStreamedPayload;
