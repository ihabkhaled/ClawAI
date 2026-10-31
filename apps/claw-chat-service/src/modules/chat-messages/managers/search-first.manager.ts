// Search-first workflow manager — Phase 6 of the semantic router flagship.
//
// Activated by ChatExecutionManager when the routing decision arrives with
// `selectedWorkflow=SEARCH_FIRST`. Calls claw-research-service search
// endpoint, formats the top N results into a structured citation block, and
// hands back an enriched AssembledContext for the LLM call.
//
// On ANY failure (timeout, HTTP error, no results, exception) the manager
// returns `{ applied: false, warning: <reason> }` and the caller falls back
// to the original context. SEARCH_FIRST must never block answering — it can
// only enrich.

import { Injectable, Logger } from '@nestjs/common';

import {
  SEARCH_FIRST_MAX_RESULTS,
  SEARCH_FIRST_MAX_SNIPPET_CHARS,
  SEARCH_FIRST_WARNING_ALREADY_RESEARCHED,
  SEARCH_FIRST_WARNING_EXCEPTION,
  SEARCH_FIRST_WARNING_HTTP_ERROR,
  SEARCH_FIRST_WARNING_NO_RESULTS,
  SEARCH_FIRST_WARNING_TIMEOUT,
} from '../constants/search-first.constants';
import { type AssembledContext } from '../types/context.types';
import { ResearchGatewayFailure } from '../enums/research-gateway-failure.enum';
import { type SearchFirstOutcome, type SearchFirstResult } from '../types/search-first.types';
import { fitSourcesToResearchBudget } from '../utilities/research-evidence-budget.utility';
import { gatewaySearchForUser } from '../utilities/research-gateway.utility';

@Injectable()
export class SearchFirstManager {
  private readonly logger = new Logger(SearchFirstManager.name);

  // Runs a search-first lookup for the user prompt and returns an
  // enriched context + outcome. Caller passes the raw user prompt
  // (already extracted from the thread) so this manager stays pure.
  async run(
    userPrompt: string,
    context: AssembledContext,
  ): Promise<{ context: AssembledContext; outcome: SearchFirstOutcome }> {
    this.logger.debug(`run: querying research-service for promptLen=${String(userPrompt.length)}`);
    // Awaited in full: the model is not called until the gateway has returned (ADR-212).
    // The turn already carries web evidence (research ran before the model, or the user
    // asked for it): a second search would spend a second search for the same question.
    if (context.researchRequested || context.researchEvidence.length > 0) {
      this.logger.log('run: search-first skipped - the turn already has research evidence');
      return {
        context,
        outcome: {
          applied: false,
          results: [],
          runId: null,
          warning: SEARCH_FIRST_WARNING_ALREADY_RESEARCHED,
        },
      };
    }
    const outcome = await this.search(userPrompt, context);
    if (!outcome.applied || outcome.results.length === 0) {
      this.logger.warn(
        `run: search-first NOT applied (warning=${outcome.warning ?? 'none'} resultCount=${String(outcome.results.length)})`,
      );
      return { context, outcome };
    }
    // Same 45% evidence share of the answering model's window the main chat path uses.
    const fitted = fitSourcesToResearchBudget(
      outcome.results.map((result) => ({
        ...result,
        body: result.snippet ?? '',
      })),
      context.modelBudget.contextWindowTokens,
    );
    const results = fitted.kept.map(({ body, ...result }) => ({
      ...result,
      snippet: result.snippet === null ? null : body,
    }));
    const enriched = this.injectIntoSystemPrompt(context, results);
    this.logger.log(
      `run: search-first applied — resultCount=${String(outcome.results.length)} runId=${outcome.runId ?? 'none'}`,
    );
    return { context: enriched, outcome };
  }

  private async search(query: string, context: AssembledContext): Promise<SearchFirstOutcome> {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      this.logger.debug('search: empty query, skipping search-first');
      return {
        applied: false,
        results: [],
        runId: null,
        warning: SEARCH_FIRST_WARNING_NO_RESULTS,
      };
    }
    const gateway = await gatewaySearchForUser({
      query: trimmed.slice(0, 512),
      maxResults: SEARCH_FIRST_MAX_RESULTS,
      userId: context.userId,
    });
    if (!gateway.ok) {
      this.logger.warn(`search: gateway failed (${gateway.failure ?? 'unknown'})`);
      return {
        applied: false,
        results: [],
        runId: null,
        warning: this.warningFor(gateway.failure),
      };
    }
    if (gateway.entries.length === 0) {
      this.logger.warn('search: research-service returned no results');
      return {
        applied: false,
        results: [],
        runId: gateway.runId ?? null,
        warning: SEARCH_FIRST_WARNING_NO_RESULTS,
      };
    }
    const results = gateway.entries
      .slice(0, SEARCH_FIRST_MAX_RESULTS)
      .map((entry): SearchFirstResult => ({
        id: entry.id ?? entry.url,
        title: entry.title ?? entry.url,
        url: entry.url,
        snippet:
          entry.snippet === null || entry.snippet === undefined
            ? null
            : entry.snippet.slice(0, SEARCH_FIRST_MAX_SNIPPET_CHARS),
        publishedAt: entry.publishedAt ?? null,
        source: entry.providers?.join(', ') ?? entry.providerKind ?? 'unknown',
      }));
    return { applied: true, results, runId: gateway.runId ?? null, warning: null };
  }

  private warningFor(failure: ResearchGatewayFailure | undefined): string {
    switch (failure) {
      case ResearchGatewayFailure.TIMEOUT:
        return SEARCH_FIRST_WARNING_TIMEOUT;
      case ResearchGatewayFailure.EXCEPTION:
        return SEARCH_FIRST_WARNING_EXCEPTION;
      default:
        return SEARCH_FIRST_WARNING_HTTP_ERROR;
    }
  }

  private injectIntoSystemPrompt(
    context: AssembledContext,
    results: SearchFirstResult[],
  ): AssembledContext {
    const block = this.buildSearchBlock(results);
    const nextSystemPrompt =
      context.systemPrompt && context.systemPrompt.trim().length > 0
        ? `${context.systemPrompt.trim()}\n\n${block}`
        : block;
    return {
      ...context,
      systemPrompt: nextSystemPrompt,
    };
  }

  private buildSearchBlock(results: SearchFirstResult[]): string {
    const lines: string[] = [
      'You have just received fresh web search results for the user prompt. Cite the source URL when you use a result.',
      '',
      '--- SEARCH RESULTS ---',
    ];
    for (let i = 0; i < results.length; i++) {
      const result = results.at(i);
      if (!result) {
        continue;
      }
      const num = String(i + 1);
      const dateSuffix =
        result.publishedAt !== null && result.publishedAt.length > 0
          ? ` (${result.publishedAt})`
          : '';
      const snippetText = result.snippet ?? '(no snippet)';
      lines.push(`[${num}] ${result.title}${dateSuffix}`);
      lines.push(`    URL: ${result.url}`);
      lines.push(`    Source: ${result.source}`);
      lines.push(`    Snippet: ${snippetText}`);
      lines.push('');
    }
    lines.push('--- END SEARCH RESULTS ---');
    return lines.join('\n');
  }
}
