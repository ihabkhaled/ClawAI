# Runbook — sign-in and sign-up rate limits (429)

Rule: [rules/58](../../rules/58-auth-route-rate-limits.md) ·
Decision: [ADR-147](../13-adr/adr-147-auth-route-rate-limits.md)

## Symptom: users report "Too many attempts. Try again in N minutes."

1. Find the policy. Each refusal logs one warning, policy only:
   ```bash
   docker logs --since 30m claw-auth-service 2>&1 | grep "auth rate limit reached"
   docker logs --since 30m claw-agent-service 2>&1 | grep "agent auth rate limit reached"
   ```
2. A burst of `policy=login` from one place is usually password guessing; a
   shared office or CGNAT IP is the other cause. The per-IP login budget is
   30 FAILED logins / 15 min (a successful login is refunded).
   If EVERY user is refused at once, check that services see real client
   addresses: with nginx on another host (distributed template),
   `TRUSTED_PROXY_ADDRESSES` must list nginx's egress IPs, or all visitors share
   one bucket (rules/58 item 3).
3. A 429 with **no** `code` in the body and no service log line came from nginx
   (`auth_routes` zone, 60 POST/min per IP). `docker logs claw-nginx | grep "limiting requests"`.

## Raise a limit

Budgets are code, not env: edit `AUTH_RATE_LIMIT_POLICIES` in
`apps/claw-auth-service/src/modules/auth/constants/auth-rate-limit.constants.ts`
(or `AGENT_AUTH_RATE_LIMIT_POLICIES` in agent-service), update the table in
rules/58, ship it. Live windows keep counting; only the threshold changes.

## Clear a key (unblock someone now)

Keys are hashed, so you cannot search by address. Recompute the hash:

```bash
# per-IP login window for 203.0.113.7
H=$(printf '%s' '203.0.113.7' | sha256sum | cut -c1-32)
MSYS_NO_PATHCONV=1 docker exec claw-redis redis-cli del "auth:rl:login:ip:$H"
# IP + address window: hash "<ip>|<lowercased trimmed address>"
H=$(printf '%s' '203.0.113.7|ada@example.com' | sha256sum | cut -c1-32)
MSYS_NO_PATHCONV=1 docker exec claw-redis redis-cli del "auth:rl:login:ip-email:$H"
```

Prefixes: `auth:rl:<policy>:<ip|email|ip-email>:<hash>` and
`agent:auth:rl:<policy>:<ip|pairing-code>:<hash>`. Never `FLUSHALL`: the same
Redis holds sessions, quotas and credit holds.

## Redis down

The limiter fails OPEN: requests pass and each logs
`auth rate limiter unavailable` or `timed out`. Only nginx's zone limits these
routes until Redis is back. Fix Redis; nothing to reset afterwards.
