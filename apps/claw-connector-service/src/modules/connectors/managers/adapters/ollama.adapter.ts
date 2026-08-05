import { Injectable, Logger } from '@nestjs/common';

import { httpGet, httpGetText, httpPost } from '../../../../common/utilities/http.utility';
import { ConnectorStatus, ModelLifecycle } from '../../../../generated/prisma';
import { isOllamaMultimodalModel } from '../../constants/ollama-vision-heuristics.constants';
import {
  describeOllamaToolCapability,
  isOllamaToolCapableModel,
} from '../../constants/ollama-tool-heuristics.constants';
import {
  CapabilityConfidence,
  CapabilityEvidenceSource,
  type ModelBehaviorProbeResult,
} from '@claw/shared-types';
import { resolveOllamaCloudModelMetadata } from '../../constants/ollama-cloud-models.constants';
import {
  OLLAMA_CATALOG_CLOUD_URL,
  OLLAMA_CATALOG_LIBRARY_LINK_REGEX,
  OLLAMA_CATALOG_MAX_MODELS,
  OLLAMA_CATALOG_POPULAR_URL,
  OLLAMA_CATALOG_USER_AGENT,
  OLLAMA_CLOUD_API_BASE_URL,
  OLLAMA_LOCALHOST_PATTERNS,
} from '../../constants/ollama.constants';
import {
  OLLAMA_TOOL_PROBE_FAILURE_NO_CALL,
  OLLAMA_TOOL_PROBE_FAILURE_REQUEST,
  OLLAMA_TOOL_PROBE_FAILURE_WRONG_TOOL,
  OLLAMA_TOOL_PROBE_ID,
  OLLAMA_TOOL_PROBE_OPTIONS,
  OLLAMA_TOOL_PROBE_PROMPT,
  OLLAMA_TOOL_PROBE_TIMEOUT_MS,
  OLLAMA_TOOL_PROBE_TOOL,
} from '../../constants/ollama-tool-probe.constants';
import { type HealthCheckResult, type NormalizedModel } from '../../types/connectors.types';
import {
  type OllamaModelsResponse,
  type OllamaProbeChatResponse,
} from '../../types/provider-api.types';
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from '../provider-adapter.interface';

@Injectable()
export class OllamaAdapter implements ProviderAdapter {
  private readonly logger = new Logger(OllamaAdapter.name);

  async healthCheck(config: ConnectorConfig): Promise<HealthCheckResult> {
    const baseUrl = this.resolveBaseUrl(config.baseUrl);
    this.logger.debug(`healthCheck: checking Ollama health at ${baseUrl}`);
    const start = Date.now();

    try {
      const response = await httpGet<OllamaModelsResponse>({
        url: `${baseUrl}/tags`,
        headers: this.buildHeaders(config.apiKey),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        return { status: ConnectorStatus.HEALTHY, latencyMs };
      }

      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: `Ollama returned status ${String(response.status)}`,
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error connecting to Ollama';
      return {
        status: ConnectorStatus.DOWN,
        latencyMs,
        errorMessage: errorMsg,
      };
    }
  }

  async syncModels(config: ConnectorConfig): Promise<NormalizedModel[]> {
    const baseUrl = this.resolveBaseUrl(config.baseUrl);
    this.logger.log(`syncModels: syncing Ollama models from ${baseUrl}`);

    const cloudModels = await this.fetchCloudModels(baseUrl, config.apiKey);
    const publicModels = await this.fetchPublicCatalog(cloudModels);

    const merged: NormalizedModel[] = [];
    const seenKeys = new Set<string>();
    for (const model of [...cloudModels, ...publicModels]) {
      if (!seenKeys.has(model.modelKey)) {
        seenKeys.add(model.modelKey);
        merged.push(model);
      }
    }

    this.logger.log(
      `syncModels: cloud=${String(cloudModels.length)} public=${String(publicModels.length)} total=${String(merged.length)}`,
    );
    return merged.slice(0, OLLAMA_CATALOG_MAX_MODELS);
  }

  private async fetchCloudModels(baseUrl: string, apiKey: string): Promise<NormalizedModel[]> {
    try {
      const response = await httpGet<OllamaModelsResponse>({
        url: `${baseUrl}/tags`,
        headers: this.buildHeaders(apiKey),
      });
      if (!response.ok) {
        this.logger.warn(`fetchCloudModels: status=${String(response.status)} - skipping cloud`);
        return [];
      }
      const models = response.data.models ?? [];
      return models.map((model) => this.buildNormalizedModel(model.name, model.name));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`fetchCloudModels: failed - ${msg}`);
      return [];
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      // Provider-level capability: Ollama's `/api/chat` accepts `tools` and
      // returns `message.tool_calls`. Whether a *given model* honours them is a
      // per-model question answered in buildNormalizedModel. Reporting false
      // here made the whole provider look tool-less and is what kept
      // capability-aware routing from ever selecting an Ollama agent lane.
      supportsTools: true,
      supportsVision: false,
    };
  }

  private resolveBaseUrl(configured: string | undefined): string {
    const trimmed = configured?.trim();
    if (trimmed === undefined || trimmed.length === 0) {
      return OLLAMA_CLOUD_API_BASE_URL;
    }

    const normalized = trimmed.replace(/\/+$/, '');
    const isLocalhost = OLLAMA_LOCALHOST_PATTERNS.some((pattern) => normalized.includes(pattern));
    if (isLocalhost) {
      return OLLAMA_CLOUD_API_BASE_URL;
    }

    let hostname: string;
    try {
      const withScheme = normalized.startsWith('http') ? normalized : `https://${normalized}`;
      hostname = new URL(withScheme).hostname;
    } catch {
      hostname = '';
    }
    if (hostname === 'ollama.com' || hostname.endsWith('.ollama.com')) {
      if (normalized.endsWith('/api')) {
        return normalized;
      }
      if (normalized.endsWith('/v1')) {
        return normalized.replace(/\/v1$/, '/api');
      }
      return `${normalized}/api`;
    }

    return normalized;
  }

  private buildHeaders(apiKey: string): Record<string, string> | undefined {
    if (apiKey.trim().length === 0) {
      return undefined;
    }

    return {
      Authorization: `Bearer ${apiKey}`,
    };
  }

  /**
   * Runs the deterministic native-tool probe against one exact model (§9.2).
   *
   * This is what turns an ADVERTISED claim into PROVEN or FAILED. It costs one
   * small inference call, which is exactly why it is NOT run during syncModels:
   * a ~250-model catalog would mean 250 inference calls per sync. It is invoked
   * on demand instead, and the result is cached against the model identity.
   *
   * Never throws. A probe that cannot complete is itself evidence — it returns
   * a FAILED result with a stable code rather than propagating an error that
   * would look like a broken connector.
   */
  async probeToolCapability(
    config: ConnectorConfig,
    modelKey: string,
  ): Promise<ModelBehaviorProbeResult> {
    const baseUrl = this.resolveBaseUrl(config.baseUrl);
    const startedAt = Date.now();
    this.logger.debug(`probeToolCapability: probing ${modelKey} at ${baseUrl}`);

    try {
      const response = await httpPost<OllamaProbeChatResponse>({
        url: `${baseUrl}/chat`,
        headers: this.buildHeaders(config.apiKey),
        timeoutMs: OLLAMA_TOOL_PROBE_TIMEOUT_MS,
        body: {
          model: modelKey,
          messages: [{ role: 'user', content: OLLAMA_TOOL_PROBE_PROMPT }],
          tools: [OLLAMA_TOOL_PROBE_TOOL],
          stream: false,
          options: OLLAMA_TOOL_PROBE_OPTIONS,
        },
      });

      if (!response.ok) {
        return this.probeFailure(startedAt, OLLAMA_TOOL_PROBE_FAILURE_REQUEST);
      }

      const calls = response.data.message?.tool_calls ?? [];
      if (calls.length === 0) {
        // The model answered in prose instead of calling. That is precisely
        // the drift this whole feature exists to prevent, and here it is
        // caught before any agent run depends on it.
        return this.probeFailure(startedAt, OLLAMA_TOOL_PROBE_FAILURE_NO_CALL);
      }
      if (calls[0]?.function?.name !== OLLAMA_TOOL_PROBE_TOOL.function.name) {
        // Emitting a call for a tool that was never offered is worse than
        // emitting none — it means names cannot be trusted for dispatch.
        return this.probeFailure(startedAt, OLLAMA_TOOL_PROBE_FAILURE_WRONG_TOOL);
      }

      this.logger.log(`probeToolCapability: ${modelKey} PROVEN tool-capable`);
      return {
        probeId: OLLAMA_TOOL_PROBE_ID,
        passed: true,
        checkedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`probeToolCapability: ${modelKey} probe errored — ${message}`);
      return this.probeFailure(startedAt, OLLAMA_TOOL_PROBE_FAILURE_REQUEST);
    }
  }

  private probeFailure(startedAt: number, failureCode: string): ModelBehaviorProbeResult {
    return {
      probeId: OLLAMA_TOOL_PROBE_ID,
      passed: false,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      failureCode,
    };
  }

  private buildNormalizedModel(modelKey: string, displayName: string): NormalizedModel {
    const metadata = resolveOllamaCloudModelMetadata(modelKey);
    return {
      modelKey,
      displayName,
      lifecycle: ModelLifecycle.ACTIVE,
      capabilities: {
        supportsStreaming: true,
        supportsTools: isOllamaToolCapableModel(modelKey),
        // Carry the provenance, not just the verdict. A curated-list match and
        // a successful behavioural probe both yield `true`; routing has to be
        // able to tell them apart before staking an agent run on either.
        toolEvidence: {
          source: CapabilityEvidenceSource.PROVIDER_ADVERTISED,
          confidence: CapabilityConfidence.ADVERTISED,
          checkedAt: new Date().toISOString(),
          rationale: describeOllamaToolCapability(modelKey),
        },
        supportsVision: isOllamaMultimodalModel(modelKey),
        supportsAudio: false,
        supportsStructuredOutput: false,
        ...(metadata.contextTokens > 0 ? { maxContextTokens: metadata.contextTokens } : {}),
      },
      usage: metadata.usage,
    };
  }

  private parseLibrarySlugs(html: string): string[] {
    const seen = new Set<string>();
    const slugs: string[] = [];
    for (const match of html.matchAll(OLLAMA_CATALOG_LIBRARY_LINK_REGEX)) {
      const slug = match[1];
      if (slug !== undefined && !seen.has(slug)) {
        seen.add(slug);
        slugs.push(slug);
      }
    }
    return slugs;
  }

  private async fetchSlugs(url: string): Promise<string[]> {
    try {
      const response = await httpGetText({
        url,
        headers: { 'User-Agent': OLLAMA_CATALOG_USER_AGENT },
      });
      if (!response.ok) {
        this.logger.warn(`fetchSlugs: ${url} returned status ${String(response.status)}`);
        return [];
      }
      const slugs = this.parseLibrarySlugs(response.data);
      this.logger.debug(`fetchSlugs: ${url} parsed ${String(slugs.length)} slugs`);
      return slugs;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`fetchSlugs: ${url} failed - ${msg}`);
      return [];
    }
  }

  private async fetchPublicCatalog(cloudModels: NormalizedModel[]): Promise<NormalizedModel[]> {
    const [cloudSlugs, popularSlugs] = await Promise.all([
      this.fetchSlugs(OLLAMA_CATALOG_CLOUD_URL),
      this.fetchSlugs(OLLAMA_CATALOG_POPULAR_URL),
    ]);

    const models: NormalizedModel[] = [];
    const seenKeys = new Set<string>();
    const taggedModelsBySlug = this.groupModelsBySlug(cloudModels);

    for (const slug of [...popularSlugs, ...cloudSlugs]) {
      if (models.length >= OLLAMA_CATALOG_MAX_MODELS) {
        break;
      }

      const taggedModels = taggedModelsBySlug.get(slug) ?? [];
      for (const model of taggedModels) {
        if (models.length >= OLLAMA_CATALOG_MAX_MODELS) {
          break;
        }
        if (!seenKeys.has(model.modelKey)) {
          seenKeys.add(model.modelKey);
          models.push(model);
        }
      }
    }

    this.logger.log(
      `fetchPublicCatalog: cloud=${String(cloudSlugs.length)} popular=${String(popularSlugs.length)} merged=${String(models.length)}`,
    );
    return models.slice(0, OLLAMA_CATALOG_MAX_MODELS);
  }

  private groupModelsBySlug(models: NormalizedModel[]): Map<string, NormalizedModel[]> {
    const grouped = new Map<string, NormalizedModel[]>();

    for (const model of models) {
      const slug = this.extractSlug(model.modelKey);
      const existing = grouped.get(slug) ?? [];
      existing.push(model);
      grouped.set(slug, existing);
    }

    return grouped;
  }

  private extractSlug(modelKey: string): string {
    return modelKey.split(':')[0]?.trim().toLowerCase() ?? modelKey.trim().toLowerCase();
  }
}
