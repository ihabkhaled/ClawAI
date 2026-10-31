// Compare-mode research enricher. Called BEFORE parallel lane execution so
// every lane sees the same on-the-fly web evidence in the shared system
// prompt — lets non-browsing models (Kimi, GLM, …) ground on real, current
// info instead of refusing with "I can't browse the web."
//
// Mode → research-service endpoint mapping:
//   NONE            → no network call (returns empty evidence)
//   SEARCH          → POST /api/v1/research/search                 (titles + snippets)
//   SEARCH_FETCH    → SEARCH + per-URL POST /api/v1/research/fetch (raw text excerpt)
//   SEARCH_EXTRACT  → SEARCH + per-URL POST /api/v1/research/fetch using the
//                     cleaned `content` field as the extracted main-article
//                     text. The audit confirmed no dedicated `/research/extract`
//                     endpoint is exposed today — the fetch service runs the
//                     extractor in-process and returns the cleaned `content`
//                     directly, so SEARCH_EXTRACT temporarily routes through
//                     fetch with a larger excerpt budget.

import { Injectable, Logger } from '@nestjs/common';

import { AiStreamStage } from '../../../common/enums';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { resolveEffectiveResearchMode } from '../utilities/auto-research-mode.utility';
import {
  GITHUB_REPOSITORY_COVERAGE_NOTE,
  RESEARCH_GROUNDING_NO_INVENT_INSTRUCTION,
} from '../constants/research-grounding.constants';
import { hasGithubRepositoryEvidence } from '../utilities/research-prompt.utility';
import {
  RESEARCH_ENRICHER_ASSUMED_WINDOW_TOKENS,
  RESEARCH_ENRICHER_DEFAULT_TOP_FETCH,
  RESEARCH_ENRICHER_DEFAULT_TOP_RESULTS,
  RESEARCH_ENRICHER_EMPTY_RESULTS_BLOCK,
  RESEARCH_ENRICHER_EXTRACT_BODY_MAX_CHARS,
  RESEARCH_ENRICHER_FETCH_BODY_MAX_CHARS,
  RESEARCH_ENRICHER_QUERY_LOG_PREVIEW_CHARS,
} from '../constants/research-enricher.constants';
import {
  RESEARCH_GATEWAY_WARNING_FAILED,
  RESEARCH_GATEWAY_WARNING_TIMEOUT,
} from '../constants/research-gateway.constants';
import { ResearchGatewayFailure } from '../enums/research-gateway-failure.enum';
import {
  describeGatewayProviders,
  gatewayFetchPages,
  gatewaySearch,
} from '../utilities/research-gateway.utility';
import { fitSourcesToResearchBudget } from '../utilities/research-evidence-budget.utility';
import type { ResearchGatewaySearchOutcome } from '../types/research-gateway.types';
import { ChatStreamService } from '../services/chat-stream.service';
import {
  type ResearchEnrichInput,
  type ResearchEnrichResult,
  type ResearchOrchestrationInput,
  type ResearchOrchestrationResult,
  type ResearchProviderOutcome,
  type ResearchSearchEntry,
  type ResearchSource,
} from '../types/research-enricher.types';
import {
  type ResearchTranscript,
  type ResearchTranscriptSource,
} from '../types/research-transcript.types';

@Injectable()
export class ResearchEnricherManager {
  private readonly logger = new Logger(ResearchEnricherManager.name);

  constructor(private readonly chatStreamService: ChatStreamService) {}

  async enrich(input: ResearchEnrichInput): Promise<ResearchEnrichResult> {
    this.logger.debug(
      `enrich: mode=${input.mode} queryPreview="${input.query.slice(0, RESEARCH_ENRICHER_QUERY_LOG_PREVIEW_CHARS)}"`,
    );
    // AUTO is resolved here, before anything downstream can see it: the rest
    // of this manager branches on concrete modes only.
    const mode = resolveEffectiveResearchMode(input.mode, input.query);
    if (mode === ResearchMode.NONE) {
      return {
        evidence: '',
        sources: [],
        mode: ResearchMode.NONE,
        searchRequestCount: 0,
        fetchRequestCount: 0,
      };
    }
    const resolvedInput = { ...input, mode };
    this.emitResearch(resolvedInput, AiStreamStage.RESEARCH_STARTED, {
      mode,
      query: input.query,
    });
    try {
      // The model starts only after this resolves: the gateway returns when every
      // provider has settled or hit research-service's own bound (ADR-212).
      const searchOutcome = await gatewaySearch({
        query: input.query,
        maxResults: input.topResults ?? RESEARCH_ENRICHER_DEFAULT_TOP_RESULTS,
        authorization: input.userAuthHeader,
        ...(input.providerId === undefined ? {} : { providerId: input.providerId }),
      });
      const searchResults = this.dedupeByUrl(searchOutcome.entries);
      const providerNames = describeGatewayProviders(searchOutcome.providers);
      const searchWarnings = this.searchWarnings(searchOutcome);
      this.emitResearch(resolvedInput, AiStreamStage.RESEARCH_SOURCES_FOUND, {
        mode,
        query: input.query,
        sourcesCount: searchResults.length,
        ...(providerNames.length > 0 ? { providers: providerNames } : {}),
      });
      if (searchResults.length === 0) {
        return this.emptySearchResult(resolvedInput, searchOutcome, searchWarnings);
      }
      const fetched = await this.enrichSourcesByMode(resolvedInput, searchResults);
      const fetchRequestCount =
        mode === ResearchMode.SEARCH
          ? 0
          : Math.min(searchResults.length, input.topFetch ?? RESEARCH_ENRICHER_DEFAULT_TOP_FETCH);
      const { sources, omitted } = this.fitSources(fetched, input.contextWindowTokens);
      const evidence = this.buildEvidenceBlock(mode, sources, fetchRequestCount, omitted);
      this.logger.log(
        `enrich: mode=${mode} sources=${String(sources.length)} omitted=${String(omitted)} (completed)`,
      );
      this.emitResearch(resolvedInput, AiStreamStage.RESEARCH_COMPLETED, {
        mode,
        query: input.query,
        sourcesCount: sources.length,
      });
      return {
        evidence,
        sources,
        mode,
        searchRequestCount: searchOutcome.requestCount,
        fetchRequestCount,
        ...this.providerOutcome(searchOutcome),
        ...(searchWarnings.length > 0 ? { warnings: searchWarnings } : {}),
      };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`enrich: failed mode=${input.mode} — ${message}`);
      this.emitResearch(resolvedInput, AiStreamStage.RESEARCH_FAILED, {
        mode,
        query: input.query,
        error: message,
      });
      throw error;
    }
  }

  // Orchestration-shared entry point. Used by EVERY orchestration manager
  // (consensus, escalation, repair, decompose, best-of-n, cost-ensemble,
  // verify, pipeline, role-pack) so each one runs the SAME enrichment pipeline
  // parallel/compare already runs. Returns a `{ transcript, systemPrompt }`
  // pair so callers can:
  //   1. Prepend `systemPrompt` to whatever system prompt they would have
  //      passed to the LLM (empty string is a safe no-op).
  //   2. Persist `transcript` on every assistant ChatMessage they write via
  //      `metadata.researchTranscript` so the FE renders the "Used N web
  //      sources" badge after a page refresh.
  //
  // Research enrichment MUST NEVER block the orchestration call. Every
  // failure path returns a non-null transcript with a populated `warnings`
  // array so analytics still see the attempt.
  async enrichForOrchestration(
    input: ResearchOrchestrationInput,
  ): Promise<ResearchOrchestrationResult> {
    const mode = resolveEffectiveResearchMode(input.mode, input.query);
    if (mode === ResearchMode.NONE) {
      return { transcript: null, systemPrompt: '' };
    }
    if (input.userToken.length === 0) {
      this.logger.warn(
        `enrichForOrchestration: mode=${mode} but no bearer token — skipping enrichment`,
      );
      return {
        transcript: this.buildSkippedOrchestrationTranscript(
          mode,
          input.query,
          input.providerId,
          'research.missingBearerToken',
        ),
        systemPrompt: '',
      };
    }
    const startedAt = Date.now();
    try {
      const result = await this.enrich({
        mode,
        query: input.query,
        userAuthHeader: `Bearer ${input.userToken}`,
        threadId: input.threadId,
        // The drop point. `input.providerId` arrived here and stopped, so every
        // orchestration flow searched with whatever research-service picked
        // while the transcript went on naming the user's choice.
        providerId: input.providerId,
      });
      const transcript = this.buildOrchestrationTranscriptFromEnricher(
        mode,
        input.query,
        // The provider that ANSWERED, falling back to the requested one only
        // when the run reported none. Recording the request is how a transcript
        // ends up describing something that did not happen.
        result.providerId ?? input.providerId,
        result,
        Math.max(1, Date.now() - startedAt),
      );
      return { transcript, systemPrompt: result.evidence };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.warn(
        `enrichForOrchestration: failed mode=${mode} — ${message}; continuing without evidence`,
      );
      return {
        transcript: this.buildSkippedOrchestrationTranscript(
          mode,
          input.query,
          input.providerId,
          `research.enrichmentFailed:${message}`,
          Math.max(1, Date.now() - startedAt),
        ),
        systemPrompt: '',
      };
    }
  }

  private buildOrchestrationTranscriptFromEnricher(
    mode: ResearchMode,
    query: string,
    providerId: string | undefined,
    result: ResearchEnrichResult,
    latencyMs: number,
  ): ResearchTranscript {
    const sources: ResearchTranscriptSource[] = result.sources.map((source) => ({
      title: source.title,
      url: source.url,
      ...(source.snippet === undefined ? {} : { snippet: source.snippet }),
      ...(source.extracted === undefined ? {} : { extracted: source.extracted }),
    }));
    return {
      mode,
      ...(providerId === undefined ? {} : { providerId }),
      ...(result.providerName === undefined ? {} : { providerName: result.providerName }),
      query,
      sources,
      latencyMs,
      // A fallback is not a failure, but it IS a different answer than the one
      // requested, and the user is entitled to know which provider replied.
      warnings: [
        ...(result.fallbackUsed === true
          ? [`research.providerFallbackUsed:${result.providerName ?? 'unknown'}`]
          : []),
        // A search that timed out or failed: the answer still comes, with this notice.
        ...(result.warnings ?? []),
      ],
      searchRequestCount: result.searchRequestCount,
      fetchRequestCount: result.fetchRequestCount,
      // On this path every source came from the search engine, and a source
      // counts as READ only once extraction produced text for it. Counting all
      // of them as "sources used" is the claim this replaces.
      pagesRead: sources.filter((source) => source.extracted !== undefined).length,
      linksFound: sources.length,
    };
  }

  private buildSkippedOrchestrationTranscript(
    mode: ResearchMode,
    query: string,
    providerId: string | undefined,
    warning: string,
    latencyMs = 0,
  ): ResearchTranscript {
    return {
      mode,
      ...(providerId === undefined ? {} : { providerId }),
      query,
      sources: [],
      latencyMs,
      warnings: [warning],
      searchRequestCount: 0,
      fetchRequestCount: 0,
      pagesRead: 0,
      linksFound: 0,
    };
  }

  // Single-source emit helper so the enrich pipeline stays readable and the
  // threadId-guard lives in exactly one place. Callers without a threadId
  // (tests, background batch jobs) get a silent no-op.
  private emitResearch(
    input: ResearchEnrichInput,
    stage: AiStreamStage,
    details: {
      mode?: ResearchMode;
      query?: string;
      sourcesCount?: number;
      currentUrl?: string;
      error?: string;
    },
  ): void {
    if (input.threadId === undefined || input.threadId.length === 0) {
      return;
    }
    this.chatStreamService.emitResearchProgress(input.threadId, {
      stage,
      details: {
        mode: details.mode,
        query: details.query,
        sourcesCount: details.sourcesCount,
        currentUrl: details.currentUrl,
        error: details.error,
      },
    });
  }

  private async enrichSourcesByMode(
    input: ResearchEnrichInput,
    searchResults: ResearchSearchEntry[],
  ): Promise<ResearchSource[]> {
    if (input.mode === ResearchMode.SEARCH) {
      return searchResults.map((entry) => this.toSnippetSource(entry));
    }
    const topFetch = Math.min(
      searchResults.length,
      input.topFetch ?? RESEARCH_ENRICHER_DEFAULT_TOP_FETCH,
    );
    const fetchTargets = searchResults.slice(0, topFetch);
    const carryThrough = searchResults.slice(topFetch).map((entry) => this.toSnippetSource(entry));
    // One parallel batch under ONE phase deadline (the gateway); a page that fails
    // or times out keeps its snippet, so the others are never lost to it.
    const pages = await gatewayFetchPages(
      input.userAuthHeader,
      fetchTargets.map((entry) => entry.url),
      (url) =>
        this.emitResearch(input, AiStreamStage.RESEARCH_FETCHING, {
          mode: input.mode,
          query: input.query,
          currentUrl: url,
        }),
    );
    const limit =
      input.mode === ResearchMode.SEARCH_EXTRACT
        ? RESEARCH_ENRICHER_EXTRACT_BODY_MAX_CHARS
        : RESEARCH_ENRICHER_FETCH_BODY_MAX_CHARS;
    const fetched = fetchTargets.map((entry, index): ResearchSource => {
      const page = pages.at(index);
      return page?.ok === true
        ? { ...this.toSnippetSource(entry), extracted: page.content.slice(0, limit) }
        : this.toSnippetSource(entry);
    });
    return [...fetched, ...carryThrough];
  }

  /** The narration and result for a search that found nothing (or failed): no fetch phase runs. */
  private emptySearchResult(
    input: ResearchEnrichInput,
    searchOutcome: ResearchGatewaySearchOutcome,
    searchWarnings: string[],
  ): ResearchEnrichResult {
    this.logger.log(`enrich: mode=${input.mode} sources=0 (empty search)`);
    this.emitResearch(
      input,
      searchOutcome.ok ? AiStreamStage.RESEARCH_COMPLETED : AiStreamStage.RESEARCH_FAILED,
      {
        mode: input.mode,
        query: input.query,
        sourcesCount: 0,
        ...(searchOutcome.ok ? {} : { error: searchOutcome.failure }),
      },
    );
    return {
      evidence: RESEARCH_ENRICHER_EMPTY_RESULTS_BLOCK,
      sources: [],
      mode: input.mode,
      searchRequestCount: searchOutcome.requestCount,
      fetchRequestCount: 0,
      ...this.providerOutcome(searchOutcome),
      ...(searchWarnings.length > 0 ? { warnings: searchWarnings } : {}),
    };
  }

  /** The provider fields worth carrying, omitted rather than nulled when absent. */
  private providerOutcome(outcome: ResearchGatewaySearchOutcome): ResearchProviderOutcome {
    return {
      ...(outcome.providerId === undefined ? {} : { providerId: outcome.providerId }),
      ...(outcome.providerName === undefined ? {} : { providerName: outcome.providerName }),
      ...(outcome.fallbackUsed === undefined ? {} : { fallbackUsed: outcome.fallbackUsed }),
      ...(outcome.providers.length > 0
        ? { providers: describeGatewayProviders(outcome.providers) }
        : {}),
    };
  }

  /** The user-visible notice for a search that did not complete (they get the answer anyway). */
  private searchWarnings(outcome: ResearchGatewaySearchOutcome): string[] {
    if (outcome.ok) {
      return [];
    }
    return [
      outcome.failure === ResearchGatewayFailure.TIMEOUT
        ? RESEARCH_GATEWAY_WARNING_TIMEOUT
        : `${RESEARCH_GATEWAY_WARNING_FAILED}:${outcome.failure ?? ResearchGatewayFailure.EXCEPTION}`,
    ];
  }

  /** Providers return overlapping pages; the first (best ranked) occurrence of a URL wins. */
  private dedupeByUrl(entries: ResearchSearchEntry[]): ResearchSearchEntry[] {
    const seen = new Set<string>();
    return entries.filter((entry) => {
      const key = entry.url.trim().replace(/#.*$/u, '').replace(/\/+$/u, '').toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Fits the sources to the shared evidence budget (45% of the window), so merging every
   * provider's hits plus page text can never overflow the answering model. Bodies are
   * shortened evenly first; whole sources are dropped from the tail only as a last resort.
   */
  private fitSources(
    sources: ResearchSource[],
    contextWindowTokens: number | undefined,
  ): { sources: ResearchSource[]; omitted: number } {
    const fitted = fitSourcesToResearchBudget(
      sources.map((source) => ({
        source,
        title: source.title,
        url: source.url,
        body: source.extracted ?? source.snippet ?? '',
      })),
      contextWindowTokens ?? RESEARCH_ENRICHER_ASSUMED_WINDOW_TOKENS,
    );
    return {
      omitted: fitted.omitted,
      sources: fitted.kept.map(({ source, body }) =>
        source.extracted === undefined
          ? { ...source, ...(source.snippet === undefined ? {} : { snippet: body }) }
          : { ...source, extracted: body },
      ),
    };
  }

  private toSnippetSource(entry: ResearchSearchEntry): ResearchSource {
    return {
      title: entry.title ?? entry.url,
      url: entry.url,
      snippet: entry.snippet ?? undefined,
      ...(entry.providers !== undefined && entry.providers.length > 0
        ? { foundBy: entry.providers }
        : {}),
    };
  }

  /**
   * The evidence block for the compare and orchestration paths.
   *
   * This file's own header comment says its purpose is to stop models
   * "refusing with 'I can't browse the web'". Until 2026-09-11 the prompt it
   * emitted did not attempt that: the entire capability statement was one
   * line, `## Web research evidence (mode: X, gathered now)`, which describes
   * the block without telling the model anything about what it may now claim.
   *
   * The single-message path had said the right thing for months. These two
   * paths are now the same, and the tools that ran are named for the same
   * reason they are named there: without provenance a model cannot tell a page
   * it was handed from a search snippet about that page.
   */
  private buildEvidenceBlock(
    mode: ResearchMode,
    sources: ResearchSource[],
    fetchedCount: number,
    omitted = 0,
  ): string {
    const readCount = sources.filter((source) => source.extracted !== undefined).length;
    const opened = fetchedCount > 0 ? `, then opened ${String(readCount)} of them` : '';
    const header = [
      `## Web research evidence (mode: ${mode}, gathered now)`,
      '',
      'The web search and browsing steps have already been run for you by the platform.',
      `Tools that ran on this turn: searched the web (${String(sources.length)} results)${opened}.`,
      'Ground your answer strictly in the evidence below and cite sources as [n].',
      "Do not say that you can't browse the web or access the internet.",
      'If the evidence is incomplete, state the uncertainty briefly and give the best supported answer.',
      RESEARCH_GROUNDING_NO_INVENT_INSTRUCTION,
      ...(hasGithubRepositoryEvidence(sources.map(({ url }) => url))
        ? [GITHUB_REPOSITORY_COVERAGE_NOTE]
        : []),
    ].join('\n');
    const blocks = sources.map((source, index) => this.formatSource(index + 1, source));
    // Rule 41: never silently present less than was found.
    const omittedNote =
      omitted > 0
        ? [
            `(${String(omitted)} further search results were left out to fit the context window; say so if the answer might be on them.)`,
          ]
        : [];
    return [header, '', ...blocks, ...omittedNote].join('\n').trimEnd();
  }

  private formatSource(num: number, source: ResearchSource): string {
    const body = source.extracted ?? source.snippet ?? '(no snippet)';
    const via =
      source.foundBy !== undefined && source.foundBy.length > 0
        ? ` (found by ${source.foundBy.join(', ')})`
        : '';
    return `[${String(num)}] ${source.title} — ${source.url}${via}\n${body}\n`;
  }
}
