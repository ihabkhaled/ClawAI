import { Logger } from '@nestjs/common';
import { ConnectorStatus, ModelLifecycle } from '../../../../generated/prisma';
import { type HealthCheckResult, type NormalizedModel } from '../../types/connectors.types';
import { type GrokModelsResponse } from '../../types/provider-api.types';
import { httpGet } from '../../../../common/utilities/http.utility';
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from '../provider-adapter.interface';
import { GROK_CHAT_MODEL_PREFIXES, GROK_DEFAULT_BASE_URL } from '../../constants/grok.constants';

const logger = new Logger('GrokAdapter');

export class GrokAdapter implements ProviderAdapter {
  private static isChatModel(modelId: string): boolean {
    const lower = modelId.toLowerCase();
    return GROK_CHAT_MODEL_PREFIXES.some((prefix) => lower.startsWith(prefix));
  }

  private static formatDisplayName(modelId: string): string {
    return modelId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  // Grok 2 series exposes vision via dedicated `*-vision*` SKUs
  // (grok-2-vision, grok-2-vision-1212). Grok 4 and later ship with vision
  // built into the base model, so the heuristic accepts the family prefix
  // verbatim. Text-only SKUs (grok-2, grok-2-mini, grok-3) return false.
  private static supportsVision(modelId: string): boolean {
    const lower = modelId.toLowerCase();
    if (lower.includes('vision')) {
      return true;
    }
    return lower.startsWith('grok-4');
  }

  async healthCheck(config: ConnectorConfig): Promise<HealthCheckResult> {
    const baseUrl = config.baseUrl ?? GROK_DEFAULT_BASE_URL;
    logger.debug(`healthCheck: checking Grok health at ${baseUrl}`);
    const start = Date.now();

    try {
      logger.debug('healthCheck: sending GET /models request');
      const response = await httpGet<GrokModelsResponse>({
        url: `${baseUrl}/models`,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        logger.debug(`healthCheck: Grok is healthy — latencyMs=${String(latencyMs)}`);
        return { status: ConnectorStatus.HEALTHY, latencyMs };
      }

      logger.debug(
        `healthCheck: Grok returned error status=${String(response.status)} — latencyMs=${String(latencyMs)}`,
      );
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: `Grok API returned status ${String(response.status)}`,
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error connecting to Grok';
      logger.debug(
        `healthCheck: Grok connection failed — latencyMs=${String(latencyMs)} error=${errorMsg}`,
      );
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: errorMsg,
      };
    }
  }

  async syncModels(config: ConnectorConfig): Promise<NormalizedModel[]> {
    const baseUrl = config.baseUrl ?? GROK_DEFAULT_BASE_URL;
    logger.log(`syncModels: syncing Grok models from ${baseUrl}`);

    logger.debug('syncModels: sending GET /models request');
    const response = await httpGet<GrokModelsResponse>({
      url: `${baseUrl}/models`,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      logger.error(`syncModels: failed to fetch Grok models — status=${String(response.status)}`);
      throw new Error(`Failed to fetch Grok models: HTTP ${String(response.status)}`);
    }

    const models = response.data.data ?? [];
    logger.debug(
      `syncModels: received ${String(models.length)} total models — filtering for chat models`,
    );

    const chatModels = models.filter((model) => GrokAdapter.isChatModel(model.id));
    logger.log(
      `syncModels: found ${String(chatModels.length)} chat models out of ${String(models.length)} total`,
    );

    return chatModels.map((model) => ({
      modelKey: model.id,
      displayName: GrokAdapter.formatDisplayName(model.id),
      lifecycle: ModelLifecycle.ACTIVE,
      capabilities: {
        supportsStreaming: true,
        supportsTools: true,
        supportsVision: GrokAdapter.supportsVision(model.id),
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
