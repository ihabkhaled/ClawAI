# Skill: New NestJS Service Scaffolding

> Use this skill when adding a new NestJS microservice to the ClawAI monorepo. Follow every step. Skipping any step results in partial wiring that breaks in production.

---

## Pre-Scaffold Checklist

Before writing any code:

- [ ] Service name decided: `claw-<name>-service`
- [ ] Port assigned (next available after existing services — check `packages/shared-constants`)
- [ ] Database decided (PostgreSQL with Prisma, or MongoDB with Mongoose, or no DB)
- [ ] Events decided (what events will this service publish? consume?)
- [ ] Nginx routes decided (what paths will this service own under `/api/v1/`?)
- [ ] Planning gate (Phase 0) completed and saved to `.claude/Integrations/<name>__PLAN.md`

---

## Step 1 — Copy Boilerplate

```bash
cp -r apps/claw-ollama-service apps/claw-<name>-service
```

Then update:

- `package.json`: name, description
- `src/app/config/app.config.ts`: service-specific env vars
- `prisma/schema.prisma`: clear models, update `provider` and env var name
- All import paths: rename occurrences of old service name

---

## Step 2 — Add PostgreSQL Database (ALL 4 DB files)

```yaml
# docker-compose.dev.yml AND docker-compose.yml AND
# docker-compose.dev.databases.yml AND docker-compose.prod.databases.yml

claw-db-<name>:
  image: pgvector/pgvector:pg16
  container_name: claw-db-<name>
  environment:
    POSTGRES_USER: ${PG_<NAME>_USER}
    POSTGRES_PASSWORD: ${PG_<NAME>_PASSWORD}
    POSTGRES_DB: ${PG_<NAME>_DB}
  ports:
    - '${PG_<NAME>_PORT}:5432'
  volumes:
    - claw_<name>_data:/var/lib/postgresql/data
  networks:
    - claw-network
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U ${PG_<NAME>_USER}']
    interval: 10s
    timeout: 5s
    retries: 5

volumes:
  claw_<name>_data:
```

---

## Step 3 — Add Service Container (ALL 4 service files)

```yaml
# docker-compose.dev.yml AND docker-compose.yml AND
# docker-compose.dev.services.yml AND docker-compose.prod.services.yml

claw-<name>-service:
  build:
    context: .
    dockerfile: apps/claw-<name>-service/Dockerfile.dev
  container_name: claw-<name>-service
  env_file: .env
  ports:
    - '${<NAME>_PORT}:<NAME>_PORT}'
  depends_on:
    claw-db-<name>:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
  networks:
    - claw-network
```

---

## Step 4 — Environment Variables

Add to `.env` and `.env.example`:

```
PG_<NAME>_USER=claw_user
PG_<NAME>_PASSWORD=claw_pass
PG_<NAME>_DB=claw_<name>
PG_<NAME>_PORT=54XX

<NAME>_PORT=40XX
<NAME>_DATABASE_URL=postgresql://${PG_<NAME>_USER}:${PG_<NAME>_PASSWORD}@claw-db-<name>:5432/${PG_<NAME>_DB}
<NAME>_SERVICE_URL=http://claw-<name>-service:40XX
```

Add same to `scripts/install.sh` and `scripts/install.ps1`.

---

## Step 5 — Shared Constants

```typescript
// packages/shared-constants/src/index.ts
export const <NAME>_SERVICE_PORT = 40XX;
export const <NAME>_SERVICE_NAME = 'claw-<name>-service';
```

---

## Step 6 — Shared Types (if publishing events)

```typescript
// packages/shared-types/src/events.ts
export const <NAME>_EVENTS = {
  THING_CREATED: '<name>.thing_created',
  THING_UPDATED: '<name>.thing_updated',
} as const;
```

---

## Step 7 — Nginx Route

```nginx
# infra/nginx/nginx.conf

location /api/v1/<name>/ {
  proxy_pass http://claw-<name>-service:40XX/api/v1/<name>/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Request-ID $request_id;
}
```

---

## Step 8 — Health Service Registration

```typescript
// apps/claw-health-service/src/modules/health/health.service.ts
// Add to the service URL list:
{ name: 'claw-<name>-service', url: this.config.<name>ServiceUrl + '/health' }
```

---

## Step 9 — CI Pipeline

```yaml
# .github/workflows/ci.yml

# In Prisma generate step:
- name: Generate <name> Prisma client
  run: cd apps/claw-<name>-service && npx prisma generate

# In test env vars:
env:
  <NAME>_DATABASE_URL: postgresql://test:test@localhost:5432/test_<name>
```

---

## Step 10 — CLAUDE.md Updates

1. Add to workspace layout table in root `CLAUDE.md`
2. Add to Nginx Route Map table
3. Add to port assignments (if new port)
4. Add to event bus table (if publishing events)
5. Create `apps/claw-<name>-service/CLAUDE.md` (copy from another service, update)

---

## Step 11 — Documentation

Create: `docs/04-backend/service-guide-<name>.md`

Template in `rules/06-docs-rules.md`.

---

## Step 12 — i18n (if user-facing)

Add all new user-visible text to all 8 locale files:

```
apps/claw-frontend/src/lib/i18n/locales/{en,ar,de,es,fr,it,pt,ru}.ts
```

---

## Post-Scaffold Verification

```bash
# 1. Build the new service
cd apps/claw-<name>-service && npm run build

# 2. Run Prisma migration
cd apps/claw-<name>-service && npx prisma migrate dev --name init

# 3. Start the service
./scripts/claw.sh up -d --build claw-<name>-service

# 4. Check health
curl http://localhost:40XX/health

# 5. Check via nginx
curl http://localhost:4000/api/v1/<name>/health

# 6. Check logs
./scripts/claw.sh logs claw-<name>-service --tail=50

# 7. Full quality suite
cd apps/claw-<name>-service && npm run typecheck && npm run lint && npm run test
```
