# Operational Runbooks

## Adding a New AI Provider

### Overview

ClawAI supports cloud AI providers through the connector system. Adding a new provider requires backend changes to the connector and chat services, plus frontend updates.

### Steps

1. **Add the provider enum value**

   File: `packages/shared-types/src/enums/provider.enum.ts`

   Add the new provider to the `Provider` enum (e.g., `MISTRAL = 'MISTRAL'`).

2. **Implement the provider adapter**

   File: `apps/claw-connector-service/src/modules/connectors/adapters/<provider>.adapter.ts`

   Implement the adapter interface with methods for:
   - `testConnection()` — verify the API key works
   - `listModels()` — fetch available models from the provider API
   - `healthCheck()` — check provider availability

3. **Add provider execution to chat service**

   File: `apps/claw-chat-service/src/modules/chat-messages/managers/chat-execution.manager.ts`

   Add a case for the new provider in the execution switch. Implement the API call using the provider's SDK or HTTP API (wrapped in a utility file).

4. **Update routing rules**

   File: `apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts`

   Add the new provider to the allowlist for AUTO mode routing. Define when the router should select this provider.

5. **Update the frontend**
   - Add the provider to the connector creation form
   - Add the provider icon/logo
   - Update i18n files (all 8 locales) with the provider name

6. **Add tests**
   - Adapter unit tests (connector service)
   - Execution unit tests (chat service)
   - DTO validation tests

7. **Update documentation**
   - Update `CLAUDE.md` routing tables
   - Update architecture docs if the provider has unique characteristics

---

## Adding a New Backend Service

### Overview

Adding a new microservice to the ClawAI platform.

### Steps

1. **Create the service directory**

   ```bash
   mkdir -p apps/claw-<name>-service/src
   ```

   Copy the structure from an existing service (e.g., `claw-health-service` for a simple service, `claw-auth-service` for one with Prisma).

2. **Set up the NestJS application**

   Required files:
   - `src/main.ts` — bootstrap with Helmet, validation pipe, global filters
   - `src/app/app.module.ts` — root module
   - `src/app/app.controller.ts` — health endpoint
   - `src/modules/<domain>/` — domain module with controller, service, repository
   - `package.json` — with workspace scripts (dev, build, lint, test, typecheck)
   - `tsconfig.json`, `tsconfig.build.json` — TypeScript config
   - `eslint.config.mjs` — ESLint flat config (copy from existing service)
   - `Dockerfile.dev` — development Dockerfile
   - `docker-entrypoint.dev.sh` — if using Prisma

3. **If the service needs a database**

   PostgreSQL:
   - Create `prisma/schema.prisma` with the data model
   - Add PG container to `docker-compose.dev.yml`
   - Add `PG_<NAME>_USER`, `PG_<NAME>_PASSWORD`, `PG_<NAME>_DB`, `PG_<NAME>_PORT` to `.env.example` and `.env`
   - Add `<NAME>_DATABASE_URL` to `.env.example` and `.env`
   - Add named volume for the database

   MongoDB:
   - Add `<NAME>_MONGODB_URI` to `.env.example` and `.env`

4. **Add to Docker Compose**

   Add the service container to `docker-compose.dev.yml`:
   - Build context and Dockerfile
   - Port mapping
   - Volume mounts (src/ and prisma/ if applicable)
   - Dependencies (database, redis, rabbitmq)
   - Health check
   - Network: `claw-network`

5. **Add Nginx route**

   File: `infra/nginx/nginx.conf`

   Add a location block for the service's API path:

   ```nginx
   location /api/v1/<endpoint> {
       set $backend http://<name>-service:<port>;
       proxy_pass $backend;
   }
   ```

   Add the service to nginx's `depends_on` list.

6. **Add to shared packages**
   - Add the port to `packages/shared-constants/`
   - Add event types to `packages/shared-types/` if the service publishes events

7. **Update all configuration files**

   Follow the Mandatory Change Checklist in `CLAUDE.md`:
   - `.env.example` and `.env`
   - `scripts/install.sh` and `scripts/install.ps1`
   - Docker Compose files
   - `CLAUDE.md`

8. **Add to CI pipeline**

   If the service uses Prisma, add it to the Prisma generate loop in `.github/workflows/ci.yml`.

9. **Add tests**

   At minimum: `app.spec.ts` for bootstrap verification.

---

## Database Backup and Restore

### PostgreSQL Backup

```bash
# Backup a single database
docker exec claw-pg-auth pg_dump -U claw -d claw_auth > backup_auth_$(date +%Y%m%d).sql

# Backup all PostgreSQL databases
for svc in auth chat connector routing memory files ollama images file-generations; do
  docker exec claw-pg-${svc} pg_dump -U claw -d claw_${svc} > backup_${svc}_$(date +%Y%m%d).sql
done
```

### PostgreSQL Restore

```bash
# Restore a single database
docker exec -i claw-pg-auth psql -U claw -d claw_auth < backup_auth_20260409.sql

# Full restore (drop and recreate)
docker exec claw-pg-auth psql -U claw -d postgres -c "DROP DATABASE IF EXISTS claw_auth;"
docker exec claw-pg-auth psql -U claw -d postgres -c "CREATE DATABASE claw_auth;"
docker exec -i claw-pg-auth psql -U claw -d claw_auth < backup_auth_20260409.sql
```

### MongoDB Backup

```bash
# Backup all MongoDB databases
docker exec claw-mongodb mongodump --username claw --password claw_secret --authenticationDatabase admin --out /data/backup

# Copy backup to host
docker cp claw-mongodb:/data/backup ./mongo_backup_$(date +%Y%m%d)
```

### MongoDB Restore

```bash
# Copy backup into container
docker cp ./mongo_backup_20260409 claw-mongodb:/data/backup

# Restore
docker exec claw-mongodb mongorestore --username claw --password claw_secret --authenticationDatabase admin /data/backup
```

---

## Rotating JWT Secrets

### Impact

Rotating the JWT secret invalidates ALL existing access tokens and refresh tokens. All users will be logged out.

### Steps

1. **Generate a new secret**

   ```bash
   openssl rand -hex 32
   ```

2. **Update `.env`**

   ```
   JWT_SECRET=<new-64-char-hex-string>
   ```

3. **Restart all backend services**

   ```bash
   docker compose -f docker-compose.dev.yml restart auth-service chat-service connector-service routing-service memory-service file-service audit-service ollama-service health-service client-logs-service server-logs-service image-service
   ```

4. **Clear expired sessions (optional)**

   The auth service stores refresh tokens in the database. Old sessions will fail validation naturally, but you can clean them up:

   ```bash
   docker exec -it claw-pg-auth psql -U claw -d claw_auth -c "DELETE FROM \"Session\" WHERE \"expiresAt\" < NOW();"
   ```

5. **Notify users** that they need to log in again.

---

## Rotating Encryption Keys

### Impact

The encryption key (`ENCRYPTION_KEY`) is used for AES-256-GCM encryption of connector API keys. Rotating this key requires re-encrypting all existing connector configurations.

### CAUTION

This is a high-risk operation. Incorrect execution will make all connector API keys unreadable.

### Steps

1. **Export current connector configs** (while old key is active):

   ```bash
   # Use the connector service API to list all connectors
   curl -H "Authorization: Bearer <admin-token>" http://localhost:4000/api/v1/connectors
   ```

   Record the decrypted API keys for each connector.

2. **Generate a new key**

   ```bash
   openssl rand -hex 32
   ```

3. **Update `.env`**

   ```
   ENCRYPTION_KEY=<new-64-char-hex-string>
   ```

4. **Restart the connector service**

   ```bash
   docker compose -f docker-compose.dev.yml restart connector-service
   ```

5. **Re-create or update each connector** with its API key, which will be encrypted with the new key.

---

## Scaling Services

### Horizontal Scaling (Multiple Instances)

ClawAI services are stateless (state is in databases and RabbitMQ) and can be scaled horizontally. In Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up -d --scale chat-service=3
```

When scaling, consider:

- **Nginx load balancing**: The default config uses a single upstream. For multiple instances, add an `upstream` block with multiple servers.
- **RabbitMQ consumers**: Multiple instances will compete for messages (round-robin), which is the desired behavior.
- **SSE connections**: Each instance handles its own SSE connections. The frontend must reconnect to the same instance or use Redis pub/sub for cross-instance notification.

### Vertical Scaling

Adjust container resource limits in `docker-compose.dev.yml`:

```yaml
services:
  chat-service:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
```

---

## Monitoring Health

### Aggregated Health Check

The health service aggregates status from all other services:

```bash
curl http://localhost:4000/api/v1/health
```

### Per-Service Health

```bash
# Direct to service (bypassing nginx)
curl http://localhost:4001/api/v1/health  # auth
curl http://localhost:4002/api/v1/health  # chat
curl http://localhost:4003/api/v1/health  # connector
curl http://localhost:4004/api/v1/health  # routing
curl http://localhost:4005/api/v1/health  # memory
curl http://localhost:4006/api/v1/health  # file
curl http://localhost:4007/api/v1/health  # audit
curl http://localhost:4008/api/v1/health  # ollama
curl http://localhost:4009/api/v1/health  # health
curl http://localhost:4010/api/v1/health  # client-logs
curl http://localhost:4011/api/v1/health  # server-logs
curl http://localhost:4012/api/v1/health  # image
```

### Infrastructure Health

```bash
# RabbitMQ management UI
# Open http://localhost:15672 (claw / claw_secret)

# Redis
docker exec -it claw-redis redis-cli ping

# MongoDB
docker exec -it claw-mongodb mongosh --eval "db.runCommand('ping')" --quiet

# Ollama
curl http://localhost:11434/api/tags

# Docker container status
docker compose -f docker-compose.dev.yml ps
docker stats --no-stream
```

---

## Log Analysis

### Viewing Service Logs

```bash
# Real-time logs
docker logs claw-chat-service -f --tail=100

# Filter by log level (services use Pino JSON format)
docker logs claw-chat-service 2>&1 | grep '"level":50'  # errors
docker logs claw-chat-service 2>&1 | grep '"level":40'  # warnings

# Search for a specific request ID
docker logs claw-chat-service 2>&1 | grep '<request-id>'
```

### Centralized Logs

Server logs are sent to the server-logs service via RabbitMQ (`log.server` events). Query them via the API:

```bash
curl -H "Authorization: Bearer <token>" "http://localhost:4000/api/v1/server-logs?level=error&limit=50"
```

Client logs are sent from the frontend to the client-logs service:

```bash
curl -H "Authorization: Bearer <token>" "http://localhost:4000/api/v1/client-logs?level=error&limit=50"
```

### Audit Trail

All significant actions are recorded in the audit service:

```bash
curl -H "Authorization: Bearer <token>" "http://localhost:4000/api/v1/audits?action=user.login&limit=20"
curl -H "Authorization: Bearer <token>" "http://localhost:4000/api/v1/usage?limit=20"
```

### Log Retention

MongoDB logs have a 30-day TTL (Time-To-Live). Documents are automatically deleted after 30 days.

---

## Incident Response Flow

### 1. Detect

- Health service reports a service as unhealthy
- Error rate spikes in audit logs
- User reports feature is broken
- RabbitMQ management UI shows growing queue depth

### 2. Triage

Determine the blast radius:

- Which service is affected?
- Which other services depend on it?
- Are users currently impacted?

### 3. Contain

```bash
# If a service is causing cascading failures, stop it
docker compose -f docker-compose.dev.yml stop <service>

# Check if dependent services recover
docker compose -f docker-compose.dev.yml ps
```

### 4. Diagnose

```bash
# Collect logs from the affected service
docker logs claw-<service> --since="2026-04-09T10:00:00" > incident_logs.txt

# Check resource usage
docker stats claw-<service> --no-stream

# Check database state
docker exec -it claw-pg-<service> psql -U claw -d claw_<service>
```

### 5. Resolve

Apply the fix (restart, rollback, configuration change, code fix).

```bash
# Restart
docker compose -f docker-compose.dev.yml restart <service>

# Rebuild and restart
docker compose -f docker-compose.dev.yml up -d --build <service>
```

### 6. Verify

```bash
# Check health
curl http://localhost:4000/api/v1/health

# Check that the specific feature works
# Run relevant API calls or UI tests
```

### 7. Document

Record in the audit log or team communication:

- What happened
- What was the root cause
- What was the fix
- What can prevent recurrence

---

## Data Cleanup

### Expired Sessions

Sessions that have passed their `expiresAt` date should be cleaned up periodically:

```bash
docker exec -it claw-pg-auth psql -U claw -d claw_auth -c "DELETE FROM \"Session\" WHERE \"expiresAt\" < NOW();"
```

### Old Log Entries

MongoDB logs have automatic TTL cleanup (30 days). To manually clean older data:

```bash
# Client logs
docker exec -it claw-mongodb mongosh --eval "
  use claw_client_logs;
  db.clientlogs.deleteMany({ createdAt: { \$lt: new Date(Date.now() - 30*24*60*60*1000) } });
" --username claw --password claw_secret --authenticationDatabase admin

# Server logs
docker exec -it claw-mongodb mongosh --eval "
  use claw_server_logs;
  db.serverlogs.deleteMany({ createdAt: { \$lt: new Date(Date.now() - 30*24*60*60*1000) } });
" --username claw --password claw_secret --authenticationDatabase admin
```

### Orphaned Files

Files that were uploaded but not attached to any message:

```bash
docker exec -it claw-pg-files psql -U claw -d claw_files -c "
  SELECT id, filename, \"createdAt\"
  FROM \"File\"
  WHERE id NOT IN (SELECT \"fileId\" FROM \"MessageAttachment\")
  AND \"createdAt\" < NOW() - INTERVAL '30 days';
"
```

Review the list before deleting. To delete:

```bash
docker exec -it claw-pg-files psql -U claw -d claw_files -c "
  DELETE FROM \"File\"
  WHERE id NOT IN (SELECT \"fileId\" FROM \"MessageAttachment\")
  AND \"createdAt\" < NOW() - INTERVAL '30 days';
"
```

### Audit Log Archival

Audit logs grow indefinitely in MongoDB. For long-term retention, export before cleaning:

```bash
# Export old audit logs
docker exec claw-mongodb mongodump --username claw --password claw_secret --authenticationDatabase admin --db claw_audit --query '{"createdAt": {"$lt": {"$date": "2026-01-01T00:00:00Z"}}}' --out /data/archive

# Copy to host
docker cp claw-mongodb:/data/archive ./audit_archive_$(date +%Y%m%d)

# Then delete old entries
docker exec -it claw-mongodb mongosh --eval "
  use claw_audit;
  db.auditlogs.deleteMany({ createdAt: { \$lt: new ISODate('2026-01-01') } });
" --username claw --password claw_secret --authenticationDatabase admin
```

---

## RabbitMQ Queue Management

### Viewing Queue Status

```bash
# List all queues with message counts
docker exec -it claw-rabbitmq rabbitmqctl list_queues name messages consumers

# Check exchange bindings
docker exec -it claw-rabbitmq rabbitmqctl list_bindings
```

Or use the management UI at `http://localhost:15672`.

### Purging a Queue

If a queue has accumulated messages that are causing issues:

```bash
docker exec -it claw-rabbitmq rabbitmqctl purge_queue <queue-name>
```

### Dead Letter Queue

Failed messages (after 3 retries with exponential backoff) are routed to the DLQ. Inspect them in the management UI under the DLQ queue. Common reasons for DLQ messages:

- Consumer service was down during delivery
- Message payload does not match expected schema
- Processing error in the consumer
