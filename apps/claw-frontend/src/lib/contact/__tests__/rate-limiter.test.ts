import { beforeEach, describe, expect, it } from 'vitest';

import { checkRateLimit, resetRateLimiter } from '@/lib/contact/rate-limiter';

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('allows up to max requests in a window', () => {
    const opts = { max: 3, windowMs: 60_000, now: 1000 };
    expect(checkRateLimit('ip', opts).allowed).toBe(true);
    expect(checkRateLimit('ip', opts).allowed).toBe(true);
    expect(checkRateLimit('ip', opts).allowed).toBe(true);
  });

  it('blocks the request over the limit and reports retryAfter', () => {
    const opts = { max: 2, windowMs: 60_000, now: 1000 };
    checkRateLimit('ip', opts);
    checkRateLimit('ip', opts);
    const blocked = checkRateLimit('ip', opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('lets requests through again once the window slides past', () => {
    expect(checkRateLimit('ip', { max: 1, windowMs: 1000, now: 0 }).allowed).toBe(true);
    expect(checkRateLimit('ip', { max: 1, windowMs: 1000, now: 500 }).allowed).toBe(false);
    expect(checkRateLimit('ip', { max: 1, windowMs: 1000, now: 2000 }).allowed).toBe(true);
  });

  it('tracks distinct clients independently', () => {
    const opts = { max: 1, windowMs: 60_000, now: 1000 };
    expect(checkRateLimit('a', opts).allowed).toBe(true);
    expect(checkRateLimit('b', opts).allowed).toBe(true);
    expect(checkRateLimit('a', opts).allowed).toBe(false);
  });
});
