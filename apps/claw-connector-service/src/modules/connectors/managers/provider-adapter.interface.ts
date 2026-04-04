import { type HealthCheckResult, type NormalizedModel } from "../types/connectors.types";

export interface ProviderAdapter {
  healthCheck(config: ConnectorConfig): Promise<HealthCheckResult>;
  syncModels(config: ConnectorConfig): Promise<NormalizedModel[]>;
  getCapabilities(): ProviderCapabilities;
}

export type ConnectorConfig = {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  region?: string;
};

export type ProviderCapabilities = {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
};
