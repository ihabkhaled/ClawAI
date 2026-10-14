export const BOARD_PAGE_SIZES = [12, 24, 48] as const;
export const BOARD_DEFAULT_LIMIT = 12;
/** Deepest page a list query reads rows for; a deeper page answers an empty page with real meta. */
export const BOARD_MAX_PAGE = 500;
/** Largest page number the API accepts, so any page a client builds answers 200, never 400. */
export const BOARD_PAGE_INPUT_CAP = 100_000;
export const BOARD_QUERY_MAX_LENGTH = 100;
export const BOARD_SORTS = ['latest', 'trending', 'discussed', 'liked'] as const;
export const BOARD_ALL = 'all';

export const BOARD_SUGGEST_LIMIT = 10;
export const BOARD_SUGGEST_TOTAL_CAP = 100;
export const BOARD_SUGGEST_MIN_LENGTH = 2;
/** Shorter than this a trigram index is useless, so only the prefix and full-text arms run. */
export const BOARD_TRIGRAM_MIN_LENGTH = 3;

/** Text-search configuration the projection's tsv column is built with. */
export const BOARD_TS_CONFIG = 'simple';

/** Trigram weight added to the full-text rank. */
export const BOARD_TRIGRAM_WEIGHT = 0.6;
/**
 * Thresholds behind the `%` and `<%` operators. They are set per transaction (set_config, local) around
 * every searching read, so no connection, database or other service depends on a server-wide value.
 */
export const BOARD_SIMILARITY_THRESHOLD = 0.3;
export const BOARD_WORD_SIMILARITY_THRESHOLD = 0.45;

/** didYouMean is offered when a query finds fewer than this many results. */
export const BOARD_DID_YOU_MEAN_BELOW = 3;
export const BOARD_DID_YOU_MEAN_MIN_SIMILARITY = 0.4;
export const BOARD_DID_YOU_MEAN_MAX_TOKENS = 6;
export const BOARD_DID_YOU_MEAN_MIN_WORD_LENGTH = 3;
export const BOARD_DID_YOU_MEAN_MAX_WORD_LENGTH = 64;

/** The dictionary and trending score are rebuilt this often; both are idempotent. */
export const BOARD_MAINTENANCE_INTERVAL_MS = 120_000;
/** Postgres advisory lock key so replicas do not rebuild at the same time. */
export const BOARD_MAINTENANCE_LOCK_KEY = 7_731_001;
/** A trending score is only rewritten when it moved by more than this share (plus a tiny floor). */
export const BOARD_TRENDING_REWRITE_SHARE = 0.02;
export const BOARD_TRENDING_REWRITE_FLOOR = 0.001;

export const BOARD_LIST_RATE_LIMIT_PER_MINUTE = 120;
export const BOARD_SUGGEST_RATE_LIMIT_PER_MINUTE = 60;
export const BOARD_RATE_LIMIT_WINDOW_MS = 60_000;
export const BOARD_SUGGEST_CACHE_CONTROL = 'private, max-age=15';

/** Anonymous (marketing site) board: stricter per-address limits and shared-cache headers. */
export const BOARD_PUBLIC_LIST_RATE_LIMIT_PER_MINUTE = 60;
export const BOARD_PUBLIC_SUGGEST_RATE_LIMIT_PER_MINUTE = 40;
export const BOARD_PUBLIC_LIST_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';
export const BOARD_PUBLIC_SUGGEST_CACHE_CONTROL = 'public, s-maxage=30';
/** Never Authorization: the anonymous response is identical for every caller. */
export const BOARD_PUBLIC_VARY = 'Accept-Language';
