/**
 * A revoked session is written here by auth-service and read by every
 * service's AuthGuard (TD-033).
 *
 * A signed access token stays valid for its whole lifetime, so after a logout
 * — or after a stolen token's family was revoked — it kept working for up to
 * `JWT_ACCESS_EXPIRY`. The key's TTL is that same lifetime: once the token
 * cannot be accepted any more, the entry has nothing left to say.
 */
export const REVOKED_SESSION_KEY_PREFIX = 'auth:revoked-session:';

export function revokedSessionKey(sessionId: string): string {
  return `${REVOKED_SESSION_KEY_PREFIX}${sessionId}`;
}
