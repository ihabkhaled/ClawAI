import type { ModelBehaviorProbeResult } from '@claw/shared-types';
import { type HealthCheckResult, type NormalizedModel } from '../types/connectors.types';

export interface ProviderAdapter {
  healthCheck(config: ConnectorConfig): Promise<HealthCheckResult>;
  syncModels(config: ConnectorConfig): Promise<NormalizedModel[]>;
  getCapabilities(): ProviderCapabilities;
  // Optional: not every provider exposes a surface a behavioural probe can
  // exercise. Callers must check rather than assume, so an unprobed provider
  // reports FAILED instead of silently looking proven.
  probeToolCapability?(
    config: ConnectorConfig,
    modelKey: string,
  ): Promise<ModelBehaviorProbeResult>;
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
