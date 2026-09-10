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

import { AppConfig } from '../../../app/config/app.config';
import { AiStreamStage } from '../../../common/enums';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { httpRequest } from '../../../common/utilities';
import {
  RESEARCH_ENRICHER_DEFAULT_TOP_FETCH,
  RESEARCH_ENRICHER_DEFAULT_TOP_RESULTS,
  RESEARCH_ENRICHER_EMPTY_RESULTS_BLOCK,
  RESEARCH_ENRICHER_EXTRACT_BODY_MAX_CHARS,
  RESEARCH_ENRICHER_FETCH_BODY_MAX_CHARS,
  RESEARCH_ENRICHER_FETCH_TIMEOUT_MS,
  RESEARCH_ENRICHER_QUERY_LOG_PREVIEW_CHARS,
  RESEARCH_ENRICHER_SEARCH_TIMEOUT_MS,
} from '../constants/research-enricher.constants';
import { ChatStreamService } from '../services/chat-stream.service';
import {
  type ResearchEnrichInput,
  type ResearchEnrichResult,
  type ResearchFetchWireResponse,
  type ResearchOrchestrationInput,
  type ResearchOrchestrationResult,
  type ResearchProviderOutcome,
  type ResearchSearchEntry,
  type ResearchSearchOutcome,
  type ResearchSearchWireResponse,
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
    if (input.mode === ResearchMode.NONE) {
      return {
        evidence: '',
        sources: [],
        mode: ResearchMode.NONE,
        searchRequestCount: 0,
        fetchRequestCount: 0,
      };
    }
    this.emitResearch(input, AiStreamStage.RESEARCH_STARTED, {
      mode: input.mode,
      query: input.query,
    });
    try {
      const searchOutcome = await this.runSearch(
        input,
        input.topResults ?? RESEARCH_ENRICHER_DEFAULT_TOP_RESULTS,
      );
      const searchResults = searchOutcome.entries;
      this.emitResearch(input, AiStreamStage.RESEARCH_SOURCES_FOUND, {
        mode: input.mode,
        query: input.query,
        sourcesCount: searchResults.length,
      });
      if (searchResults.length === 0) {
        this.logger.log(`enrich: mode=${input.mode} sources=0 (empty search)`);
        this.emitResearch(input, AiStreamStage.RESEARCH_COMPLETED, {
          mode: input.mode,
          query: input.query,
          sourcesCount: 0,
        });
        return {
          evidence: RESEARCH_ENRICHER_EMPTY_RESULTS_BLOCK,
          sources: [],
          mode: input.mode,
          searchRequestCount: searchOutcome.requestCount,
          fetchRequestCount: 0,
          ...this.providerOutcome(searchOutcome),
        };
      }
      const sources = await this.enrichSourcesByMode(input, searchResults);
      const fetchRequestCount =
        input.mode === ResearchMode.SEARCH
          ? 0
          : Math.min(searchResults.length, input.topFetch ?? RESEARCH_ENRICHER_DEFAULT_TOP_FETCH);
      const evidence = this.buildEvidenceBlock(input.mode, sources, fetchRequestCount);
      this.logger.log(`enrich: mode=${input.mode} sources=${String(sources.length)} (completed)`);
      this.emitResearch(input, AiStreamStage.RESEARCH_COMPLETED, {
        mode: input.mode,
        query: input.query,
        sourcesCount: sources.length,
      });
      return {
        evidence,
        sources,
        mode: input.mode,
        searchRequestCount: searchOutcome.requestCount,
        fetchRequestCount,
        ...this.providerOutcome(searchOutcome),
      };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`enrich: failed mode=${input.mode} — ${message}`);
      this.emitResearch(input, AiStreamStage.RESEARCH_FAILED, {
        mode: input.mode,
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
    const mode = input.mode;
    if (mode === undefined || mode === ResearchMode.NONE) {
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
      warnings:
        result.fallbackUsed === true
          ? [`research.providerFallbackUsed:${result.providerName ?? 'unknown'}`]
          : [],
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
    const fetched = await Promise.all(
      fetchTargets.map((entry) => this.fetchSourceWithFallback(input, entry)),
    );
    return [...fetched, ...carryThrough];
  }

  /** The provider fields worth carrying, omitted rather than nulled when absent. */
  private providerOutcome(outcome: ResearchSearchOutcome): ResearchProviderOutcome {
    return {
      ...(outcome.providerId === undefined ? {} : { providerId: outcome.providerId }),
      ...(outcome.providerName === undefined ? {} : { providerName: outcome.providerName }),
      ...(outcome.fallbackUsed === undefined ? {} : { fallbackUsed: outcome.fallbackUsed }),
    };
  }

  private async runSearch(
    input: ResearchEnrichInput,
    topResults: number,
  ): Promise<ResearchSearchOutcome> {
    try {
      const config = AppConfig.get();
      const url = `${config.RESEARCH_SERVICE_URL}/api/v1/research/search`;
      const response = await httpRequest<ResearchSearchWireResponse>({
        url,
        method: 'POST',
        headers: { Authorization: input.userAuthHeader },
        // `providerId` was missing here, and its absence is the whole of the
        // "provider dropdown does nothing" defect: research-service reads it as
        // the explicit choice, and without it takes the AUTO branch and picks
        // the top of a hardcoded score map.
        body: {
          query: input.query,
          maxResults: topResults,
          ...(input.providerId === undefined ? {} : { providerId: input.providerId }),
        },
        timeoutMs: RESEARCH_ENRICHER_SEARCH_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(`runSearch: research-service returned status=${String(response.status)}`);
        return { entries: [], requestCount: 1 };
      }
      const results = Array.isArray(response.data.results) ? response.data.results : [];
      return {
        entries: results.slice(0, topResults),
        requestCount:
          typeof response.data.searchRequestCount === 'number'
            ? Math.max(1, Math.floor(response.data.searchRequestCount))
            : 1,
        // What ANSWERED, which is not always what was asked for. A transcript
        // built from the request rather than the outcome is how the UI came to
        // name a provider that never executed.
        ...(response.data.providerId === undefined ? {} : { providerId: response.data.providerId }),
        ...(response.data.providerName === undefined
          ? {}
          : { providerName: response.data.providerName }),
        ...(response.data.fallbackUsed === undefined
          ? {}
          : { fallbackUsed: response.data.fallbackUsed }),
      };
    } catch (error) {
      this.logger.error(`runSearch: exception — ${(error as Error).message}`);
      return { entries: [], requestCount: 1 };
    }
  }

  private async fetchSourceWithFallback(
    input: ResearchEnrichInput,
    entry: ResearchSearchEntry,
  ): Promise<ResearchSource> {
    this.emitResearch(input, AiStreamStage.RESEARCH_FETCHING, {
      mode: input.mode,
      query: input.query,
      currentUrl: entry.url,
    });
    try {
      const config = AppConfig.get();
      const response = await httpRequest<ResearchFetchWireResponse>({
        url: `${config.RESEARCH_SERVICE_URL}/api/v1/research/fetch`,
        method: 'POST',
        headers: { Authorization: input.userAuthHeader },
        body: { url: entry.url },
        timeoutMs: RESEARCH_ENRICHER_FETCH_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(
          `fetchSource: status=${String(response.status)} url=${entry.url} — falling back to snippet`,
        );
        return this.toSnippetSource(entry);
      }
      const content = (response.data.content ?? '').trim();
      if (content.length === 0) {
        return this.toSnippetSource(entry);
      }
      const limit =
        input.mode === ResearchMode.SEARCH_EXTRACT
          ? RESEARCH_ENRICHER_EXTRACT_BODY_MAX_CHARS
          : RESEARCH_ENRICHER_FETCH_BODY_MAX_CHARS;
      return {
        title: entry.title ?? entry.url,
        url: entry.url,
        snippet: entry.snippet ?? undefined,
        extracted: content.slice(0, limit),
      };
    } catch (error) {
      this.logger.warn(`fetchSource: exception url=${entry.url} — ${(error as Error).message}`);
      return this.toSnippetSource(entry);
    }
  }

  private toSnippetSource(entry: ResearchSearchEntry): ResearchSource {
    return {
      title: entry.title ?? entry.url,
      url: entry.url,
      snippet: entry.snippet ?? undefined,
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
  ): string {
    const readCount = sources.filter((source) => source.extracted !== undefined).length;
    const opened = fetchedCount > 0 ? `, then opened ${String(readCount)} of them` : '';
    const header = [
      `## Web research evidence (mode: ${mode}, gathered now)`,
      '',
      'The web search and browsing steps have already been run for you by the platform.',
      `Tools that ran on this turn: searched the web (${String(sources.length)} results)${opened}.`,
      'Use the evidence below for any web claim and cite sources as [n].',
      "Do not say that you can't browse the web or access the internet.",
      'If the evidence is incomplete, state the uncertainty briefly and give the best supported answer.',
    ].join('\n');
    const blocks = sources.map((source, index) => this.formatSource(index + 1, source));
    return [header, '', ...blocks].join('\n').trimEnd();
  }

  private formatSource(num: number, source: ResearchSource): string {
    const body = source.extracted ?? source.snippet ?? '(no snippet)';
    return `[${String(num)}] ${source.title} — ${source.url}\n${body}\n`;
  }
}
