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
docker compose -f docker-compose.dev.yml stop <service>
docker compose -f docker-compose.dev.yml rm -f <service>
docker rmi claw-<service>
docker compose -f docker-compose.dev.yml up -d --build <service>
```

**NEVER skip steps.** Just restarting or `--build` alone leaves stale compiled code.

When to rebuild (vs restart):
| Change | Action |
|--------|--------|
| `src/` source files | `node --watch` auto-detects (no action needed) |
| Prisma schema | Rebuild (migration runs in entrypoint) |
| `package.json` deps | Rebuild |
| Shared packages (`packages/*`) | Rebuild ALL dependent services |
| `.env` values | Restart only |
| Docker compose config | `docker compose up -d` (recreate) |
| Nginx config | Restart nginx container only |

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

---

## Shared Packages Rules

| Package                     | When to update                                     |
| --------------------------- | -------------------------------------------------- |
| `packages/shared-types`     | New event patterns, new enums used across services |
| `packages/shared-constants` | New service port, new service name constant        |
| `packages/shared-rabbitmq`  | New RabbitMQ utility or connection pattern         |
| `packages/shared-auth`      | New auth guard, new decorator, new role            |

After updating a shared package:

1. Increment version in package's `package.json`
2. Rebuild ALL services that depend on it (full stop → rm → rmi → build cycle)
3. Run `npm install` in monorepo root to update workspace links

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
