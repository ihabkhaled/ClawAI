import { Injectable, Logger } from '@nestjs/common';
import { ModelCategory, QualityTier } from '../../../common/enums';
import { EntityNotFoundException } from '../../../common/errors';
import { CatalogRepository } from '../repositories/catalog.repository';
import { CatalogRefreshManager } from '../managers/catalog-refresh.manager';
import { HfDiscoveryManager } from '../managers/hf-discovery.manager';
import {
  type HfAddRequestDto,
  type HfSearchQueryDto,
} from '../dto/hf-search.dto';
import {
  type CatalogEntry,
  type CatalogListFilters,
  type CatalogListResult,
} from '../types/catalog.types';
import {
  type HfModelDetails,
  type HfModelSummary,
} from '../types/hf-search.types';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly repo: CatalogRepository,
    private readonly refreshManager: CatalogRefreshManager,
    private readonly hfDiscovery: HfDiscoveryManager,
  ) {}

  async list(filters: CatalogListFilters): Promise<CatalogListResult> {
    this.logger.debug(`list: filters=${JSON.stringify(filters)}`);
    const { rows, total } = await this.repo.list(filters);
    return { data: rows, total, nextCursor: null };
  }

  async findById(id: string): Promise<CatalogEntry> {
    this.logger.debug(`findById: id=${id}`);
    const entry = await this.repo.findById(id);
    if (!entry) {
      throw new EntityNotFoundException('FrontierCatalogEntry', id);
    }
    return entry;
  }

  async refresh(): Promise<{ refreshed: number; failed: number }> {
    this.logger.log('refresh: triggering catalog refresh');
    const { rows } = await this.repo.list({ limit: 200 });
    return this.refreshManager.refreshAll(rows);
  }

  async searchHuggingFace(query: HfSearchQueryDto): Promise<HfModelSummary[]> {
    return this.hfDiscovery.search(query);
  }

  async getHuggingFaceDetails(repo: string): Promise<HfModelDetails> {
    return this.hfDiscovery.getDetails(repo);
  }

  async addFromHuggingFace(request: HfAddRequestDto): Promise<CatalogEntry> {
    this.logger.log(`addFromHuggingFace: ${request.repo} ${request.quantization}`);
    const details = await this.hfDiscovery.getDetails(request.repo);
    const payload = this.hfDiscovery.buildOnboardingPayload(details, request);
    const paramsHint = this.guessParameterCount(details.tags);
    const sizeGb = Math.max(1, Math.ceil(Number(payload.fileSizeBytes) / 1_073_741_824));
    return this.repo.createImported({
      ...payload,
      category: ModelCategory[request.category],
      qualityTier: QualityTier[request.qualityTier],
      parameterCount: paramsHint.label,
      totalParamsB: paramsHint.billions,
      activeParamsB: paramsHint.billions,
      contextLength: 32_768,
      capabilities: [],
      license: 'Unknown',
      requiredRamGb: Math.max(8, sizeGb),
      recommendedRamGb: Math.max(16, sizeGb * 2),
      requiredDiskGb: sizeGb,
      recommendedGpuVramGb: 6,
    });
  }

  private guessParameterCount(tags: string[]): { label: string; billions: number } {
    for (const tag of tags) {
      const match = /([0-9]+(?:\.[0-9]+)?)\s*[Bb]/.exec(tag);
      if (match) {
        const billions = Math.max(1, Math.round(Number(match[1])));
        return { label: `${match[1]}B`, billions };
      }
    }
    return { label: 'Unknown', billions: 7 };
  }
}
