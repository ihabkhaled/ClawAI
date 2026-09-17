import { mergeProviderResults } from '../utilities/merge-provider-results.utility';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import {
  DEFAULT_PROVIDER_SCORES,
  FETCH_EXTRACT_PROVIDER_SCORES,
  SEARCH_DEFAULT_MAX_RESULTS,
} from '../../../common/constants/search.constants';
import { ProviderSelectionMode } from '../../../common/enums/provider-selection-mode.enum';
import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { SearchRunStatus } from '../../../common/enums/search-run-status.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { DomainPolicyOutcome } from '../../fetch/enums/domain-policy-outcome.enum';
import { evaluateDomainPolicy } from '../../fetch/utilities/domain-policy.utility';
import { toInputJson } from '../../../common/utilities/prisma-json.utility';
import { ResearchUsageService } from '../../../common/services/research-usage.service';
import { SearchAdapterFactory } from '../adapters/search-adapter.factory';
import { SearchProviderRepository } from '../repositories/search-provider.repository';
import { SearchRunRepository } from '../repositories/search-run.repository';
import { SearchProviderService } from './search-provider.service';
import type { ExecuteSearchDto } from '../dto/execute-search.dto';
import type { Prisma, SearchProvider, SearchRun } from '../../../generated/prisma';
import type { SearchExecutionResult } from '../types/search-execution-result.types';
import type { SearchAdapterContext, SearchResult } from '../types/search.types';

@Injectable()
export class SearchExecutionService {
  private readonly logger = new Logger(SearchExecutionService.name);

  constructor(
    private readonly providerRepository: SearchProviderRepository,
    private readonly runRepository: SearchRunRepository,
    private readonly providerService: SearchProviderService,
    private readonly adapterFactory: SearchAdapterFactory,
    private readonly researchUsage: ResearchUsageService,
  ) {}

  async execute(userId: string, dto: ExecuteSearchDto): Promise<SearchExecutionResult> {
    const maxResults = dto.maxResults ?? SEARCH_DEFAULT_MAX_RESULTS;
    const selection = await this.resolveProviders(dto.providerId, dto.filters);
    const run = await this.runRepository.create({
      provider: { connect: { id: selection.primary.id } },
      userId,
      query: dto.query,
      status: SearchRunStatus.RUNNING,
      filters: (dto.filters ?? {}) as Prisma.InputJsonValue,
    });

    const warnings: string[] = [];
    const attemptedProviders: string[] = [];
    const networkCallIds: string[] = [];
    try {
      // Fan out first when more than one provider is configured: each one
      // indexes a different slice of the web, so stopping at the first that
      // answers throws away everything the others found. The chain below is
      // kept as the degraded path — if every fan-out call fails, availability
      // still matters more than breadth.
      const fannedOut =
        selection.candidates.length > 1
          ? await this.executeAcrossProviders(
              selection,
              run,
              dto,
              maxResults,
              attemptedProviders,
              warnings,
              networkCallIds,
            )
          : null;
      if (fannedOut) {
        return fannedOut;
      }
      const result = await this.executeWithFallbackChain(
        selection,
        run,
        dto,
        maxResults,
        attemptedProviders,
        warnings,
        networkCallIds,
      );
      if (result) {
        return result;
      }
      const message = warnings.at(-1) ?? 'Unknown error';
      this.logger.warn(`Search failed for run ${run.id}: ${message}`);
      await this.failRun(run, message);
      throw new BusinessException(
        'research.search.execution_failed',
        ResearchErrorCode.SEARCH_FAILED,
        HttpStatus.BAD_GATEWAY,
        { providerId: selection.primary.id, message },
      );
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      return this.buildEmptyResult(
        run,
        selection,
        dto.query,
        attemptedProviders,
        warnings,
        networkCallIds,
      );
    }
  }

  /**
   * Every provider at once, merged into one ranked list.
   *
   * Runs with allSettled rather than all: one dead provider must not lose the
   * results the others returned, which is the whole failure mode a fallback
   * chain was protecting against. Returns null when nothing came back at all
   * so the caller can fall through to the chain.
   *
   * The run is completed ONCE, with the merged list — completing per provider
   * would leave the run's stored results as whichever call happened to finish
   * last.
   */
  private async executeAcrossProviders(
    selection: {
      primary: SearchProvider;
      candidates: SearchProvider[];
      mode: ProviderSelectionMode;
    },
    run: SearchRun,
    dto: ExecuteSearchDto,
    maxResults: number,
    attemptedProviders: string[],
    warnings: string[],
    networkCallIds: string[],
  ): Promise<SearchExecutionResult | null> {
    const started = Date.now();
    const settled = await Promise.allSettled(
      selection.candidates.map(async (provider) => {
        attemptedProviders.push(provider.name);
        return this.fetchProviderResults(provider, run, dto, maxResults, networkCallIds, warnings);
      }),
    );

    const resultSets: SearchResult[][] = [];
    const contributing: SearchProvider[] = [];
    for (const [index, outcome] of settled.entries()) {
      const provider = selection.candidates[index];
      if (outcome.status === 'fulfilled' && outcome.value !== null && provider !== undefined) {
        resultSets.push(outcome.value);
        contributing.push(provider);
      }
    }

    if (resultSets.length === 0) {
      return null;
    }

    const merged = mergeProviderResults(resultSets).slice(0, maxResults);
    const latencyMs = Date.now() - started;
    await this.completeRun(run, merged, latencyMs);
    if (contributing.length > 1) {
      warnings.push(
        `Combined results from ${contributing.length} providers: ${contributing
          .map((provider) => provider.name)
          .join(', ')}`,
      );
    }

    // Attribute the run to a provider that actually answered. Naming the
    // primary when it failed and another provider supplied every result would
    // hide the outage behind a healthy-looking run, and `fallbackUsed` is what
    // tells an operator the preferred provider is not working.
    const primaryContributed = contributing.some(
      (provider) => provider.id === selection.primary.id,
    );
    const attributed = primaryContributed ? selection.primary : contributing[0];
    if (attributed !== undefined && attributed.id !== run.providerId) {
      await this.runRepository.update(run.id, { provider: { connect: { id: attributed.id } } });
    }

    return {
      runId: run.id,
      providerId: attributed?.id ?? selection.primary.id,
      providerName: attributed?.name ?? selection.primary.name,
      providerKind: attributed?.kind ?? selection.primary.kind,
      selectionMode: selection.mode,
      fallbackUsed: !primaryContributed,
      attemptedProviders,
      searchRequestCount: networkCallIds.length,
      query: dto.query,
      results: merged,
      latencyMs,
      warnings,
    };
  }

  /** The adapter call alone — no run completion, so results can be merged. */
  private async fetchProviderResults(
    provider: SearchProvider,
    run: SearchRun,
    dto: ExecuteSearchDto,
    maxResults: number,
    networkCallIds: string[],
    warnings: string[],
  ): Promise<SearchResult[] | null> {
    try {
      const adapter = this.adapterFactory.getAdapter(provider.kind);
      const context = this.buildMeteredContext(provider, run, networkCallIds);
      const response = await adapter.search(
        { query: dto.query, maxResults, filters: dto.filters },
        context,
      );
      return this.applyDomainPolicy(response.results, provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      warnings.push(`Provider ${provider.name} failed: ${message}`);
      return null;
    }
  }

  private async executeWithFallbackChain(
    selection: {
      primary: SearchProvider;
      candidates: SearchProvider[];
      mode: ProviderSelectionMode;
    },
    run: SearchRun,
    dto: ExecuteSearchDto,
    maxResults: number,
    attemptedProviders: string[],
    warnings: string[],
    networkCallIds: string[],
  ): Promise<SearchExecutionResult | null> {
    for (const provider of selection.candidates) {
      attemptedProviders.push(provider.name);
      const result = await this.tryProvider(
        provider,
        run,
        dto,
        maxResults,
        selection,
        attemptedProviders,
        warnings,
        networkCallIds,
      );
      if (result) {
        return result;
      }
    }
    return null;
  }

  private async tryProvider(
    provider: SearchProvider,
    run: SearchRun,
    dto: ExecuteSearchDto,
    maxResults: number,
    selection: { primary: SearchProvider; mode: ProviderSelectionMode },
    attemptedProviders: string[],
    warnings: string[],
    networkCallIds: string[],
  ): Promise<SearchExecutionResult | null> {
    try {
      const adapter = this.adapterFactory.getAdapter(provider.kind);
      const context = this.buildMeteredContext(provider, run, networkCallIds);
      const response = await adapter.search(
        { query: dto.query, maxResults, filters: dto.filters },
        context,
      );
      const filteredResults = this.applyDomainPolicy(response.results, provider);
      if (provider.id !== selection.primary.id) {
        await this.runRepository.update(run.id, { provider: { connect: { id: provider.id } } });
      }
      if (attemptedProviders.length > 1) {
        warnings.push(
          `Fallback chain used: ${attemptedProviders.slice(0, -1).join(' -> ')} -> ${provider.name}`,
        );
      }
      await this.completeRun(run, filteredResults, response.latencyMs);
      return {
        runId: run.id,
        providerId: provider.id,
        providerName: provider.name,
        providerKind: provider.kind,
        selectionMode: selection.mode,
        fallbackUsed: attemptedProviders.length > 1,
        attemptedProviders,
        searchRequestCount: networkCallIds.length,
        query: dto.query,
        results: filteredResults,
        latencyMs: response.latencyMs,
        warnings: [...(response.warnings ?? []), ...warnings],
      };
    } catch (error) {
      const lastError = error instanceof Error ? error.message : 'Unknown error';
      warnings.push(`Provider ${provider.name} failed: ${lastError}`);
      return null;
    }
  }

  private buildMeteredContext(
    provider: SearchProvider,
    run: SearchRun,
    networkCallIds: string[],
  ): SearchAdapterContext {
    const baseContext = this.providerService.buildContext(provider);
    return {
      ...baseContext,
      onNetworkCall: async (): Promise<void> => {
        const requestId = `${run.id}:${provider.id}:${String(networkCallIds.length + 1)}`;
        networkCallIds.push(requestId);
        await this.researchUsage.record(run.userId, 'WEB_SEARCH', requestId);
      },
    };
  }

  private buildEmptyResult(
    run: SearchRun,
    selection: { primary: SearchProvider; mode: ProviderSelectionMode },
    query: string,
    attemptedProviders: string[],
    warnings: string[],
    networkCallIds: string[],
  ): SearchExecutionResult {
    return {
      runId: run.id,
      providerId: selection.primary.id,
      providerName: selection.primary.name,
      providerKind: selection.primary.kind,
      selectionMode: selection.mode,
      fallbackUsed: attemptedProviders.length > 1,
      attemptedProviders,
      searchRequestCount: networkCallIds.length,
      query,
      results: [],
      latencyMs: 0,
      warnings,
    };
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

  private async resolveProviders(
    providerId?: string,
    filters?: Record<string, unknown>,
  ): Promise<{
    primary: SearchProvider;
    candidates: SearchProvider[];
    mode: ProviderSelectionMode;
  }> {
    if (providerId !== undefined) {
      const provider = await this.providerRepository.findById(providerId);
      if (provider === null) {
        throw new EntityNotFoundException('SearchProvider', providerId);
      }
      this.assertEnabled(provider);
      return { primary: provider, candidates: [provider], mode: ProviderSelectionMode.EXPLICIT };
    }

    const enabled = await this.providerRepository.findEnabled();
    if (enabled.length === 0) {
      throw new BusinessException(
        'research.search.no_enabled_provider',
        ResearchErrorCode.NO_ENABLED_PROVIDER,
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    const ranked = [...enabled].sort(
      (left, right) =>
        this.scoreProvider(right.kind, filters) - this.scoreProvider(left.kind, filters),
    );
    const primary = ranked[0];
    if (primary === undefined) {
      throw new BusinessException(
        'research.search.no_enabled_provider',
        ResearchErrorCode.NO_ENABLED_PROVIDER,
        HttpStatus.FAILED_DEPENDENCY,
      );
    }
    return { primary, candidates: ranked, mode: ProviderSelectionMode.AUTO };
  }

  private scoreProvider(kind: string, filters?: Record<string, unknown>): number {
    const workflow = this.extractWorkflow(filters);
    const isFetchExtract = workflow.includes('FETCH') || workflow.includes('EXTRACT');
    const scoreMap = isFetchExtract ? FETCH_EXTRACT_PROVIDER_SCORES : DEFAULT_PROVIDER_SCORES;
    return scoreMap.get(kind) ?? 10;
  }

  private extractWorkflow(filters?: Record<string, unknown>): string {
    const value = filters
      ? Object.entries(filters).find(([k]) => k === 'researchWorkflow')?.[1]
      : undefined;
    return typeof value === 'string' ? value : '';
  }

  private assertEnabled(provider: SearchProvider): void {
    if (!provider.enabled || provider.status !== 'ACTIVE') {
      throw new BusinessException(
        'research.search.provider_disabled',
        ResearchErrorCode.PROVIDER_DISABLED,
        HttpStatus.FAILED_DEPENDENCY,
        { providerId: provider.id, status: provider.status },
      );
    }
  }

  private applyDomainPolicy(results: SearchResult[], provider: SearchProvider): SearchResult[] {
    return results.filter((item) => {
      const outcome = evaluateDomainPolicy(
        item.url,
        provider.allowlistDomains,
        provider.blocklistDomains,
      ).outcome;
      return outcome === DomainPolicyOutcome.ALLOWED;
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
      results: toInputJson(results),
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
