import { Injectable, Logger } from '@nestjs/common';

import {
  HEALTH_CHECK_TIMEOUT_MS,
  SERPAPI_DEFAULT_BASE,
  SERPAPI_SEARCH_PATH,
} from '../../../common/constants/search.constants';
import { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import { sha1Short } from '../../../common/utilities/hash.utility';
import type { SearchAdapter } from './search-adapter.interface';
import type { SerpApiResponse } from '../types/serpapi.types';
import type {
  ProviderHealthResult,
  SearchAdapterContext,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from '../types/search.types';

@Injectable()
export class SerpApiAdapter implements SearchAdapter {
  readonly kind = SearchProviderKind.SERPAPI;

  private readonly logger = new Logger(SerpApiAdapter.name);

  async healthCheck(context: SearchAdapterContext): Promise<ProviderHealthResult> {
    if (context.credentials.apiKey === undefined || context.credentials.apiKey.length === 0) {
      return { healthy: false, latencyMs: 0, errorMessage: 'SerpApi requires apiKey' };
    }
    const start = Date.now();
    try {
      const response = await fetch(this.buildUrl(context.baseUrl, 'ping', 1, context), {
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;
      return response.ok
        ? { healthy: true, latencyMs }
        : { healthy: false, latencyMs, errorMessage: `HTTP ${response.status}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`SerpApi health check failed: ${message}`);
      return { healthy: false, latencyMs: Date.now() - start, errorMessage: message };
    }
  }

  async search(request: SearchRequest, context: SearchAdapterContext): Promise<SearchResponse> {
    if (context.credentials.apiKey === undefined || context.credentials.apiKey.length === 0) {
      throw new Error('SerpApi requires apiKey in provider credentials');
    }

    const start = Date.now();
    const response = await fetch(
      this.buildUrl(context.baseUrl, request.query, request.maxResults, context),
      {
        signal: AbortSignal.timeout(context.timeoutMs),
      },
    );
    if (!response.ok) {
      throw new Error(`SerpApi search failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as SerpApiResponse;
    const results: SearchResult[] = (data.organic_results ?? []).map((item, index) => ({
      id: sha1Short(item.link),
      title: item.title ?? item.link,
      url: item.link,
      snippet: item.snippet ?? null,
      publishedAt: item.date ?? null,
      freshness: item.date ?? null,
      score:
        item.position !== undefined && item.position > 0
          ? 1 - (item.position - 1) / Math.max(1, request.maxResults)
          : 1 - index / Math.max(1, request.maxResults),
      providerKind: SearchProviderKind.SERPAPI,
      raw: item as unknown as Record<string, unknown>,
    }));

    return { results, latencyMs: Date.now() - start };
  }

  private buildUrl(
    baseUrl: string,
    query: string,
    num: number,
    context: SearchAdapterContext,
  ): string {
    const root = baseUrl.length > 0 ? baseUrl.replace(/\/+$/, '') : SERPAPI_DEFAULT_BASE;
    const params = new URLSearchParams({
      engine: 'google',
      q: query,
      num: String(num),
      api_key: context.credentials.apiKey ?? '',
    });
    return `${root}${SERPAPI_SEARCH_PATH}?${params.toString()}`;
  }
}
