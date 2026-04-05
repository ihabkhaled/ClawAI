import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import { type GeminiModelsResponse } from "../../types/provider-api.types";
import { httpGet } from "../../../../common/utilities/http.utility";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

function formatDisplayName(modelId: string): string {
  return modelId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export class GeminiAdapter implements ProviderAdapter {
  async healthCheck(config: ConnectorConfig): Promise<HealthCheckResult> {
    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    const start = Date.now();

    try {
      const response = await httpGet<GeminiModelsResponse>({
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
        errorMessage: `Gemini API returned status ${String(response.status)}`,
      };
    } catch (error: unknown) {
      return {
        status: ConnectorStatus.DOWN,
        latencyMs: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : "Unknown error connecting to Gemini",
      };
    }
  }

  async syncModels(config: ConnectorConfig): Promise<NormalizedModel[]> {
    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

    const response = await httpGet<GeminiModelsResponse>({
      url: `${baseUrl}/models`,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Gemini models: HTTP ${String(response.status)}`);
    }

    const models = response.data.data ?? [];

    return models.map((model) => ({
      modelKey: model.id,
      displayName: formatDisplayName(model.id),
      lifecycle: ModelLifecycle.ACTIVE,
      capabilities: {
        supportsStreaming: true,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: true,
        supportsStructuredOutput: true,
      },
    }));
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
    };
  }
}
