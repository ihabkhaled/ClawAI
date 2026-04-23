import { Injectable, Logger } from '@nestjs/common';

import {
  BRAVE_SEARCH_API_DEFAULT_BASE,
  BRAVE_SEARCH_PATH,
  HEALTH_CHECK_TIMEOUT_MS,
} from '../../../common/constants/search.constants';
import { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import { sha1Short } from '../../../common/utilities/hash.utility';
import type { SearchAdapter } from './search-adapter.interface';
import type { BraveSearchResponse } from '../types/brave.types';
import type {
  ProviderHealthResult,
  SearchAdapterContext,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from '../types/search.types';

@Injectable()
export class BraveAdapter implements SearchAdapter {
  readonly kind = SearchProviderKind.BRAVE;

  private readonly logger = new Logger(BraveAdapter.name);

  async healthCheck(context: SearchAdapterContext): Promise<ProviderHealthResult> {
    if (context.credentials.apiKey === undefined || context.credentials.apiKey.length === 0) {
      return { healthy: false, latencyMs: 0, errorMessage: 'Brave requires apiKey' };
    }
    const start = Date.now();
    try {
      const response = await fetch(this.buildUrl(context.baseUrl, 'ping', 1), {
        headers: this.buildHeaders(context),
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;
      return response.ok
        ? { healthy: true, latencyMs }
        : { healthy: false, latencyMs, errorMessage: `HTTP ${response.status}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Brave health check failed: ${message}`);
      return { healthy: false, latencyMs: Date.now() - start, errorMessage: message };
    }
  }

  async search(request: SearchRequest, context: SearchAdapterContext): Promise<SearchResponse> {
    if (context.credentials.apiKey === undefined || context.credentials.apiKey.length === 0) {
      throw new Error('Brave requires apiKey in provider credentials');
    }

    const start = Date.now();
    const response = await fetch(
      this.buildUrl(context.baseUrl, request.query, request.maxResults),
      {
        headers: this.buildHeaders(context),
        signal: AbortSignal.timeout(context.timeoutMs),
      },
    );
    if (!response.ok) {
      throw new Error(`Brave search failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as BraveSearchResponse;
    const results: SearchResult[] = (data.web?.results ?? []).map((item, index) => ({
      id: sha1Short(item.url),
      title: item.title ?? item.profile?.long_name ?? item.url,
      url: item.url,
      snippet: item.description ?? null,
      publishedAt: item.page_age ?? null,
      freshness: item.age ?? null,
      score: 1 - index / Math.max(1, request.maxResults),
      providerKind: SearchProviderKind.BRAVE,
      raw: item as unknown as Record<string, unknown>,
    }));

    return { results, latencyMs: Date.now() - start };
  }

  private buildUrl(baseUrl: string, query: string, count: number): string {
    const root = baseUrl.length > 0 ? baseUrl.replace(/\/+$/, '') : BRAVE_SEARCH_API_DEFAULT_BASE;
    const params = new URLSearchParams({
      q: query,
      count: String(count),
      search_lang: 'en',
      country: 'us',
    });
    return `${root}${BRAVE_SEARCH_PATH}?${params.toString()}`;
  }

  private buildHeaders(context: SearchAdapterContext): Record<string, string> {
    return {
      Accept: 'application/json',
      'X-Subscription-Token': context.credentials.apiKey ?? '',
    };
  }
}
