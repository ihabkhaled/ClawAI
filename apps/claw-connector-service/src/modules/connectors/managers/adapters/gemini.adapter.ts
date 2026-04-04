import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";

export class GeminiAdapter implements ProviderAdapter {
  async healthCheck(_config: ConnectorConfig): Promise<HealthCheckResult> {
    const start = Date.now();
    return {
      status: ConnectorStatus.HEALTHY,
      latencyMs: Date.now() - start + 60,
    };
  }

  async syncModels(_config: ConnectorConfig): Promise<NormalizedModel[]> {
    return [
      {
        modelKey: "gemini-2.5-pro",
        displayName: "Gemini 2.5 Pro",
        lifecycle: ModelLifecycle.ACTIVE,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: true,
          supportsAudio: true,
          supportsStructuredOutput: true,
          maxContextTokens: 1000000,
        },
      },
      {
        modelKey: "gemini-2.5-flash",
        displayName: "Gemini 2.5 Flash",
        lifecycle: ModelLifecycle.ACTIVE,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: true,
          supportsAudio: true,
          supportsStructuredOutput: true,
          maxContextTokens: 1000000,
        },
      },
    ];
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
    };
  }
}
