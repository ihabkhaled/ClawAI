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
  healthCheckEndpoint: string | null;
  authType: ConnectorAuthType | null;
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
  supportsNativeTools: boolean;
  supportsVision: boolean;
  defaultIsPayAsYouGo: boolean;
  hasFreeTier: boolean;
};
