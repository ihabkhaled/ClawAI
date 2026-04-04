import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";

export class DeepSeekAdapter implements ProviderAdapter {
  async healthCheck(_config: ConnectorConfig): Promise<HealthCheckResult> {
    const start = Date.now();
    return {
      status: ConnectorStatus.HEALTHY,
      latencyMs: Date.now() - start + 70,
    };
  }

  async syncModels(_config: ConnectorConfig): Promise<NormalizedModel[]> {
    return [
      {
        modelKey: "deepseek-chat",
        displayName: "DeepSeek Chat",
        lifecycle: ModelLifecycle.ACTIVE,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: false,
          supportsAudio: false,
          supportsStructuredOutput: true,
          maxContextTokens: 64000,
        },
      },
      {
        modelKey: "deepseek-reasoner",
        displayName: "DeepSeek Reasoner",
        lifecycle: ModelLifecycle.ACTIVE,
        capabilities: {
          supportsStreaming: true,
          supportsTools: false,
          supportsVision: false,
          supportsAudio: false,
          supportsStructuredOutput: false,
          maxContextTokens: 64000,
        },
      },
    ];
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: false,
    };
  }
}
