import { Injectable, Logger } from '@nestjs/common';
import type { ModelCategory, ModelDiscoveryCandidate } from '../../../generated/prisma';
import { DiscoveryCandidateRepository } from '../repositories/discovery-candidate.repository';
import { ModelCatalogRepository } from '../repositories/model-catalog.repository';
import type { ApproveCandidateInput } from '../types/discovery.types';
import { resolveCatalogSourceUrl } from '../utilities/catalog-reference.utility';

@Injectable()
export class CandidateImportManager {
  private readonly logger = new Logger(CandidateImportManager.name);

  constructor(
    private readonly catalogRepo: ModelCatalogRepository,
    private readonly candidateRepo: DiscoveryCandidateRepository,
  ) {}

  async importCandidate(input: ApproveCandidateInput): Promise<{
    candidate: ModelDiscoveryCandidate;
    catalogEntryId: string;
  }> {
    const candidate = await this.candidateRepo.findById(input.candidateId);
    if (candidate === null) {
      throw new Error(`candidate ${input.candidateId} not found`);
    }

    const existing = await this.catalogRepo.findByOllamaName(candidate.ollamaName);
    if (existing !== null) {
      const updated = await this.candidateRepo.markDuplicate(candidate.id);
      return { candidate: updated, catalogEntryId: existing.id };
    }

    const overrides = input.overrides ?? {};
    const sourceUrl = resolveCatalogSourceUrl({
      name: candidate.name,
      tag: candidate.tag,
      ollamaName: candidate.ollamaName,
      runtime: candidate.runtime,
      sourceUrl: candidate.sourceUrl,
    });

    const created = await this.catalogRepo.createAdminEntry({
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
    });

    const updated = await this.candidateRepo.markImported(candidate.id, created.id);
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
