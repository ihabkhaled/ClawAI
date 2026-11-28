import { Injectable, Logger } from '@nestjs/common';
import { type LocalModel, RuntimeType } from '../../../generated/prisma';
import { LocalModelsRepository } from '../repositories/local-models.repository';
import { type RoutingSnapshotEntry, type RoutingSnapshotResponse } from '../types/catalog.types';
import { OllamaContextWindowManager } from './ollama-context-window.manager';

/// Phase 6 — builds the snapshot consumed by the routing-service's
/// RouterSyncManager. Returns only installed Ollama models so the router
/// never proposes uninstalled or pull-only entries.
@Injectable()
export class RoutingSnapshotManager {
  private readonly logger = new Logger(RoutingSnapshotManager.name);

  constructor(
    private readonly localModelsRepo: LocalModelsRepository,
    private readonly contextWindows: OllamaContextWindowManager,
  ) {}

  async build(): Promise<RoutingSnapshotResponse> {
    this.logger.debug('build: collecting installed local models for routing snapshot');
    const installed = await this.localModelsRepo.findAllInstalled();
    // Ollama states each model's trained window itself (ADR-234); a model it cannot answer
    // for is forwarded without one, never with a guess.
    const windows = await this.contextWindows.resolve(
      installed
        .filter((row) => row.runtime === RuntimeType.OLLAMA)
        .map((row) => this.modelKey(row)),
    );
    const models = installed.map((row) => this.toSnapshotEntry(row, windows));
    this.logger.log(`build: returning ${models.length} installed models for routing snapshot`);
    return {
      models,
      generatedAt: new Date().toISOString(),
    };
  }

  private modelKey(row: LocalModel): string {
    return `${row.name}:${row.tag}`;
  }

  private toSnapshotEntry(
    row: LocalModel,
    windows: ReadonlyMap<string, number>,
  ): RoutingSnapshotEntry {
    const contextWindowTokens = windows.get(this.modelKey(row));
    return {
      provider: 'OLLAMA',
      modelKey: this.modelKey(row),
      displayName: this.modelKey(row),
      family: row.family ?? undefined,
      isLocal: true,
      modalitiesIn: ['TEXT'],
      modalitiesOut: ['TEXT'],
      parameterCount: row.parameters ?? undefined,
      ...(contextWindowTokens === undefined ? {} : { contextWindowTokens }),
    };
  }
}
