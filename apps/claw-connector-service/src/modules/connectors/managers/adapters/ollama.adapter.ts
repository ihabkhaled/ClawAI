import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../../app/config/app.config';
import { httpGet, httpGetText } from '../../../../common/utilities/http.utility';
import { ConnectorStatus, ModelLifecycle } from '../../../../generated/prisma';
import {
  OLLAMA_CATALOG_CLOUD_URL,
  OLLAMA_CATALOG_LIBRARY_LINK_REGEX,
  OLLAMA_CATALOG_MAX_MODELS,
  OLLAMA_CATALOG_POPULAR_URL,
  OLLAMA_CATALOG_USER_AGENT,
  OLLAMA_CLOUD_TAG,
  OLLAMA_DEFAULT_TAG,
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
        url: `${baseUrl}/api/tags`,
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

    const localModels = await this.fetchLocalModels(baseUrl);
    const publicModels = await this.fetchPublicCatalog();

    const merged: NormalizedModel[] = [];
    const seenKeys = new Set<string>();
    for (const model of [...localModels, ...publicModels]) {
      if (!seenKeys.has(model.modelKey)) {
        seenKeys.add(model.modelKey);
        merged.push(model);
      }
    }

    this.logger.log(
      `syncModels: local=${String(localModels.length)} public=${String(publicModels.length)} total=${String(merged.length)}`,
    );
    return merged;
  }

  private async fetchLocalModels(baseUrl: string): Promise<NormalizedModel[]> {
    try {
      const response = await httpGet<OllamaModelsResponse>({
        url: `${baseUrl}/api/tags`,
      });
      if (!response.ok) {
        this.logger.warn(`fetchLocalModels: status=${String(response.status)} - skipping local`);
        return [];
      }
      const models = response.data.models ?? [];
      return models.map((model) => this.buildNormalizedModel(model.name, model.name));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`fetchLocalModels: failed - ${msg}`);
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
    const envUrl = AppConfig.get().OLLAMA_BASE_URL;
    if (configured === undefined || configured.trim() === '') {
      return envUrl;
    }
    const isLocalhost = OLLAMA_LOCALHOST_PATTERNS.some((pattern) => configured.includes(pattern));
    if (isLocalhost) {
      return envUrl;
    }
    return configured;
  }

  private buildNormalizedModel(modelKey: string, displayName: string): NormalizedModel {
    return {
      modelKey,
      displayName,
      lifecycle: ModelLifecycle.ACTIVE,
      capabilities: {
        supportsStreaming: true,
        supportsTools: false,
        supportsVision: false,
        supportsAudio: false,
        supportsStructuredOutput: false,
      },
    };
  }

  private parseLibrarySlugs(html: string): string[] {
    const seen = new Set<string>();
    const slugs: string[] = [];
    const regex = new RegExp(
      OLLAMA_CATALOG_LIBRARY_LINK_REGEX.source,
      OLLAMA_CATALOG_LIBRARY_LINK_REGEX.flags,
    );
    let match = regex.exec(html);
    while (match !== null) {
      const slug = match[1];
      if (slug !== undefined && !seen.has(slug)) {
        seen.add(slug);
        slugs.push(slug);
      }
      match = regex.exec(html);
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

  private async fetchPublicCatalog(): Promise<NormalizedModel[]> {
    const [cloudSlugs, popularSlugs] = await Promise.all([
      this.fetchSlugs(OLLAMA_CATALOG_CLOUD_URL),
      this.fetchSlugs(OLLAMA_CATALOG_POPULAR_URL),
    ]);

    const models: NormalizedModel[] = [];
    const seenKeys = new Set<string>();

    for (const slug of cloudSlugs) {
      const key = `${slug}:${OLLAMA_CLOUD_TAG}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        models.push(this.buildNormalizedModel(key, `${slug} (cloud)`));
      }
    }

    for (const slug of popularSlugs) {
      if (models.length >= OLLAMA_CATALOG_MAX_MODELS) {
        break;
      }
      const key = `${slug}:${OLLAMA_DEFAULT_TAG}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        models.push(this.buildNormalizedModel(key, slug));
      }
    }

    this.logger.log(
      `fetchPublicCatalog: cloud=${String(cloudSlugs.length)} popular=${String(popularSlugs.length)} merged=${String(models.length)}`,
    );
    return models.slice(0, OLLAMA_CATALOG_MAX_MODELS);
  }
}
