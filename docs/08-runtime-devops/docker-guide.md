# Docker Development Guide

## Overview

ClawAI runs as a fully containerized development environment using Docker Compose. The stack comprises 28 containers organized into infrastructure, backend microservices, a reverse proxy, and the frontend.

All containers share the `claw-network` bridge network and read environment variables from a single root `.env` file.

---

## Container Inventory

### Infrastructure (12 containers)

| Container                | Image                        | Host Port  | Internal Port | Purpose                                |
| ------------------------ | ---------------------------- | ---------- | ------------- | -------------------------------------- |
| claw-pg-auth             | pgvector/pgvector:pg16       | 5441       | 5432          | PostgreSQL for auth service            |
| claw-pg-chat             | pgvector/pgvector:pg16       | 5442       | 5432          | PostgreSQL for chat service            |
| claw-pg-connector        | pgvector/pgvector:pg16       | 5443       | 5432          | PostgreSQL for connector service       |
| claw-pg-routing          | pgvector/pgvector:pg16       | 5444       | 5432          | PostgreSQL for routing service         |
| claw-pg-memory           | pgvector/pgvector:pg16       | 5445       | 5432          | PostgreSQL for memory service          |
| claw-pg-files            | pgvector/pgvector:pg16       | 5446       | 5432          | PostgreSQL for file service            |
| claw-pg-ollama           | pgvector/pgvector:pg16       | 5447       | 5432          | PostgreSQL for ollama service          |
| claw-pg-images           | pgvector/pgvector:pg16       | 5448       | 5432          | PostgreSQL for image service           |
| claw-pg-file-generations | pgvector/pgvector:pg16       | 5449       | 5432          | PostgreSQL for file generation service |
| claw-mongodb             | mongo:7                      | 27018      | 27017         | MongoDB for audit, client/server logs  |
| claw-redis               | redis:7-alpine               | 6380       | 6379          | Redis cache and session store          |
| claw-rabbitmq            | rabbitmq:3-management-alpine | 5672/15672 | 5672/15672    | Message broker with management UI      |
| claw-ollama              | ollama/ollama:latest         | 11434      | 11434         | Local AI runtime (LLM inference)       |

### Backend Services (13 containers)

| Container                    | Dockerfile                                       | Host Port | Purpose                         |
| ---------------------------- | ------------------------------------------------ | --------- | ------------------------------- |
| claw-auth-service            | apps/claw-auth-service/Dockerfile.dev            | 4001      | Authentication, users, RBAC     |
| claw-chat-service            | apps/claw-chat-service/Dockerfile.dev            | 4002      | Threads, messages, AI execution |
| claw-connector-service       | apps/claw-connector-service/Dockerfile.dev       | 4003      | Cloud provider management       |
| claw-routing-service         | apps/claw-routing-service/Dockerfile.dev         | 4004      | Intelligent model routing       |
| claw-memory-service          | apps/claw-memory-service/Dockerfile.dev          | 4005      | Memory and context packs        |
| claw-file-service            | apps/claw-file-service/Dockerfile.dev            | 4006      | File upload and chunking        |
| claw-audit-service           | apps/claw-audit-service/Dockerfile.dev           | 4007      | Audit logs and usage tracking   |
| claw-ollama-service          | apps/claw-ollama-service/Dockerfile.dev          | 4008      | Ollama model management         |
| claw-health-service          | apps/claw-health-service/Dockerfile.dev          | 4009      | Aggregated health checks        |
| claw-client-logs-service     | apps/claw-client-logs-service/Dockerfile.dev     | 4010      | Frontend log ingestion          |
| claw-server-logs-service     | apps/claw-server-logs-service/Dockerfile.dev     | 4011      | Backend log aggregation         |
| claw-image-service           | apps/claw-image-service/Dockerfile.dev           | 4012      | AI image generation             |
| claw-file-generation-service | apps/claw-file-generation-service/Dockerfile.dev | 4013      | AI file generation              |

### Proxy and Frontend (2 containers)

| Container     | Image            | Host Port | Purpose                               |
| ------------- | ---------------- | --------- | ------------------------------------- |
| claw-nginx    | nginx:alpine     | 4000      | Reverse proxy routing to all services |
| claw-frontend | Custom (Next.js) | 3000      | Web UI (Turbopack hot reload)         |

---

## Starting and Stopping

### Full Stack (Single Compose File)

```bash
# Start everything
docker compose -f docker-compose.dev.yml up -d

# Stop everything
docker compose -f docker-compose.dev.yml down

# Stop and remove volumes (DESTRUCTIVE - deletes all data)
docker compose -f docker-compose.dev.yml down -v
```

### Using the Management Script

The `scripts/claw.sh` script provides granular control with separate compose files for databases, services, and Ollama:

```bash
# Start all (dev mode, default)
./scripts/claw.sh up

# Stop all
./scripts/claw.sh down

# Check status
./scripts/claw.sh status

# Production mode
./scripts/claw.sh --prod up
```

### Starting Individual Services

```bash
# Rebuild and start a single service
docker compose -f docker-compose.dev.yml up -d --build chat-service

# Start only infrastructure (databases, Redis, RabbitMQ)
docker compose -f docker-compose.dev.yml up -d pg-auth pg-chat pg-connector pg-routing pg-memory pg-files pg-ollama pg-images pg-file-generations mongodb redis rabbitmq

# Restart a single service
docker compose -f docker-compose.dev.yml restart auth-service
```

---

## Container Dependencies and Startup Order

Docker Compose health checks enforce the correct startup order:

```
Layer 1 (no dependencies):
  pg-auth, pg-chat, pg-connector, pg-routing, pg-memory, pg-files,
  pg-ollama, pg-images, pg-file-generations, mongodb, redis, rabbitmq, ollama

Layer 2 (depends on Layer 1 being healthy):
  auth-service      → pg-auth, redis, rabbitmq
  chat-service      → pg-chat, redis, rabbitmq
  connector-service → pg-connector, redis, rabbitmq
  routing-service   → pg-routing, redis, rabbitmq
  memory-service    → pg-memory, redis, rabbitmq
  file-service      → pg-files, redis, rabbitmq
  audit-service     → mongodb, redis, rabbitmq
  ollama-service    → pg-ollama, redis, rabbitmq
  image-service     → pg-images, redis, rabbitmq
  client-logs-service → mongodb, redis, rabbitmq
  server-logs-service → mongodb, redis, rabbitmq
  health-service    → redis, rabbitmq

Layer 3 (depends on all services being healthy):
  nginx → all 11+ backend services

Layer 4:
  frontend → nginx (service_started, not health check)
```

Each PostgreSQL service uses `pg_isready` health checks (10s interval, 5 retries). Backend services use `wget` against their `/api/v1/health` endpoint (15s interval, 10 retries, 45s start period). RabbitMQ uses `rabbitmq-diagnostics check_running`. Ollama uses `ollama list` with a 30s start period to allow model auto-pulling.

---

## Volume Management

### Named Volumes

| Volume                   | Container                | Mount Point              | Purpose                   |
| ------------------------ | ------------------------ | ------------------------ | ------------------------- |
| pg-auth-data             | claw-pg-auth             | /var/lib/postgresql/data | Auth database files       |
| pg-chat-data             | claw-pg-chat             | /var/lib/postgresql/data | Chat database files       |
| pg-connector-data        | claw-pg-connector        | /var/lib/postgresql/data | Connector database files  |
| pg-routing-data          | claw-pg-routing          | /var/lib/postgresql/data | Routing database files    |
| pg-memory-data           | claw-pg-memory           | /var/lib/postgresql/data | Memory database files     |
| pg-files-data            | claw-pg-files            | /var/lib/postgresql/data | Files database files      |
| pg-ollama-data           | claw-pg-ollama           | /var/lib/postgresql/data | Ollama database files     |
| pg-images-data           | claw-pg-images           | /var/lib/postgresql/data | Images database files     |
| pg-file-generations-data | claw-pg-file-generations | /var/lib/postgresql/data | File generations DB files |
| mongo-data               | claw-mongodb             | /data/db                 | MongoDB data files        |
| redis-data               | claw-redis               | /data                    | Redis persistence         |
| rabbitmq-data            | claw-rabbitmq            | /var/lib/rabbitmq        | RabbitMQ state and queues |
| ollama-data              | claw-ollama              | /root/.ollama            | Downloaded AI models      |
| file-storage-data        | claw-file-service        | /data/files              | Uploaded user files       |

### Host-Mounted Volumes (Hot Reload)

Backend services mount their `src/` and `prisma/` directories from the host for hot reload:

```
./apps/claw-<service>/src    → /app/apps/claw-<service>/src
./apps/claw-<service>/prisma → /app/apps/claw-<service>/prisma
```

The frontend mounts `src/` and `public/`:

```
./apps/claw-frontend/src    → /app/src
./apps/claw-frontend/public → /app/public
```

Nginx mounts its config read-only:

```
./infra/nginx/nginx.conf → /etc/nginx/nginx.conf:ro
```

### Cleaning Up Volumes

```bash
# List all ClawAI volumes
docker volume ls | grep claw

# Remove all volumes (DESTRUCTIVE)
docker compose -f docker-compose.dev.yml down -v

# Remove a specific volume
docker volume rm docker-compose-dev_pg-auth-data
```

---

## Hot Reload Matrix

| Change                | Action Required                                                   | Downtime |
| --------------------- | ----------------------------------------------------------------- | -------- |
| Source code (`src/`)  | Auto-detected by `node --watch` (backend) or Turbopack (frontend) | None     |
| Prisma schema         | Rebuild container (`prisma migrate deploy` runs in entrypoint)    | ~30s     |
| `package.json` deps   | Rebuild container (`docker compose up -d --build <service>`)      | ~60s     |
| Docker Compose config | `docker compose -f docker-compose.dev.yml up -d` (recreate)       | ~10s     |
| `.env` values         | Restart containers (`docker compose restart <service>`)           | ~5s      |
| Shared packages       | Rebuild shared package, then restart dependent services           | ~30s     |
| Nginx config          | Restart nginx (`docker compose restart nginx`)                    | ~2s      |
| Dockerfile changes    | Rebuild (`docker compose up -d --build <service>`)                | ~60s     |

### How Hot Reload Works

**Backend services** using Prisma (auth, chat, connector, routing, memory, file, ollama, image) run `docker-entrypoint.dev.sh` which executes `prisma migrate deploy` then starts the app with `node --watch`. Source file changes trigger automatic restart.

**Backend services** without Prisma (audit, health, client-logs, server-logs) run `npm run dev` directly.

**Frontend** runs `npm run dev` with Next.js Turbopack, providing instant HMR (Hot Module Replacement) for React components, styles, and pages.

---

## Viewing Logs

```bash
# Follow logs for a specific service
docker compose -f docker-compose.dev.yml logs -f chat-service

# Follow logs for multiple services
docker compose -f docker-compose.dev.yml logs -f auth-service chat-service routing-service

# Last 100 lines from a service
docker compose -f docker-compose.dev.yml logs --tail=100 ollama-service

# All service logs (very verbose)
docker compose -f docker-compose.dev.yml logs -f

# View logs for infrastructure
docker compose -f docker-compose.dev.yml logs -f rabbitmq
docker compose -f docker-compose.dev.yml logs -f pg-auth

# Using docker directly
docker logs claw-chat-service --tail=50 -f
```

---

## Rebuilding Containers

```bash
# Rebuild a single service (no cache)
docker compose -f docker-compose.dev.yml build --no-cache auth-service
docker compose -f docker-compose.dev.yml up -d auth-service

# Rebuild and restart in one command
docker compose -f docker-compose.dev.yml up -d --build auth-service

# Rebuild all services
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d

# Force recreate without rebuild (useful for env changes)
docker compose -f docker-compose.dev.yml up -d --force-recreate auth-service
```

---

## Network Topology

All containers are connected to the `claw-network` bridge network. Services communicate using Docker DNS hostnames that match the service name in `docker-compose.dev.yml`:

```
claw-network (bridge)
  |
  +-- Infrastructure
  |     pg-auth:5432, pg-chat:5432, pg-connector:5432, pg-routing:5432
  |     pg-memory:5432, pg-files:5432, pg-ollama:5432, pg-images:5432
  |     pg-file-generations:5432
  |     mongodb:27017, redis:6379, rabbitmq:5672
  |     ollama:11434
  |
  +-- Backend Services
  |     auth-service:4001, chat-service:4002, connector-service:4003
  |     routing-service:4004, memory-service:4005, file-service:4006
  |     audit-service:4007, ollama-service:4008, health-service:4009
  |     client-logs-service:4010, server-logs-service:4011
  |     image-service:4012
  |
  +-- Proxy + Frontend
        nginx:80 (host 4000), frontend:3000
```

Nginx resolves service hostnames using Docker's internal DNS (`127.0.0.11`) with 5s TTL, allowing it to survive service restarts without becoming stale.

Inter-service HTTP calls use the `*_SERVICE_URL` environment variables (e.g., `CONNECTOR_SERVICE_URL=http://connector-service:4003`).

---

## Resource Requirements

### Minimum Development Requirements

| Resource | Minimum | Recommended |
| -------- | ------- | ----------- |
| RAM      | 12 GB   | 16 GB       |
| CPU      | 4 cores | 8 cores     |
| Disk     | 20 GB   | 40 GB       |

### Per-Component Estimates

| Component           | RAM Usage | Disk Usage |
| ------------------- | --------- | ---------- |
| 9 PostgreSQL (idle) | ~1.8 GB   | ~500 MB    |
| MongoDB             | ~300 MB   | ~100 MB    |
| Redis               | ~50 MB    | ~10 MB     |
| RabbitMQ            | ~200 MB   | ~50 MB     |
| Ollama (5 models)   | ~2-6 GB   | ~10 GB     |
| 13 NestJS services  | ~2.6 GB   | ~500 MB    |
| Nginx               | ~10 MB    | ~5 MB      |
| Next.js frontend    | ~500 MB   | ~300 MB    |

Ollama is the largest consumer. Model sizes: gemma3:4b (3.3 GB), llama3.2:3b (2.0 GB), phi3:mini (2.2 GB), gemma2:2b (1.6 GB), tinyllama (637 MB). Models are pulled on first startup and cached in the `ollama-data` volume.

---

## Common Docker Issues and Solutions

### Port Conflicts

**Symptom**: `Bind for 0.0.0.0:XXXX failed: port is already allocated`

**Solution**: Check what is using the port and either stop it or change the port in `.env`:

```bash
# Find process using a port (Linux/macOS)
lsof -i :4001

# Windows
netstat -ano | findstr :4001
```

### Container Restart Loop

**Symptom**: A service container keeps restarting (status shows `Restarting`).

**Solution**:

1. Check logs: `docker logs claw-<service> --tail=100`
2. Common causes: database not ready, missing env vars, Prisma migration failure
3. Ensure infrastructure is healthy: `docker compose -f docker-compose.dev.yml ps`
4. Try rebuilding: `docker compose -f docker-compose.dev.yml up -d --build <service>`

### Health Check Failures

**Symptom**: Nginx or dependent services fail to start because upstream services are unhealthy.

**Solution**:

1. Check which services are unhealthy: `docker compose -f docker-compose.dev.yml ps`
2. Inspect health check output: `docker inspect --format='{{json .State.Health}}' claw-auth-service`
3. Start period is 45s for services; wait for initial startup to complete

### Ollama Model Pull Timeout

**Symptom**: Ollama container stays unhealthy for a long time on first run.

**Solution**: This is expected on first startup. The 5 models total ~10 GB and may take 10-30 minutes to download. Monitor progress:

```bash
docker logs claw-ollama -f
```

### Database Volume Corruption

**Symptom**: PostgreSQL container fails with "database system was not properly shut down".

**Solution**:

```bash
# Stop the container
docker compose -f docker-compose.dev.yml stop pg-auth

# Remove the volume
docker volume rm docker-compose-dev_pg-auth-data

# Restart (will recreate from scratch; run prisma migrate)
docker compose -f docker-compose.dev.yml up -d pg-auth auth-service
```

### Out of Disk Space

**Symptom**: Containers fail to start or build, Docker daemon errors.

**Solution**:

```bash
# Check Docker disk usage
docker system df

# Remove unused images, containers, and build cache
docker system prune -a

# Remove dangling volumes
docker volume prune
```

### Shared Package Changes Not Reflected

**Symptom**: A service does not pick up changes made in `packages/shared-*`.

**Solution**: Shared packages are copied at build time, not mounted. Rebuild the affected service:

```bash
docker compose -f docker-compose.dev.yml up -d --build <service>
```
