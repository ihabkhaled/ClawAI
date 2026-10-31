import { mergeProviderResults } from '../utilities/merge-provider-results.utility';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import {
  DEFAULT_PROVIDER_SCORES,
  FETCH_EXTRACT_PROVIDER_SCORES,
  SEARCH_AUTO_CEILING_MS,
  SEARCH_DEFAULT_MAX_RESULTS,
  SEARCH_DEFAULT_TIMEOUT_MS,
} from '../../../common/constants/search.constants';
import { ProviderSelectionMode } from '../../../common/enums/provider-selection-mode.enum';
import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { SearchExecutionMode } from '../../../common/enums/search-execution-mode.enum';
import { SearchProviderRunStatus } from '../../../common/enums/search-provider-run-status.enum';
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
import { SearchProviderHealthService } from './search-provider-health.service';
import { SearchProviderService } from './search-provider.service';
import { classifySearchError } from '../utilities/classify-search-error.utility';
import type { ExecuteSearchDto } from '../dto/execute-search.dto';
import type { Prisma, SearchProvider, SearchRun } from '../../../generated/prisma';
import type {
  ProviderCallEntry,
  ProviderSelection,
} from '../types/search-provider-selection.types';
import type {
  SearchExecutionResult,
  SearchProviderOutcome,
} from '../types/search-execution-result.types';
import type { SearchAdapterContext, SearchResult } from '../types/search.types';

/** Raised when a provider outlives its bound; classified as TIMEOUT. */
class SearchProviderTimeoutError extends Error {
  constructor(boundMs: number) {
    super(`Search provider timed out after ${String(boundMs)}ms`);
    this.name = 'TimeoutError';
  }
}

@Injectable()
export class SearchExecutionService {
  private readonly logger = new Logger(SearchExecutionService.name);

  constructor(
    private readonly providerRepository: SearchProviderRepository,
    private readonly runRepository: SearchRunRepository,
    private readonly providerService: SearchProviderService,
    private readonly adapterFactory: SearchAdapterFactory,
    private readonly researchUsage: ResearchUsageService,
    private readonly health: SearchProviderHealthService,
  ) {}

  async execute(userId: string, dto: ExecuteSearchDto): Promise<SearchExecutionResult> {
    const maxResults = dto.maxResults ?? SEARCH_DEFAULT_MAX_RESULTS;
    const selection = await this.resolveProviders(dto.providerId, dto.filters);
    const run = await this.startRun(userId, dto, selection);

    const warnings: string[] = [];
    const attemptedProviders: string[] = [];
    const networkCallIds: string[] = [];
    // The run must always leave RUNNING: whatever throws below, the catch marks
    // it FAILED unless a terminal state was already written.
    let terminal = false;
    try {
      const entries = await this.runProviders(
        selection,
        run,
        dto,
        maxResults,
        attemptedProviders,
        warnings,
        networkCallIds,
      );
      if (entries.every((entry) => entry.results === null)) {
        terminal = true;
        await this.failAllProviders(run, selection, entries, warnings);
      }
      const result = this.assembleResult(
        selection,
        run,
        dto,
        maxResults,
        entries,
        attemptedProviders,
        warnings,
        networkCallIds,
      );
      await this.completeRun(run, result.results, result.latencyMs);
      terminal = true;
      await this.attributeRun(run, result.providerId);
      return result;
    } catch (error) {
      if (!terminal) {
        await this.failRunQuietly(run, error);
      }
      return this.emptyUnlessBusiness(error, run, selection, dto.query, [
        attemptedProviders,
        warnings,
        networkCallIds,
      ]);
    }
  }

  /** A business error propagates; anything else degrades to an empty result. */
  private emptyUnlessBusiness(
    error: unknown,
    run: SearchRun,
    selection: ProviderSelection,
    query: string,
    [attemptedProviders, warnings, networkCallIds]: [string[], string[], string[]],
  ): SearchExecutionResult {
    if (error instanceof BusinessException) {
      throw error;
    }
    return this.buildEmptyResult(
      run,
      selection,
      query,
      attemptedProviders,
      warnings,
      networkCallIds,
    );
  }

  private startRun(
    userId: string,
    dto: ExecuteSearchDto,
    selection: ProviderSelection,
  ): Promise<SearchRun> {
    return this.runRepository.create({
      provider: { connect: { id: selection.primary.id } },
      userId,
      query: dto.query,
      status: SearchRunStatus.RUNNING,
      filters: (dto.filters ?? {}) as Prisma.InputJsonValue,
    });
  }

  /**
   * Every provider was already tried exactly once, in parallel. There is no
   * second round: it would double the calls and the metered units.
   */
  private async failAllProviders(
    run: SearchRun,
    selection: ProviderSelection,
    entries: ProviderCallEntry[],
    warnings: string[],
  ): Promise<never> {
    const message = warnings.at(-1) ?? 'Unknown error';
    this.logger.warn(`Search failed for run ${run.id}: ${message}`);
    await this.failRun(run, message);
    throw new BusinessException(
      'research.search.execution_failed',
      ResearchErrorCode.SEARCH_FAILED,
      HttpStatus.BAD_GATEWAY,
      {
        providerId: selection.primary.id,
        message,
        providers: entries.map((entry) => entry.outcome),
      },
    );
  }

  /**
   * Every candidate at once; resolves only when ALL of them have settled
   * (success, failure, or their own timeout). No quorum, no early return: the
   * model must not start answering before every provider has answered or timed
   * out. `callProvider` never rejects, so Promise.all here is allSettled.
   */
  private async runProviders(
    selection: ProviderSelection,
    run: SearchRun,
    dto: ExecuteSearchDto,
    maxResults: number,
    attemptedProviders: string[],
    warnings: string[],
    networkCallIds: string[],
  ): Promise<ProviderCallEntry[]> {
    const callable = this.selectCallable(selection);
    return Promise.all(
      selection.candidates.map(async (provider): Promise<ProviderCallEntry> => {
        if (!callable.has(provider.id)) {
          const outcome = this.buildOutcome(provider, SearchProviderRunStatus.SKIPPED, 0, 0, {
            code: ResearchErrorCode.PROVIDER_UNAVAILABLE,
          });
          this.observe(run, outcome);
          warnings.push(`Provider ${provider.name} skipped: circuit open`);
          return { provider, outcome, results: null, providerWarnings: [] };
        }
        attemptedProviders.push(provider.name);
        return this.callProvider(
          provider,
          run,
          dto,
          maxResults,
          selection,
          networkCallIds,
          warnings,
        );
      }),
    );
  }

  /**
   * AUTO only: providers whose breaker is open are skipped so a dead one stops
   * costing every search its full timeout. Never skips everyone: if every
   * breaker is open the search still tries them all (availability over speed).
   */
  private selectCallable(selection: ProviderSelection): Set<string> {
    const all = new Set(selection.candidates.map((provider) => provider.id));
    if (selection.executionMode === SearchExecutionMode.EXPLICIT) {
      return all;
    }
    if (selection.candidates.every((provider) => this.health.isOpen(provider.id))) {
      return all;
    }
    const callable = new Set<string>();
    for (const provider of selection.candidates) {
      if (this.health.allow(provider.id)) {
        callable.add(provider.id);
      }
    }
    return callable;
  }

  /** One provider, bounded by its own timeout. Never rejects. */
  private async callProvider(
    provider: SearchProvider,
    run: SearchRun,
    dto: ExecuteSearchDto,
    maxResults: number,
    selection: ProviderSelection,
    networkCallIds: string[],
    warnings: string[],
  ): Promise<ProviderCallEntry> {
    const started = Date.now();
    const bounded = selection.executionMode === SearchExecutionMode.AUTO_ALL;
    const boundMs = this.boundFor(provider, bounded);
    try {
      const adapter = this.adapterFactory.getAdapter(provider.kind);
      const context = this.buildMeteredContext(provider, run, networkCallIds);
      if (bounded) {
        context.timeoutMs = boundMs;
      }
      const call = adapter.search({ query: dto.query, maxResults, filters: dto.filters }, context);
      const response = await this.awaitBounded(call, bounded, boundMs);
      const results = this.applyDomainPolicy(response.results, provider);
      this.health.recordSuccess(provider.id);
      const outcome = this.buildOutcome(
        provider,
        SearchProviderRunStatus.OK,
        Date.now() - started,
        results.length,
      );
      this.observe(run, outcome);
      return { provider, outcome, results, providerWarnings: response.warnings ?? [] };
    } catch (error) {
      return this.failedEntry(provider, run, error, Date.now() - started, warnings);
    }
  }

  /**
   * Awaits the adapter call; when bounded, a timer rejects it after `boundMs`.
   * If the timer wins, the adapter promise may still reject later: swallow it
   * so it cannot surface as an unhandled rejection.
   */
  private async awaitBounded<T>(call: Promise<T>, bounded: boolean, boundMs: number): Promise<T> {
    if (!bounded) {
      return call;
    }
    call.catch(() => {});
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        call,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            reject(new SearchProviderTimeoutError(boundMs));
          }, boundMs);
        }),
      ]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }

  private failedEntry(
    provider: SearchProvider,
    run: SearchRun,
    error: unknown,
    latencyMs: number,
    warnings: string[],
  ): ProviderCallEntry {
    const classified = classifySearchError(error);
    this.health.recordFailure(provider.id);
    const outcome = this.buildOutcome(provider, classified.status, latencyMs, 0, {
      code: classified.code,
    });
    this.observe(run, outcome);
    const message = error instanceof Error ? error.message : 'Unknown error';
    warnings.push(`Provider ${provider.name} failed: ${message}`);
    return { provider, outcome, results: null, providerWarnings: [] };
  }

  private boundFor(provider: SearchProvider, bounded: boolean): number {
    const own = provider.timeoutMs;
    const valid = Number.isFinite(own) && own > 0 ? own : SEARCH_DEFAULT_TIMEOUT_MS;
    return bounded ? Math.min(valid, SEARCH_AUTO_CEILING_MS) : valid;
  }

  private buildOutcome(
    provider: SearchProvider,
    status: SearchProviderRunStatus,
    latencyMs: number,
    resultCount: number,
    failure?: { code: ResearchErrorCode },
  ): SearchProviderOutcome {
    return {
      name: provider.name,
      kind: String(provider.kind),
      status,
      latencyMs,
      resultCount,
      errorCode: failure?.code ?? null,
    };
  }

  /** One structured line and one counter per provider per search. No secrets, no error bodies. */
  private observe(run: SearchRun, outcome: SearchProviderOutcome): void {
    this.health.count(outcome.name, outcome.status);
    this.logger.log(
      `search.provider run=${run.id} provider=${outcome.name} kind=${outcome.kind} status=${outcome.status} latencyMs=${String(outcome.latencyMs)} results=${String(outcome.resultCount)} code=${outcome.errorCode ?? 'none'}`,
    );
  }

  private assembleResult(
    selection: ProviderSelection,
    run: SearchRun,
    dto: ExecuteSearchDto,
    maxResults: number,
    entries: ProviderCallEntry[],
    attemptedProviders: string[],
    warnings: string[],
    networkCallIds: string[],
  ): SearchExecutionResult {
    const contributing = entries.filter((entry) => entry.results !== null);
    const explicit = selection.executionMode === SearchExecutionMode.EXPLICIT;
    this.collectProviderWarnings(contributing, explicit, warnings);
    const results = this.mergeResults(contributing, explicit, maxResults);
    if (contributing.length > 1) {
      warnings.push(
        `Combined results from ${String(contributing.length)} providers: ${contributing
          .map((entry) => entry.provider.name)
          .join(', ')}`,
      );
    }
    // Attribute the run to a provider that actually answered. Naming the
    // primary when it failed and another supplied every result would hide the
    // outage behind a healthy-looking run; `fallbackUsed` is what tells an
    // operator the preferred provider is not working.
    const primaryContributed = contributing.some(
      (entry) => entry.provider.id === selection.primary.id,
    );
    const attributed = primaryContributed ? selection.primary : contributing[0]?.provider;
    return {
      runId: run.id,
      providerId: attributed?.id ?? selection.primary.id,
      providerName: attributed?.name ?? selection.primary.name,
      providerKind: attributed?.kind ?? selection.primary.kind,
      selectionMode: selection.mode,
      mode: selection.executionMode,
      providers: entries.map((entry) => entry.outcome),
      fallbackUsed: !primaryContributed,
      attemptedProviders,
      searchRequestCount: networkCallIds.length,
      query: dto.query,
      results,
      latencyMs: Math.max(0, ...entries.map((entry) => entry.outcome.latencyMs)),
      warnings,
    };
  }

  private collectProviderWarnings(
    contributing: ProviderCallEntry[],
    explicit: boolean,
    warnings: string[],
  ): void {
    for (const entry of contributing) {
      for (const warning of entry.providerWarnings) {
        warnings.push(explicit ? warning : `${entry.provider.name}: ${warning}`);
      }
    }
  }

  /**
   * EXPLICIT keeps the provider's own scores and order; AUTO re-scores by rank
   * so providers with different score scales are comparable.
   */
  private mergeResults(
    contributing: ProviderCallEntry[],
    explicit: boolean,
    maxResults: number,
  ): SearchExecutionResult['results'] {
    if (explicit) {
      return contributing[0]?.results ?? [];
    }
    return mergeProviderResults(
      contributing.map((entry) => ({
        provider: entry.provider.name,
        results: entry.results ?? [],
      })),
    ).slice(0, maxResults);
  }

  private async attributeRun(run: SearchRun, providerId: string): Promise<void> {
    if (providerId !== run.providerId) {
      await this.runRepository.update(run.id, { provider: { connect: { id: providerId } } });
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
    selection: ProviderSelection,
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
      mode: selection.executionMode,
      providers: [],
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
  ): Promise<ProviderSelection> {
    if (providerId !== undefined) {
      const provider = await this.providerRepository.findById(providerId);
      if (provider === null) {
        throw new EntityNotFoundException('SearchProvider', providerId);
      }
      this.assertEnabled(provider);
      return {
        primary: provider,
        candidates: [provider],
        mode: ProviderSelectionMode.EXPLICIT,
        executionMode: SearchExecutionMode.EXPLICIT,
      };
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
    return {
      primary,
      candidates: ranked,
      mode: ProviderSelectionMode.AUTO,
      executionMode: SearchExecutionMode.AUTO_ALL,
    };
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

  /** Terminal-state write on an error path: must never throw over the original error. */
  private async failRunQuietly(run: SearchRun, error: unknown): Promise<void> {
    try {
      await this.failRun(run, error instanceof Error ? error.message : 'Unknown error');
    } catch (failure) {
      this.logger.error(
        `Could not mark search run ${run.id} FAILED: ${failure instanceof Error ? failure.message : 'unknown'}`,
      );
    }
  }

  private async failRun(run: SearchRun, errorMessage: string): Promise<void> {
    await this.runRepository.update(run.id, {
      status: SearchRunStatus.FAILED,
      errorMessage,
      completedAt: new Date(),
    });
  }
}
