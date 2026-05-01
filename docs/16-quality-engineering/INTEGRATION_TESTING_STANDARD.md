# Integration Testing Standard

> ClawAI Quality Engineering -- Document 6 of 10

## Purpose

Integration tests verify that ClawAI's 13 microservices communicate correctly through RabbitMQ events, HTTP internal calls, SSE streams, Redis cache, and database persistence. Unlike unit tests (which mock boundaries), integration tests run against real infrastructure inside Docker Compose.

---

## Prerequisites

- Full Docker Compose stack running: `./scripts/claw.sh up -d`
- All 13 services healthy: `curl http://localhost:4000/api/v1/health`
- RabbitMQ management UI accessible: `http://localhost:15672` (guest/guest or configured credentials)
- Valid JWT token obtained via `POST http://localhost:4000/api/v1/auth/login`
- Test user seeded (ADMIN role) for full access

---

## 1. Service-to-Service Event Flows

Every event flow must be tested end-to-end. The test verifies: event published with correct pattern, event consumed by correct service, side effects executed.

### 1.1 Chat to Routing: message.created / message.routed

**Flow:** User sends message -> chat-service publishes `message.created` -> routing-service consumes, makes decision -> routing-service publishes `message.routed` -> chat-service consumes, executes LLM call.

**Test procedure:**

```bash
# 1. Send a message
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId": "<thread-id>", "content": "Write a Python function to sort a list"}'

# 2. Check routing-service logs for consumption
./scripts/claw.sh logs routing-service --since 30s | grep "message.created"

# 3. Check routing-service logs for decision
./scripts/claw.sh logs routing-service --since 30s | grep "message.routed"

# 4. Check chat-service logs for consumption of routed event
./scripts/claw.sh logs chat-service --since 30s | grep "message.routed"

# 5. Verify routing decision stored in routing DB
# (Direct DB query or via API)
curl http://localhost:4000/api/v1/routing/decisions?threadId=<thread-id> \
  -H "Authorization: Bearer $TOKEN"
```

**Assertions:**

- `message.created` event contains: `threadId`, `messageId`, `content`, `userId`, `routingMode`
- `message.routed` event contains: `selectedProvider`, `selectedModel`, `confidence`, `reasonTags[]`, `fallback`
- Routing decision record exists in `claw_routing` database
- Chat service receives the routed event and initiates LLM execution

### 1.2 Chat to Audit: message.completed

**Flow:** LLM response stored -> chat-service publishes `message.completed` -> audit-service consumes, writes audit log + usage ledger.

**Test procedure:**

```bash
# 1. Send a message and wait for completion (~5-30s depending on model)
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId": "<thread-id>", "content": "Hello"}'

# 2. Wait for ASSISTANT response (poll or check SSE)
sleep 10

# 3. Check audit-service logs
./scripts/claw.sh logs audit-service --since 60s | grep "message.completed"

# 4. Verify audit log entry
curl "http://localhost:4000/api/v1/audits?action=message.completed&entityId=<thread-id>" \
  -H "Authorization: Bearer $TOKEN"

# 5. Verify usage ledger entry
curl "http://localhost:4000/api/v1/usage?resourceType=token" \
  -H "Authorization: Bearer $TOKEN"
```

**Assertions:**

- Audit log entry has: `action=message.completed`, `entityType=ChatMessage`, correct `userId`
- Usage ledger records: `inputTokens`, `outputTokens`, `provider`, `model`
- No duplicate audit entries for the same message

### 1.3 Chat to Memory: message.completed (Memory Extraction)

**Flow:** `message.completed` event -> memory-service consumes -> extracts FACT/PREFERENCE/INSTRUCTION/SUMMARY via Ollama -> stores memory records.

**Test procedure:**

```bash
# 1. Send a message with extractable content
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId": "<thread-id>", "content": "My favorite programming language is Rust and I prefer dark themes"}'

# 2. Wait for extraction (~10-30s, depends on Ollama speed)
sleep 30

# 3. Check memory-service logs
./scripts/claw.sh logs memory-service --since 60s | grep "memory.extracted"

# 4. Verify memory records created
curl "http://localhost:4000/api/v1/memories" \
  -H "Authorization: Bearer $TOKEN"
```

**Assertions:**

- Memory records created with correct `type` (PREFERENCE for "favorite language", "prefer dark themes")
- Memory records have `sourceThreadId` and `sourceMessageId` set
- Deduplication works: sending the same fact again does not create a duplicate
- Memory records are user-scoped (only visible to the message author)

### 1.4 Connector to Routing: connector.synced

**Flow:** Connector model sync completes -> connector-service publishes `connector.synced` -> routing-service consumes, updates available model list.

**Test procedure:**

```bash
# 1. Trigger a connector sync
curl -X POST "http://localhost:4000/api/v1/connectors/<connector-id>/sync" \
  -H "Authorization: Bearer $TOKEN"

# 2. Check connector-service logs
./scripts/claw.sh logs connector-service --since 30s | grep "connector.synced"

# 3. Check routing-service logs for consumption
./scripts/claw.sh logs routing-service --since 30s | grep "connector.synced"
```

**Assertions:**

- Synced models are available in routing decisions
- Connector health status reflected in routing fallback chain

### 1.5 Connector to Audit: connector.created / connector.updated / connector.deleted

**Test procedure:**

```bash
# 1. Create a connector
curl -X POST http://localhost:4000/api/v1/connectors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Connector", "provider": "OPENAI", "config": {"apiKey": "sk-test-key"}}'

# 2. Check audit-service logs
./scripts/claw.sh logs audit-service --since 30s | grep "connector.created"

# 3. Verify audit log
curl "http://localhost:4000/api/v1/audits?action=connector.created" \
  -H "Authorization: Bearer $TOKEN"
```

**Assertions:**

- Audit log records connector creation with `severity: INFO`
- Encrypted config is NOT present in audit log details (security check)
- Update and delete events are similarly audited

---

## 2. RabbitMQ Event Verification

### 2.1 Exchange and Queue Validation

```bash
# Verify exchange exists
curl -u guest:guest http://localhost:15672/api/exchanges/%2F/claw.events

# Verify queues are bound
curl -u guest:guest http://localhost:15672/api/queues

# Check for unacked messages (should be 0 in steady state)
curl -u guest:guest http://localhost:15672/api/queues/%2F/ | jq '.[] | {name, messages_unacknowledged}'
```

**Assertions:**

- Exchange `claw.events` exists, type is `topic`, durable is `true`
- Each consuming service has its queue bound with correct routing key pattern
- No messages sitting unacknowledged for more than 60 seconds

### 2.2 DLQ Handling for Failed Consumers

**Test procedure:**

1. Temporarily break a consumer (e.g., stop audit-service)
2. Publish an event that audit-service consumes (e.g., send a chat message)
3. Verify the message enters the retry queue
4. After 3 retries, verify the message lands in the DLQ
5. Restart audit-service
6. Verify DLQ messages can be reprocessed or are logged

```bash
# Stop audit service
./scripts/claw.sh stop audit-service

# Send a message (triggers message.completed -> audit)
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId": "<thread-id>", "content": "Test DLQ handling"}'

# Wait for retries (backoff: ~30s total)
sleep 45

# Check DLQ via RabbitMQ management
curl -u guest:guest "http://localhost:15672/api/queues/%2F/" | jq '.[] | select(.name | contains("dlq")) | {name, messages}'

# Restart audit service
./scripts/claw.sh start audit-service
```

**Assertions:**

- Failed messages retry 3 times with exponential backoff
- After 3 failures, message lands in DLQ (not lost)
- DLQ messages include original routing key and error details
- Service recovery does not cause message reprocessing storms

### 2.3 Event Payload Validation

Every published event must match the expected schema defined in `packages/shared-types`. Test by:

1. Enabling verbose logging on the publishing service
2. Capturing the event payload from logs
3. Validating against the TypeScript type definition

**Key event payloads to verify:**

| Event               | Required Fields                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `message.created`   | `threadId`, `messageId`, `content`, `userId`, `routingMode`                                          |
| `message.routed`    | `threadId`, `messageId`, `selectedProvider`, `selectedModel`, `confidence`, `reasonTags`, `fallback` |
| `message.completed` | `threadId`, `messageId`, `content`, `provider`, `model`, `inputTokens`, `outputTokens`, `latencyMs`  |
| `connector.synced`  | `connectorId`, `provider`, `modelsFound`, `modelsAdded`, `modelsRemoved`                             |
| `memory.extracted`  | `userId`, `threadId`, `messageId`, `memoriesCreated`, `types`                                        |
| `image.generated`   | `userId`, `prompt`, `provider`, `model`, `sizeBytes`, `latencyMs`                                    |
| `file.generated`    | `userId`, `format`, `sizeBytes`, `latencyMs`                                                         |

---

## 3. Redis Cache Integration

### 3.1 Cache Invalidation After Mutations

ClawAI uses Redis for caching routing decisions and model lists. Test that mutations invalidate the cache.

**Test procedure:**

```bash
# 1. Make a routing request (populates cache)
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId": "<thread-id>", "content": "Test cache"}'

# 2. Update a routing policy
curl -X PATCH "http://localhost:4000/api/v1/routing/policies/<policy-id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# 3. Make another routing request -- should NOT use stale cached policy
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId": "<thread-id>", "content": "Test cache invalidation"}'

# 4. Verify from routing-service logs that cache was invalidated
./scripts/claw.sh logs routing-service --since 60s | grep -i "cache"
```

**Assertions:**

- Policy change invalidates routing cache
- Connector sync invalidates model list cache
- Model pull/delete invalidates prompt builder cache (5-minute TTL)
- No stale data served after mutations

### 3.2 Stale Cache Detection

```bash
# Check Redis keys and TTLs
./scripts/claw.sh exec redis redis-cli KEYS "*"
./scripts/claw.sh exec redis redis-cli TTL "<key>"
```

**Assertions:**

- All cache keys have a TTL set (no immortal keys)
- TTLs are reasonable (routing cache: 5 min, model list: 5 min)
- Redis memory usage is stable over time (no memory leak from unbounded keys)

---

## 4. Database Persistence Consistency

### 4.1 Data Written to Correct Service's Database

Each service owns its database. Verify no cross-DB writes occur.

| Service            | Database                   | Tables to Verify                                              |
| ------------------ | -------------------------- | ------------------------------------------------------------- |
| auth (4001)        | `claw_auth`                | User, Session, SystemSetting                                  |
| chat (4002)        | `claw_chat`                | ChatThread, ChatMessage, MessageAttachment                    |
| connector (4003)   | `claw_connectors`          | Connector, ConnectorModel, ConnectorHealthEvent, ModelSyncRun |
| routing (4004)     | `claw_routing`             | RoutingDecision, RoutingPolicy                                |
| memory (4005)      | `claw_memory`              | MemoryRecord, ContextPack, ContextPackItem                    |
| file (4006)        | `claw_files`               | File, FileChunk                                               |
| ollama (4008)      | `claw_ollama`              | LocalModel, LocalModelRoleAssignment, PullJob, RuntimeConfig  |
| image (4012)       | `claw_images`              | (image generation records)                                    |
| file-gen (4013)    | `claw_file_generations`    | (file generation records)                                     |
| audit (4007)       | MongoDB `claw_audit`       | AuditLog, UsageLedger                                         |
| client-logs (4010) | MongoDB `claw_client_logs` | ClientLog                                                     |
| server-logs (4011) | MongoDB `claw_server_logs` | ServerLog                                                     |

**Test procedure:**

After executing a full message flow, query each database and verify:

```bash
# Chat DB -- message stored
./scripts/claw.sh exec chat-db \
  psql -U claw -d claw_chat -c "SELECT id, role, provider, model FROM \"ChatMessage\" ORDER BY \"createdAt\" DESC LIMIT 5;"

# Routing DB -- decision stored
./scripts/claw.sh exec routing-db \
  psql -U claw -d claw_routing -c "SELECT id, \"selectedProvider\", \"selectedModel\", confidence FROM \"RoutingDecision\" ORDER BY \"createdAt\" DESC LIMIT 5;"

# Audit DB -- audit log stored
./scripts/claw.sh exec mongo \
  mongosh claw_audit --eval "db.auditlogs.find().sort({createdAt: -1}).limit(5).pretty()"

# Memory DB -- extraction stored (if applicable)
./scripts/claw.sh exec memory-db \
  psql -U claw -d claw_memory -c "SELECT id, type, content FROM \"MemoryRecord\" ORDER BY \"createdAt\" DESC LIMIT 5;"
```

**Assertions:**

- Each record is in the correct service's database
- No service writes to another service's database
- Foreign key references use IDs (not joins across databases)
- Timestamps are consistent (within a few seconds across services for the same flow)

---

## 5. SSE Flow Verification

### 5.1 Chat Streaming (Message Completion)

**Test procedure:**

```bash
# Open SSE connection for a thread (use fetch, NOT EventSource -- auth headers required)
curl -N -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/v1/chat-messages/stream/<thread-id>"

# In another terminal, send a message to that thread
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId": "<thread-id>", "content": "Hello"}'

# Observe SSE events in the first terminal
```

**Assertions:**

- SSE connection establishes without error (no "Cannot set headers" crash)
- Events arrive with `data:` prefix and valid JSON
- Completion event contains the full assistant message
- Error events (if LLM fails) contain actionable error info
- Connection stays alive for the duration of the request

### 5.2 Pull Job Progress (Model Download)

```bash
# Start a model pull
curl -X POST "http://localhost:4000/api/v1/ollama/catalog/<catalog-id>/pull" \
  -H "Authorization: Bearer $TOKEN"

# Get the pull job ID from response, then connect to SSE
curl -N -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/v1/ollama/pull-jobs/<job-id>/progress"
```

**Assertions:**

- Progress events include: `status`, `completed`, `total`, `percentage`
- Progress increases monotonically (no regression)
- Final event indicates completion or failure
- Cancellation (`DELETE /pull-jobs/<job-id>`) terminates the SSE stream

### 5.3 Nginx SSE Pass-through

```bash
# Verify SSE-specific nginx config is active
./scripts/claw.sh exec nginx cat /etc/nginx/nginx.conf | grep -A5 "proxy_buffering off"
```

**Assertions:**

- SSE routes have `proxy_buffering off`
- SSE routes have `proxy_read_timeout 86400` (24 hours)
- SSE routes have `proxy_http_version 1.1` and `Connection ""`
- SSE location blocks appear BEFORE generic service location blocks

---

## 6. Multi-Service Full Flow Test

### 6.1 Complete Message Flow

This is the most critical integration test. It verifies the entire message lifecycle:

```
User sends message
  -> chat-service stores USER message
  -> chat-service publishes message.created
  -> routing-service consumes, makes routing decision
  -> routing-service publishes message.routed
  -> chat-service consumes message.routed
  -> chat-service assembles context (memories from memory-service, file chunks from file-service)
  -> chat-service calls LLM (Ollama or cloud provider)
  -> chat-service stores ASSISTANT message
  -> chat-service emits SSE completion
  -> chat-service publishes message.completed
  -> audit-service records audit log + usage ledger
  -> memory-service extracts memories
```

**Full test script:**

```bash
#!/bin/bash
set -e

BASE_URL="http://localhost:4000/api/v1"

# Step 1: Login
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@claw.ai", "password": "admin123"}' | jq -r '.accessToken')

echo "1. Logged in, token obtained"

# Step 2: Create a thread
THREAD=$(curl -s -X POST "$BASE_URL/chat-threads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Integration Test Thread", "routingMode": "AUTO"}')
THREAD_ID=$(echo $THREAD | jq -r '.id')
echo "2. Thread created: $THREAD_ID"

# Step 3: Send a message
MESSAGE=$(curl -s -X POST "$BASE_URL/chat-messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"threadId\": \"$THREAD_ID\", \"content\": \"Write a Python hello world script\"}")
MESSAGE_ID=$(echo $MESSAGE | jq -r '.id')
echo "3. Message sent: $MESSAGE_ID"

# Step 4: Wait for ASSISTANT response (poll)
for i in $(seq 1 30); do
  MESSAGES=$(curl -s "$BASE_URL/chat-messages?threadId=$THREAD_ID" \
    -H "Authorization: Bearer $TOKEN")
  ASSISTANT_COUNT=$(echo $MESSAGES | jq '[.data[] | select(.role == "ASSISTANT")] | length')
  if [ "$ASSISTANT_COUNT" -gt 0 ]; then
    echo "4. ASSISTANT response received after ${i}s"
    break
  fi
  sleep 1
done

if [ "$ASSISTANT_COUNT" -eq 0 ]; then
  echo "FAIL: No ASSISTANT response after 30s"
  exit 1
fi

# Step 5: Verify routing decision
DECISIONS=$(curl -s "$BASE_URL/routing/decisions?threadId=$THREAD_ID" \
  -H "Authorization: Bearer $TOKEN")
DECISION_COUNT=$(echo $DECISIONS | jq '.data | length')
echo "5. Routing decisions found: $DECISION_COUNT"

# Step 6: Verify audit log
sleep 5  # Allow async processing
AUDITS=$(curl -s "$BASE_URL/audits?entityId=$THREAD_ID" \
  -H "Authorization: Bearer $TOKEN")
AUDIT_COUNT=$(echo $AUDITS | jq '.data | length')
echo "6. Audit entries found: $AUDIT_COUNT"

# Step 7: Verify memory extraction (may take longer)
sleep 15
MEMORIES=$(curl -s "$BASE_URL/memories" \
  -H "Authorization: Bearer $TOKEN")
echo "7. Total memories: $(echo $MEMORIES | jq '.data | length')"

echo "--- Integration test complete ---"
```

### 6.2 Parallel Multi-Model Flow

```bash
# Send parallel request to multiple models
curl -X POST "$BASE_URL/chat-messages/parallel" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"threadId\": \"$THREAD_ID\",
    \"content\": \"Explain recursion\",
    \"models\": [
      {\"provider\": \"local-ollama\", \"model\": \"gemma3:4b\"},
      {\"provider\": \"GEMINI\", \"model\": \"gemini-2.5-flash\"}
    ]
  }"
```

**Assertions:**

- Multiple ASSISTANT messages stored (one per model)
- Each message has correct `provider` and `model` metadata
- `message.completed` published for each successful response
- Failed models do not block successful ones (Promise.allSettled)

---

## 7. Feature Compatibility Testing

When adding a new feature, verify it does not break existing flows:

### 7.1 Compatibility Matrix

| New Feature Area       | Must Verify These Existing Flows                                               |
| ---------------------- | ------------------------------------------------------------------------------ |
| Chat changes           | Message send/receive, routing, memory extraction, audit, SSE, parallel compare |
| Routing changes        | All 7 routing modes, policy evaluation, AUTO pipeline stages                   |
| Auth changes           | Login, logout, refresh, RBAC on all services, session expiry                   |
| Connector changes      | Sync, health check, model availability in routing                              |
| Memory changes         | Extraction, context assembly, context packs in chat                            |
| File changes           | Upload, chunking, attachment in chat messages                                  |
| Ollama changes         | Model pull, role assignment, routing model availability                        |
| Image changes          | Generation, progress SSE, audit logging                                        |
| Shared package changes | All 13 services that depend on the package                                     |

### 7.2 Smoke Test Suite

Run after every deployment or significant change:

```bash
# 1. Health check
curl -f http://localhost:4000/api/v1/health

# 2. Auth flow
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@claw.ai", "password": "admin123"}' | jq -r '.accessToken')

# 3. Thread CRUD
curl -f -X POST http://localhost:4000/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Smoke Test"}'

# 4. Connector list
curl -f http://localhost:4000/api/v1/connectors -H "Authorization: Bearer $TOKEN"

# 5. Model catalog
curl -f http://localhost:4000/api/v1/ollama/catalog -H "Authorization: Bearer $TOKEN"

# 6. Memory list
curl -f http://localhost:4000/api/v1/memories -H "Authorization: Bearer $TOKEN"

# 7. Routing policies
curl -f http://localhost:4000/api/v1/routing/policies -H "Authorization: Bearer $TOKEN"

# 8. Audit logs
curl -f http://localhost:4000/api/v1/audits -H "Authorization: Bearer $TOKEN"
```

---

## 8. Health Endpoint Verification

```bash
# Aggregated health (via health-service)
curl -s http://localhost:4000/api/v1/health | jq .

# Individual service health (bypass nginx)
for port in 4001 4002 4003 4004 4005 4006 4007 4008 4009 4010 4011 4012 4013; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/api/v1/health 2>/dev/null)
  echo "Port $port: $STATUS"
done
```

**Assertions:**

- Aggregated health returns status for all 13 services
- Each service individually returns 200
- Unhealthy services are flagged (not silently omitted)

---

## 9. Tools Reference

| Tool                   | Purpose                                         | Access                                                                       |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Docker Compose logs    | Service-level log inspection                    | `./scripts/claw.sh logs <service> --since <duration>` |
| RabbitMQ Management UI | Queue inspection, message rates, DLQ monitoring | `http://localhost:15672`                                                     |
| Direct service calls   | Bypass nginx to isolate service issues          | `http://localhost:<port>/api/v1/...`                                         |
| Redis CLI              | Cache key inspection                            | `docker compose exec redis redis-cli`                                        |
| PostgreSQL psql        | Direct DB queries                               | `docker compose exec <db-container> psql -U claw -d <database>`              |
| MongoDB mongosh        | Audit/log DB queries                            | `docker compose exec mongo mongosh <database>`                               |
| curl with `-v` flag    | HTTP header inspection (SSE, auth, CORS)        | `curl -v http://localhost:4000/...`                                          |

---

## 10. Integration Test Naming and Organization

```
tests/
  integration/
    flows/
      message-flow.integration.spec.ts       # Full message lifecycle
      parallel-flow.integration.spec.ts      # Multi-model parallel
      memory-extraction.integration.spec.ts  # Memory extraction pipeline
      file-attachment.integration.spec.ts    # File upload + chat
      image-generation.integration.spec.ts   # Image gen + audit
    events/
      rabbitmq-publish.integration.spec.ts   # Event publishing verification
      rabbitmq-consume.integration.spec.ts   # Event consumption verification
      dlq-handling.integration.spec.ts       # DLQ retry and dead-letter
    cache/
      redis-invalidation.integration.spec.ts # Cache invalidation after mutations
    sse/
      chat-stream.integration.spec.ts        # Chat SSE streaming
      pull-progress.integration.spec.ts      # Model download progress
    health/
      service-health.integration.spec.ts     # All services healthy
```

**Naming convention:** `<feature>-<aspect>.integration.spec.ts`

**Test isolation:** Each integration test should clean up after itself (delete created threads, messages, etc.) to avoid polluting subsequent runs.

---

## 11. Failure Investigation Checklist

When an integration test fails:

1. **Check service logs** -- `docker compose logs <service> --since 2m | grep -i error`
2. **Check RabbitMQ** -- are messages stuck in queues? Is the exchange healthy?
3. **Check DB** -- is the expected record present? Is the data correct?
4. **Check Redis** -- is stale cache being served?
5. **Check nginx** -- is the request reaching the correct service? (`docker compose logs nginx --since 2m`)
6. **Check Ollama** -- is the model loaded? Is generation responding? (`curl http://localhost:11434/api/tags`)
7. **Check container health** -- `docker compose ps` -- any containers in `unhealthy` or `restarting` state?
8. **Check network** -- can services reach each other? (`docker compose exec chat-service curl http://routing-service:4004/api/v1/health`)
