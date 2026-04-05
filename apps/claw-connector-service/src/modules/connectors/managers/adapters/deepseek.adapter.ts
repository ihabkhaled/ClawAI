import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import { type OpenAIModelsResponse } from "../../types/provider-api.types";
import { httpGet } from "../../../../common/utilities/http.utility";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";

const DEFAULT_BASE_URL = "https://api.deepseek.com/v1";

function formatDisplayName(modelId: string): string {
  return modelId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export class DeepSeekAdapter implements ProviderAdapter {
  async healthCheck(config: ConnectorConfig): Promise<HealthCheckResult> {
    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    const start = Date.now();

    try {
      const response = await httpGet<OpenAIModelsResponse>({
        url: `${baseUrl}/models`,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        return { status: ConnectorStatus.HEALTHY, latencyMs };
      }

      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: `DeepSeek API returned status ${String(response.status)}`,
      };
    } catch (error: unknown) {
      return {
        status: ConnectorStatus.DOWN,
        latencyMs: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : "Unknown error connecting to DeepSeek",
      };
    }
  }

  async syncModels(config: ConnectorConfig): Promise<NormalizedModel[]> {
    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

    const response = await httpGet<OpenAIModelsResponse>({
      url: `${baseUrl}/models`,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch DeepSeek models: HTTP ${String(response.status)}`);
    }

    const models = response.data.data ?? [];

    return models.map((model) => ({
      modelKey: model.id,
      displayName: formatDisplayName(model.id),
      lifecycle: ModelLifecycle.ACTIVE,
      capabilities: {
        supportsStreaming: true,
        supportsTools: !model.id.includes("reasoner"),
        supportsVision: false,
        supportsAudio: false,
        supportsStructuredOutput: !model.id.includes("reasoner"),
      },
    }));
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: false,
    };
  }
}
