import type { ConnectorAuthType, ConnectorProvider, ConnectorStatus } from '@/enums';

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
  meta: { total: number; page: number; limit: number; totalPages: number };
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

export type ConnectorModelsResponse = ConnectorModel[];

export type ConnectorFormFieldErrors = {
  name?: string[];
  provider?: string[];
  authType?: string[];
  apiKey?: string[];
  baseUrl?: string[];
  region?: string[];
};

export type UpdateConnectorParams = {
  id: string;
  data: UpdateConnectorRequest;
};

export type ConnectorFormStateParams = {
  open: boolean;
  connector?: Connector | null;
  onSubmit: (data: CreateConnectorRequest) => void;
  onOpenChange: (open: boolean) => void;
};

export type ConnectorFormStateReturn = {
  name: string;
  setName: (value: string) => void;
  provider: ConnectorProvider | null;
  setProvider: (value: ConnectorProvider) => void;
  authType: ConnectorAuthType;
  setAuthType: (value: ConnectorAuthType) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  baseUrl: string;
  setBaseUrl: (value: string) => void;
  region: string;
  setRegion: (value: string) => void;
  fieldErrors: ConnectorFormFieldErrors;
  isEditing: boolean;
  pendingLabel: string;
  submitLabel: string;
  defaultBaseUrl: string | null;
  handleSubmit: (e: React.FormEvent) => void;
  handleOpenChange: (nextOpen: boolean) => void;
};
