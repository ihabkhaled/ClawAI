import { Injectable, Logger } from '@nestjs/common';
import { type LocalModel } from '../../../generated/prisma';
import { LocalModelsRepository } from '../repositories/local-models.repository';
import { type RoutingSnapshotEntry, type RoutingSnapshotResponse } from '../types/catalog.types';

/// Phase 6 — builds the snapshot consumed by the routing-service's
/// RouterSyncManager. Returns only installed Ollama models so the router
/// never proposes uninstalled or pull-only entries.
@Injectable()
export class RoutingSnapshotManager {
  private readonly logger = new Logger(RoutingSnapshotManager.name);

  constructor(private readonly localModelsRepo: LocalModelsRepository) {}

  async build(): Promise<RoutingSnapshotResponse> {
    this.logger.debug('build: collecting installed local models for routing snapshot');
    const installed = await this.localModelsRepo.findAllInstalled();
    const models = installed.map((row) => this.toSnapshotEntry(row));
    this.logger.log(`build: returning ${models.length} installed models for routing snapshot`);
    return {
      models,
      generatedAt: new Date().toISOString(),
    };
  }

  private toSnapshotEntry(row: LocalModel): RoutingSnapshotEntry {
    return {
      provider: 'OLLAMA',
      modelKey: `${row.name}:${row.tag}`,
      displayName: `${row.name}:${row.tag}`,
      family: row.family ?? undefined,
      isLocal: true,
      modalitiesIn: ['TEXT'],
      modalitiesOut: ['TEXT'],
    };
  }
}
