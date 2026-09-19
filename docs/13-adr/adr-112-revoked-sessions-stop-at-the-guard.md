# ADR-112: A revoked session stops at the guard, not at the token's expiry

**Status**: Accepted
**Date**: 2026-09-20

## Context

An access token is a signature. Every service verified it locally and asked
nothing else, so a session that had been revoked in the database — a logout, a
family revoked for refresh-token theft (ADR-106), an account an admin
disabled — kept working for up to `JWT_ACCESS_EXPIRY`, 15 minutes.

Measured while building ADR-106: `/auth/me` answered 200 with an access token
whose family had already been revoked. Recorded as TD-033.

The refresh path was never the hole. Rotation reads the session row, so a
revoked session could not mint anything new. The hole was the window on the
token already in the browser.

## Decision

1. **auth-service publishes what it revokes.** `SessionRevocationCacheService`
   writes `auth:revoked-session:<id>` to Redis for every session it revokes,
   with a TTL equal to `JWT_ACCESS_EXPIRY`. The entry expires exactly when the
   token it describes would have expired anyway.
   - `revokeSessionFamily` now returns the ids it revoked rather than a count,
     because the ids are what has to be published.
   - The write is best-effort: the database is the truth, and a failed cache
     write must not turn a logout into an error.
2. **A second global guard asks.** `SessionRevocationGuard`
   (`@claw/shared-auth`) is registered as an `APP_GUARD` after each service's
   own `AuthGuard`, in all 17 services that authenticate requests.
   - Thirteen services carry their own copy of `AuthGuard` and none of them
     reads `sessionId`. Editing thirteen guards, their payload types and their
     tests would have been the same fix thirteen times; one guard registered
     once per service is a line each.
   - It only refuses. A public route, a missing header, a token of another
     shape (an ops token), a service without `JWT_SECRET` — all pass through,
     because the service's own guard has already decided those.
3. **It fails open.** If Redis is unreachable, the check answers "not
   revoked". Signing every user out of every service because a cache is down
   would be a worse failure than the 15-minute window this replaces — which is
   exactly the behaviour that existed before. The check is bounded at 150 ms so
   a slow Redis cannot hold a request.

## Consequences

- One `EXISTS` per authenticated request per service. It is a single key
  lookup on the Redis the platform already runs, and it is skipped entirely
  for public routes.
- **Deploy auth-service and the services together.** A service running the new
  guard against an auth-service that does not yet publish revocations simply
  finds no keys, which is today's behaviour. The reverse is equally harmless.
  Neither order breaks anything.
- `REDIS_URL` must be set wherever the guard runs. All 17 already have it.
- A service that adds a global `AuthGuard` later must register this guard too;
  `tools/__tests__/session-revocation-guard-registered.test.mjs` fails if it
  does not.
- Not closed by this: an access token stays valid while a session is merely
  _expiring_, and a user whose role changes keeps the old role until the token
  refreshes. Both are about staleness, not revocation.

## Verified live (2026-09-20)

- Signed in: `/auth/me` 200, `/chat-threads` 200.
- After `POST /auth/logout` with the same access token: **401 and 401**. Before
  this change both stayed 200 for the rest of the token's lifetime.
- The Redis key was written with the session id, and disappears on its own.
- Tests: the guard (7 cases), the revocation client including fail-open
  (5 cases), the cache service and TTL parsing (17 cases), and the
  registration test across all 17 services.
