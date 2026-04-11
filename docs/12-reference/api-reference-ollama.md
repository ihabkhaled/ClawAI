# API Reference — Ollama Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4008/api/v1` (direct)

---

## Models

### GET /ollama/models

List installed local models.

**Auth**: Bearer token
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `runtime` (enum) — OLLAMA, VLLM, LLAMA_CPP, LOCAL_AI, COMFYUI
- `category` (enum) — CODING, FILE_GENERATION, IMAGE_GENERATION, ROUTING, REASONING, THINKING, GENERAL

**Response 200**:
```json
{
  "data": [
    {
      "id": "clmod...",
      "name": "gemma3",
      "tag": "4b",
      "runtime": "OLLAMA",
      "sizeBytes": "3300000000",
      "family": "gemma",
      "parameters": "4B",
      "quantization": "Q4_0",
      "category": "ROUTING",
      "isInstalled": true,
      "roles": [
        { "id": "clrole...", "role": "ROUTER", "isActive": true }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

## Catalog

### GET /ollama/catalog

Browse the model catalog with install status.

**Auth**: Bearer token
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `category` (enum)
- `runtime` (enum)
- `search` (string)

**Response 200**:
```json
{
  "data": [
    {
      "id": "clcat...",
      "name": "qwen2.5-coder",
      "tag": "7b",
      "displayName": "Qwen 2.5 Coder 7B",
      "category": "CODING",
      "description": "Code generation and debugging",
      "sizeBytes": "5000000000",
      "parameterCount": "7B",
      "runtime": "OLLAMA",
      "ollamaName": "qwen2.5-coder:7b",
      "isRecommended": true,
      "capabilities": ["code_generation", "code_review"],
      "isInstalled": false,
      "installedModelId": null
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 30, "totalPages": 2 }
}
```

### GET /ollama/catalog/:id

Get a single catalog entry with install status.

**Auth**: Bearer token
**Response 200**: CatalogEntryWithInstallStatus

### POST /ollama/catalog/:id/pull

Start downloading a model from the catalog.

**Auth**: Bearer token
**Response 201**:
```json
{ "pullJobId": "cljob..." }
```

---

## Pull Jobs

### GET /ollama/pull-jobs

List active download jobs.

**Auth**: Bearer token
**Response 200**:
```json
[
  {
    "id": "cljob...",
    "modelName": "qwen2.5-coder:7b",
    "runtime": "OLLAMA",
    "status": "IN_PROGRESS",
    "progress": 45,
    "totalBytes": "5000000000",
    "downloadedBytes": "2250000000",
    "startedAt": "2026-04-11T10:00:00.000Z",
    "completedAt": null
  }
]
```

### GET /ollama/pull-jobs/:id/progress (SSE)

Stream real-time download progress.

**Auth**: Bearer token
**Response**: SSE event stream
```
data: {"progress":46,"downloadedBytes":"2300000000","totalBytes":"5000000000","status":"IN_PROGRESS"}
data: {"progress":47,"downloadedBytes":"2350000000","totalBytes":"5000000000","status":"IN_PROGRESS"}
data: {"progress":100,"downloadedBytes":"5000000000","totalBytes":"5000000000","status":"COMPLETED"}
```

### DELETE /ollama/pull-jobs/:id

Cancel an active download.

**Auth**: Bearer token
**Response 200**: Updated PullJob with status CANCELLED

---

## Model Management

### POST /ollama/pull

Pull a model by name (direct Ollama pull).

**Auth**: Bearer token
**Request Body**:
```json
{
  "name": "gemma3:4b",
  "runtime": "OLLAMA"
}
```

**Response 201**: LocalModel object

### POST /ollama/assign-role

Assign a functional role to a local model.

**Auth**: Bearer token
**Request Body**:
```json
{
  "modelId": "clmod...",
  "role": "ROUTER"
}
```

**Response 201**:
```json
{
  "id": "clrole...",
  "modelId": "clmod...",
  "role": "ROUTER",
  "isActive": true,
  "createdAt": "2026-04-11T10:00:00.000Z"
}
```

**Roles**: ROUTER, LOCAL_FALLBACK_CHAT, LOCAL_REASONING, LOCAL_CODING, LOCAL_FILE_GENERATION, LOCAL_THINKING, LOCAL_IMAGE_GENERATION

**Note**: Only one model can be active per role. Assigning a role deactivates the previous holder.

---

## Generation

### POST /ollama/generate

Generate text using a local model. Public endpoint (used by routing and memory services).

**Auth**: Public
**Request Body**:
```json
{
  "model": "gemma3:4b",
  "prompt": "What is the capital of France?",
  "system": "You are a helpful assistant.",
  "temperature": 0.7,
  "maxTokens": 1024
}
```

**Response 200**:
```json
{
  "response": "The capital of France is Paris.",
  "model": "gemma3:4b",
  "totalDuration": 1500000000,
  "loadDuration": 500000000,
  "promptEvalDuration": 200000000,
  "evalDuration": 800000000
}
```

---

## Health

### GET /ollama/health

Check Ollama runtime health.

**Auth**: Public
**Query**: `?runtime=OLLAMA` (default)
**Response 200**:
```json
{
  "status": "healthy",
  "runtime": "OLLAMA",
  "baseUrl": "http://ollama:11434",
  "modelsLoaded": 5
}
```

---

## Runtimes

### GET /ollama/runtimes

List configured runtime engines.

**Auth**: Bearer token
**Response 200**:
```json
[
  {
    "id": "clrt...",
    "runtime": "OLLAMA",
    "baseUrl": "http://ollama:11434",
    "isEnabled": true
  }
]
```

---

## Internal Endpoints

### GET /internal/ollama/router-model
Get the current router model name. Used by routing-service.
Response: `{ "model": "gemma3:4b" }`

### GET /internal/ollama/installed-models
Get all installed models with details. Used by routing-service for dynamic prompt building.
Response: `{ "models": [...] }`
