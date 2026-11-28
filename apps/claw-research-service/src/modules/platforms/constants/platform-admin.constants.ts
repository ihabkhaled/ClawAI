/** Admin DTO bounds for `/research/platforms` (research engine B3). */
export const PLATFORM_SLUG_PATTERN = /^[a-z0-9-]{2,40}$/u;
/**
 * A bare host name usable in `site:<domain>`: 2+ dot-separated labels, each
 * `PLATFORM_DOMAIN_LABEL_PATTERN` not starting or ending with `-`, the last
 * one letters only. No scheme, path,
 * port or space. Checked label by label (`isPlatformDomain`), never with one
 * nested-quantifier pattern over the whole string.
 */
export const PLATFORM_DOMAIN_LABEL_PATTERN = /^[a-z0-9-]{1,63}$/u;
export const PLATFORM_DOMAIN_TLD_PATTERN = /^[a-z]{2,63}$/u;
export const PLATFORM_DOMAIN_MAX_LENGTH = 253;
export const PLATFORM_NAME_MAX_LENGTH = 80;
export const PLATFORM_NOTES_MAX_LENGTH = 500;
export const PLATFORM_MAX_DOMAINS = 10;
export const PLATFORM_MAX_LANGUAGES = 13;
export const PLATFORM_MAX_PRIORITY = 1000;
export const PLATFORM_MAX_RESULTS_CEILING = 20;
export const PLATFORM_MIN_TIMEOUT_MS = 1_000;
export const PLATFORM_MAX_TIMEOUT_MS = 20_000;
export const PLATFORM_TEST_QUERY_MAX_LENGTH = 200;
