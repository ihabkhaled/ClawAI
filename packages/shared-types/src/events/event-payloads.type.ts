import { type UserRole } from "../enums";
import { type AuditAction } from "../enums";
import { type AuditSeverity } from "../enums";
import { type ConnectorProvider } from "../enums";
import { type ConnectorStatus } from "../enums";
import { type RoutingMode } from "../enums";
import { type FileIngestionStatus } from "../enums";
import { type MemoryType } from "../enums";
import { type LogLevel } from "../enums";

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
  | ServerLogPayload;
