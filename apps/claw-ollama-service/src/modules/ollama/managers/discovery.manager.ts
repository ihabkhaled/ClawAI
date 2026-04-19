import { Injectable, Logger } from '@nestjs/common';
import {
  CandidateStatus,
  type DiscoverySource,
  DiscoverySourceType,
  DownloadStatus,
} from '../../../generated/prisma';
import { DiscoveryCandidateRepository } from '../repositories/discovery-candidate.repository';
import { LocalModelsRepository } from '../repositories/local-models.repository';
import { ModelCatalogRepository } from '../repositories/model-catalog.repository';
import type { ClassifiedModel, DiscoveredModel, PipelineResult } from '../types/discovery.types';
import { assignHardwareProfiles } from '../utilities/hardware-profile.utility';
import { classifyModel } from '../utilities/model-classifier.utility';
import {
  isDuplicateOfCatalog,
  isDuplicateOfInstalled,
} from '../utilities/model-deduplicator.utility';
import { rankDiscoveredModels } from '../utilities/model-ranker.utility';
import { OllamaLibraryDiscoveryManager } from './ollama-library-discovery.manager';
import { ModelEnrichmentManager } from './model-enrichment.manager';

@Injectable()
export class DiscoveryManager {
  private readonly logger = new Logger(DiscoveryManager.name);

  constructor(
    private readonly libraryDiscoveryManager: OllamaLibraryDiscoveryManager,
    private readonly enrichmentManager: ModelEnrichmentManager,
    private readonly catalogRepo: ModelCatalogRepository,
    private readonly localModelsRepo: LocalModelsRepository,
    private readonly candidateRepo: DiscoveryCandidateRepository,
  ) {}

  async runPipeline(
    source: DiscoverySource,
    runId: string,
    isDryRun: boolean,
  ): Promise<PipelineResult> {
    const result: PipelineResult = {
      discovered: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
      candidateIds: [],
    };

    const rawDiscovered = await this.fetchFromSource(source);
    if (rawDiscovered.length === 0) {
      this.logger.warn(`no discovered models from source ${source.name}`);
      return result;
    }

    const ranked = rankDiscoveredModels(rawDiscovered);
    const enriched = await this.enrichmentManager.enrichAll(ranked);
    const classified = enriched.map((model) => this.classify(model));
    result.discovered = classified.length;

    const [catalogRefs, installedRefs] = await Promise.all([
      this.catalogRepo.findAllForDedup(),
      this.localModelsRepo.findInstalledForDedup(),
    ]);

    const accepted: ClassifiedModel[] = [];
    for (const model of classified) {
      if (isDuplicateOfCatalog(model.name, model.tag, catalogRefs)) {
        result.skipped += 1;
        continue;
      }
      if (isDuplicateOfInstalled(model.name, model.tag, installedRefs)) {
        result.skipped += 1;
        continue;
      }
      accepted.push(model);
    }

    if (isDryRun || accepted.length === 0) {
      return result;
    }

    const candidateRows = accepted.map((model) => ({
      runId,
      name: model.name,
      tag: model.tag,
      displayName: model.displayName,
      ollamaName: model.ollamaName,
      description: model.description,
      sizeBytes: model.sizeBytes,
      parameterCount: model.parameterCount,
      familyName: model.familyName,
      runtime: model.runtime,
      capabilities: model.capabilities,
      suggestedCategory: model.suggestedCategory,
      businessCategories: model.businessCategories,
      hardwareProfiles: model.hardwareProfiles,
      downloadStatus: model.downloadStatus,
      confidence: model.confidence,
      sourceUrl: model.sourceUrl,
      status: CandidateStatus.PENDING,
    }));

    const inserted = await this.candidateRepo.bulkCreate(candidateRows);
    result.imported = inserted;
    return result;
  }

  private async fetchFromSource(source: DiscoverySource): Promise<DiscoveredModel[]> {
    if (source.type === DiscoverySourceType.OLLAMA_LIBRARY) {
      return this.libraryDiscoveryManager.discover(source.baseUrl, source.maxResults);
    }
    if (source.type === DiscoverySourceType.OLLAMA_REGISTRY) {
      return this.libraryDiscoveryManager.discover(source.baseUrl, source.maxResults);
    }
    this.logger.warn(`manual source ${source.name} has no auto-discovery`);
    return [];
  }

  private classify(model: DiscoveredModel): ClassifiedModel {
    const classification = classifyModel({
      name: model.name,
      tag: model.tag,
      displayName: model.displayName,
      description: model.description,
      capabilities: model.capabilities,
    });
    const hardwareProfiles = assignHardwareProfiles(model.sizeBytes);
    return {
      ...model,
      suggestedCategory: classification.category,
      businessCategories: classification.businessCategories.map((b) => b.toString()),
      hardwareProfiles: hardwareProfiles.map((h) => h.toString()),
      confidence: classification.confidence,
      downloadStatus: model.downloadStatus ?? DownloadStatus.UNKNOWN,
    };
  }
}
