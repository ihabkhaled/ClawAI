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
import {
  isOpenAiVisionCapableModel,
  resolveOpenAiAudioFlags,
} from '../../constants/openai-media-heuristics.constants';

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

    const audio = resolveOpenAiAudioFlags(chatModels.map((model) => model.id));
    if (audio.usedProviderFallback) {
      logger.warn(
        'syncModels: listing has no audio-input model — applying the provider-level supportsAudio rule so transcription keeps an OpenAI candidate',
      );
    }

    return chatModels.map((model) => ({
      modelKey: model.id,
      displayName: OpenAIAdapter.formatDisplayName(model.id),
      lifecycle: ModelLifecycle.ACTIVE,
      capabilities: {
        supportsStreaming: true,
        supportsTools: true,
        // Fail-closed family table — see openai-media-heuristics.constants.ts.
        supportsVision: isOpenAiVisionCapableModel(model.id),
        // "This connector can serve speech-to-text / audio input for this
        // model": per-model (`-audio-*`, `-transcribe`), with a documented
        // provider-level fallback when the listing has none, because
        // file-service needs one OpenAI audio row to reach whisper-1.
        supportsAudio: audio.flags.get(model.id) ?? false,
        supportsVideoInput: false,
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
