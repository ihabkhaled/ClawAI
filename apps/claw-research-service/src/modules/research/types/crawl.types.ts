import type { CrawlDiscoveryMethod } from '../../../common/enums/crawl-discovery-method.enum';

export type CrawlCandidate = {
  url: string;
  discoveryMethod: CrawlDiscoveryMethod;
};
