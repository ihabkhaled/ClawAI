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
   fallback) — two deployments never run against the VPS at once. Waiting is
   never silent: a progress line naming the current holder is printed every
   `CLAW_DEPLOY_LOCK_HEARTBEAT` seconds (default 15) until
   `CLAW_DEPLOY_LOCK_WAIT` runs out. Under CI the deployment also arms an
   orphan guard (`CLAW_DEPLOY_ORPHAN_GUARD=1`) that aborts it if the SSH
   session that started it disappears, so a dropped connection can never leave
   a deployment holding the lock.
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
   affected services with at most two concurrent image builds. A failed build
   is retried at most twice, with bounded backoff, only when its output proves
   a transient registry/network failure such as `ECONNRESET`, `ETIMEDOUT`, or
   temporary DNS failure. Deterministic failures are never retried. The script then recreates
   only those containers
   (`up -d --no-deps --no-build`, never `--remove-orphans`).
9. Waits for every recreated service's Docker healthcheck to report
   `healthy` (bounded timeout, `CLAW_DEPLOY_HEALTH_TIMEOUT`, default 420s),
   but **fails immediately on a crash loop** — a container whose
   `RestartCount` reaches `CLAW_DEPLOY_CRASH_LOOP_RESTARTS` (default 3) is
   reported with its last 20 log lines instead of being waited out. Docker
   increments that counter only when the main process exited and the restart
   policy restarted it, so a rising count is decisive rather than slow-start
   noise. Without this the rollout could not distinguish the two: a
   crash-looping container with a healthcheck reports health `starting`
   forever and never `unhealthy`, so the 2026-09-02 chat-service rollout spent
   23 minutes to report a failure that was certain within 30 seconds.
10. Only once every affected service is healthy: atomically writes the new
    SHA to `.deploy/deployed-sha`.

A failed build never touches a running container. A failed health check dumps
`docker compose ps` and the last 200 log lines per affected service, exits
non-zero, and leaves `.deploy/deployed-sha` unchanged — the workflow run goes
red, production keeps serving the previous commit.

The whole image build is bounded by `CLAW_DEPLOY_BUILD_TIMEOUT` (default
3600s, `timeout --foreground` so the build stays in the deployment's process
group). A build that exceeds it is aborted and never retried: a build that
produces nothing for an hour is wedged, not slow, and retrying it only holds
the deploy lock longer.

Docker Compose build concurrency defaults to `2` so a broad-impact release
cannot start every service image build at once and starve the VPS or its SSH
session. An operator may set the standard Compose variable
`COMPOSE_PARALLEL_LIMIT` to an integer from `1` through `4` for a single deploy;
values outside that safety range are rejected before the build starts.

### 2.6 Frontend maintenance response

The frontend catch-all intercepts upstream 502, 503, and 504 responses and
returns `/etc/nginx/claw/public-tls/maintenance.html` as HTTP 503 with
`Retry-After: 60` and `Cache-Control: no-store`. The self-contained page is
tracked in the repository and arrives through the existing read-only nginx
mount, so a validated `nginx -s reload` activates it without recreating the
proxy. API routes are not intercepted and preserve their original status and
response bodies.

### 2.7 Deployment visibility

After the server resolves the exact target commit, `deploy-prod.sh` atomically
maintains `.deploy/status.json`. The secret-free document reports the target and
previous/deployed SHAs, application version, selected services, current phase,
current health-check service, timestamps, workflow link, and a bounded failure
code. Running phases are `preparing`, `planning`, `building`, `deploying`,
`reloading_nginx`, `verifying`, and `finalizing`; terminal states are
`completed` and `failed`. Verification refreshes the timestamp for each service,
so a broad rollout remains visibly active while its health checks finish.

The production GitHub Actions job captures that document after either success or
failure and always publishes a concise run summary with the production URL. If
SSH is unavailable, the summary still reports the target and workflow outcome
while marking server fields unavailable. `.deploy/` is host-owned ignored state;
the deployer never commits or removes it.

The immutable seeded super admin can also inspect the same validated state at
`/<locale>/admin/deployment`. The page polls every five seconds while a rollout
is running, slows to 30 seconds for terminal states, and warns when a running
deployment has not reported progress for 30 minutes. Ordinary admins cannot see
the navigation item or access the API.

### 2.8 Deployment control from the admin page

The same page drives production, not just watches it. Every control is
super-admin only and ends in the same `deploy-production` workflow an automatic
release dispatches — there is no second deployment path.

| Control                | What it does                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Automatic deployment   | Pauses or resumes the automatic lane by writing `.deploy/automation.json`                 |
| Deploy latest          | Dispatches the workflow against `GITHUB_DEPLOY_REF` (normally `main`)                     |
| Re-deploy current      | Dispatches the commit already recorded as live — the recovery re-run                      |
| Deploy an exact commit | Dispatches one 40-character SHA an operator typed — rollback, or pinning a known-good run |
| Clear stuck rollout    | Rewrites a rollout that stopped reporting as `failed` so the next dispatch is not blocked |

### Credentials

Manual dispatch needs a GitHub token, a repository and a ref. They are
configured **from the deployment page itself** and stored in auth-service's
database, with the token encrypted using `ENCRYPTION_KEY`. No endpoint ever
returns the token; the page shows only its last four characters, which is
enough to tell which token is installed and not enough to use it.

The `GITHUB_DEPLOY_TOKEN` / `GITHUB_DEPLOY_REPOSITORY` / `GITHUB_DEPLOY_REF`
environment variables remain a **fallback**. A stored row always wins; the
environment is what keeps an existing box working and lets a fresh one be
provisioned from `.env` alone. The page labels which of the two is in effect.

A partial set does not half-enable the lane, and neither does a broken stored
row: if the repository or ref no longer validates, or the token will not
decrypt (usually because `ENCRYPTION_KEY` was rotated without re-saving), the
page marks the credentials unusable and hides the controls rather than offering
a button that can only fail.

The automatic-deploy switch works either way, because it is a file on the box
rather than a GitHub call.

#### Creating the token

1. GitHub → your avatar → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Resource owner**: the account or organisation that owns this repository.
3. **Repository access**: _Only select repositories_ → this repository alone.
4. **Permissions** → _Repository permissions_ → **Actions: Read and write**.
   Leave every other permission at _No access_. Read and write is the minimum:
   write dispatches the workflow, read powers the live progress panel.
5. Set an expiry you will actually renew, generate, and copy the
   `github_pat_…` value — GitHub shows it once.
6. Paste it into **Add credentials** on `/<locale>/admin/deployment`, with the
   repository as `owner/repo` and the branch you deploy from (normally `main`).

A classic PAT with the `workflow` scope also works, but grants far more than
this needs; prefer the fine-grained token.

### 2.9 Live progress and diagnosing a stuck build

The page reads the deployment workflow straight from the GitHub Actions API and
renders the run, its jobs and every step, with the step executing right now
highlighted and each finished step marked passed or failed. When a step fails,
the page names the **first** failed step — later ones usually fail as a
consequence — and links directly to that job's log.

This is deliberately independent of `.deploy/status.json`. The two disagree in
exactly the case that is hardest to diagnose: the workflow has already failed
while the box still reports `running`. The page detects that combination and
says so, rather than leaving a rollout that looks alive but is not.

The troubleshooting panel appears only when something is actually wrong, and
gives ordered steps for the situation:

| Situation                                                   | What it means                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Workflow ended without success, box still reports `running` | The rollout was abandoned mid-flight. Production still serves the old version |
| Reported `running`, silent for over 30 minutes              | Wedged, or its connection died                                                |
| Last rollout failed, nothing running                        | Production still serves the old version; nothing was half-applied             |
| No usable credentials                                       | The page can only watch                                                       |

The advice always reads the failing log before re-running anything: a re-deploy
that has not been explained is just the same failure again.

Two guards keep an operator from racing the pipeline. A dispatch is refused
while a rollout is still reporting (HTTP 409, `DEPLOYMENT_ALREADY_RUNNING`);
once a rollout has gone quiet past the 30-minute stale window it no longer
blocks, which is exactly the stuck case the manual lane exists to recover.
Clearing a stuck rollout only rewrites `status.json` with
`failureCode: DEPLOYMENT_RESET` — it does not cancel a workflow, roll anything
back, or change the recorded deployed SHA. If the rollout is in fact alive it
overwrites that record on its next phase.

`CLAW_DEPLOY_TRIGGER` carries the lane down to the box: `auto` (what
`release.yml` passes) obeys the pause switch and exits 0 without touching
production while it is off; `manual` always proceeds, so pausing the automatic
lane can never lock an operator out. Anything unreadable, absent or
unrecognised in `automation.json` leaves the lane on — a pause has to be an
explicit, well-formed statement.

`.deploy` is mounted read-write into auth-service for these two writes only.
`deployed-sha` and `history.log` stay owned by `deploy-prod.sh`.

Terminal success and failure email uses the existing contact-mail settings. Set
`CONTACT_EMAIL_ENABLED=true`, `CONTACT_EMAIL_PROVIDER=smtp`,
`CONTACT_EMAIL_TO=<operations recipient>`, and the existing `CONTACT_SMTP_*`
values in the server environment. Delivery is best effort and never changes the
deployment result.

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
/srv/clawai/.deploy/status.json    — current rollout record (also rewritten by an admin reset)
/srv/clawai/.deploy/automation.json — automatic-deploy switch, written from the admin page
```

None of `.deploy/` is committed to the repository.

## 4. Manual deployment

Three ways in, one pipeline. In order of preference:

1. **The admin deployment page** (`/<locale>/admin/deployment`) — see 2.8. This
   is the normal recovery path: it needs no shell access and records the run
   the same way an automatic release does.
2. **The GitHub Actions UI** — run `deploy-production` with an optional exact
   `target_sha`. `trigger_source` defaults to `manual` there, so it ignores the
   automatic-deploy pause switch.
3. **On the box:**

```bash
cd /srv/clawai
bash scripts/deploy-prod.sh <sha>                          # obeys the pause switch
CLAW_DEPLOY_TRIGGER=manual bash scripts/deploy-prod.sh <sha>  # ignores it
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

**Deployments hang, then fail with `client_loop: send disconnect: Broken pipe`
(exit 255)** — the deployment reached the server and then went silent. Two
things cause that, and both are now guarded:

- A `docker compose build` that stops making progress. BuildKit can wedge a
  single `RUN` layer with no output and no worker process left, and compose
  never returns. The build is capped by `CLAW_DEPLOY_BUILD_TIMEOUT` (default
  3600s) and aborted with a named error instead of running forever.
- A deployment waiting on the deploy lock. It now prints a progress line every
  `CLAW_DEPLOY_LOCK_HEARTBEAT` seconds naming the holder, so a queued
  deployment is never mistaken for a dead connection, and the traffic keeps the
  SSH flow from being dropped as idle.

When the connection does die, `CLAW_DEPLOY_ORPHAN_GUARD=1` (set by the
workflow) makes the remote deployment abort itself within
`CLAW_DEPLOY_ORPHAN_GUARD_INTERVAL` seconds, record a failed status, and
release the lock. Every docker invocation also closes the lock descriptor, so
no surviving child can keep the lock held after the deployer exits.

To confirm nothing is stuck on the box:

```bash
ps -eo pid,pgid,etime,cmd | grep -E 'deploy-prod|docker compose|buildx'
lsof /srv/clawai/.deploy/deploy.lock          # no output = the lock is free
cat /srv/clawai/.deploy/status.json
```

A deployment left over from before this guard existed is killed by its process
group — `kill -TERM -<pgid>` — after which the lock is free and a normal re-run
succeeds.

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
