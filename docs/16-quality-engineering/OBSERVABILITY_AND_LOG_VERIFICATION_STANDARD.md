# Observability and Log Verification Standard

## Purpose

This document defines what to check, where to check it, and when to check it for every feature and change in ClawAI. Logs, audit entries, events, and database state are first-class verification targets -- not afterthoughts. A feature is not verified until its observability trail is confirmed.

---

## Observability Layers

ClawAI produces observable output at six layers. Every significant action should leave traces in at least three of these layers.

| Layer                 | Technology                      | Storage              | Retention          | Access Method                                            |
| --------------------- | ------------------------------- | -------------------- | ------------------ | -------------------------------------------------------- |
| Frontend console      | Browser DevTools                | Browser memory       | Session            | F12 > Console tab                                        |
| Client logs           | MongoDB (`claw_client_logs`)    | Persisted            | 30 days (TTL)      | MongoDB Compass or `docker compose exec mongodb mongosh` |
| Server logs           | MongoDB (`claw_server_logs`)    | Persisted            | 30 days (TTL)      | MongoDB Compass or `docker compose exec mongodb mongosh` |
| Docker container logs | stdout/stderr via Docker        | Docker log driver    | Container lifetime | `docker compose logs <service>`                          |
| Audit trail           | MongoDB (`claw_audit`)          | Persisted            | Permanent          | MongoDB Compass or audit API                             |
| RabbitMQ events       | RabbitMQ exchange `claw.events` | Transient (consumed) | Until consumed     | RabbitMQ Management UI (localhost:15672)                 |

---

## What to Check Per Feature Area

### Chat (claw-chat-service, port 4002)

| Action               | Docker Logs                          | Audit                        | Events                        | Database                                                        |
| -------------------- | ------------------------------------ | ---------------------------- | ----------------------------- | --------------------------------------------------------------- |
| Send message         | `message_created` log entry          | --                           | `message.created` published   | ChatMessage record with role=USER                               |
| AI response received | `message_completed` log entry        | `message.completed` audit    | `message.completed` published | ChatMessage record with role=ASSISTANT, provider, model, tokens |
| Create thread        | `thread_created` log entry           | --                           | `thread.created` published    | ChatThread record with userId, routingMode                      |
| Delete thread        | `thread_deleted` log entry           | --                           | --                            | Thread and messages cascade deleted                             |
| Parallel compare     | Multiple `message_completed` entries | One audit per model response | `message.completed` per model | Multiple ASSISTANT messages with different providers            |
| SSE streaming        | No "Cannot set headers" errors       | --                           | --                            | --                                                              |

### Connectors (claw-connector-service, port 4003)

| Action           | Docker Logs             | Audit                            | Events                               | Database                               |
| ---------------- | ----------------------- | -------------------------------- | ------------------------------------ | -------------------------------------- |
| Create connector | `connector_created` log | `connector.created` audit        | `connector.created` published        | Connector record with encrypted config |
| Update connector | `connector_updated` log | `connector.updated` audit        | `connector.updated` published        | Connector record updated               |
| Delete connector | `connector_deleted` log | `connector.deleted` audit        | `connector.deleted` published        | Connector record deleted               |
| Test connector   | `connector_tested` log  | --                               | --                                   | ConnectorHealthEvent record            |
| Sync models      | `models_synced` log     | `connector.synced` audit         | `connector.synced` published         | ConnectorModel records created/updated |
| Health check     | `health_check` log      | `connector.health_checked` audit | `connector.health_checked` published | ConnectorHealthEvent record            |

### Routing (claw-routing-service, port 4004)

| Action           | Docker Logs                                  | Audit                               | Events                            | Database                               |
| ---------------- | -------------------------------------------- | ----------------------------------- | --------------------------------- | -------------------------------------- |
| Route message    | `routing_decision` log with confidence/model | `routing.decision_made` audit       | `routing.decision_made` published | RoutingDecision record                 |
| Replay decisions | `replay_completed` log                       | --                                  | --                                | No new records (read-only operation)   |
| Create policy    | `policy_created` log                         | --                                  | --                                | RoutingPolicy record                   |
| Privacy override | `privacy_override` log (local forced)        | Audit includes privacyClass=PRIVATE | Event includes privacyClass       | Decision has `reasonTags: ['privacy']` |

### Models (claw-ollama-service, port 4008)

| Action        | Docker Logs                                      | Audit | Events                                   | Database                                            |
| ------------- | ------------------------------------------------ | ----- | ---------------------------------------- | --------------------------------------------------- |
| Pull model    | `pull_started` log                               | --    | --                                       | PullJob record with status=IN_PROGRESS              |
| Pull progress | Periodic `pull_progress` logs                    | --    | SSE events via `/pull-jobs/:id/progress` | PullJob progress updated                            |
| Pull complete | `pull_completed` log                             | --    | `MODEL_PULLED` event                     | PullJob status=COMPLETED, LocalModel record created |
| Pull failed   | `pull_failed` log with error                     | --    | --                                       | PullJob status=FAILED with error                    |
| Cancel pull   | `pull_cancelled` log                             | --    | --                                       | PullJob status=CANCELLED                            |
| Delete model  | `model_deleted` log                              | --    | `MODEL_DELETED` event                    | LocalModel record deleted                           |
| Generate text | `generation_started`/`generation_completed` logs | --    | --                                       | --                                                  |

### Auth (claw-auth-service, port 4001)

| Action        | Docker Logs                    | Audit               | Events                  | Database                              |
| ------------- | ------------------------------ | ------------------- | ----------------------- | ------------------------------------- |
| Login         | `user_login` log               | `user.login` audit  | `user.login` published  | Session record created                |
| Logout        | `user_logout` log              | `user.logout` audit | `user.logout` published | Session record deleted                |
| Token refresh | `token_refreshed` log          | --                  | --                      | Session record updated with new token |
| Failed login  | `login_failed` log with reason | --                  | --                      | No session created                    |
| Create user   | `user_created` log             | --                  | --                      | User record created                   |

### Files (claw-file-service, port 4006)

| Action             | Docker Logs                              | Audit | Events                    | Database                                                  |
| ------------------ | ---------------------------------------- | ----- | ------------------------- | --------------------------------------------------------- |
| Upload file        | `file_uploaded` log                      | --    | `file.uploaded` published | File record with ingestionStatus=PENDING                  |
| Chunk file         | `file_chunked` log                       | --    | `file.chunked` published  | FileChunk records created, File ingestionStatus=COMPLETED |
| Security rejection | `security_rejected` log with reason code | --    | --                        | No file record (rejected before save)                     |
| ClamAV scan        | `antivirus_scan` log with result         | --    | --                        | --                                                        |

### Memory (claw-memory-service, port 4005)

| Action             | Docker Logs                                      | Audit                    | Events                       | Database                |
| ------------------ | ------------------------------------------------ | ------------------------ | ---------------------------- | ----------------------- |
| Extract memories   | `extraction_started`/`extraction_completed` logs | `memory.extracted` audit | `memory.extracted` published | MemoryRecord(s) created |
| Create memory      | `memory_created` log                             | --                       | --                           | MemoryRecord created    |
| Delete memory      | `memory_deleted` log                             | --                       | --                           | MemoryRecord deleted    |
| Duplicate detected | `duplicate_skipped` log                          | --                       | --                           | No new record           |

### Images (claw-image-service, port 4012)

| Action            | Docker Logs                              | Audit                   | Events                      | Database                       |
| ----------------- | ---------------------------------------- | ----------------------- | --------------------------- | ------------------------------ |
| Generate image    | `image_generation_started` log           | `image.generated` audit | `image.generated` published | Image record                   |
| Generation failed | `image_generation_failed` log with error | `image.failed` audit    | `image.failed` published    | Image record with error status |

### File Generation (claw-file-generation-service, port 4013)

| Action            | Docker Logs                   | Audit                          | Events                             | Database                         |
| ----------------- | ----------------------------- | ------------------------------ | ---------------------------------- | -------------------------------- |
| Generate file     | `file_generation_started` log | `file.generated` audit         | `file.generated` published         | FileGeneration record            |
| Generation failed | `file_generation_failed` log  | `file_generation.failed` audit | `file_generation.failed` published | FileGeneration record with error |

---

## When to Check

### After Every API Call

1. Open the Docker logs for the target service:
   ```bash
   docker compose -f docker-compose.dev.yml logs -f <service-name> --since 1m
   ```
2. Verify the request was received (look for the endpoint path and HTTP method in the log).
3. Verify no unhandled exceptions.
4. Verify the response status code matches expectations.
5. Check for warnings that indicate degraded behavior (e.g., fallback used, cache miss, timeout).

### After Every Mutation (Create/Update/Delete)

1. **Check audit log** -- for audited actions, verify an entry exists in the MongoDB audit collection:
   ```bash
   docker compose -f docker-compose.dev.yml exec mongodb mongosh --eval "
     use claw_audit;
     db.auditlogs.find().sort({createdAt: -1}).limit(5).pretty();
   "
   ```
2. **Check the database** -- verify the record was created/updated/deleted in the correct service database:
   ```bash
   # PostgreSQL example (chat service)
   docker compose -f docker-compose.dev.yml exec pg-chat psql -U claw -d claw_chat -c "
     SELECT id, role, content, provider, model FROM chat_messages ORDER BY created_at DESC LIMIT 5;
   "
   ```
3. **Check RabbitMQ** (if the action publishes events):
   - Open RabbitMQ Management UI: `http://localhost:15672` (guest/guest).
   - Navigate to Queues tab.
   - Verify the target queue received and processed the message (message count should return to 0).
   - Check the Dead Letter Queue (DLQ) for any failed deliveries.

### After Every Event

1. **Verify the event was published** -- check the publishing service's Docker logs for "Published event: `<pattern>`".
2. **Verify the event was consumed** -- check the consuming service's Docker logs for event handler execution.
3. **Verify the consumer's side effects** -- check that the consumer created/updated the expected records.

Example verification for `message.completed` event:

```bash
# 1. Chat service published the event
docker compose -f docker-compose.dev.yml logs chat-service --since 1m | grep "message.completed"

# 2. Audit service consumed it
docker compose -f docker-compose.dev.yml logs audit-service --since 1m | grep "message.completed"

# 3. Memory service consumed it (for extraction)
docker compose -f docker-compose.dev.yml logs memory-service --since 1m | grep "message.completed"

# 4. Audit entry was created
docker compose -f docker-compose.dev.yml exec mongodb mongosh --eval "
  use claw_audit;
  db.auditlogs.find({action: 'message.completed'}).sort({createdAt: -1}).limit(1).pretty();
"
```

### After Every Error

1. **Check the structured error log** in Docker:
   ```bash
   docker compose -f docker-compose.dev.yml logs <service> --since 1m | grep -i "error\|exception\|fail"
   ```
2. Verify the error log includes:
   - Request ID (`X-Request-ID` or `requestId` field).
   - Error message and stack trace.
   - User ID (if authenticated).
   - The endpoint that was called.
3. Verify the error was NOT a silent swallow (the error must be logged, not just caught and ignored).
4. If the error should produce a user-visible error message, verify the frontend shows it.

### After Every SSE Connection

1. **No "Cannot set headers after they are sent to the client"** -- this is the most common SSE bug. Check Docker logs:
   ```bash
   docker compose -f docker-compose.dev.yml logs <service> --since 1m | grep "Cannot set headers"
   ```
2. **No pino-http autoLogging conflict** -- verify the SSE endpoint is excluded from autoLogging.
3. **Events are reaching the client** -- check the browser Network tab for the SSE request. The "EventStream" tab should show incoming events.
4. **Connection is kept alive** -- the SSE request should remain open (status: pending) until explicitly closed.

---

## Log Verification Checklist

Use this checklist after every feature test. Every item must be verified.

### Docker Log Quality

- [ ] No unhandled exceptions in any service log during the test.
- [ ] No "Cannot set headers after sent" errors (SSE bug indicator).
- [ ] No deprecation warnings from NestJS or Prisma.
- [ ] No database connection errors or timeouts.
- [ ] No RabbitMQ connection errors.
- [ ] No Redis connection errors.

### Secret Protection

- [ ] No passwords in log output (search for `password`).
- [ ] No API keys in log output (search for `apiKey`, `api_key`).
- [ ] No JWT tokens in log output (search for `Bearer`, `eyJ`).
- [ ] No refresh tokens in log output (search for `refreshToken`).
- [ ] No encryption keys in log output (search for `ENCRYPTION_KEY`).
- [ ] Pino redaction is active (sensitive fields show `[Redacted]`).

Verify redaction is working:

```bash
# This should NOT show any raw tokens
docker compose -f docker-compose.dev.yml logs auth-service --since 5m | grep -i "eyJ\|Bearer\|password\|apiKey\|secret"
```

### Structured Log Format

- [ ] All logs are in JSON format (pino structured logging).
- [ ] Each log entry has a `level` field (10=trace, 20=debug, 30=info, 40=warn, 50=error).
- [ ] Each log entry has a `time` field (Unix timestamp).
- [ ] Each log entry has a `msg` field (human-readable message).
- [ ] Request-scoped logs include `requestId` (from `X-Request-ID` header).
- [ ] Error logs include `err` object with `message` and `stack`.

### Log Level Correctness

| Scenario                                         | Expected Level | Incorrect Level |
| ------------------------------------------------ | -------------- | --------------- |
| Successful operation                             | INFO (30)      | ERROR or WARN   |
| Recoverable issue (fallback used, cache miss)    | WARN (40)      | ERROR           |
| Unrecoverable failure (provider down, DB error)  | ERROR (50)     | WARN or INFO    |
| Debugging information                            | DEBUG (20)     | INFO            |
| Security event (failed login, permission denied) | WARN (40)      | INFO            |

---

## Audit Verification

For every auditable action, verify the audit entry has the correct fields.

### Audit Entry Fields

| Field      | Required   | Description                                                |
| ---------- | ---------- | ---------------------------------------------------------- |
| userId     | Yes        | ID of the user who performed the action                    |
| action     | Yes        | Event pattern (e.g., `message.completed`, `user.login`)    |
| entityType | Yes        | Type of entity affected (e.g., `ChatMessage`, `Connector`) |
| entityId   | Yes        | ID of the specific entity                                  |
| severity   | Yes        | INFO, WARN, ERROR                                          |
| details    | Yes        | JSON object with action-specific details                   |
| createdAt  | Yes (auto) | Timestamp of the event                                     |

### Audit Entry Verification by Event Type

#### message.completed

```json
{
  "action": "message.completed",
  "entityType": "ChatMessage",
  "entityId": "<message-uuid>",
  "severity": "INFO",
  "details": {
    "provider": "anthropic",
    "model": "claude-sonnet-4",
    "inputTokens": 1250,
    "outputTokens": 890,
    "latencyMs": 3200,
    "routingMode": "AUTO",
    "threadId": "<thread-uuid>"
  }
}
```

**Verify:** provider and model match the actual provider used (not the fallback). Token counts are positive integers. Latency is reasonable (100ms-60000ms).

#### user.login

```json
{
  "action": "user.login",
  "entityType": "User",
  "entityId": "<user-uuid>",
  "severity": "INFO",
  "details": {
    "email": "operator@claw.ai",
    "timestamp": "2026-04-13T10:30:00Z"
  }
}
```

**Verify:** email matches the logged-in user. No password or token in the details.

#### connector.created / connector.updated / connector.deleted

```json
{
  "action": "connector.created",
  "entityType": "Connector",
  "entityId": "<connector-uuid>",
  "severity": "INFO",
  "details": {
    "name": "Gemini Production",
    "provider": "GEMINI",
    "status": "ACTIVE"
  }
}
```

**Verify:** No API key or encrypted config in the details. Provider matches the actual provider enum.

#### routing.decision_made

```json
{
  "action": "routing.decision_made",
  "entityType": "RoutingDecision",
  "entityId": "<decision-uuid>",
  "severity": "INFO",
  "details": {
    "selectedProvider": "local-ollama",
    "selectedModel": "gemma3:4b",
    "confidence": 0.92,
    "reasonTags": ["privacy", "local_available"],
    "routingMode": "AUTO",
    "privacyClass": "PRIVATE",
    "costClass": "FREE"
  }
}
```

**Verify:** confidence is between 0 and 1. reasonTags is a non-empty array. privacyClass and costClass use enum values.

#### image.generated / image.failed

```json
{
  "action": "image.generated",
  "entityType": "Image",
  "entityId": "<image-uuid>",
  "severity": "INFO",
  "details": {
    "provider": "GEMINI",
    "prompt": "A sunset over a mountain range",
    "latencyMs": 8500
  }
}
```

**Verify:** prompt matches the user's request. For `image.failed`, severity should be ERROR and details should include an error message.

---

## Database Verification After Mutations

After every create, update, or delete operation, verify the database state.

### PostgreSQL Verification

Connect to the service's database:

```bash
# Chat service database
docker compose -f docker-compose.dev.yml exec pg-chat psql -U claw -d claw_chat

# Auth service database
docker compose -f docker-compose.dev.yml exec pg-auth psql -U claw -d claw_auth

# Connector service database
docker compose -f docker-compose.dev.yml exec pg-connectors psql -U claw -d claw_connectors
```

**Checklist for every record:**

- [ ] Record exists in the correct table.
- [ ] All required fields have non-null values.
- [ ] `createdAt` and `updatedAt` timestamps are set and reasonable.
- [ ] Foreign keys reference existing records (no orphans).
- [ ] Enum fields contain valid enum values (not raw strings).
- [ ] User-scoped records have the correct `userId`.
- [ ] Soft-deleted records (if applicable) have `deletedAt` set.
- [ ] Cascading deletes removed related records (e.g., deleting a thread removes its messages).

### MongoDB Verification

Connect to MongoDB:

```bash
docker compose -f docker-compose.dev.yml exec mongodb mongosh
```

```javascript
// Switch to audit database
use claw_audit;

// Check recent audit logs
db.auditlogs.find().sort({createdAt: -1}).limit(5).pretty();

// Check usage ledger
db.usageledgers.find().sort({createdAt: -1}).limit(5).pretty();

// Switch to client logs database
use claw_client_logs;
db.clientlogs.find().sort({createdAt: -1}).limit(5).pretty();

// Switch to server logs database
use claw_server_logs;
db.serverlogs.find().sort({createdAt: -1}).limit(5).pretty();
```

**Checklist for MongoDB records:**

- [ ] Record exists in the correct collection.
- [ ] TTL index is active (logs should auto-expire after 30 days).
- [ ] Timestamps are ISO 8601 format.
- [ ] No extraneous fields that indicate a schema mismatch.

---

## RabbitMQ Event Verification

### Accessing RabbitMQ Management UI

Open `http://localhost:15672` in a browser. Default credentials: `guest` / `guest`.

### What to Check

| Tab         | What to Verify                                                            |
| ----------- | ------------------------------------------------------------------------- |
| Overview    | Connection count matches expected services (13 services + management)     |
| Connections | Each service has an active connection                                     |
| Channels    | No blocked channels                                                       |
| Exchanges   | `claw.events` exchange exists, type: topic, durable: true                 |
| Queues      | All queues have consumers, no queues with unacknowledged messages growing |

### Dead Letter Queue (DLQ)

The DLQ catches events that failed after 3 retry attempts. The DLQ should be empty during normal operation.

```
Queues tab > filter for "dlq" or "dead"
```

If the DLQ has messages:

1. Click the queue name.
2. Click "Get Message(s)" to inspect the failed event.
3. Check the `x-death` header for the original queue and failure reason.
4. Check the consuming service's Docker logs for the corresponding error.
5. Fix the consumer, then replay the DLQ message or discard it.

### Event Flow Verification

For the full message flow (the most complex event chain):

```
1. message.created (chat → routing)
   Check: routing-service logs show "Received message.created"

2. message.routed (routing → chat)
   Check: chat-service logs show "Received message.routed"
   Check: routing decision includes provider, model, confidence

3. message.completed (chat → audit, memory)
   Check: audit-service logs show "Received message.completed"
   Check: memory-service logs show "Received message.completed"
   Check: audit entry created in MongoDB
   Check: memory extraction triggered (if applicable)
```

---

## Tools Reference

### Docker Compose Logs

```bash
# Follow logs for a specific service (real-time)
docker compose -f docker-compose.dev.yml logs -f <service-name>

# Last 1 minute of logs
docker compose -f docker-compose.dev.yml logs <service-name> --since 1m

# Last 50 lines
docker compose -f docker-compose.dev.yml logs <service-name> --tail 50

# All services (noisy, use sparingly)
docker compose -f docker-compose.dev.yml logs --since 30s

# Filter for errors only
docker compose -f docker-compose.dev.yml logs <service-name> --since 5m 2>&1 | grep -i "error\|exception\|fail"
```

### MongoDB Compass

GUI tool for browsing MongoDB collections. Connect to `mongodb://localhost:27017`.

Databases to inspect:

- `claw_audit` -- audit logs and usage ledger.
- `claw_client_logs` -- frontend log entries.
- `claw_server_logs` -- backend log entries.

### pgAdmin or psql

GUI (pgAdmin) or CLI (psql) for browsing PostgreSQL databases.

Connection details (from `.env`):

- Host: `localhost`
- Ports: `5432` through `5440` (one per service database)
- User: from `PG_*_USER` env vars
- Password: from `PG_*_PASSWORD` env vars

### RabbitMQ Management

Web UI at `http://localhost:15672`. Default: `guest` / `guest`.

Key pages:

- **Overview**: cluster health, message rates, connection count.
- **Queues**: per-queue depth, consumer count, message rates.
- **Exchanges**: `claw.events` bindings show which queues receive which events.

### Browser DevTools

| Tab                           | What to Check                                         |
| ----------------------------- | ----------------------------------------------------- |
| Console                       | JavaScript errors, warnings, React errors             |
| Network                       | Failed requests (red), slow requests, SSE connections |
| Application > Local Storage   | Auth tokens (should exist after login)                |
| Application > Session Storage | Transient state                                       |
| Network > EventStream         | SSE events for real-time features                     |

---

## Troubleshooting Common Issues

### "Cannot set headers after they are sent to the client"

**Cause:** pino-http autoLogging or LoggingInterceptor conflicts with SSE streaming.
**Fix:** Add `@SkipLogging()` decorator to the SSE controller method. Exclude the SSE route from pino-http autoLogging in `app.module.ts`.
**Verify:** `docker compose logs <service> --since 1m | grep "Cannot set headers"` returns nothing.

### DLQ Messages Accumulating

**Cause:** Consumer threw an unhandled exception during event processing, 3 retries exhausted.
**Fix:** Check consumer service logs for the error. Fix the handler. Replay or discard DLQ messages.
**Verify:** DLQ queue depth returns to 0 in RabbitMQ Management.

### Audit Entries Missing

**Cause:** Either the event was not published, or the audit service consumer failed.
**Steps:**

1. Check publishing service logs for "Published event" message.
2. Check RabbitMQ queues for unprocessed messages.
3. Check audit-service Docker logs for errors.
4. Check MongoDB `claw_audit.auditlogs` collection directly.

### Stale Data in Frontend

**Cause:** TanStack Query cache not invalidated after mutation.
**Steps:**

1. Open browser DevTools Network tab.
2. Perform the mutation.
3. Verify a refetch request is sent immediately after the mutation succeeds.
4. If no refetch, check the mutation hook's `onSuccess` callback for `queryClient.invalidateQueries()`.

### Logs Show "[Redacted]" for Non-Sensitive Fields

**Cause:** pino redaction paths are too broad.
**Fix:** Review the pino configuration in `app.module.ts`. Redaction paths should target specific field names (`authorization`, `password`, `apiKey`, `token`, `secret`, `refreshToken`), not wildcard patterns.

### Request ID Not Propagating

**Cause:** `X-Request-ID` header not forwarded between services.
**Steps:**

1. Check frontend HTTP client sends `X-Request-ID` on every request.
2. Check Nginx passes the header (`proxy_set_header X-Request-ID $request_id`).
3. Check backend services read and include the header in logs.
4. For inter-service HTTP calls, verify the calling service forwards the header.
