/** HTTP 429. */
export const HTTP_TOO_MANY_REQUESTS = 429;

/** Response header the auth routes send with every 429 (seconds). Axios lowercases it. */
export const RETRY_AFTER_HEADER = 'retry-after';

export const SECONDS_PER_MINUTE = 60;

/**
 * Copy for a refused sign-in / sign-up attempt (rules/58). The title and the
 * no-header fallback reuse the sign-up keys that already said this.
 */
export const RATE_LIMIT_COPY_KEYS = {
  title: 'auth.signup.rateLimitedTitle',
  inMinutes: 'auth.rateLimit.tryAgainInMinutes',
  inOneMinute: 'auth.rateLimit.tryAgainInOneMinute',
  fallback: 'auth.signup.rateLimitedDescription',
} as const;
