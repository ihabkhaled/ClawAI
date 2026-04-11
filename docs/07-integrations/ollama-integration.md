# Ollama Integration Guide

## Overview

Ollama is ClawAI's primary local AI runtime. It runs open-source LLMs on the user's hardware, providing privacy-first inference without cloud dependencies. ClawAI's `claw-ollama-service` (port 4008) wraps Ollama's HTTP API (port 11434) with model management, role assignment, catalog browsing, and pull job tracking.

## Ollama HTTP API

### Base URL

- **Docker**: `http://ollama:11434` (container-to-container)
- **Host**: `http://localhost:11434` (direct access)
- **Configurable**: `OLLAMA_BASE_URL` environment variable

### Endpoints Used by ClawAI

| Endpoint              | Method | Purpose                        | ClawAI Caller           |
| --------------------- | ------ | ------------------------------ | ----------------------- |
| `/`                   | GET    | Health check (returns 200)     | health-service          |
| `/api/tags`           | GET    | List installed models          | ollama-service (sync)   |
| `/api/pull`           | POST   | Download a model (streaming)   | ollama-service (pull)   |
| `/api/generate`       | POST   | Text generation                | chat-service, routing   |
| `/api/delete`         | DELETE | Remove a model from disk       | ollama-service          |
| `/api/show`           | POST   | Model details (size, params)   | ollama-service          |

### GET /api/tags

Returns all installed models with metadata.

```json
{
  "models": [
    {
      "name": "gemma3:4b",
      "model": "gemma3:4b",
      "modified_at": "2025-01-15T10:30:00Z",
      "size": 3300000000,
      "digest": "sha256:abc123...",
      "details": {
        "parent_model": "",
        "format": "gguf",
        "family": "gemma3",
        "families": ["gemma3"],
        "parameter_size": "4B",
        "quantization_level": "Q4_K_M"
      }
    }
  ]
}
```

### POST /api/generate

Generates text from a prompt. ClawAI uses non-streaming mode (`stream: false`).

**Request:**
```json
{
  "model": "gemma3:4b",
  "prompt": "Explain quantum computing in simple terms.",
  "stream": false,
  "options": {
    "temperature": 0.7,
    "num_predict": 2048
  }
}
```

**Response:**
```json
{
  "model": "gemma3:4b",
  "created_at": "2025-01-15T10:30:00Z",
  "response": "Quantum computing uses quantum bits...",
  "done": true,
  "total_duration": 5000000000,
  "load_duration": 1000000000,
  "prompt_eval_count": 15,
  "eval_count": 150
}
```

### POST /api/pull (Streaming)

Downloads a model. Returns streaming JSON lines with progress updates.

**Request:**
```json
{
  "name": "llama3.2:3b",
  "stream": true
}
```

**Response (streaming):**
```
{"status":"pulling manifest"}
{"status":"downloading sha256:abc123","digest":"sha256:abc123","total":2000000000,"completed":500000000}
{"status":"downloading sha256:abc123","digest":"sha256:abc123","total":2000000000,"completed":1500000000}
{"status":"verifying sha256 digest"}
{"status":"writing manifest"}
{"status":"success"}
```

ClawAI's ollama-service reads this stream, updates the PullJob record in PostgreSQL, and emits SSE events to the frontend for real-time progress display.

## ClawAI Integration Architecture

```
Frontend (catalog UI, model management)
  → Nginx (port 4000)
    → claw-ollama-service (port 4008)
      → Ollama runtime (port 11434)
        → Model files on disk (/root/.ollama/models/)
```

### Model Lifecycle

1. **Discovery**: User browses the catalog (`GET /api/v1/ollama/catalog`)
2. **Pull**: User clicks download (`POST /api/v1/ollama/catalog/:id/pull`)
3. **Progress**: Frontend subscribes to SSE (`GET /api/v1/ollama/pull-jobs/:id/progress`)
4. **Sync**: After pull completes, ollama-service syncs with `GET /api/tags` and updates the `LocalModel` table
5. **Role assignment**: Admin assigns roles (ROUTER, LOCAL_CODING, etc.) to installed models
6. **Usage**: Chat-service and routing-service call `POST /api/generate` via ollama-service
7. **Deletion**: Admin removes a model (`DELETE /api/v1/ollama/models/:id`)

### Auto-Pull on Startup

The `AUTO_PULL_MODELS` environment variable contains a space-separated list of models to pull automatically when the ollama-service container starts. The Docker entrypoint script waits for Ollama to be healthy, then pulls each model sequentially.

```bash
# .env
AUTO_PULL_MODELS=gemma3:4b llama3.2:3b phi3:mini gemma2:2b tinyllama
```

## Docker Configuration

### Development (docker-compose.dev.ollama.yml)

```yaml
ollama:
  image: ollama/ollama:latest
  ports:
    - "11434:11434"
  volumes:
    - ollama_data:/root/.ollama
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
```

### GPU Support

- **NVIDIA**: Use the `nvidia` Docker runtime with `--gpus all`
- **AMD**: Use the `rocm` variant of the Ollama image
- **CPU-only**: Works without GPU but inference is 5-50x slower

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `ECONNREFUSED :11434` | Ollama not running | `docker compose restart ollama` |
| Model pull hangs at 0% | Network issue or disk full | Check `docker logs ollama`, verify disk space |
| Slow generation (>30s) | CPU-only mode, large model | Use smaller model or add GPU |
| "model not found" | Model not pulled or name mismatch | Check `GET /api/tags`, verify model name format |
| OOM kill during generation | Model too large for RAM | Use a quantized (smaller) variant |
