---
name: add-a-new-service
summary: The complete, ordered, checkable list of every place a new backend service must be added, with a command to verify each, a production .env section and a done-check.
task_keywords:
  [
    new service,
    add service,
    new microservice,
    new backend service,
    service checklist,
    wire service,
    service port,
    new database,
    production env,
    prod env,
    compose files,
    nginx route,
    tls hosts,
    health service,
    ci matrix,
    coverage thresholds,
    installers,
  ]
applies_to: [backend, infra, apps/claw-<service>-service]
required_rules: [02-backend-rules, 05-infra-rules, 08-security-rules, 63-docs-move-with-code]
required_context: [service-catalog, port-and-service-map, environment-ownership-map]
affected_workspaces:
  [
    apps/claw-<service>-service,
    packages/shared-constants,
    packages/shared-types,
    apps/claw-health-service,
    apps/claw-auth-service,
    apps/claw-frontend,
  ]
required_docs: [docs/04-backend/service-guide-<service>.md, docs/04-backend/services-index.md]
validation_lane: the hooks gate the change for its type (rules/23 gate matrix); then the prod env check on the server
---

# Skill: Add a new service (every place, in order)

**Use when:** a new `apps/claw-<name>-service` is created. This is the master list.
[`create-microservice.md`](create-microservice.md) says whether a service is justified and how to
write its code; [`02-service-scaffold.md`](02-service-scaffold.md) has the copy-paste snippets. This
file is the part that gets forgotten: every file outside the service's own folder that must know it
exists. A half-wired service compiles, then fails at the seam that was skipped
([memory/deployment-lessons.md](../memory/deployment-lessons.md)).

Worked example: `plugin-service` (port 4021, database `claw_plugin`, route `/api/v1/plugins`,
secret `PLUGIN_ENCRYPTION_KEY`, ADR-171). Reference services for a service with its own database:
`thread-generation-service` and `threads-service`.

Below, `<name>` is the short name (`plugin`), `<NAME>` its upper-case form (`PLUGIN`), `<PORT>` the new
port. Work top to bottom and tick each box in the QA evidence record.

## 0. Find every place mechanically (do this first and last)

The reference service is the answer key: every file that names it should name the new service too,
unless this list says otherwise.

```bash
REF='thread-generation|THREAD_GENERATION|pg-thread-generation'
NEW='<name>-service|<NAME>_SERVICE|pg-<name>|PG_<NAME>|<NAME>_DATABASE_URL|claw_<name>'
EXCL=':!docs/changes :!docs/qa-evidence :!docs/superpowers :!docs/features :!.ai :!package-lock.json'

# files naming the reference but not the new service (read the list, decide each)
git grep -lIE "$REF" -- . $EXCL ':!apps/claw-thread-generation-service' | sort > /tmp/ref.txt
git grep -lIE "$NEW" -- . $EXCL ':!apps/claw-<name>-service' | sort > /tmp/new.txt
comm -23 /tmp/ref.txt /tmp/new.txt
```

Second reference for a service whose only database and secret are not special: repeat with
`payment-service|PAYMENT_SERVICE|pg-payments`. A file in the output that is a historical record
(`docs/13-adr/adr-1xx-*`, `docs/changes`, `docs/qa-evidence`) needs nothing; anything else is a gap.

## 1. The service itself

- [ ] `apps/claw-<name>-service` with `package.json` (name `claw-<name>-service`, scripts `lint`,
      `lint:strict`, `typecheck`, `test`, `build`, `migrate`), `tsconfig*.json`, `nest-cli.json`,
      `eslint.config.mjs`, `vitest.config.ts` (with `coverage.thresholds`), `prisma/` + `prisma.config.ts`,
      `Dockerfile`, `Dockerfile.dev`, `docker-entrypoint.dev.sh`.
- [ ] Layering per rules/02: controller 3 lines, service, manager, repository; Zod-validated config
      (never raw `process.env`); `GET /api/v1/health`; HTTPS via `resolveHttpsOptions()`; ESM (no
      `__dirname` in `main.ts`).
- [ ] Both Dockerfiles build every `@claw/shared-*` package the service depends on (a missed package runs
      the host's stale `dist`). Enforced by `tools/__tests__/dockerfile-shared-package-completeness.test.mjs`.
- [ ] First migration is additive and idempotent, and a fresh database gets every table (no migration, no
      tables: rule 52).
- [ ] Workspace `CLAUDE.md` (what it owns, constraints that bite) and, if the reference has one, `README.md`.
      `AGENTS.md` is generated.
- [ ] Spec for every behaviour; one spec file per unit.

```bash
ls apps/claw-<name>-service/{package.json,Dockerfile,Dockerfile.dev,docker-entrypoint.dev.sh,CLAUDE.md}
node tools/affected/index.mjs list   # the new workspace appears
```

## 2. Shared packages

- [ ] `packages/shared-constants/src/index.ts`: `<NAME>_SERVICE_PORT` and `<NAME>_SERVICE` name constant,
      plus a line in `index.spec.ts`. Bump the package version and rebuild every dependent.
- [ ] `packages/shared-types`: new event patterns (`events/event-patterns.ts`, `events/index.ts`), new
      enums, new `Permission` members (section 13).
- [ ] The service declares the `@claw/shared-*` packages it uses in its `package.json`.

```bash
git grep -n "<NAME>_SERVICE" packages/shared-constants/src
```

## 3. Compose files (same commit, all of them)

- [ ] `docker/docker-compose.dev.databases.yml` and `docker/docker-compose.prod.databases.yml`: a
      `pg-<name>` service (container `claw-pg-<name>`, health check `pg_isready`, host port from
      `PG_<NAME>_PORT`) and its `pg-<name>-data` volume in the `volumes:` block of each file.
- [ ] `docker/docker-compose.dev.services.yml`: the service with `Dockerfile.dev`, the source bind mounts
      its siblings have, `depends_on` its database, the `certs` mount, an HTTPS health check, and the
      `<NAME>_DATABASE_URL`.
- [ ] `docker/docker-compose.prod.services.yml`: the service with `Dockerfile`, `127.0.0.1:<PORT>:<PORT>`
      (never a public bind), `depends_on` its database, health check, same environment.
- [ ] Ollama files (`docker-compose.{dev,prod}.ollama*.yml`) and GPU overlays
      (`docker-compose.{dev,prod}.gpu-*.yml`) only when the service needs them. Say so in the evidence record.
- [ ] `scripts/claw.sh`: the database volume list and the warning text of `reset:credentials` (it wipes
      credential-bearing volumes, so a database missing from the list keeps its old password).
- [ ] `tools/__tests__/threads-compose-healthcheck.test.mjs`: add the service to `serviceDefinitions`.

```bash
git grep -c "<name>-service" docker/*.yml
git grep -c "pg-<name>" docker/*.yml
git grep -n "pg-<name>-data" docker/*.yml
docker compose --env-file .env -f docker/docker-compose.prod.databases.yml -f docker/docker-compose.prod.services.yml config --quiet
```

## 4. nginx (internal edge and distributed edge)

- [ ] `infra/nginx/locations.conf`: a `location /api/v1/<route>` with a `set $<name>_backend
https://<name>-service:<PORT>;` variable (dynamic DNS). SSE routes get the SSE block and go BEFORE the
      generic prefix. Internal service-to-service routes live under `/api/v1/internal/` and are never routed.
- [ ] `infra/nginx/nginx.distributed.conf.template` and `infra/nginx/.env.distributed.example`
      (`CLAW_<NAME>_ORIGIN`): the same route for the Vercel/distributed edge.
- [ ] A routing test (`tools/__tests__/<name>-nginx-routing.test.mjs`) proving the route reaches the service
      in both edge configs.
- [ ] A prefix that overlaps an older location (for example under `/api/v1/routing/`) is checked for
      first-match order.
- [ ] Docs: `docs/08-runtime-devops/nginx-reference.md`, `nginx-routing-reference.md`, `wiki/Nginx-Routing.md`.

```bash
git grep -n "<name>_backend\|<name>-service" infra/nginx
docker exec claw-nginx nginx -t    # after a restart (not a reload) of nginx
```

## 5. TLS hosts

- [ ] `scripts/install-tls.sh` and `scripts/install-tls.ps1`: append `<name>-service` to the `HOSTS` array,
      then re-run `install-tls` on every machine (the mkcert leaf SAN is what makes inter-service HTTPS verify).
- [ ] No script may disable TLS validation (rules/21).

```bash
git grep -n "<name>-service" scripts/install-tls.sh scripts/install-tls.ps1
```

## 6. Environment, installers, secrets

- [ ] `.env.example`: `<NAME>_SERVICE_URL`, `<NAME>_DATABASE_URL`, `PG_<NAME>_USER|PASSWORD|DB|PORT`, and any
      bootstrap secret. Placeholder values only. Config that an admin may change belongs in a DB table
      (a `*Setting` model plus an idempotent seeder), not in env.
- [ ] `scripts/install.sh` and `scripts/install.ps1`: a generated password for `PG_<NAME>_PASSWORD`; the
      secret generated with a CSPRNG and **preserved from an existing `.env`** (re-running the installer must
      not rotate a key that encrypts stored rows); the URL block; the `<NAME>_DATABASE_URL` that uses the same
      password.
- [ ] Local `.env` (never committed) gets a working dev value.
- [ ] The service's Zod `AppConfig` validates every variable; a key is checked at boot (length, not all zeros).
- [ ] `docs/06-data/environment-variables.md` (and `-complete.md` when the group is new),
      `docs/08-runtime-devops/secrets-management.md` for a new secret, `context/environment-ownership-map.md`.

```bash
git grep -n "<NAME>_" .env.example scripts/install.sh scripts/install.ps1 docker/docker-compose.prod.services.yml
git grep -n "PG_<NAME>_PASSWORD" scripts docker
```

## 7. Production `.env` (the part that takes production down when forgotten)

The live stack reads `/srv/clawai/.env`, written by the installer before this service existed. The
deploy builds and recreates application services only: it never starts databases and never invents
secrets. A service whose variables or database are missing fails its health check and the rollout rolls back.

- [ ] `scripts/prod-required-env.manifest`: one rule per line, `service|VARIABLE|kind|argument`.
      Kinds: `hex64` (AES-256 key), `password` (24+ characters, not `claw_secret`), `derived` (a URL built from
      other variables, for example `postgresql://claw:{PG_<NAME>_PASSWORD}@pg-<name>:5432/claw_<name>?schema=public`),
      `database` (container that must already be healthy: `claw-pg-<name>`). Values are never stored there.
- [ ] `scripts/ensure-prod-env.sh` reads the manifest: with `--check` it only reports; without it, it appends
      what is missing and never rewrites an existing value. The deploy preflight in `scripts/deploy-prod.sh`
      runs the target commit's own `ensure-prod-env.sh --check` and refuses to build or restart anything
      when a service in the rollout lacks its variables (names only are printed).
- [ ] Both prod compose files pass the same variables the manifest names.
- [ ] Runbook: [docs/11-runbooks/add-a-service-to-production.md](../docs/11-runbooks/add-a-service-to-production.md).
      Order on the server: check, add missing, start the database container once, deploy, verify health.
- [ ] A key that encrypts rows is generated once, backed up, and never rotated by editing `.env`.

```bash
bash scripts/ensure-prod-env.sh --env /srv/clawai/.env --check   # on the server; prints names only
git grep -n "^<name>-service|" scripts/prod-required-env.manifest
```

## 8. Health, status page, metrics

- [ ] `apps/claw-health-service/src/modules/health/constants/health.constants.ts`: `SERVICE_URLS` entry
      (`https://<name>-service:<PORT>/api/v1/health`) and its spec.
- [ ] `status-page.constants.ts`: the service in the right group for the public status page.
- [ ] Metrics: `health-service` aggregates `/api/v1/metrics`; add a Prometheus target in
      `infra/prometheus/prometheus.yml` only if the service exposes its own scrape endpoint.
- [ ] Docs: `docs/04-backend/service-guide-health.md`, `docs/12-reference/api-reference-health.md`,
      `docs/08-runtime-devops/container-health-monitoring.md`, `metrics-and-dashboards.md`.

```bash
git grep -n "<name>-service" apps/claw-health-service/src
```

## 9. CI, affected tooling, coverage, lint baseline

- [ ] CI needs no hand-edited matrix: `tools/affected/index.mjs ci-matrix` derives the static, test and
      merge matrices (and shards) from the workspaces, and the `setup` job builds shared packages. Confirm
      the workspace appears in each.
- [ ] `tools/coverage/thresholds.json`: the service has an entry in BOTH sections (line/branch floors and the
      per-file floor). Run `node tools/coverage/thresholds.mjs sync`, measure with `npm run coverage:measure`
      and raise with `npm run coverage:raise-floors`.
- [ ] `tools/lint/warnings-baseline.json`: only legacy debt. A new service starts at zero warnings.
- [ ] Test env for the service in `.github/workflows/ci.yml` only if its tests need a real variable.

```bash
node tools/affected/index.mjs ci-matrix --full | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(s.includes('claw-<name>-service')))"
git grep -n "claw-<name>-service" tools/coverage/thresholds.json
```

## 10. Release and deploy

- [ ] `scripts/deploy-prod.sh` derives its service catalogue from `docker/docker-compose.prod.services.yml`
      (never hand-listed): the service and its Dockerfile are picked up, and a change under
      `apps/claw-<name>-service` rebuilds only it. Confirm the prod compose block has `build.dockerfile`.
- [ ] A change to a shared package the service uses redeploys it (the dependency graph in
      `.ai/manifests/workspace-dependency-graph.json` is regenerated).
- [ ] `tools/__tests__/deploy-prod*.mjs` and `affected-ci` tests pass; extend them only if the service has a
      new kind of deploy input.
- [ ] Database containers are NOT started by the deploy: section 7, step "start the database once".
- [ ] Release notes and `docs/changes/<date>-<slug>.md`.

## 11. Auth, permissions, plan columns, quota (only if users reach it)

- [ ] New `Permission` members in `packages/shared-types/src/enums/permission.enum.ts`, seeded in
      `apps/claw-auth-service/prisma/seed-permissions.cjs` and mapped in `rbac.constants.ts` (+ spec).
      Document them in `context/permission-map.md`.
- [ ] Plan columns / entitlements (`allow<Feature>`, `max<Feature>`; `null` = unlimited, `0` = disabled) and the
      plan seeder; a metered feature adds a `PlanFeatureKey` and migration in auth-service.
- [ ] The service has its OWN `AuthGuard` (most services do) and enforces revoked sessions (ADR-112).
- [ ] `user.deleted` consumer if it stores personal data (skills/propagate-account-deletion.md).

## 12. Events

- [ ] Publish and consume only through `@claw/shared-rabbitmq` with patterns from `shared-types`; every
      consumer idempotent with a dead-letter path ([rules/17](../rules/17-rabbitmq-events-and-jobs.md)).
- [ ] `context/event-flow-map.md` (the `log.server` producer list and the fan-in table).

## 13. Frontend and i18n (only if there is UI)

- [ ] Repository, query keys and hooks in `claw-frontend`; TSX files contain components only.
- [ ] Every user-facing string in all 13 locales with real translations and typed key maps (no template-literal keys).
- [ ] Routes in the sidebar/permissions gates and a route test.

## 14. Docs, rules, context, wiki (rule 63: in the same change)

- [ ] `apps/claw-<name>-service/CLAUDE.md`; `docs/04-backend/service-guide-<name>.md`;
      `docs/04-backend/services-index.md` (next row); an ADR addendum or a new ADR number for the decision
      (`docs/13-adr/adr-index.md`).
- [ ] `context/`: `service-catalog.md`, `port-and-service-map.md`, `workspace-map.md`,
      `database-ownership-map.md`, `architecture-map.md` (count and port range), `event-flow-map.md`,
      `permission-map.md`, `environment-ownership-map.md`, `codebase-navigation.md`, `task-router.md`,
      `testing-map.md`, `load-bearing-facts.md` for any fact that surprises.
- [ ] `docs/03-architecture` (system-architecture, system-overview, end-to-end-data-flow, data-ownership,
      event-bus), `docs/06-data` (environment-variables, database-reference), `docs/08-runtime-devops`
      (docker-guide, docker-compose-reference, tls-setup, nginx-reference, ci-cd-pipeline, secrets-management),
      `docs/PRODUCTION_DEPLOYMENT.md`, `docs/00-start-here` (installation, system-at-a-glance),
      `docs/12-reference`, `docs/11-runbooks`, `docs/16-quality-engineering` checklists.
- [ ] Root `README.md` (service table, diagram, tree, port range), `CLAUDE.md`/`AGENTS.md`/model routers
      (generated: run the knowledge build), `.github/CONTRIBUTING.md` and `agents/*.md` counts
      (the `count:services` fragments are rewritten by the build), `QA-WORKFLOW.md` if lanes change.
- [ ] `wiki/` (Service-Catalog, Repository-Map, Testing-and-QA, Workspaces-and-Packages, Nginx-Routing,
      `mirrors.json` for the service guide).
- [ ] `memory/` lesson if something bit, and update `memory/README.md` counts.
- [ ] This skill: add anything this change found that was not here.

```bash
# Hand-written counts that went stale: search for the previous count, for example 20 services
git grep -nE '20 (NestJS |backend )?(services|microservices)' -- '*.md' ':!docs/13-adr' ':!docs/changes'
```

## 15. Generated files

- [ ] `npm run knowledge:build` regenerates `.ai/**`, the workspace `AGENTS.md`, per-model routers, the wiki
      inputs and the `count:` fragments; `npm run knowledge:verify` must pass (links, docs checks, counts).
      The pre-commit hook does this and stages the result; run it first so the diff is yours to review.
- [ ] Coverage of knowledge: `npm run knowledge:coverage`.

## 16. Landing it

- [ ] Fresh worktree: `npm ci`, `npm run affected:shared-build`, `npm run prisma:generate --workspaces --if-present`.
- [ ] One QA evidence record (`npm run qa:evidence:new`, then `npm run qa:evidence:check`): infra lanes
      PASS with the commands above, N/A lanes stated.
- [ ] `git add <explicit paths>`, `git commit` with a `Docs:` trailer, `git push`; read GitHub CI to green.
- [ ] After the deploy: container healthy, health service `ok`, public route status, `/api/v1/internal/*` is 404.

## Verification script idea (text only, not built)

A root test could compute, for the newest service, the set of files that name the reference service
(section 0) and fail when a non-historical file names the reference but not the new service, with an allowlist
for intentional exceptions. The ripgrep patterns above are the whole algorithm.

## Failure modes seen

- Database added to one compose file only: `container not found` on deploy.
- TLS host missing: the new service's callers fail with a hostname mismatch.
- Prod `.env` lacks the secret or password: health check fails, rollout rolls back (section 7).
- URL password differs from the volume's password: connection refused after a clean install.
- Installer regenerated the encryption key: every stored credential is orphaned (preserve it).
- nginx reloaded instead of restarted after a bind-mounted config change: stale route.
- Dockerfile missing a `@claw/shared-*` build: the host's stale `dist` runs.
