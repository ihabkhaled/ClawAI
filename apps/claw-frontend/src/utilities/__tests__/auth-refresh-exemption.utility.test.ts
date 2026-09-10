import { describe, expect, it } from 'vitest';

import { isAuthRefreshExemptPath } from '@/utilities/auth-refresh-exemption.utility';

/**
 * Which requests may sign the user out.
 *
 * The 401 interceptor ends, on failure, in `clearAuthStorage()` and a hard
 * redirect to `/login`. Telemetry used to share that path: a log write is
 * best-effort background traffic the user never asked for, and giving the least
 * important request in the app the power to end the session is backwards.
 */
describe('isAuthRefreshExemptPath', () => {
  it('exempts the telemetry ingest route the browser writes to', () => {
    expect(isAuthRefreshExemptPath('/client-logs/batch')).toBe(true);
  });

  it('exempts the auth endpoints, which would otherwise loop', () => {
    expect(isAuthRefreshExemptPath('/auth/login')).toBe(true);
    expect(isAuthRefreshExemptPath('/auth/refresh')).toBe(true);
  });

  it('does NOT exempt the admin log-reading routes', () => {
    // These share the telemetry prefix and go through the same client, but
    // they are authenticated admin actions. Exempting them would strand an
    // admin on the log page behind a 401 that is never retried — which a bare
    // '/client-logs' entry in the list would do, since matching is by
    // substring.
    expect(isAuthRefreshExemptPath('/client-logs')).toBe(false);
    expect(isAuthRefreshExemptPath('/client-logs/stats')).toBe(false);
    expect(isAuthRefreshExemptPath('/client-logs/distinct')).toBe(false);
  });

  it('does not exempt ordinary application requests', () => {
    expect(isAuthRefreshExemptPath('/chat-messages/thread/abc')).toBe(false);
    expect(isAuthRefreshExemptPath('/auth/me')).toBe(false);
    expect(isAuthRefreshExemptPath('/files')).toBe(false);
  });
});
