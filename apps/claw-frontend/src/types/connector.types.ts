import type { ConnectorPreset } from '@claw/shared-types';

import type { ConnectorAuthType, ConnectorProvider, ConnectorStatus } from '@/enums';

import type { ProviderDefinition } from './provider-definition.types';


export type Connector = {
  id: string;
  name: string;
  provider: ConnectorProvider;
  providerDisplayName?: string;
  status: ConnectorStatus;
  authType: string;
  isEnabled: boolean;
  defaultModelId: string | null;
  baseUrl: string | null;
  region: string | null;
  workspaceId: string | null;
  maskedApiKey: string | null;
  /** Credit connector: usage is paid from the user's credit (`isPayAsYouGo` on the wire). */
  isPayAsYouGo?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { models: number };
};

export type ConnectorModel = {
  id: string;
  connectorId: string;
  provider: string;
  providerDisplayName?: string;
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
  providerDefinitionId?: string;
  authType: string;
  apiKey?: string;
  baseUrl?: string;
  region?: string;
  workspaceId?: string;
  accountId?: string;
  /** Credit connector flag; the admin's answer wins over the provider default. */
  isPayAsYouGo?: boolean;
  /**
   * LLM-gateway headers (F092). Write-only: omitted keeps what is stored, `{}`
   * clears it, a non-empty record replaces it.
   */
  gatewayHeaders?: Record<string, string>;
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
  gatewayHeaders?: string[];
  isPayAsYouGo?: string[];
};

/** One editable row in the connector gateway-headers editor (F092). */
export type GatewayHeaderRow = {
  id: string;
  name: string;
  value: string;
};

/** The editor rows converted to a request field, or refused as invalid. */
export type GatewayHeaderRowsResult = { ok: true; headers: Record<string, string> } | { ok: false };

/** State and actions the gateway-headers editor renders from. */
export type ConnectorGatewayHeadersState = {
  rows: GatewayHeaderRow[];
  addRow: () => void;
  updateRow: (id: string, patch: Partial<Omit<GatewayHeaderRow, 'id'>>) => void;
  removeRow: (id: string) => void;
  clearStored: boolean;
  setClearStored: (value: boolean) => void;
};

/** The gateway-headers hook: the editor state plus a reset for form reopen. */
export type ConnectorGatewayHeadersHookReturn = ConnectorGatewayHeadersState & {
  reset: () => void;
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
  customDefinition: ProviderDefinition | null;
  onProviderSelect: (value: ConnectorProvider, definition?: ProviderDefinition) => void;
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
  isCreditConnector: boolean;
  setIsCreditConnector: (value: boolean) => void;
  fieldErrors: ConnectorFormFieldErrors;
  isEditing: boolean;
  pendingLabel: string;
  submitLabel: string;
  defaultBaseUrl: string | null;
  selectedPreset: ConnectorPreset | undefined;
  /** The base URL with `{ACCOUNT_ID}` resolved, once the id is valid hex. */
  resolvedBaseUrlPreview: string | null;
  gatewayHeaders: ConnectorGatewayHeadersState;
  handleSubmit: (e: React.FormEvent) => void;
  handleOpenChange: (nextOpen: boolean) => void;
};

/** One provider row in the searchable connector-provider combobox. */
export type ConnectorProviderComboboxOption = {
  /** A ConnectorProvider key, or `custom:<definitionId>` for an admin-defined provider. */
  value: string;
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
  definitions: ProviderDefinition[];
};

export type ConnectorProviderComboboxProps = {
  value: ConnectorProvider | null;
  /** Set when `value` is the custom-provider slot; names which definition. */
  customDefinition?: ProviderDefinition | null;
  onChange: (value: ConnectorProvider, definition?: ProviderDefinition) => void;
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
