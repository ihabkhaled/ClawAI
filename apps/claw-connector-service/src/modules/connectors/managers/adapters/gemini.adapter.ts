import { Logger } from '@nestjs/common';
import { ConnectorStatus, ModelLifecycle } from '../../../../generated/prisma';
import { type HealthCheckResult, type NormalizedModel } from '../../types/connectors.types';
import {
  type GeminiModelsResponse,
  type GeminiNativeModelsResponse,
} from '../../types/provider-api.types';
import { declaredHost } from '@claw/shared-utilities';
import { httpGet } from '../../../../common/utilities/http.utility';
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from '../provider-adapter.interface';
import { GEMINI_DEFAULT_BASE_URL } from '../../constants/gemini.constants';
import { GEMINI_NATIVE_MODELS_PAGE_SIZE } from '../../constants/model-context-window.constants';
import { geminiNativeBaseUrl } from '../../utilities/model-context-window.utility';
import { formatModelDisplayName } from '../../utilities/model-display-name.utility';
import { isGeminiAudioCapableModel } from '../../constants/gemini-audio-heuristics.constants';
import { isGeminiVideoCapableModel } from '../../constants/gemini-video-heuristics.constants';

const logger = new Logger('GeminiAdapter');

export class GeminiAdapter implements ProviderAdapter {
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
        // The base URL comes from an operator-edited connector row, so it is
        // on no static allowlist; the destination is declared explicitly here.
        allowedHosts: declaredHost(baseUrl),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        logger.debug(`healthCheck: Gemini is healthy — latencyMs=${String(latencyMs)}`);
        return { status: ConnectorStatus.HEALTHY, latencyMs };
      }

      logger.debug(
        `healthCheck: Gemini returned error status=${String(response.status)} — latencyMs=${String(latencyMs)}`,
      );
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: `Gemini API returned status ${String(response.status)}`,
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error connecting to Gemini';
      logger.debug(
        `healthCheck: Gemini connection failed — latencyMs=${String(latencyMs)} error=${errorMsg}`,
      );
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
      // The base URL comes from an operator-edited connector row, so it is on
      // no static allowlist; the destination is declared explicitly here.
      allowedHosts: declaredHost(baseUrl),
    });

    if (!response.ok) {
      logger.error(`syncModels: failed to fetch Gemini models — status=${String(response.status)}`);
      throw new Error(`Failed to fetch Gemini models: HTTP ${String(response.status)}`);
    }

    const models = response.data.data ?? [];
    logger.log(`syncModels: received ${String(models.length)} Gemini models`);

    const limits = await this.fetchNativeContextWindows(baseUrl, config.apiKey);
    return models.map((model) => ({
      modelKey: model.id,
      displayName: formatModelDisplayName(model.id),
      lifecycle: ModelLifecycle.ACTIVE,
      capabilities: {
        supportsStreaming: true,
        supportsTools: true,
        supportsVision: true,
        // NOT a live sync — Gemini's OpenAI-compatible /models list carries no
        // modality data (see GeminiModelEntry), and the native list has none
        // either. Name-pattern heuristic, fails closed for anything outside
        // the confirmed stable family. See gemini-audio-heuristics.constants.ts.
        supportsAudio: isGeminiAudioCapableModel(model.id),
        // Same no-live-signal situation as audio; fails closed outside the
        // confirmed flash/pro family. See gemini-video-heuristics.constants.ts.
        supportsVideoInput: isGeminiVideoCapableModel(model.id),
        supportsStructuredOutput: true,
        ...(limits.has(model.id) ? { maxContextTokens: limits.get(model.id) } : {}),
      },
    }));
  }

  /**
   * Real input limits from Google's native list, keyed like the OpenAI list
   * (`models/gemini-3.6-flash`). The OpenAI-compatible list the sync reads has
   * no limits at all, which is why every Gemini model reached chat-service as
   * a 32k model. Empty on any failure: a sync must not fail over metadata.
   */
  private async fetchNativeContextWindows(
    baseUrl: string,
    apiKey: string,
  ): Promise<Map<string, number>> {
    const limits = new Map<string, number>();
    // The same operator-configured host as the OpenAI-compatible base: this
    // only strips the trailing `/openai` path segment. Declared from the
    // exact base this call opens rather than from the stored one.
    const nativeBaseUrl = geminiNativeBaseUrl(baseUrl);
    try {
      const response = await httpGet<GeminiNativeModelsResponse>({
        url: `${nativeBaseUrl}/models?pageSize=${String(GEMINI_NATIVE_MODELS_PAGE_SIZE)}`,
        headers: { 'x-goog-api-key': apiKey },
        allowedHosts: declaredHost(nativeBaseUrl),
      });
      if (!response.ok) {
        logger.warn(`fetchNativeContextWindows: HTTP ${String(response.status)}`);
        return limits;
      }
      for (const model of response.data.models ?? []) {
        if (typeof model.inputTokenLimit === 'number' && model.inputTokenLimit > 0) {
          limits.set(model.name, model.inputTokenLimit);
        }
      }
      logger.log(`fetchNativeContextWindows: ${String(limits.size)} model limit(s)`);
    } catch (error: unknown) {
      logger.warn(`fetchNativeContextWindows: failed - ${(error as Error).message}`);
    }
    return limits;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
    };
  }
}
