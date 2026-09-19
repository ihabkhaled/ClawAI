import { Injectable } from '@nestjs/common';
import { rankCandidatesByIntent, stripWww } from '../utilities/crawl-ranking.utility';

import {
  CRAWL_CONCURRENCY,
  CRAWL_DEFAULT_MAX_PAGES,
  CRAWL_DEFAULT_SITEMAP_PATH,
  CRAWL_MAX_LINK_DEPTH,
  CRAWL_MAX_PAGES_CEILING,
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
import { pushFetchToolMarker, traceEntry } from '../utilities/evidence-builder.utility';
import { ResearchProgressPublisher } from './research-progress-publisher.service';
import type { FeedEntry } from '../../../common/types/feed.types';
import type { RobotsTxtResult } from '../../../common/types/robots-txt.types';
import type { SitemapUrlEntry } from '../../../common/types/sitemap.types';
import type { FetchResult } from '../../fetch/types/fetch.types';
import type {
  CrawlCandidate,
  CrawlDiscoveryResult,
  CrawlFetchResult,
  CrawlLinkFollowContext,
} from '../types/crawl.types';
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
  constructor(
    private readonly fetchService: FetchService,
    private readonly progressPublisher: ResearchProgressPublisher,
  ) {}

  async crawl(
    userId: string,
    startUrl: string,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
    correlationId: string | undefined,
    maxPages: number = CRAWL_DEFAULT_MAX_PAGES,
    intent = '',
  ): Promise<EvidenceItem[]> {
    const origin = this.safeOrigin(startUrl);
    if (origin === null) {
      warnings.push(`Could not crawl ${startUrl}: not a valid absolute URL.`);
      return [];
    }

    this.progressPublisher.publish(correlationId, 'started', `Starting crawl of ${origin}`, 0, 0);

    const robots = await this.fetchRobotsTxt(userId, origin, trace, toolsUsed);
    this.progressPublisher.publish(correlationId, 'robots', `Checked ${origin}/robots.txt`, 0, 0);

    const homepage = await this.fetchOne(userId, startUrl, trace, warnings, 'homepage');
    if (homepage === null) {
      // Nothing to crawl from if even the page the user named cannot be
      // read - matches runDirectFetch naming the page that failed.
      return [];
    }
    pushFetchToolMarker(toolsUsed, homepage);

    // The site's REAL origin is wherever the homepage landed, not what the user
    // typed. `example.com` routinely redirects to `https://www.example.com`, and
    // every sitemap entry and link then carries the www origin; compared with
    // the typed origin, all of them were dropped and the crawl returned the
    // homepage alone. Bare-domain detection makes the typed form the common
    // case, so this is no longer an edge.
    const siteOrigin = this.safeOrigin(homepage.finalUrl) ?? origin;

    const discovery = await this.discoverCandidates(
      userId,
      siteOrigin,
      homepage,
      robots,
      trace,
      toolsUsed,
      correlationId,
    );

    const pageBudget = Math.min(Math.max(1, maxPages), CRAWL_MAX_PAGES_CEILING);
    const remainingBudget = Math.max(0, pageBudget - 1);
    // Ranked before slicing. Sitemaps list pages in document order, so on a
    // large site "the pricing page" was simply never among the first nineteen
    // and the question was answered from the blog index instead.
    const toFetch = rankCandidatesByIntent(discovery.candidates, intent).slice(0, remainingBudget);
    const first = await this.fetchCandidates(
      userId,
      homepage,
      toFetch,
      robots,
      trace,
      warnings,
      correlationId,
      { alreadyRead: 0, planned: pageBudget },
    );
    const items = first.items;
    const skippedByRobots =
      first.skippedByRobots +
      (await this.followLinks(
        userId,
        items,
        [homepage.finalUrl, ...discovery.candidates.map((candidate) => candidate.url)],
        [...homepage.links, ...first.links],
        { siteOrigin, intent, pageBudget, robots, trace, warnings, correlationId },
      ));

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
        `${String(items.length)} page(s) crawled from ${origin}, ${String(discovery.sitemapEntries.length)} sitemap URL(s) and ${String(discovery.feedEntries.length)} feed URL(s) discovered`,
      ),
    );
    this.progressPublisher.publish(
      correlationId,
      'completed',
      `Crawl complete: ${String(items.length)} page(s) fetched`,
      items.length,
      toFetch.length + 1,
    );
    return items;
  }

  /**
   * Resolves the sitemap and feed, and folds both plus the homepage's own
   * links into one deduplicated candidate list — split out of `crawl()`
   * purely to keep that method under the file's line-count budget; it owns
   * no state `crawl()` doesn't hand it.
   */
  private async discoverCandidates(
    userId: string,
    origin: string,
    homepage: FetchResult,
    robots: RobotsTxtResult,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    correlationId: string | undefined,
  ): Promise<CrawlDiscoveryResult> {
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
    this.progressPublisher.publish(
      correlationId,
      'sitemap',
      `Discovered ${String(sitemapEntries.length)} sitemap URL(s)`,
      1,
      sitemapEntries.length,
    );

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
    this.progressPublisher.publish(
      correlationId,
      'feed',
      `Discovered ${String(feedEntries.length)} feed entr(y/ies)`,
      1,
      sitemapEntries.length + feedEntries.length,
    );

    return { candidates, sitemapEntries, feedEntries };
  }

  /**
   * Fetches every candidate up to the page budget, respecting robots.txt,
   * and reports one progress tick per page — split out of `crawl()` purely
   * to keep that method under the file's line-count budget.
   */
  private async fetchCandidates(
    userId: string,
    homepage: FetchResult | null,
    toFetch: CrawlCandidate[],
    robots: RobotsTxtResult,
    trace: ResearchTraceEntry[],
    warnings: string[],
    correlationId: string | undefined,
    progress: { alreadyRead: number; planned: number } = { alreadyRead: 0, planned: 0 },
  ): Promise<CrawlFetchResult> {
    const items: EvidenceItem[] =
      homepage === null ? [] : [this.toEvidence(homepage, CrawlDiscoveryMethod.USER)];
    const links: string[] = [];
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
        links.push(...result.links);
      }
      this.progressPublisher.publish(
        correlationId,
        'page',
        `Fetched ${candidate.url}`,
        progress.alreadyRead + items.length,
        Math.max(
          progress.planned,
          progress.alreadyRead + toFetch.length + (homepage === null ? 0 : 1),
        ),
      );
    });

    return { items, skippedByRobots, links };
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

  /**
   * Breadth-first beyond the first hop, until the budget is met. Every page
   * already queued or read goes into `seen`, so no page is fetched twice. Appends
   * to `items` and returns how many links robots.txt refused.
   */
  private async followLinks(
    userId: string,
    items: EvidenceItem[],
    alreadyQueued: string[],
    firstFrontier: string[],
    context: CrawlLinkFollowContext,
  ): Promise<number> {
    const seen = new Set<string>(alreadyQueued.map((url) => this.normalize(url)));
    let skippedByRobots = 0;
    let frontier = firstFrontier;
    for (
      let depth = 1;
      depth <= CRAWL_MAX_LINK_DEPTH && items.length < context.pageBudget;
      depth += 1
    ) {
      const next: CrawlCandidate[] = [];
      for (const link of frontier) {
        this.addCandidate(next, seen, context.siteOrigin, link, CrawlDiscoveryMethod.LINK);
      }
      if (next.length === 0) {
        break;
      }
      const wave = rankCandidatesByIntent(next, context.intent).slice(
        0,
        context.pageBudget - items.length,
      );
      const fetched = await this.fetchCandidates(
        userId,
        null,
        wave,
        context.robots,
        context.trace,
        context.warnings,
        context.correlationId,
        { alreadyRead: items.length, planned: context.pageBudget },
      );
      items.push(...fetched.items);
      skippedByRobots += fetched.skippedByRobots;
      frontier = fetched.links;
    }
    return skippedByRobots;
  }

  private addCandidate(
    candidates: CrawlCandidate[],
    visited: Set<string>,
    origin: string,
    rawUrl: string,
    discoveryMethod: CrawlDiscoveryMethod,
  ): void {
    if (!this.isSameSite(rawUrl, origin)) {
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

  /**
   * Same site means same host, ignoring a leading `www.` and the scheme.
   *
   * A sitemap on `https://www.example.com` that lists `https://example.com/...`
   * (or `http://`) pages is describing its own site, and the pages redirect to
   * the canonical host when fetched. Anything on a DIFFERENT host is still
   * refused: a crawl never leaves the site the user named.
   */
  private isSameSite(rawUrl: string, origin: string): boolean {
    try {
      const candidate = new URL(rawUrl);
      const site = new URL(origin);
      if (candidate.protocol !== 'http:' && candidate.protocol !== 'https:') {
        return false;
      }
      return stripWww(candidate.hostname) === stripWww(site.hostname);
    } catch {
      return false;
    }
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
