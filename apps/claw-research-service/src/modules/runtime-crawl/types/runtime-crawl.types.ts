import type {
  RuntimeCrawlConfig,
  RuntimeCrawlPage,
  RuntimeCrawlProfile,
  RuntimeCrawlRun,
} from '../../../generated/prisma';

/** The limits one run actually runs under: the request clamped to config. */
export type RuntimeCrawlEffectiveLimits = {
  maxPages: number;
  maxDepth: number;
};

export type RuntimeCrawlUsageSnapshot = {
  running: number;
  runsToday: number;
  pagesToday: number;
};

export type RuntimeCrawlPageRow = Omit<
  RuntimeCrawlPage,
  'id' | 'createdAt' | 'runId' | 'links' | 'injectionFlags'
> & { links: string[]; injectionFlags: string[] };

/** What a page looks like on the wire: bounded text, bounded links, flagged injection. */
export type RuntimeCrawlPageView = {
  ordinal: number;
  url: string;
  title: string | null;
  text: string;
  textTruncated: boolean;
  links: string[];
  discoveryMethod: string;
  injectionFlags: string[];
};

export type RuntimeCrawlRunView = {
  id: string;
  profile: RuntimeCrawlProfile;
  startUrl: string;
  intent: string;
  status: RuntimeCrawlRun['status'];
  maxPages: number;
  maxDepth: number;
  pagesFetched: number;
  errorCode: string | null;
  errorMessage: string | null;
  warnings: string[];
  startedAt: Date;
  completedAt: Date | null;
};

export type RuntimeCrawlStartView = {
  run: RuntimeCrawlRunView;
  page: RuntimeCrawlPageView | null;
};

export type RuntimeCrawlPagesView = {
  runId: string;
  status: RuntimeCrawlRun['status'];
  pages: RuntimeCrawlPageView[];
  /** Pass as `after` for the next page; `null` when there is no more. */
  nextAfter: number | null;
};

export type RuntimeCrawlConfigView = RuntimeCrawlConfig;

/** A page as the crawler or extractor produced it, before bounding. */
export type RuntimeCrawlRawPage = {
  url: string;
  title: string | null;
  text: string;
  links: string[];
  discoveryMethod: string;
};

export type RuntimeCrawlPageBounds = {
  maxTextChars: number;
  maxLinks: number;
};

export type GuardedRuntimeRequest = {
  user?: { id?: string; sub?: string };
};
