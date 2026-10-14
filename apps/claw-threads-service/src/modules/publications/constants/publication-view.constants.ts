/** The same visitor reloading inside this window is one view. */
export const VIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

/** Raw view rows are kept this long. The counters on the publication stay. */
export const VIEW_RETENTION_DAYS = 30;

/** How often old view rows are purged. */
export const VIEW_RETENTION_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Crawlers and link-preview fetchers never count as human readers. */
export const BOT_USER_AGENT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|fetch|monitor|lighthouse|headless|curl|wget|python-requests|axios|node-fetch|go-http|java\//iu;

/** Per-address limit on the view endpoints, per minute. */
export const VIEW_RATE_LIMIT_PER_MINUTE = 30;

/** One day, for the retention cutoff. */
export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** The rate-limit window for the view endpoints. */
export const VIEW_RATE_LIMIT_WINDOW_MS = 60_000;

/** One Board row refresh per publication per this interval, however many views arrive. */
export const BOARD_NOTIFY_MIN_INTERVAL_MS = 30_000;

/** Publications tracked for that coalescing; the map is cleared when it reaches this size. */
export const BOARD_NOTIFY_MAX_TRACKED = 5000;
