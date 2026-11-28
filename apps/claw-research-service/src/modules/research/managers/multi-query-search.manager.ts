import { Injectable } from '@nestjs/common';

import {
  LANGUAGE_AWARE_PROVIDER_KINDS,
  RESEARCH_PRIMARY_EXPANSION_ONLY_FROM_ROUND,
  RESEARCH_RRF_PLATFORM_WEIGHT,
  RESEARCH_RRF_PRIMARY_WEIGHT,
} from '../../../common/constants/research-engine.constants';
import { ProviderSelectionMode } from '../../../common/enums/provider-selection-mode.enum';
import { SearchProviderRunStatus } from '../../../common/enums/search-provider-run-status.enum';
import { describeFetchFailure } from '../../../common/utilities/describe-fetch-failure.utility';
import { clampSearchQuery } from '../../../common/utilities/search-query.utility';
import { PlatformSearchService } from '../../platforms/services/platform-search.service';
import {
  siteQueryOf,
  urlMatchesPlatform,
} from '../../platforms/utilities/platform-matching.utility';
import { SearchExecutionService } from '../../search/services/search-execution.service';
import { searchResultToEvidence, traceEntry } from '../utilities/evidence-builder.utility';
import {
  isPlatformRun,
  planPlatformRun,
  splitQueryBudget,
  tagResultByHost,
} from '../utilities/platform-plan.utility';
import { planExpansionQueries } from '../utilities/query-expansion.utility';
import { fuseQueryResults } from '../utilities/query-fusion.utility';
import type { ExecuteResearchDto } from '../dto/execute-research.dto';
import type { ExecuteSearchDto } from '../../search/dto/execute-search.dto';
import type { PlatformApiOutcome } from '../../platforms/types/platform.types';
import type { SearchExecutionResult } from '../../search/types/search-execution-result.types';
import type {
  EvidenceBundle,
  EvidenceItem,
  ResearchTraceEntry,
} from '../types/evidence-bundle.types';
import type {
  ExpansionOutcome,
  PlatformRunPlan,
  QueryResultSet,
  SearchPhaseAnswers,
  SearchPhasePlan,
  SiteSearchOutcome,
} from '../types/research-engine.types';
import type { ResearchRunState } from '../utilities/research-run-state.utility';

/**
 * The search phase of an engine run (research engine B2 + B3).
 *
 * The PRIMARY query (`searchQuery ?? intent`, clamped) runs on every enabled +
 * ACTIVE provider (ADR-210) in round 1; from round 2 on it runs on expansion
 * providers only, so a paid provider answers once per chat turn. EXPANSION
 * queries (the caller's `queries`, deduped, capped by the depth budget) run in
 * parallel on expansion providers only (cost rule). A platform run (B3: depth
 * >= 2 and `platforms`) adds, in parallel, the registry's official APIs of the
 * asked categories and `site:<domain> <primary>` searches on expansion
 * providers, which share the depth query budget. Everything is fused by
 * reciprocal rank, deduped by canonical URL, keeping the first query that
 * found each page. The Redis cache serves a repeat query with no provider
 * call; an explicit provider or caller filters bypass it.
 */
@Injectable()
export class MultiQuerySearchManager {
  constructor(
    private readonly searchService: SearchExecutionService,
    private readonly platformSearch: PlatformSearchService,
  ) {}

  async run(
    userId: string,
    dto: ExecuteResearchDto,
    state: ResearchRunState,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
  ): Promise<{ items: EvidenceItem[]; providerSelection: EvidenceBundle['providerSelection'] }> {
    const start = Date.now();
    const clamped = clampSearchQuery(dto.searchQuery ?? dto.intent);
    if (clamped.truncated) {
      warnings.push(
        `The search query was shortened to ${String(clamped.query.length)} characters; ` +
          `your full message was still used for everything else.`,
      );
    }
    const plan = isPlatformRun(dto, state.depth) ? await this.loadPlan(dto) : null;
    const phase = this.phasePlan(dto, state, clamped.query, plan, trace);
    const answers = await this.executeAll(userId, phase);
    const searchOutcomes = [...answers.outcomes, ...answers.sites.map((site) => site.outcome)];
    if (answers.primary === null) {
      warnings.push(
        'The main search query was skipped in this follow-up round: no search provider is enabled for query expansion.',
      );
    }
    warnings.push(...(answers.primary?.warnings ?? []), ...this.expansionWarnings(searchOutcomes));
    const all = [
      ...(answers.primary === null ? [] : [{ query: clamped.query, result: answers.primary }]),
      ...this.answered(searchOutcomes),
    ];
    const results = all.map(({ result }) => result);
    const fused = fuseQueryResults([
      ...all.map(({ query, result }): QueryResultSet => ({
        query,
        results: result.results,
        ...(result === answers.primary ? { weight: RESEARCH_RRF_PRIMARY_WEIGHT } : {}),
      })),
      ...answers.apis.map((api): QueryResultSet => ({
        query: clamped.query,
        results: api.results,
        weight: RESEARCH_RRF_PLATFORM_WEIGHT,
      })),
    ])
      .map((result) => (plan === null ? result : tagResultByHost(result, plan.all)))
      .filter((result) => !state.excludes(result.url));
    state.recordSearch({
      queries: all.map(({ query }) => query),
      cachedSearches: results.filter((result) => result.cached === true).length,
      providersUsed: this.providersThatAnswered(results),
      resultsFound: fused.length,
    });
    if (plan !== null) {
      this.finishPlatformRun(plan, answers, results, state, trace, warnings);
    }
    this.markTools(toolsUsed, results);
    const answeredExtras = all.length - (answers.primary === null ? 0 : 1);
    this.traceSearch(
      trace,
      answers.primary,
      answeredExtras,
      searchOutcomes.length,
      Date.now() - start,
    );
    return {
      items: fused.map((result) => searchResultToEvidence(result)),
      providerSelection: this.selectionOf(answers.primary),
    };
  }

  /** What this run's search phase will send: queries in budget, the shared request base, cache use. */
  private phasePlan(
    dto: ExecuteResearchDto,
    state: ResearchRunState,
    primaryQuery: string,
    plan: PlatformRunPlan | null,
    trace: ResearchTraceEntry[],
  ): SearchPhasePlan {
    const { expansions, siteRows } = this.planQueries(dto, state, primaryQuery, plan, trace);
    const queryLanguage = plan?.queryLanguage ?? null;
    return {
      primaryQuery,
      expansions,
      siteRows,
      plan,
      round: state.round,
      useCache: dto.searchProviderId === undefined && Object.keys(dto.filters ?? {}).length === 0,
      base: {
        providerId: dto.searchProviderId,
        maxResults: dto.maxResults,
        filters: {
          ...(dto.filters ?? {}),
          researchWorkflow: dto.workflow,
          researchMode: dto.mode,
          ...(queryLanguage === null ? {} : { language: queryLanguage }),
        },
      },
    };
  }

  /** Primary, expansions, site searches and official APIs, all at once; resolves when all settled. */
  private async executeAll(userId: string, phase: SearchPhasePlan): Promise<SearchPhaseAnswers> {
    const { base, useCache, plan } = phase;
    const [primary, outcomes, sites, apis] = await Promise.all([
      this.runPrimary(userId, { ...base, query: phase.primaryQuery }, useCache, phase.round),
      Promise.all(
        phase.expansions.map((query) => this.runExpansion(userId, { ...base, query }, useCache)),
      ),
      Promise.all(
        phase.siteRows.map(async (platform): Promise<SiteSearchOutcome> => {
          const query = siteQueryOf(platform, phase.primaryQuery);
          return {
            platform,
            outcome: await this.runExpansion(userId, { ...base, query }, useCache),
          };
        }),
      ),
      plan === null || plan.api.length === 0
        ? Promise.resolve<PlatformApiOutcome[]>([])
        : this.platformSearch.runApiPlatforms(
            userId,
            plan.api,
            phase.primaryQuery,
            plan.wikipediaLanguages,
          ),
    ]);
    return { primary, outcomes, sites, apis };
  }

  /**
   * The primary query. Round 1 (or no round): every enabled provider, exactly
   * B2. Round >= 2: expansion providers only (cost rule); null when none is
   * enabled, which the caller reports as one warning, never silence.
   */
  async runPrimary(
    userId: string,
    dto: ExecuteSearchDto,
    useCache: boolean,
    round: number,
  ): Promise<SearchExecutionResult | null> {
    return round < RESEARCH_PRIMARY_EXPANSION_ONLY_FROM_ROUND
      ? this.searchService.executeCached(userId, dto, useCache)
      : this.searchService.executeExpansion(userId, dto, useCache);
  }

  /** One expansion (or site) query; never rejects (a failure becomes the outcome's error). */
  async runExpansion(
    userId: string,
    dto: ExecuteSearchDto,
    useCache: boolean,
  ): Promise<ExpansionOutcome> {
    try {
      const result = await this.searchService.executeExpansion(userId, dto, useCache);
      return { query: dto.query, result, error: null };
    } catch (error) {
      return { query: dto.query, result: null, error: describeFetchFailure(error) };
    }
  }

  /** One warning when no expansion provider exists, one per failed expansion query. */
  expansionWarnings(outcomes: readonly ExpansionOutcome[]): string[] {
    const warnings: string[] = [];
    if (outcomes.some((outcome) => outcome.result === null && outcome.error === null)) {
      warnings.push(
        'Extra search queries were skipped: no search provider is enabled for query expansion.',
      );
    }
    for (const outcome of outcomes) {
      if (outcome.error !== null) {
        warnings.push(`An extra search query failed: ${outcome.error}`);
      }
    }
    return warnings;
  }

  /** Provider names that answered at least one query (a cached answer counts). */
  providersThatAnswered(results: readonly SearchExecutionResult[]): string[] {
    const names = new Set<string>();
    for (const result of results) {
      for (const outcome of result.providers) {
        if (outcome.status === SearchProviderRunStatus.OK) {
          names.add(outcome.name);
        }
      }
    }
    return [...names];
  }

  /** The registry read of a platform run: one query, then a pure pick. */
  private async loadPlan(dto: ExecuteResearchDto): Promise<PlatformRunPlan> {
    return planPlatformRun(
      await this.platformSearch.loadEnabled(),
      dto.platforms ?? [],
      dto.languages ?? [],
      dto.searchProviderId !== undefined,
    );
  }

  /** Expansion queries and site searches that fit the depth budget (site searches share it). */
  private planQueries(
    dto: ExecuteResearchDto,
    state: ResearchRunState,
    primary: string,
    plan: PlatformRunPlan | null,
    trace: ResearchTraceEntry[],
  ): { expansions: string[]; siteRows: PlatformRunPlan['site'] } {
    const planned = planExpansionQueries(primary, dto.queries ?? [], state.expansionCap);
    if ((dto.queries?.length ?? 0) > 0 && state.expansionCap === 0) {
      trace.push(traceEntry('search.expansion', 'skipped', null, 'depth allows no extra queries'));
    }
    const split = splitQueryBudget(state.expansionCap, planned.length, plan?.site.length ?? 0);
    return {
      expansions: planned.slice(0, split.expansions),
      siteRows: plan?.site.slice(0, split.site) ?? [],
    };
  }

  private answered(
    outcomes: readonly ExpansionOutcome[],
  ): Array<{ query: string; result: SearchExecutionResult }> {
    return outcomes.flatMap((outcome) =>
      outcome.result === null ? [] : [{ query: outcome.query, result: outcome.result }],
    );
  }

  /**
   * B3 counters, warnings and trace. `platforms` = platforms that returned at
   * least one result (an API with hits; a site search with a hit ON its own
   * domain, so a provider ignoring `site:` is not credited). `languages` =
   * Wikipedia editions that answered, plus the query language when a
   * language-aware provider answered with it. Measured, never guessed.
   */
  private finishPlatformRun(
    plan: PlatformRunPlan,
    { sites, apis }: SearchPhaseAnswers,
    searches: readonly SearchExecutionResult[],
    state: ResearchRunState,
    trace: ResearchTraceEntry[],
    warnings: string[],
  ): void {
    const returned = new Set<string>();
    for (const api of apis) {
      if (api.ok && api.results.length > 0) {
        returned.add(api.slug);
      } else if (!api.ok) {
        const edition = api.language === null ? '' : ` ${api.language}`;
        warnings.push(
          `A research platform did not answer: ${api.name}${edition} (${api.errorCode ?? 'error'}).`,
        );
      }
    }
    for (const { platform, outcome } of sites) {
      if (
        outcome.result?.results.some((result) => urlMatchesPlatform(result.url, platform)) === true
      ) {
        returned.add(platform.slug);
      }
    }
    const languages = new Set(
      apis.flatMap((api) => (api.ok && api.language !== null ? [api.language] : [])),
    );
    if (plan.queryLanguage !== null && this.languageHonoured(searches)) {
      languages.add(plan.queryLanguage);
    }
    state.recordPlatforms(plan.all, { platforms: [...returned], languages: [...languages] });
    const answered = apis.filter((api) => api.ok).length;
    trace.push(
      traceEntry(
        'platforms',
        answered === apis.length ? 'ok' : 'warning',
        Math.max(0, ...apis.map((api) => api.latencyMs)),
        `${String(answered)}/${String(apis.length)} platform API calls answered; ${String(sites.length)} site searches; ${String(returned.size)} platforms returned results`,
      ),
    );
  }

  /** Whether a provider that reads `filters.language` answered any query. */
  private languageHonoured(results: readonly SearchExecutionResult[]): boolean {
    return results.some((result) =>
      result.providers.some(
        (outcome) =>
          outcome.status === SearchProviderRunStatus.OK &&
          LANGUAGE_AWARE_PROVIDER_KINDS.has(outcome.kind),
      ),
    );
  }

  private selectionOf(primary: SearchExecutionResult | null): EvidenceBundle['providerSelection'] {
    if (primary === null) {
      return {
        providerId: null,
        providerName: null,
        providerKind: null,
        selectionMode: ProviderSelectionMode.NONE,
        fallbackUsed: false,
        attemptedProviders: [],
      };
    }
    return {
      providerId: primary.providerId,
      providerName: primary.providerName,
      providerKind: primary.providerKind,
      selectionMode: primary.selectionMode,
      fallbackUsed: primary.fallbackUsed,
      attemptedProviders: primary.attemptedProviders,
    };
  }

  /** `search:<kind>` for a live answer, `search:cached` for a cached one: measured, not guessed. */
  private markTools(toolsUsed: string[], results: readonly SearchExecutionResult[]): void {
    toolsUsed.push('web_search');
    for (const result of results) {
      toolsUsed.push(
        result.cached === true
          ? 'search:cached'
          : `search:${String(result.providerKind).toLowerCase()}`,
      );
    }
  }

  private traceSearch(
    trace: ResearchTraceEntry[],
    primary: SearchExecutionResult | null,
    answered: number,
    planned: number,
    latencyMs: number,
  ): void {
    if (primary === null) {
      trace.push(
        traceEntry(
          'search',
          'skipped',
          latencyMs,
          'follow-up round: no search provider is enabled for query expansion',
        ),
      );
    } else {
      const failed = (primary.warnings?.length ?? 0) > 0 || primary.results.length === 0;
      const flags = `${primary.selectionMode}${primary.fallbackUsed ? ', fallback' : ''}${primary.cached === true ? ', cached' : ''}`;
      trace.push(
        traceEntry(
          'search',
          failed ? 'warning' : 'ok',
          latencyMs,
          `${String(primary.results.length)} results from ${primary.providerName} (${flags})`,
        ),
      );
    }
    if (planned > 0) {
      trace.push(
        traceEntry(
          'search.expansion',
          answered === planned ? 'ok' : 'warning',
          latencyMs,
          `${String(answered)}/${String(planned)} extra queries answered`,
        ),
      );
    }
  }
}
