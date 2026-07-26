import { type UsageWindowView } from '../types/usage-view.types';

/**
 * Turns a raw Redis counter into a usage window.
 *
 * A missing key means zero, not an error: a user who has not spent anything
 * this period simply has no counter yet, and that is the most common case on a
 * freshly rolled-over day.
 *
 * `limit: null` (unlimited) yields `remaining: null` rather than a number —
 * inventing a remaining figure for an unlimited window would make the UI draw
 * a bar that can only ever be wrong.
 */
export function readWindowCounter(
  raw: string | null,
  limit: number | null,
  periodKey: string,
): UsageWindowView {
  const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  // A corrupt counter reads as zero rather than NaN. NaN would propagate
  // through every arithmetic below and render as "NaN of 1,000".
  const used = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

  return {
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    periodKey,
  };
}
