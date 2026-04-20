import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { SEARCH_DEFAULT_MAX_RESULTS } from '../../../common/constants/search.constants';
import { SearchRunStatus } from '../../../common/enums/search-run-status.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { SearchAdapterFactory } from '../adapters/search-adapter.factory';
import { SearchProviderRepository } from '../repositories/search-provider.repository';
import { SearchRunRepository } from '../repositories/search-run.repository';
import { SearchProviderService } from './search-provider.service';
import type { ExecuteSearchDto } from '../dto/execute-search.dto';
import type { Prisma, SearchProvider, SearchRun } from '../../../generated/prisma';
import type { SearchExecutionResult } from '../types/search-execution-result.types';
import type { SearchResult } from '../types/search.types';

@Injectable()
export class SearchExecutionService {
  private readonly logger = new Logger(SearchExecutionService.name);

  constructor(
    private readonly providerRepository: SearchProviderRepository,
    private readonly runRepository: SearchRunRepository,
    private readonly providerService: SearchProviderService,
    private readonly adapterFactory: SearchAdapterFactory,
  ) {}

  async execute(userId: string, dto: ExecuteSearchDto): Promise<SearchExecutionResult> {
    const provider = await this.resolveProvider(dto.providerId);
    this.assertEnabled(provider);
    const maxResults = dto.maxResults ?? SEARCH_DEFAULT_MAX_RESULTS;
    const run = await this.runRepository.create({
      provider: { connect: { id: provider.id } },
      userId,
      query: dto.query,
      status: SearchRunStatus.RUNNING,
      filters: (dto.filters ?? {}) as Prisma.InputJsonValue,
    });

    try {
      const adapter = this.adapterFactory.getAdapter(provider.kind);
      const context = this.providerService.buildContext(provider);
      const response = await adapter.search(
        { query: dto.query, maxResults, filters: dto.filters },
        context,
      );
      const filteredResults = this.applyDomainPolicy(response.results, provider);
      await this.completeRun(run, filteredResults, response.latencyMs);
      return {
        runId: run.id,
        providerId: provider.id,
        providerName: provider.name,
        providerKind: provider.kind,
        query: dto.query,
        results: filteredResults,
        latencyMs: response.latencyMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Search failed for run ${run.id}: ${message}`);
      await this.failRun(run, message);
      throw new BusinessException(
        'research.search.execution_failed',
        'SEARCH_FAILED',
        HttpStatus.BAD_GATEWAY,
        { providerId: provider.id, message },
      );
    }
  }

  async getRun(id: string, userId: string): Promise<SearchRun> {
    const run = await this.runRepository.findById(id, userId);
    if (run === null) {
      throw new EntityNotFoundException('SearchRun', id);
    }
    return run;
  }

  async listRuns(userId: string, limit: number): Promise<SearchRun[]> {
    return this.runRepository.listByUser(userId, limit);
  }

  private async resolveProvider(providerId?: string): Promise<SearchProvider> {
    if (providerId !== undefined) {
      const provider = await this.providerRepository.findById(providerId);
      if (provider === null) {
        throw new EntityNotFoundException('SearchProvider', providerId);
      }
      return provider;
    }
    const first = await this.providerRepository.findFirstEnabled();
    if (first === null) {
      throw new BusinessException(
        'research.search.no_enabled_provider',
        'NO_ENABLED_PROVIDER',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }
    return first;
  }

  private assertEnabled(provider: SearchProvider): void {
    if (!provider.enabled || provider.status !== 'ACTIVE') {
      throw new BusinessException(
        'research.search.provider_disabled',
        'PROVIDER_DISABLED',
        HttpStatus.FAILED_DEPENDENCY,
        { providerId: provider.id, status: provider.status },
      );
    }
  }

  private applyDomainPolicy(results: SearchResult[], provider: SearchProvider): SearchResult[] {
    const allow = new Set(provider.allowlistDomains);
    const block = new Set(provider.blocklistDomains);
    return results.filter((item) => {
      let host: string;
      try {
        host = new URL(item.url).hostname;
      } catch {
        return false;
      }
      if (block.has(host)) {
        return false;
      }
      if (allow.size > 0 && !allow.has(host)) {
        return false;
      }
      return true;
    });
  }

  private async completeRun(
    run: SearchRun,
    results: SearchResult[],
    latencyMs: number,
  ): Promise<void> {
    await this.runRepository.update(run.id, {
      status: SearchRunStatus.COMPLETED,
      resultCount: results.length,
      results: results as unknown as Prisma.InputJsonValue,
      latencyMs,
      completedAt: new Date(),
    });
  }

  private async failRun(run: SearchRun, errorMessage: string): Promise<void> {
    await this.runRepository.update(run.id, {
      status: SearchRunStatus.FAILED,
      errorMessage,
      completedAt: new Date(),
    });
  }
}
