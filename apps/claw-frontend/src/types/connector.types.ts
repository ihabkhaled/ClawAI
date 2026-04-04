import type { ConnectorProvider, ConnectorStatus } from "@/enums";

export type Connector = {
  id: string;
  name: string;
  provider: ConnectorProvider;
  status: ConnectorStatus;
  authType: string;
  isEnabled: boolean;
  defaultModelId: string | null;
  baseUrl: string | null;
  region: string | null;
  maskedApiKey: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { models: number };
};

export type ConnectorModel = {
  id: string;
  connectorId: string;
  provider: ConnectorProvider;
  modelKey: string;
  displayName: string;
  lifecycle: string;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  maxContextTokens: number | null;
  syncedAt: string;
};

export type CreateConnectorRequest = {
  name: string;
  provider: ConnectorProvider;
  authType: string;
  apiKey?: string;
  baseUrl?: string;
  region?: string;
};

export type UpdateConnectorRequest = Partial<CreateConnectorRequest> & {
  isEnabled?: boolean;
  defaultModelId?: string | null;
};

export type ConnectorsListResponse = {
  data: Connector[];
  total: number;
  page: number;
  totalPages: number;
};

export type HealthCheckResponse = {
  status: string;
  latencyMs: number;
  errorMessage?: string;
};

export type SyncModelsResponse = {
  modelsFound: number;
  modelsAdded: number;
  modelsRemoved: number;
};

export type ConnectorModelsResponse = {
  data: ConnectorModel[];
};
