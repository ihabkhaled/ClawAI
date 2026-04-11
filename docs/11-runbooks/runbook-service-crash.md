# Runbook: Service Crash Recovery

## Symptoms

- Service returns 502/503 from Nginx
- Health endpoint reports service as unhealthy
- Docker container in "Restarting" or "Exited" state
- Frontend shows "Service unavailable" errors

## Diagnosis Steps

### 1. Check Container Status

```bash
# See all containers and their states
docker compose -f docker-compose.dev.yml ps

# Check specific service
docker compose -f docker-compose.dev.yml ps chat-service
```

Look for:
- **Exited (1)**: Application error (bad code, unhandled exception)
- **Exited (137)**: OOM killed (out of memory)
- **Restarting**: Crash loop (failing on startup repeatedly)

### 2. Read Container Logs

```bash
# Last 100 lines of a specific service
docker compose -f docker-compose.dev.yml logs --tail=100 chat-service

# Follow logs in real time
docker compose -f docker-compose.dev.yml logs -f chat-service

# Logs since a specific time
docker compose -f docker-compose.dev.yml logs --since 5m chat-service
```

Look for:
- `Error: listen EADDRINUSE` -- port conflict
- `Error: connect ECONNREFUSED` -- dependency not ready
- `PrismaClientInitializationError` -- database connection failed
- `SIGTERM` / `SIGKILL` -- container was killed
- `JavaScript heap out of memory` -- OOM in Node.js

### 3. Check Dependencies

```bash
# Is the database running?
docker compose -f docker-compose.dev.yml ps postgres-chat

# Is RabbitMQ running?
docker compose -f docker-compose.dev.yml ps rabbitmq

# Is Redis running?
docker compose -f docker-compose.dev.yml ps redis
```

### 4. Check Resource Usage

```bash
# Container resource usage
docker stats --no-stream

# Check disk space
docker system df
```

## Recovery Procedures

### Simple Restart (Most Common)

For code-related crashes or transient failures:

```bash
docker compose -f docker-compose.dev.yml restart chat-service
```

Wait 10-15 seconds, then verify:

```bash
docker compose -f docker-compose.dev.yml ps chat-service
# Should show "Up" and "(healthy)"
```

### Restart with Fresh Logs

```bash
docker compose -f docker-compose.dev.yml restart chat-service
docker compose -f docker-compose.dev.yml logs -f chat-service
```

Watch for successful startup messages:
- `Nest application successfully started`
- `Connected to database`
- `RabbitMQ connection established`

### Full Rebuild (Dependency Changes)

If `package.json` or `Dockerfile` changed:

```bash
docker compose -f docker-compose.dev.yml up -d --build chat-service
```

### Database Migration Issue

If the crash is caused by a schema mismatch:

```bash
# Check migration status
docker compose -f docker-compose.dev.yml exec chat-service npx prisma migrate status

# Run pending migrations
docker compose -f docker-compose.dev.yml exec chat-service npx prisma migrate deploy
```

### OOM Kill Recovery

If `docker stats` shows high memory usage:

1. Check for memory leaks in the service code (common: unclosed streams, growing arrays)
2. Increase container memory limit in `docker-compose.dev.yml`:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 1G
   ```
3. Restart: `docker compose -f docker-compose.dev.yml up -d chat-service`

### Nuclear Option (Full Stack Restart)

If multiple services are affected:

```bash
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

This restarts everything. Databases retain data (volumes persist). Services take 30-60 seconds to become healthy.

## Prevention

- **Health checks**: Every service has a Docker healthcheck. Monitor via `docker compose ps`.
- **Structured logging**: All services log to stdout in JSON format. Use `docker compose logs` to investigate.
- **Graceful shutdown**: Services handle SIGTERM to close connections cleanly.
- **Dependency ordering**: `depends_on` with health checks ensures services start in the right order.
- **Auto-restart**: Docker Compose `restart: unless-stopped` automatically restarts crashed containers.

## Escalation

If the service crashes repeatedly after restart:

1. Check for recent code changes: `git log --oneline -5`
2. Revert the last commit: `git revert HEAD`
3. Rebuild and restart the affected service
4. Investigate the reverted commit for the root cause
