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

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import {
  SEARCH_FIRST_MAX_RESULTS,
  SEARCH_FIRST_MAX_SNIPPET_CHARS,
  SEARCH_FIRST_TIMEOUT_MS,
  SEARCH_FIRST_WARNING_EXCEPTION,
  SEARCH_FIRST_WARNING_HTTP_ERROR,
  SEARCH_FIRST_WARNING_NO_RESULTS,
} from '../constants/search-first.constants';
import { type AssembledContext } from '../types/context.types';
import {
  type ResearchSearchResponse,
  type SearchFirstOutcome,
  type SearchFirstResult,
} from '../types/search-first.types';

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
    this.logger.debug(
      `run: querying research-service for promptLen=${String(userPrompt.length)}`,
    );
    const outcome = await this.search(userPrompt);
    if (!outcome.applied || outcome.results.length === 0) {
      this.logger.warn(
        `run: search-first NOT applied (warning=${outcome.warning ?? 'none'} resultCount=${String(outcome.results.length)})`,
      );
      return { context, outcome };
    }
    const enriched = this.injectIntoSystemPrompt(context, outcome.results);
    this.logger.log(
      `run: search-first applied — resultCount=${String(outcome.results.length)} runId=${outcome.runId ?? 'none'}`,
    );
    return { context: enriched, outcome };
  }

  private async search(query: string): Promise<SearchFirstOutcome> {
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
    try {
      const config = AppConfig.get();
      const url = `${config.RESEARCH_SERVICE_URL}/api/v1/research/search`;
      const response = await httpRequest<ResearchSearchResponse>({
        url,
        method: 'POST',
        body: {
          query: trimmed.slice(0, 512),
          maxResults: SEARCH_FIRST_MAX_RESULTS,
        },
        timeoutMs: SEARCH_FIRST_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(
          `search: research-service returned status=${String(response.status)}`,
        );
        return {
          applied: false,
          results: [],
          runId: null,
          warning: SEARCH_FIRST_WARNING_HTTP_ERROR,
        };
      }
      const data = response.data;
      if (!data || !Array.isArray(data.results) || data.results.length === 0) {
        this.logger.warn('search: research-service returned no results');
        return {
          applied: false,
          results: [],
          runId: data?.runId ?? null,
          warning: SEARCH_FIRST_WARNING_NO_RESULTS,
        };
      }
      const results = data.results
        .slice(0, SEARCH_FIRST_MAX_RESULTS)
        .map((entry): SearchFirstResult => ({
          id: entry.id,
          title: entry.title,
          url: entry.url,
          snippet:
            entry.snippet === null
              ? null
              : entry.snippet.slice(0, SEARCH_FIRST_MAX_SNIPPET_CHARS),
          publishedAt: entry.publishedAt,
          source: entry.providerKind ?? data.providerKind ?? 'unknown',
        }));
      return {
        applied: true,
        results,
        runId: data.runId,
        warning: null,
      };
    } catch (error) {
      this.logger.error(`search: exception during search-first — ${(error as Error).message}`);
      return {
        applied: false,
        results: [],
        runId: null,
        warning: SEARCH_FIRST_WARNING_EXCEPTION,
      };
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
      const result = results[i];
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
