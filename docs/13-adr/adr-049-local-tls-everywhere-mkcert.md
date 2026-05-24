# ADR-049: Local TLS everywhere via mkcert

**Status**: Accepted
**Date**: 2026-05-24
**Deciders**: ClawAI core team

## Context

OAuth providers (Google, Slack, Atlassian, GitHub) increasingly require
HTTPS redirect URIs even for development. Google in particular has
deprecated `http://` redirects outside of `http://localhost` literal,
and several Workspace connectors don't accept a plain `http://localhost`
callback at all in production-tier consent screens. Workspace developers
also want the browser and node `fetch` to see end-to-end HTTPS so they
can demo flows that touch sensitive tokens without an embarrassing
"Not Secure" banner.

The stack ships 17 NestJS microservices, Nginx, and a Next.js frontend.
We needed TLS that:

- Works on **Mac, Linux, and Windows** with one install command
- Is **trusted by the browser automatically** (no per-developer warning
  click-through)
- Covers **service-to-service hops** as well as browser→nginx, so node
  `fetch` between services verifies the cert chain end-to-end
- Has **zero manual prompts** during install (force-SSL by default)
- **Keeps existing service ports** (4001–4017) — only the protocol
  changes
- Falls back to **HTTP** if certs are missing, so a fresh checkout
  without `install-tls` still boots

## Decision

We use **mkcert** to provision a local root CA and a single wildcard leaf
cert. The root CA is installed into the OS trust store (Keychain on Mac,
NSS DB + ca-certificates on Linux, LocalMachine + CurrentUser on Windows).
The leaf cert covers `localhost`, `127.0.0.1`, `::1`, `*.claw.local`, and
every internal docker hostname (`nginx`, `auth-service`, …,
`llamacpp-service`).

Certificate distribution:

- `certs/claw.crt` + `certs/claw.key` — leaf cert + private key
- `certs/rootCA.pem` — copy of the mkcert root CA, used as
  `NODE_EXTRA_CA_CERTS` inside every node container
- All three are bind-mounted into every container at `/certs/` (and into
  nginx at `/etc/nginx/certs/`)

Service bootstrap:

- Every `main.ts` calls `resolveHttpsOptions()` from
  `@claw/shared-utilities`. Reads `HTTPS_CERT_PATH` + `HTTPS_KEY_PATH`,
  returns NestFactory `httpsOptions` if both files exist, `undefined`
  otherwise (HTTP fallback). Stderr-only warning on file-read failure
  so a misconfigured mount never silently downgrades.
- `NODE_EXTRA_CA_CERTS=/certs/rootCA.pem` is set in `.env` so node's
  global `fetch`/`https` modules trust the local CA for inter-service
  HTTPS without per-call agent configuration.

Nginx:

- Listens on **443** for TLS and **80** for redirect-only (HTTP→HTTPS
  301 to catch bookmarked `http://localhost:4000` URLs)
- `proxy_ssl_trusted_certificate` + `proxy_ssl_verify on` enforces cert
  verification on the upstream hop to each backend service
- Every `proxy_pass` upstream rewritten from `http://service:port` to
  `https://service:port`

Install scripts:

- `scripts/install-tls.sh` (Mac + Linux): installs mkcert via brew /
  apt / direct binary download per OS, runs `mkcert -install`, issues
  the leaf cert. Idempotent.
- `scripts/install-tls.ps1` (Windows): installs mkcert via winget /
  choco / direct binary, self-elevates ONCE for the LocalMachine cert
  store write, then no admin needed.
- Both are called as a new Step 6/9 in the main `install.{sh,ps1}`,
  forced on. No `[Y/n]` prompt.

## Alternatives considered

**Caddy with `tls internal`**: Caddy auto-generates a root CA and certs.
Rejected because (a) we already use nginx and would need to migrate
config, (b) Caddy's root CA only goes into the system trust store on
Linux automatically; Mac and Windows still need a manual step, (c) the
generated cert covers fewer hostnames out of the box.

**OpenSSL self-signed without trust install**: Simpler to generate but
the browser shows an interstitial warning every time, defeating the
"feels production-like" goal and blocking OAuth which refuses
unverifiable certs.

**Per-service self-issued certs**: Would scale poorly (17 certs to
manage), and inter-service trust would need each consumer service to
trust every producer's CA. mkcert-rooted single wildcard collapses
this to one cert and one CA.

**Reverse proxy terminates TLS, services stay HTTP internally**: This
was the v1 plan but the user explicitly asked for "SSL between services
as well, keep their ports". Per-service HTTPS also unblocks future
work where a third-party agent (browser extension, IDE plugin) calls a
backend service directly bypassing nginx.

## Consequences

**Positive**
- Browser shows the green-lock everywhere with zero per-developer setup
- OAuth flows that mandate HTTPS callbacks just work
- Service-to-service hops are end-to-end verified (matches the prod
  posture where a service mesh would terminate mTLS)
- Single source of truth for cert generation: `install-tls.sh/.ps1`

**Negative**
- One Windows UAC prompt on first install (mkcert needs admin to write
  to LocalMachine). Subsequent runs no-op.
- Cert rotation: mkcert default leaf cert expires in 825 days. Rerun
  `install-tls.sh` to refresh. Documented in `runbooks/troubleshoot-tls.md`.
- 19 files changed for every new service (compose + main.ts + .env).
  Mitigated by the shared `resolveHttpsOptions` utility and the
  `install-tls.sh` hostname list — both have a single source-of-truth
  comment.

**Doesn't fix**
- External webhooks (GitHub, Slack push events) still cannot reach a
  self-signed cert on `localhost`. A tunnel (`ngrok`, `cloudflared`)
  is still required for inbound webhook testing — this isn't a
  regression vs. the pre-TLS state.
- The OAuth provider's callback URL still needs to be registered
  manually in each provider console as `https://localhost/...` —
  no script can automate cross-vendor console writes.

## Verification

- Browser visit to `https://localhost` shows green-lock and no warning
- `curl -sS https://localhost/api/v1/health` returns 200 without
  `--insecure`
- `docker exec claw-chat-service curl https://auth-service:4001/api/v1/health`
  returns 200 (inter-service trust verified)
- `docker exec claw-nginx nginx -t` succeeds (config parses)
- Removing `certs/` and restarting causes every service to log the
  stderr fallback warning and boot HTTP — confirmed graceful degrade
