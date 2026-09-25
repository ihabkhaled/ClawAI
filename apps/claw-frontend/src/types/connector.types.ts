import type { ConnectorPreset } from '@claw/shared-types';

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
  workspaceId: string | null;
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
  // Already on the wire: `getAvailableModels` spreads the whole ConnectorModel
  // row, and the column has existed since audio capability landed. It was
  // simply never declared here, so the composer could not gate on it.
  supportsAudio: boolean;
  // Native video understanding (video-capable Gemini). Spread onto the wire
  // by `getAvailableModels` like the two above; optional because a row from a
  // connector-service that predates the column carries no such field.
  supportsVideoInput?: boolean;
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
  workspaceId?: string;
  accountId?: string;
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
  workspaceId?: string[];
  accountId?: string[];
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
  onProviderSelect: (value: ConnectorProvider) => void;
  authType: ConnectorAuthType;
  setAuthType: (value: ConnectorAuthType) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  baseUrl: string;
  setBaseUrl: (value: string) => void;
  region: string;
  setRegion: (value: string) => void;
  workspaceId: string;
  setWorkspaceId: (value: string) => void;
  accountId: string;
  setAccountId: (value: string) => void;
  requiresAccountId: boolean;
  fieldErrors: ConnectorFormFieldErrors;
  isEditing: boolean;
  pendingLabel: string;
  submitLabel: string;
  defaultBaseUrl: string | null;
  selectedPreset: ConnectorPreset | undefined;
  /** The base URL with `{ACCOUNT_ID}` resolved, once the id is valid hex. */
  resolvedBaseUrlPreview: string | null;
  handleSubmit: (e: React.FormEvent) => void;
  handleOpenChange: (nextOpen: boolean) => void;
};

/** One provider row in the searchable connector-provider combobox. */
export type ConnectorProviderComboboxOption = {
  value: ConnectorProvider;
  label: string;
  hasFreeTier: boolean;
};

/** One labeled section of the connector-provider combobox. */
export type ConnectorProviderComboboxGroup = {
  key: string;
  label: string;
  options: ConnectorProviderComboboxOption[];
};

export type ConnectorProviderComboboxState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  groups: ConnectorProviderComboboxGroup[];
};

export type ConnectorProviderComboboxProps = {
  value: ConnectorProvider | null;
  onChange: (value: ConnectorProvider) => void;
  disabled?: boolean;
};

export type ConnectorProviderComboboxItemProps = {
  option: ConnectorProviderComboboxOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
};

/** Props for the preset's register/apiKeys/pricing/docs link row. */
export type ConnectorPresetLinksProps = {
  preset: ConnectorPreset;
};
