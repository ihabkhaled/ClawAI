import type { CrawlDiscoveryMethod } from '../../../common/enums/crawl-discovery-method.enum';
import type { FeedEntry } from '../../../common/types/feed.types';
import type { SitemapUrlEntry } from '../../../common/types/sitemap.types';
import type { EvidenceItem } from './evidence-bundle.types';

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
};
