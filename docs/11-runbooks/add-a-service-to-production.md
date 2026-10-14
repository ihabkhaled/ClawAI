# Runbook — put a new service into production

## When this applies

A commit adds a service (`apps/claw-<name>-service`) that production does not
have yet, and it brings **host state the deploy will not create**: new `.env`
values, a database of its own, a TLS name. Automated deployment
(`scripts/deploy-prod.sh`) builds and recreates containers; it deliberately never
writes `.env`, never starts databases and never re-issues certificates. So the
first deploy of such a service fails — now at the preflight, with a message,
instead of crash-looping for the whole health timeout.

You are here because a deploy said one of:

- `the production .env (...) is missing or has unusable values`
- `<service> needs its database container ..., which is 'absent'`
- `.../certs/claw.crt does not list <service> as a subject alternative name`

Everything below is **one-time per new service**. Secrets are never printed or
committed; the commands print variable _names_ only.

The rules the preflight enforces live in
[`scripts/prod-required-env.manifest`](../../scripts/prod-required-env.manifest).
A service that adds a secret, a database or a TLS name adds its rule there in the
same commit, and `tools/__tests__/prod-required-env.test.mjs` proves it.

## Order matters

1. `.env` values, then 2. the database, then 3. the certificate, then 4. the
   deploy. The database is created with the password from step 1; the service
   cannot reach it with any other.

All commands run on the production host, in the production root `/srv/clawai`
(not the stale `~/ClawAI` clone). Use a copy of the helper from the **target
commit**, because the checkout still holds the previous one:

```bash
cd /srv/clawai
git fetch --no-tags origin main
TARGET=origin/main                      # or the exact commit the deploy is about to roll out
HELPERS="$(mktemp -d)"
git show "$TARGET:scripts/ensure-prod-env.sh"          > "$HELPERS/ensure-prod-env.sh"
git show "$TARGET:scripts/prod-required-env.manifest"  > "$HELPERS/prod-required-env.manifest"
git show "$TARGET:docker/docker-compose.prod.databases.yml" > "$HELPERS/databases.yml"
```

### 1. The `.env` values

Read-only first. This lists what is missing or unusable, by name:

```bash
bash "$HELPERS/ensure-prod-env.sh" --check \
  --env /srv/clawai/.env --manifest "$HELPERS/prod-required-env.manifest"
```

Then append what is missing. This **never overwrites an existing value** (a
replaced `PLUGIN_ENCRYPTION_KEY` would orphan every stored credential) and never
prints a secret:

```bash
bash "$HELPERS/ensure-prod-env.sh" \
  --env /srv/clawai/.env --manifest "$HELPERS/prod-required-env.manifest"
```

A value that is present but unusable (all-zero or short key, the committed
`claw_secret` password, a connection string whose password differs from
`PG_PLUGIN_PASSWORD`) is reported `INVALID` and left alone: fix it by hand.

For `plugin-service` the values are `PLUGIN_ENCRYPTION_KEY` (64 hex characters,
not all zeros), `PG_PLUGIN_PASSWORD` (24 or more characters, not `claw_secret`)
and `PLUGIN_DATABASE_URL` (derived from that password). The same `.env` is read by
every service, so `PLUGIN_SERVICE_URL` (`https://plugin-service:4021`, not a
secret) is checked too: the shared HTTP client only calls hosts named by a
`*_SERVICE_URL` in the caller's own environment, so without it `health-service`
reports plugin-service down ("refusing a host this service does not call") and
chat cannot reach plugin tools although the container is healthy. Back up the key in the
same place as `ENCRYPTION_KEY`; losing it makes stored MCP credentials
unreadable. Fresh installs get all three from `scripts/install.sh` /
`install.ps1`, which preserve existing values on a re-run.

### 2. The database container

Automated deployment never starts databases. Start only the new one, from the
target commit's database file (the checkout does not define it yet):

```bash
docker compose --env-file /srv/clawai/.env -p claw \
  -f "$HELPERS/databases.yml" up -d pg-plugin
docker inspect --format '{{.State.Health.Status}}' claw-pg-plugin   # wait for: healthy
```

Name the service explicitly. A bare `up -d` on that file would also touch every
other database container if its definition changed.

### 3. The TLS name

`nginx` verifies every upstream certificate (`proxy_ssl_verify on`), so a service
missing from `certs/claw.crt` answers **502** although its container is healthy.
Check:

```bash
openssl x509 -in /srv/clawai/certs/claw.crt -noout -ext subjectAltName | tr ',' '\n' | grep plugin-service
```

If it prints a line, go to step 4. If not, the certificate must be re-issued with
the new name (`scripts/install-tls.sh` already lists it). **That is a maintenance
window, not a deploy step:** services and nginx read the certificate only at
boot, and the self-signed fallback tier creates a _new_ root CA, so nginx and
every service must be restarted together afterwards. Do it deliberately:

```bash
# The script finds the project root from its own location, so give the target
# commit's copy a tree that points at the real certs/ and .env:
mkdir -p "$HELPERS/tree/scripts"
git show "$TARGET:scripts/install-tls.sh" > "$HELPERS/tree/scripts/install-tls.sh"
ln -s /srv/clawai/certs "$HELPERS/tree/certs"
ln -s /srv/clawai/.env "$HELPERS/tree/.env"
bash "$HELPERS/tree/scripts/install-tls.sh"

# Restart nginx and the application services together (never the databases):
COMPOSE="docker compose --env-file /srv/clawai/.env -p claw -f docker/docker-compose.prod.databases.yml -f docker/docker-compose.prod.services.yml"
$COMPOSE restart $($COMPOSE config --services | grep -E -- '(-service|^frontend|^nginx)$')
```

If you cannot take the window, deploy anyway: the preflight stops the rollout
until the name is present, which is the safe outcome.

### 4. Deploy

Trigger the normal deploy. The preflight now passes and prints:

```text
  .env values present and valid for: plugin-service
  database claw-pg-plugin is healthy
  certificate covers plugin-service
```

Then check, with the real stack (not a unit test):

```bash
docker ps --filter name=claw-plugin-service --format '{{.Status}}'      # healthy
docker exec claw-nginx wget -qO- --no-check-certificate https://plugin-service:4021/api/v1/health
curl -sk -o /dev/null -w '%{http_code}\n' https://127.0.0.1/api/v1/plugins/catalog  # 401, JSON - not 404 HTML
```

A `404` that is HTML means nginx still serves its old configuration: follow
[runbook-nginx-stale-config.md](runbook-nginx-stale-config.md) (restart, not
reload). `/api/v1/internal/...` must stay a 404 at the edge.

```bash
rm -rf "$HELPERS"
```

## What the deploy checks for you

| Rule kind  | Checked against                              | Fails with                                                   |
| ---------- | -------------------------------------------- | ------------------------------------------------------------ |
| `hex64`    | `.env` value is 64 hex, not all zeros        | `INVALID <NAME>` and the fix command                         |
| `password` | `.env` value is 24+ chars, not `claw_secret` | `INVALID <NAME>`                                             |
| `derived`  | `.env` value equals its template             | `INVALID <NAME>`                                             |
| `database` | the database container is `healthy`          | the container's state and the one-database `up -d` command   |
| `cert-san` | `certs/claw.crt` lists the hostname          | the missing name and the re-issue step (warns if no openssl) |

The check runs after the plan is known and **before** the checkout, the build and
any recreate, and only for services in this rollout. A commit that predates the
manifest is never blocked.

## The full list of places a new service must exist

The preflight covers host state. The repository side is held by
`tools/__tests__/service-wiring-completeness.test.mjs`, which walks every
`apps/claw-*-service` and fails if one is missing from:

- both service compose files (`container_name`, `restart`, `healthcheck`,
  `logging`, network, `env_file`, label, loopback port in prod) and both database
  compose files (container, volume, healthcheck) — and the GPU overlays and the
  feedback-e2e file only when the service needs them;
- `apps/claw-health-service` (`SERVICE_URLS`, a status-page component) and its
  spec;
- `scripts/install-tls.sh` and `install-tls.ps1` (`HOSTS`);
- `scripts/install.sh` and `install.ps1` (secret generation, `PG_*` block,
  `*_DATABASE_URL`, `*_SERVICE_URL`, `*_SERVICE_PORT`) and `.env.example`;
- `infra/nginx/locations.conf` and `nginx.distributed.conf.template` (public
  prefix only; `/api/v1/internal/` stays closed) and
  `infra/nginx/.env.distributed.example`;
- `.github/dependabot.yml`, `tools/coverage/thresholds.json` (both sections),
  `scripts/claw.sh` (`reset` volume list) and `docker-dev-watch.test.mjs`;
- `packages/shared-constants` (name and port).

CI matrices, the image scan and the release/deploy workflows are derived from the
workspace list by `tools/affected`, so they need no edit — adding the workspace
is the edit.

See also [add-a-new-service](../../skills/add-a-new-service.md) and
[rules/05](../../rules/05-infra-rules.md).
