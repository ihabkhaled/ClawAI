import { Logger } from '@nestjs/common';
import { type ConnectorPreset } from '@claw/shared-types';
import { declaredHost, resolvePresetBaseUrl, resolvePresetEndpoint } from '@claw/shared-utilities';
import { ConnectorStatus } from '../../../../generated/prisma';
import { httpGet, httpPost } from '../../../../common/utilities/http.utility';
import {
  PRESET_BEARER_PREFIX,
  PRESET_CHAT_COMPLETIONS_PATH,
  PRESET_HEALTH_PROBE_MAX_TOKENS,
  PRESET_HEALTH_PROBE_PROMPT,
} from '../../constants/openai-compatible.constants';
import { type HealthCheckResult, type NormalizedModel } from '../../types/connectors.types';
import {
  isPresetChatModel,
  parsePresetModelList,
  staticPresetModels,
  toNormalizedPresetModel,
} from '../../utilities/preset-model-list.utility';
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from '../provider-adapter.interface';

const logger = new Logger('OpenAICompatibleAdapter');

/**
 * One adapter for every OpenAI-compatible preset (ADR-117).
 *
 * Everything provider-specific — base URL, model-list endpoint and shape,
 * health endpoint, static catalogue, tool and vision rules — comes from the
 * preset. DeepSeek and Grok predate the registry and keep their own adapters;
 * a new OpenAI-compatible provider is a registry entry, never a new class.
 *
 * No `probeToolCapability`: a behavioural probe sends a real tool-bearing
 * completion on the administrator's paid key. Until that spend is an explicit
 * choice, the manager reports these models as unprobed rather than proven.
 */
export class OpenAICompatibleAdapter implements ProviderAdapter {
  constructor(private readonly preset: ConnectorPreset) {}

  async healthCheck(config: ConnectorConfig): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const baseUrl = resolvePresetBaseUrl(this.preset, config.baseUrl, config.accountId);
      const status = await this.probe(baseUrl, config);
      const latencyMs = Date.now() - start;
      if (status >= 200 && status < 300) {
        logger.debug(`healthCheck: ${this.preset.key} healthy latencyMs=${String(latencyMs)}`);
        return { status: ConnectorStatus.HEALTHY, latencyMs };
      }
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: `${this.preset.displayName} API returned status ${String(status)}`,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Unknown error connecting to ${this.preset.displayName}`;
      logger.debug(`healthCheck: ${this.preset.key} failed — ${errorMessage}`);
      return { status: ConnectorStatus.DOWN, latencyMs: Date.now() - start, errorMessage };
    }
  }

  async syncModels(config: ConnectorConfig): Promise<NormalizedModel[]> {
    if (this.preset.modelsEndpoint === null) {
      logger.log(
        `syncModels: ${this.preset.key} has no list endpoint — using ${String(this.preset.staticModels.length)} documented models`,
      );
      return staticPresetModels(this.preset);
    }
    const baseUrl = resolvePresetBaseUrl(this.preset, config.baseUrl, config.accountId);
    const url = resolvePresetEndpoint(this.preset.modelsEndpoint, baseUrl, config.accountId);
    logger.log(`syncModels: syncing ${this.preset.key} models`);
    const response = await httpGet<unknown>({
      url,
      headers: this.authHeaders(config),
      // Operator-editable base URL (or the preset's absolute list URL): on no
      // static allowlist, so the destination is declared for this call.
      allowedHosts: declaredHost(url),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${this.preset.displayName} models: HTTP ${String(response.status)}`,
      );
    }
    const entries = parsePresetModelList(this.preset.modelsResponseFormat, response.data);
    const chatModels = entries.filter((entry) => isPresetChatModel(entry));
    logger.log(
      `syncModels: ${this.preset.key} listed ${String(entries.length)} models, ${String(chatModels.length)} chat`,
    );
    return chatModels.map((entry) => toNormalizedPresetModel(entry, this.preset));
  }

  // Provider-level flags are the fallback only; per-model truth comes from
  // syncModels. Vision is claimed only where the preset names vision SKUs.
  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: this.preset.supportsNativeTools,
      supportsVision: this.preset.visionModelPattern !== null,
    };
  }

  private async probe(baseUrl: string, config: ConnectorConfig): Promise<number> {
    if (this.preset.healthCheckEndpoint !== null) {
      const url = resolvePresetEndpoint(this.preset.healthCheckEndpoint, baseUrl, config.accountId);
      const response = await httpGet<unknown>({
        url,
        headers: this.authHeaders(config),
        allowedHosts: declaredHost(url),
      });
      return response.status;
    }
    const url = `${baseUrl}${PRESET_CHAT_COMPLETIONS_PATH}`;
    const response = await httpPost<unknown>({
      url,
      headers: this.authHeaders(config),
      body: {
        model: this.preset.staticModels[0],
        max_tokens: PRESET_HEALTH_PROBE_MAX_TOKENS,
        messages: [{ role: 'user', content: PRESET_HEALTH_PROBE_PROMPT }],
      },
      allowedHosts: declaredHost(url),
    });
    return response.status;
  }

  // The key is sent only when there is one: a public list endpoint answers
  // without it, and a key-scoped health endpoint then refuses — which is the
  // correct health result for a connector saved without a key.
  private authHeaders(config: ConnectorConfig): Record<string, string> {
    return config.apiKey.length > 0
      ? { Authorization: `${PRESET_BEARER_PREFIX}${config.apiKey}` }
      : {};
  }
}
