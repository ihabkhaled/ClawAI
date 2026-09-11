import { Injectable } from '@nestjs/common';

import {
  CRAWL_CONCURRENCY,
  CRAWL_DEFAULT_MAX_PAGES,
  CRAWL_DEFAULT_SITEMAP_PATH,
  CRAWL_MAX_SITEMAP_FETCHES,
  CRAWL_MIN_SITEMAP_URLS_BEFORE_LINK_FALLBACK,
  CRAWL_ROBOTS_TXT_PATH,
  CRAWL_USER_AGENT,
} from '../../../common/constants/crawl.constants';
import { runWithConcurrencyLimit } from '../../../common/utilities/concurrency-pool.utility';
import { parseFeedXml } from '../../../common/utilities/feed.utility';
import { sha1Short } from '../../../common/utilities/hash.utility';
import { isPathAllowed, parseRobotsTxt } from '../../../common/utilities/robots-txt.utility';
import { parseSitemapXml } from '../../../common/utilities/sitemap.utility';
import { CrawlDiscoveryMethod } from '../../../common/enums/crawl-discovery-method.enum';
import { FetchService } from '../../fetch/services/fetch.service';
import { traceEntry } from '../utilities/evidence-builder.utility';
import type { FeedEntry } from '../../../common/types/feed.types';
import type { RobotsTxtResult } from '../../../common/types/robots-txt.types';
import type { SitemapUrlEntry } from '../../../common/types/sitemap.types';
import type { FetchResult } from '../../fetch/types/fetch.types';
import type { CrawlCandidate } from '../types/crawl.types';
import type { EvidenceItem, ResearchTraceEntry } from '../types/evidence-bundle.types';

/**
 * Multi-page crawl of one site, built entirely out of pieces `ResearchManager`
 * already trusts: every page goes through `FetchService` (SSRF guard, domain
 * policy, cache, usage accounting all inherited, not reimplemented), and
 * robots.txt/sitemap.xml are just two more URLs fetched the same way.
 *
 * Deliberately NOT a general link-following spider: it fetches robots.txt,
 * resolves a sitemap (following a bounded nested-index chain), and only
 * when the sitemap comes up short does it supplement from the homepage's
 * own links. A site with no sitemap and no reachable homepage links crawls
 * to exactly one page, honestly, rather than guessing at a link graph.
 */
@Injectable()
export class SiteCrawlManager {
  constructor(private readonly fetchService: FetchService) {}

  async crawl(
    userId: string,
    startUrl: string,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
  ): Promise<EvidenceItem[]> {
    const origin = this.safeOrigin(startUrl);
    if (origin === null) {
      warnings.push(`Could not crawl ${startUrl}: not a valid absolute URL.`);
      return [];
    }

    const robots = await this.fetchRobotsTxt(userId, origin, trace, toolsUsed);

    const homepage = await this.fetchOne(userId, startUrl, trace, warnings, 'homepage');
    if (homepage === null) {
      // Nothing to crawl from if even the page the user named cannot be
      // read - matches runDirectFetch naming the page that failed.
      return [];
    }
    toolsUsed.push('web_fetch');

    const sitemapBudget = { remaining: CRAWL_MAX_SITEMAP_FETCHES };
    const sitemapEntries = await this.discoverSitemapEntries(
      userId,
      robots,
      origin,
      trace,
      sitemapBudget,
    );
    if (sitemapEntries.length > 0) {
      toolsUsed.push('web_crawl:sitemap');
    }

    const visited = new Set<string>([this.normalize(homepage.finalUrl)]);
    const candidates: CrawlCandidate[] = [];
    for (const entry of sitemapEntries) {
      this.addCandidate(candidates, visited, origin, entry.loc, CrawlDiscoveryMethod.SITEMAP);
    }
    if (sitemapEntries.length < CRAWL_MIN_SITEMAP_URLS_BEFORE_LINK_FALLBACK) {
      for (const link of homepage.links) {
        this.addCandidate(candidates, visited, origin, link, CrawlDiscoveryMethod.LINK);
      }
    }

    // A feed is checked unconditionally, not just when the sitemap is thin:
    // a sitemap can be complete but stale, while a feed is usually exactly
    // the site's most recent content — a genuinely different signal, not a
    // fallback for a missing one.
    const feedEntries = await this.discoverFeedEntries(userId, homepage, trace, toolsUsed);
    for (const entry of feedEntries) {
      this.addCandidate(candidates, visited, origin, entry.url, CrawlDiscoveryMethod.FEED);
    }

    const remainingBudget = Math.max(0, CRAWL_DEFAULT_MAX_PAGES - 1);
    const toFetch = candidates.slice(0, remainingBudget);

    const items: EvidenceItem[] = [this.toEvidence(homepage, CrawlDiscoveryMethod.USER)];
    let skippedByRobots = 0;

    await runWithConcurrencyLimit(toFetch, CRAWL_CONCURRENCY, async (candidate) => {
      const path = this.safePath(candidate.url);
      if (path !== null && !isPathAllowed(robots, CRAWL_USER_AGENT, path)) {
        skippedByRobots += 1;
        trace.push(
          traceEntry('crawl.page', 'skipped', null, `${candidate.url}: disallowed by robots.txt`),
        );
        return;
      }
      const result = await this.fetchOne(userId, candidate.url, trace, warnings, 'crawl.page');
      if (result !== null) {
        items.push(this.toEvidence(result, candidate.discoveryMethod));
      }
    });

    if (skippedByRobots > 0) {
      warnings.push(`${String(skippedByRobots)} page(s) skipped: disallowed by robots.txt.`);
    }
    if (items.length > 1) {
      toolsUsed.push('web_fetch:site_crawl');
    }
    trace.push(
      traceEntry(
        'crawl.summary',
        'ok',
        null,
        `${String(items.length)} page(s) crawled from ${origin}, ${String(sitemapEntries.length)} sitemap URL(s) and ${String(feedEntries.length)} feed URL(s) discovered`,
      ),
    );
    return items;
  }

  private async fetchRobotsTxt(
    userId: string,
    origin: string,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
  ): Promise<RobotsTxtResult> {
    const start = Date.now();
    try {
      const result = await this.fetchService.fetchPage(userId, {
        url: `${origin}${CRAWL_ROBOTS_TXT_PATH}`,
      });
      toolsUsed.push('web_crawl:robots');
      trace.push(
        traceEntry('crawl.robots', 'ok', Date.now() - start, `${origin}${CRAWL_ROBOTS_TXT_PATH}`),
      );
      return parseRobotsTxt(result.rawHtml ?? result.content);
    } catch {
      // No robots.txt, or it failed to fetch: robots.txt is opt-out, so
      // absence means everything is allowed, not that the crawl should stop.
      trace.push(
        traceEntry(
          'crawl.robots',
          'skipped',
          Date.now() - start,
          `${origin}${CRAWL_ROBOTS_TXT_PATH}: not found or unreachable`,
        ),
      );
      return { groups: [], sitemaps: [] };
    }
  }

  private async discoverFeedEntries(
    userId: string,
    homepage: FetchResult,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
  ): Promise<FeedEntry[]> {
    const feedUrl = homepage.metadata?.feedUrls[0];
    if (feedUrl === undefined) {
      return [];
    }
    const start = Date.now();
    try {
      const result = await this.fetchService.fetchPage(userId, { url: feedUrl });
      const parsed = parseFeedXml(result.rawHtml ?? result.content);
      if (parsed.kind === 'unrecognized') {
        trace.push(
          traceEntry('crawl.feed', 'warning', Date.now() - start, `${feedUrl}: not a feed`),
        );
        return [];
      }
      toolsUsed.push('web_crawl:feed');
      trace.push(
        traceEntry(
          'crawl.feed',
          'ok',
          Date.now() - start,
          `${feedUrl}: ${String(parsed.entries.length)} entr(y/ies)`,
        ),
      );
      return parsed.entries;
    } catch {
      trace.push(
        traceEntry(
          'crawl.feed',
          'skipped',
          Date.now() - start,
          `${feedUrl}: not found or unreachable`,
        ),
      );
      return [];
    }
  }

  private async discoverSitemapEntries(
    userId: string,
    robots: RobotsTxtResult,
    origin: string,
    trace: ResearchTraceEntry[],
    budget: { remaining: number },
  ): Promise<SitemapUrlEntry[]> {
    const candidates =
      robots.sitemaps.length > 0 ? robots.sitemaps : [`${origin}${CRAWL_DEFAULT_SITEMAP_PATH}`];
    for (const sitemapUrl of candidates) {
      const entries = await this.fetchSitemapRecursive(userId, sitemapUrl, trace, budget);
      if (entries.length > 0) {
        return entries;
      }
    }
    return [];
  }

  private async fetchSitemapRecursive(
    userId: string,
    sitemapUrl: string,
    trace: ResearchTraceEntry[],
    budget: { remaining: number },
  ): Promise<SitemapUrlEntry[]> {
    if (budget.remaining <= 0) {
      return [];
    }
    budget.remaining -= 1;
    const start = Date.now();
    try {
      const result = await this.fetchService.fetchPage(userId, { url: sitemapUrl });
      const parsed = parseSitemapXml(result.rawHtml ?? result.content);
      if (parsed.kind === 'urlset') {
        trace.push(
          traceEntry(
            'crawl.sitemap',
            'ok',
            Date.now() - start,
            `${sitemapUrl}: ${String(parsed.entries.length)} url(s)`,
          ),
        );
        return parsed.entries;
      }
      if (parsed.kind === 'sitemapindex') {
        trace.push(
          traceEntry(
            'crawl.sitemap',
            'ok',
            Date.now() - start,
            `${sitemapUrl}: index with ${String(parsed.sitemaps.length)} nested sitemap(s)`,
          ),
        );
        const collected: SitemapUrlEntry[] = [];
        for (const nested of parsed.sitemaps) {
          if (budget.remaining <= 0) {
            break;
          }
          collected.push(...(await this.fetchSitemapRecursive(userId, nested.loc, trace, budget)));
        }
        return collected;
      }
      trace.push(
        traceEntry('crawl.sitemap', 'warning', Date.now() - start, `${sitemapUrl}: not a sitemap`),
      );
      return [];
    } catch {
      trace.push(
        traceEntry(
          'crawl.sitemap',
          'skipped',
          Date.now() - start,
          `${sitemapUrl}: not found or unreachable`,
        ),
      );
      return [];
    }
  }

  private async fetchOne(
    userId: string,
    url: string,
    trace: ResearchTraceEntry[],
    warnings: string[],
    phase: string,
  ): Promise<FetchResult | null> {
    const start = Date.now();
    try {
      const result = await this.fetchService.fetchPage(userId, { url });
      trace.push(
        traceEntry(
          phase,
          'ok',
          Date.now() - start,
          `${url} (${String(result.byteSize)} bytes${result.cacheHit ? ', cached' : ''})`,
        ),
      );
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      warnings.push(`Could not crawl ${url}: ${message}`);
      trace.push(traceEntry(phase, 'warning', Date.now() - start, `${url}: ${message}`));
      return null;
    }
  }

  private addCandidate(
    candidates: CrawlCandidate[],
    visited: Set<string>,
    origin: string,
    rawUrl: string,
    discoveryMethod: CrawlDiscoveryMethod,
  ): void {
    if (this.safeOrigin(rawUrl) !== origin) {
      return;
    }
    const key = this.normalize(rawUrl);
    if (visited.has(key)) {
      return;
    }
    visited.add(key);
    candidates.push({ url: rawUrl, discoveryMethod });
  }

  private toEvidence(result: FetchResult, discoveryMethod: CrawlDiscoveryMethod): EvidenceItem {
    return {
      id: sha1Short(`crawl:${result.finalUrl}`),
      title: result.title,
      url: result.finalUrl,
      snippet: result.content,
      source: 'fetch',
      providerKind: null,
      publishedAt: null,
      fetchedAt: new Date().toISOString(),
      // The homepage is what the user actually named; discovered pages rank
      // slightly below it but still above an ordinary search hit.
      confidence: discoveryMethod === CrawlDiscoveryMethod.USER ? 0.95 : 0.7,
      structured: { crawlDiscoveryMethod: discoveryMethod, metadata: result.metadata },
    };
  }

  private safeOrigin(rawUrl: string): string | null {
    try {
      return new URL(rawUrl).origin;
    } catch {
      return null;
    }
  }

  private safePath(rawUrl: string): string | null {
    try {
      const parsed = new URL(rawUrl);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return null;
    }
  }

  private normalize(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      parsed.hash = '';
      return parsed.href.toLowerCase();
    } catch {
      return rawUrl.toLowerCase();
    }
  }
}
