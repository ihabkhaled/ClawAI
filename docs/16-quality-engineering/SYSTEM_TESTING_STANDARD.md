# System Testing Standard

> ClawAI Quality Engineering -- Document 9 of 10

## Purpose

System testing verifies that the entire ClawAI platform operates correctly as a unified system: all 17 services start, communicate, and remain stable under normal operating conditions. This is infrastructure-level validation, not feature-level testing.

---

## 1. Service Health Verification

### 1.1 Aggregated Health Check

```bash
# Via health-service (through nginx)
curl -s http://localhost:4000/api/v1/health | jq .
```

**Expected response structure:**

```json
{
  "status": "ok",
  "services": {
    "auth": { "status": "up", "latency": 12 },
    "chat": { "status": "up", "latency": 15 },
    "connector": { "status": "up", "latency": 10 },
    "routing": { "status": "up", "latency": 11 },
    "memory": { "status": "up", "latency": 13 },
    "file": { "status": "up", "latency": 9 },
    "audit": { "status": "up", "latency": 14 },
    "ollama": { "status": "up", "latency": 18 },
    "health": { "status": "up", "latency": 1 },
    "client-logs": { "status": "up", "latency": 8 },
    "server-logs": { "status": "up", "latency": 10 },
    "image": { "status": "up", "latency": 12 },
    "file-generation": { "status": "up", "latency": 11 }
  }
}
```

**Assertions:**

- All 17 services report `"up"`
- No service latency exceeds 5000ms (indicates a problem)
- Response returns within 10 seconds

### 1.2 Individual Service Health

Test each service directly (bypassing nginx) to isolate service-level issues from proxy issues:

```bash
#!/bin/bash
SERVICES=(
  "auth:4001"
  "chat:4002"
  "connector:4003"
  "routing:4004"
  "memory:4005"
  "file:4006"
  "audit:4007"
  "ollama:4008"
  "health:4009"
  "client-logs:4010"
  "server-logs:4011"
  "image:4012"
  "file-generation:4013"
)

echo "=== Individual Service Health Check ==="
FAILED=0
for entry in "${SERVICES[@]}"; do
  NAME="${entry%%:*}"
  PORT="${entry##*:}"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/v1/health" 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    echo "  [OK]   $NAME (port $PORT)"
  else
    echo "  [FAIL] $NAME (port $PORT) -- HTTP $STATUS"
    FAILED=$((FAILED + 1))
  fi
done

if [ $FAILED -gt 0 ]; then
  echo "FAILED: $FAILED services unhealthy"
  exit 1
else
  echo "ALL services healthy"
fi
```

---

## 2. Docker Stability

### 2.1 Container Status

```bash
./scripts/claw.sh ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

**Assertions:**

- All containers show `Up` or `Up (healthy)` status
- No container shows `Restarting` (indicates a crash loop)
- No container shows `Exited` (indicates a startup failure)
- Port mappings match expected configuration

### 2.2 Restart Loop Detection

```bash
# Check restart counts
./scripts/claw.sh ps --format "{{.Name}}: {{.Status}}" | grep -i restart

# Check for containers that restarted in the last 5 minutes
./scripts/claw.sh ps --format "{{.Name}} {{.Status}}" | while read name status; do
  RESTARTS=$(docker inspect --format='{{.RestartCount}}' "$name" 2>/dev/null)
  if [ "$RESTARTS" -gt 0 ] 2>/dev/null; then
    echo "WARNING: $name has restarted $RESTARTS times"
  fi
done
```

**Assertions:**

- Zero restart counts on all service containers
- Database containers have zero restarts
- RabbitMQ and Redis have zero restarts

### 2.3 Healthcheck Verification

```bash
# Check Docker healthcheck status for each container
./scripts/claw.sh ps --format "{{.Name}}: {{.Health}}" | sort
```

**Assertions:**

- Services with healthchecks show `healthy`
- No service stuck in `starting` for more than 2 minutes
- No service in `unhealthy` state

---

## 3. Nginx Routing Verification

### 3.1 Every Route Resolves

Test every route defined in `infra/nginx/nginx.conf`:

```bash
#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@claw.ai", "password": "admin123"}' | jq -r '.accessToken')

echo "=== Nginx Route Verification ==="

# Public endpoints (no auth required)
check_route() {
  local METHOD=$1
  local PATH=$2
  local EXPECT=$3
  local AUTH=$4

  if [ "$AUTH" = "auth" ]; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "http://localhost:4000$PATH" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" 2>/dev/null)
  else
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "http://localhost:4000$PATH" \
      -H "Content-Type: application/json" 2>/dev/null)
  fi

  if [ "$STATUS" = "$EXPECT" ] || [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
    echo "  [OK]   $METHOD $PATH -> $STATUS"
  else
    echo "  [FAIL] $METHOD $PATH -> $STATUS (expected $EXPECT)"
  fi
}

# Auth routes
check_route POST /api/v1/auth/login 200 noauth
check_route GET /api/v1/auth/me 200 auth

# Chat routes
check_route GET /api/v1/chat-threads 200 auth
check_route GET /api/v1/chat-messages 200 auth

# Connector routes
check_route GET /api/v1/connectors 200 auth

# Routing routes
check_route GET /api/v1/routing/policies 200 auth

# Memory routes
check_route GET /api/v1/memories 200 auth
check_route GET /api/v1/context-packs 200 auth

# File routes
check_route GET /api/v1/files 200 auth

# Audit routes
check_route GET /api/v1/audits 200 auth
check_route GET /api/v1/usage 200 auth

# Ollama routes
check_route GET /api/v1/ollama/catalog 200 auth
check_route GET /api/v1/ollama/pull-jobs 200 auth

# Health route
check_route GET /api/v1/health 200 noauth

# Client logs route
check_route POST /api/v1/client-logs 200 auth

# Server logs route
check_route GET /api/v1/server-logs 200 auth

# Image routes
check_route GET /api/v1/images 200 auth

# File generation routes
check_route GET /api/v1/file-generations 200 auth
```

### 3.2 SSE Routes Have Correct Configuration

```bash
# Extract and verify SSE-related nginx config
./scripts/claw.sh exec nginx cat /etc/nginx/nginx.conf | \
  grep -A 10 "stream\|progress\|sse" | head -50
```

**Assertions for every SSE route:**

- `proxy_http_version 1.1;` is present
- `proxy_set_header Connection "";` is present
- `proxy_read_timeout 86400;` (or similar long timeout)
- `proxy_buffering off;` is present
- `proxy_cache off;` is present
- SSE location blocks appear BEFORE their generic service location blocks

### 3.3 Nginx Error Log Check

```bash
./scripts/claw.sh logs nginx --since 5m 2>&1 | grep -i "error\|warn" | head -20
```

**Assertions:**

- No 502 Bad Gateway errors (service unreachable)
- No 504 Gateway Timeout errors (service too slow)
- No connection refused errors

---

## 4. Startup Verification

### 4.1 Startup Order

Services must start in the correct dependency order. Docker Compose `depends_on` with `condition: service_healthy` enforces this, but verify:

```
Phase 1: Infrastructure
  - PostgreSQL (9 instances), MongoDB, Redis, RabbitMQ, Ollama

Phase 2: Services (after infrastructure is healthy)
  - auth-service (needs PostgreSQL)
  - All other services (need PostgreSQL/MongoDB + RabbitMQ)
  - health-service (needs all other services for aggregation)

Phase 3: Proxy
  - nginx (needs all services)

Phase 4: Frontend
  - claw-frontend (needs nginx)
```

### 4.2 Migration Verification

```bash
# Check that all Prisma migrations are applied
for service in auth chat connector routing memory file ollama image file-generation; do
  echo "=== $service ==="
  ./scripts/claw.sh exec ${service}-service npx prisma migrate status 2>&1 | tail -3
done
```

**Assertions:**

- Every service reports "Database schema is up to date"
- No pending migrations
- No failed migrations

### 4.3 Seed Verification

```bash
# Verify admin user exists
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@claw.ai", "password": "admin123"}' | jq '.accessToken'

# Verify model catalog is seeded
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@claw.ai", "password": "admin123"}' | jq -r '.accessToken')

CATALOG_COUNT=$(curl -s http://localhost:4000/api/v1/ollama/catalog \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length')
echo "Catalog models: $CATALOG_COUNT"

# Verify auto-pulled models
MODELS=$(curl -s http://localhost:11434/api/tags | jq '.models | length')
echo "Ollama models loaded: $MODELS"
```

**Assertions:**

- Admin user exists and can authenticate
- Model catalog has 30+ entries
- At least 3 Ollama models are pulled (qwen3:1.7b, phi4-mini, gemma3:4b)

---

## 5. Restart Recovery Verification

### 5.1 Individual Service Restart

```bash
#!/bin/bash
echo "=== Restart Recovery Test ==="

for service in auth-service chat-service connector-service routing-service memory-service \
               file-service audit-service ollama-service health-service client-logs-service \
               server-logs-service image-service file-generation-service; do
  echo -n "Restarting $service... "
  ./scripts/claw.sh restart "$service"

  # Wait up to 60 seconds for healthy
  for i in $(seq 1 12); do
    sleep 5
    HEALTH=$(./scripts/claw.sh ps "$service" --format "{{.Health}}" 2>/dev/null)
    if [ "$HEALTH" = "healthy" ]; then
      echo "recovered in $((i * 5))s"
      break
    fi
    if [ $i -eq 12 ]; then
      echo "FAILED to recover after 60s"
    fi
  done
done
```

**Assertions:**

- Every service recovers within 60 seconds of restart
- No data loss after restart (query for recently created data)
- RabbitMQ connections re-established (check service logs for "Connected to RabbitMQ")
- Database connections re-established (check service logs for "Prisma connected" or equivalent)

### 5.2 Infrastructure Restart

```bash
# Restart Redis
./scripts/claw.sh restart redis
sleep 10
# Verify services reconnect
./scripts/claw.sh logs --since 30s | grep -i "redis\|reconnect"

# Restart RabbitMQ
./scripts/claw.sh restart rabbitmq
sleep 30
# Verify services reconnect
./scripts/claw.sh logs --since 60s | grep -i "rabbitmq\|amqp\|reconnect"
```

**Assertions:**

- Services reconnect to Redis within 30 seconds
- Services reconnect to RabbitMQ within 60 seconds
- No permanent failures after infrastructure restart

---

## 6. Database and Migration Sanity

### 6.1 Schema Consistency

```bash
# For each PostgreSQL service, verify schema matches Prisma model
for service in auth chat connector routing memory file ollama image file-generation; do
  echo "=== $service ==="
  ./scripts/claw.sh exec ${service}-service npx prisma validate 2>&1
done
```

### 6.2 No Orphaned Data

```bash
# Example: verify no messages reference non-existent threads
./scripts/claw.sh exec chat-db \
  psql -U claw -d claw_chat -c "
    SELECT COUNT(*) as orphaned_messages
    FROM \"ChatMessage\" m
    LEFT JOIN \"ChatThread\" t ON m.\"threadId\" = t.id
    WHERE t.id IS NULL;
  "
```

**Assertions:**

- Zero orphaned records in all databases
- All foreign key constraints valid
- No null values in required fields

---

## 7. Log Storm Detection

Log storms indicate a service is in a failure loop, logging the same error thousands of times.

```bash
#!/bin/bash
echo "=== Log Storm Detection (last 5 minutes) ==="

# Count error lines per service
./scripts/claw.sh logs --since 5m 2>&1 | \
  grep -i "error\|exception\|fatal" | \
  awk -F'|' '{print $1}' | \
  sort | uniq -c | sort -rn | head -20

echo ""
echo "=== Repeated Error Patterns ==="

# Find the most repeated error messages
./scripts/claw.sh logs --since 5m 2>&1 | \
  grep -i "error" | \
  sed 's/[0-9a-f]\{8\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{12\}//g' | \
  sort | uniq -c | sort -rn | head -10
```

**Thresholds:**

- More than 50 errors in 5 minutes from one service: investigate immediately
- More than 10 identical error messages: indicates a retry loop or unhandled condition
- Any `fatal` or `ECONNREFUSED` errors: service cannot reach a dependency

**Common log storm causes:**

- Database connection pool exhausted
- RabbitMQ connection refused (service started before RabbitMQ)
- Ollama model not loaded (generation requests fail repeatedly)
- Redis connection timeout

---

## 8. Memory and CPU Monitoring

### 8.1 Container Resource Usage

```bash
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | sort
```

**Thresholds:**

| Container Type   | Max Memory               | Max CPU (steady state)   |
| ---------------- | ------------------------ | ------------------------ |
| NestJS service   | 512MB                    | 5%                       |
| PostgreSQL       | 256MB per instance       | 3%                       |
| MongoDB          | 512MB                    | 5%                       |
| Redis            | 128MB                    | 2%                       |
| RabbitMQ         | 256MB                    | 3%                       |
| Ollama           | 8GB+ (depends on models) | Varies during generation |
| Nginx            | 64MB                     | 1%                       |
| Next.js frontend | 512MB                    | 5%                       |

**Assertions:**

- No service exceeds its memory threshold in steady state
- CPU usage is stable (no runaway process)
- Ollama memory scales with loaded models (expected)

### 8.2 Memory Leak Detection

Run the resource check twice, 10 minutes apart, under idle conditions:

```bash
# Snapshot 1
docker stats --no-stream --format "{{.Name}}: {{.MemUsage}}" > /tmp/mem-snapshot-1.txt

# Wait 10 minutes with no activity
sleep 600

# Snapshot 2
docker stats --no-stream --format "{{.Name}}: {{.MemUsage}}" > /tmp/mem-snapshot-2.txt

# Compare
diff /tmp/mem-snapshot-1.txt /tmp/mem-snapshot-2.txt
```

**Assertion:** Memory usage should not grow more than 10% over 10 minutes in idle state.

---

## 9. RabbitMQ Verification

### 9.1 Exchange and Queue Health

```bash
# Verify exchange exists
curl -s -u guest:guest http://localhost:15672/api/exchanges/%2F/claw.events | jq '{name, type, durable}'

# List all queues with message counts
curl -s -u guest:guest http://localhost:15672/api/queues/%2F | \
  jq '.[] | {name, messages, messages_unacknowledged, consumers}'
```

**Assertions:**

- Exchange `claw.events` exists, type `topic`, durable `true`
- All expected queues are bound to the exchange
- `messages` count is 0 or near 0 in steady state (messages are being consumed)
- `messages_unacknowledged` is 0 in steady state
- `consumers` count is > 0 for each queue (at least one consumer connected)

### 9.2 DLQ Check

```bash
# Check for messages in dead-letter queues
curl -s -u guest:guest http://localhost:15672/api/queues/%2F | \
  jq '.[] | select(.name | contains("dlq")) | {name, messages}'
```

**Assertions:**

- DLQ queues exist (they are created by the shared-rabbitmq package)
- DLQ message count is 0 in normal operation
- If DLQ has messages, investigate the failed consumer

### 9.3 Connection Health

```bash
# List connections (one per service)
curl -s -u guest:guest http://localhost:15672/api/connections | jq '.[].name' | wc -l
```

**Assertion:** Number of connections matches number of services that use RabbitMQ (all 17 services minus health-service = 12 minimum).

---

## 10. Redis Verification

```bash
# Ping
./scripts/claw.sh exec redis redis-cli PING
# Expected: PONG

# Info (memory, connected clients, keys)
./scripts/claw.sh exec redis redis-cli INFO | grep -E "used_memory_human|connected_clients|db0|evicted_keys"
```

**Assertions:**

- Redis responds to PING with PONG
- `connected_clients` is > 0
- `evicted_keys` is 0 (no eviction due to memory pressure)
- Memory usage is reasonable (< 128MB for ClawAI's caching needs)

---

## 11. Nginx SSE Verification

### 11.1 SSE Configuration Audit

```bash
./scripts/claw.sh exec nginx cat /etc/nginx/nginx.conf
```

Verify every SSE endpoint has these directives:

```nginx
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_read_timeout 86400;
proxy_buffering off;
proxy_cache off;
```

### 11.2 SSE Functional Test

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@claw.ai", "password": "admin123"}' | jq -r '.accessToken')

# Test SSE endpoint responds without immediate close
# (timeout after 5s is expected -- we just want to verify the connection opens)
timeout 5 curl -N -s \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/v1/chat-messages/stream/test-thread-id" \
  2>&1 || true

echo "SSE connection test complete (timeout is expected)"
```

**Assertion:** The connection opens and stays open (not immediately closed by nginx buffering).

---

## 12. Ollama Verification

### 12.1 Ollama Connectivity

```bash
# Direct Ollama API
curl -s http://localhost:11434/api/tags | jq '.models[] | {name, size}'
```

### 12.2 Model Availability

```bash
# Verify expected models are loaded
MODELS=$(curl -s http://localhost:11434/api/tags | jq -r '.models[].name')
echo "Loaded models:"
echo "$MODELS"

# Check for required router models
for model in "qwen3:1.7b" "phi4-mini" "gemma3:4b"; do
  if echo "$MODELS" | grep -q "$model"; then
    echo "  [OK] $model"
  else
    echo "  [MISSING] $model"
  fi
done
```

### 12.3 Generation Test

```bash
# Test that Ollama can generate a response
curl -s http://localhost:11434/api/generate \
  -d '{"model": "gemma3:4b", "prompt": "Say hello", "stream": false}' | jq '.response'
```

**Assertions:**

- Ollama API responds on port 11434
- At least 3 router models are loaded (qwen3:1.7b, phi4-mini, gemma3:4b)
- Generation endpoint returns a non-empty response
- Response time is under 30 seconds for a simple prompt

---

## 13. Port Conflict Detection

```bash
#!/bin/bash
echo "=== Port Conflict Detection ==="

EXPECTED_PORTS=(3000 4000 4001 4002 4003 4004 4005 4006 4007 4008 4009 4010 4011 4012 4013 5432 27017 6379 5672 15672 11434)

for port in "${EXPECTED_PORTS[@]}"; do
  COUNT=$(./scripts/claw.sh ps --format "{{.Ports}}" | grep -c ":$port->" 2>/dev/null || echo 0)
  if [ "$COUNT" -gt 1 ]; then
    echo "  [CONFLICT] Port $port is mapped by $COUNT containers"
  elif [ "$COUNT" -eq 0 ]; then
    echo "  [MISSING]  Port $port is not mapped by any container"
  else
    echo "  [OK]       Port $port"
  fi
done
```

**Assertions:**

- Each port is mapped by exactly one container
- No host port conflicts
- All expected ports are allocated

---

## 14. Full System Test Script

Combine all checks into a single runnable script:

```bash
#!/bin/bash
# system-test.sh -- Run all system verification checks
set -e

PASS=0
FAIL=0

check() {
  local NAME=$1
  local CMD=$2
  if eval "$CMD" > /dev/null 2>&1; then
    echo "[PASS] $NAME"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $NAME"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================="
echo "  ClawAI System Test Suite"
echo "========================================="
echo ""

# Health
check "Aggregated health endpoint" "curl -sf http://localhost:4000/api/v1/health"
check "Auth service (4001)" "curl -sf http://localhost:4001/api/v1/health"
check "Chat service (4002)" "curl -sf http://localhost:4002/api/v1/health"
check "Connector service (4003)" "curl -sf http://localhost:4003/api/v1/health"
check "Routing service (4004)" "curl -sf http://localhost:4004/api/v1/health"
check "Memory service (4005)" "curl -sf http://localhost:4005/api/v1/health"
check "File service (4006)" "curl -sf http://localhost:4006/api/v1/health"
check "Audit service (4007)" "curl -sf http://localhost:4007/api/v1/health"
check "Ollama service (4008)" "curl -sf http://localhost:4008/api/v1/health"
check "Health service (4009)" "curl -sf http://localhost:4009/api/v1/health"
check "Client-logs service (4010)" "curl -sf http://localhost:4010/api/v1/health"
check "Server-logs service (4011)" "curl -sf http://localhost:4011/api/v1/health"
check "Image service (4012)" "curl -sf http://localhost:4012/api/v1/health"
check "File-generation service (4013)" "curl -sf http://localhost:4013/api/v1/health"

# Infrastructure
check "RabbitMQ management" "curl -sf -u guest:guest http://localhost:15672/api/overview"
check "Redis PING" "./scripts/claw.sh exec -T redis redis-cli PING | grep PONG"
check "Ollama API" "curl -sf http://localhost:11434/api/tags"

# Auth
check "Admin login" "curl -sf -X POST http://localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@claw.ai\",\"password\":\"admin123\"}' | jq -e '.accessToken'"

echo ""
echo "========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "========================================="

exit $FAIL
```

---

## 15. Tools Quick Reference

| Tool              | Command                                               | Purpose                         |
| ----------------- | ----------------------------------------------------- | ------------------------------- |
| Container status  | `./scripts/claw.sh ps`                                | Check all container states      |
| Service logs      | `./scripts/claw.sh logs <service> --since <duration>` | Inspect service output          |
| All logs (recent) | `./scripts/claw.sh logs --since 5m`                   | Broad error scan                |
| Resource usage    | `docker stats --no-stream`                            | CPU/memory per container        |
| RabbitMQ UI       | `http://localhost:15672`                              | Queue inspection, message rates |
| Redis CLI         | `docker compose exec redis redis-cli`                 | Cache key inspection            |
| PostgreSQL        | `docker compose exec <db> psql -U claw -d <database>` | Direct DB queries               |
| MongoDB           | `docker compose exec mongo mongosh <database>`        | Audit/log DB queries            |
| Ollama API        | `curl http://localhost:11434/api/tags`                | Model list                      |
| Nginx config      | `docker compose exec nginx cat /etc/nginx/nginx.conf` | Proxy configuration             |
| Health check      | `curl http://localhost:4000/api/v1/health`            | System-wide health              |
