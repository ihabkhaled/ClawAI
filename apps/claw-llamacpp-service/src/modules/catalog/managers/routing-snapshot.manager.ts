import { Injectable, Logger } from '@nestjs/common';
import {
  type CatalogEntry,
  type RoutingSnapshotEntry,
  type RoutingSnapshotResult,
} from '../types/catalog.types';
import { CatalogRepository } from '../repositories/catalog.repository';

/// Phase 6 — builds the snapshot consumed by the routing-service's
/// RouterSyncManager. Returns only frontier catalog entries whose
/// weights are downloaded (READY) and that are still marked available.
@Injectable()
export class RoutingSnapshotManager {
  private readonly logger = new Logger(RoutingSnapshotManager.name);

  constructor(private readonly catalogRepo: CatalogRepository) {}

  async build(): Promise<RoutingSnapshotResult> {
    this.logger.debug('build: collecting READY llama.cpp catalog entries for routing snapshot');
    const rows = await this.catalogRepo.findAllReadyForRouting();
    const models = rows.map((row) => this.toSnapshotEntry(row));
    this.logger.log(
      `build: returning ${models.length} ready llama.cpp models for routing snapshot`,
    );
    return {
      models,
      generatedAt: new Date().toISOString(),
    };
  }

  private toSnapshotEntry(row: CatalogEntry): RoutingSnapshotEntry {
    return {
      provider: 'LLAMACPP',
      modelKey: `${row.name}:${row.tag}`,
      displayName: row.displayName,
      isLocal: true,
      modalitiesIn: ['TEXT'],
      modalitiesOut: ['TEXT'],
      contextWindowTokens: row.contextLength,
    };
  }
}
