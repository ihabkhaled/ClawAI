import { revokedSessionKey } from '@claw/shared-constants';
import Redis from 'ioredis';

import {
  REVOCATION_CHECK_TIMEOUT_MS,
  REVOCATION_CONNECT_TIMEOUT_MS,
  REVOCATION_RETRY_BASE_MS,
  REVOCATION_RETRY_MAX_MS,
} from './session-revocation.constants';

/**
 * Whether a session was revoked while its access token is still signed and
 * unexpired (TD-033).
 *
 * auth-service writes a key for every session it revokes — a logout, a family
 * revoked for token theft, an admin action — with the access token's lifetime
 * as its TTL. Every service's AuthGuard asks here.
 *
 * **It fails open.** Redis being unreachable must not sign every user out of
 * every service; the cost of that choice is the pre-existing window of at most
 * `JWT_ACCESS_EXPIRY` during an outage, which is exactly the behaviour this
 * check replaces. The refresh path stays authoritative either way: a revoked
 * session cannot mint a new access token, because that is a database read.
 */
let client: Redis | null = null;
let warned = false;

function connection(): Redis | null {
  if (client) {
    return client;
  }
  const url = process.env['REDIS_URL'];
  if (!url) {
    return null;
  }
  client = new Redis(url, {
    lazyConnect: false,
    connectTimeout: REVOCATION_CONNECT_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * REVOCATION_RETRY_BASE_MS, REVOCATION_RETRY_MAX_MS),
  });
  // An unhandled 'error' event would take the process down; the guard already
  // treats an unreachable Redis as "not revoked".
  client.on('error', () => {
    if (!warned) {
      warned = true;
      console.warn('[auth] session revocation cache unavailable; tokens accepted until expiry');
    }
  });
  return client;
}

export async function isSessionRevoked(sessionId: string): Promise<boolean> {
  const redis = connection();
  if (!redis) {
    return false;
  }
  try {
    const answer = await Promise.race([
      redis.exists(revokedSessionKey(sessionId)),
      new Promise<number>((resolve) => {
        setTimeout(() => resolve(0), REVOCATION_CHECK_TIMEOUT_MS);
      }),
    ]);
    return answer === 1;
  } catch {
    return false;
  }
}

/** Test seam: drops the cached connection so a new URL is picked up. */
export function resetSessionRevocationClient(): void {
  void client?.quit().catch(() => {});
  client = null;
  warned = false;
}
