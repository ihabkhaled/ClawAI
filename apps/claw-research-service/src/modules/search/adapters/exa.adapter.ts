import { Injectable, Logger } from '@nestjs/common';

import {
  EXA_API_DEFAULT_BASE,
  EXA_SEARCH_PATH,
  HEALTH_CHECK_TIMEOUT_MS,
} from '../../../common/constants/search.constants';
import { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import { sha1Short } from '../../../common/utilities/hash.utility';
import type { SearchAdapter } from './search-adapter.interface';
import type { ExaSearchResponse } from '../types/exa.types';
import type {
  ProviderHealthResult,
  SearchAdapterContext,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from '../types/search.types';

@Injectable()
export class ExaAdapter implements SearchAdapter {
  readonly kind = SearchProviderKind.EXA;

  private readonly logger = new Logger(ExaAdapter.name);

  async healthCheck(context: SearchAdapterContext): Promise<ProviderHealthResult> {
    if (context.credentials.apiKey === undefined || context.credentials.apiKey.length === 0) {
      return { healthy: false, latencyMs: 0, errorMessage: 'Exa requires apiKey' };
    }
    const start = Date.now();
    try {
      const response = await fetch(this.buildUrl(context.baseUrl), {
        method: 'POST',
        headers: this.buildHeaders(context),
        body: JSON.stringify({ query: 'ping', numResults: 1 }),
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;
      return response.ok
        ? { healthy: true, latencyMs }
        : { healthy: false, latencyMs, errorMessage: `HTTP ${response.status}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Exa health check failed: ${message}`);
      return { healthy: false, latencyMs: Date.now() - start, errorMessage: message };
    }
  }

  async search(request: SearchRequest, context: SearchAdapterContext): Promise<SearchResponse> {
    if (context.credentials.apiKey === undefined || context.credentials.apiKey.length === 0) {
      throw new Error('Exa requires apiKey in provider credentials');
    }

    const start = Date.now();
    const body = JSON.stringify({
      query: request.query,
      numResults: request.maxResults,
      contents: { text: true, summary: true, highlights: { maxCharacters: 1200 } },
    });

    await context.onNetworkCall?.();
    const response = await fetch(this.buildUrl(context.baseUrl), {
      method: 'POST',
      headers: this.buildHeaders(context),
      body,
      signal: AbortSignal.timeout(context.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Exa search failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as ExaSearchResponse;
    const results: SearchResult[] = data.results.map((item, index) => ({
      id: item.id ?? sha1Short(item.url),
      title: item.title ?? item.url,
      url: item.url,
      snippet: item.summary ?? item.highlights?.[0] ?? item.text ?? null,
      publishedAt: item.publishedDate ?? null,
      freshness: item.publishedDate ?? null,
      score: item.score ?? 1 - index / Math.max(1, request.maxResults),
      providerKind: SearchProviderKind.EXA,
      raw: item as unknown as Record<string, unknown>,
    }));

    return { results, latencyMs: Date.now() - start };
  }

  private buildUrl(baseUrl: string): string {
    const root = baseUrl.length > 0 ? baseUrl.replace(/\/+$/, '') : EXA_API_DEFAULT_BASE;
    return `${root}${EXA_SEARCH_PATH}`;
  }

  private buildHeaders(context: SearchAdapterContext): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': context.credentials.apiKey ?? '',
    };
  }
}
