# ADR-147 — Per-route rate limits on sign-in and sign-up

**Status:** Accepted, 2026-10-02.
**Owner decision:** 2026-10-02 (route group, budgets, Redis-down behaviour).

## Context

The only limit in front of `/auth/login` and `/auth/register` was the global
`@nestjs/throttler` brake (2,500 requests per minute per user or IP). That does
not stop password guessing on one account, sign-up spam on the one route that
reveals a taken address (ADR-096), or token guessing on the confirm links. Every
login also pays an argon2 verification, including for unknown addresses, so a
login flood is CPU cost as well as a security risk. agent-service had
`PAIR_INIT_RATE_LIMIT_PER_MINUTE` and `PAIR_POLL_MIN_INTERVAL_MS` defined and
never applied, and `RedisService.incrWithTtl` with no callers.

## Decision

1. **One Redis fixed-window limiter per service**, applied by a decorator plus
   guard (`@AuthRateLimit` in auth-service, `@AgentAuthRateLimit` in
   agent-service). Not a shared package: the logic is ~100 lines, each service
   owns its Redis, and a new `@claw/shared-*` export crashes every dev container
   until it is rebuilt. The client address DOES come from `@claw/shared-auth`
   (`resolveClientAddress`), so the limiter and the global throttler read the
   same address the same way: X-Real-IP only when the socket peer IS nginx
   (loopback, the docker name `nginx`, or `TRUSTED_PROXY_ADDRESSES`), never
   merely because the peer is private (rules/58 item 3).
2. **Budgets per route**, in one constants file per service; the table is in
   [rules/58](../../rules/58-auth-route-rate-limits.md). Login is keyed per IP +
   address (10 / 15 min) and per IP (30 / 15 min); register per IP (5 / h) and
   per address (3 / h).
3. **Counted before validation and before any lookup**, so every address gets
   the same answer (rules/43 §1). 429 + `Retry-After` + `RATE_LIMITED`.
4. **Keys are hashed** (SHA-256, 32 hex chars); addresses are trimmed and
   lowercased only.
5. **Fail open** on a Redis error or a 250 ms timeout, with a warning. A Redis
   outage must never lock every user out of sign-in.
6. **nginx backstop**: a `limit_req` zone `auth_routes` (60 POST/min per IP,
   burst 30) on `/api/v1/auth` and `/api/v1/agent/auth/`. GET is not counted so
   `/auth/me` on page load never spends it.
7. **pair/poll** answers 429 + `Retry-After: 1` when one pairing code is polled
   twice within a second. The extension polls every 2 s, so it never trips it.
   device-code/token keeps its RFC 8628 `slow_down`.
8. **Only failed logins spend the login budget.** Attempts are still counted
   before any lookup (item 3); a successful login then resets its IP + address
   window and refunds its per-IP hit (`AuthRateLimitSuccessInterceptor`). The
   SDK and headless runner sign in on every run, and an office shares one IP;
   neither may be refused for signing in correctly.

## Alternatives rejected

- **Account lockout.** Lets anyone lock anyone out by typing their address.
- **Fail closed when Redis is down.** Turns a Redis blip into "nobody can sign in".
- **Refresh keyed per token family.** Needs a database read before the limit;
  per-IP 60 / min is enough for now.
- **Keying on X-Forwarded-For.** Its left-most entry is client-controlled.

## Consequences

- A shared office IP gets 30 FAILED logins per 15 minutes; successful ones are
  refunded. Raise the per-IP number in the constants file if that bites
  (runbook).
- A distributed nginx (services on other hosts) must set
  `TRUSTED_PROXY_ADDRESSES` on every service, or all visitors share one bucket.
- During a Redis outage only nginx's coarse zone limits these routes.
- ADR-096's note that login rate limiting "is doing real work" now has a real
  limiter behind it.
