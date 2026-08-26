# Runbook — nginx serves a stale configuration after a deploy

## When this applies

A route that exists in `infra/nginx/locations.conf` on `main` returns **404 as
HTML** in production, while other API routes answer normally with JSON.

The classic symptom: `/api/v1/<new-route>` returns the Next.js "Page not found"
page. Deployments report success and `nginx -s reload` reports success, yet the
route never appears.

## Why it happens

nginx receives its configuration through **single-file** bind mounts:

```yaml
- ../infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
- ../infra/nginx/locations.conf:/etc/nginx/claw/locations.conf:ro
```

A file bind mount binds the **inode**, not the path. `git pull` does not edit
these files in place — it writes a replacement and renames it over the original,
which produces a **new inode**. The running container remains attached to the
old, now-unlinked inode, so:

- the host file is correct,
- `git status` is clean and the repo is up to date,
- `nginx -t` passes,
- `nginx -s reload` succeeds,
- and nginx still serves the **old** configuration.

Because the new location block never reaches nginx, the request falls through
the catch-all `location /` to the frontend, and Next.js answers 404 with HTML.

Production served an Aug 7 `locations.conf` for nearly three weeks this way
while every deployment reported a healthy reload.

## Diagnose in one step

Identify **who** answers the 404. A service 404 is JSON; a frontend 404 is HTML
and carries Next.js headers:

```bash
curl -skD - https://<host>/api/v1/<route> | head -20
# Content-Type: text/html  +  Vary: rsc, next-router-state-tree  => nginx never routed it
```

Then compare what the container sees against the host:

```bash
stat -c 'inode=%i size=%s mtime=%y' infra/nginx/locations.conf
docker exec claw-nginx stat -c 'inode=%i size=%s mtime=%y' /etc/nginx/claw/locations.conf
```

Different inodes, or an older mtime inside the container, confirm it. A direct
check is just as good:

```bash
docker exec claw-nginx grep -c 'api/v1/<route>' /etc/nginx/claw/locations.conf
```

## Fix

Recreate the container so the bind mounts re-resolve. A reload cannot fix this —
the process is reloading a file it can no longer reach.

```bash
docker restart claw-nginx        # re-establishes the mounts
docker exec claw-nginx nginx -t  # confirm the configuration is valid
```

Then verify from outside. The route should change from **HTML 404** to a JSON
response — `401` on an authenticated route is the expected healthy answer:

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://<host>/api/v1/<route>
```

## Prevention

`scripts/deploy-prod.sh` no longer trusts the mount. `reload_nginx()` compares
the sha256 of every mounted config file inside the container against the host
copy, and:

- **match** → `nginx -t` + `nginx -s reload` (zero-downtime, the normal path),
- **mismatch** → recreate the container, then re-verify.

So a stale mount now self-heals during deployment instead of silently persisting.
If you add a new mounted nginx config file, add it to `NGINX_CONFIG_MOUNTS` in
that script or it will not be checked.

## Related

- [`rules/34-gate-economy-and-machine-resources.md`](../../rules/34-gate-economy-and-machine-resources.md) — restart vs rebuild.
- [`docs/08-runtime-devops/nginx-reference.md`](../08-runtime-devops/nginx-reference.md) — the routing table.
- [`skills/06-docker-toolkit.md`](../../skills/06-docker-toolkit.md) — container operations.
