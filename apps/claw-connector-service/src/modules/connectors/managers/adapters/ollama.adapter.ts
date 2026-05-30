import { Injectable, Logger } from '@nestjs/common';

import { httpGet, httpGetText } from '../../../../common/utilities/http.utility';
import { ConnectorStatus, ModelLifecycle } from '../../../../generated/prisma';
import { isOllamaMultimodalModel } from '../../constants/ollama-vision-heuristics.constants';
import {
  OLLAMA_CATALOG_CLOUD_URL,
  OLLAMA_CATALOG_LIBRARY_LINK_REGEX,
  OLLAMA_CATALOG_MAX_MODELS,
  OLLAMA_CATALOG_POPULAR_URL,
  OLLAMA_CATALOG_USER_AGENT,
  OLLAMA_CLOUD_API_BASE_URL,
  OLLAMA_LOCALHOST_PATTERNS,
} from '../../constants/ollama.constants';
import { type HealthCheckResult, type NormalizedModel } from '../../types/connectors.types';
import { type OllamaModelsResponse } from '../../types/provider-api.types';
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
      supportsTools: false,
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

  private buildNormalizedModel(modelKey: string, displayName: string): NormalizedModel {
    return {
      modelKey,
      displayName,
      lifecycle: ModelLifecycle.ACTIVE,
      capabilities: {
        supportsStreaming: true,
        supportsTools: false,
        supportsVision: isOllamaMultimodalModel(modelKey),
        supportsAudio: false,
        supportsStructuredOutput: false,
      },
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
