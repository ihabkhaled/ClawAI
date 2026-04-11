# Docker Compose Reference

> All 8 compose files, their purpose, and when to use each one.

---

## 1. Compose File Inventory

ClawAI has 8 Docker Compose files for different environments and configurations:

| File                              | Purpose                                      | Usage                          |
| --------------------------------- | -------------------------------------------- | ------------------------------ |
| `docker-compose.dev.yml`          | Full dev stack (single file, ~28 containers) | Primary development            |
| `docker-compose.dev.databases.yml`| Dev databases only (9 PG + MongoDB + Redis + RabbitMQ) | Split mode (claw.sh) |
| `docker-compose.dev.services.yml` | Dev backend services + nginx + frontend      | Split mode (claw.sh)           |
| `docker-compose.dev.ollama.yml`   | Dev Ollama container                         | Split mode (claw.sh)           |
| `docker-compose.yml`             | Full prod stack (single file)                | Production deployment          |
| `docker-compose.prod.databases.yml` | Prod databases only                       | Split mode (claw.sh --prod)    |
| `docker-compose.prod.services.yml`  | Prod backend services + nginx + frontend  | Split mode (claw.sh --prod)    |
| `docker-compose.prod.ollama.yml`    | Prod Ollama container                     | Split mode (claw.sh --prod)    |

### Single File vs Split Mode

**Single file** (`docker-compose.dev.yml`): Simplest approach. One command starts everything:
```bash
docker compose -f docker-compose.dev.yml up -d
```

**Split mode** (`claw.sh`): The management script uses separate compose files for databases, services, and Ollama. This allows starting/stopping each layer independently:
```bash
./scripts/claw.sh up        # Starts all layers in order
./scripts/claw.sh status    # Shows status of all layers
```

---

## 2. Service Definitions

### Infrastructure Services

All compose files define the same infrastructure services:

| Service              | Image                        | Port Mapping    | Volume             | Health Check                    |
| -------------------- | ---------------------------- | --------------- | ------------------ | ------------------------------- |
| `pg-auth`            | pgvector/pgvector:pg16       | 5441:5432       | pg-auth-data       | `pg_isready` (10s interval)     |
| `pg-chat`            | pgvector/pgvector:pg16       | 5442:5432       | pg-chat-data       | `pg_isready`                    |
| `pg-connector`       | pgvector/pgvector:pg16       | 5443:5432       | pg-connector-data  | `pg_isready`                    |
| `pg-routing`         | pgvector/pgvector:pg16       | 5444:5432       | pg-routing-data    | `pg_isready`                    |
| `pg-memory`          | pgvector/pgvector:pg16       | 5445:5432       | pg-memory-data     | `pg_isready`                    |
| `pg-files`           | pgvector/pgvector:pg16       | 5446:5432       | pg-files-data      | `pg_isready`                    |
| `pg-ollama`          | pgvector/pgvector:pg16       | 5447:5432       | pg-ollama-data     | `pg_isready`                    |
| `pg-images`          | pgvector/pgvector:pg16       | 5448:5432       | pg-images-data     | `pg_isready`                    |
| `pg-file-generations`| pgvector/pgvector:pg16       | 5449:5432       | pg-file-gen-data   | `pg_isready`                    |
| `mongodb`            | mongo:7                      | 27018:27017     | mongo-data         | `mongosh --eval "db.runCommand('ping')"` |
| `redis`              | redis:7-alpine               | 6380:6379       | redis-data         | `redis-cli ping`                |
| `rabbitmq`           | rabbitmq:3-management-alpine | 5672,15672      | rabbitmq-data      | `rabbitmq-diagnostics check_running` |

### Backend Services

| Service                    | Dockerfile                | Port  | Depends On                          |
| -------------------------- | ------------------------- | ----- | ----------------------------------- |
| `auth-service`             | Dockerfile.dev            | 4001  | pg-auth, redis, rabbitmq            |
| `chat-service`             | Dockerfile.dev            | 4002  | pg-chat, redis, rabbitmq            |
| `connector-service`        | Dockerfile.dev            | 4003  | pg-connector, redis, rabbitmq       |
| `routing-service`          | Dockerfile.dev            | 4004  | pg-routing, redis, rabbitmq         |
| `memory-service`           | Dockerfile.dev            | 4005  | pg-memory, redis, rabbitmq          |
| `file-service`             | Dockerfile.dev            | 4006  | pg-files, redis, rabbitmq           |
| `audit-service`            | Dockerfile.dev            | 4007  | mongodb, redis, rabbitmq            |
| `ollama-service`           | Dockerfile.dev            | 4008  | pg-ollama, redis, rabbitmq          |
| `health-service`           | Dockerfile.dev            | 4009  | redis, rabbitmq                     |
| `client-logs-service`      | Dockerfile.dev            | 4010  | mongodb, redis, rabbitmq            |
| `server-logs-service`      | Dockerfile.dev            | 4011  | mongodb, redis, rabbitmq            |
| `image-service`            | Dockerfile.dev            | 4012  | pg-images, redis, rabbitmq          |
| `file-generation-service`  | Dockerfile.dev            | 4013  | pg-file-generations, redis, rabbitmq |

### Proxy and Frontend

| Service     | Image/Build        | Port  | Depends On                        |
| ----------- | ------------------ | ----- | --------------------------------- |
| `nginx`     | nginx:alpine       | 4000  | All backend services (healthy)    |
| `frontend`  | Custom (Next.js)   | 3000  | nginx (service_started)           |

---

## 3. Network Configuration

All containers connect to a single bridge network:

```yaml
networks:
  claw-network:
    driver: bridge
```

Services communicate using Docker DNS hostnames that match the service name. The nginx resolver uses Docker's internal DNS (`127.0.0.11`) with 5-second TTL.

---

## 4. Volume Definitions

### Named Volumes (14 total)

```yaml
volumes:
  pg-auth-data:
  pg-chat-data:
  pg-connector-data:
  pg-routing-data:
  pg-memory-data:
  pg-files-data:
  pg-ollama-data:
  pg-images-data:
  pg-file-generations-data:
  mongo-data:
  redis-data:
  rabbitmq-data:
  ollama-data:
  file-storage-data:
```

### Host Mounts (Dev Only)

Backend services mount source code for hot reload:
```yaml
volumes:
  - ./apps/claw-auth-service/src:/app/apps/claw-auth-service/src
  - ./apps/claw-auth-service/prisma:/app/apps/claw-auth-service/prisma
```

Frontend mounts source and public:
```yaml
volumes:
  - ./apps/claw-frontend/src:/app/src
  - ./apps/claw-frontend/public:/app/public
```

Nginx config is mounted read-only:
```yaml
volumes:
  - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

---

## 5. Environment Variables

All services use `env_file: .env` from the repository root. The single `.env` file contains all configuration for all services.

Database container environment variables use interpolation:
```yaml
environment:
  POSTGRES_USER: ${PG_AUTH_USER}
  POSTGRES_PASSWORD: ${PG_AUTH_PASSWORD}
  POSTGRES_DB: ${PG_AUTH_DB}
```

---

## 6. Health Check Configuration

### Database Health Checks

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${PG_AUTH_USER} -d ${PG_AUTH_DB}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Backend Service Health Checks

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:4001/api/v1/health"]
  interval: 15s
  timeout: 10s
  retries: 10
  start_period: 45s
```

### Startup Order

Dependencies use `condition: service_healthy` to ensure correct startup order:

```
Layer 1: All databases, Redis, RabbitMQ, Ollama (no dependencies)
Layer 2: All backend services (depend on their database + redis + rabbitmq)
Layer 3: Nginx (depends on all backend services being healthy)
Layer 4: Frontend (depends on nginx being started)
```

---

## 7. Dev vs Prod Differences

| Aspect                  | Development                        | Production                      |
| ----------------------- | ---------------------------------- | ------------------------------- |
| Dockerfile              | `Dockerfile.dev`                   | `Dockerfile`                    |
| Hot reload              | Source mounted, `node --watch`     | Built image, no mounts          |
| Build target            | Dev dependencies included          | Only production deps            |
| Next.js                 | Turbopack dev server               | Optimized production build      |
| Source maps             | Enabled                            | Disabled                        |
| Port exposure           | All ports exposed to host          | Only nginx (4000) exposed       |
| Restart policy          | `restart: unless-stopped`          | `restart: always`               |

---

## 8. Common Operations

```bash
# Start everything (dev)
docker compose -f docker-compose.dev.yml up -d

# Stop everything
docker compose -f docker-compose.dev.yml down

# Stop and delete all data
docker compose -f docker-compose.dev.yml down -v

# Restart a single service
docker compose -f docker-compose.dev.yml restart chat-service

# Rebuild and restart a single service
docker compose -f docker-compose.dev.yml up -d --build chat-service

# View logs
docker compose -f docker-compose.dev.yml logs -f chat-service

# Check status
docker compose -f docker-compose.dev.yml ps

# Start with management script
./scripts/claw.sh up
./scripts/claw.sh status
./scripts/claw.sh down
```
