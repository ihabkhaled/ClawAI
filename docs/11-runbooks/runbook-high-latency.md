# Runbook: High Latency Diagnosis

## Symptoms

- Chat responses take >10 seconds for simple queries
- "AI is thinking..." indicator spins for extended periods
- Model downloads are abnormally slow
- Pages take >3 seconds to load
- SSE connections timeout before receiving data

## Diagnosis Framework

Latency in ClawAI can originate from 5 layers:

```
Frontend → Nginx → Backend Service → Database → AI Provider/Ollama
```

Work from the outside in to isolate the bottleneck.

### Step 1: Identify the Slow Layer

```bash
# Check if Nginx itself is slow (should respond in <100ms)
time curl -s -o /dev/null -w "%{time_total}" http://localhost:4000/api/v1/health

# Check if a specific service is slow (bypass Nginx)
time curl -s -o /dev/null -w "%{time_total}" http://localhost:4002/api/v1/chat-threads \
  -H "Authorization: Bearer $TOKEN"

# Check database latency
docker compose -f docker-compose.dev.yml exec postgres-chat \
  psql -U claw_chat_user claw_chat -c "SELECT 1;" -t
```

### Step 2: Check Service Health

```bash
# Aggregated health check
curl -s http://localhost:4000/api/v1/health | jq .

# Individual service health
curl -s http://localhost:4002/health | jq .
```

Look for services reporting degraded or unhealthy status.

### Step 3: Check Container Resource Usage

```bash
# CPU and memory usage for all containers
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

Red flags:
- CPU >80% sustained on any service
- Memory usage near container limit
- Ollama at 100% CPU during generation

## Common Latency Sources

### 1. Local Ollama Generation (Most Common)

**Symptom**: Chat responses with local models take 10-60 seconds.

**Cause**: Local inference on CPU is inherently slow, especially for larger models.

**Diagnosis**:
```bash
# Check Ollama resource usage
docker stats --no-stream ollama

# Check which model is loaded
docker compose -f docker-compose.dev.yml exec ollama ollama ps

# Time a direct generation request
time curl -s http://localhost:11434/api/generate \
  -d '{"model":"gemma3:4b","prompt":"Hello","stream":false}' | jq .total_duration
```

**Fixes**:
- Use a smaller model (gemma2:2b instead of gemma3:4b)
- Add GPU passthrough to the Ollama container
- Reduce `max_tokens` in thread settings
- Switch to a cloud provider for latency-sensitive tasks

### 2. Database Connection Pool Exhaustion

**Symptom**: All API calls become slow simultaneously.

**Cause**: Prisma's connection pool is exhausted, and queries queue up waiting for a free connection.

**Diagnosis**:
```bash
# Check active connections
docker compose -f docker-compose.dev.yml exec postgres-chat \
  psql -U claw_chat_user claw_chat -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check waiting connections
docker compose -f docker-compose.dev.yml exec postgres-chat \
  psql -U claw_chat_user claw_chat -c \
  "SELECT count(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL;"
```

**Fixes**:
- Increase Prisma connection pool size in the DATABASE_URL:
  ```
  DATABASE_URL="postgresql://...?connection_limit=20"
  ```
- Check for long-running queries:
  ```sql
  SELECT pid, query, state, now() - query_start AS duration
  FROM pg_stat_activity
  WHERE state = 'active'
  ORDER BY duration DESC;
  ```
- Kill stuck queries: `SELECT pg_terminate_backend(<pid>);`

### 3. Context Assembly (Memory + Files)

**Symptom**: Latency increases with conversation length or when many files/memories are attached.

**Cause**: The `ContextAssemblyManager` makes HTTP calls to memory-service and file-service to build the prompt. With many memories, context packs, and file chunks, this aggregation takes time.

**Diagnosis**:
```bash
# Check chat-service logs for context assembly timing
docker compose -f docker-compose.dev.yml logs --tail=100 chat-service | grep -i "context\|assembly\|fetch"
```

**Fixes**:
- Reduce the number of memories fetched (limit parameter)
- Use fewer context packs per thread
- Chunk large files into smaller pieces
- Consider caching assembled context for repeated queries

### 4. Cloud Provider Latency

**Symptom**: Specific provider is slow while others are fast.

**Cause**: Cloud API latency varies by provider, model, and server load.

**Diagnosis**:
```bash
# Check recent message latencies by provider
curl -s http://localhost:4000/api/v1/chat-messages?limit=20 \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.data[] | {provider, model, latencyMs}'
```

Typical latencies:

| Provider         | Model           | Expected Latency |
| ---------------- | --------------- | ---------------- |
| OpenAI           | gpt-4o-mini     | 1-3 seconds      |
| OpenAI           | gpt-4o          | 2-5 seconds      |
| Anthropic        | claude-sonnet-4 | 3-8 seconds      |
| Anthropic        | claude-opus-4   | 5-15 seconds     |
| Gemini           | gemini-2.5-flash| 1-4 seconds      |
| Local Ollama     | gemma3:4b (CPU) | 5-30 seconds     |
| Local Ollama     | gemma3:4b (GPU) | 1-5 seconds      |

**Fixes**:
- Switch routing mode to LOW_LATENCY (uses gpt-4o-mini)
- Use smaller local models for less demanding tasks
- Check provider status pages for outages

### 5. Nginx Proxy Overhead

**Symptom**: Requests through Nginx (port 4000) are slower than direct service calls.

**Cause**: Nginx misconfiguration, DNS resolution issues, or proxy buffering on SSE endpoints.

**Diagnosis**:
```bash
# Compare: through Nginx vs direct
time curl -s http://localhost:4000/api/v1/chat-threads -H "Authorization: Bearer $TOKEN"
time curl -s http://localhost:4002/api/v1/chat-threads -H "Authorization: Bearer $TOKEN"
```

If the difference is >500ms, check Nginx configuration:

```bash
# Check Nginx error log
docker compose -f docker-compose.dev.yml logs --tail=50 nginx
```

**Fixes**:
- Ensure `proxy_buffering off` for SSE routes
- Check `resolver` directive points to Docker DNS (127.0.0.11)
- Verify upstream service is resolvable

### 6. RabbitMQ Queue Backlog

**Symptom**: Events are delayed. Audit logs appear minutes after the action.

**Cause**: Consumer services cannot keep up with published events.

**Diagnosis**:
```bash
# Check queue depths via RabbitMQ management API
curl -s -u guest:guest http://localhost:15672/api/queues | \
  jq '.[] | {name, messages, consumers}'
```

**Fixes**:
- Restart the lagging consumer service
- Check for errors in the consumer's logs
- If DLQ has messages, investigate and replay them

## Quick Latency Checklist

1. Is Ollama loaded with a large model on CPU? -> Use smaller model or add GPU
2. Is the database connection pool full? -> Increase pool size
3. Is the conversation very long with many files? -> Reduce context size
4. Is a cloud provider having an outage? -> Check status pages, switch provider
5. Is a Docker container using excessive CPU/memory? -> Check `docker stats`
6. Are RabbitMQ queues backing up? -> Restart consumer, check for errors
