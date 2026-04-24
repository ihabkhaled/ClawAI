import { Injectable, Logger } from '@nestjs/common';
import type { ModelCategory, ModelDiscoveryCandidate } from '../../../generated/prisma';
import { DiscoveryCandidateRepository } from '../repositories/discovery-candidate.repository';
import { ModelCatalogRepository } from '../repositories/model-catalog.repository';
import { CatalogClassificationService } from '../services/catalog-classification.service';
import type { ApproveCandidateInput } from '../types/discovery.types';
import { resolveCatalogSourceUrl } from '../utilities/catalog-reference.utility';

@Injectable()
export class CandidateImportManager {
  private readonly logger = new Logger(CandidateImportManager.name);

  constructor(
    private readonly catalogRepo: ModelCatalogRepository,
    private readonly candidateRepo: DiscoveryCandidateRepository,
    private readonly classificationService: CatalogClassificationService,
  ) {}

  async importCandidate(input: ApproveCandidateInput): Promise<{
    candidate: ModelDiscoveryCandidate;
    catalogEntryId: string;
  }> {
    const candidate = await this.candidateRepo.findById(input.candidateId);
    if (candidate === null) {
      throw new Error(`candidate ${input.candidateId} not found`);
    }

    const existingByOllama = await this.catalogRepo.findByOllamaName(candidate.ollamaName);
    if (existingByOllama !== null) {
      const updated = await this.candidateRepo.markDuplicate(candidate.id, existingByOllama.id);
      return { candidate: updated, catalogEntryId: existingByOllama.id };
    }

    const existingByKey = await this.catalogRepo.findByNameTagRuntime(
      candidate.name,
      candidate.tag,
      candidate.runtime,
    );
    if (existingByKey !== null) {
      if (existingByKey.ollamaName === null) {
        await this.catalogRepo.updateById(existingByKey.id, { ollamaName: candidate.ollamaName });
      }
      const updated = await this.candidateRepo.markImported(candidate.id, existingByKey.id);
      return { candidate: updated, catalogEntryId: existingByKey.id };
    }

    const overrides = input.overrides ?? {};
    const sourceUrl = resolveCatalogSourceUrl({
      name: candidate.name,
      tag: candidate.tag,
      ollamaName: candidate.ollamaName,
      runtime: candidate.runtime,
      sourceUrl: candidate.sourceUrl,
    });

    const { entry: created, candidate: updated } =
      await this.catalogRepo.createAdminEntryAndMarkImported(
        {
          name: candidate.name,
          tag: candidate.tag,
          displayName: overrides.displayName ?? candidate.displayName,
          category: overrides.category ?? (candidate.suggestedCategory as ModelCategory),
          description: overrides.description ?? candidate.description,
          sizeBytes: candidate.sizeBytes,
          parameterCount: candidate.parameterCount,
          runtime: candidate.runtime,
          ollamaName: candidate.ollamaName,
          sourceUrl,
          isRecommended: overrides.isRecommended ?? false,
          capabilities: candidate.capabilities,
          businessCategories: overrides.businessCategories ?? candidate.businessCategories,
          hardwareProfiles: overrides.hardwareProfiles ?? candidate.hardwareProfiles,
          isDiscovered: true,
          downloadStatus: candidate.downloadStatus,
          lastVerifiedAt: new Date(),
        },
        candidate.id,
      );

    try {
      await this.classificationService.reclassifySingle(created.id);
    } catch (error: unknown) {
      this.logger.warn(
        `failed to classify newly-imported catalog entry ${created.id}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }

    this.logger.log(`imported candidate ${candidate.ollamaName} as catalog entry ${created.id}`);
    return { candidate: updated, catalogEntryId: created.id };
  }

  async rejectCandidate(candidateId: string, reason: string): Promise<ModelDiscoveryCandidate> {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (candidate === null) {
      throw new Error(`candidate ${candidateId} not found`);
    }
    return this.candidateRepo.markRejected(candidateId, reason);
  }
}
