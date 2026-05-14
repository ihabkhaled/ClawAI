import { Injectable, Logger, Optional } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { ModelLifecycle, type Prisma } from '../../../generated/prisma';
import { RouterModelRegistryRepository } from '../../router-models/repositories/router-model-registry.repository';
import { RouterModelRegistryManager } from '../../router-models/managers/router-model-registry.manager';
import { UPSTREAM_SNAPSHOT_ENDPOINTS } from '../constants/sync.constants';
import {
  type SyncProviderResult,
  type SyncRunResult,
  type UpstreamModelSnapshot,
} from '../types/sync.types';
import { fetchSnapshot } from '../utilities/snapshot-fetcher.utility';

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
    this.logger.log(`syncAll: started at ${startedAt.toISOString()}`);

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
        const upsertInput = this.toUpsertInput(upstream, protectedFields);
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

  private toUpsertInput(
    upstream: UpstreamModelSnapshot,
    protectedFields: ReadonlySet<string>,
  ): {
    create: Prisma.RouterModelRegistryCreateInput;
    update: Prisma.RouterModelRegistryUpdateInput;
  } {
    const create: Prisma.RouterModelRegistryCreateInput = {
      provider: upstream.provider,
      modelKey: upstream.modelKey,
      displayName: upstream.displayName,
      family: upstream.family ?? null,
      isLocal: upstream.isLocal ?? false,
      lifecycle: ModelLifecycle.ACTIVE,
      modalitiesIn: upstream.modalitiesIn ?? [],
      modalitiesOut: upstream.modalitiesOut ?? [],
      contextWindowTokens: upstream.contextWindowTokens ?? null,
      maxOutputTokens: upstream.maxOutputTokens ?? null,
      inputCostPer1M: upstream.inputCostPer1M ?? null,
      outputCostPer1M: upstream.outputCostPer1M ?? null,
      ...(upstream.qualityTier !== undefined ? { qualityTier: upstream.qualityTier } : {}),
      ...(upstream.privacySupport !== undefined ? { privacySupport: upstream.privacySupport } : {}),
    };
    const update: Prisma.RouterModelRegistryUpdateInput = {};
    if (!protectedFields.has('displayName')) update.displayName = upstream.displayName;
    if (!protectedFields.has('family')) update.family = upstream.family ?? null;
    if (!protectedFields.has('modalitiesIn')) update.modalitiesIn = upstream.modalitiesIn ?? [];
    if (!protectedFields.has('modalitiesOut')) update.modalitiesOut = upstream.modalitiesOut ?? [];
    if (!protectedFields.has('contextWindowTokens'))
      update.contextWindowTokens = upstream.contextWindowTokens ?? null;
    if (!protectedFields.has('maxOutputTokens'))
      update.maxOutputTokens = upstream.maxOutputTokens ?? null;
    if (!protectedFields.has('inputCostPer1M'))
      update.inputCostPer1M = upstream.inputCostPer1M ?? null;
    if (!protectedFields.has('outputCostPer1M'))
      update.outputCostPer1M = upstream.outputCostPer1M ?? null;
    if (upstream.qualityTier !== undefined && !protectedFields.has('qualityTier')) {
      update.qualityTier = upstream.qualityTier;
    }
    if (upstream.privacySupport !== undefined && !protectedFields.has('privacySupport')) {
      update.privacySupport = upstream.privacySupport;
    }
    return { create, update };
  }

  private serviceBaseUrl(envVar: string, fallback: string): string {
    const value = process.env[envVar];
    return value !== undefined && value.length > 0 ? value : fallback;
  }
}
