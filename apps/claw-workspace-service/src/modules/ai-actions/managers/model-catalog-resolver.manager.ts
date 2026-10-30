import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import {
  ENTITLEMENTS_ADAPTER,
  type EntitlementsAdapter,
  isModelAllowedForUsage,
  ModelUsageType,
  type UserEntitlements,
} from '@claw/shared-entitlements';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors/business.exception';
import { AI_ACTION_FALLBACK_LOCAL_PROVIDER } from '../constants/ai-action-prompts.constants';
import {
  AI_ACTION_PLAN_LOOKUP_CODE,
  AI_ACTION_PLAN_LOOKUP_MESSAGE,
  MODEL_CATALOG_FAILURE_TTL_MS,
  MODEL_CATALOG_FETCH_TIMEOUT_MS,
  MODEL_CATALOG_PUBLIC_PATH,
} from '../constants/model-catalog.constants';
import type {
  ConnectedProvider,
  InstalledLocalModel,
  InstalledLocalModelsResponse,
  ModelCatalogCache,
  ResolvedDefaults,
  ResolveDefaultsInput,
  ResolvedModelCatalog,
} from '../types/model-catalog.types';
import type { ModelChoice } from '../types/ai-action.types';
import { guardedFetch } from '../../../common/utilities/guarded-fetch.utility';
import { buildAuthHeader } from '../../../common/utilities/file-service-client.utility';
import { publicModelCatalogSchema } from '../dto/public-model-catalog.dto';
import { bareModelId, rankCloudModels } from '../utilities/cloud-model-ranking.utility';
import {
  costClassOf,
  needsCostClasses,
  NO_COST_CLASSES,
} from '../utilities/model-cost-class-key.utility';
import { ModelCostClassResolverManager } from './model-cost-class-resolver.manager';

@Injectable()
export class ModelCatalogResolverManager {
  private readonly logger = new Logger(ModelCatalogResolverManager.name);
  private cache: ModelCatalogCache | null = null;

  constructor(
    @Inject(ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter,
    private readonly costClasses: ModelCostClassResolverManager,
  ) {}

  async resolveDefaults(input: ResolveDefaultsInput = {}): Promise<ResolvedDefaults> {
    const catalog = await this.getCatalog();
    const local = this.bestLocal(catalog.installedLocalModels, input.capabilityHints);
    const offered =
      input.userId === undefined
        ? catalog.connectedProviders
        : await this.filterToPlan(catalog.connectedProviders, input.userId);
    const cloudChain = rankCloudModels(offered, input.capabilityHints ?? []);
    return input.preferLocal === true
      ? this.prependLocal(local, cloudChain)
      : this.prependCloud(local, cloudChain);
  }

  invalidate(): void {
    this.cache = null;
  }

  private async getCatalog(): Promise<ResolvedModelCatalog> {
    if (this.cache !== null && this.cache.expiresAt > Date.now()) return this.cache.catalog;
    const refreshed = await this.refresh();
    // A catalog missing one of its sources is retried soon: caching "no cloud
    // models" for the full TTL after a connector-service blip would turn one
    // failed read into minutes of refused AUTO runs.
    const ttl = refreshed.complete
      ? AppConfig.get().AI_ACTION_MODEL_RESOLVER_TTL_SECONDS * 1000
      : MODEL_CATALOG_FAILURE_TTL_MS;
    this.cache = { catalog: refreshed, expiresAt: Date.now() + ttl };
    return refreshed;
  }

  private async refresh(): Promise<ResolvedModelCatalog> {
    const [installed, connected] = await Promise.all([
      this.fetchInstalledModels(),
      this.fetchConnectedProviders(),
    ]);
    return {
      installedLocalModels: installed.models,
      connectedProviders: connected.providers,
      refreshedAt: new Date(),
      complete: installed.ok && connected.ok,
    };
  }

  private async fetchInstalledModels(): Promise<{ models: InstalledLocalModel[]; ok: boolean }> {
    const url = `${AppConfig.get().OLLAMA_SERVICE_URL}/api/v1/internal/ollama/installed-models`;
    try {
      const response = await this.fetchWithTimeout(AppConfig.get().OLLAMA_SERVICE_URL, url);
      if (!response.ok) return { models: [], ok: false };
      const body = (await response.json()) as InstalledLocalModelsResponse;
      return { models: body.models, ok: true };
    } catch (error) {
      this.logger.warn(
        `installed-models fetch failed — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return { models: [], ok: false };
    }
  }

  // Reads the model picker's own catalog (exposed, active, chat models of
  // enabled connectors). The earlier per-provider probe of the credentials route
  // looked for a `models` field that route never returned, so the cloud chain was
  // always empty and AUTO fell through to a local model production does not have.
  private async fetchConnectedProviders(): Promise<{
    providers: ConnectedProvider[];
    ok: boolean;
  }> {
    const base = AppConfig.get().CONNECTOR_SERVICE_URL;
    try {
      const response = await this.fetchWithTimeout(base, `${base}${MODEL_CATALOG_PUBLIC_PATH}`);
      if (!response.ok) {
        this.logger.warn(`public catalog fetch failed — HTTP ${String(response.status)}`);
        return { providers: [], ok: false };
      }
      const parsed = publicModelCatalogSchema.safeParse(await response.json());
      if (!parsed.success) {
        this.logger.warn('public catalog response did not match the expected shape');
        return { providers: [], ok: false };
      }
      const providers = parsed.data.providers
        .filter((entry) => entry.models.length > 0)
        .map((entry): ConnectedProvider => ({
          provider: entry.provider,
          models: entry.models.map((m) => ({
            modelKey: m.modelKey,
            displayName: m.displayName ?? m.modelKey,
            maxContextTokens: m.maxContextTokens ?? null,
            usageTier: m.usageTier ?? null,
            supportsStructuredOutput: m.supportsStructuredOutput === true,
            supportsTools: m.supportsTools === true,
          })),
        }));
      return { providers, ok: true };
    } catch (error) {
      this.logger.warn(
        `public catalog fetch failed — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return { providers: [], ok: false };
    }
  }

  // Keeps only the models the user's plan lets them run as a primary.
  // chat-service's generate endpoint reserves credit but does not re-check the
  // plan, so an AUTO pick that skipped this would hand a free account a model its
  // plan excludes.
  private async filterToPlan(
    providers: ConnectedProvider[],
    userId: string,
  ): Promise<ConnectedProvider[]> {
    const entitlements = await this.loadEntitlements(userId);
    // A cost-class plan decides by each model's price band (ADR-198). Both spellings of an id are
    // asked about; a model routing did not answer for has no class and is refused (fail closed).
    const classes = needsCostClasses(entitlements)
      ? await this.costClasses.resolve(
          providers.flatMap((entry) =>
            entry.models.flatMap((model) =>
              [...new Set([model.modelKey, bareModelId(model.modelKey)])].map((id) => ({
                provider: entry.provider,
                model: id,
              })),
            ),
          ),
        )
      : NO_COST_CLASSES;
    const allowed = (provider: string, model: string): boolean =>
      isModelAllowedForUsage(
        entitlements,
        provider,
        model,
        ModelUsageType.PRIMARY,
        costClassOf(classes, provider, model),
      );
    return providers
      .map((entry) => ({
        provider: entry.provider,
        models: entry.models.filter(
          (model) =>
            allowed(entry.provider, model.modelKey) ||
            allowed(entry.provider, bareModelId(model.modelKey)),
        ),
      }))
      .filter((entry) => entry.models.length > 0);
  }

  private async loadEntitlements(userId: string): Promise<UserEntitlements> {
    try {
      return await this.entitlements.getEntitlements(userId, { enforceTrial: false });
    } catch (error) {
      this.logger.warn(
        `plan lookup failed for user=${userId} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new BusinessException(
        AI_ACTION_PLAN_LOOKUP_MESSAGE,
        AI_ACTION_PLAN_LOOKUP_CODE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
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
    return winner === undefined
      ? null
      : {
          provider: AI_ACTION_FALLBACK_LOCAL_PROVIDER,
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

  // Local first: the local model leads and the cloud chain is the fallback. With no
  // local model the cloud head leads. With neither, `primary` is null and the
  // caller raises its coded error; no placeholder model is invented here.
  private prependLocal(local: ModelChoice | null, cloudChain: ModelChoice[]): ResolvedDefaults {
    if (local !== null) {
      return { primary: local, fallbackChain: cloudChain };
    }
    const cloudHead = cloudChain[0];
    return cloudHead === undefined
      ? { primary: null, fallbackChain: [] }
      : { primary: cloudHead, fallbackChain: cloudChain.slice(1) };
  }

  private prependCloud(local: ModelChoice | null, cloudChain: ModelChoice[]): ResolvedDefaults {
    const cloudHead = cloudChain[0];
    if (cloudHead !== undefined) {
      const tail = local === null ? cloudChain.slice(1) : [...cloudChain.slice(1), local];
      return { primary: cloudHead, fallbackChain: tail };
    }
    return { primary: local, fallbackChain: [] };
  }

  private async fetchWithTimeout(declaredBase: string, url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_CATALOG_FETCH_TIMEOUT_MS);
    try {
      // ADR-144: /internal/ollama/* refuses an anonymous call; the internal
      // connector routes take the same service token.
      return await guardedFetch(declaredBase, url, {
        headers: { Authorization: buildAuthHeader() },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
