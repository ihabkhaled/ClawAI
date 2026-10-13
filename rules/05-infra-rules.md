# ClawAI — Infrastructure Rules

> Docker, Nginx, CI/CD, environment variables, shared packages.

---

## The Split Compose Files Rule

**Every new service and every new database MUST be added to every compose file
that could define it, in the same commit.**

The all-in-one `docker-compose.dev.yml` and `docker-compose.yml` no longer
exist; `./scripts/claw.sh` stitches the split files instead. These are the files
in `docker/`:

| File                                                               | Purpose                          |
| ------------------------------------------------------------------ | -------------------------------- |
| `docker-compose.dev.databases.yml`                                 | Dev split: databases only        |
| `docker-compose.dev.services.yml`                                  | Dev split: services only         |
| `docker-compose.prod.databases.yml`                                | Prod split: databases only       |
| `docker-compose.prod.services.yml`                                 | Prod split: services only        |
| `docker-compose.dev.ollama.yml` / `docker-compose.prod.ollama.yml` | Only if the service needs Ollama |
| `docker-compose.{dev,prod}.gpu-{nvidia,rocm,vulkan}.yml`           | GPU overlays, applied by claw.sh |

**Databases** → dev.databases.yml, prod.databases.yml
**Services** → dev.services.yml, prod.services.yml
**Volumes** → declare in EVERY file that defines the corresponding service or database

**Violation**: A service in one file and not its sibling is broken in exactly one
environment, which is the hardest kind to notice. This has caused production
incidents.

**Never bring the stack up with `docker compose -f …` directly.**
`./scripts/claw.sh up` is the only supported entry point: it stitches the split
files and applies the right GPU overlay.

### A container built from a published image is still deployed

A service with no `build:` (Vector's `log-shipper`, and anything like it) is
planned by `scripts/deploy-prod.sh` through the `CONFIG_DIR_SERVICES` table,
which maps the directory holding its bind-mounted config to its service name.

**Adding such a container MUST add its row.** Without one, the deployment plan
cannot see it: the container is never created, and every later change to its
config deploys nothing at all, while the run still reports success. That was
true of `infra/vector/**` until 2026-09-20.

It is brought up with `--force-recreate`, never restarted, because a
bind-mounted file keeps its old inode across a restart
([runbook-nginx-stale-config](../docs/11-runbooks/runbook-nginx-stale-config.md)).

**Enforcement**: `tools/__tests__/deploy-prod-e2e.sh` deploys a config-only
change to `log-shipper` and asserts it is recreated and never built.
Background: [`docs/implementation/observability-plan.md`](../docs/implementation/observability-plan.md),
which found this while planning the metrics stack.

### A release version bump rebuilds nothing — unless the image bakes the version

`scripts/deploy-prod.sh` drops a `package.json` / `package-lock.json` whose
only differences are release versions (ADR-123), so a release does not rebuild
every image on the production host. **A workspace that compiles its manifest
`version` into its output (today only the frontend's `APP_VERSION`) MUST be
listed in `VERSION_BAKED_MANIFESTS`**, or production shows the previous
release number. The BuildKit cache is bounded before every build and on every
exit; keep it that way.

**Enforcement**: `tools/__tests__/deploy-prod.test.mjs` (normaliser cases) and
`deploy-prod-e2e.sh` (a release-only commit builds only the frontend).
Runbook: [runbook-server-overloaded-by-builds](../docs/11-runbooks/runbook-server-overloaded-by-builds.md).

## A dev service mounts its BUILD INPUTS, not only its source

Every service block in `docker-compose.dev.services.yml` mounts, read-only:

```yaml
- ../apps/claw-<name>/tsconfig.json:/app/apps/claw-<name>/tsconfig.json:ro
- ../apps/claw-<name>/tsconfig.build.json:/app/apps/claw-<name>/tsconfig.build.json:ro
- ../tools:/app/tools:ro
```

alongside `package.json`, `src` and `prisma`.

**Why**: a dev container recompiles the mounted `src` on every change. If the
compiler configuration and the build scripts come from the image instead of the
working tree, the container compiles **today's source with an old config** — and
the failure looks nothing like config drift. It looks like `TS2307: Cannot find
module` on imports that obviously exist.

**Violation**: when the repo moved every workspace to
`moduleResolution: "bundler"`, three services whose images predated that change
kept compiling under `Node16`, where extensionless relative imports are illegal.
research-service was down 22 hours — so `/research/*` returned 502 and every web
search and fetch in chat silently did nothing — with ollama-service and
llamacpp-service dead beside it. Nothing in the code was wrong.

**The general rule**: if a dev container derives something from the working
tree, mount everything that derivation reads. A half-mounted build is a build
that disagrees with the repository and says so in the wrong language.

Diagnosis and recovery:
[docker-guide](../docs/08-runtime-devops/docker-guide.md) — "A dev container
compiling new source against an OLD build config".

---

## Container Rebuild Procedure

When rebuilding after shared package changes or dependency changes:

```bash
# ALWAYS follow this exact 4-step sequence:
./scripts/claw.sh stop <service>
./scripts/claw.sh rm -f <service>
docker rmi claw-<service>
./scripts/claw.sh up -d --build <service>
```

**NEVER skip steps.** Just restarting or `--build` alone leaves stale compiled code.

When to rebuild (vs restart):

| Change                         | Action                                         |
| ------------------------------ | ---------------------------------------------- |
| `src/` source files            | `node --watch` auto-detects (no action needed) |
| Prisma schema                  | Rebuild (migration runs in entrypoint)         |
| `package.json` deps            | Rebuild                                        |
| Shared packages (`packages/*`) | Rebuild ALL dependent services                 |
| `.env` values                  | Restart only                                   |
| Docker compose config          | `docker compose up -d` (recreate)              |
| Nginx config                   | Restart nginx container only                   |

---

## Environment Variable Rules

1. **NEVER** use `process.env` directly — use `AppConfig` (Zod-validated in each service)
2. **ALL** variables declared in `.env.example` with example values
3. **ALL** variables filled in `.env` with working dev values
4. **ALL** variables added to `scripts/install.sh` AND `scripts/install.ps1`
5. **ALL** variables documented in `docs/06-data/environment-variables.md`
6. Secrets (API keys, JWT secrets, encryption key) are NEVER logged
7. Frontend env vars use `NEXT_PUBLIC_` prefix for client-accessible only

Variable naming:

```
<SERVICE>_PORT          (e.g., CHAT_PORT=4002)
<SERVICE>_DATABASE_URL  (e.g., CHAT_DATABASE_URL=postgresql://...)
<SERVICE>_SERVICE_URL   (e.g., CHAT_SERVICE_URL=http://chat-service:4002)
```

---

## Nginx Rules

Every new service needs:

```nginx
# In nginx.conf:

# 1. Upstream block (use resolver pattern, NOT upstream blocks for Docker DNS)
location /api/v1/<new-service>/ {
  proxy_pass http://claw-<new-service>:<PORT>/api/v1/<new-service>/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Request-ID $request_id;
}

# 2. SSE endpoints additionally need:
#    proxy_buffering off;
#    proxy_cache off;
#    proxy_read_timeout 86400;
#    proxy_set_header Connection "";
```

**SSE routes MUST come BEFORE the generic service location block** (nginx uses first-match for identical prefixes).

---

## CI Rules (`.github/workflows/ci.yml`)

Every new service must be added to:

1. **Prisma generate loop** — so CI generates the Prisma client before running tests:

   ```yaml
   - name: Generate Prisma clients
     run: |
       cd apps/claw-<new-service> && npx prisma generate
   ```

2. **Test environment variables** — so test runner has DB connection string:

   ```yaml
   env:
     <NEW_SERVICE>_DATABASE_URL: postgresql://test:test@localhost:5432/test_db
   ```

3. **Build job matrix** — if service has a separate build step

4. **Matrix entries are derived, not hand-written** — `tools/affected/index.mjs ci-matrix` discovers every workspace from the root `package.json`, so a new service joins the static, test and build matrices automatically (with `prisma: true` when it declares `prisma:generate`).

### New shared package and CI

CI needs no edit for a new package under `packages/`: the `setup` job builds every
shared package in the dependency order computed from the `package.json` files
(`node tools/affected/index.mjs shared-build`), uploads the `dist` folders as an
artifact for every matrix job, and the matrices are derived from the workspace
list. What still needs a hand edit is every consumer's `Dockerfile` and
`Dockerfile.dev` ([rules/14](14-shared-packages.md) §6, enforced by
`tools/__tests__/dockerfile-shared-package-completeness.test.mjs`). The repo
compiles with TypeScript 7 — [docs/08-runtime-devops/build-system.md](../docs/08-runtime-devops/build-system.md).

---

## Shared Packages Rules

| Package                     | When to update                                                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared-types`     | New event patterns, new enums used across services                                                                                                                                             |
| `packages/shared-constants` | New service port, new service name constant, JWT algorithm, HTTP timeouts                                                                                                                      |
| `packages/shared-rabbitmq`  | New RabbitMQ utility or connection pattern                                                                                                                                                     |
| `packages/shared-auth`      | New auth guard, new decorator, new role                                                                                                                                                        |
| `packages/shared-utilities` | New cross-service function — JWT verifier, HTTP client, crypto, URL safety, retry policy, etc. **Search this package before writing a new utility in `apps/<service>/src/common/utilities/`.** |

After updating a shared package:

1. Increment version in package's `package.json`
2. Rebuild ALL services that depend on it (full stop → rm → rmi → build cycle)
3. Run `npm install` in monorepo root to update workspace links
4. **Update `.github/workflows/ci.yml` "Build shared packages" step** if a new package was added (see footgun above)
5. **When a service gains a new `@claw/shared-*` dependency, add `RUN cd packages/shared-<x> && npm run build` to that service's `Dockerfile` AND `Dockerfile.dev`.** The image copies the host's `packages/*/dist`; a missing build line runs stale host output (the 2026-09-02 payment-service `ERR_MODULE_NOT_FOUND` crash). Enforced by `tools/__tests__/dockerfile-shared-package-completeness.test.mjs`; runbook [add-a-shared-package-to-a-service](../skills/add-a-shared-package-to-a-service.md), rule [14](14-shared-packages.md) §6.

---

## Health Service Rules

Every new service MUST register with `apps/claw-health-service`:

```typescript
// In claw-health-service, add to service URL list:
{ name: 'claw-<new-service>', url: process.env.NEW_SERVICE_URL + '/health' }
```

Health check endpoint format:

```json
{ "status": "ok", "service": "claw-<name>", "version": "1.0.0" }
```

---

## Docker DNS Rules

**NEVER** store or use `localhost`, `127.0.0.1`, or `0.0.0.0` as service URLs inside Docker containers. Use the Docker service name:

```
✅ http://ollama:11434          (Docker service name)
✅ http://claw-chat-service:4002
✅ http://claw-db-chat:5432

❌ http://localhost:11434        (only works on host machine)
❌ http://127.0.0.1:4002
```

---

## Git hooks

What pre-commit, commit-msg and pre-push run — scoped to the change, never the
whole repository — is [rules/23](23-git-commits-hooks-and-release-gates.md#what-the-hooks-run).
**Never use `--no-verify`.** If a hook fails, fix the underlying issue.

---

## Port Assignments

| Service                      | Port |
| ---------------------------- | ---- |
| claw-auth-service            | 4001 |
| claw-chat-service            | 4002 |
| claw-connector-service       | 4003 |
| claw-routing-service         | 4004 |
| claw-memory-service          | 4005 |
| claw-file-service            | 4006 |
| claw-audit-service           | 4007 |
| claw-ollama-service          | 4008 |
| claw-health-service          | 4009 |
| claw-client-logs-service     | 4010 |
| claw-server-logs-service     | 4011 |
| claw-image-service           | 4012 |
| claw-file-generation-service | 4013 |
| claw-agent-service           | 4015 |
| claw-research-service        | 4016 |

Next available port: **4017**

---

## Infrastructure Checklist (run before every PR)

- [ ] All 7 compose files updated if service/DB added
- [ ] `.env.example` updated with new vars
- [ ] `.env` updated with working dev values
- [ ] `scripts/install.sh` updated
- [ ] `scripts/install.ps1` updated
- [ ] `infra/nginx/nginx.conf` updated with upstream + location
- [ ] `.github/workflows/ci.yml` updated
- [ ] `packages/shared-constants` updated
- [ ] `packages/shared-types` updated if new events
- [ ] `apps/claw-health-service` updated
- [ ] `docs/06-data/environment-variables.md` updated

## Generated artifacts are a hard gate

`.ai/**`, every workspace `AGENTS.md`, the per-model routers and the inventory
snapshot are generated; the pre-commit hook regenerates and stages them, and CI
fails on a stale one. The rule, the fix for a red CI and the ordering trap live in
one place: [rules/24](24-generated-files-and-knowledge-freshness.md#generated-artifacts-are-a-hard-gate-never-optional).

## Enforcement

- **Knowledge check** — `npm run audit:check` (the inventory snapshot) and
  `npm run knowledge:verify` (generated-layer freshness) both fail when an
  infrastructure change is not propagated.
- **CI job** — the inventory-audit and knowledge-freshness jobs in
  `.github/workflows/ai-native-os.yml`.
- **Review checklist** — the delivery checklist in `CLAUDE.md` is walked item by
  item for anything added or renamed.

## Definition of done

- [ ] Every file in the delivery checklist that the change touches was updated.
- [ ] `audit:check` and `knowledge:verify` pass.
- [ ] The change is present in every compose file and CI job that must know about it.
