export const DEFAULT_HTTP_TIMEOUT = 5000;

/** The most bytes JSON can spend on one character: a \uXXXX escape. */
export const MAX_JSON_BYTES_PER_CHAR = 6;

/**
 * The largest JSON body Express accepts. It must hold the largest request any
 * DTO allows, at the worst-case bytes per character — a spec checks it.
 * Express's default of 100kb refused every file or export over ~100k chars.
 */
export const JSON_BODY_LIMIT_BYTES = 8 * 1024 * 1024;
