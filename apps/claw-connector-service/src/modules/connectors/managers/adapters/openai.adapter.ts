import { Logger } from '@nestjs/common';
import { ConnectorStatus, ModelLifecycle } from '../../../../generated/prisma';
import { type HealthCheckResult, type NormalizedModel } from '../../types/connectors.types';
import { type OpenAIModelsResponse } from '../../types/provider-api.types';
import { declaredHost } from '@claw/shared-utilities';
import { httpGet } from '../../../../common/utilities/http.utility';
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from '../provider-adapter.interface';
import {
  OPENAI_CHAT_MODEL_PREFIXES,
  OPENAI_DEFAULT_BASE_URL,
} from '../../constants/openai.constants';

const logger = new Logger('OpenAIAdapter');

export class OpenAIAdapter implements ProviderAdapter {
  private static isChatModel(modelId: string): boolean {
    const lower = modelId.toLowerCase();
    return OPENAI_CHAT_MODEL_PREFIXES.some((prefix) => lower.startsWith(prefix));
  }

  private static formatDisplayName(modelId: string): string {
    return modelId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  async healthCheck(config: ConnectorConfig): Promise<HealthCheckResult> {
    const baseUrl = config.baseUrl ?? OPENAI_DEFAULT_BASE_URL;
    logger.debug(`healthCheck: checking OpenAI health at ${baseUrl}`);
    const start = Date.now();

    try {
      logger.debug('healthCheck: sending GET /models request');
      const response = await httpGet<OpenAIModelsResponse>({
        url: `${baseUrl}/models`,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        // The base URL comes from an operator-edited connector row, so it is
        // on no static allowlist; the destination is declared explicitly here.
        allowedHosts: declaredHost(baseUrl),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        logger.debug(`healthCheck: OpenAI is healthy — latencyMs=${String(latencyMs)}`);
        return { status: ConnectorStatus.HEALTHY, latencyMs };
      }

      logger.debug(
        `healthCheck: OpenAI returned error status=${String(response.status)} — latencyMs=${String(latencyMs)}`,
      );
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: `OpenAI API returned status ${String(response.status)}`,
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error connecting to OpenAI';
      logger.debug(
        `healthCheck: OpenAI connection failed — latencyMs=${String(latencyMs)} error=${errorMsg}`,
      );
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: errorMsg,
      };
    }
  }

  async syncModels(config: ConnectorConfig): Promise<NormalizedModel[]> {
    const baseUrl = config.baseUrl ?? OPENAI_DEFAULT_BASE_URL;
    logger.log(`syncModels: syncing OpenAI models from ${baseUrl}`);

    logger.debug('syncModels: sending GET /models request');
    const response = await httpGet<OpenAIModelsResponse>({
      url: `${baseUrl}/models`,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      // The base URL comes from an operator-edited connector row, so it is on
      // no static allowlist; the destination is declared explicitly here.
      allowedHosts: declaredHost(baseUrl),
    });

    if (!response.ok) {
      logger.error(`syncModels: failed to fetch OpenAI models — status=${String(response.status)}`);
      throw new Error(`Failed to fetch OpenAI models: HTTP ${String(response.status)}`);
    }

    const models = response.data.data ?? [];
    logger.debug(
      `syncModels: received ${String(models.length)} total models — filtering for chat models`,
    );

    const chatModels = models.filter((model) => OpenAIAdapter.isChatModel(model.id));
    logger.log(
      `syncModels: found ${String(chatModels.length)} chat models out of ${String(models.length)} total`,
    );

    return chatModels.map((model) => ({
      modelKey: model.id,
      displayName: OpenAIAdapter.formatDisplayName(model.id),
      lifecycle: ModelLifecycle.ACTIVE,
      capabilities: {
        supportsStreaming: true,
        supportsTools: true,
        supportsVision: model.id.includes('vision') || model.id.startsWith('gpt-4'),
        // B6b — this said `false` while routing-service's
        // CAPABILITY_PROVIDER_PRIORITY already listed OPENAI for AUDIO_INPUT,
        // so the two halves of the platform disagreed about the same provider.
        // OpenAI does accept audio: `/audio/transcriptions` (Whisper) is part
        // of the same connector's credentials, which is what file-service's
        // transcription adapter calls. The flag describes the PROVIDER's audio
        // capability, which is what `modalitiesIn: ['AUDIO']` in the models
        // snapshot is read for.
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
