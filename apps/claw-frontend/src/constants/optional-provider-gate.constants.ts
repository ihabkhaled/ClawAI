/** Optional local runtimes the chat page asks about. Production may not deploy them at all. */
export const OPTIONAL_PROVIDERS = { ollama: 'ollama', llamacpp: 'llamacpp' } as const;

/** An answer meaning "this service is not here": the same on every later attempt, so asking again only adds noise. */
export const OPTIONAL_PROVIDER_ABSENT_STATUSES: ReadonlySet<number> = new Set([404, 502, 503]);

/** Other failures back off 2 s, 4 s, 8 s ... up to the cap before the next real request. */
export const OPTIONAL_PROVIDER_BACKOFF_BASE_MS = 2_000;
export const OPTIONAL_PROVIDER_BACKOFF_CAP_MS = 5 * 60_000;

/** Returning to the tab re-checks, but never more often than this. */
export const OPTIONAL_PROVIDER_FOCUS_RECHECK_MS = 30_000;

export const OPTIONAL_PROVIDER_UNAVAILABLE_MESSAGE = 'Optional provider is not available';
export const OPTIONAL_PROVIDER_UNAVAILABLE_CODE = 'OPTIONAL_PROVIDER_UNAVAILABLE';
export const OPTIONAL_PROVIDER_UNAVAILABLE_STATUS = 503;
