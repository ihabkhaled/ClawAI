# ADR-115: Grafana sits behind the admin session, not its own login

**Status**: Accepted
**Date**: 2026-09-23
**Extends**: [ADR-113](adr-113-prometheus-for-operational-metrics.md) (Prometheus) ·
[ADR-112](adr-112-revoked-sessions-stop-at-the-guard.md) (revocation)

## Context

ADR-113 put operational metrics in Prometheus and kept it off the network.
Operators still need to look at them. The owner's decisions (2026-09-20,
[observability-plan](../implementation/observability-plan.md) §2): Grafana,
**admin only**, **no second password**, and the browser proves it is an admin
with **a short-lived httpOnly cookie scoped to `/grafana`, checked by nginx
`auth_request`, dying with the session**.

The app's access token lives in page storage and travels as a Bearer header.
A plain browser navigation to `/grafana/` carries no header, so nginx cannot
reuse it. Grafana's own login would be a second authentication system with no
attribution, revocation or audit trail.

## Decision

1. **auth-service mints the cookie.** `POST /api/v1/auth/grafana-access`, behind
   the normal guard stack with `@Roles(ADMIN)` + `ADMIN_SYSTEM_VIEW`. It sets
   `claw_grafana` — `HttpOnly; Secure; SameSite=Lax; Path=/grafana` — and
   returns only `{ expiresAt }`. The token never appears in a body page script
   can read.
2. **The cookie is a signed token, not a stored one.** Claims: user id, email,
   session id. Signed HS256 with a key **derived** from `JWT_SECRET`
   (`HMAC(JWT_SECRET, "claw:grafana-access-cookie:v1")`) and a distinct
   audience. An access token cannot pass as the cookie, the cookie cannot pass
   as an access token (different key, audience, and no `tokenKind`), and no
   second secret exists to manage. Rotating `JWT_SECRET` kills every cookie.
3. **It dies with the session.** The verify route checks the session id
   against the same Redis revocation key every service reads (ADR-112), and
   fails open on a Redis error exactly as they do — Grafana is what an operator
   opens during an incident.
4. **Its life is `min(15 min, access-token lifetime)`.** The second bound is
   load-bearing: Redis forgets a revoked session after one access-token
   lifetime, so a longer cookie would outlive its own revocation. A test pins it.
5. **nginx asks on every request.** `location /grafana/` runs
   `auth_request /_grafana_auth`, an internal location that sends a bodiless
   **GET** (whatever the original method) to
   `/api/v1/auth/grafana-access/verify`. 204 lets the request through and
   returns the admin's email in `X-Grafana-User`; nginx copies it into
   `X-WEBAUTH-EMAIL`, **always overwriting** whatever the browser sent. The
   public route to verify is closed with a 404.
6. **Grafana trusts only that header.** `[auth.proxy]` with
   `enable_login_token = false` (the header is re-read on every request),
   login form and basic auth off, anonymous off, and
   **`disable_initial_admin_creation = true` — there is no Grafana admin and no
   Grafana password anywhere**. The container is never published, so nothing
   but nginx can reach it to set the header. Users auto-provision as **Editor**
   so Explore works; provisioned dashboards cannot be edited from the UI.
7. **Dashboards and the datasource are code** under `infra/grafana/`, and the
   directory is a `CONFIG_DIR_SERVICES` deploy trigger (recreate, not restart).

## Consequences

- **Grafana is same-origin with the app.** It is served at `/grafana/` on the
  app's host, so script running there could read the app's page storage,
  including the access token. Grafana's code is trusted (official image, no
  third-party plugins installed), but a Grafana XSS would be an app XSS.
  Recorded as **TD-042**; the fix is a separate hostname, which needs a
  second certificate and a cross-site cookie decision.
- Every Grafana request (assets and panel queries included) is one call to
  auth-service. It is an HMAC and a Redis GET, `@SkipThrottle` (every call
  comes from nginx's one address), and quiet in the logs on success
  (`ROUTINE_SUCCESS_PATHS`); a denial still logs.
- The admin sees Grafana stop working when the cookie expires (≤ 15 min) and
  opens it again from `/observability`. Accepted: "short-lived" was the ask.
- Role changes take effect at the next mint, like every access-token claim.
- `GRAFANA_SECRET_KEY` is Grafana's own encryption key. Blank means Grafana's
  built-in default, which is acceptable only because nothing encrypted is
  stored in Grafana today. The installers generate and preserve one.
- nginx's `variables_hash_max_size` went to 2048: the Grafana routes pushed
  the per-upstream variables past the default and nginx warned on every start.

## Alternatives

- **Grafana's own login** — rejected by the owner (a second auth system).
- **A shared basic-auth password at nginx** — the same problem with less
  attribution.
- **A random cookie stored in Redis** — revocable per cookie, but one more
  keyspace and a write per open. The signed token plus the existing session
  revocation gives the same guarantee with nothing stored.
- **Sign with `JWT_SECRET` directly** — rejected: key separation is what makes
  the two token kinds impossible to confuse.
- **A `grafana.` subdomain** — the right isolation, deferred as TD-042.

## Verified (2026-09-23)

- auth-service over real HTTP with the real guard stack: admin gets the cookie
  (attributes asserted); USER (every plan tier, free included) 403 and no
  cookie; anonymous 401; verify 204 with the admin's email, 401 for no cookie,
  a forged cookie made from a USER access token, and a signed-out session.
- nginx + Grafana 12.1.1 in a throwaway Docker network with a stub verify
  route: signed-out 401, bad cookie 401, spoofed `X-WEBAUTH-EMAIL` with no
  cookie 401, admin cookie reaches Grafana as the admin, a spoofed header next
  to a valid cookie is overwritten, a POST reaches Grafana with the subrequest
  forced to GET, the verify route is 404 from outside, `/_grafana_auth` is not
  reachable by name, the provisioned dashboard renders.
- Grafana alone: `admin:admin` basic auth 401, no built-in user created,
  datasource and dashboard provisioned.
- **Not verified**: the real stack (not restarted, by instruction), a browser
  walk through the admin UI, and production (no deploy approved).

## Addendum (2026-09-24): the container never reached production

Declaring the `grafana` service in `docker/docker-compose.prod.services.yml`
also edits that file itself, and it is a `BROAD_IMPACT_PATHS` entry in
`scripts/deploy-prod.sh`. `compute_plan`'s broad branch reset the selection
and reselected only `$buildable` (services with a Dockerfile) — silently
dropping any image-only service (grafana, prometheus, log-shipper) that had
matched earlier via `CONFIG_DIR_SERVICES`. Every incremental production
deploy since this ADR landed built the whole app fleet and recreated nothing
image-only; `grafana`, `prometheus` and `log-shipper` were absent from
`docker ps` and from every `.deploy/history.log` line. `https://claw-ai.co/
grafana/` 401'd for an unauthenticated request as designed, but the DNS name
`grafana` did not resolve inside the nginx container even for an admin,
because the container was never created. nginx's own config was correctly
loaded and in sync (not the stale-bind-mount bug from
`runbook-nginx-stale-config.md`) — there was simply nothing behind it.

Fixed in `scripts/deploy-prod.sh`'s broad branch: it now reselects
`$image_only` alongside `$buildable`, so a broad-impact deploy really means
"every container the target commit still declares." Rehearsed in
`tools/__tests__/deploy-prod-e2e.sh` ("a broad-impact change still recreates
the image-only container", log-shipper as the reproduction). The fix ships
the container; **starting it on production still requires a deploy** — see
`docs/11-runbooks/` for the deploy trigger, this was not run as part of the
fix.
