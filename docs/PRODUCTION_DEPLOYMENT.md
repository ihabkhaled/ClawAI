# Production Deployment

> Automatic CI/CD to the GoDaddy VPS, and the automatic release that runs
> alongside it. No credentials or hostnames appear below — see the GitHub
> `production` environment's secrets.

---

## 1. Architecture

```
git push main
     │
     ▼
CI (.github/workflows/ci.yml)
     │ conclusion: success
     ▼
 ┌─────────────────────────────┐   ┌───────────────────────────┐
 │ deploy-production.yml       │   │ release.yml                │
 │ (environment: production)   │   │                             │
 │                              │   │                             │
 │ SSH → deploy user → /srv/clawai│ bump version → tag → publish │
 │ scripts/deploy-prod.sh <sha>│   │ GitHub Release              │
 └─────────────────────────────┘   └───────────────────────────┘
```

Both workflows trigger on the same signal —
`workflow_run: { workflows: [CI], types: [completed] }`, filtered to
`conclusion == success`, `event == push`, `head_branch == main` — and run
independently in parallel. **A published release does not by itself mean that
version is live in production.** Deployment and release are two separate
facts; check `.deploy/deployed-sha` on the VPS (§5) for what is actually
running.

Neither workflow ever fires for a pull request or for `develop`.

## 2. Production deployment

### 2.1 What gets deployed

`deploy-production.yml` SSHes to the VPS as the `deploy` user (secrets
`PROD_HOST`, `PROD_USER`, `PROD_PORT`, `PROD_SSH_PRIVATE_KEY`,
`PROD_SSH_KNOWN_HOSTS` — no `StrictHostKeyChecking=no`) and runs:

```bash
cd /srv/clawai && bash ./scripts/deploy-prod.sh <github.event.workflow_run.head_sha>
```

`head_sha` is the exact commit CI just tested — never whatever `origin/main`
happens to be by the time the SSH session runs.

### 2.2 What `scripts/deploy-prod.sh` does

1. Validates the argument is a commit SHA.
2. Takes a deploy lock (`flock` on `.deploy/deploy.lock`, or a `mkdir`-based
   fallback) — two deployments never run against the VPS at once.
3. Validates `/srv/clawai`, `.env`, and that Docker/Compose v2 are reachable.
4. Refuses to proceed if the checkout has uncommitted changes to **tracked**
   files (`git status --porcelain --untracked-files=no`). Untracked host state
   — `.env`, `certs/`, `.deploy/`, `infra/nginx/public-tls/*.conf` — is never
   touched and never counted as "dirty".
5. Fetches the exact target commit from `origin` (never `git pull`).
6. Reads the previously deployed SHA from `.deploy/deployed-sha` (§5). None
   found → **first deployment** (§2.4).
7. Refuses to deploy a commit _older_ than what's currently deployed unless
   `CLAW_DEPLOY_ALLOW_ROLLBACK=1` is set (§7).
8. Diffs `old_sha..new_sha`, maps changed files to Docker Compose services
   using `docker/docker-compose.prod.services.yml` **as committed at the
   target commit** (§2.3), checks out the target commit
   (`git checkout --detach`, then asserts `HEAD == target`), builds only the
   affected services with at most two concurrent image builds, and recreates
   only those containers
   (`up -d --no-deps --no-build`, never `--remove-orphans`).
9. Waits for every recreated service's Docker healthcheck to report
   `healthy` (bounded timeout, `CLAW_DEPLOY_HEALTH_TIMEOUT`, default 420s).
10. Only once every affected service is healthy: atomically writes the new
    SHA to `.deploy/deployed-sha`.

A failed build never touches a running container. A failed health check dumps
`docker compose ps` and the last 200 log lines per affected service, exits
non-zero, and leaves `.deploy/deployed-sha` unchanged — the workflow run goes
red, production keeps serving the previous commit.

Docker Compose build concurrency defaults to `2` so a broad-impact release
cannot start every service image build at once and starve the VPS or its SSH
session. An operator may set the standard Compose variable
`COMPOSE_PARALLEL_LIMIT` to an integer from `1` through `4` for a single deploy;
values outside that safety range are rejected before the build starts.

**Never**, under any normal deployment: `docker compose down`, `docker rm`,
`docker volume rm`, `docker system prune`, `--remove-orphans`, `git clean`,
`git reset --hard`, or a reversed Prisma migration. Databases, MongoDB, Redis,
RabbitMQ and ClamAV are a _separate_ compose file
(`docker-compose.prod.databases.yml`) that this script never touches.

### 2.3 Selective service detection

Changed files are mapped to services using the **production compose file at
the target commit**, not a hardcoded list — a service renamed or removed in
that same commit is handled correctly. Rules, in order:

- A file under `apps/claw-<x>/**` → that service only (the container it maps
  to is looked up from the compose file's `dockerfile:` path, not guessed).
- A file under `packages/<pkg>/**` → every service that transitively depends
  on that package, via `.ai/manifests/workspace-dependency-graph.json` **at
  the target commit**. If that manifest can't be parsed, every application
  service is rebuilt — correctness over build count.
- `infra/nginx/nginx.conf` or `infra/nginx/locations.conf` → nginx config is
  reloaded (`nginx -t` then `nginx -s reload` inside the running container) —
  never rebuilt or recreated, so TLS termination for the whole site never
  blips for a config change.
- `package.json`, `package-lock.json`, `.npmrc`, `.dockerignore`,
  `scripts/docker-entrypoint.prod.sh`, `docker-compose.prod.services.yml`, or
  any `tsconfig*.json` → every application service (these reach every image's
  build context).
- `docker-compose.prod.databases.yml`, `docker-compose.prod.ollama*.yml`, or a
  GPU overlay → reported as **manual** (never auto-applied; databases and the
  local-AI runtime are out of scope for this script — see §6).
- A profiled service (`ollama-service`, `llamacpp-service`) is only built when
  `CLAW_LOCAL_AI=true` resolves the same way `scripts/claw.sh` resolves it:
  env var → `.env`'s `CLAW_LOCAL_AI` → off.

Inspect a commit's plan without touching git or Docker:

```bash
git diff --name-only <old-sha> <new-sha> | bash scripts/deploy-prod.sh --plan
```

### 2.4 First deployment

No `.deploy/deployed-sha` on disk → every application service is built and
(re)created. Databases, volumes, and all persistent data are untouched — the
databases compose file is never part of this script's scope, first
deployment or not.

### 2.5 Health verification

Every affected service must reach Docker's `healthy` status within the
timeout. A service with no declared healthcheck (nginx) must instead report
`running` on two consecutive polls, so a container that starts and immediately
crash-loops is not mistaken for success.

## 3. Deployment state

```
/srv/clawai/.deploy/deployed-sha   — last successfully deployed commit (written atomically)
/srv/clawai/.deploy/deploy.lock    — flock target
/srv/clawai/.deploy/history.log    — append-only: timestamp, SHA, services touched
```

None of `.deploy/` is committed to the repository.

## 4. Manual deployment

```bash
cd /srv/clawai
bash scripts/deploy-prod.sh <sha>
```

Same script, same guarantees, whether GitHub Actions or an operator runs it.

## 5. Inspecting deployment logs

- GitHub Actions: the `deploy-production` workflow run's log — the same
  output a manual run would print (changed files, affected services, build,
  health, or the diagnostics dump on failure).
- On the VPS: `cat /srv/clawai/.deploy/history.log` for the timeline, and
  `docker compose --env-file /srv/clawai/.env -p claw -f
/srv/clawai/docker/docker-compose.prod.services.yml logs -f <service>` for a
  specific service.

## 6. Things this automation deliberately does NOT do

- **Databases, local-AI runtime, GPU overlays**: reported as "manual" when
  their compose files change (§2.3); apply with `./scripts/claw.sh --prod
db:up` / `ollama:up` by hand. Automatic deployment must never risk taking a
  database down.
- **Prisma migrations**: `scripts/docker-entrypoint.prod.sh` already runs
  `prisma migrate deploy` (forward-only) on every container start. This
  automation does not add, remove, or reverse that behavior. A migration must
  stay backward-compatible with the previous release, because health
  verification can recreate the old image again on a failed rollback attempt.
- **Nginx restarts**: config changes get a `nginx -s reload`, never a
  container recreate.

## 7. Troubleshooting

**Unhealthy container after a deploy** — the workflow log (or a manual run)
already printed `docker compose ps` and the last 200 log lines for the
affected service. `.deploy/deployed-sha` was not updated, so a re-run of CI
on a fix will retry cleanly; nothing needs to be manually reverted first.

**"dirty working tree"** — a tracked file in `/srv/clawai` was hand-edited on
the server. `git diff` in that directory, decide whether to commit it
upstream or discard it (`git checkout -- <file>`), then re-run.

**Emergency rollback** — deploying backwards is refused by default:

```bash
CLAW_DEPLOY_ALLOW_ROLLBACK=1 bash scripts/deploy-prod.sh <older-sha>
```

This does **not** reverse any Prisma migration — only forward-compatible
schema changes can be safely rolled back at the application layer. If the
target commit's schema is incompatible with the newer data already written,
this is a manual database recovery, not something this script can do safely.

## 8. Automatic releases

`release.yml` runs on the same `CI` success signal as deployment. Per push to
`main` it:

1. Bumps `version` in the root `package.json` and every workspace's
   `package.json` (and every internal `@claw/*` version pin) using
   [Conventional Commits](https://www.conventionalcommits.org/) since the
   previous `vX.Y.Z` tag — `feat` → minor, a `!`/`BREAKING CHANGE` → major,
   anything else (including a non-conventional subject) → **patch**. The bump
   is never zero: every push produces a releasable version.
2. Generates release notes grouped by commit type
   (`tools/release/notes.mjs`).
3. Commits (`chore(release): vX.Y.Z [skip ci]`), tags, and pushes to `main`.
4. Publishes a GitHub Release from the pushed tag with the generated notes.

**Loop safety**: GitHub does not start a new `push`-triggered workflow run for
a commit pushed by the workflow's own `GITHUB_TOKEN` — this is a platform
guarantee, not something configured here — so CI never re-runs on the bump
commit. `[skip ci]` in the commit message is a second, explicit guard in case
this workflow is ever reconfigured to push with a personal access token.

**Requires** that branch protection on `main` allows this workflow to push a
commit and a tag directly. If `main` requires a pull request for every write,
add an explicit bypass for the Actions actor in the branch ruleset — a
repository setting, not something this workflow can configure for itself.

**Race handling**: two pushes to `main` close together queue serially
(`concurrency: group: clawai-release`). The push step retries a bounded
number of times, rebasing onto the latest `origin/main` between attempts, so
the common case (linear history) self-heals. If `main` truly diverges faster
than the retries can catch up, the run fails loudly rather than guessing —
nothing was committed or tagged, so the next push's release still starts from
a clean state.

Dry-run the version bump locally without writing anything:

```bash
node tools/release/version.mjs --from <previous-tag> --dry-run
```
