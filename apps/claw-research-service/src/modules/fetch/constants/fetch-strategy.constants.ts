import { FetchStrategyKind } from '../../../generated/prisma';

/**
 * Escalation order, lowest tier first (ADR-121). Cheap and polite first:
 * an official API or a plain GET costs the target almost nothing; a browser
 * or a sidecar costs a lot more, and the public archive is last because its
 * copy is old by definition.
 */
export const FETCH_STRATEGY_DEFAULT_TIER: Readonly<Record<FetchStrategyKind, number>> = {
  [FetchStrategyKind.OFFICIAL_API]: 0,
  [FetchStrategyKind.HTTP_PLAIN]: 10,
  [FetchStrategyKind.HTTP_TLS_IMPERSONATE]: 20,
  [FetchStrategyKind.HEADLESS_BROWSER]: 30,
  [FetchStrategyKind.CRAWL4AI]: 40,
  [FetchStrategyKind.FLARESOLVERR]: 50,
  [FetchStrategyKind.FIRECRAWL]: 60,
  [FetchStrategyKind.READER_PROXY]: 70,
  [FetchStrategyKind.ARCHIVE_SNAPSHOT]: 80,
};

/**
 * Seeded enablement (owner decision, 2026-09-25). Every in-process strategy
 * is on. The three sidecars are off: their containers exist only when their
 * compose profile is started, so enabling them by default would make every
 * escalation pay a connection-refused round trip for a service that is not
 * there. An admin enables one after starting its profile.
 */
export const FETCH_STRATEGY_DEFAULT_ENABLED: Readonly<Record<FetchStrategyKind, boolean>> = {
  [FetchStrategyKind.OFFICIAL_API]: true,
  [FetchStrategyKind.HTTP_PLAIN]: true,
  [FetchStrategyKind.HTTP_TLS_IMPERSONATE]: true,
  [FetchStrategyKind.HEADLESS_BROWSER]: true,
  [FetchStrategyKind.CRAWL4AI]: false,
  [FetchStrategyKind.FLARESOLVERR]: false,
  [FetchStrategyKind.FIRECRAWL]: false,
  [FetchStrategyKind.READER_PROXY]: true,
  [FetchStrategyKind.ARCHIVE_SNAPSHOT]: true,
};

/** Per-attempt timeout seeded into each config row, in ms. */
export const FETCH_STRATEGY_DEFAULT_TIMEOUT_MS: Readonly<Record<FetchStrategyKind, number>> = {
  [FetchStrategyKind.OFFICIAL_API]: 10_000,
  [FetchStrategyKind.HTTP_PLAIN]: 10_000,
  [FetchStrategyKind.HTTP_TLS_IMPERSONATE]: 12_000,
  [FetchStrategyKind.HEADLESS_BROWSER]: 20_000,
  [FetchStrategyKind.CRAWL4AI]: 45_000,
  [FetchStrategyKind.FLARESOLVERR]: 45_000,
  [FetchStrategyKind.FIRECRAWL]: 45_000,
  [FetchStrategyKind.READER_PROXY]: 20_000,
  [FetchStrategyKind.ARCHIVE_SNAPSHOT]: 20_000,
};

/**
 * Default `publicConfig.baseUrl` for the sidecars — internal compose service
 * names on the private `claw-scrapers` network. Never exposed through nginx.
 */
export const SIDECAR_DEFAULT_BASE_URL: Readonly<Partial<Record<FetchStrategyKind, string>>> = {
  [FetchStrategyKind.CRAWL4AI]: 'http://crawl4ai:11235',
  [FetchStrategyKind.FLARESOLVERR]: 'http://flaresolverr:8191',
  [FetchStrategyKind.FIRECRAWL]: 'http://firecrawl-api:3002',
  [FetchStrategyKind.READER_PROXY]: 'https://r.jina.ai/',
};

/** Strategies that send a request to the target site (directly or via a renderer). */
export const STRATEGIES_TOUCHING_ORIGIN: ReadonlySet<FetchStrategyKind> = new Set([
  FetchStrategyKind.OFFICIAL_API,
  FetchStrategyKind.HTTP_PLAIN,
  FetchStrategyKind.HTTP_TLS_IMPERSONATE,
  FetchStrategyKind.HEADLESS_BROWSER,
  FetchStrategyKind.CRAWL4AI,
  FetchStrategyKind.FLARESOLVERR,
  FetchStrategyKind.FIRECRAWL,
  FetchStrategyKind.READER_PROXY,
]);

/** Strategies that execute the page's JavaScript before extracting it. */
export const STRATEGIES_RENDERING_JAVASCRIPT: ReadonlySet<FetchStrategyKind> = new Set([
  FetchStrategyKind.HEADLESS_BROWSER,
  FetchStrategyKind.CRAWL4AI,
  FetchStrategyKind.FLARESOLVERR,
  FetchStrategyKind.FIRECRAWL,
  FetchStrategyKind.READER_PROXY,
]);

/**
 * Strategies a host's memory may move to the FRONT of the chain. The reader
 * proxy and the archive are never promoted: one dead-page day must not make
 * every later fetch of that host start from a third party or a stale copy.
 */
export const STRATEGIES_PROMOTABLE_BY_HOST_MEMORY: ReadonlySet<FetchStrategyKind> = new Set([
  FetchStrategyKind.HTTP_TLS_IMPERSONATE,
  FetchStrategyKind.HEADLESS_BROWSER,
  FetchStrategyKind.CRAWL4AI,
  FetchStrategyKind.FLARESOLVERR,
  FetchStrategyKind.FIRECRAWL,
]);

/** A host's remembered strategy older than this is ignored, in ms (7 days). */
export const HOST_MEMORY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

/** The only strategies allowed to serve a MACHINE_READABLE fetch (raw bytes, live). */
export const MACHINE_READABLE_STRATEGIES: ReadonlySet<FetchStrategyKind> = new Set([
  FetchStrategyKind.HTTP_PLAIN,
  FetchStrategyKind.HTTP_TLS_IMPERSONATE,
]);

/** Hard ceiling on strategies tried per fetch — never unbounded retries. */
export const FETCH_STRATEGY_MAX_ATTEMPTS = 6;

/**
 * Wall-clock budget for one whole escalation, in ms. Each attempt's own
 * timeout is clamped to what is left, and no attempt starts once it is spent.
 */
export const FETCH_ESCALATION_WALL_CLOCK_MS = 60_000;

/** An attempt is not started with less than this much budget left, in ms. */
export const FETCH_ESCALATION_MIN_ATTEMPT_MS = 2_000;

/** Minimum wall-clock gap between two fetches of the SAME host, in ms. */
export const FETCH_STRATEGY_MIN_HOST_INTERVAL_MS = 1_000;

/** Rate-limiter map size above which expired keys are pruned. */
export const HOST_RATE_LIMITER_PRUNE_THRESHOLD = 1_000;

/**
 * Minimum gap between two Jina Reader calls from this process, in ms. The
 * keyless tier allows roughly 20 requests a minute; 3.5 s keeps well under.
 */
export const READER_PROXY_MIN_INTERVAL_MS = 3_500;

/** Rate-limiter key shared by every reader-proxy call from this process. */
export const READER_PROXY_RATE_LIMIT_KEY = 'reader-proxy';

/** How Jina Reader reports the target's own HTTP error inside a 200 answer. */
export const READER_PROXY_TARGET_STATUS_PATTERN = /Target URL returned error (\d{3})/u;

/** Below this many characters of text, a 2xx HTML page is an empty JS shell. */
export const BLOCK_SIGNAL_EMPTY_SHELL_MIN_CHARS = 200;

/** Markup that means a page's text is produced by its scripts (an SPA or a `<script>`). */
export const SCRIPT_DRIVEN_MARKUP_PATTERN =
  /<script\b|<noscript\b|id=["'](?:root|app|__next|__nuxt|svelte)["']/iu;

/** How much of the extracted text the classifier scans for markers. */
export const BLOCK_SIGNAL_SCAN_CHARS = 4_000;

/** Case-insensitive markers for a JS challenge interstitial. */
export const JS_CHALLENGE_MARKERS: readonly string[] = [
  'checking your browser before accessing',
  'just a moment...',
  'cf-browser-verification',
  'cf-chl-',
  'ddos protection by',
  'attention required! | cloudflare',
  'enable javascript and cookies to continue',
];

/** Case-insensitive markers for a captcha. */
export const CAPTCHA_MARKERS: readonly string[] = [
  'g-recaptcha',
  'h-captcha',
  'hcaptcha.com/1/api',
  'are you a robot',
  'verify you are human',
  'captcha-delivery',
  'px-captcha',
];

/** Error text meaning the host does not exist or refuses connections at all. */
export const DEAD_HOST_ERROR_MARKERS: readonly string[] = [
  'enotfound',
  'getaddrinfo',
  'econnrefused',
  'dns error',
  'failed to lookup address',
];

/** The Internet Archive hosts the archive strategy may call (TD-038 allowlist). */
export const ARCHIVE_SNAPSHOT_HOSTS: ReadonlySet<string> = new Set([
  'archive.org',
  'web.archive.org',
]);

/** Wayback Machine availability API. */
export const ARCHIVE_SNAPSHOT_AVAILABILITY_URL = 'https://archive.org/wayback/available';

/** Prefix put in front of every archived page's text, so no reader mistakes it for live. */
export const ARCHIVE_SNAPSHOT_LABEL_PREFIX = 'Archived copy, captured';

/**
 * Hosts a reader proxy must never be sent to even when they are public —
 * sites that are only useful signed in, where the proxy would at best return
 * a login page and at worst leak a URL that carries a session token.
 */
export const READER_PROXY_REFUSED_HOST_SUFFIXES: readonly string[] = [
  'docs.google.com',
  'drive.google.com',
  'mail.google.com',
  'outlook.live.com',
  'app.slack.com',
  'notion.so',
];

/** Query-parameter names that mark a URL as carrying credentials. */
export const CREDENTIAL_QUERY_PARAMETERS: readonly string[] = [
  'token',
  'access_token',
  'auth',
  'key',
  'api_key',
  'apikey',
  'sig',
  'signature',
  'session',
  'sessionid',
  'password',
  'x-amz-signature',
];

/** Browser profile impit impersonates (TLS ClientHello + HTTP/2 settings + headers). */
export const TLS_IMPERSONATE_BROWSER = 'chrome';

/** Structured log event name for the line naming the tier that served a page. */
export const FETCH_SERVED_LOG_EVENT = 'fetch.served';
