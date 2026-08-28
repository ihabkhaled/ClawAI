import { Logger } from '@nestjs/common';
import { ConnectorStatus, ModelLifecycle } from '../../../../generated/prisma';
import { type HealthCheckResult, type NormalizedModel } from '../../types/connectors.types';
import { type AnthropicModelsResponse } from '../../types/provider-api.types';
import { httpGet } from '../../../../common/utilities/http.utility';
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from '../provider-adapter.interface';
import { ANTHROPIC_DEFAULT_BASE_URL, ANTHROPIC_VERSION } from '../../constants/anthropic.constants';

const logger = new Logger('AnthropicAdapter');

export class AnthropicAdapter implements ProviderAdapter {
  private static formatDisplayName(modelId: string): string {
    return modelId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  // An identity-linked key carries no workspace of its own, so Anthropic rejects
  // every call — /v1/models included — until the request names the workspace it
  // acts in. A workspace-scoped key needs no such header, so this stays absent
  // rather than empty when the operator has not configured one: sending a blank
  // `anthropic-workspace-id` is itself an error.
  private static buildHeaders(config: ConnectorConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'x-api-key': config.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    };

    const workspaceId = config.workspaceId?.trim();
    if (workspaceId) {
      headers['anthropic-workspace-id'] = workspaceId;
    }

    return headers;
  }

  // The provider explains its own 4xx in the body; the bare status does not say
  // whether the key is wrong, the workspace is missing, or the URL is. Surfacing
  // that sentence is the difference between a fixable error and a support ticket.
  private static describeFailure(status: number, body: unknown): string {
    const message = (body as { error?: { message?: unknown } } | null)?.error?.message;
    return typeof message === 'string' && message.length > 0
      ? `Anthropic API returned status ${String(status)}: ${message}`
      : `Anthropic API returned status ${String(status)}`;
  }

  async healthCheck(config: ConnectorConfig): Promise<HealthCheckResult> {
    const baseUrl = config.baseUrl ?? ANTHROPIC_DEFAULT_BASE_URL;
    logger.debug(`healthCheck: checking Anthropic health at ${baseUrl}`);
    const start = Date.now();

    try {
      logger.debug('healthCheck: sending GET /models request');
      const response = await httpGet<AnthropicModelsResponse>({
        url: `${baseUrl}/models`,
        headers: AnthropicAdapter.buildHeaders(config),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        logger.debug(`healthCheck: Anthropic is healthy — latencyMs=${String(latencyMs)}`);
        return { status: ConnectorStatus.HEALTHY, latencyMs };
      }

      logger.debug(
        `healthCheck: Anthropic returned error status=${String(response.status)} — latencyMs=${String(latencyMs)}`,
      );
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: AnthropicAdapter.describeFailure(response.status, response.data),
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error connecting to Anthropic';
      logger.debug(
        `healthCheck: Anthropic connection failed — latencyMs=${String(latencyMs)} error=${errorMsg}`,
      );
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
      headers: AnthropicAdapter.buildHeaders(config),
    });

    if (!response.ok) {
      const failure = AnthropicAdapter.describeFailure(response.status, response.data);
      logger.error(`syncModels: failed to fetch Anthropic models — ${failure}`);
      throw new Error(`Failed to fetch Anthropic models: ${failure}`);
    }

    const models = response.data.data ?? [];
    logger.log(`syncModels: received ${String(models.length)} Anthropic models`);

    return models.map((model) => ({
      modelKey: model.id,
      displayName: model.display_name || AnthropicAdapter.formatDisplayName(model.id),
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
