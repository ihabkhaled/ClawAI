import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import { type OpenAIModelsResponse } from "../../types/provider-api.types";
import { httpGet } from "../../../../common/utilities/http.utility";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

const CHAT_MODEL_PREFIXES = ["gpt-4", "gpt-3.5", "o1", "o3", "o4", "chatgpt"];

function isChatModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return CHAT_MODEL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function formatDisplayName(modelId: string): string {
  return modelId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export class OpenAIAdapter implements ProviderAdapter {
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
        errorMessage: `OpenAI API returned status ${String(response.status)}`,
      };
    } catch (error: unknown) {
      return {
        status: ConnectorStatus.DOWN,
        latencyMs: Date.now() - start,
        errorMessage: error instanceof Error ? error.message : "Unknown error connecting to OpenAI",
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
      throw new Error(`Failed to fetch OpenAI models: HTTP ${String(response.status)}`);
    }

    const models = response.data.data ?? [];

    return models
      .filter((model) => isChatModel(model.id))
      .map((model) => ({
        modelKey: model.id,
        displayName: formatDisplayName(model.id),
        lifecycle: ModelLifecycle.ACTIVE,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: model.id.includes("vision") || model.id.startsWith("gpt-4"),
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
