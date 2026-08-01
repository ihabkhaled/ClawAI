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
  ResultSetQuality,
  SearchAdapterContext,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from '../types/search.types';

@Injectable()
export class OllamaWebSearchAdapter implements SearchAdapter {
  readonly kind = SearchProviderKind.OLLAMA_WEB;

  private readonly logger = new Logger(OllamaWebSearchAdapter.name);
  private static readonly DUCKDUCKGO_HTML_URL = 'https://html.duckduckgo.com/html/';
  private static readonly BING_SEARCH_URL = 'https://www.bing.com/search';
  private static readonly QUERY_STOP_WORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'browse',
    'by',
    'cite',
    'current',
    'fetch',
    'find',
    'for',
    'from',
    'give',
    'how',
    'i',
    'in',
    'is',
    'latest',
    'me',
    'of',
    'on',
    'please',
    'research',
    'search',
    'show',
    'sources',
    'summarize',
    'surf',
    'tell',
    'the',
    'to',
    'use',
    'using',
    'via',
    'web',
    'what',
    'with',
  ]);
  private static readonly LOW_RELEVANCE_BEST_SCORE = 0.52;
  private static readonly LOW_RELEVANCE_AVERAGE_TOP_SCORE = 0.34;

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
    await context.onNetworkCall?.();
    const response = await fetch(this.buildUrl(context.baseUrl), {
      method: 'POST',
      headers: this.buildHeaders(context),
      body: JSON.stringify({ query: request.query, max_results: request.maxResults }),
      signal: AbortSignal.timeout(context.timeoutMs),
    });
    if (response.ok) {
      const data = (await response.json()) as OllamaWebSearchResponse;
      const primaryResults = this.rankByQueryRelevance(
        request.query,
        this.normalizeResults(
          data.results.map((item) => ({
            title: item.title,
            url: item.url,
            snippet: item.content ?? null,
            raw: { ...item } as Record<string, unknown>,
          })),
          request.maxResults,
        ),
      );
      const primaryQuality = this.measureResultSet(primaryResults);
      if (!this.isLowRelevance(primaryQuality)) {
        return { results: primaryResults, latencyMs: Date.now() - start };
      }

      this.logger.warn(
        `Ollama web search returned low-relevance results for "${request.query.slice(0, 120)}" (best=${primaryQuality.bestScore.toFixed(2)}, avgTop=${primaryQuality.averageTopScore.toFixed(2)}); trying DuckDuckGo HTML fallback`,
      );
      return this.resolveLowRelevanceFallback(request, context, start, primaryResults);
    }

    if (response.status === 401 || response.status === 403 || response.status === 429) {
      return this.resolveLowRelevanceFallback(request, context, start, []);
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

  private async searchBingRss(
    request: SearchRequest,
    context: SearchAdapterContext,
  ): Promise<SearchResponse> {
    const params = new URLSearchParams({
      q: request.query,
      format: 'rss',
    });
    await context.onNetworkCall?.();
    const response = await fetch(`${OllamaWebSearchAdapter.BING_SEARCH_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'ClawAI-ResearchBot/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(context.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Bing RSS fallback failed: HTTP ${response.status}`);
    }

    const rssXml = await response.text();
    const parsed = this.rankByQueryRelevance(
      request.query,
      this.parseBingRssResults(rssXml, request.maxResults),
    );
    return { results: parsed, latencyMs: 0 };
  }

  private parseBingRssResults(rssXml: string, maxResults: number): SearchResult[] {
    const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
    const entries: Array<{
      title: string;
      url: string;
      snippet: string | null;
      raw: Record<string, unknown>;
    }> = [];
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemRegex.exec(rssXml)) !== null && entries.length < maxResults) {
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
      entries.push({
        title,
        url,
        snippet: snippet.length > 0 ? snippet : null,
        raw: { source: 'bing_rss_fallback' },
      });
    }
    return this.normalizeResults(entries, maxResults);
  }

  private normalizeResults(
    items: Array<{
      title: string;
      url: string;
      snippet: string | null;
      raw: Record<string, unknown>;
    }>,
    maxResults: number,
  ): SearchResult[] {
    const rank = (index: number): number => 1 - index / Math.max(1, maxResults);
    return items.map((item, index) => ({
      id: sha1Short(item.url),
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      publishedAt: null,
      freshness: null,
      score: rank(index),
      providerKind: SearchProviderKind.OLLAMA_WEB,
      raw: item.raw,
    }));
  }

  private rankByQueryRelevance(query: string, results: SearchResult[]): SearchResult[] {
    const ranked = results.map((result, index) => ({
      index,
      result,
      relevance: this.scoreQueryMatch(query, result),
    }));
    ranked.sort((left, right) => {
      if (right.relevance !== left.relevance) {
        return right.relevance - left.relevance;
      }
      return left.index - right.index;
    });
    return ranked.map(({ result, relevance }) => ({
      ...result,
      score: relevance,
    }));
  }

  private scoreQueryMatch(query: string, result: SearchResult): number {
    const terms = this.extractQueryTerms(query);
    if (terms.length === 0) {
      return result.score;
    }
    const combinedText = this.normalizeText(
      `${result.title} ${result.snippet ?? ''} ${result.url}`,
    );
    const titleText = this.normalizeText(result.title);
    const totalWeight = terms.reduce((sum, term) => sum + this.termWeight(term), 0);
    if (totalWeight === 0) {
      return result.score;
    }

    let matchedWeight = 0;
    let matchedTitleWeight = 0;
    for (const term of terms) {
      const weight = this.termWeight(term);
      if (combinedText.includes(term)) {
        matchedWeight += weight;
      }
      if (titleText.includes(term)) {
        matchedTitleWeight += weight;
      }
    }

    const phrases = this.buildQueryPhrases(terms);
    const phraseScore =
      phrases.length === 0
        ? 0
        : phrases.filter((phrase) => combinedText.includes(phrase)).length / phrases.length;
    const bodyCoverage = matchedWeight / totalWeight;
    const titleCoverage = matchedTitleWeight / totalWeight;
    return Math.min(1, bodyCoverage * 0.7 + titleCoverage * 0.2 + phraseScore * 0.1);
  }

  private extractQueryTerms(query: string): string[] {
    const matches = this.normalizeText(query).match(/[\p{L}\p{N}][\p{L}\p{N}.+-]*/gu) ?? [];
    const unique = new Set<string>();
    for (const term of matches) {
      if (term.length < 2) {
        continue;
      }
      if (OllamaWebSearchAdapter.QUERY_STOP_WORDS.has(term)) {
        continue;
      }
      unique.add(term);
    }
    return [...unique];
  }

  private buildQueryPhrases(terms: string[]): string[] {
    const phrases: string[] = [];
    for (let index = 0; index < terms.length - 1; index += 1) {
      const current = terms.at(index);
      const next = terms.at(index + 1);
      if (current !== undefined && next !== undefined) {
        phrases.push(`${current} ${next}`);
      }
    }
    return phrases;
  }

  private termWeight(term: string): number {
    const lengthWeight = Math.min(term.length, 8) / 8;
    const digitBoost = /\d/.test(term) ? 0.35 : 0;
    return 1 + lengthWeight + digitBoost;
  }

  private normalizeText(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFKD')
      .replaceAll(/\p{Mark}+/gu, '')
      .replaceAll(/[^.\p{L}\p{N}+-]+/gu, ' ')
      .trim();
  }

  private measureResultSet(results: SearchResult[]): ResultSetQuality {
    if (results.length === 0) {
      return { bestScore: 0, averageTopScore: 0 };
    }
    const top = results.slice(0, 3);
    const averageTopScore = top.reduce((sum, item) => sum + item.score, 0) / top.length;
    return {
      bestScore: results[0]?.score ?? 0,
      averageTopScore,
    };
  }

  private isLowRelevance(quality: ResultSetQuality): boolean {
    return (
      quality.bestScore < OllamaWebSearchAdapter.LOW_RELEVANCE_BEST_SCORE &&
      quality.averageTopScore < OllamaWebSearchAdapter.LOW_RELEVANCE_AVERAGE_TOP_SCORE
    );
  }

  private async resolveLowRelevanceFallback(
    request: SearchRequest,
    context: SearchAdapterContext,
    start: number,
    primaryResults: SearchResult[],
  ): Promise<SearchResponse> {
    try {
      const duckDuckGoFallback = await this.searchDuckDuckGoHtml(request, context);
      const duckDuckGoQuality = this.measureResultSet(duckDuckGoFallback.results);
      if (!this.isLowRelevance(duckDuckGoQuality)) {
        return { results: duckDuckGoFallback.results, latencyMs: Date.now() - start };
      }
      this.logger.warn(
        `DuckDuckGo HTML fallback also returned low-relevance results for "${request.query.slice(0, 120)}" (best=${duckDuckGoQuality.bestScore.toFixed(2)}, avgTop=${duckDuckGoQuality.averageTopScore.toFixed(2)}); trying Bing RSS fallback`,
      );

      try {
        const bingFallback = await this.searchBingRss(request, context);
        const bingQuality = this.measureResultSet(bingFallback.results);
        if (!this.isLowRelevance(bingQuality)) {
          return { results: bingFallback.results, latencyMs: Date.now() - start };
        }
        this.logger.warn(
          `Bing RSS fallback also returned low-relevance results for "${request.query.slice(0, 120)}" (best=${bingQuality.bestScore.toFixed(2)}, avgTop=${bingQuality.averageTopScore.toFixed(2)}); withholding weak evidence`,
        );
      } catch (bingError) {
        const bingMessage = bingError instanceof Error ? bingError.message : 'Unknown error';
        this.logger.warn(
          `Bing RSS fallback failed after DuckDuckGo low-relevance results for "${request.query.slice(0, 120)}": ${bingMessage}`,
        );
        if (primaryResults.length === 0) {
          return {
            results: [],
            latencyMs: Date.now() - start,
            warnings: [
              `${this.buildLowRelevanceWarning(request.query)} Fallback search also failed: ${bingMessage}.`,
            ],
          };
        }
      }

      return {
        results: [],
        latencyMs: Date.now() - start,
        warnings: [this.buildLowRelevanceWarning(request.query)],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `DuckDuckGo HTML fallback failed after low-relevance search for "${request.query.slice(0, 120)}": ${message}`,
      );

      try {
        const bingFallback = await this.searchBingRss(request, context);
        const bingQuality = this.measureResultSet(bingFallback.results);
        if (!this.isLowRelevance(bingQuality)) {
          return { results: bingFallback.results, latencyMs: Date.now() - start };
        }
        this.logger.warn(
          `Bing RSS fallback also returned low-relevance results for "${request.query.slice(0, 120)}" (best=${bingQuality.bestScore.toFixed(2)}, avgTop=${bingQuality.averageTopScore.toFixed(2)}); withholding weak evidence`,
        );
      } catch (bingError) {
        const bingMessage = bingError instanceof Error ? bingError.message : 'Unknown error';
        this.logger.warn(
          `Bing RSS fallback failed after DuckDuckGo error for "${request.query.slice(0, 120)}": ${bingMessage}`,
        );
        if (primaryResults.length === 0) {
          return {
            results: [],
            latencyMs: Date.now() - start,
            warnings: [
              `${this.buildLowRelevanceWarning(request.query)} Fallback search also failed: ${bingMessage}.`,
            ],
          };
        }
      }

      return {
        results: [],
        latencyMs: Date.now() - start,
        warnings: [this.buildLowRelevanceWarning(request.query)],
      };
    }
  }

  private buildLowRelevanceWarning(query: string): string {
    return `Search results were withheld because the returned pages were too weakly matched to the request: "${query.slice(0, 160)}".`;
  }

  private async searchDuckDuckGoHtml(
    request: SearchRequest,
    context: SearchAdapterContext,
  ): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: request.query });
    await context.onNetworkCall?.();
    const response = await fetch(
      `${OllamaWebSearchAdapter.DUCKDUCKGO_HTML_URL}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(context.timeoutMs),
      },
    );
    if (!response.ok) {
      throw new Error(`DuckDuckGo HTML fallback failed: HTTP ${response.status}`);
    }
    const html = await response.text();
    const parsed = this.rankByQueryRelevance(
      request.query,
      this.parseDuckDuckGoHtmlResults(html, request.maxResults),
    );
    return { results: parsed, latencyMs: 0 };
  }

  private parseDuckDuckGoHtmlResults(html: string, maxResults: number): SearchResult[] {
    const resultRegex =
      /<a[^>]*class="result__a"[^>]*href="(?<url>[^"]+)"[^>]*>(?<title>[\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(?<snippet>[\s\S]*?)<\/a>/gi;
    const entries: Array<{
      title: string;
      url: string;
      snippet: string | null;
      raw: Record<string, unknown>;
    }> = [];
    let match: RegExpExecArray | null;
    while ((match = resultRegex.exec(html)) !== null && entries.length < maxResults) {
      const title = this.decodeHtml(match.groups?.title ?? '').trim();
      const resolvedUrl = this.unwrapDuckDuckGoUrl(match.groups?.url ?? '');
      const snippet = this.decodeHtml(match.groups?.snippet ?? '').trim();
      if (title.length === 0 || resolvedUrl.length === 0) {
        continue;
      }
      entries.push({
        title,
        url: resolvedUrl,
        snippet: snippet.length > 0 ? snippet : null,
        raw: { source: 'duckduckgo_html_fallback' },
      });
    }
    return this.normalizeResults(entries, maxResults);
  }

  private unwrapDuckDuckGoUrl(rawUrl: string): string {
    if (rawUrl.length === 0) {
      return '';
    }
    const withProtocol = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
    try {
      const url = new URL(withProtocol);
      const wrapped = url.searchParams.get('uddg');
      return wrapped === null ? withProtocol : decodeURIComponent(wrapped);
    } catch {
      return withProtocol;
    }
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
      .replaceAll(/<[^>]+>/g, ' ')
      .replaceAll('&apos;', "'")
      .replaceAll('&quot;', '"')
      .replaceAll('&#x27;', "'")
      .replaceAll('&#39;', "'")
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&amp;', '&');
  }
}
