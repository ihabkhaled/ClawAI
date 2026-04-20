import { Injectable, Logger } from '@nestjs/common';

import {
  HEALTH_CHECK_TIMEOUT_MS,
  SEARXNG_SEARCH_PATH,
} from '../../../common/constants/search.constants';
import { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';
import { sha1Short } from '../../../common/utilities/hash.utility';
import type { SearchAdapter } from './search-adapter.interface';
import type { SearxngResponse } from '../types/searxng.types';
import type {
  ProviderHealthResult,
  SearchAdapterContext,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from '../types/search.types';

@Injectable()
export class SearxngAdapter implements SearchAdapter {
  readonly kind = SearchProviderKind.SEARXNG;

  private readonly logger = new Logger(SearxngAdapter.name);

  async healthCheck(context: SearchAdapterContext): Promise<ProviderHealthResult> {
    const start = Date.now();
    try {
      const params = new URLSearchParams({ q: 'ping', format: 'json' });
      const response = await fetch(`${this.buildUrl(context.baseUrl)}?${params.toString()}`, {
        headers: this.buildHeaders(context),
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;
      if (response.ok) {
        return { healthy: true, latencyMs };
      }
      return { healthy: false, latencyMs, errorMessage: `HTTP ${response.status}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`SearXNG health check failed: ${message}`);
      return { healthy: false, latencyMs: Date.now() - start, errorMessage: message };
    }
  }

  async search(request: SearchRequest, context: SearchAdapterContext): Promise<SearchResponse> {
    const start = Date.now();
    const params = new URLSearchParams({
      q: request.query,
      format: 'json',
      ...(typeof request.filters?.['language'] === 'string'
        ? { language: request.filters['language'] as string }
        : {}),
      ...(typeof request.filters?.['timeRange'] === 'string'
        ? { time_range: request.filters['timeRange'] as string }
        : {}),
    });
    const response = await fetch(`${this.buildUrl(context.baseUrl)}?${params.toString()}`, {
      headers: this.buildHeaders(context),
      signal: AbortSignal.timeout(context.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`SearXNG search failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as SearxngResponse;
    const items = data.results.slice(0, request.maxResults);
    const results: SearchResult[] = items.map((item, index) => ({
      id: sha1Short(item.url),
      title: item.title,
      url: item.url,
      snippet: item.content ?? null,
      publishedAt: item.publishedDate ?? null,
      freshness: null,
      score: item.score ?? 1 - index / Math.max(1, request.maxResults),
      providerKind: SearchProviderKind.SEARXNG,
      raw: item as unknown as Record<string, unknown>,
    }));
    return { results, latencyMs: Date.now() - start };
  }

  private buildUrl(baseUrl: string): string {
    if (baseUrl.length === 0) {
      throw new Error('SearXNG adapter requires a baseUrl');
    }
    return `${baseUrl.replace(/\/+$/, '')}${SEARXNG_SEARCH_PATH}`;
  }

  private buildHeaders(context: SearchAdapterContext): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (context.credentials.username !== undefined && context.credentials.password !== undefined) {
      const basic = Buffer.from(
        `${context.credentials.username}:${context.credentials.password}`,
      ).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }
    return headers;
  }
}
