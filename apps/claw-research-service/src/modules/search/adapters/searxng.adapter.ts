import { Injectable, Logger } from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';

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
      const response = await fetch(this.buildUrl(context.baseUrl, params), {
        headers: this.buildHeaders(context),
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        redirect: 'error',
      });
      const latencyMs = Date.now() - start;
      return response.ok ? { healthy: true, latencyMs } : { healthy: false, latencyMs, errorMessage: `HTTP ${response.status}` };
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
    await context.onNetworkCall?.();
    const response = await fetch(this.buildUrl(context.baseUrl, params), {
      headers: this.buildHeaders(context),
      signal: AbortSignal.timeout(context.timeoutMs),
      redirect: 'error',
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

  private buildUrl(baseUrl: string, params: URLSearchParams): URL {
    if (baseUrl.length === 0) {
      throw new Error('SearXNG adapter requires a baseUrl');
    }
    // SearXNG has no default: the base is always the operator-configured
    // instance, so its host is declared — the BASE, never the request being
    // built, which is the connector pattern rather than a URL authorising
    // itself (TD-040). The instance is usually private (`http://searxng:8080`),
    // which this guard allows because it is declared; it still refuses file:,
    // embedded credentials and the metadata address.
    return assertSafeRequestUrl(
      `${baseUrl.replace(/\/+$/, '')}${SEARXNG_SEARCH_PATH}?${params.toString()}`,
      declaredHost(baseUrl),
    );
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
