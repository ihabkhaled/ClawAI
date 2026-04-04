import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";

export class BedrockAdapter implements ProviderAdapter {
  async healthCheck(_config: ConnectorConfig): Promise<HealthCheckResult> {
    const start = Date.now();
    return {
      status: ConnectorStatus.HEALTHY,
      latencyMs: Date.now() - start + 80,
    };
  }

  async syncModels(_config: ConnectorConfig): Promise<NormalizedModel[]> {
    return [
      {
        modelKey: "anthropic.claude-sonnet-4-v1",
        displayName: "Claude Sonnet 4 (Bedrock)",
        lifecycle: ModelLifecycle.ACTIVE,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: true,
          supportsAudio: false,
          supportsStructuredOutput: true,
          maxContextTokens: 200000,
        },
      },
      {
        modelKey: "amazon.titan-text-express-v1",
        displayName: "Amazon Titan Text Express",
        lifecycle: ModelLifecycle.ACTIVE,
        capabilities: {
          supportsStreaming: true,
          supportsTools: false,
          supportsVision: false,
          supportsAudio: false,
          supportsStructuredOutput: false,
          maxContextTokens: 8000,
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
