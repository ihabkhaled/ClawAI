import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  CONNECTOR_FALLBACK_MODEL,
  LOCAL_LAST_RESORT_MODEL,
  MODEL_CATALOG_FETCH_TIMEOUT_MS,
} from '../constants/model-catalog.constants';
import type {
  ConnectedProvider,
  InstalledLocalModel,
  InstalledLocalModelsResponse,
  ModelCatalogCache,
  ResolveDefaultsInput,
  ResolvedDefaults,
  ResolvedModelCatalog,
} from '../types/model-catalog.types';
import type { ModelChoice } from '../types/ai-action.types';

@Injectable()
export class ModelCatalogResolverManager {
  private readonly logger = new Logger(ModelCatalogResolverManager.name);
  private cache: ModelCatalogCache | null = null;

  async resolveDefaults(input: ResolveDefaultsInput = {}): Promise<ResolvedDefaults> {
    const catalog = await this.getCatalog();
    const local = this.bestLocal(catalog.installedLocalModels, input.capabilityHints);
    const cloudChain = this.cloudChain(catalog.connectedProviders, input.capabilityHints);
    if (input.preferLocal === true) {
      return this.prependLocal(local, cloudChain);
    }
    return this.prependCloud(local, cloudChain);
  }

  invalidate(): void {
    this.cache = null;
  }

  private async getCatalog(): Promise<ResolvedModelCatalog> {
    if (this.cache !== null && this.cache.expiresAt > Date.now()) return this.cache.catalog;
    const refreshed = await this.refresh();
    const ttl = AppConfig.get().AI_ACTION_MODEL_RESOLVER_TTL_SECONDS * 1000;
    this.cache = { catalog: refreshed, expiresAt: Date.now() + ttl };
    return refreshed;
  }

  private async refresh(): Promise<ResolvedModelCatalog> {
    const [installed, connected] = await Promise.all([
      this.fetchInstalledModels(),
      this.fetchConnectedProviders(),
    ]);
    return {
      installedLocalModels: installed,
      connectedProviders: connected,
      refreshedAt: new Date(),
    };
  }

  private async fetchInstalledModels(): Promise<InstalledLocalModel[]> {
    const url = `${AppConfig.get().OLLAMA_SERVICE_URL}/api/v1/internal/ollama/installed-models`;
    try {
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) return [];
      const body = (await response.json()) as InstalledLocalModelsResponse;
      return body.models;
    } catch (error) {
      this.logger.warn(
        `installed-models fetch failed — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return [];
    }
  }

  private async fetchConnectedProviders(): Promise<ConnectedProvider[]> {
    // Connector-service exposes /internal/connectors/config?provider=<P> per provider.
    // We probe the 5 providers we route to. Anything that 404s is treated as not-connected.
    const probeProviders = ['ANTHROPIC', 'OPENAI', 'GEMINI', 'GROK', 'DEEPSEEK'];
    const base = `${AppConfig.get().CONNECTOR_SERVICE_URL}/api/v1/internal/connectors/config`;
    const results: ConnectedProvider[] = [];
    await Promise.all(
      probeProviders.map(async (provider) => {
        try {
          const response = await this.fetchWithTimeout(`${base}?provider=${provider}`);
          if (!response.ok) return;
          const config = (await response.json()) as { models?: { modelKey: string; displayName: string; capabilities?: string[] }[] };
          if (config.models === undefined || config.models.length === 0) return;
          results.push({
            provider,
            models: config.models.map((m) => ({
              modelKey: m.modelKey,
              displayName: m.displayName,
              capabilities: m.capabilities ?? [],
            })),
          });
        } catch (error) {
          this.logger.debug(
            `connector probe ${provider} failed — ${error instanceof Error ? error.message : 'unknown'}`,
          );
        }
      }),
    );
    return results;
  }

  private bestLocal(
    installed: InstalledLocalModel[],
    capabilityHints?: string[],
  ): ModelChoice | null {
    if (installed.length === 0) return null;
    const hints = capabilityHints ?? [];
    const scored = installed
      .map((m) => ({ model: m, score: this.scoreInstalled(m, hints) }))
      .sort((a, b) => b.score - a.score);
    const winner = scored[0]?.model;
    if (winner === undefined) return null;
    return {
      provider: 'local-ollama',
      model: `${winner.name}:${winner.tag}`,
      displayName: this.localDisplayName(winner),
    };
  }

  private scoreInstalled(model: InstalledLocalModel, hints: string[]): number {
    let score = 10;
    if (model.roles.includes('LOCAL_FALLBACK_CHAT')) score += 30;
    if (model.roles.includes('LOCAL_REASONING')) score += 20;
    if (model.roles.includes('LOCAL_CODING')) score += 20;
    if (model.roles.includes('ROUTER')) score -= 50; // router-only models excluded
    for (const hint of hints) {
      if (model.capabilities.includes(hint)) score += 15;
      if (model.category !== null && model.category.toLowerCase() === hint.toLowerCase()) {
        score += 10;
      }
    }
    return score;
  }

  private localDisplayName(model: InstalledLocalModel): string {
    const params = model.parameterCount === null ? '' : ` ${model.parameterCount}`;
    return `${model.name}${params} (local)`;
  }

  private cloudChain(providers: ConnectedProvider[], capabilityHints?: string[]): ModelChoice[] {
    const chain: ModelChoice[] = [];
    for (const conn of providers) {
      const pick = this.bestCloudModel(conn, capabilityHints);
      if (pick !== null) chain.push(pick);
    }
    return chain;
  }

  private bestCloudModel(
    provider: ConnectedProvider,
    capabilityHints?: string[],
  ): ModelChoice | null {
    if (provider.models.length === 0) return null;
    const hints = capabilityHints ?? [];
    const scored = provider.models
      .map((m) => ({ model: m, score: hints.filter((h) => m.capabilities.includes(h)).length }))
      .sort((a, b) => b.score - a.score);
    const winner = scored[0]?.model;
    if (winner === undefined) return null;
    return {
      provider: provider.provider,
      model: winner.modelKey,
      displayName: winner.displayName,
    };
  }

  private prependLocal(
    local: ModelChoice | null,
    cloudChain: ModelChoice[],
  ): ResolvedDefaults {
    if (local !== null) {
      return { primary: local, fallbackChain: cloudChain };
    }
    const cloudHead = cloudChain[0];
    if (cloudHead !== undefined) {
      return { primary: cloudHead, fallbackChain: cloudChain.slice(1) };
    }
    return { primary: LOCAL_LAST_RESORT_MODEL, fallbackChain: [] };
  }

  private prependCloud(
    local: ModelChoice | null,
    cloudChain: ModelChoice[],
  ): ResolvedDefaults {
    const cloudHead = cloudChain[0];
    if (cloudHead !== undefined) {
      const tail = local === null ? cloudChain.slice(1) : [...cloudChain.slice(1), local];
      return { primary: cloudHead, fallbackChain: tail };
    }
    if (local !== null) {
      return { primary: local, fallbackChain: [] };
    }
    return { primary: CONNECTOR_FALLBACK_MODEL, fallbackChain: [] };
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_CATALOG_FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}
