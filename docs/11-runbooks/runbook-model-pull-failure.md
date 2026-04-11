# Runbook: Model Pull Failure

## Symptoms

- Model download stuck at 0% or a specific percentage
- Pull job shows "FAILED" status in the UI
- "Error pulling model" in ollama-service logs
- SSE progress stream disconnects unexpectedly

## Diagnosis Steps

### 1. Check Pull Job Status

```bash
# Via API
curl -s http://localhost:4000/api/v1/ollama/pull-jobs \
  -H "Authorization: Bearer $TOKEN" | jq .

# Check for failed jobs
curl -s http://localhost:4000/api/v1/ollama/pull-jobs \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.status == "FAILED")'
```

### 2. Check Ollama Service Logs

```bash
docker compose -f docker-compose.dev.yml logs --tail=50 ollama-service
```

Look for:
- `Error pulling model` -- general pull failure
- `ECONNREFUSED` -- cannot reach Ollama runtime
- `timeout` -- Ollama took too long to respond
- `ENOSPC` -- disk full

### 3. Check Ollama Runtime Logs

```bash
docker compose -f docker-compose.dev.yml logs --tail=50 ollama
```

Look for:
- `pull model manifest` -- download starting
- `downloading` -- active download
- `error` -- specific error from Ollama
- `context deadline exceeded` -- network timeout

### 4. Check Disk Space

```bash
# Docker disk usage
docker system df

# Ollama model storage
docker compose -f docker-compose.dev.yml exec ollama du -sh /root/.ollama/models/
```

### 5. Check Network Connectivity

```bash
# From the Ollama container, can it reach the registry?
docker compose -f docker-compose.dev.yml exec ollama \
  curl -s -o /dev/null -w "%{http_code}" https://registry.ollama.ai/v2/
```

## Common Failures and Fixes

### Network Timeout

**Symptom**: Pull starts but hangs or fails after partial download.

**Fix**:
```bash
# Retry the pull -- Ollama resumes partial downloads
curl -X POST http://localhost:4000/api/v1/ollama/catalog/<id>/pull \
  -H "Authorization: Bearer $TOKEN"
```

If retries fail:
```bash
# Clear partial download and retry
docker compose -f docker-compose.dev.yml exec ollama \
  ollama rm <model-name> 2>/dev/null
# Then retry from the UI
```

### Disk Space Full

**Symptom**: `ENOSPC` error or pull fails at the writing stage.

**Fix**:
```bash
# Check disk usage
docker system df -v

# Remove unused models
docker compose -f docker-compose.dev.yml exec ollama ollama rm <unused-model>

# Remove unused Docker images
docker image prune -f

# Remove unused volumes
docker volume prune -f
```

Model sizes to plan for:

| Model Size | Disk Required |
| ---------- | ------------- |
| 1B params  | ~600 MB       |
| 3B params  | ~2 GB         |
| 7B params  | ~4 GB         |
| 14B params | ~8 GB         |
| 32B params | ~19 GB        |

### Ollama Runtime Not Running

**Symptom**: `ECONNREFUSED` when ollama-service tries to pull.

**Fix**:
```bash
# Check Ollama container
docker compose -f docker-compose.dev.yml ps ollama

# Restart Ollama
docker compose -f docker-compose.dev.yml restart ollama

# Wait for health check
sleep 10
curl -s http://localhost:11434/
# Should return "Ollama is running"
```

### Model Name Not Found

**Symptom**: `404` or "model not found" from Ollama registry.

**Fix**:
1. Verify the model name in the Ollama library: https://ollama.com/library
2. Check the catalog entry's `ollamaName` field matches the registry name exactly
3. Common format: `modelname:tag` (e.g., `llama3.2:3b`, `gemma3:4b`)

### Pull Job Stuck in "PULLING" Status

**Symptom**: The job shows as active but no progress updates for >5 minutes.

**Fix**:
```bash
# Cancel the stuck job via API
curl -X DELETE http://localhost:4000/api/v1/ollama/pull-jobs/<job-id> \
  -H "Authorization: Bearer $TOKEN"

# Check if Ollama is actually still downloading
docker compose -f docker-compose.dev.yml exec ollama ollama ps

# Restart ollama-service to clean up stale state
docker compose -f docker-compose.dev.yml restart ollama-service

# Retry the pull
```

### SSE Progress Stream Disconnects

**Symptom**: Frontend shows progress briefly, then stops updating.

**Fix**:
1. Check Nginx SSE configuration:
   ```nginx
   proxy_buffering off;
   proxy_cache off;
   proxy_read_timeout 86400;
   ```
2. Verify `@SkipLogging()` decorator on the SSE controller
3. Check browser network tab for the SSE connection status
4. The frontend should automatically reconnect. If not, refresh the page.

## Manual Pull via Ollama CLI

If the API-based pull keeps failing, try pulling directly:

```bash
# Shell into the Ollama container
docker compose -f docker-compose.dev.yml exec ollama bash

# Pull directly
ollama pull gemma3:4b

# Verify
ollama list
```

Then sync the database:

```bash
# Restart ollama-service to trigger model sync
docker compose -f docker-compose.dev.yml restart ollama-service
```

## Prevention

- Monitor disk space before pulling large models
- Check network connectivity before starting pulls
- Use the catalog's size information to verify sufficient disk space
- Keep Ollama runtime updated to the latest version for bug fixes
