/** The one `RuntimeCrawlConfig` row. */
export const RUNTIME_CRAWL_CONFIG_ID = 'default';

/**
 * Seed values for the DB-level config. They are only the first-boot defaults:
 * an admin edit survives every reboot (the seeder never touches an existing
 * row). `0` disables a dimension; there is no "unlimited".
 */
export const RUNTIME_CRAWL_DEFAULTS = {
  enabled: true,
  maxPagesPerRun: 50,
  maxLinkDepth: 2,
  maxConcurrentRunsPerUser: 1,
  dailyPageBudgetPerUser: 200,
  maxRunsPerUserPerDay: 20,
  maxTextCharsPerPage: 16_000,
  maxLinksPerPage: 50,
  runTimeoutSeconds: 300,
} as const;

/**
 * Code-level ceilings no admin edit can exceed. The crawler's own ceiling
 * (`CRAWL_MAX_PAGES_CEILING`, 200) and link depth (`CRAWL_MAX_LINK_DEPTH`, 3)
 * are the upper bounds for pages and depth.
 */
export const RUNTIME_CRAWL_CEILINGS = {
  maxConcurrentRunsPerUser: 5,
  dailyPageBudgetPerUser: 5000,
  maxRunsPerUserPerDay: 500,
  maxTextCharsPerPage: 32_000,
  maxLinksPerPage: 100,
  runTimeoutSeconds: 900,
} as const;

/** A RUNNING row older than this many timeouts is treated as dead, not as a live run. */
export const RUNTIME_CRAWL_STALE_RUN_FACTOR = 2;

/** Window for the daily budget and the daily run count. */
export const RUNTIME_CRAWL_DAY_MS = 24 * 60 * 60 * 1000;

export const RUNTIME_CRAWL_DEFAULT_PAGES_PAGE_SIZE = 10;
export const RUNTIME_CRAWL_MAX_PAGES_PAGE_SIZE = 25;
export const RUNTIME_CRAWL_LIST_DEFAULT = 20;
export const RUNTIME_CRAWL_LIST_MAX = 50;

/** Most warnings kept on a run row. */
export const RUNTIME_CRAWL_MAX_WARNINGS = 50;
export const RUNTIME_CRAWL_MAX_WARNING_LENGTH = 300;
export const RUNTIME_CRAWL_MAX_INTENT_LENGTH = 300;

/** The plan gate: the same unlock the web app research loop checks first (rule 50 item 2). */
export const RUNTIME_CRAWL_PLAN_FEATURE = 'allowResearchMode';

/**
 * Refusals the fetch layer reports by code. When a crawl reads nothing and the
 * first warning names one of these, the run fails WITH that code, so a client
 * can tell "the site's robots.txt said no" from "the page was a 404".
 */
export const RUNTIME_CRAWL_REFUSAL_CODES: readonly string[] = [
  'FETCH_ROBOTS_DISALLOWED',
  'DOMAIN_BLOCKED',
  'DOMAIN_NOT_ALLOWED',
  'UNSAFE_URL',
];
