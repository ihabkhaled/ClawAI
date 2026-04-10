import { Logger } from "@nestjs/common";
import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import { type AnthropicModelsResponse } from "../../types/provider-api.types";
import { httpGet } from "../../../../common/utilities/http.utility";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";
import {
  ANTHROPIC_DEFAULT_BASE_URL,
  ANTHROPIC_VERSION,
} from "../../constants/anthropic.constants";

const logger = new Logger("AnthropicAdapter");

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
    const baseUrl = config.baseUrl ?? ANTHROPIC_DEFAULT_BASE_URL;
    logger.debug(`healthCheck: checking Anthropic health at ${baseUrl}`);
    const start = Date.now();

    try {
      logger.debug('healthCheck: sending GET /models request');
      const response = await httpGet<AnthropicModelsResponse>({
        url: `${baseUrl}/models`,
        headers: buildHeaders(config.apiKey),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        logger.debug(`healthCheck: Anthropic is healthy — latencyMs=${String(latencyMs)}`);
        return { status: ConnectorStatus.HEALTHY, latencyMs };
      }

      logger.debug(`healthCheck: Anthropic returned error status=${String(response.status)} — latencyMs=${String(latencyMs)}`);
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: `Anthropic API returned status ${String(response.status)}`,
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : "Unknown error connecting to Anthropic";
      logger.debug(`healthCheck: Anthropic connection failed — latencyMs=${String(latencyMs)} error=${errorMsg}`);
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: errorMsg,
      };
    }
  }

  async syncModels(config: ConnectorConfig): Promise<NormalizedModel[]> {
    const baseUrl = config.baseUrl ?? ANTHROPIC_DEFAULT_BASE_URL;
    logger.log(`syncModels: syncing Anthropic models from ${baseUrl}`);

    logger.debug('syncModels: sending GET /models request');
    const response = await httpGet<AnthropicModelsResponse>({
      url: `${baseUrl}/models`,
      headers: buildHeaders(config.apiKey),
    });

    if (!response.ok) {
      logger.error(`syncModels: failed to fetch Anthropic models — status=${String(response.status)}`);
      throw new Error(`Failed to fetch Anthropic models: HTTP ${String(response.status)}`);
    }

    const models = response.data.data ?? [];
    logger.log(`syncModels: received ${String(models.length)} Anthropic models`);

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
