# TLS / SSL Setup

ClawAI ships with **end-to-end local TLS**: the browser talks to nginx
over HTTPS, nginx talks to every backend service over HTTPS, and every
service-to-service `fetch` is verified against the same local root CA.
TLS is **forced on by default** — there is no opt-out prompt.

## How it works

```
Browser ──HTTPS──▶ nginx (:443)
                     │
                     ├─HTTPS──▶ auth-service (:4001)
                     ├─HTTPS──▶ chat-service (:4002)
                     ├─HTTPS──▶ … 15 more services
                     └─HTTP───▶ frontend (:3000)   ← Next dev server stays HTTP internally
```

The cert chain:

- `certs/rootCA.pem` — local root CA, installed into the OS trust store
  by `mkcert -install`. Trusted by the browser, by `curl`, and by node
  via `NODE_EXTRA_CA_CERTS=/certs/rootCA.pem`.
- `certs/claw.crt` — single wildcard leaf cert signed by the local CA,
  covering `localhost` + every internal docker hostname.
- `certs/claw.key` — leaf private key. Never committed; lives only on
  the developer's machine.

## Install

```bash
# Mac / Linux
bash scripts/install-tls.sh

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File scripts/install-tls.ps1
```

`scripts/install.sh` and `scripts/install.ps1` call this automatically
as Step 6/9 — you don't normally invoke it directly.

What the script does:

1. Installs `mkcert` if missing (brew on Mac, apt + binary on Linux,
   winget / choco / direct download on Windows)
2. Runs `mkcert -install` (idempotent — no-op if CA already trusted)
3. Issues a leaf cert covering 22 hostnames, writes to `certs/claw.crt`
4. Copies the root CA into `certs/rootCA.pem`

The Windows script self-elevates **once** for the LocalMachine cert
store write. Subsequent runs need no admin.

## Verification

After install:

```bash
# Browser: open https://localhost — expect green-lock, no warning
# CLI:
curl -sS https://localhost/api/v1/health
# {"status":"ok",...}

# Inter-service trust (from inside any service container):
docker exec claw-chat-service \
  curl https://auth-service:4001/api/v1/health
# {"status":"ok",...}

# Nginx config parses with the new TLS server block:
docker exec claw-nginx nginx -t
```

## How services pick up the certs

Each NestJS service `main.ts` calls `resolveHttpsOptions()` from
`@claw/shared-utilities`. It reads two env vars set in `.env`:

```
HTTPS_CERT_PATH=/certs/claw.crt
HTTPS_KEY_PATH=/certs/claw.key
NODE_EXTRA_CA_CERTS=/certs/rootCA.pem
```

If both `HTTPS_CERT_PATH` and `HTTPS_KEY_PATH` resolve to readable
files, the service boots on TLS. If either is missing, the service
falls back to plain HTTP and logs a one-line stderr warning. This
graceful fallback exists so a fresh checkout that hasn't run
`install-tls` still boots.

`NODE_EXTRA_CA_CERTS` makes node's built-in `fetch`, `https.request`,
and any axios/undici-based client trust the local root CA without
per-call agent configuration. Without it, every inter-service call
would throw `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

## Adding a new service

When you add a new microservice, you must:

1. **Add its hostname** to the SAN list in both `install-tls.sh` and
   `install-tls.ps1` (the `HOSTS` array)
2. **Rerun `install-tls`** to reissue the leaf cert with the new SAN
3. **Mount `../certs:/certs:ro`** into the new service in
   `docker/docker-compose.dev.services.yml` and the prod equivalent
4. **Use the shared `resolveHttpsOptions()`** in the new `main.ts` —
   never roll your own cert read

Forgetting step 1 will cause the new service's startup to fail with
`Hostname/IP doesn't match certificate`. The browser will not be
affected (the cert covers `localhost`), but inter-service calls into
the new service will fail TLS verification.

## OAuth callback URLs

Once TLS is live, your OAuth callback URLs become:

- Google: `https://localhost/api/v1/workspace/oauth/google/callback`
- Slack: `https://localhost/api/v1/workspace/oauth/slack/callback`
- Atlassian: `https://localhost/api/v1/workspace/oauth/jira/callback`
- GitHub: `https://localhost/api/v1/workspace/oauth/github/callback`

You still need to register these manually in each provider's developer
console — there's no API for that. Most providers (Google in particular)
**require** HTTPS for production-tier consent screens, so this unblocks
flows that previously required ngrok.

## Webhooks (NOT solved by this)

Provider webhooks (GitHub `push`, Slack `event_callback`, Jira
`webhook`) still cannot reach `https://localhost` because the
provider's server doesn't trust your local CA. For webhook testing
use a tunnel:

```bash
# ngrok
ngrok http https://localhost:443

# or cloudflared
cloudflared tunnel --url https://localhost
```

This isn't a regression — webhooks never worked locally before TLS
either. See `docs/11-runbooks/troubleshoot-tls.md` for details.

## Cert rotation

The mkcert leaf cert expires in 825 days (default). When near expiry,
rerun `bash scripts/install-tls.sh` — it'll issue a fresh leaf without
re-installing the root CA.

The root CA itself expires in 10 years. If you ever see the browser
warn about an expired CA, run `mkcert -uninstall && mkcert -install`
then rerun `scripts/install-tls.sh`.
