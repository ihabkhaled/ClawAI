# ClawAI — Automated Vercel Deployment

Everything here is executable. Copy the commands as written.

---

## 1. Architecture overview

ClawAI stays exactly what it is: independent NestJS microservices, a Next.js
frontend, one database per service. Nothing is merged, nothing is redesigned.
Each application becomes its own **Vercel project**, linked to the same GitHub
repository with a different root directory.

```
Browser
  └─> claw-frontend (Next.js on Vercel)
        └─ next.config.mjs rewrites  /api/v1/<domain>/*
              ├─> claw-auth-service          /auth /users /admin
              ├─> claw-chat-service          /chat-threads /chat-messages
              ├─> claw-connector-service     /connectors
              ├─> claw-routing-service       /routing
              ├─> claw-memory-service        /memories /context-packs
              ├─> claw-file-service          /files
              ├─> claw-audit-service         /audits /usage
              ├─> claw-client-logs-service   /client-logs
              ├─> claw-server-logs-service   /server-logs
              ├─> claw-image-service         /images
              ├─> claw-file-generation-svc   /file-generations
              ├─> claw-workspace-service     /workspace
              ├─> claw-agent-service         /agent
              ├─> claw-research-service      /research
              └─> claw-health-service        /health

External managed services:
  PostgreSQL (11 databases)  MongoDB (3)  Redis  AMQP  Object storage
  Ollama-compatible API      Cloud AI providers
```

On Vercel there is no nginx. Its route map moves into
`apps/claw-frontend/next.config.mjs` `rewrites()`, whose destinations come from
`*_SERVICE_URL` environment variables that the automation resolves from live
Vercel URLs. **No generated deployment URL is ever written into source.**

Each Nest service is served by a small generated entry point,
`apps/<service>/api/index.js`. It builds the same `AppModule` as `src/main.ts`
but hands Vercel the Express instance instead of calling `app.listen()` — a
serverless function must not bind a port. The entry requires the compiled
`dist/` output because NestJS dependency injection needs
`emitDecoratorMetadata`, which only the tsgo build emits.

### The automation layer

| File                                      | Purpose                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `deploy/vercel/projects.json`             | Single source of truth: every project, path, build command, health path, database, dependency |
| `deploy/vercel/environment.json`          | Which environment variable goes to which project, and which are secret                        |
| `deploy/vercel/migrations.json`           | Migration plan per database, including MongoDB TTL indexes                                    |
| `scripts/vercel/validate.mjs`             | Pre-flight consistency and safety checks (no network, no token needed)                        |
| `scripts/vercel/generate-configs.mjs`     | Writes `apps/*/vercel.json` and `apps/*/api/index.js` from the manifest                       |
| `scripts/vercel/provision.mjs`            | Creates and configures Vercel projects. Idempotent, never deletes                             |
| `scripts/vercel/sync-env.mjs`             | Uploads environment variables to the right projects only                                      |
| `scripts/vercel/resolve-service-urls.mjs` | Discovers live URLs and fans them out                                                         |
| `scripts/vercel/migrate.mjs`              | Runs Prisma deploy migrations and Mongo index setup                                           |
| `scripts/vercel/deploy.mjs`               | Deploys in dependency order, frontend last                                                    |
| `scripts/vercel/verify.mjs`               | Probes health, auth, CORS, streaming, proxy, Ollama                                           |
| `scripts/vercel/setup.mjs`                | Runs the whole pipeline in order                                                              |

---

## 2. Required external resources

Provision these before the first deployment. Nothing below is created by the
automation — it only wires them up.

| Resource              | Count | Notes                                                                                                                            |
| --------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL databases  | 11    | One per service. Neon, Supabase, or Vercel Postgres. Each needs a **pooled** and a **direct** connection string.                 |
| pgvector extension    | 1     | On the **memory** database only. `migrate.mjs` creates it when the role has permission.                                          |
| MongoDB databases     | 3     | audit, client-logs, server-logs. One Atlas cluster can host all three.                                                           |
| Redis                 | 1     | Use a serverless-friendly provider (Upstash). A single-node Redis will exhaust connections under per-invocation serverless load. |
| AMQP broker           | 1     | CloudAMQP or equivalent, for the `claw.events` topic exchange. See the consumer limitation in §16.                               |
| Object storage        | 1     | Vercel Blob or S3-compatible. **Required** — the Vercel filesystem is ephemeral.                                                 |
| Ollama-compatible API | 1     | External endpoint. ClawAI on Vercel never runs a local Ollama or llama.cpp runtime.                                              |
| Vercel account        | 1     | A token with project-create and deploy scope.                                                                                    |

Cloud AI provider keys (OpenAI, Anthropic, Gemini, …) are normally stored
per-connector in the database, encrypted with `ENCRYPTION_KEY`, and entered
through the ClawAI UI rather than as environment variables.

---

## 3. Required environment variables

`.env.vercel.example` is the complete, grouped list. Copy it and fill it in:

```bash
cp .env.vercel.example .env.vercel
```

The values you cannot skip:

| Group           | Variables                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------- |
| Vercel account  | `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_GIT_REPOSITORY`, `VERCEL_PRODUCTION_BRANCH`       |
| Shared security | `JWT_SECRET` (≥32 chars), `ENCRYPTION_KEY` (64 hex), `INTER_SERVICE_AUTH_TOKEN` (≥32 chars) |
| Infrastructure  | `REDIS_URL`, `RABBITMQ_URL`, `BLOB_READ_WRITE_TOKEN`                                        |
| Databases       | 11 × `*_DATABASE_URL` + `*_DIRECT_DATABASE_URL`, 3 × `*_MONGODB_URI`                        |
| AI runtime      | `OLLAMA_BASE_URL`, `OLLAMA_API_KEY`                                                         |
| Browser         | `CORS_ORIGINS`                                                                              |

Generate the secrets:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # ENCRYPTION_KEY (must be exactly 64 hex chars)
openssl rand -base64 32   # INTER_SERVICE_AUTH_TOKEN
```

`JWT_SECRET` and `INTER_SERVICE_AUTH_TOKEN` must be **byte-identical across
every project** — the automation guarantees this by sourcing them once from
`.env.vercel`.

`OLLAMA_API_KEY` is never sent to the frontend project and never mirrored into a
`NEXT_PUBLIC_*` variable. `validate.mjs` fails the run if you try.

Leave every `*_SERVICE_URL` **empty**. They are resolved from live Vercel URLs.

---

## 4. Initial deployment

```bash
cp .env.vercel.example .env.vercel
# fill in secrets and external resource URLs

npm ci
npm run vercel:validate
npm run vercel:provision
npm run vercel:env:sync
npm run vercel:migrate
npm run vercel:deploy
npm run vercel:verify
```

Or the whole pipeline in one command (recommended — it also resolves and syncs
service URLs between the backend and frontend deploys, which the six commands
above leave to you):

```bash
npm run vercel:setup -- --target preview
```

Preview is always the default. Nothing above touches production.

---

## 5. Preview deployment

```bash
npm run vercel:setup -- --target preview
```

Or step by step:

```bash
npm run vercel:deploy -- --all --target preview
npm run vercel:resolve-urls -- --target preview --sync
npm run vercel:deploy -- --service frontend --target preview
npm run vercel:verify -- --target preview
```

Preview also runs automatically on every pull request via
`.github/workflows/vercel-preview.yml`, which deploys only the affected projects
and comments the URLs on the PR.

---

## 6. Production deployment

Production requires the flag. There is no way to reach it by accident.

```bash
npm run vercel:setup -- --target production
```

Preview the plan first without changing anything:

```bash
npm run vercel:setup -- --target production --dry-run
```

Skip migrations when the schema is unchanged:

```bash
npm run vercel:setup -- --target production --skip-migrations
```

Production also runs on merge to `main` via
`.github/workflows/vercel-production.yml`.

---

## 7. Deploying one service

```bash
npm run vercel:deploy -- --service frontend --target production
npm run vercel:deploy -- --service auth     --target production
npm run vercel:deploy -- --service chat     --target production
npm run vercel:deploy -- --all              --target production
```

Valid keys: `auth`, `chat`, `connector`, `routing`, `memory`, `file`, `audit`,
`health`, `client-logs`, `server-logs`, `image`, `file-generation`, `workspace`,
`agent`, `research`, `frontend`.

Every script accepts `--service` the same way:

```bash
npm run vercel:provision  -- --service chat
npm run vercel:env:sync   -- --service chat --target production
npm run vercel:migrate    -- --service chat
npm run vercel:verify     -- --service chat --target production
```

---

## 8. Updating one environment variable

1. Edit the value in `.env.vercel`.
2. Push it to only the projects that read it:

```bash
npm run vercel:env:sync -- --service chat --target production
```

3. The variable takes effect on the next deployment:

```bash
npm run vercel:deploy -- --service chat --target production
```

To add a **new** variable, declare it in `deploy/vercel/environment.json` first
(under `shared` with an `appliesTo` list, or under the owning project), add it
to `.env.vercel.example`, then run the sync. `validate.mjs` fails if a project
requires a variable the manifest never maps to it.

Removing a variable from Vercel is opt-in:

```bash
npm run vercel:env:sync -- --service chat --target production --remove-missing
```

Without that flag, variables present on Vercel but absent from the manifest are
left untouched.

---

## 9. Running one database migration

```bash
npm run vercel:migrate -- --service auth
npm run vercel:migrate -- --service auth --dry-run
```

The script uses `AUTH_DIRECT_DATABASE_URL` when set, falling back to
`AUTH_DATABASE_URL`. It refuses to run through a pooled connection when a direct
URL is missing and the pooled one is recognisably a pooler — Prisma advisory
locks do not survive pgbouncer, and a half-applied migration is worse than a
failed one. Connection strings are never printed; you see only
`postgresql://<redacted>@host/database`.

`prisma migrate dev` is never invoked.

---

## 10. Redeploying one service

```bash
npm run vercel:deploy -- --service memory --target production
npm run vercel:verify -- --service memory --target production
```

If the redeploy changed the service's URL (it will not on production, where the
alias is stable), refresh its consumers:

```bash
npm run vercel:resolve-urls -- --target production --sync
```

---

## 11. Rolling back one service

Rollback is a Vercel operation, not something this automation performs — the
tooling deliberately never deletes or reverts deployments on your behalf.

```bash
# List recent production deployments for a project
vercel ls claw-chat-service --scope "$VERCEL_TEAM_ID"

# Promote a known-good deployment back to the production alias
vercel promote <deployment-url> --scope "$VERCEL_TEAM_ID"

# Confirm the rollback
npm run vercel:verify -- --service chat --target production
```

**Database migrations do not roll back.** Prisma migrations are forward-only.
If a rollback needs a schema revert, write a new forward migration.

---

## 12. Health verification

```bash
npm run vercel:verify -- --target production
```

Checks performed per service:

| Check                  | Pass condition                                                              | Required |
| ---------------------- | --------------------------------------------------------------------------- | -------- |
| health                 | `GET /api/v1/health` returns 2xx                                            | yes      |
| auth-guard             | An unauthenticated protected endpoint returns **401**, not 404 or 500       | yes      |
| cors-preflight         | `OPTIONS` allows the frontend origin                                        | no       |
| streaming              | The SSE route exists and is not buffered into a plain response              | no       |
| frontend               | `GET /` returns 2xx/3xx                                                     | yes      |
| frontend→backend proxy | `/api/v1/health` through the frontend is not a 404                          | no       |
| ollama api             | `GET {OLLAMA_BASE_URL}/api/tags` returns 2xx — a listing call, no inference | yes      |
| disabled services      | ollama and llamacpp are correctly absent                                    | no       |

The distinction between 401 and 404 matters: 404 means the rewrite or API prefix
is wrong, 500 means the guard is throwing rather than rejecting, and 200 means
the endpoint is not protected at all.

Reports are written to:

```
deploy/vercel/generated/verification-report.json
deploy/vercel/generated/verification-report.md
```

The command exits non-zero when any required check fails.

---

## 13. Troubleshooting

**`Vercel rejected the credentials (HTTP 403)`**
`VERCEL_TOKEN` is wrong or scoped to a different account. If the projects live
in a team, `VERCEL_TEAM_ID` must be set. The script stops at the first
credential failure instead of repeating the same error per project.

**`Cannot find module '@claw/shared-types'` during a Vercel build**
First inspect the install log. Every project must use `npm ci` exactly. Vercel
already runs the command in a workspace-aware context for the configured
`apps/<workspace>` root; prepending `cd ../..` can escape the cloned checkout
and makes npm attempt to download private `@claw/*` workspaces from npmjs.org.
The validator rejects that configuration.

If installation succeeds but the build cannot resolve the package, verify that
the build command still calls `scripts/vercel/build-service.sh`, then run
`npm run vercel:provision` to patch dashboard drift from
`deploy/vercel/projects.json`.

**Service returns 500 on every request**
Its Zod `AppConfig` validation failed at boot. A missing required variable is
the usual cause. Run `npm run vercel:validate` and check the Vercel function
logs for the `Invalid environment configuration` message, which names the
offending variable.

**Protected endpoint returns 404 instead of 401**
The route is not reaching Nest. Check that `apps/<service>/vercel.json` still
has the `/(.*)` → `/api/index.js` rewrite; regenerate with
`node scripts/vercel/generate-configs.mjs`.

**Frontend loads but every API call 404s**
The `*_SERVICE_URL` variables are not set on the frontend project, so
`next.config.mjs` produced no rewrites. Run
`npm run vercel:resolve-urls -- --target production --sync`, then redeploy the
frontend. Rewrites are baked in at build time, so a redeploy is mandatory.

**Browser blocks requests with a CORS error**
`CORS_ORIGINS` does not include the frontend origin. Update it in `.env.vercel`,
re-run `npm run vercel:env:sync`, and redeploy the affected backends.

**Migration hangs or reports a lock timeout**
You are migrating through a connection pooler. Set the `*_DIRECT_DATABASE_URL`
for that service and re-run.

**`CREATE EXTENSION vector` failed on the memory database**
The database role lacks permission. Run it once as a superuser:
`CREATE EXTENSION IF NOT EXISTS vector;`

**Chat requests time out after 60 seconds**
The function `maxDuration` was hit. Hobby plans cap at 60s. Lower
`OLLAMA_TOOL_LOOP_MAX_ITERATIONS` and `OLLAMA_GENERATE_TIMEOUT_MS`, or upgrade
the plan — `apps/claw-chat-service/vercel.json` already requests 300s.

**Cold starts are slow**
Each function boots a full Nest application on its first request. The entry
caches the app across warm invocations, so this affects the first request to a
new instance only.

---

## 14. Expected Vercel project names

| Key               | Vercel project                 | Root directory                      | Status                    |
| ----------------- | ------------------------------ | ----------------------------------- | ------------------------- |
| `auth`            | `claw-auth-service`            | `apps/claw-auth-service`            | enabled                   |
| `chat`            | `claw-chat-service`            | `apps/claw-chat-service`            | enabled                   |
| `connector`       | `claw-connector-service`       | `apps/claw-connector-service`       | enabled                   |
| `routing`         | `claw-routing-service`         | `apps/claw-routing-service`         | enabled                   |
| `memory`          | `claw-memory-service`          | `apps/claw-memory-service`          | enabled                   |
| `file`            | `claw-file-service`            | `apps/claw-file-service`            | enabled                   |
| `audit`           | `claw-audit-service`           | `apps/claw-audit-service`           | enabled                   |
| `health`          | `claw-health-service`          | `apps/claw-health-service`          | enabled                   |
| `client-logs`     | `claw-client-logs-service`     | `apps/claw-client-logs-service`     | enabled                   |
| `server-logs`     | `claw-server-logs-service`     | `apps/claw-server-logs-service`     | enabled                   |
| `image`           | `claw-image-service`           | `apps/claw-image-service`           | enabled                   |
| `file-generation` | `claw-file-generation-service` | `apps/claw-file-generation-service` | enabled                   |
| `workspace`       | `claw-workspace-service`       | `apps/claw-workspace-service`       | enabled                   |
| `agent`           | `claw-agent-service`           | `apps/claw-agent-service`           | enabled                   |
| `research`        | `claw-research-service`        | `apps/claw-research-service`        | enabled                   |
| `frontend`        | `claw-frontend`                | `apps/claw-frontend`                | enabled                   |
| `ollama`          | —                              | `apps/claw-ollama-service`          | **not-vercel-compatible** |
| `llamacpp`        | —                              | `apps/claw-llamacpp-service`        | **not-vercel-compatible** |

16 Vercel projects. The two excluded services are never provisioned; the
automation refuses `--service ollama` and `--service llamacpp` outright.

---

## 15. Expected database ownership

Each service owns exactly one database. Sharing one is a validation error, not a
convention.

| Service         | Engine                    | Runtime variable               | Migration variable                    |
| --------------- | ------------------------- | ------------------------------ | ------------------------------------- |
| auth            | PostgreSQL                | `AUTH_DATABASE_URL`            | `AUTH_DIRECT_DATABASE_URL`            |
| chat            | PostgreSQL                | `CHAT_DATABASE_URL`            | `CHAT_DIRECT_DATABASE_URL`            |
| connector       | PostgreSQL                | `CONNECTOR_DATABASE_URL`       | `CONNECTOR_DIRECT_DATABASE_URL`       |
| routing         | PostgreSQL                | `ROUTING_DATABASE_URL`         | `ROUTING_DIRECT_DATABASE_URL`         |
| memory          | PostgreSQL + **pgvector** | `MEMORY_DATABASE_URL`          | `MEMORY_DIRECT_DATABASE_URL`          |
| file            | PostgreSQL                | `FILES_DATABASE_URL`           | `FILES_DIRECT_DATABASE_URL`           |
| image           | PostgreSQL                | `IMAGE_DATABASE_URL`           | `IMAGE_DIRECT_DATABASE_URL`           |
| file-generation | PostgreSQL                | `FILE_GENERATION_DATABASE_URL` | `FILE_GENERATION_DIRECT_DATABASE_URL` |
| workspace       | PostgreSQL                | `WORKSPACE_DATABASE_URL`       | `WORKSPACE_DIRECT_DATABASE_URL`       |
| agent           | PostgreSQL                | `AGENT_DATABASE_URL`           | `AGENT_DIRECT_DATABASE_URL`           |
| research        | PostgreSQL                | `RESEARCH_DATABASE_URL`        | `RESEARCH_DIRECT_DATABASE_URL`        |
| audit           | MongoDB                   | `AUDIT_MONGODB_URI`            | —                                     |
| client-logs     | MongoDB                   | `CLIENT_LOGS_MONGODB_URI`      | —                                     |
| server-logs     | MongoDB                   | `SERVER_LOGS_MONGODB_URI`      | —                                     |
| health          | none                      | —                              | —                                     |
| frontend        | none                      | —                              | —                                     |

The two MongoDB log stores get a 30-day TTL index created by
`npm run vercel:migrate`. Audit rows are retained indefinitely by design.

---

## 16. Disabled local-only functionality

Deploying to Vercel means giving up the parts of ClawAI that need a machine you
control. These are the honest trade-offs, not bugs.

### Not deployed at all

| Component                  | Why                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `claw-llamacpp-service`    | Downloads and executes glibc-linked llama.cpp binaries, supervises a resident inference process, stores GGUF weights on a volume.         |
| `claw-ollama-service`      | Manages a local Ollama runtime: multi-gigabyte model pulls onto a persistent volume, minute-long SSE pull jobs, ComfyUI weight placement. |
| Local Ollama runtime       | No GPU, no persistent volume. Replaced by `OLLAMA_BASE_URL` + `OLLAMA_API_KEY`.                                                           |
| ComfyUI / Stable Diffusion | Local GPU diffusion runtimes. Only cloud image providers (DALL-E, Gemini) work.                                                           |
| ClamAV                     | No sidecar container. `CLAMAV_ENABLED=false`; uploads are not virus-scanned unless you point `CLAMAV_HOST` at an external daemon.         |
| OCR (tesseract)            | Needs native binaries and a persistent worker pool. `OCR_ENABLED=false`.                                                                  |
| nginx                      | Replaced by `next.config.mjs` rewrites on the frontend project.                                                                           |
| mkcert TLS                 | Vercel terminates TLS at its edge. `HTTPS_CERT_PATH` / `HTTPS_KEY_PATH` are unused.                                                       |

### Degraded

**Scheduled background work does not run.** Every `@nestjs/schedule` cron —
workspace sync ticking, stale detection, auto-suggest collectors, the nightly
file-retention sweep, AI-action queue expiry — is an in-process timer. A
serverless function is not running when no request is in flight, so none of
these fire. `WORKSPACE_SCHEDULER_ENABLED`, `AUTO_SUGGEST_ENABLED` are therefore
set to `false`. Manual sync through the existing HTTP endpoints still works.
Driving these from Vercel Cron needs HTTP trigger endpoints the services do not
expose today — that is open work, not something this automation silently papers
over.

**Durable RabbitMQ consumption does not happen.** Services still _publish_
events fine. But `claw-audit-service` and `claw-server-logs-service` consume
from AMQP with a long-lived connection, which a serverless function cannot hold.
Audit rows and server logs are only written for what arrives over direct HTTP.
Fixing this properly means a queue provider that pushes over HTTPS.

**File uploads need object storage.** The Vercel filesystem is ephemeral and
read-only outside `/tmp`. `FILE_STORAGE_PATH` and `ZIP_TEMP_EXTRACTION_PATH`
must point under `/tmp`, and durable blobs must go to
`BLOB_READ_WRITE_TOKEN`-backed storage.

**SSE streams are bounded by `maxDuration`.** Chat streaming works, but a
long generation will be cut off at the function limit (60s on Hobby, 300s
configured for chat on Pro). Clients need to reconnect.

**In-memory rate limits are approximate.** The sliding windows in
workspace-service are per-invocation, so limits are enforced per function
instance rather than globally.

**The desktop agent control plane works.** The CLI connects outbound to
`claw-agent-service`; capability execution happens on the user's own machine, so
nothing agent-side needs to run in the Vercel runtime.

---

## 17. Safety guarantees

The automation will never:

- delete a Vercel project, a database, or a deployment;
- remove an environment variable unless you pass `--remove-missing`;
- touch a Vercel project whose name is not in `projects.json`;
- relink a project that is already connected to a different repository (it warns instead);
- print `VERCEL_TOKEN`, a database URL, or any secret value — secrets appear only as `<set:N chars>`;
- commit `.env.vercel` (gitignored, and `validate.mjs` checks that it is);
- expose `OLLAMA_API_KEY`, or any secret, through a `NEXT_PUBLIC_*` variable;
- merge services or let two services share a database;
- deploy `claw-llamacpp-service` or a local Ollama runtime;
- deploy to production unless you pass `--target production`. Preview is the default everywhere.

`sync-env.mjs` validates every required value **before** sending anything to
Vercel: a half-applied environment produces a service that boots and fails at
request time, which is worse than not starting.

---

## 18. Regenerating the Vercel configs

`apps/*/vercel.json` and `apps/*/api/index.js` are generated from
`deploy/vercel/projects.json` and committed. After editing the manifest:

```bash
node scripts/vercel/generate-configs.mjs
```

CI fails if they are stale:

```bash
node scripts/vercel/generate-configs.mjs --check
```

---

## 19. GitHub Actions

| Workflow                                  | Trigger                         | Does                                                                                                                       |
| ----------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/vercel-preview.yml`    | pull request to `main`          | Detects affected projects, validates, builds, deploys preview, resolves URLs, verifies, comments URLs on the PR            |
| `.github/workflows/vercel-production.yml` | push to `main`, manual dispatch | Validates, typechecks, tests, provisions, syncs env, migrates, deploys backends, resolves URLs, deploys frontend, verifies |

Required GitHub secrets:

```
VERCEL_TOKEN
VERCEL_TEAM_ID
```

Application and database secrets stay in Vercel. They are never copied into a
workflow runner and therefore cannot appear in a workflow log.
