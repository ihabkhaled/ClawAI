import type { RateLimitDecision } from '@/types/contact.types';

// In-memory sliding-window rate limiter, keyed by client identifier (IP).
// Deliberately process-local: the contact route is low-volume and this needs
// zero infra. Behind multiple replicas each instance limits independently,
// which is an acceptable belt-and-suspenders alongside the honeypot + timing
// guard. Entries are pruned lazily on each check so the map cannot grow
// unbounded from one-off visitors.

type WindowState = {
  timestamps: number[];
};

const buckets = new Map<string, WindowState>();

function prune(state: WindowState, windowStart: number): void {
  state.timestamps = state.timestamps.filter((ts) => ts > windowStart);
}

export function checkRateLimit(
  key: string,
  options: { max: number; windowMs: number; now?: number },
): RateLimitDecision {
  const now = options.now ?? Date.now();
  const windowStart = now - options.windowMs;

  const state = buckets.get(key) ?? { timestamps: [] };
  prune(state, windowStart);

  if (state.timestamps.length >= options.max) {
    const oldest = state.timestamps[0] ?? now;
    const retryAfterMs = oldest + options.windowMs - now;
    buckets.set(key, state);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  state.timestamps.push(now);
  buckets.set(key, state);
  return { allowed: true, retryAfterSeconds: 0 };
}

// Test-only: reset all buckets between cases.
export function resetRateLimiter(): void {
  buckets.clear();
}
