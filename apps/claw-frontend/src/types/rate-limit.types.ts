/** The i18n key and its parameters for "try again in N minutes". */
export type RateLimitMessage = {
  key: string;
  params?: Record<string, number>;
};

/** The three keys of a "try again in N minutes" message: N > 1, N = 1, and no Retry-After. */
export type RetryAfterCopyKeys = {
  inMinutes: string;
  inOneMinute: string;
  fallback: string;
};
