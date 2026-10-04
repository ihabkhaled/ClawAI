import type {
  ConnectorAuthType,
  ProviderAdapterFamily,
  ProviderModelsResponseFormat,
} from '@/enums';

export type ProviderDefinition = {
  id: string;
  key: string;
  displayName: string;
  description: string | null;
  defaultBaseUrl: string | null;
  modelsEndpoint: string | null;
  modelsResponseFormat: ProviderModelsResponseFormat | null;
  healthCheckEndpoint: string | null;
  authType: ConnectorAuthType | null;
  authHeaderName: string;
  authHeaderScheme: string;
  adapterFamily: ProviderAdapterFamily;
  supportsNativeTools: boolean;
  supportsVision: boolean;
  defaultIsPayAsYouGo: boolean;
  hasFreeTier: boolean;
  isActive: boolean;
  isBuiltIn: boolean;
  everConnected: boolean;
  connectorCount: number;
  modelCount: number;
};

export type CreateProviderDefinition = {
  key: string;
  displayName: string;
  description?: string;
  adapterFamily: ProviderAdapterFamily;
  defaultBaseUrl: string;
  modelsEndpoint: string;
  modelsResponseFormat: ProviderModelsResponseFormat;
  healthCheckEndpoint?: string;
  authType: ConnectorAuthType;
  authHeaderName: string;
  authHeaderScheme: string;
  supportsNativeTools: boolean;
  supportsVision: boolean;
  defaultIsPayAsYouGo: boolean;
  hasFreeTier: boolean;
};

export type ProviderFieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  pattern?: string;
  defaultValue?: string | null;
};

export type ProviderToggleProps = { name: string; label: string; checked?: boolean };

export type ProviderDefinitionFormProps = {
  editing: ProviderDefinition | null;
  busy: boolean;
  onSubmit: (data: CreateProviderDefinition) => void;
  onCancel: () => void;
};
