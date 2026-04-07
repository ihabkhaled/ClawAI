# Docker and DevOps Architecture Audit

## Overview

Claw runs as a fully Dockerized development environment with ~24 containers orchestrated by a single `docker-compose.yml` (620 lines). Automated install scripts handle first-time setup on both Linux/macOS (bash) and Windows (PowerShell).

---

## Container Inventory

### Infrastructure (11 containers)
| Container | Image | Port | Health Check |
|---|---|---|---|
| pg-auth | pgvector/pgvector:pg16 | 5441 | pg_isready |
| pg-chat | pgvector/pgvector:pg16 | 5442 | pg_isready |
| pg-connector | pgvector/pgvector:pg16 | 5443 | pg_isready |
| pg-routing | pgvector/pgvector:pg16 | 5444 | pg_isready |
| pg-memory | pgvector/pgvector:pg16 | 5445 | pg_isready |
| pg-files | pgvector/pgvector:pg16 | 5446 | pg_isready |
| mongodb | mongo | 27017 | mongosh eval |
| redis | redis | 6379 | redis-cli ping |
| rabbitmq | rabbitmq:management | 5672/15672 | rabbitmq-diagnostics |
| nginx | nginx | 80 | curl localhost |
| ollama | ollama/ollama (profile: local-ai) | 11434 | GPU-aware |

### Application Services (11+ containers)
| Container | Port | Database | Hot Reload |
|---|---|---|---|
| auth-service | 4001 | pg-auth | node --watch |
| chat-service | 4002 | pg-chat | node --watch |
| connector-service | 4003 | pg-connector | node --watch |
| routing-service | 4004 | pg-routing | node --watch |
| memory-service | 4005 | pg-memory | node --watch |
| file-service | 4006 | pg-files | node --watch |
| audit-service | 4007 | mongodb | node --watch |
| ollama-service | 4008 | none | node --watch |
| health-service | 4009 | none (aggregator) | node --watch |
| client-logs-service | 4010 | mongodb | node --watch |
| server-logs-service | 4011 | mongodb | node --watch |
| frontend | 3000 | none | next dev |

---

## Environment Management

### Single Root `.env`
- All services read from a single root `.env` file
- `.env.example` at root defines all variables with defaults
- Per-service `.env.example` files have been deleted (consolidated)
- Docker Compose uses `${VAR:-default}` pattern for all env vars

### Variable Categories
- `PG_*` — PostgreSQL credentials per service (user, password, db, port)
- `MONGO_*` — MongoDB connection details
- `REDIS_*` — Redis connection details
- `RABBITMQ_*` — RabbitMQ credentials
- `JWT_*` — JWT secret and expiry
- `CONNECTOR_*` — Encryption keys
- `OLLAMA_*` — Ollama service URL

---

## Install Automation

### Scripts
| Script | Platform | Purpose |
|---|---|---|
| `scripts/install.sh` | Linux/macOS | Full first-time setup |
| `scripts/install.ps1` | Windows | Full first-time setup |
| `scripts/setup.sh` | Linux/macOS | Environment setup |
| `scripts/claw.sh` | Linux/macOS | CLI management tool |

### What Install Scripts Do
1. Check prerequisites (Docker, Node.js, npm)
2. Copy `.env.example` to `.env` if not present
3. Generate secure random secrets (JWT, encryption keys)
4. Run `npm install`
5. Build shared packages
6. Start Docker Compose
7. Run Prisma migrations
8. Verify health checks

---

## Health Checks

Every container has a Docker health check:
- **PostgreSQL**: `pg_isready -U $user -d $db` (10s interval, 5 retries)
- **MongoDB**: `mongosh --eval 'db.runCommand("ping")'`
- **Redis**: `redis-cli ping`
- **RabbitMQ**: `rabbitmq-diagnostics -q ping`
- **Nginx**: `curl -f http://localhost/`
- **Application services**: HTTP health endpoints (`/health`)

Health checks enforce startup order via `depends_on` with `condition: service_healthy`.

---

## Hot Reload

- All NestJS services use `node --watch` for file-change detection
- Source code mounted as Docker volumes
- Frontend uses Next.js built-in hot reload (`next dev`)
- No build step required during development

---

## Prisma Auto-Migration

- Service entrypoints run `npx prisma migrate deploy` before starting
- Migrations applied automatically on container start
- Prisma client generated at build time via `npx prisma generate`

---

## CI/CD Pipeline (GitHub Actions)

### Current Workflow (`ci.yml`)
```
Trigger: push/PR to main, develop
Concurrency: cancel-in-progress per branch

Jobs:
  lint     → npm run lint
  typecheck → npm run typecheck
  test     → npm run test (--passWithNoTests, failures allowed)
  build    → npm run build (depends on lint + typecheck)
```

### CI Steps Pattern (repeated across jobs)
1. Checkout code
2. Setup Node 20 with npm cache
3. `npm ci --ignore-scripts`
4. Build shared packages (shared-types, shared-constants, shared-rabbitmq, shared-auth)
5. Generate Prisma clients for all 7 Prisma services
6. Run job-specific command

---

## What Is REAL

1. **Full Docker orchestration** — all 22+ containers defined, networked, health-checked
2. **GPU detection** — Ollama container uses Docker GPU profile for local AI models
3. **Install automation** — bash and PowerShell scripts for zero-config first-time setup
4. **Single `.env` management** — consolidated environment configuration, no per-service env files
5. **Health checks on every container** — proper startup ordering with `depends_on: condition: service_healthy`
6. **Hot reload** — `node --watch` on all services, source mounted as volumes
7. **Prisma auto-migration** — database schema applied on container start
8. **CI pipeline** — lint, typecheck, test, build in GitHub Actions
9. **Shared package build order** — CI correctly builds shared packages before service-level steps

## What Is MISSING

1. **No CI/CD integration tests** — tests run without Docker services, no database, `--passWithNoTests` with failure tolerance
2. **No staging environment** — only dev (docker-compose) and CI (GitHub Actions), no staging/pre-prod
3. **No log rotation config** — Docker container logs can grow unbounded
4. **No Docker image builds** — dev uses volume mounts, no production Dockerfiles or image registry
5. **No deployment pipeline** — CI stops at build, no deploy step
6. **No container resource limits** — no memory/CPU limits on any container
7. **No backup strategy** — 6 PostgreSQL + 1 MongoDB instances with no backup automation
8. **No secret management** — secrets in `.env` file, no Vault/SOPS/sealed-secrets
9. **No load balancing** — single Nginx instance, no horizontal scaling
10. **No Docker Compose profiles beyond ollama** — all services start together, no partial stack

---

## Sync/Restart/Rebuild Matrix

| Scenario | Command | Downtime |
|---|---|---|
| Code change (any service) | Automatic (node --watch) | 0 — hot reload |
| New npm dependency | `docker compose restart <service>` | ~5s |
| Prisma schema change | `docker compose restart <service>` | ~10s (migration runs) |
| New environment variable | `docker compose up -d` | ~5s |
| Docker Compose change | `docker compose up -d --build` | ~30s |
| Shared package change | Rebuild + restart dependent services | ~20s |
| Full rebuild | `docker compose down && docker compose up -d` | ~2min |
| Infrastructure only | `docker compose up -d pg-auth redis rabbitmq...` | N/A |

---

## Developer Workflow

```
1. Clone repo
2. Run install script (install.sh or install.ps1)
3. Wait for all containers to be healthy (~1-2 min)
4. Open http://localhost:3000 (frontend via Nginx)
5. Edit code → automatic hot reload
6. Database changes → edit Prisma schema → restart service
7. Shared package changes → rebuild package → restart consumers
```

---

## Signs Docker Is Lying — Checklist

| # | Check | Status | Notes |
|---|---|---|---|
| 1 | Does `docker compose up -d` bring up ALL services? | YES | All containers start and health-check |
| 2 | Do health checks actually verify service readiness? | YES | pg_isready, redis-cli ping, HTTP /health |
| 3 | Can a new developer set up the project in < 10 minutes? | YES | Install scripts automate everything |
| 4 | Does hot reload actually work? | YES | node --watch + volume mounts |
| 5 | Are database migrations applied automatically? | YES | Prisma migrate deploy in entrypoint |
| 6 | Can you run the full test suite in CI? | PARTIAL | Tests run but failures are tolerated, no integration tests |
| 7 | Can you deploy to production from this setup? | NO | No production Dockerfiles, no deploy pipeline |
| 8 | Are secrets properly managed? | NO | Plain text in .env file |
| 9 | Can you scale any service independently? | NO | No resource limits, no scaling config |
| 10 | Is there a disaster recovery plan? | NO | No backups, no volume snapshot strategy |

### Verdict
Docker/DevOps is **excellent for development, absent for production**. The dev experience is polished — install scripts, hot reload, auto-migration, health checks. But there is no path from development to production: no production images, no deployment pipeline, no secret management, no backup strategy.

---

## Recommended Improvements (Priority Order)

1. **Add production Dockerfiles** — multi-stage builds, minimal images
2. **Add container resource limits** — prevent any service from consuming all host resources
3. **Add Docker log rotation** — `json-file` driver with max-size/max-file
4. **Add database backup automation** — pg_dump cron for all 6 PG instances
5. **Add integration test job in CI** — spin up Docker services, run real tests
6. **Add staging environment** — Docker Compose override or separate compose file
7. **Add secret management** — at minimum, SOPS-encrypted .env for production
8. **Add deployment pipeline** — GitHub Actions deploy step to target environment
