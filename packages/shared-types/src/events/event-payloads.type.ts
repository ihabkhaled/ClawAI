import {
  type AuditAction,
  type AuditSeverity,
  type ConnectorProvider,
  type ConnectorStatus,
  type ContextPackScope,
  type FileIngestionStatus,
  type LogLevel,
  type MemoryAuditAction,
  type MemoryScope,
  type MemorySensitivity,
  type MemorySuggestionStatus,
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

export interface UserTemporaryPasswordIssuedPayload extends BaseEventPayload {
  userId: string;
  issuedBy: string;
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
  // Usage-attribution fields (optional, additive — populated by chat-service so the
  // audit usage ledger can attribute model-call usage to the real user and tag it
  // by call context instead of hardcoding userId:'system'/context:'chat').
  userId?: string;
  tokenContext?: string;
  tokenEstimated?: boolean;
  tokenSource?: string;
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

export type FileFailureStage = 'EXTRACTION' | 'CHUNKING' | 'UPLOAD' | 'OTHER';

export interface FileFailedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  errorMessage: string;
  failureStage: FileFailureStage;
}

export interface FileRetentionExpiredPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  retentionExpiresAt: string;
  sizeBytes: number;
}

export interface FileArchiveExpandedPayload extends BaseEventPayload {
  parentFileId: string;
  userId: string;
  parentFilename: string;
  childFileCount: number;
  totalExtractedBytes: number;
}

// ---- Slice D — File lifecycle + OCR events ----

export type FileExtractionFailureStage = 'PARSE' | 'CHUNK' | 'OCR';
export type FileDownloadMethod = 'BROWSER' | 'INTERNAL_API';
export type FileDeletionReason = 'USER' | 'RETENTION' | 'ADMIN';
export type FileOcrFailureStage = 'WORKER_INIT' | 'PROCESSING' | 'TIMEOUT';

export interface FileUploadStartedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Emitted when the upload + ingestion pipeline finishes successfully. Shape
 * mirrors the legacy {@link FileUploadedPayload} so existing consumers can be
 * migrated without code changes; once the deprecated FILE_UPLOADED pattern is
 * retired this type may diverge.
 */
export type FileUploadCompletedPayload = FileUploadedPayload;

export interface FileExtractionFailedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  errorMessage: string;
  failureStage: FileExtractionFailureStage;
}

export interface FileDownloadedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  downloadedBy: string;
  downloadMethod: FileDownloadMethod;
}

export interface FileDeletedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  deletedBy: string;
  reason: FileDeletionReason;
}

export interface FileOcrStartedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  mimeType: string;
  isImageFile: boolean;
  isScannedPdf: boolean;
}

export interface FileOcrCompletedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  extractedTextLength: number;
  confidence: number;
  durationMs: number;
}

export interface FileOcrFailedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  errorMessage: string;
  failureStage: FileOcrFailureStage;
}

// ---- Memory Events ----

export interface MemoryExtractedPayload extends BaseEventPayload {
  memoryId: string;
  threadId: string;
  userId: string;
  type: MemoryType;
  content: string;
}

export interface MemorySuggestedPayload extends BaseEventPayload {
  suggestionId: string;
  userId: string;
  type: MemoryType;
  confidence: number;
  sensitivity: MemorySensitivity;
  sourceThreadId: string | null;
  sourceMessageId: string | null;
}

export interface MemoryApprovedPayload extends BaseEventPayload {
  memoryId: string;
  suggestionId: string | null;
  userId: string;
  automated: boolean;
}

export interface MemoryRejectedPayload extends BaseEventPayload {
  suggestionId: string;
  userId: string;
  reason: string | null;
  suppressSimilar: boolean;
}

export interface MemoryUsedPayload extends BaseEventPayload {
  memoryId: string;
  userId: string;
  threadId: string;
  messageId: string;
  score: number;
}

export interface MemoryForgottenPayload extends BaseEventPayload {
  memoryId: string;
  userId: string;
  reason: string | null;
}

export interface MemoryPausedPayload extends BaseEventPayload {
  memoryId: string | null;
  userId: string;
  scope: MemoryScope;
  pausedUntil: string | null;
}

export interface MemoryRedactedPayload extends BaseEventPayload {
  memoryId: string;
  userId: string;
  reason: string;
}

// ---- Context Pack Events ----

export interface ContextPackCreatedPayload extends BaseEventPayload {
  contextPackId: string;
  userId: string;
  scope: ContextPackScope;
  visibility: string;
}

export interface ContextPackUpdatedPayload extends BaseEventPayload {
  contextPackId: string;
  userId: string;
  version: number;
}

export interface ContextPackDeletedPayload extends BaseEventPayload {
  contextPackId: string;
  userId: string;
}

export interface ContextPackAttachedPayload extends BaseEventPayload {
  contextPackId: string;
  userId: string;
  scope: ContextPackScope;
  scopeRef: string;
}

export interface ContextPackDetachedPayload extends BaseEventPayload {
  contextPackId: string;
  userId: string;
  scope: ContextPackScope;
  scopeRef: string;
}

export interface ContextPackUsedPayload extends BaseEventPayload {
  contextPackId: string;
  userId: string;
  threadId: string;
  messageId: string;
  itemIdsUsed: string[];
  score: number | null;
}

export interface ContextPackVersionCreatedPayload extends BaseEventPayload {
  contextPackId: string;
  userId: string;
  version: number;
  summary: string | null;
}

export interface ContextPackVersionRevertedPayload extends BaseEventPayload {
  contextPackId: string;
  userId: string;
  fromVersion: number;
  toVersion: number;
}

export interface ContextPackSharedPayload extends BaseEventPayload {
  contextPackId: string;
  userId: string;
  visibility: string;
}

// ---- Memory + Context Integration V2 Events ----

export interface ContextReceiptWrittenPayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  userId: string;
  memoryCount: number;
  packItemCount: number;
  tokenBudgetUsed: number;
}

export interface ChatThreadMemoryToggledPayload extends BaseEventPayload {
  threadId: string;
  userId: string;
  useMemory: boolean;
}

export interface ChatThreadContextToggledPayload extends BaseEventPayload {
  threadId: string;
  userId: string;
  useContext: boolean;
}

// Re-export to keep MemoryAuditAction reachable from the same module entry.
export type MemoryAuditActionTag = MemoryAuditAction;
export type MemorySuggestionStatusTag = MemorySuggestionStatus;

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

// ---- Union type for all payloads ----

export type EventPayload =
  | UserCreatedPayload
  | UserLoginPayload
  | UserLogoutPayload
  | UserRoleChangedPayload
  | UserDeactivatedPayload
  | UserTemporaryPasswordIssuedPayload
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
  | FileFailedPayload
  | FileRetentionExpiredPayload
  | FileArchiveExpandedPayload
  | FileUploadStartedPayload
  | FileUploadCompletedPayload
  | FileExtractionFailedPayload
  | FileDownloadedPayload
  | FileDeletedPayload
  | FileOcrStartedPayload
  | FileOcrCompletedPayload
  | FileOcrFailedPayload
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
  | WorkspaceActionEditedPayload
  | WorkspaceActionBulkApprovedPayload
  | WorkspaceActionStaleBlockedPayload
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
  | AgentCommandStreamedPayload
  | MemorySuggestedPayload
  | MemoryApprovedPayload
  | MemoryRejectedPayload
  | MemoryUsedPayload
  | MemoryForgottenPayload
  | MemoryPausedPayload
  | MemoryRedactedPayload
  | ContextPackCreatedPayload
  | ContextPackUpdatedPayload
  | ContextPackDeletedPayload
  | ContextPackAttachedPayload
  | ContextPackDetachedPayload
  | ContextPackUsedPayload
  | ContextPackVersionCreatedPayload
  | ContextPackVersionRevertedPayload
  | ContextPackSharedPayload
  | ContextReceiptWrittenPayload
  | ChatThreadMemoryToggledPayload
  | ChatThreadContextToggledPayload;
