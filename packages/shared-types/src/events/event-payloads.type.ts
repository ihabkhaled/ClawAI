import {
  type AuditAction,
  type AuditSeverity,
  type ConnectorProvider,
  type ConnectorStatus,
  type ContextPackScope,
  type LogLevel,
  type MemoryAuditAction,
  type MemoryScope,
  type MemorySensitivity,
  type MemorySuggestionStatus,
  type MemoryType,
  type RequiredModality,
  type RoutingMode,
  type UserRole,
} from '../enums';
import type {
  FileArchiveExpandedPayload,
  FileChunkedPayload,
  FileDeletedPayload,
  FileDownloadedPayload,
  FileExtractionFailedPayload,
  FileFailedPayload,
  FileOcrCompletedPayload,
  FileOcrFailedPayload,
  FileOcrStartedPayload,
  FileRetentionExpiredPayload,
  FileTranscribeCompletedPayload,
  FileTranscribeFailedPayload,
  FileTranscribeRequestedPayload,
  FileUploadCompletedPayload,
  FileUploadedPayload,
  FileUploadStartedPayload,
  FileVideoProcessCompletedPayload,
  FileVideoProcessFailedPayload,
  FileVideoProcessRequestedPayload,
  ImageFailedPayload,
} from './file-event-payloads.type';
import type {
  AgentCommandCancelledPayload,
  AgentCommandStreamedPayload,
  AgentDevicePairedPayload,
  AgentDeviceRevokedPayload,
  AgentPolicyViolatedPayload,
  AgentTokenReuseDetectedPayload,
  AgentTokenRotatedPayload,
  WorkspaceActionApprovedPayload,
  WorkspaceActionBulkApprovedPayload,
  WorkspaceActionDraftedPayload,
  WorkspaceActionEditedPayload,
  WorkspaceActionExecutedPayload,
  WorkspaceActionFailedPayload,
  WorkspaceActionRejectedPayload,
  WorkspaceActionStaleBlockedPayload,
  WorkspaceConnectorCreatedPayload,
  WorkspaceConnectorDeletedPayload,
  WorkspaceConnectorHealthCheckedPayload,
  WorkspaceConnectorSyncedPayload,
  WorkspaceConnectorUpdatedPayload,
  WorkspaceObjectSyncedPayload,
  WorkspaceSyncDlqSentPayload,
  WorkspaceSyncManualTriggeredPayload,
  WorkspaceSyncPausedPayload,
  WorkspaceSyncRateLimitedPayload,
  WorkspaceSyncResumedPayload,
  WorkspaceSyncRunCompletedPayload,
  WorkspaceSyncRunFailedPayload,
  WorkspaceSyncRunStartedPayload,
  WorkspaceSyncStaleDetectedPayload,
} from './workspace-agent-event-payloads.type';

export type * from './file-event-payloads.type';
export type * from './workspace-agent-event-payloads.type';

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

export interface UserDeletedPayload extends BaseEventPayload {
  eventId: string;
  userId: string;
  deletedAt: string;
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

export interface UserUpdatedPayload extends BaseEventPayload {
  userId: string;
  updatedBy: string;
}

export interface UserReactivatedPayload extends BaseEventPayload {
  userId: string;
  reactivatedBy: string;
}

/**
 * An administrator cleared a PENDING account's email wall by hand.
 *
 * Distinct from `user.reactivated`, which lifts a suspension: this one also sets
 * `emailVerifiedAt` and burns the outstanding verification token, so it is a
 * different security event with a different meaning in the audit trail.
 */
export interface UserActivatedPayload extends BaseEventPayload {
  userId: string;
  activatedBy: string;
  /** The status the row held before the administrator acted. */
  previousStatus: string;
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
  /**
   * Multimodal batch 8 — the attachments' real mime types (at most 10), so
   * AUTO can rank models by what they can read. Absent or empty = no
   * attachments, and routing behaves exactly as before.
   */
  attachmentMimeTypes?: string[];
  /** The non-text inputs those attachments need (derived from the mime types). */
  requiredModalities?: RequiredModality[];
  /**
   * The subset chat-service can turn into text for a model that cannot read
   * it directly (audio → transcript, video → frames + transcript, image →
   * helper vision when the plan includes it). A text-only model stays
   * eligible in AUTO only for these.
   */
  transformableModalities?: RequiredModality[];
}

/** Why a model the user named in the prompt ("use grok") could not answer it. */
export type NamedModelNoticeReason =
  'NOT_CONFIGURED' | 'NOT_IN_PLAN' | 'CONNECTOR_DOWN' | 'NO_FITTING_MODEL';

/** A named model that could not be used; the answer tells the user so, never silently falls back. */
export interface NamedModelNoticePayload {
  /** What the user wrote, e.g. "grok". */
  phrase: string;
  provider: string;
  reason: NamedModelNoticeReason;
}

/**
 * What the user asked this turn to PRODUCE, decided by a model that reads the
 * message in any language (ADR-218). Research and planning are TEXT turns: the
 * research gate decides web use on its own.
 */
export type TurnIntentKind =
  'TEXT' | 'IMAGE_GENERATE' | 'IMAGE_EDIT' | 'VIDEO' | 'AUDIO_SPEECH' | 'AUDIO_MUSIC' | 'FILE';

/** MODEL = the intent classifier answered; HEURISTIC = it was unavailable and keywords decided. */
export type TurnIntentSource = 'MODEL' | 'HEURISTIC';

export interface TurnIntentPayload {
  kind: TurnIntentKind;
  /** Requested file format for FILE ("pdf", "docx", "txt"…), when the user named one. */
  fileFormat?: string;
  confidence: number;
  source: TurnIntentSource;
  /**
   * Set when the user picked a generation-only model (image/video/file) but the
   * turn is TEXT: the turn was answered by a chat model instead, and the UI says so.
   */
  pickOverridden?: { provider: string; model: string };
}

export interface MessageRoutedPayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  selectedProvider: string;
  selectedModel: string;
  routingMode: RoutingMode;
  fallbackProvider?: string;
  fallbackModel?: string;
  /**
   * Set when the user named a model in the prompt ("use nano banana to …") and
   * it was honoured: the request with the directive words removed, which is
   * what the target model receives. Absent otherwise.
   */
  namedModelPrompt?: string;
  /** Set when the user named a model that could not be used (see the reason). */
  namedModelNotice?: NamedModelNoticePayload;
  /** The semantic intent of this turn (ADR-218). Absent = an older publisher: keep legacy behaviour. */
  turnIntent?: TurnIntentPayload;
}

export interface MessageCompletedPayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  /**
   * The thread's "use memory" switch at completion time. `false` means the
   * user turned memory off for this chat, so memory-service must not LEARN
   * from it either (SEC-006). Absent = an older publisher = treated as true.
   */
  useMemory?: boolean;
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

// ---- Union type for all payloads ----

export type EventPayload =
  | UserCreatedPayload
  | UserLoginPayload
  | UserLogoutPayload
  | UserRoleChangedPayload
  | UserDeactivatedPayload
  | UserUpdatedPayload
  | UserReactivatedPayload
  | UserActivatedPayload
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
  | FileTranscribeRequestedPayload
  | FileTranscribeCompletedPayload
  | FileTranscribeFailedPayload
  | FileVideoProcessRequestedPayload
  | FileVideoProcessCompletedPayload
  | FileVideoProcessFailedPayload
  | ImageFailedPayload
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
