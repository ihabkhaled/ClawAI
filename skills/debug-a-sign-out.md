# Debug a random sign-out

Use when users say they are "suddenly logged out": with two tabs open, after
the laptop sleeps, when they come back to another tab, or in the VS Code
extension. Background:
[ADR-106](../docs/13-adr/adr-106-multi-tab-sessions-and-remember-me.md). Rule:
[rules/16 §8–9](../rules/16-authentication-and-authorization.md).

## 1. Reproduce before touching code

**The API, the way racing clients hit it:**

```bash
export QA_LAB_BASE=https://claw.local/api/v1 NODE_EXTRA_CA_CERTS=./certs/rootCA.pem
export QA_LAB_EMAIL=… QA_LAB_PASSWORD=…
node scripts/qa-lab/session-refresh-experiment.mjs   # ~35 s, exits 1 on any failure
```

It covers concurrent refreshes (web and VS Code), a lost-response retry,
"Remember me" lifetimes, refusals, logout, and theft after the grace window.

**The browser: two tabs in one Playwright context**, sharing storage:

1. Sign in on tab A, open the app on tab B.
2. Make the access token expire for both by editing `claw-auth-storage` in
   localStorage.
3. Reload both at once.
4. Count `/auth/refresh` calls: there must be **one** per wake-up, and both
   tabs must stay in the app.
5. For "offline right after sleep", `page.route('**/auth/refresh', r =>
r.abort())`, then reload. The tab must stay signed in, with the same
   refresh token.

**First, unregister the PWA service worker** and clear `caches`. Otherwise the
browser runs the previous bundle and you measure old code. That happened while
building ADR-106: the login sent no `rememberMe`.

## 2. Read what happened

- The auth-service log shows `rotate: refresh token reused within 30000ms;
issued a sibling in family …`. That was a race the grace absorbed.
- A 401 from `/auth/refresh` after a success means the family was revoked.
  Find the second use of the old token:
  - a tab outside the lock;
  - a store writing old tokens back;
  - a client retrying after more than 30 s.
- `claw-auth-storage` holding a refresh token older than one that was already
  answered means something persisted a stale copy. Look for any `set()` that
  writes session fields it did not change.

## 3. Where each defence lives

| Failure                                     | Defence                                                                     | File                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- |
| two tabs or windows refresh together        | 30 s reuse grace issues a sibling                                           | `token-session.manager.ts`, `REFRESH_REUSE_GRACE_MS` |
| two tabs in one browser                     | Web Locks `claw-auth-refresh`; adopt a token another tab got                | `apps/claw-frontend/src/lib/session-refresh.ts`      |
| background tab writes old tokens            | `setUser` reads the session fields from storage; `storage` events rehydrate | `stores/auth.store.ts`                               |
| offline or 5xx during refresh               | only 400/401/403 end a session                                              | `SESSION_ENDING_REFRESH_STATUSES`                    |
| a login in another tab while this one fails | adopt the newer refresh token instead of signing out                        | `session-refresh.ts`                                 |
| "Remember me" off after browser restart     | a marker cookie with no expiry                                              | `onRehydrateStorage` in `auth.store.ts`              |

## 4. Do not

- Add a second refresh path, or refresh from a tab's own in-memory copy.
- Widen the grace window, or drop reuse detection, to make a symptom go away.
- Sign out because `/auth/refresh` could not be reached.
