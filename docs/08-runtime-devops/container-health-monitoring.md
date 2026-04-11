# Container Health Monitoring

> Health checks, aggregated health service, service dependencies, and troubleshooting.

---

## 1. Health Check Architecture

ClawAI uses a two-tier health check system:

1. **Docker health checks**: Each container has its own health check command. Docker marks containers as `healthy`, `unhealthy`, or `starting`.
2. **Aggregated health service**: The health-service (port 4009) queries all other services and provides a unified health endpoint.

---

## 2. Docker Health Checks by Container Type

### PostgreSQL Databases

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${PG_AUTH_USER} -d ${PG_AUTH_DB}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

All 9 PostgreSQL instances use `pg_isready` with service-specific user and database.

### MongoDB

```yaml
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.runCommand('ping').ok"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Redis

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### RabbitMQ

```yaml
healthcheck:
  test: ["CMD", "rabbitmq-diagnostics", "check_running"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Backend Services (NestJS)

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:PORT/api/v1/health"]
  interval: 15s
  timeout: 10s
  retries: 10
  start_period: 45s
```

Each service exposes a `/api/v1/health` endpoint that returns basic health information. The `start_period: 45s` gives services time to start up, run Prisma migrations, and initialize before health checks begin.

### Ollama

```yaml
healthcheck:
  test: ["CMD", "ollama", "list"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 30s
```

Ollama health check verifies the runtime can list models. The longer interval (30s) is appropriate since Ollama startup includes model loading.

---

## 3. Startup Order and Dependencies

Docker Compose uses `depends_on` with `condition: service_healthy` to enforce startup order:

```
Layer 1 (no dependencies):
  All 9 PostgreSQL instances
  MongoDB
  Redis
  RabbitMQ
  Ollama

Layer 2 (depends on databases + infra being healthy):
  auth-service      --> pg-auth, redis, rabbitmq
  chat-service      --> pg-chat, redis, rabbitmq
  connector-service --> pg-connector, redis, rabbitmq
  routing-service   --> pg-routing, redis, rabbitmq
  memory-service    --> pg-memory, redis, rabbitmq
  file-service      --> pg-files, redis, rabbitmq
  audit-service     --> mongodb, redis, rabbitmq
  ollama-service    --> pg-ollama, redis, rabbitmq
  image-service     --> pg-images, redis, rabbitmq
  file-generation-service --> pg-file-generations, redis, rabbitmq
  health-service    --> redis, rabbitmq
  client-logs-service --> mongodb, redis, rabbitmq
  server-logs-service --> mongodb, redis, rabbitmq

Layer 3 (depends on all services being healthy):
  nginx --> all 13 backend services

Layer 4 (depends on proxy being started):
  frontend --> nginx (service_started, not health check)
```

---

## 4. Aggregated Health Service

The health-service (port 4009) aggregates health from all other services via HTTP checks.

### Endpoint

```
GET /api/v1/health
```

### Response

```json
{
  "status": "HEALTHY",
  "timestamp": "2026-04-11T10:30:00.000Z",
  "services": {
    "auth": { "status": "HEALTHY", "responseTime": 12 },
    "chat": { "status": "HEALTHY", "responseTime": 15 },
    "connector": { "status": "HEALTHY", "responseTime": 10 },
    "routing": { "status": "HEALTHY", "responseTime": 8 },
    "memory": { "status": "HEALTHY", "responseTime": 11 },
    "file": { "status": "HEALTHY", "responseTime": 9 },
    "audit": { "status": "HEALTHY", "responseTime": 14 },
    "ollama": { "status": "HEALTHY", "responseTime": 22 },
    "client-logs": { "status": "HEALTHY", "responseTime": 7 },
    "server-logs": { "status": "HEALTHY", "responseTime": 8 },
    "image": { "status": "HEALTHY", "responseTime": 13 },
    "file-generation": { "status": "HEALTHY", "responseTime": 10 }
  }
}
```

### Status Definitions

| Status      | Meaning                                           |
| ----------- | ------------------------------------------------- |
| `HEALTHY`   | All services responding normally                  |
| `DEGRADED`  | Some services unhealthy but core functionality OK |
| `UNHEALTHY` | Critical services down                            |

### Frontend Observability Page

The `/observability` page in the frontend displays this data in a dashboard with:
- Overall system status
- Per-service health indicators
- Response times
- Status history

---

## 5. Checking Health

### Docker CLI

```bash
# All container statuses
docker compose -f docker-compose.dev.yml ps

# Specific container health details
docker inspect --format='{{json .State.Health}}' claw-chat-service | jq

# Last health check output
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' claw-auth-service
```

### API

```bash
# Aggregated health (via nginx)
curl http://localhost:4000/api/v1/health | jq

# Individual service health (direct)
curl http://localhost:4001/api/v1/health  # auth
curl http://localhost:4002/api/v1/health  # chat
curl http://localhost:4003/api/v1/health  # connector
# ... (ports 4001-4013)
```

### Management Script

```bash
./scripts/claw.sh status
```

---

## 6. Troubleshooting Unhealthy Containers

### Service in "Starting" for Too Long

The start_period is 45 seconds. If a service stays in "starting" beyond that:

1. Check logs: `docker compose logs <service> --tail=50`
2. Common causes:
   - Database not ready (dependency not healthy)
   - Prisma migration failure
   - Missing environment variables
   - Port conflict

### Service Marked "Unhealthy"

1. Check the health check output:
   ```bash
   docker inspect --format='{{json .State.Health.Log}}' claw-<service> | jq '.[0]'
   ```

2. Check service logs for errors:
   ```bash
   docker compose logs <service> --tail=100
   ```

3. Common causes:
   - Application crash loop (check stack traces in logs)
   - Database connection failure
   - RabbitMQ connection failure
   - Out of memory

### Nginx Starts but Returns 502

Nginx depends on all services being healthy. If it starts but returns 502:

1. A service became unhealthy after nginx started
2. DNS resolution failed for the service hostname
3. The service is running but its `/api/v1/health` endpoint fails

Fix:
```bash
# Check which service is unhealthy
docker compose ps

# Restart the unhealthy service
docker compose restart <service-name>

# If nginx DNS is stale, restart it too
docker compose restart nginx
```

### All Services Unhealthy After System Restart

After a system reboot, Docker volumes persist but containers need to start fresh:

```bash
# Start in dependency order (Docker handles this automatically)
docker compose -f docker-compose.dev.yml up -d

# Wait for health checks
docker compose -f docker-compose.dev.yml ps
# Repeat until all show (healthy)
```

---

## 7. Health Check Timing Reference

| Container Type    | Interval | Timeout | Retries | Start Period | Max Startup Time |
| ----------------- | -------- | ------- | ------- | ------------ | ---------------- |
| PostgreSQL        | 10s      | 5s      | 5       | 0s           | 50s              |
| MongoDB           | 10s      | 5s      | 5       | 0s           | 50s              |
| Redis             | 10s      | 5s      | 5       | 0s           | 50s              |
| RabbitMQ          | 10s      | 5s      | 5       | 0s           | 50s              |
| Ollama            | 30s      | 10s     | 5       | 30s          | 180s             |
| Backend services  | 15s      | 10s     | 10      | 45s          | 195s             |
