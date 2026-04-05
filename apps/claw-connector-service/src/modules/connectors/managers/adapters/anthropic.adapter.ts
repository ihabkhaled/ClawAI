import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import { type AnthropicModelsResponse } from "../../types/provider-api.types";
import { httpGet } from "../../../../common/utilities/http.utility";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";

const DEFAULT_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

function formatDisplayName(modelId: string): string {
  return modelId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
  };
}

export class AnthropicAdapter implements ProviderAdapter {
  async healthCheck(config: ConnectorConfig): Promise<HealthCheckResult> {
    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    const start = Date.now();

    try {
      const response = await httpGet<AnthropicModelsResponse>({
        url: `${baseUrl}/models`,
        headers: buildHeaders(config.apiKey),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        return { status: ConnectorStatus.HEALTHY, latencyMs };
      }

      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: `Anthropic API returned status ${String(response.status)}`,
      };
    } catch (error: unknown) {
      return {
        status: ConnectorStatus.DOWN,
        latencyMs: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : "Unknown error connecting to Anthropic",
      };
    }
  }

  async syncModels(config: ConnectorConfig): Promise<NormalizedModel[]> {
    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

    const response = await httpGet<AnthropicModelsResponse>({
      url: `${baseUrl}/models`,
      headers: buildHeaders(config.apiKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Anthropic models: HTTP ${String(response.status)}`);
    }

    const models = response.data.data ?? [];

    return models.map((model) => ({
      modelKey: model.id,
      displayName: model.display_name || formatDisplayName(model.id),
      lifecycle: ModelLifecycle.ACTIVE,
      capabilities: {
        supportsStreaming: true,
        supportsTools: true,
        supportsVision: true,
        supportsAudio: false,
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
