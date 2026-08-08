# TLS / SSL Setup

ClawAI ships with **end-to-end local TLS**: the browser talks to nginx
over HTTPS, nginx talks to every backend service over HTTPS, and every
service-to-service `fetch` is verified against the same local root CA.
TLS is **forced on by default** — there is no opt-out prompt.

> **Two certificates, two jobs.** On a public server the stack serves _both_.
> The mkcert leaf is the stack's **internal identity** — its SANs are container
> hostnames like `auth-service`, so no public CA can ever issue a replacement,
> and every service presents it on its own listener. A **Let's Encrypt** leaf is
> layered on top for the public domain and is the only certificate a browser
> sees. Replacing `certs/claw.crt` with a public certificate breaks every
> service-to-service hop in the stack. See
> [Public TLS on a real domain](#public-tls-on-a-real-domain).

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
# Browser: open https://claw.local — expect green-lock, no warning
# CLI:
curl -sS https://claw.local/api/v1/health
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

- Google: `https://claw.local/api/v1/workspace/oauth/google/callback`
- Slack: `https://claw.local/api/v1/workspace/oauth/slack/callback`
- Atlassian: `https://claw.local/api/v1/workspace/oauth/jira/callback`
- GitHub: `https://claw.local/api/v1/workspace/oauth/github/callback`

You still need to register these manually in each provider's developer
console — there's no API for that. Most providers (Google in particular)
**require** HTTPS for production-tier consent screens, so this unblocks
flows that previously required ngrok.

## Webhooks (NOT solved by this)

Provider webhooks (GitHub `push`, Slack `event_callback`, Jira
`webhook`) still cannot reach `https://claw.local` because the
provider's server doesn't trust your local CA. For webhook testing
use a tunnel:

```bash
# ngrok
ngrok http https://claw.local:443

# or cloudflared
cloudflared tunnel --url https://claw.local
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

---

## Public TLS on a real domain

mkcert is a _development_ CA. Nobody else's browser trusts it, so on a public
domain every visitor gets a full-page interstitial. The fix is a free Let's
Encrypt certificate at the edge, issued by:

```bash
bash scripts/install-letsencrypt.sh --verify-renewal
```

It reads `CLAW_HOSTNAME` from `.env`, adds the `www.` form when that resolves,
and exits cleanly with an explanation for `claw.local`, a bare IP, or any other
name a public CA cannot validate. A `--prod` install runs it automatically as
step 9b, after the stack is up.

### Why not `certbot --nginx`

The command every tutorial gives is `sudo certbot --nginx -d example.com`. It
does not work on this stack, and understanding why prevents a long detour:

- **nginx is not installed on the host.** It runs as the `claw-nginx` container
  from `nginx:alpine`. The `--nginx` plugin looks for a host nginx binary and
  rewrites `/etc/nginx/sites-*`; there is nothing there to find.
- **The config is bind-mounted read-only from this repo.** Anything the plugin
  managed to write in-place would be discarded on the next container recreate.
- **`ufw allow 'Nginx Full'` also fails.** That application profile ships with
  the nginx _APT package_, which is not installed. Use `80/tcp` + `443/tcp`.

So the flow uses the `webroot` authenticator instead.

### How it actually works

```
Let's Encrypt ──HTTP :80──▶ nginx container ──▶ /var/www/certbot   (challenge)
                                   │
Browser ──HTTPS :443──▶ nginx ─────┤ SNI claw-ai.co  → Let's Encrypt leaf
                                   └ SNI anything else → mkcert leaf
                                        │
                                        └─HTTPS──▶ services (mkcert, unchanged)
```

1. `docker/docker-compose.prod.services.yml` publishes host port **80** and
   mounts `/var/www/certbot` and `/etc/letsencrypt` into the container.
2. `infra/nginx/nginx.conf` serves `/.well-known/acme-challenge/` from that
   webroot. It is a `location`, not a server-level bypass — a `return 301` in
   `server` context runs in the rewrite phase, _before_ nginx picks a location,
   and would redirect the CA away from the challenge it came for.
3. certbot writes the token, the CA fetches it over plain HTTP, and the
   certificate lands in `/etc/letsencrypt/live/<domain>/`.
4. The script generates `infra/nginx/public-tls/<domain>.conf` — a server block
   bound to the real domain, using the Let's Encrypt leaf and `include`-ing the
   same `infra/nginx/locations.conf` as the default block.
5. nginx reloads. SNI now selects the trusted certificate for the public domain
   and the mkcert one for everything else.

`/etc/letsencrypt` is **mounted, not copied**, so a renewed certificate is
picked up by a reload alone — no rebuild, and no "renewed weeks ago, still
serving the old cert" outage.

### The one file you must not duplicate

`infra/nginx/locations.conf` holds all ~52 `location` blocks and is included by
_every_ TLS server block. It exists as a separate file for one reason: a public
server serves the same routes under two certificates, and duplicating the
routing table guarantees the copies drift — a drifted route is an outage that
only reproduces on one hostname. Add routes there, never inside a server block.

`infra/nginx/public-tls/*.conf` is generated and **gitignored**: it points at a
`/etc/letsencrypt` path that exists only on the host that holds the certificate,
so committing one would break nginx startup everywhere else. The wildcard
include tolerates an empty directory, which is what lets a laptop and a
production server share one `nginx.conf`.

### Surviving a rebuild — self-healing by default

Because that drop-in lives only in the working tree, it is the one piece of
public TLS a fresh clone, a `git clean`, or a restored backup can lose while
the certificate itself sits untouched in `/etc/letsencrypt`. Losing it is
silent: nginx falls through to the mkcert block, nothing is unhealthy, no
container restarts, and the only symptom is a visitor's browser warning.

`scripts/claw.sh` closes that gap on its own. Every `up`, `services:up`, and
`services:rebuild` calls `ensure_public_tls`, which checks whether
`infra/nginx/public-tls/<CLAW_HOSTNAME>.conf` exists and, if not, regenerates
it from the certificate already on disk:

```bash
bash scripts/install-letsencrypt.sh --restore-only
```

This mode reads the domain names out of the certificate's SANs — never
re-derived, so the block can't claim a name the leaf doesn't cover — and does
**only** that: no CA request, no rate-limit slot consumed, no DNS lookup, no
firewall change. It fails soft: if there is no certificate on disk yet, or the
restore can't get a non-interactive `sudo`, `claw.sh` prints a warning and
keeps starting the stack on mkcert rather than blocking the deploy.

Running it by hand is safe at any time and is the fix if a rebuild ever
outpaces a `claw.sh` version that predates this:

```bash
bash scripts/install-letsencrypt.sh --restore-only
```

### Renewal

certbot's snap installs a systemd timer; renewal is automatic inside the 30-day
window. Because nginx keeps a certificate in memory until reloaded, the script
installs a deploy hook at
`/etc/letsencrypt/renewal-hooks/deploy/00-claw-reload-nginx.sh` that reloads the
container on an actual renewal.

Verify the whole path without consuming a rate limit:

```bash
sudo certbot renew --dry-run
```

### Verifying

```bash
# Trusted by the system CA store? ssl_verify_result must be 0.
curl -sS -o /dev/null -w "code=%{http_code} tls=%{ssl_verify_result}\n" https://claw-ai.co/

# Which leaf does a given SNI select?
echo | openssl s_client -connect claw-ai.co:443 -servername claw-ai.co 2>/dev/null \
  | openssl x509 -noout -issuer -dates

# The challenge path must 404 — NOT 301. A 301 means the redirect is
# shadowing the ACME location and validation will fail.
curl -sS -o /dev/null -w "%{http_code}\n" http://claw-ai.co/.well-known/acme-challenge/probe
```

### Troubleshooting

| Symptom                                              | Cause                                                                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Could not find a profile matching 'Nginx Full'`     | nginx is containerized; use `ufw allow 80/tcp && ufw allow 443/tcp`.                                                                                                |
| Script reports the domain resolves to `127.0.0.1`    | `install-tls.sh` adds `127.0.0.1 <hostname>` to `/etc/hosts`. The script queries public DNS directly to avoid this; a stale copy checking `getent` will false-fail. |
| ACME challenge returns 301                           | The redirect is winning over the `location`. Check the port-80 block still uses `location /` for the redirect.                                                      |
| ACME challenge returns 404 from outside              | Host port 80 is not published. The container predates the compose change — recreate it: `./scripts/claw.sh --prod up`.                                              |
| Certificate renewed but the browser sees the old one | The deploy hook is missing, so nginx was never reloaded.                                                                                                            |
| `www` shows a certificate warning                    | `www` was not included at issuance. Re-run with `--domain example.com --domain www.example.com`.                                                                    |
| mkcert warning reappears on a domain that had Let's Encrypt working | The generated block was lost (fresh clone, `git clean`, restored backup). `claw.sh up`/`services:up`/`services:rebuild` restore it automatically; to fix it without a restart, run `bash scripts/install-letsencrypt.sh --restore-only`. |

### Windows

`scripts/install.ps1` does not issue public certificates: certbot's Windows
builds were discontinued and the challenge flow writes to a Linux path. A
`--prod` install on a public domain prints the exact command to run on the
Linux host instead, and records `LETSENCRYPT_EMAIL` in `.env` so that run needs
no extra input.
