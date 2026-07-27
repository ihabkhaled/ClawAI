# ClawAI — Infrastructure Rules

> Docker, Nginx, CI/CD, environment variables, shared packages.

---

## The 7 Compose Files Rule

**Every new service and every new database MUST be added to ALL 7 compose files in the same commit.**

| File                                                               | Purpose                           |
| ------------------------------------------------------------------ | --------------------------------- |
| `docker-compose.dev.yml`                                           | Dev all-in-one (services + DBs)   |
| `docker-compose.yml`                                               | Prod all-in-one (services + DBs)  |
| `docker-compose.dev.databases.yml`                                 | Dev split: databases only         |
| `docker-compose.dev.services.yml`                                  | Dev split: services only          |
| `docker-compose.prod.databases.yml`                                | Prod split: databases only        |
| `docker-compose.prod.services.yml`                                 | Prod split: services only         |
| `docker-compose.dev.ollama.yml` / `docker-compose.prod.ollama.yml` | Only if service depends on Ollama |

**Databases** → add to: dev.yml, prod.yml, dev.databases.yml, prod.databases.yml
**Services** → add to: dev.yml, prod.yml, dev.services.yml, prod.services.yml
**Volumes** → declare in EVERY file that defines the corresponding service or database

**Violation**: A service in 1 of 7 files is broken in split-file deployments. This has caused production incidents.

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

4. **Lint / Typecheck / Test matrix include** — every new service goes into the matrix `include:` block of all four jobs (lint, typecheck, test, build) with `service`, `workspace`, and `prisma: true|false` keys.

### ⚠️ New shared package = CI workflow update (added 2026-04-26)

When a new package is added under `packages/`, **all four jobs** in `.github/workflows/ci.yml` (lint, typecheck, test, build) have a "Build shared packages" step that compiles each package's `dist/` before service typecheck runs. This step MUST include the new package, otherwise consumer services fail with `Cannot find module '@claw/<new-package>'` even though the package is in `package-lock.json`.

```yaml
- name: Link tsgo binary (@typescript/native-preview)
  run: npm rebuild @typescript/native-preview
- name: Build shared packages
  run: |
    cd packages/shared-types && npx tsgo -p tsconfig.build.json
    cd ../shared-constants && npx tsgo -p tsconfig.build.json
    cd ../shared-utilities && npx tsgo -p tsconfig.build.json
    cd ../shared-rabbitmq && npx tsgo -p tsconfig.build.json
    cd ../shared-auth && npx tsgo -p tsconfig.build.json
    cd ../shared-entitlements && npx tsgo -p tsconfig.build.json
    cd ../<new-shared-package> && npx tsgo -p tsconfig.build.json   # MUST add for any new shared package
```

> The repo compiles with **tsgo** (`@typescript/native-preview`), not `tsc` /
> `nest build`. The `npm rebuild @typescript/native-preview` step links the
> native binary after `npm ci --ignore-scripts`. Full toolchain reference:
> [docs/08-runtime-devops/build-system.md](../docs/08-runtime-devops/build-system.md).

**Why it bites:** local builds work because `node_modules/@claw/<pkg>` is a symlink populated by `npm install`, and `dist/` is created by the developer's local `npm run build`. CI starts from a fresh checkout where `dist/` doesn't exist — so `require('@claw/<new-pkg>')` resolves to a `main` path that doesn't exist on disk yet.

**Verification rule:** after adding a new shared package, push to a feature branch and confirm all four CI jobs go green BEFORE merging to main.

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

## Pre-commit Hook (Never Skip)

The pre-commit hook runs 5 steps:

1. `prettier --write` — format staged files
2. `npm run lint` — ESLint all workspaces (0 errors)
3. `npm run typecheck` — TypeScript strict (0 errors)
4. `npm run build` — production build all workspaces
5. `npm run test` — all tests pass

**NEVER use `--no-verify`.** If hook fails, fix the underlying issue.

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

## Generated artifacts are a HARD GATE (never optional)

`.ai/**`, every workspace `AGENTS.md`, and
`docs/features/ai-native-engineering-os/inventory.snapshot.json` are
**generated from the tree**. CI verifies them on every push:

| CI job              | Command                    | Fails when                                                           |
| ------------------- | -------------------------- | -------------------------------------------------------------------- |
| Knowledge freshness | `npm run knowledge:check`  | a generated file's hash no longer matches the tree                   |
| Knowledge integrity | `npm run knowledge:verify` | stale file, broken link, orphan reviewer, hook-bypass, contradiction |
| Inventory audit     | `npm run audit:check`      | the inventory snapshot hash has drifted                              |

**A stale artifact turns the build red on every subsequent push**, for everyone,
until someone regenerates it. It is not a warning and it is not deferrable.

### The rule

Any commit that touches `packages/**`, `apps/**`, `infra/**`, `docker/**`,
`docs/**`, `scripts/**`, `rules/**`, `skills/**`, `tools/**` or `.env.example`
MUST regenerate and stage:

```bash
npm run knowledge:build      # rewrites .ai/** + workspace AGENTS.md
npm run audit                # rewrites the inventory snapshot
git add .ai docs/features/ai-native-engineering-os/inventory.snapshot.json
git add apps/*/AGENTS.md packages/*/AGENTS.md 2>/dev/null
npm run knowledge:verify     # what CI runs
npm run audit:check          # what CI runs
```

The pre-commit hook now does all of this **automatically**, so in normal use
there is nothing to remember. The rule is written down because the hook can be
skipped (it must not be) and because a red CI needs a documented fix.

### Order matters — regenerate AFTER formatting, never before

This is the mistake that actually caused a red build:

1. `npm run knowledge:build` — hashes the current bytes
2. `git add` / commit — **lint-staged reformats the staged files**
3. the reformatted bytes no longer match the hashes recorded in step 1
4. `knowledge:check` passes locally (it ran before the reformat) but
   `knowledge:verify` fails in CI

Generators must run **after** prettier and `eslint --fix` have settled. The
pre-commit hook is ordered that way deliberately: lint-staged is step 1,
regeneration is step 2.

### Never hand-edit a generated artifact

If a generated file is wrong, fix the **generator or its input**, then
regenerate. Editing `.ai/manifests/*.json` or a workspace `AGENTS.md` by hand is
overwritten on the next build and hides the real problem.
