import { Injectable, Logger } from '@nestjs/common';

import {
  HEALTH_CHECK_TIMEOUT_MS,
  OLLAMA_WEB_SEARCH_DEFAULT_BASE,
  OLLAMA_WEB_SEARCH_PATH,
} from '../../../common/constants/search.constants';
import { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import { sha1Short } from '../../../common/utilities/hash.utility';
import type { SearchAdapter } from './search-adapter.interface';
import type { OllamaWebSearchResponse } from '../types/ollama-web.types';
import type {
  ProviderHealthResult,
  SearchAdapterContext,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from '../types/search.types';

@Injectable()
export class OllamaWebSearchAdapter implements SearchAdapter {
  readonly kind = SearchProviderKind.OLLAMA_WEB;

  private readonly logger = new Logger(OllamaWebSearchAdapter.name);

  async healthCheck(context: SearchAdapterContext): Promise<ProviderHealthResult> {
    const start = Date.now();
    try {
      const response = await fetch(this.buildUrl(context.baseUrl), {
        method: 'POST',
        headers: this.buildHeaders(context),
        body: JSON.stringify({ query: 'ping', max_results: 1 }),
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
      this.logger.warn(`Ollama web health check failed: ${message}`);
      return { healthy: false, latencyMs: Date.now() - start, errorMessage: message };
    }
  }

  async search(request: SearchRequest, context: SearchAdapterContext): Promise<SearchResponse> {
    const start = Date.now();
    const response = await fetch(this.buildUrl(context.baseUrl), {
      method: 'POST',
      headers: this.buildHeaders(context),
      body: JSON.stringify({ query: request.query, max_results: request.maxResults }),
      signal: AbortSignal.timeout(context.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Ollama web search failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as OllamaWebSearchResponse;
    const rank = (index: number): number => 1 - index / Math.max(1, request.maxResults);
    const results: SearchResult[] = data.results.map((item, index) => ({
      id: sha1Short(item.url),
      title: item.title,
      url: item.url,
      snippet: item.content ?? null,
      publishedAt: null,
      freshness: null,
      score: rank(index),
      providerKind: SearchProviderKind.OLLAMA_WEB,
      raw: item as unknown as Record<string, unknown>,
    }));
    return { results, latencyMs: Date.now() - start };
  }

  private buildUrl(baseUrl: string): string {
    const root = baseUrl.length > 0 ? baseUrl.replace(/\/+$/, '') : OLLAMA_WEB_SEARCH_DEFAULT_BASE;
    return `${root}${OLLAMA_WEB_SEARCH_PATH}`;
  }

  private buildHeaders(context: SearchAdapterContext): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (context.credentials.apiKey !== undefined && context.credentials.apiKey.length > 0) {
      headers['Authorization'] = `Bearer ${context.credentials.apiKey}`;
    }
    return headers;
  }
}
