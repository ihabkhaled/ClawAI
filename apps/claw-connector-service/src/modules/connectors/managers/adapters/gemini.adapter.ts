import { Logger } from "@nestjs/common";
import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import { type GeminiModelsResponse } from "../../types/provider-api.types";
import { httpGet } from "../../../../common/utilities/http.utility";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";
import { GEMINI_DEFAULT_BASE_URL } from "../../constants/gemini.constants";

const logger = new Logger("GeminiAdapter");

export class GeminiAdapter implements ProviderAdapter {
  private static formatDisplayName(modelId: string): string {
    return modelId
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  async healthCheck(config: ConnectorConfig): Promise<HealthCheckResult> {
    const baseUrl = config.baseUrl ?? GEMINI_DEFAULT_BASE_URL;
    logger.debug(`healthCheck: checking Gemini health at ${baseUrl}`);
    const start = Date.now();

    try {
      logger.debug('healthCheck: sending GET /models request');
      const response = await httpGet<GeminiModelsResponse>({
        url: `${baseUrl}/models`,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        logger.debug(`healthCheck: Gemini is healthy — latencyMs=${String(latencyMs)}`);
        return { status: ConnectorStatus.HEALTHY, latencyMs };
      }

      logger.debug(`healthCheck: Gemini returned error status=${String(response.status)} — latencyMs=${String(latencyMs)}`);
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: `Gemini API returned status ${String(response.status)}`,
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : "Unknown error connecting to Gemini";
      logger.debug(`healthCheck: Gemini connection failed — latencyMs=${String(latencyMs)} error=${errorMsg}`);
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: errorMsg,
      };
    }
  }

  async syncModels(config: ConnectorConfig): Promise<NormalizedModel[]> {
    const baseUrl = config.baseUrl ?? GEMINI_DEFAULT_BASE_URL;
    logger.log(`syncModels: syncing Gemini models from ${baseUrl}`);

    logger.debug('syncModels: sending GET /models request');
    const response = await httpGet<GeminiModelsResponse>({
      url: `${baseUrl}/models`,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      logger.error(`syncModels: failed to fetch Gemini models — status=${String(response.status)}`);
      throw new Error(`Failed to fetch Gemini models: HTTP ${String(response.status)}`);
    }

    const models = response.data.data ?? [];
    logger.log(`syncModels: received ${String(models.length)} Gemini models`);

    return models.map((model) => ({
      modelKey: model.id,
      displayName: GeminiAdapter.formatDisplayName(model.id),
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
