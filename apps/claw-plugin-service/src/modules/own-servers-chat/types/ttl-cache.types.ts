/** One cached value and the time (ms since the epoch) it stops being served. */
export type TtlCacheEntry<T> = { value: T; expiresAt: number };
