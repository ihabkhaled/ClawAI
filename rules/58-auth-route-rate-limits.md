# 58 — Sign-in and sign-up routes carry per-route rate limits

**Status:** active · **Owner:** auth-service + agent-service · **Added:** 2026-10-02

**Applies to**: the public sign-in / sign-up routes of `apps/claw-auth-service`
(`modules/auth`) and `apps/claw-agent-service` (`modules/auth-rate-limit`), the
`auth_routes` zone in `infra/nginx`, and the 429 copy in `apps/claw-frontend`.

**Related**: [ADR-147](../docs/13-adr/adr-147-auth-route-rate-limits.md) ·
[rules/43](43-account-state-disclosure-and-transactional-email.md) (no account
enumeration) · [ADR-096](../docs/13-adr/adr-096-login-failure-taxonomy-without-account-enumeration.md) ·
[rules/08](08-security-rules.md) (global throttler) ·
[runbook](../docs/11-runbooks/runbook-auth-rate-limits.md).

## Purpose

The global throttler is a coarse per-user/per-IP brake (2,500 req/min). It does
not stop password guessing on one account, sign-up spam, or token guessing on the
confirm links. Each public sign-in and sign-up route now has its own budget,
counted in Redis before validation and before any account lookup.

## The rule

1. **Every public sign-in / sign-up route is decorated.** auth-service:
   `@AuthRateLimit(AuthRateLimitPolicy.X)`; agent-service:
   `@AgentAuthRateLimit(AgentAuthRateLimitPolicy.X)`. A new public auth route
   gets a policy in the same commit. The budgets live in ONE constants file per
   service (`auth-rate-limit.constants.ts`, `agent-auth-rate-limit.constants.ts`),
   never inline and never in env.
2. **The approved budgets** (owner decision 2026-10-02):

   | Route                                                                 | Budget                                                   |
   | --------------------------------------------------------------------- | -------------------------------------------------------- |
   | `POST /auth/login`                                                    | 10 / 15 min per IP + address, 30 / 15 min per IP         |
   | `POST /auth/register`                                                 | 5 / hour per IP, 3 / hour per address                    |
   | `POST /auth/refresh`                                                  | 60 / min per IP                                          |
   | `POST /auth/password-reset/request`                                   | existing per-address cooldown + 5 / hour per IP          |
   | `POST /auth/email-verification/resend`                                | existing per-address cooldown + 5 / hour per IP          |
   | `POST /auth/{password-reset,email-verification,email-change}/confirm` | 10 / 15 min per IP each (token guessing)                 |
   | `POST /auth/vscode/authorize/init` · `/exchange`                      | 10 / min · 20 / min per IP                               |
   | `POST /agent/auth/pair/init`                                          | `PAIR_INIT_RATE_LIMIT_PER_MINUTE` (10) / min per IP      |
   | `POST /agent/auth/pair/poll`                                          | 1 per `PAIR_POLL_MIN_INTERVAL_MS` (1 s) per pairing code |
   | `POST /agent/auth/device-code/create`                                 | 10 / min per IP                                          |
   | `POST /agent/auth/device-code/token`                                  | unchanged: RFC 8628 `slow_down` in `DeviceCodeService`   |
   | `POST /agent/auth/refresh`                                            | 60 / min per IP                                          |
   | `POST /agent/organizations/:slug/sso/callback`                        | 30 / min per IP                                          |

3. **The client address is X-Real-IP, trusted only from nginx itself.**
   nginx overwrites it on every request. A service believes it only when the
   socket peer is loopback, the current docker address of `nginx` (resolved by
   name, cached 60 s, re-resolved at most every 5 s for an unknown peer), or an
   address/CIDR in `TRUSTED_PROXY_ADDRESSES`. "The peer is private" is NOT
   enough: a LAN client on a published service port (192.168.x / 10.x) or
   another container on claw-network is private too, and could mint a fresh
   bucket per request by rotating the header. Every other peer is counted by
   its own address; an unknown peer never trusts the header. X-Forwarded-For
   is never a key. ONE implementation for every limiter:
   `resolveClientAddress` in `@claw/shared-auth` (the global throttler, and
   `resolveClientIp` in both services, delegate to it). **Distributed nginx**
   (`infra/nginx/nginx.distributed.conf.template`): the peer is nginx's public
   egress IP, which the docker name cannot find, so set
   `TRUSTED_PROXY_ADDRESSES` to it. Left blank there, every visitor falls into
   one `peer:<nginx-ip>` bucket and a few failed logins lock out the site.
4. **Addresses are normalized, then hashed.** Trim and lowercase only; `+tags`
   and dots are kept because they can be different accounts here. Every key part
   (address, IP, pairing code) is SHA-256 hashed. A key, an address or an IP is
   never logged; the warning names the policy only.
5. **Identical for every address.** The window is counted before any lookup, so
   a 429 says nothing about whether an account exists (rules/43 §1). The reply is
   always `429`, `Retry-After: <seconds>`, `code: RATE_LIMITED`.
6. **No lockout.** A refused caller waits for the fixed window to reset. Nothing
   on the account changes, and the account owner can still sign in from another
   address. The per-IP login budget (30) is deliberately well above the
   per-address one (10) so one locked throwaway does not lock the real account
   on the same IP.
7. **Fail open, with a warning.** A Redis error, or no answer within 250 ms, lets
   the request through and logs `auth rate limiter unavailable`. The Redis client
   uses `maxRetriesPerRequest: null`, so without the timeout an outage would hang
   sign-in. nginx's `auth_routes` zone (60 POST/min per IP, burst 30) is the
   backstop while Redis is down.
8. **The window is atomic.** One Lua call does INCR + EXPIRE + TTL
   (`REDIS_FIXED_WINDOW_SCRIPT`). Never split it back into INCR then EXPIRE: a
   crash between the two leaves a key with no TTL and refuses that caller forever.
9. **The frontend says how long.** `ApiClientError.retryAfterSeconds` carries the
   header; `utilities/rate-limit.utility.ts` turns it into
   `auth.rateLimit.tryAgainInMinutes` (rounded UP) or `tryAgainInOneMinute`. Login,
   sign-up, forgot password, verification resend and the VS Code approve page use
   it. A 429 that carries ANOTHER code (e.g. `EMAIL_CHANGE_DAILY_LIMIT`) keeps its
   own copy.
10. **Only failures spend the login budget.** Every attempt is still counted up
    front (item 5), but a SUCCESSFUL `POST /auth/login` then resets its IP +
    address window and refunds its own per-IP hit
    (`AuthRateLimitSuccessInterceptor` → `AuthRateLimitService.settle`, rule
    field `onSuccess`). A success already proves the password, so this leaks
    nothing about other accounts. Without it, the coding-agent SDK / headless
    runner (which signs in on every `runAgent` / `createAgent` / list-models
    call that passes credentials) got 429 on its 11th run in 15 min, and an
    office behind one NAT on its 31st sign-in. The refund script
    (`REDIS_REFUND_WINDOW_SCRIPT`) never goes below zero and never creates a
    key. SDK and headless callers should still pass a `token` instead of
    credentials when they run often: `vscode/authorize/init` (10 / min per IP)
    is not refunded.

## Verify

```bash
# 11th wrong-password login for one address → 429 + Retry-After
for i in $(seq 1 11); do curl -sk -o /dev/null -D - -X POST https://claw.local/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"qa-x@example.test","password":"Wrong1!"}' \
  | grep -iE '^HTTP|^retry-after'; done
MSYS_NO_PATHCONV=1 docker exec claw-redis redis-cli --scan --pattern 'auth:rl:*'
# A correct login leaves no login:ip-email key and does not raise login:ip
# A LAN peer spoofing X-Real-IP on :4001 is keyed on its own address
```
