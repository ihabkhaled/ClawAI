import { type FetchStrategyConfig, FetchStrategyKind } from '../../../generated/prisma';
import { FETCH_RENDER_HINT_PREFERRED_KINDS } from '../constants/fetch-strategy.constants';
import type { FetchRenderHint } from '../enums/fetch-render-hint.enum';
import type { FetchStrategyAttempt, ThinCandidate } from '../types/fetch-strategy.types';
import type { FetchAttemptSummary, FetchResult } from '../types/fetch.types';

/**
 * Reorders an already enabled chain for a render hint: the hint's preferred
 * tiers move to the front (in the hint's order, after OFFICIAL_API), everything
 * else keeps its relative order. A pure reorder: it never adds or removes a
 * tier, so eligibility, robots and the stop rules are decided exactly as before.
 */
export function orderChainForHint(
  chain: readonly FetchStrategyConfig[],
  hint: FetchRenderHint | undefined,
): FetchStrategyConfig[] {
  if (hint === undefined) {
    return [...chain];
  }
  const preferredKinds = FETCH_RENDER_HINT_PREFERRED_KINDS[hint];
  const official = chain.filter((config) => config.kind === FetchStrategyKind.OFFICIAL_API);
  const preferred = preferredKinds.flatMap((kind) =>
    chain.filter((config) => config.kind === kind),
  );
  const rest = chain.filter((config) => !official.includes(config) && !preferred.includes(config));
  return [...official, ...preferred, ...rest];
}

/** The attempt trail reduced to kind + outcome: nothing a URL, body, status or error text could leak through. */
export function summariseAttempts(
  attempts: readonly FetchStrategyAttempt[],
): readonly FetchAttemptSummary[] {
  return attempts.map((attempt) => ({ kind: attempt.kind, outcome: attempt.outcome }));
}

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
