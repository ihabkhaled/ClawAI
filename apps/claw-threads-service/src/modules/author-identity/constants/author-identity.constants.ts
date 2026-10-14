/** Longest the page waits for auth-service to name the authors of a page. Past it, names degrade to null. */
export const AUTHOR_IDENTITY_TIMEOUT_MS = 2000;

/** How long a name is reused. Short: a renamed account shows its new name within a minute. */
export const AUTHOR_IDENTITY_CACHE_TTL_MS = 60_000;

/** Entries the in-memory name cache may hold before the oldest are dropped. */
export const AUTHOR_IDENTITY_CACHE_MAX_ENTRIES = 2000;

/** auth-service refuses more ids than this in one call. */
export const AUTHOR_IDENTITY_MAX_BATCH = 100;

export const AUTH_PUBLIC_PROFILES_PATH = '/api/v1/internal/users/public-profiles';
export const AUTH_PROFILE_BY_USERNAME_PATH = '/api/v1/internal/users/by-username';
