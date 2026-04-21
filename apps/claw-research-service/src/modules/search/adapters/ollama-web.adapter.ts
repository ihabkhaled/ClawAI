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
  private static readonly BING_SEARCH_URL = 'https://www.bing.com/search';

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
      if (response.status === 401 || response.status === 403) {
        const fallback = await this.healthCheckBingRss();
        if (fallback.healthy) {
          return fallback;
        }
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
    if (response.ok) {
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

    if (response.status === 401 || response.status === 403 || response.status === 429) {
      const fallback = await this.searchBingRss(request, context.timeoutMs);
      return { ...fallback, latencyMs: Date.now() - start };
    }

    throw new Error(`Ollama web search failed: HTTP ${response.status}`);
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

  private async healthCheckBingRss(): Promise<ProviderHealthResult> {
    const start = Date.now();
    const params = new URLSearchParams({
      q: 'ping',
      format: 'rss',
    });
    try {
      const response = await fetch(
        `${OllamaWebSearchAdapter.BING_SEARCH_URL}?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'ClawAI-ResearchBot/1.0',
            Accept: 'application/rss+xml, application/xml, text/xml',
          },
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        },
      );
      const latencyMs = Date.now() - start;
      if (response.ok) {
        return { healthy: true, latencyMs };
      }
      return {
        healthy: false,
        latencyMs,
        errorMessage: `Fallback HTTP ${response.status}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { healthy: false, latencyMs: Date.now() - start, errorMessage: message };
    }
  }

  private async searchBingRss(request: SearchRequest, timeoutMs: number): Promise<SearchResponse> {
    const params = new URLSearchParams({
      q: request.query,
      format: 'rss',
    });
    const response = await fetch(`${OllamaWebSearchAdapter.BING_SEARCH_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'ClawAI-ResearchBot/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Bing RSS fallback failed: HTTP ${response.status}`);
    }

    const rssXml = await response.text();
    const parsed = this.parseBingRssResults(rssXml, request.maxResults);
    return { results: parsed, latencyMs: 0 };
  }

  private parseBingRssResults(rssXml: string, maxResults: number): SearchResult[] {
    const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
    const results: SearchResult[] = [];
    let itemMatch: RegExpExecArray | null;
    let index = 0;
    while ((itemMatch = itemRegex.exec(rssXml)) !== null && results.length < maxResults) {
      const rawItem = itemMatch[0];
      const title = this.readXmlTag(rawItem, 'title');
      const url = this.readXmlTag(rawItem, 'link');
      if (title.length === 0) {
        continue;
      }
      if (url.length === 0) {
        continue;
      }
      const snippet = this.readXmlTag(rawItem, 'description');

      results.push({
        id: sha1Short(url),
        title,
        url,
        snippet: snippet.length > 0 ? snippet : null,
        publishedAt: null,
        freshness: null,
        score: 1 - index / Math.max(1, maxResults),
        providerKind: SearchProviderKind.OLLAMA_WEB,
        raw: {},
      });
      index += 1;
    }
    return results;
  }

  private readXmlTag(input: string, tagName: string): string {
    const escaped = tagName.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tagRegex = new RegExp(`<${escaped}>([\\s\\S]*?)<\\/${escaped}>`, 'i');
    const match = tagRegex.exec(input);
    if (match === null) {
      return '';
    }
    const raw = match[1] ?? '';
    const withoutCdata = raw
      .replace(/^<!\[CDATA\[/i, '')
      .replace(/\]\]>$/i, '')
      .trim();
    return this.decodeHtml(withoutCdata).trim();
  }

  private decodeHtml(input: string): string {
    return input
      .replaceAll('&amp;', '&')
      .replaceAll('&apos;', "'")
      .replaceAll('&quot;', '"')
      .replaceAll('&#x27;', "'")
      .replaceAll('&#39;', "'")
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll(/<[^>]+>/g, ' ');
  }
}
