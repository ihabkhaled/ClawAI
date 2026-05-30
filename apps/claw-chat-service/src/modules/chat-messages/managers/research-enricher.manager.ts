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
import {
  type ResearchEnrichInput,
  type ResearchEnrichResult,
  type ResearchFetchWireResponse,
  type ResearchSearchEntry,
  type ResearchSearchWireResponse,
  type ResearchSource,
} from '../types/research-enricher.types';

@Injectable()
export class ResearchEnricherManager {
  private readonly logger = new Logger(ResearchEnricherManager.name);

  async enrich(input: ResearchEnrichInput): Promise<ResearchEnrichResult> {
    this.logger.debug(
      `enrich: mode=${input.mode} queryPreview="${input.query.slice(0, RESEARCH_ENRICHER_QUERY_LOG_PREVIEW_CHARS)}"`,
    );
    if (input.mode === ResearchMode.NONE) {
      return { evidence: '', sources: [], mode: ResearchMode.NONE };
    }
    try {
      const searchResults = await this.runSearch(
        input,
        input.topResults ?? RESEARCH_ENRICHER_DEFAULT_TOP_RESULTS,
      );
      if (searchResults.length === 0) {
        this.logger.log(`enrich: mode=${input.mode} sources=0 (empty search)`);
        return {
          evidence: RESEARCH_ENRICHER_EMPTY_RESULTS_BLOCK,
          sources: [],
          mode: input.mode,
        };
      }
      const sources = await this.enrichSourcesByMode(input, searchResults);
      const evidence = this.buildEvidenceBlock(input.mode, sources);
      this.logger.log(
        `enrich: mode=${input.mode} sources=${String(sources.length)} (completed)`,
      );
      return { evidence, sources, mode: input.mode };
    } catch (error) {
      this.logger.error(
        `enrich: failed mode=${input.mode} — ${(error as Error).message}`,
      );
      throw error;
    }
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
    const carryThrough = searchResults
      .slice(topFetch)
      .map((entry) => this.toSnippetSource(entry));
    const fetched = await Promise.all(
      fetchTargets.map((entry) => this.fetchSourceWithFallback(input, entry)),
    );
    return [...fetched, ...carryThrough];
  }

  private async runSearch(
    input: ResearchEnrichInput,
    topResults: number,
  ): Promise<ResearchSearchEntry[]> {
    try {
      const config = AppConfig.get();
      const url = `${config.RESEARCH_SERVICE_URL}/api/v1/research/search`;
      const response = await httpRequest<ResearchSearchWireResponse>({
        url,
        method: 'POST',
        headers: { Authorization: input.userAuthHeader },
        body: { query: input.query, maxResults: topResults },
        timeoutMs: RESEARCH_ENRICHER_SEARCH_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(
          `runSearch: research-service returned status=${String(response.status)}`,
        );
        return [];
      }
      const results = Array.isArray(response.data.results) ? response.data.results : [];
      return results.slice(0, topResults);
    } catch (error) {
      this.logger.error(`runSearch: exception — ${(error as Error).message}`);
      return [];
    }
  }

  private async fetchSourceWithFallback(
    input: ResearchEnrichInput,
    entry: ResearchSearchEntry,
  ): Promise<ResearchSource> {
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
      this.logger.warn(
        `fetchSource: exception url=${entry.url} — ${(error as Error).message}`,
      );
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

  private buildEvidenceBlock(mode: ResearchMode, sources: ResearchSource[]): string {
    const header = `## Web research evidence (mode: ${mode}, gathered now)`;
    const blocks = sources.map((source, index) => this.formatSource(index + 1, source));
    return [header, '', ...blocks].join('\n').trimEnd();
  }

  private formatSource(num: number, source: ResearchSource): string {
    const body = source.extracted ?? source.snippet ?? '(no snippet)';
    return `[${String(num)}] ${source.title} — ${source.url}\n${body}\n`;
  }
}
