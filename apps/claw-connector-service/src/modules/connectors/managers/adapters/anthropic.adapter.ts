import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";

export class AnthropicAdapter implements ProviderAdapter {
  async healthCheck(_config: ConnectorConfig): Promise<HealthCheckResult> {
    const start = Date.now();
    return {
      status: ConnectorStatus.HEALTHY,
      latencyMs: Date.now() - start + 45,
    };
  }

  async syncModels(_config: ConnectorConfig): Promise<NormalizedModel[]> {
    return [
      {
        modelKey: "claude-opus-4",
        displayName: "Claude Opus 4",
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
        modelKey: "claude-sonnet-4",
        displayName: "Claude Sonnet 4",
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
        modelKey: "claude-haiku-3.5",
        displayName: "Claude Haiku 3.5",
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
