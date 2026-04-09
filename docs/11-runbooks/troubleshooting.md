# Troubleshooting Guide

## Service Won't Start

### Symptoms

- Container status shows `Restarting` or `Exit 1`
- Health check fails repeatedly

### Diagnosis

```bash
# Check container status
docker compose -f docker-compose.dev.yml ps

# Check logs for the failing service
docker logs claw-auth-service --tail=200

# Check if dependencies are healthy
docker inspect --format='{{.State.Health.Status}}' claw-pg-auth
docker inspect --format='{{.State.Health.Status}}' claw-redis
docker inspect --format='{{.State.Health.Status}}' claw-rabbitmq
```

### Common Causes and Fixes

**Missing `.env` file**: Copy `.env.example` to `.env` at the project root.

**Database not ready**: The service started before its PostgreSQL instance was healthy. Restart the service:

```bash
docker compose -f docker-compose.dev.yml restart auth-service
```

**Prisma migration failure**: Check if the migration failed during startup. View the entrypoint logs:

```bash
docker logs claw-auth-service 2>&1 | grep -i "prisma\|migration\|error"
```

**Port already in use**: Another process is using the port. Change the port in `.env` or stop the conflicting process.

**Missing environment variable**: The Zod config validator will show exactly which variable is missing in the logs.

**Node modules out of date**: Rebuild the container:

```bash
docker compose -f docker-compose.dev.yml up -d --build auth-service
```

---

## Database Connection Failures

### Symptoms

- `ECONNREFUSED` or `Connection refused` in service logs
- `FATAL: password authentication failed`
- `FATAL: database "X" does not exist`

### Diagnosis

```bash
# Check if the database container is running
docker compose -f docker-compose.dev.yml ps pg-auth

# Test connection from inside the service container
docker exec -it claw-auth-service sh -c "wget -qO- http://pg-auth:5432 || echo 'Connection test complete'"

# Connect to the database directly
docker exec -it claw-pg-auth psql -U claw -d claw_auth -c "SELECT 1;"
```

### Fixes

**Wrong credentials**: Verify `PG_AUTH_USER`, `PG_AUTH_PASSWORD`, and `PG_AUTH_DB` in `.env` match `AUTH_DATABASE_URL`.

**Database URL uses wrong hostname**: Inside Docker, use the service name (`pg-auth`), not `localhost`. The `*_DATABASE_URL` variables must use the Docker service name as the host.

```
# Correct (Docker internal)
AUTH_DATABASE_URL=postgresql://claw:claw_secret@pg-auth:5432/claw_auth?schema=public

# Wrong (host machine)
AUTH_DATABASE_URL=postgresql://claw:claw_secret@localhost:5441/claw_auth?schema=public
```

**Volume corruption**: Remove the database volume and let it recreate:

```bash
docker compose -f docker-compose.dev.yml stop pg-auth
docker volume rm $(docker volume ls -q | grep pg-auth-data)
docker compose -f docker-compose.dev.yml up -d pg-auth
# Wait for healthy, then restart the service
docker compose -f docker-compose.dev.yml restart auth-service
```

---

## RabbitMQ Connection Issues

### Symptoms

- `ECONNREFUSED` on port 5672
- Services start but events are not published or consumed
- `ACCESS_REFUSED` errors

### Diagnosis

```bash
# Check RabbitMQ container
docker logs claw-rabbitmq --tail=50

# Access management UI
# Open http://localhost:15672 in browser (user: claw, password: claw_secret)

# List exchanges and queues
docker exec -it claw-rabbitmq rabbitmqctl list_exchanges
docker exec -it claw-rabbitmq rabbitmqctl list_queues
```

### Fixes

**RabbitMQ not ready**: It can take 15-30 seconds for RabbitMQ to fully start. Services have retry logic, but you may need to restart them if they started too early.

**Wrong credentials**: Verify `RABBITMQ_USER` and `RABBITMQ_PASSWORD` in `.env` match `RABBITMQ_URL`.

**Exchange not created**: The `claw.events` topic exchange is created by the first service that connects. If all services started before RabbitMQ was ready, restart them:

```bash
docker compose -f docker-compose.dev.yml restart auth-service chat-service connector-service routing-service memory-service
```

**Dead Letter Queue filling up**: Check the DLQ in the management UI. Messages in the DLQ indicate consumer errors. Check the consuming service's logs.

---

## Prisma Migration Failures

### Symptoms

- Service fails to start with migration errors
- `P3009: migrate found failed migrations` error
- `P1001: Can't reach database server`

### Diagnosis

```bash
# Check migration status from inside the container
docker exec -it claw-auth-service npx prisma migrate status

# View migration files
ls apps/claw-auth-service/prisma/migrations/
```

### Fixes

**Failed migration**: Reset the database (DESTRUCTIVE):

```bash
docker exec -it claw-auth-service npx prisma migrate reset --force
```

**Schema drift**: The database schema does not match the Prisma schema. Deploy pending migrations:

```bash
docker exec -it claw-auth-service npx prisma migrate deploy
```

**Database not reachable during migration**: Ensure the PostgreSQL container is healthy before the service starts. The `docker-entrypoint.dev.sh` script runs migrations before starting the app.

---

## SSE Streaming Not Working

### Symptoms

- Chat messages are sent but no AI response appears
- Browser shows pending request that never completes
- `EventSource` errors in browser console

### Diagnosis

```bash
# Check if the SSE endpoint responds
curl -N -H "Authorization: Bearer <token>" http://localhost:4000/api/v1/chat-messages/stream

# Check nginx SSE configuration
docker exec -it claw-nginx cat /etc/nginx/nginx.conf | grep -A 5 "stream"

# Check chat service logs
docker logs claw-chat-service --tail=100 -f
```

### Fixes

**Nginx buffering enabled**: The nginx config must have these settings for SSE endpoints:

```nginx
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_read_timeout 86400;
proxy_buffering off;
proxy_cache off;
```

These are configured for `/api/v1/chat-messages/stream` and `/api/v1/images/` in `infra/nginx/nginx.conf`.

**CORS blocking EventSource**: Ensure `CORS_ORIGINS` in `.env` includes the frontend URL (`http://localhost:3000`).

**Token expired during stream**: Long-running SSE connections may outlast the JWT access token. The frontend should handle token refresh and reconnect.

---

## "Cannot Set Headers" Error

### Symptoms

- `Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`

### Cause

A controller or interceptor is trying to modify the response after it has already been sent. This commonly happens when:

- An SSE endpoint sends data and then an exception filter tries to send an error response
- Middleware runs after the response is already flushed

### Fix

- Ensure SSE endpoints handle errors internally and do not let exceptions propagate to the global filter
- Check for multiple `res.send()` or `res.json()` calls in the same handler
- Review interceptors that may be modifying the response after streaming has begun

---

## AI Provider Failures / Fallback Chain

### Symptoms

- Chat messages fail with "provider unavailable" errors
- Routing decisions show unexpected provider selection
- Responses come from a different model than selected

### Diagnosis

```bash
# Check connector health
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/v1/connectors

# Check routing decisions
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/v1/routing/decisions?limit=10

# Check Ollama status
curl http://localhost:11434/api/tags
```

### Fixes

**Cloud provider API key invalid**: Update the connector configuration with a valid API key. The key is encrypted with AES-256-GCM; re-create the connector if needed.

**Ollama not responding**: Check if the Ollama container is running and models are loaded:

```bash
docker logs claw-ollama --tail=50
docker exec -it claw-ollama ollama list
```

**Fallback chain activated**: When the primary provider fails, the routing service falls back. This is expected behavior. Check the routing decision's `reasonTags` for why the fallback was triggered.

**AUTO mode routing to wrong model**: The Ollama router model may be producing unexpected results. Check `OLLAMA_ROUTER_MODEL` in `.env` (default: `gemma3:4b`). Ensure the model is pulled and responsive.

---

## Token Expiry / Auth Issues

### Symptoms

- 401 Unauthorized responses
- "Token expired" or "Invalid token" errors
- User gets logged out unexpectedly

### Diagnosis

```bash
# Check JWT configuration
grep JWT .env

# Decode a JWT token (without verification)
echo "<token>" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

### Fixes

**Access token expired**: The frontend should automatically refresh using the refresh token. Check that the refresh endpoint is working:

```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh -H "Content-Type: application/json" -d '{"refreshToken": "<token>"}'
```

**Refresh token expired**: User must log in again. Default expiry is 7 days (`JWT_REFRESH_EXPIRY=7d`).

**JWT secret changed**: If `JWT_SECRET` was rotated, all existing tokens are invalidated. Users must log in again.

**Clock skew in containers**: Docker containers share the host clock. If the host clock is significantly wrong, token validation may fail.

---

## Memory Extraction Not Working

### Symptoms

- Messages are sent but no memories are created
- Memory service logs show extraction failures
- Ollama extraction model is not responding

### Diagnosis

```bash
# Check memory service logs
docker logs claw-memory-service --tail=100 -f

# Check if the extraction model is available
docker exec -it claw-ollama ollama list | grep gemma3

# Check RabbitMQ for message.completed events
# Open http://localhost:15672 → Queues → check memory-service queues
```

### Fixes

**Extraction model not pulled**: Ensure the model specified by `MEMORY_EXTRACTION_MODEL` (default: `gemma3:4b`) is available:

```bash
docker exec -it claw-ollama ollama pull gemma3:4b
```

**message.completed events not reaching memory service**: Check RabbitMQ management UI for the memory service's queue bindings. Ensure the `claw.events` exchange exists with topic type.

**Ollama overloaded**: If Ollama is handling chat requests and extraction simultaneously, it may time out. Check resource usage:

```bash
docker stats claw-ollama
```

---

## Ollama Model Not Responding

### Symptoms

- Requests to `/api/v1/ollama/generate` time out
- Local models show as available but generation fails
- Ollama service logs show connection errors

### Diagnosis

```bash
# Check Ollama runtime directly
curl http://localhost:11434/api/tags
curl -X POST http://localhost:11434/api/generate -d '{"model":"gemma3:4b","prompt":"hello","stream":false}'

# Check Ollama container resources
docker stats claw-ollama

# Check ollama-service logs
docker logs claw-ollama-service --tail=100
```

### Fixes

**Model not loaded**: Ollama lazy-loads models into memory on first request. The first request may be slow (10-30 seconds).

**Insufficient RAM**: Ollama needs RAM proportional to model size. If the system runs out of memory, the container may be OOM-killed:

```bash
docker inspect claw-ollama | grep -i oom
```

**Wrong OLLAMA_BASE_URL**: Inside Docker, it should be `http://ollama:11434` (using the Docker service name), not `http://localhost:11434`.

**Model pulled but not synced**: The ollama-service syncs models to its database on startup. Restart the ollama-service to trigger a re-sync:

```bash
docker compose -f docker-compose.dev.yml restart ollama-service
```

---

## Frontend Build Errors

### Symptoms

- `next build` fails
- TypeScript errors in the frontend
- Missing module errors

### Diagnosis

```bash
# Run typecheck
npm run typecheck --workspace=apps/claw-frontend

# Run build locally
npm run build --workspace=apps/claw-frontend

# Check for import errors
npm run lint --workspace=apps/claw-frontend
```

### Fixes

**Missing type definitions**: Ensure backend DTO changes are reflected in `apps/claw-frontend/src/types/`.

**Environment variable missing**: Next.js requires `NEXT_PUBLIC_*` variables at build time. Check `.env` for `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`.

**Stale node_modules**: Delete and reinstall:

```bash
rm -rf apps/claw-frontend/node_modules
npm install
```

---

## Container Health Check Failures

### Symptoms

- `docker compose ps` shows containers as `unhealthy`
- Dependent containers fail to start because upstreams are unhealthy

### Understanding Health Check Timing

Backend services have:

- `start_period: 45s` (grace period before health checks count)
- `interval: 15s` (time between checks)
- `retries: 10` (failures before marking unhealthy)

This means a service has up to 45s + (15s x 10) = **195 seconds** to become healthy.

### Diagnosis

```bash
# Check health check history
docker inspect --format='{{json .State.Health}}' claw-chat-service | python3 -m json.tool

# Manually run the health check
docker exec -it claw-chat-service wget -qO- http://localhost:4002/api/v1/health
```

### Fixes

**Slow startup on first run**: Database migrations and Prisma client generation take time on first boot. Wait for the start period to elapse.

**Health endpoint not implemented**: Every service must expose `GET /api/v1/health` that returns 200. Verify the endpoint exists.

**Service crashed after startup**: Check logs for runtime errors that caused the process to exit after initially becoming healthy.

---

## Common Error Codes

| Error Code                 | Service   | Meaning                                    | Resolution                              |
| -------------------------- | --------- | ------------------------------------------ | --------------------------------------- |
| `AUTH_INVALID_CREDENTIALS` | auth      | Wrong email or password                    | Verify credentials                      |
| `AUTH_TOKEN_EXPIRED`       | auth      | JWT access token has expired               | Refresh the token                       |
| `AUTH_REFRESH_EXPIRED`     | auth      | Refresh token has expired                  | Log in again                            |
| `AUTH_FORBIDDEN`           | auth      | User lacks required role                   | Check RBAC role assignment              |
| `ENTITY_NOT_FOUND`         | any       | Requested resource does not exist          | Verify the ID and ownership             |
| `CONNECTOR_TEST_FAILED`    | connector | Provider API key or endpoint is invalid    | Re-check connector configuration        |
| `ROUTING_NO_PROVIDER`      | routing   | No provider available for the routing mode | Add a connector or change routing mode  |
| `ROUTING_TIMEOUT`          | routing   | Ollama router timed out (AUTO mode)        | Heuristic fallback should activate      |
| `FILE_TOO_LARGE`           | file      | Upload exceeds size limit                  | Reduce file size or increase limit      |
| `FILE_UNSUPPORTED_TYPE`    | file      | MIME type not in allowed list              | Use a supported file type               |
| `OLLAMA_MODEL_NOT_FOUND`   | ollama    | Requested model not available locally      | Pull the model first                    |
| `OLLAMA_GENERATION_FAILED` | ollama    | Ollama failed to generate a response       | Check Ollama container and model status |
| `MEMORY_EXTRACTION_FAILED` | memory    | Failed to extract memories from message    | Check extraction model availability     |
