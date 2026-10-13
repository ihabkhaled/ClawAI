export const BOARD_PAGE_SIZES = [12, 24, 48] as const;
export const BOARD_DEFAULT_LIMIT = 12;
export const BOARD_MAX_PAGE = 500;
export const BOARD_QUERY_MAX_LENGTH = 100;
export const BOARD_SORTS = ['latest', 'trending', 'discussed', 'liked'] as const;
export const BOARD_ALL = 'all';

export const BOARD_SUGGEST_LIMIT = 10;
export const BOARD_SUGGEST_TOTAL_CAP = 100;
export const BOARD_SUGGEST_MIN_LENGTH = 2;

/** Text-search configuration the projection's tsv column is built with. */
export const BOARD_TS_CONFIG = 'simple';

/** Trigram weight added to the full-text rank. */
export const BOARD_TRIGRAM_WEIGHT = 0.6;
export const BOARD_SIMILARITY_THRESHOLD = 0.3;
export const BOARD_WORD_SIMILARITY_THRESHOLD = 0.45;

/** didYouMean is offered when a query finds fewer than this many results. */
export const BOARD_DID_YOU_MEAN_BELOW = 3;
export const BOARD_DID_YOU_MEAN_MIN_SIMILARITY = 0.4;
export const BOARD_DID_YOU_MEAN_MAX_TOKENS = 6;
export const BOARD_DID_YOU_MEAN_MIN_WORD_LENGTH = 3;

export const BOARD_LIST_RATE_LIMIT_PER_MINUTE = 120;
export const BOARD_SUGGEST_RATE_LIMIT_PER_MINUTE = 60;
export const BOARD_RATE_LIMIT_WINDOW_MS = 60_000;
export const BOARD_SUGGEST_CACHE_CONTROL = 'private, max-age=15';
