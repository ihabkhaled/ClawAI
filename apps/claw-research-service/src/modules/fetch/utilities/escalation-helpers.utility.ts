import type { FetchStrategyConfig } from '../../../generated/prisma';
import type { ThinCandidate } from '../types/fetch-strategy.types';
import type { FetchResult } from '../types/fetch.types';

/** Keeps whichever thin live result carries more text. */
export function longerThin(current: ThinCandidate | null, next: ThinCandidate): ThinCandidate {
  return current === null || next.result.content.length > current.result.content.length
    ? next
    : current;
}

/** A config row's `publicConfig` JSON as a plain record (anything else → `{}`). */
export function publicConfigOf(config: FetchStrategyConfig): Record<string, unknown> {
  const value: unknown = config.publicConfig;
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}

/** Placeholder result for an attempt that threw — never returned to a caller. */
export function emptyFetchResult(url: string): FetchResult {
  return {
    url,
    finalUrl: url,
    httpStatus: 0,
    mimeType: null,
    title: null,
    content: '',
    links: [],
    byteSize: 0,
    cacheHit: false,
    latencyMs: 0,
  };
}

/** Lower-cased hostname, or a fixed marker for an unparseable URL. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return 'invalid-url';
  }
}

/** Origin + path, never the query string or fragment — they can carry tokens. */
export function loggablePath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return 'invalid-url';
  }
}
