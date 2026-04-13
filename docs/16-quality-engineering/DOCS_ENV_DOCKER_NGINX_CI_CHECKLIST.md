# Docs, Env, Docker, Nginx, and CI Completeness Checklist

> A feature is incomplete until every item on this checklist is done.
> Code that passes all tests but ships with missing environment variables,
> broken Docker config, or an unregistered Nginx route is not shipped — it is broken.

---

## Purpose

In a system with 13 microservices, 4 Docker Compose files, an Nginx reverse proxy, 9 PostgreSQL databases, RabbitMQ, Redis, Ollama, a CI/CD pipeline, 8 i18n locales, and a shared monorepo — every structural change has ripple effects. This checklist ensures none of them are missed.

**This checklist is derived from the 18-item mandatory update list in root `CLAUDE.md`.** It adds exact verification steps, severity ratings, and historical failure patterns for each item.

**Rule:** Every item must be checked for every work item. "N/A" is a valid answer — but it must be asserted, not assumed. If you cannot quickly determine whether an item applies, assume it does and verify.

---

## THE CHECKLIST

---

### Item 1: `.env.example`

**WHAT:** The template environment file at the repo root. Lists every environment variable with placeholder values.

**WHEN:** Any time an environment variable is added, removed, or renamed.

**HOW TO VERIFY:**

```bash
# Every variable in .env must appear in .env.example
# Every variable in .env.example must have a non-empty placeholder value
diff <(grep -oP '^[A-Z_]+(?==)' .env | sort) <(grep -oP '^[A-Z_]+(?==)' .env.example | sort)
# Output must be empty (no diff)
```

**SEVERITY IF MISSED:** New developer or CI environment cannot set up the variable. CI may fail silently with undefined config. Zod AppConfig validation throws `ZodError` on service start with a cryptic message.

**Common mistake:** Adding the variable to `.env` but forgetting `.env.example`, then committing. The next person to clone the repo has no idea the variable exists.

---

### Item 2: `.env` (Dev Values)

**WHAT:** The actual environment file (gitignored). Must contain a working dev value for every variable.

**WHEN:** Any time a new variable is added to `.env.example`.

**HOW TO VERIFY:**

```bash
# Every variable in .env.example must exist in .env with a non-empty value
# Check manually: open .env and confirm the new var has a real value
grep 'NEW_VARIABLE_NAME' .env
# Must return: NEW_VARIABLE_NAME=<some-dev-value>
```

**SEVERITY IF MISSED:** Service fails to start in dev with Zod AppConfig validation error. Every developer who pulls the branch must manually add the variable before running.

**Common mistake:** Forgetting to add the variable to `.env` after adding it to `.env.example`. The `install.sh` / `install.ps1` scripts generate `.env` from templates — but if you are working in an already-running dev environment, you must add the variable manually.

---

### Item 3: `scripts/install.sh`

**WHAT:** The automated setup script for Linux/macOS. Generates the `.env` file from a template block inside the script.

**WHEN:** Any time an environment variable is added or removed.

**HOW TO VERIFY:**

```bash
grep 'NEW_VARIABLE_NAME' scripts/install.sh
# Must return the variable in the .env generation block
```

**SEVERITY IF MISSED:** Fresh Linux/macOS installs via `install.sh` will be missing the variable. The generated `.env` is incomplete. Zod AppConfig throws on service start.

**Common mistake:** Updating `.env` and `.env.example` but not the install scripts, then the next fresh deployment breaks.

---

### Item 4: `scripts/install.ps1`

**WHAT:** The automated setup script for Windows PowerShell. Same as `install.sh` but for Windows.

**WHEN:** Same as Item 3.

**HOW TO VERIFY:**

```powershell
Select-String -Path 'scripts/install.ps1' -Pattern 'NEW_VARIABLE_NAME'
# Must return a match in the .env generation block
```

**SEVERITY IF MISSED:** Fresh Windows installs via `install.ps1` will be missing the variable. Since the project targets engineers on Windows 11 (this repo runs on Win32/bash), this is a first-line setup script.

---

### Item 5: `docker-compose.dev.yml`

**WHAT:** The primary development Docker Compose file. Defines all 22 dev containers.

**WHEN:**

- New service added → add service block with: image/build, ports, env_file, depends_on, healthcheck.
- New database added → add postgres/mongo service block.
- New volume added → add to volumes section.
- New port exposed → add to ports section.
- New env variable needed inside container → add to `environment:` if it differs from .env defaults.

**HOW TO VERIFY:**

```bash
# New service starts and is healthy
docker compose -f docker-compose.dev.yml up -d <new-service>
docker compose -f docker-compose.dev.yml ps <new-service>
# STATUS column must show: (healthy)

# New service logs show no startup errors
docker compose -f docker-compose.dev.yml logs <new-service> --tail 30
```

**SEVERITY IF MISSED:** Service does not run in dev. Other services that depend on it fail. The entire feature is untestable in the dev environment.

**Common mistake for new services:** Forgetting `depends_on` for the database container. The service starts before the DB is ready and Prisma fails to connect.

---

### Item 6: `docker-compose.yml` (Production)

**WHAT:** The production Docker Compose file. Mirrors `docker-compose.dev.yml` but with production image references and no dev-only settings.

**WHEN:** Same triggers as Item 5.

**HOW TO VERIFY:**

```bash
docker compose -f docker-compose.yml config --quiet
# Must exit 0 (valid compose config)
# Inspect new service block matches dev config (minus dev-only settings)
```

**SEVERITY IF MISSED:** Production deployment missing the service. The feature that works in dev does not exist in prod. First production deployment after the feature ships will break.

**Common mistake:** Updating only `docker-compose.dev.yml` and shipping. Production deployment then has a different service topology from dev.

---

### Item 7: `docker-compose.dev.ollama.yml`

**WHAT:** The dev Compose file that adds the Ollama AI runtime (port 11434) and related model containers.

**WHEN:** Any change that affects:

- Auto-pulled models (`AUTO_PULL_MODELS` env var)
- Ollama service configuration
- New AI runtime dependency (e.g., ComfyUI for image generation)
- New model roles that require Ollama to be running

**HOW TO VERIFY:**

```bash
grep 'AUTO_PULL_MODELS\|ollama\|comfyui' docker-compose.dev.ollama.yml
# Verify the new model or variable is present if applicable
```

**SEVERITY IF MISSED:** Developers using the Ollama-enabled dev environment miss the new model or configuration. Routing tests that depend on specific models fail silently.

---

### Item 8: `docker-compose.prod.ollama.yml`

**WHAT:** The production variant of the Ollama Compose file.

**WHEN:** Same triggers as Item 7.

**HOW TO VERIFY:** Same as Item 7 with the prod file.

**SEVERITY IF MISSED:** Production Ollama deployment does not include the new model or configuration. Auto-routing that depends on the new model fails in production.

---

### Item 9: `infra/nginx/nginx.conf`

**WHAT:** The Nginx reverse proxy configuration. Routes all traffic from port 4000 to the 13 backend services.

**WHEN:**

- New API endpoint path that is not covered by an existing location block.
- New service added (needs both upstream block and location block).
- SSE endpoint added (needs special proxy settings).
- Service port changed (upstream server address must update).

**HOW TO VERIFY:**

```bash
# Test Nginx config syntax
docker compose -f docker-compose.dev.yml exec nginx nginx -t
# Must return: configuration file /etc/nginx/nginx.conf test is successful

# Test the new route from outside the container
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1/<new-path>/health
# Must NOT return 404 (which means no location block matched)
```

**SSE Route Requirements (mandatory for any SSE endpoint):**

```nginx
location /api/v1/routing/replay/stream/ {
  proxy_pass http://routing_upstream;
  proxy_http_version 1.1;
  proxy_set_header Connection "";
  proxy_read_timeout 86400;
  proxy_buffering off;
  proxy_cache off;
}
```

**SEVERITY IF MISSED:**

- Missing location block → frontend gets 404 for all calls to the new endpoint.
- SSE without `proxy_buffering off` → events are buffered by Nginx and never reach the browser; the frontend shows "AI is thinking..." forever.
- Wrong location block order → a more-general block catches the request before the specific one (test by hitting the endpoint from outside the container, not inside the service network).

**Common mistake:** Adding a new service's API path that starts with `/api/v1/routing/` without checking whether the existing `/api/v1/routing/` location block already covers it. The new path may already be routed correctly — verify before adding a duplicate block.

---

### Item 10: `apps/claw-health-service`

**WHAT:** The health aggregation service (port 4009). It calls every other service's health endpoint and returns a consolidated status.

**WHEN:** A new backend service is added.

**HOW TO VERIFY:**

```bash
# Check the health check URL list in claw-health-service
grep 'NEW_SERVICE_URL\|new-service' apps/claw-health-service/src/**/*.ts
# Must return the new service's health check URL in the services list

# Verify health endpoint includes the new service
curl -s http://localhost:4009/api/v1/health | jq '.services["new-service-name"]'
# Must return a health status object, not null
```

**SEVERITY IF MISSED:** The new service is invisible to the health dashboard. Operators cannot see if the service is down. If the health check is used by Docker (it should be), container orchestration cannot correctly restart the service.

---

### Item 11: `packages/shared-constants`

**WHAT:** The shared constants package consumed by all 13 services. Contains service port numbers, service names, exchange names, API prefix, and pagination defaults.

**WHEN:**

- New service added → add `SERVICE_PORTS.<name>` and `SERVICE_NAMES.<name>`.
- Service port changes → update `SERVICE_PORTS`.
- New globally-used constant added.

**HOW TO VERIFY:**

```bash
grep 'NEW_SERVICE_NAME\|NEW_PORT' packages/shared-constants/src/index.ts
# Must return the new constant

# After adding, rebuild the package and verify dependents compile
npm run build --workspace=packages/shared-constants
npm run typecheck --workspace=apps/claw-routing-service
# (and any other service that imports the new constant)
```

**SEVERITY IF MISSED:** Services that reference the new constant fail TypeScript compilation. Port numbers are hardcoded in service configs instead of using constants, creating a maintenance burden when ports change.

---

### Item 12: `packages/shared-types`

**WHAT:** The shared types package containing event patterns, auth types, and enums used across services.

**WHEN:**

- New RabbitMQ event pattern added.
- New cross-service enum added.
- New event payload type added.

**HOW TO VERIFY:**

```bash
grep 'NEW_EVENT_PATTERN\|NewEventPayload' packages/shared-types/src/index.ts
# Must return the new type/pattern

# Verify all consumers that depend on the event compile after the change
npm run typecheck
# Must return 0 errors across all workspaces
```

**SEVERITY IF MISSED:**

- Event pattern not in shared-types → teams hardcode string literals for event names → typos cause silent event delivery failures (message published to wrong routing key; no consumer receives it; no error thrown).
- Missing payload type → consumers use `any` for the event payload → type safety is lost across the event boundary.

**Critical rule:** Event pattern names are NEVER string literals in service code. Always use the enum from `shared-types`. This is how you catch a renamed event at compile time instead of at 3am when messages stop flowing.

---

### Item 13: `.github/workflows/ci.yml`

**WHAT:** The GitHub Actions CI pipeline. Runs lint, typecheck, test, and build for all workspaces.

**WHEN:**

- New service added → add to the Prisma generate loop and to the test environment variables section.
- New environment variable required for tests → add to the `env:` section of the test job.
- New service has its own test suite → ensure the test job runs it.

**HOW TO VERIFY:**

```bash
# Check the Prisma generate loop
grep 'NEW_SERVICE_NAME\|claw-new-service' .github/workflows/ci.yml
# Must appear in the prisma generate step and test env vars

# Verify CI passes locally by running the same commands
npm run lint
npm run typecheck
npm run test
npm run build
```

**SEVERITY IF MISSED:**

- New service's Prisma client is not generated in CI → `import { PrismaClient }` fails in the test job → CI fails with `Cannot find module '@prisma/client'`.
- Missing test env vars → service config Zod validation fails during `npm run test` in CI → all tests in that service are skipped or throw setup errors.

**Common mistake:** Adding a new service with its own PostgreSQL database but not adding the `<SERVICE>_DATABASE_URL` to the CI env vars. The service test setup throws `ZodError: DATABASE_URL is required` in every test.

---

### Item 14: Prisma Migrations

**WHAT:** Database schema migrations for each service's PostgreSQL database.

**WHEN:** Any Prisma schema (`prisma/schema.prisma`) change — adding/removing/modifying models, columns, relations, or indices.

**HOW TO VERIFY:**

```bash
# Run migration in dev
cd apps/claw-routing-service
npx prisma migrate dev --name add_replay_run_table

# Verify migration file was created
ls prisma/migrations/
# New migration folder with timestamp must appear

# Verify the migration applies cleanly in a fresh container
docker compose -f docker-compose.dev.yml restart claw-routing-service
docker compose -f docker-compose.dev.yml logs claw-routing-service --tail 20
# Must show: "All migrations have been successfully applied."

# Verify Prisma client was regenerated
npx prisma generate
npm run typecheck --workspace=apps/claw-routing-service
# Must return 0 errors
```

**SEVERITY IF MISSED:**

- Schema change without migration → `PrismaClientKnownRequestError: The column 'new_column' does not exist` in production.
- Migration file not committed → other developers and CI/CD pipelines have a schema mismatch between `schema.prisma` and the actual database.
- Migration not applied in Docker entrypoint → container starts with stale schema → runtime errors on first DB write.

**Migration naming convention:** Use descriptive snake_case names.

```bash
# GOOD
npx prisma migrate dev --name add_replay_run_and_case_tables
npx prisma migrate dev --name add_confidence_score_to_routing_decision
npx prisma migrate dev --name remove_deprecated_routing_policy_field

# BAD
npx prisma migrate dev --name update
npx prisma migrate dev --name fix
npx prisma migrate dev --name migration1
```

---

### Item 15: Seed Files

**WHAT:** Seed scripts that populate default data required for the service to function correctly.

**WHEN:**

- New default routing policy required.
- New model catalog entry required.
- New system setting required.
- New admin user initialization required.

**HOW TO VERIFY:**

```bash
# Run the seed script for the affected service
cd apps/claw-ollama-service
npx tsx prisma/seed-catalog.ts
# Must complete without errors

# Verify the seed data was inserted
docker compose -f docker-compose.dev.yml exec claw-pg-ollama \
  psql -U $PG_OLLAMA_USER -d claw_ollama -c "SELECT name FROM catalog_models LIMIT 5;"
# Must return the new model entries
```

**SEVERITY IF MISSED:**

- New feature that requires a catalog entry or default policy fails to function immediately after deployment — the data it depends on does not exist.
- Operators have to manually insert records via psql to activate a feature, which is not acceptable for a production deployment.

---

### Item 16: All 8 i18n Locale Files

**WHAT:** The translation files at `apps/claw-frontend/src/lib/i18n/locales/{en,ar,de,es,fr,it,pt,ru}.ts`.

**WHEN:** Any new user-facing text is added in any component, hook, or page.

**HOW TO VERIFY:**

```bash
# Check that the new key exists in all 8 locale files
for lang in en ar de es fr it pt ru; do
  grep 'newTranslationKey' apps/claw-frontend/src/lib/i18n/locales/$lang.ts || echo "MISSING in $lang"
done
# Must print nothing (all found) — not a single "MISSING" line

# Verify the key is typed in i18n.types.ts
grep 'newTranslationKey' apps/claw-frontend/src/types/i18n.types.ts
# Must return the key in the type definition
```

**SEVERITY IF MISSED:**

- Missing translation in any locale → TypeScript error if the key is type-safe (correct) OR runtime `undefined` rendered to the user (incorrect — means the key is not in `i18n.types.ts`).
- Arabic locale missing → RTL users see English text in the middle of Arabic UI.
- CI typecheck fails if `i18n.types.ts` does not include the new key.

**Common mistake:** Adding the key to `en.ts` only during development, then shipping without adding to the other 7 locales. The TypeScript type system catches this only if `i18n.types.ts` is kept in sync.

**Rule for Arabic (RTL):** Arabic is a right-to-left language. When adding new layout elements alongside new translations, verify the RTL layout is correct. Use `rtl:` Tailwind prefix only for directional layout changes (flex direction, text alignment, padding/margin asymmetry).

---

### Item 17: Frontend Types (`src/types/`)

**WHAT:** The TypeScript type definitions in `apps/claw-frontend/src/types/` that mirror backend DTO and schema shapes.

**WHEN:** Any backend DTO, Prisma model, or API response shape changes.

**HOW TO VERIFY:**

```bash
# Run typecheck on the frontend workspace
npm run typecheck --workspace=apps/claw-frontend
# Must return 0 errors

# Specifically check the type file mirrors the backend DTO
# Example: if ReplayRoutingDto adds a new field 'runName',
# check that ReplayRunOptions in src/types/replay.types.ts also has 'runName'
grep 'runName' apps/claw-frontend/src/types/replay.types.ts
```

**SEVERITY IF MISSED:**

- Frontend sends a request missing the new field → backend Zod validation rejects with 400.
- Frontend receives a response with the new field but does not have it in its type → TypeScript error or runtime `undefined` in the UI.
- Type mismatch is not caught until runtime, not at compile time.

**Common mistake:** Backend adds a required field to a DTO. Frontend types are not updated. Frontend compiles fine (the field is simply absent from the request body). Backend returns 400. The error appears only at runtime in the browser.

---

### Item 18: Root `CLAUDE.md`

**WHAT:** The root architecture and engineering reference document. The mandatory read-before-act document for every engineer and AI agent working on ClawAI.

**WHEN:**

- New service added → update workspace layout, Nginx route map, event bus table, env vars section.
- New event pattern added → update event bus table.
- New Nginx route added → update the route map table.
- New env variable group added → update the environment variables section.
- New architectural pattern established → add to the relevant section.
- New routing mode or capability class added → update routing documentation.
- New endpoint added to the Replay Lab → update the endpoint table.

**HOW TO VERIFY:**

```bash
# Read through the changed sections and verify they match the implementation
# There is no automated verification — this requires human review

# Minimum: verify new service appears in workspace layout
grep 'claw-new-service' CLAUDE.md

# Verify new endpoint appears in the Nginx route map table
grep 'new-path' CLAUDE.md

# Verify new env var appears in environment variables section
grep 'NEW_VARIABLE_NAME' CLAUDE.md
```

**SEVERITY IF MISSED:** The next engineer (or AI agent) working on a related feature operates from outdated information. They may:

- Miss a new service in their impacted-area map.
- Use an old event pattern name that was renamed.
- Not know about a new environment variable that their feature needs.
- Not know about a new architectural rule that was established.

`CLAUDE.md` is not documentation — it is the operating manual. Stale documentation causes engineering errors, not just confusion.

---

## Evidence Requirements

For each item, the reviewer must confirm the following before approving a PR:

| Item                      | Evidence Required                                                |
| ------------------------- | ---------------------------------------------------------------- |
| `.env.example`            | Diff shows new variable with placeholder value                   |
| `.env`                    | Dev value confirmed present (not shown in PR — verified locally) |
| `install.sh`              | Diff shows variable in .env generation block                     |
| `install.ps1`             | Diff shows variable in .env generation block                     |
| `docker-compose.dev.yml`  | New service block present; `docker ps` shows (healthy)           |
| `docker-compose.yml`      | New service block matches dev config                             |
| `docker-compose.*.ollama` | If applicable: model/variable present                            |
| `nginx.conf`              | `nginx -t` passes; endpoint returns non-404 from port 4000       |
| Health service            | `/api/v1/health` response includes new service                   |
| `shared-constants`        | `npm run typecheck` 0 errors; new constant visible in diff       |
| `shared-types`            | `npm run typecheck` 0 errors; new type/pattern visible in diff   |
| `ci.yml`                  | CI pipeline green; new service in Prisma generate step           |
| Prisma migration          | Migration file in diff; migration applies on fresh container     |
| Seed files                | Seed runs without error; data visible in DB via psql             |
| i18n (all 8)              | All 8 locale files in diff; `npm run typecheck` 0 errors         |
| Frontend types            | `npm run typecheck` 0 errors on frontend workspace               |
| Root `CLAUDE.md`          | New service/endpoint/var/pattern visible in diff                 |

---

## Common Missed Items (Historical Failure Patterns)

These are the items most frequently missed in ClawAI development. Treat them as high-attention checkpoints:

1. **i18n: added English key, forgot 7 others.** Caught by TypeScript only if `i18n.types.ts` is maintained. Always update all 8 at once.

2. **Prisma migration committed but not the migration file.** Running `prisma migrate dev` generates the file locally but it must be committed. Check `git status` for `prisma/migrations/`.

3. **New env variable in service code but not in `docker-compose.dev.yml` `environment:` block.** The service reads from `.env` via `env_file:` but some variables need explicit override. Confirm with `docker compose config` that the variable resolves.

4. **Frontend type not updated when backend DTO field added.** The API call compiles but the new field is missing. Add a TypeScript test that exercises the full request/response type.

5. **Nginx route missing for new endpoint prefix.** The existing route block covers `/api/v1/routing/` but the new endpoint is at `/api/v1/routing/replay/runs/compare` — it may or may not be covered. Always test with `curl` through port 4000.

6. **Seed file updated but seed script not re-run in dev or prod.** The new catalog entry exists in the seed file but not in the database. Run the seed explicitly after deploying.

7. **`shared-types` updated but not all 13 service containers rebuilt.** Shared package change requires full stop → rm → rmi → build for every service that imports the package. See Docker Rebuild Procedure in `CLAUDE.md`.

8. **`CLAUDE.md` not updated after adding a new Replay Lab endpoint.** The endpoint table in the Routing section is now stale. The next engineer implementing a related feature misses the new endpoint and duplicates it.

---

## "Ship Without This and Suffer" — Consequence Guide

| Item Skipped          | Immediate Consequence                        | Discovery Timing      |
| --------------------- | -------------------------------------------- | --------------------- |
| `.env.example`        | Next dev or CI env missing variable          | At next fresh setup   |
| Nginx route           | Frontend gets 404 for new endpoint           | First UI interaction  |
| Prisma migration      | `PrismaClientKnownRequestError` in prod      | First DB write        |
| i18n (non-English)    | `undefined` text or English in foreign UI    | First non-EN user     |
| Docker compose (prod) | Service missing in production                | Production deployment |
| shared-types event    | Hardcoded string → typo → silent no-delivery | Message not processed |
| Frontend types        | 400 error on API call or `undefined` in UI   | First API call in UI  |
| CI env vars           | All tests in service fail in CI              | Next CI run           |
| Seed data             | Feature non-functional after deploy          | Production deploy     |
| Health service        | New service invisible in health dashboard    | First incident        |
| CLAUDE.md             | Stale docs mislead next engineer             | Next related feature  |
