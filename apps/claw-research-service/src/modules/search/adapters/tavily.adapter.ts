import { Injectable, Logger } from '@nestjs/common';

import {
  HEALTH_CHECK_TIMEOUT_MS,
  TAVILY_API_DEFAULT_BASE,
  TAVILY_SEARCH_PATH,
} from '../../../common/constants/search.constants';
import { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import { sha1Short } from '../../../common/utilities/hash.utility';
import type { SearchAdapter } from './search-adapter.interface';
import type { TavilySearchResponse } from '../types/tavily.types';
import type {
  ProviderHealthResult,
  SearchAdapterContext,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from '../types/search.types';

@Injectable()
export class TavilyAdapter implements SearchAdapter {
  readonly kind = SearchProviderKind.TAVILY;

  private readonly logger = new Logger(TavilyAdapter.name);

  async healthCheck(context: SearchAdapterContext): Promise<ProviderHealthResult> {
    if (context.credentials.apiKey === undefined || context.credentials.apiKey.length === 0) {
      return { healthy: false, latencyMs: 0, errorMessage: 'Tavily requires apiKey' };
    }
    const start = Date.now();
    try {
      const body = JSON.stringify({
        api_key: context.credentials.apiKey,
        query: 'ping',
        max_results: 1,
      });
      const response = await fetch(this.buildUrl(context.baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;
      if (response.ok) {
        return { healthy: true, latencyMs };
      }
      return {
        healthy: false,
        latencyMs,
        errorMessage: `HTTP ${response.status}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Tavily health check failed: ${message}`);
      return { healthy: false, latencyMs: Date.now() - start, errorMessage: message };
    }
  }

  async search(request: SearchRequest, context: SearchAdapterContext): Promise<SearchResponse> {
    if (context.credentials.apiKey === undefined || context.credentials.apiKey.length === 0) {
      throw new Error('Tavily requires apiKey in provider credentials');
    }
    const start = Date.now();
    const body = JSON.stringify({
      api_key: context.credentials.apiKey,
      query: request.query,
      max_results: request.maxResults,
      search_depth: (request.filters?.['searchDepth'] as string | undefined) ?? 'basic',
      include_answer: Boolean(request.filters?.['includeAnswer'] ?? false),
      include_domains: (request.filters?.['includeDomains'] as string[] | undefined) ?? [],
      exclude_domains: (request.filters?.['excludeDomains'] as string[] | undefined) ?? [],
    });
    const response = await fetch(this.buildUrl(context.baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(context.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Tavily search failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as TavilySearchResponse;
    const results: SearchResult[] = data.results.map((item) => ({
      id: sha1Short(item.url),
      title: item.title,
      url: item.url,
      snippet: item.content ?? null,
      publishedAt: item.published_date ?? null,
      freshness: null,
      score: item.score,
      providerKind: SearchProviderKind.TAVILY,
      raw: item as unknown as Record<string, unknown>,
    }));
    return { results, latencyMs: Date.now() - start };
  }

  private buildUrl(baseUrl: string): string {
    const root = baseUrl.length > 0 ? baseUrl.replace(/\/+$/, '') : TAVILY_API_DEFAULT_BASE;
    return `${root}${TAVILY_SEARCH_PATH}`;
  }
}
