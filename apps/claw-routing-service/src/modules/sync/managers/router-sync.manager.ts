import { Injectable, Logger, Optional } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { RouterModelRegistryRepository } from '../../router-models/repositories/router-model-registry.repository';
import { RouterModelRegistryManager } from '../../router-models/managers/router-model-registry.manager';
import { type ModelIntelligenceEnrichment } from '../../router-models/types/model-intelligence.types';
import {
  lookupCuratedCloudEnrichment,
  lookupLocalFamilyEnrichment,
  mergeEnrichmentRespectingOverrides,
} from '../../router-models/utilities/model-intelligence-merge.utility';
import { UPSTREAM_SNAPSHOT_ENDPOINTS } from '../constants/sync.constants';
import {
  type SyncProviderResult,
  type SyncRunResult,
  type UpstreamModelSnapshot,
} from '../types/sync.types';
import { fetchSnapshot } from '../utilities/snapshot-fetcher.utility';
import {
  buildCreateInput,
  buildUpdateInput,
  enrichmentEntries,
} from '../utilities/upsert-input-builder.utility';

@Injectable()
export class RouterSyncManager {
  private readonly logger = new Logger(RouterSyncManager.name);

  constructor(
    private readonly registryRepo: RouterModelRegistryRepository,
    private readonly registryManager: RouterModelRegistryManager,
    @Optional() private readonly rabbitMQ?: RabbitMQService,
  ) {}

  async syncAll(): Promise<SyncRunResult> {
    const startedAt = new Date();
    this.logger.debug(`syncAll: started at ${startedAt.toISOString()}`);

    const baseConnector = this.serviceBaseUrl(
      'CONNECTOR_SERVICE_URL',
      'http://connector-service:4003',
    );
    const baseOllama = this.serviceBaseUrl('OLLAMA_SERVICE_URL', 'http://ollama-service:4008');
    const baseLlamacpp = this.serviceBaseUrl(
      'LLAMACPP_SERVICE_URL',
      'http://llamacpp-service:4017',
    );

    const perProvider: SyncProviderResult[] = [];
    perProvider.push(
      await this.syncOne('CLOUD', `${baseConnector}${UPSTREAM_SNAPSHOT_ENDPOINTS.CONNECTOR}`),
    );
    perProvider.push(
      await this.syncOne('OLLAMA', `${baseOllama}${UPSTREAM_SNAPSHOT_ENDPOINTS.OLLAMA}`),
    );
    perProvider.push(
      await this.syncOne('LLAMACPP', `${baseLlamacpp}${UPSTREAM_SNAPSHOT_ENDPOINTS.LLAMACPP}`),
    );

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const totals = perProvider.reduce(
      (acc, p) => ({
        upstreamCount: acc.upstreamCount + p.upstreamCount,
        upsertedCount: acc.upsertedCount + p.upsertedCount,
        skippedCount: acc.skippedCount + p.skippedCount,
      }),
      { upstreamCount: 0, upsertedCount: 0, skippedCount: 0 },
    );
    this.logger.log(
      `syncAll: finished in ${durationMs}ms — upstream=${totals.upstreamCount} upserted=${totals.upsertedCount} skipped=${totals.skippedCount}`,
    );

    const result: SyncRunResult = {
      runStartedAt: startedAt.toISOString(),
      runFinishedAt: finishedAt.toISOString(),
      durationMs,
      totals,
      perProvider,
    };
    await this.publishSyncCompleted(result);
    return result;
  }

  private async publishSyncCompleted(result: SyncRunResult): Promise<void> {
    if (this.rabbitMQ === undefined) return;
    try {
      await this.rabbitMQ.publish(EventPattern.ROUTING_MODELS_SYNCED, {
        runStartedAt: result.runStartedAt,
        runFinishedAt: result.runFinishedAt,
        durationMs: result.durationMs,
        totals: result.totals,
        perProvider: result.perProvider.map((p) => ({
          provider: p.provider,
          status: p.status,
          upstreamCount: p.upstreamCount,
          upsertedCount: p.upsertedCount,
          skippedCount: p.skippedCount,
        })),
      });
    } catch (error) {
      this.logger.warn(`publishSyncCompleted: event publish failed — ${(error as Error).message}`);
    }
  }

  private async syncOne(source: string, url: string): Promise<SyncProviderResult> {
    this.logger.debug(`syncOne: source=${source} url=${url}`);
    const outcome = await fetchSnapshot(url);
    if (outcome.status === 'UPSTREAM_404') {
      return {
        provider: source,
        source: url,
        upstreamCount: 0,
        upsertedCount: 0,
        skippedCount: 0,
        status: 'UPSTREAM_404',
      };
    }
    if (outcome.status === 'UPSTREAM_ERROR') {
      this.logger.warn(`syncOne(${source}): upstream error — ${outcome.message}`);
      return {
        provider: source,
        source: url,
        upstreamCount: 0,
        upsertedCount: 0,
        skippedCount: 0,
        status: 'UPSTREAM_ERROR',
        errorMessage: outcome.message,
      };
    }
    return this.applySnapshot(source, url, outcome.models);
  }

  private async applySnapshot(
    source: string,
    url: string,
    snapshots: ReadonlyArray<UpstreamModelSnapshot>,
  ): Promise<SyncProviderResult> {
    let upserted = 0;
    let skipped = 0;
    for (const upstream of snapshots) {
      try {
        const existing = await this.registryRepo.findByProviderAndModelKey(
          upstream.provider,
          upstream.modelKey,
        );
        const protectedFields =
          existing === null
            ? new Set<string>()
            : await this.registryManager.getProtectedFieldNames(existing.id);
        const intelligenceOverrideKeys =
          existing?.adminOverrideJson === null || existing?.adminOverrideJson === undefined
            ? new Set<string>()
            : new Set<string>(Object.keys(existing.adminOverrideJson));
        const enrichment = this.resolveEnrichment(upstream, existing);
        const filteredEnrichment = mergeEnrichmentRespectingOverrides(
          {},
          enrichment,
          intelligenceOverrideKeys,
        );
        const upsertInput = this.toUpsertInput(upstream, protectedFields, filteredEnrichment);
        await this.registryRepo.upsert(
          upstream.provider,
          upstream.modelKey,
          { ...upsertInput.create, metadataSource: `sync:${source}`, lastSyncedAt: new Date() },
          { ...upsertInput.update, lastSyncedAt: new Date() },
        );
        upserted += 1;
      } catch (error) {
        this.logger.error(
          `syncOne(${source}): failed to upsert ${upstream.provider}/${upstream.modelKey}: ${(error as Error).message}`,
        );
        skipped += 1;
      }
    }
    return {
      provider: source,
      source: url,
      upstreamCount: snapshots.length,
      upsertedCount: upserted,
      skippedCount: skipped,
      status: 'OK',
    };
  }

  /// Phase 3: Resolves the enrichment block to apply to this row. Priority
  /// (highest wins): explicit `snapshot.intelligence` → curated cloud table
  /// → local-family heuristic (matched against family / modelKey for local
  /// models) → existing adminOverrideJson (so a row pinned by an admin
  /// keeps its pins even when no upstream source has anything to say) →
  /// empty. `adminOverrideJson` is enforced separately by the caller via
  /// `mergeEnrichmentRespectingOverrides`.
  private resolveEnrichment(
    upstream: UpstreamModelSnapshot,
    existing: { adminOverrideJson: Record<string, unknown> | null } | null,
  ): ModelIntelligenceEnrichment {
    if (upstream.intelligence !== undefined) return upstream.intelligence;
    if (upstream.isLocal === true) {
      const local = lookupLocalFamilyEnrichment(upstream.family ?? upstream.modelKey);
      if (local !== undefined) return local;
    }
    const curated = lookupCuratedCloudEnrichment(upstream.provider, upstream.modelKey);
    if (curated !== undefined) return curated;
    if (existing?.adminOverrideJson !== null && existing?.adminOverrideJson !== undefined) {
      return existing.adminOverrideJson as ModelIntelligenceEnrichment;
    }
    return {};
  }

  private toUpsertInput(
    upstream: UpstreamModelSnapshot,
    protectedFields: ReadonlySet<string>,
    enrichment: ModelIntelligenceEnrichment,
  ): {
    create: ReturnType<typeof buildCreateInput>;
    update: ReturnType<typeof buildUpdateInput>;
  } {
    const entries = enrichmentEntries(enrichment);
    const create = buildCreateInput(upstream, entries);
    const update = buildUpdateInput(upstream, protectedFields, entries);
    return { create, update };
  }

  private serviceBaseUrl(envVar: string, fallback: string): string {
    const value = process.env[envVar];
    return value !== undefined && value.length > 0 ? value : fallback;
  }
}
