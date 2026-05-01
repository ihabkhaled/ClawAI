# Skill: Debug Toolkit

> Systematic approach to diagnosing bugs in ClawAI. Always check these in order before guessing.

---

## Debugging Protocol (always follow this order)

1. **Check Docker logs first** — most errors appear here before anywhere else
2. **Check the DB** — verify the data state you expect actually exists
3. **Check the API directly** — isolate whether the problem is frontend or backend
4. **Check RabbitMQ** — for async flows, verify events are being published and consumed
5. **Check nginx** — verify routing is correct
6. **Read the error message** — only after gathering evidence, hypothesize root cause

---

## Docker Log Commands

```bash
# Follow logs for a specific service
./scripts/claw.sh logs -f chat-service

# Get last 100 lines
./scripts/claw.sh logs chat-service --tail=100

# Check for critical errors
./scripts/claw.sh logs chat-service --tail=200 | \
  grep -E "ERROR|FATAL|UnhandledPromiseRejection|Cannot read"

# Check all services at once (last 20 lines each)
./scripts/claw.sh logs --tail=20

# Check logs since a specific time
./scripts/claw.sh logs --since="5m" connector-service
```

---

## DB Inspection Commands

```bash
# PostgreSQL — connect to a service database
docker exec claw-db-chat psql -U claw_user -d claw_chat

# PostgreSQL — run a quick query without psql interactive mode
docker exec claw-db-chat psql -U claw_user -d claw_chat \
  -tAc "SELECT COUNT(*) FROM \"ChatMessage\" WHERE role = 'ASSISTANT' LIMIT 10;"

# Check connector models count
docker exec claw-db-connectors psql -U claw_user -d claw_connectors \
  -tAc "SELECT provider, COUNT(*) FROM \"ConnectorModel\" GROUP BY provider;"

# Check recent routing decisions
docker exec claw-db-routing psql -U claw_user -d claw_routing \
  -tAc "SELECT selectedProvider, selectedModel, createdAt FROM \"RoutingDecision\" ORDER BY createdAt DESC LIMIT 10;"

# MongoDB — check audit logs
docker exec claw-mongo mongosh claw_audit --eval \
  'db.auditLogs.find().sort({createdAt:-1}).limit(5).pretty()'
```

---

## API Direct Testing (bypass frontend)

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claw.ai","password":"Admin123!"}' | jq -r '.accessToken')

# Test through nginx (port 4000)
curl -s http://localhost:4000/api/v1/connectors \
  -H "Authorization: Bearer $TOKEN" | jq .

# Test directly to service (bypass nginx — isolate service vs nginx issues)
curl -s http://localhost:4003/api/v1/connectors \
  -H "Authorization: Bearer $TOKEN" | jq .

# Test service health
curl -s http://localhost:4003/health | jq .
```

---

## RabbitMQ Inspection

```bash
# Open RabbitMQ management UI
http://localhost:15672 (admin/admin or check RABBITMQ_USER/PASSWORD in .env)

# Check queue depth (messages waiting to be consumed)
# In management UI: Queues → find queue → see "Ready" and "Unacked" counts

# CLI way to check queue depth
curl -s -u admin:admin http://localhost:15672/api/queues/%2F/ | \
  jq '.[] | {name: .name, messages: .messages}'

# Check dead-letter queue for failed messages
curl -s -u admin:admin http://localhost:15672/api/queues/%2F/claw.events.dlq | jq .
```

---

## Common Error Patterns and Fixes

### "No adapter registered for provider: OLLAMA"

**Cause**: The AdapterFactory doesn't have an entry for the provider enum value.

**Fix**:

1. Check `apps/claw-connector-service/src/modules/connectors/managers/adapter-factory.ts`
2. Verify the provider is registered: `case ConnectorProvider.OLLAMA: return this.ollamaAdapter`
3. Verify the adapter is injected in the factory constructor
4. Verify the adapter module is registered in the feature module

### "fetch failed" or "ECONNREFUSED" inside Docker

**Cause**: Service URL contains `localhost` or `127.0.0.1` — doesn't resolve inside Docker.

**Fix**: Replace localhost URL with Docker service name:

```
localhost:11434  →  ollama:11434
localhost:4002   →  claw-chat-service:4002
```

Check where the URL comes from — usually stored in DB or in env config.

### "Cannot set headers after they are sent to the client" on SSE endpoints

**Cause**: pino-http `autoLogging` is intercepting SSE routes and trying to log response headers after stream has started.

**Fix**:

1. Add `@SkipLogging()` decorator on SSE controller methods
2. Exclude SSE paths in pino-http config: `autoLogging: { ignore: (req) => req.url?.includes('/stream/') }`
3. Ensure `GlobalExceptionFilter` checks `response.headersSent` before writing

### Frontend polling infinite loop

**Cause**: Polling stop condition not being met (e.g., last message is still USER role when error occurred).

**Fix**:

1. The background manager MUST store an ASSISTANT message with `metadata: { error: true }` on failure
2. The poll hook MUST check `meta?.error === true` to stop
3. The frontend must also stop polling after a timeout (default: 90 polls × 1s = 90s)

### "TypeScript error: Object possibly undefined"

**Cause**: Trying to access a property on a potentially undefined/null value.

**Fix**: Handle nullability explicitly:

```typescript
// Bad
const name = user.profile.name;

// Good
const name = user.profile?.name ?? 'Unknown';
```

Never use `!` (non-null assertion) — it hides the real problem.

### "ESLint error: Unexpected inline type declaration"

**Cause**: A `type`, `interface`, or `enum` was defined inside a service/hook/component file.

**Fix**: Extract to the dedicated file:

- Backend types → `src/modules/<domain>/types/<name>.types.ts`
- Frontend types → `src/types/<domain>.types.ts`
- Enums → `src/common/enums/` or `src/enums/`

---

## Diagnosing a Full Message Flow Bug

When a message is sent but AI doesn't respond:

```bash
# 1. Was the USER message stored?
docker exec claw-db-chat psql -U claw_user -d claw_chat \
  -tAc "SELECT id, role, content, createdAt FROM \"ChatMessage\" ORDER BY createdAt DESC LIMIT 3;"

# 2. Was message.created published?
./scripts/claw.sh logs chat-service --tail=50 | \
  grep "message.created\|Published event"

# 3. Did routing service receive it?
./scripts/claw.sh logs routing-service --tail=50 | \
  grep "handleMessageCreated\|selectedProvider"

# 4. Was message.routed published?
./scripts/claw.sh logs routing-service --tail=50 | \
  grep "message.routed\|Published"

# 5. Did chat service receive routing?
./scripts/claw.sh logs chat-service --tail=50 | \
  grep "handleMessageRouted\|callProvider\|OLLAMA"

# 6. Did the LLM call succeed?
./scripts/claw.sh logs chat-service --tail=50 | \
  grep "callOllama\|callAnthropic\|callOpenAI\|provider.*error"

# 7. Was ASSISTANT message stored?
docker exec claw-db-chat psql -U claw_user -d claw_chat \
  -tAc "SELECT role, provider, model, metadata FROM \"ChatMessage\" ORDER BY createdAt DESC LIMIT 5;"
```

---

## Container Health Checks

```bash
# Check all service health status
./scripts/claw.sh ps

# Check specific service health
docker inspect claw-chat-service | jq '.[0].State.Health'

# Force health check run
docker exec claw-chat-service wget -qO- http://localhost:4002/health
```
