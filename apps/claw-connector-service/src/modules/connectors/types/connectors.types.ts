import {
  type Connector,
  type ConnectorProvider,
  type ConnectorAuthType,
  type ConnectorStatus,
  type ModelLifecycle,
} from "../../../generated/prisma";

export interface CreateConnectorData {
  name: string;
  provider: ConnectorProvider;
  authType: ConnectorAuthType;
  encryptedConfig?: string;
  baseUrl?: string;
  region?: string;
}

export interface UpdateConnectorData {
  name?: string;
  provider?: ConnectorProvider;
  authType?: ConnectorAuthType;
  encryptedConfig?: string;
  baseUrl?: string;
  region?: string;
  isEnabled?: boolean;
  status?: ConnectorStatus;
  defaultModelId?: string;
}

export interface ConnectorFilters {
  provider?: ConnectorProvider;
  status?: ConnectorStatus;
  isEnabled?: boolean;
  search?: string;
}

export interface ConnectorWithModels extends Connector {
  _count: { models: number };
}

export interface SyncModelsResult {
  modelsFound: number;
  modelsAdded: number;
  modelsRemoved: number;
}

export interface HealthCheckResult {
  status: ConnectorStatus;
  latencyMs: number;
  errorMessage?: string;
}

export interface NormalizedModel {
  modelKey: string;
  displayName: string;
  lifecycle: ModelLifecycle;
  capabilities: ModelCapabilities;
}

export interface ModelCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsStructuredOutput: boolean;
  maxContextTokens?: number;
}
