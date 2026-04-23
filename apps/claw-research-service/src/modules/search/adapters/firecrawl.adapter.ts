import { Injectable, Logger } from '@nestjs/common';

import {
  FIRECRAWL_API_DEFAULT_BASE,
  FIRECRAWL_SEARCH_PATH,
  HEALTH_CHECK_TIMEOUT_MS,
} from '../../../common/constants/search.constants';
import { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import { sha1Short } from '../../../common/utilities/hash.utility';
import type { SearchAdapter } from './search-adapter.interface';
import type { FirecrawlSearchResponse } from '../types/firecrawl.types';
import type {
  ProviderHealthResult,
  SearchAdapterContext,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from '../types/search.types';

@Injectable()
export class FirecrawlAdapter implements SearchAdapter {
  readonly kind = SearchProviderKind.FIRECRAWL;

  private readonly logger = new Logger(FirecrawlAdapter.name);

  async healthCheck(context: SearchAdapterContext): Promise<ProviderHealthResult> {
    if (context.credentials.apiKey === undefined || context.credentials.apiKey.length === 0) {
      return { healthy: false, latencyMs: 0, errorMessage: 'Firecrawl requires apiKey' };
    }
    const start = Date.now();
    try {
      const response = await fetch(this.buildUrl(context.baseUrl), {
        method: 'POST',
        headers: this.buildHeaders(context),
        body: JSON.stringify({ query: 'ping', limit: 1 }),
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;
      return response.ok
        ? { healthy: true, latencyMs }
        : { healthy: false, latencyMs, errorMessage: `HTTP ${response.status}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Firecrawl health check failed: ${message}`);
      return { healthy: false, latencyMs: Date.now() - start, errorMessage: message };
    }
  }

  async search(request: SearchRequest, context: SearchAdapterContext): Promise<SearchResponse> {
    if (context.credentials.apiKey === undefined || context.credentials.apiKey.length === 0) {
      throw new Error('Firecrawl requires apiKey in provider credentials');
    }

    const start = Date.now();
    const response = await fetch(this.buildUrl(context.baseUrl), {
      method: 'POST',
      headers: this.buildHeaders(context),
      body: JSON.stringify({
        query: request.query,
        limit: request.maxResults,
        scrapeOptions: { formats: ['markdown'] },
      }),
      signal: AbortSignal.timeout(context.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Firecrawl search failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as FirecrawlSearchResponse;
    const results: SearchResult[] = (data.data ?? []).map((item, index) => ({
      id: sha1Short(item.url),
      title: item.title ?? item.url,
      url: item.url,
      snippet: item.description ?? item.markdown ?? null,
      publishedAt: item.metadata?.publishedTime ?? null,
      freshness: item.metadata?.publishedTime ?? null,
      score: 1 - index / Math.max(1, request.maxResults),
      providerKind: SearchProviderKind.FIRECRAWL,
      raw: item as unknown as Record<string, unknown>,
    }));

    return { results, latencyMs: Date.now() - start };
  }

  private buildUrl(baseUrl: string): string {
    const root = baseUrl.length > 0 ? baseUrl.replace(/\/+$/, '') : FIRECRAWL_API_DEFAULT_BASE;
    return `${root}${FIRECRAWL_SEARCH_PATH}`;
  }

  private buildHeaders(context: SearchAdapterContext): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.credentials.apiKey ?? ''}`,
    };
  }
}
