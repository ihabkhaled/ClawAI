import type { CrawlDiscoveryMethod } from '../../../common/enums/crawl-discovery-method.enum';
import type { FeedEntry } from '../../../common/types/feed.types';
import type { SitemapUrlEntry } from '../../../common/types/sitemap.types';
import type { RobotsTxtResult } from '../../../common/types/robots-txt.types';
import type { EvidenceItem, ResearchTraceEntry } from './evidence-bundle.types';

export type CrawlCandidate = {
  url: string;
  discoveryMethod: CrawlDiscoveryMethod;
};

/** Everything `SiteCrawlManager.discoverCandidates` found, before fetching. */
export type CrawlDiscoveryResult = {
  candidates: CrawlCandidate[];
  sitemapEntries: SitemapUrlEntry[];
  feedEntries: FeedEntry[];
};

/** What one pass of `SiteCrawlManager.fetchCandidates` produced. */
export type CrawlFetchResult = {
  items: EvidenceItem[];
  skippedByRobots: number;
  /** Every link seen on the pages fetched, for the next breadth-first hop. */
  links: string[];
};

/** What each breadth-first link hop needs, fixed for the whole crawl. */
export type CrawlLinkFollowContext = {
  siteOrigin: string;
  intent: string;
  pageBudget: number;
  robots: RobotsTxtResult;
  trace: ResearchTraceEntry[];
  warnings: string[];
  correlationId: string | undefined;
};
