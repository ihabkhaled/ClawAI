# ADR-230: Security rate limiters fail closed

Status: Accepted (owner decision, 2026-11-28). Supersedes item 7 of
[rules/58](../../rules/58-auth-route-rate-limits.md) as written in
[ADR-147](adr-147-auth-route-rate-limits.md) ("fail open, with a warning").

Threat model: [agent-incident-threat-model.md](../03-architecture/agent-incident-threat-model.md).
Sibling decision: [ADR-229](adr-229-wolverine-planes-and-incident-intake.md).

## Context

- 2026-11-27: a sign-up bot farm registered over a hundred accounts from rotating addresses (ADR-222). The
  per-route limiters in auth-service and agent-service counted in Redis, but a Redis error, a 250 ms silence or a
  malformed reply let the request through with a warning. Anyone who can slow or break Redis (it was open and abused
  the same day) also switches the brakes off for password guessing, token guessing and sign-up spam.
- 2026-11-28: the Wolverine threat review (see the threat model above) found that every limiter near the
  coding-agent surface fails open, each with a comment that gives a reason that does not apply to a security control,
  and that `location /api/v1/agent` had no nginx `limit_req` at all.

## Decision

1. The per-route limiters for sign-in, sign-up, refresh, password reset, email verification and change confirm, VS Code
   authorize, agent pairing, device code, agent refresh and the SSO callback (every route in rules/58 item 2) **fail
   closed**. Same detection as before (Redis error, no answer within 250 ms) plus a malformed reply. The request is
   refused with HTTP 503, `code: AUTH_RATE_LIMITER_UNAVAILABLE`, `Retry-After: 30`, and an error-level log with the
   policy only.
2. A malformed reply is detected by a strict Redis method (`incrementWindowStrict` in auth-service, `incrWithTtlStrict`
   in agent-service). The lenient methods are unchanged for their other callers (quota, sessions, anti-abuse counters).
3. The atomic Lua window (rules/58 item 8) is unchanged. The success-side `reset` and `refund` stay lenient.
4. nginx gets a per-address zone `agent_api` (300 requests/min, burst 100, status 429) on `location /api/v1/agent`,
   defined in `nginx.conf` and `nginx.distributed.conf.template`. `/api/v1/agent/auth/` keeps `auth_routes`.
5. Production deploy happens only after the owner's go.

## Alternatives

- **Fail open (the old behaviour).** Rejected: the limiter is the control, and an attacker who can degrade Redis
  removes it. nginx alone is per-address and does not stop a farm on rotating addresses.
- **Fail closed everywhere.** Rejected: audit-service's anonymous feedback limiter and the anti-abuse counters guard
  low-value or already layered paths; a Redis blip must not block feedback. They stay lenient.
- **Fail closed with a local in-memory fallback budget.** Not done: it is per replica (chat/auth run several), so
  the budget would multiply and need its own tuning. Possible later.

## Consequences

- **Redis health is now on the sign-in path.** A Redis outage blocks sign-in, sign-up, refresh and device pairing
  (503), by design. Existing access tokens keep working until they expire; refresh needs Redis.
- **How operators see it:** error logs `auth rate limiter unavailable, refusing policy=<policy>` (auth-service) and
  `agent auth rate limiter unavailable, refusing policy=<policy>` (agent-service), preceded by the repository's reason
  (`timed out` or the Redis error message); a burst of 503 with `AUTH_RATE_LIMITER_UNAVAILABLE` at nginx. See the
  runbook section "Redis down".
- The frontend has no dedicated copy for the 503 yet; forms show their generic "try again" message. A translated
  message in 13 locales is an open follow-up.
- `agent_api` throttles one address at 300/min: a large office behind one NAT with many signed-in extensions polling
  could hit it. Watch `limiting requests` in the nginx log after the deploy and raise the rate if needed.
