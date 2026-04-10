import { Logger } from "@nestjs/common";
import { ConnectorStatus, ModelLifecycle } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import { type OpenAIModelsResponse } from "../../types/provider-api.types";
import { httpGet } from "../../../../common/utilities/http.utility";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";
import { DEEPSEEK_DEFAULT_BASE_URL } from "../../constants/deepseek.constants";

const logger = new Logger("DeepSeekAdapter");

export class DeepSeekAdapter implements ProviderAdapter {
  private static formatDisplayName(modelId: string): string {
    return modelId
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  async healthCheck(config: ConnectorConfig): Promise<HealthCheckResult> {
    const baseUrl = config.baseUrl ?? DEEPSEEK_DEFAULT_BASE_URL;
    logger.debug(`healthCheck: checking DeepSeek health at ${baseUrl}`);
    const start = Date.now();

    try {
      logger.debug('healthCheck: sending GET /models request');
      const response = await httpGet<OpenAIModelsResponse>({
        url: `${baseUrl}/models`,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        logger.debug(`healthCheck: DeepSeek is healthy — latencyMs=${String(latencyMs)}`);
        return { status: ConnectorStatus.HEALTHY, latencyMs };
      }

      logger.debug(`healthCheck: DeepSeek returned error status=${String(response.status)} — latencyMs=${String(latencyMs)}`);
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: `DeepSeek API returned status ${String(response.status)}`,
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : "Unknown error connecting to DeepSeek";
      logger.debug(`healthCheck: DeepSeek connection failed — latencyMs=${String(latencyMs)} error=${errorMsg}`);
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: errorMsg,
      };
    }
  }

  async syncModels(config: ConnectorConfig): Promise<NormalizedModel[]> {
    const baseUrl = config.baseUrl ?? DEEPSEEK_DEFAULT_BASE_URL;
    logger.log(`syncModels: syncing DeepSeek models from ${baseUrl}`);

    logger.debug('syncModels: sending GET /models request');
    const response = await httpGet<OpenAIModelsResponse>({
      url: `${baseUrl}/models`,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      logger.error(`syncModels: failed to fetch DeepSeek models — status=${String(response.status)}`);
      throw new Error(`Failed to fetch DeepSeek models: HTTP ${String(response.status)}`);
    }

    const models = response.data.data ?? [];
    logger.log(`syncModels: received ${String(models.length)} DeepSeek models`);

    return models.map((model) => ({
      modelKey: model.id,
      displayName: DeepSeekAdapter.formatDisplayName(model.id),
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
