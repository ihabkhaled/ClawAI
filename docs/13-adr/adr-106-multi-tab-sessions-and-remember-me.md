# ADR-106: Sessions survive many tabs and windows, and "Remember me" sets the session's lifetime

**Status**: Accepted
**Date**: 2026-09-19

## Context

Users were signed out at random, most often with two tabs open, and the VS Code
extension signed itself out too. All of the following was reproduced live on
2026-09-19 before any fix.

- **The server revoked the whole session on any second use of a refresh
  token.** Rotation burns the token on first use. A second use counts as theft,
  and the server revokes the token family. A family is every token issued from
  one login.
  - Two tabs, or two VS Code windows, share one token and refresh together at
    access-token expiry, so one of them always loses.
  - A client whose refresh response was lost (sleep, a dropped connection)
    retries the old token.
  - Losing the race in `rotateSession` revoked the family as well.
  - Measured: two concurrent refreshes returned 200 and 401, and the winner's
    new token then also returned 401. A retry after a lost response did the
    same.
- **A tab wrote its old tokens back over the other tab's new ones.** Zustand
  `persist` saves the whole in-memory state on any `set()`. `useCurrentUser`
  refetches `/auth/me` on focus and calls `setUser`, so a tab that had been in
  the background wrote its old tokens over a newer refresh or login from
  another tab. Measured: a refresh returned 200, and storage afterwards held
  the _old_, already-used refresh token. The next reload spent it (401), the
  family was revoked, and the tab landed on `/login`.
- **A refresh failure of any kind signed the user out.** The interceptor
  cleared storage whether the refresh was refused (401) or never reached the
  server (offline right after waking).
- **"Remember me" only remembered the email.** It had no effect on the session.

## Decision

1. **Reuse grace, server side.** A refresh token used within
   `REFRESH_REUSE_GRACE_MS` (30 s) may be presented again, and it gets a
   sibling token in the same family instead of a revoked family. A lost
   `rotateSession` race re-reads the session: if another rotation used it
   within the window, the loser gets a sibling; if it was revoked (logout),
   the family is revoked as before.
   - Reuse after the window still revokes the family.
   - A revoked or expired token, or a suspended account, never gets grace.
   - Siblings log `rotate: refresh token reused within 30000ms; issued a
sibling in family …` (no token in the line).
2. **One refresh across tabs, client side** (`lib/session-refresh.ts`):
   - one refresh per tab: callers join the one in flight;
   - one tab at a time, through the Web Locks API (`claw-auth-refresh`);
   - under the lock, if storage already holds a different access token than
     the failed request carried, that token is used and no refresh is made.
3. **Storage is the truth; a tab's store is a cache.**
   - `setUser` takes the session fields from storage, never from its own copy.
   - A `storage` event rehydrates the store, and a removed key signs the tab
     out.
   - `authService.refreshToken()` was deleted: it refreshed from the tab's own
     copy, outside the lock.
4. **Only a refusal ends a session.** The client signs out only when the
   refresh answers 400, 401 or 403 (`SESSION_ENDING_REFRESH_STATUSES`).
   Offline, 5xx and 429 fail the request and keep the session. If storage
   gained a different refresh token while this one was being refused (a login
   in another tab), that session is used.
5. **"Remember me" sets the session's lifetime.** `POST /auth/login` takes
   `rememberMe`, and the session row stores it as `persistent` (migration
   `20260919160000_add_session_persistent`). Rotation keeps it.

   | Remember me                                  | Refresh lifetime (sliding)                | Browser restart                                 |
   | -------------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
   | on                                           | `JWT_REFRESH_EXPIRY` (7 d)                | stays signed in                                 |
   | off                                          | `SESSION_ONLY_REFRESH_TTL_SECONDS` (12 h) | signed out: the no-expiry marker cookie is gone |
   | not sent (VS Code, device flow, old clients) | long, as before                           | unchanged                                       |

   Sessions stored before this change have no `persistent` field and are read
   as remembered, so nobody is signed out by the deploy.

## Alternatives rejected

- **Only the client lock.** It does not cover VS Code windows, which are
  separate processes with no shared lock, or a response lost in transit.
- **Only the server grace.** Tabs would still write old tokens over new ones,
  and would still sign out when offline.
- **Drop reuse detection.** A stolen refresh token would then work forever.
  The grace window gives a thief at most 30 s of overlap with a token the real
  client had just used. The thief could have used it earlier anyway.
- **httpOnly cookies now.** This is the real fix for XSS token theft (TD-008),
  but it changes every client and every service. It is a program of its own,
  not part of this bug.

## Consequences

- A grace sibling is an extra session row in the family. If a response was
  lost, the first replacement goes unused until it expires, and until then it
  appears as an extra session in the device list.
- An access token stays valid until it expires (at most 15 min) after its
  session is revoked. Guards verify JWTs without asking auth-service.
  [TD-033](../14-risk-debt/technical-debt.md).
- An installed PWA service worker can keep serving the previous bundle after a
  deploy. The local run of this change hit exactly that: the login form sent
  no `rememberMe` until the worker was unregistered.
  [TD-034](../14-risk-debt/technical-debt.md).

## Verified live (2026-09-19)

| Check                                                                                    | Before              | After                          |
| ---------------------------------------------------------------------------------------- | ------------------- | ------------------------------ |
| API: two concurrent refreshes, then the winner's token                                   | 200 + 401, then 401 | 200 + 200, then 200            |
| API: retry of a just-used token (lost response)                                          | 401, family dead    | 200                            |
| API: replay after 32 s                                                                   | 401                 | 401, family revoked (theft)    |
| VS Code kind: 2 windows × 5 rounds, plus a lost-response retry                           | —                   | all 200                        |
| Browser: 2 tabs wake together with an expired token, 5 rounds                            | both to `/login`    | both stay; 1 refresh per round |
| Browser: A signs out → B follows; A signs in → B continues                               | B signed A out      | pass                           |
| Browser: refresh offline, then back online                                               | signed out          | kept, then refreshed           |
| Browser: remember me off → reload, 2nd tab, restart                                      | —                   | in, in, signed out             |
| Browser: remember me on → restart                                                        | —                   | stays signed in                |
| Pentest: lifetimes, strict DTO, forged/injected/oversized tokens, no echo, logout, theft | —                   | 19/19                          |
