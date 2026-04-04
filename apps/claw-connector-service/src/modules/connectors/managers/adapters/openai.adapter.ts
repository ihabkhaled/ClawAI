import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";

export class OpenAIAdapter implements ProviderAdapter {
  async healthCheck(_config: ConnectorConfig): Promise<HealthCheckResult> {
    const start = Date.now();
    return {
      status: ConnectorStatus.HEALTHY,
      latencyMs: Date.now() - start + 50,
    };
  }

  async syncModels(_config: ConnectorConfig): Promise<NormalizedModel[]> {
    return [
      {
        modelKey: "gpt-5.4",
        displayName: "GPT-5.4",
        lifecycle: ModelLifecycle.ACTIVE,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: true,
          supportsAudio: true,
          supportsStructuredOutput: true,
          maxContextTokens: 128000,
        },
      },
      {
        modelKey: "gpt-5.4-mini",
        displayName: "GPT-5.4 Mini",
        lifecycle: ModelLifecycle.ACTIVE,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: true,
          supportsAudio: false,
          supportsStructuredOutput: true,
          maxContextTokens: 128000,
        },
      },
      {
        modelKey: "gpt-5.4-nano",
        displayName: "GPT-5.4 Nano",
        lifecycle: ModelLifecycle.ACTIVE,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: false,
          supportsAudio: false,
          supportsStructuredOutput: true,
          maxContextTokens: 32000,
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
