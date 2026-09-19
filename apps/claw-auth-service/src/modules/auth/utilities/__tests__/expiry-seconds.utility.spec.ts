import { expirySeconds } from '../expiry-seconds.utility';

describe('expirySeconds', () => {
  it.each([
    ['45s', 45],
    ['15m', 900],
    ['2h', 7_200],
    ['7d', 604_800],
  ])('reads %s as %i seconds', (expiry, seconds) => {
    expect(expirySeconds(expiry, 60)).toBe(seconds);
  });

  // The fallback matters: it is both a token lifetime and, since TD-033, how
  // long a revoked session is remembered.
  it.each([['15'], [''], ['15 minutes'], ['m15'], ['-5m']])('falls back for %j', (expiry) => {
    expect(expirySeconds(expiry, 60)).toBe(60);
  });
});
