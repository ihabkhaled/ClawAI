# Service Guide: claw-ollama-service

## Overview

| Property       | Value                          |
| -------------- | ------------------------------ |
| Port           | 4008                           |
| Database       | PostgreSQL (`claw_ollama`)     |
| ORM            | Prisma 5.22                    |
| Env prefix     | `OLLAMA_`                      |
| Nginx route    | `/api/v1/ollama/*`             |

The ollama service acts as a proxy and management layer for the local Ollama runtime. It manages the model catalog (30 models across 6 categories), handles model downloads with SSE progress streaming, assigns model roles, and provides generation endpoints.

## Database Schema

### LocalModel

| Column       | Type          | Notes                              |
| ------------ | ------------- | ---------------------------------- |
| id           | String        | CUID primary key                   |
| name         | String        | Model name (e.g., "gemma3")        |
| tag          | String        | Tag (e.g., "4b")                   |
| runtime      | RuntimeType   | OLLAMA, VLLM, LLAMA_CPP, etc.     |
| sizeBytes    | BigInt?       | Model file size                    |
| family       | String?       | Model family                       |
| parameters   | String?       | Parameter count string             |
| quantization | String?       | Quantization type                  |
| category     | ModelCategory?| CODING, REASONING, THINKING, etc.  |
| isInstalled  | Boolean       | Whether model is locally available |

Unique constraint: `(name, tag, runtime)`

### LocalModelRoleAssignment

| Column   | Type           | Notes                                |
| -------- | -------------- | ------------------------------------ |
| id       | String         | CUID primary key                     |
| modelId  | String         | FK to LocalModel                     |
| role     | LocalModelRole | ROUTER, LOCAL_FALLBACK_CHAT, etc.    |
| isActive | Boolean        | Only one active assignment per role  |

Unique constraint: `(role, isActive)` -- ensures one active model per role.

### ModelCatalogEntry

| Column         | Type          | Notes                            |
| -------------- | ------------- | -------------------------------- |
| id             | String        | CUID primary key                 |
| name           | String        | Model name                       |
| tag            | String        | Model tag                        |
| displayName    | String        | Human-readable name              |
| category       | ModelCategory | CODING, REASONING, etc.          |
| description    | String?       | Model description                |
| sizeBytes      | BigInt?       | Expected download size           |
| parameterCount | String?       | Parameter count                  |
| runtime        | RuntimeType   | Target runtime                   |
| ollamaName     | String?       | Ollama pull identifier           |
| isRecommended  | Boolean       | Featured in catalog UI           |
| capabilities   | String[]      | Capability tags                  |

### PullJob

Tracks model download progress with status (PENDING, IN_PROGRESS, COMPLETED, FAILED), progress percentage, and byte counts.

### RuntimeConfig

Per-runtime configuration (base URL, enabled flag). Ollama runtime defaults to `OLLAMA_BASE_URL`.

## Model Roles

| Role                   | Purpose                              | Default Model    |
| ---------------------- | ------------------------------------ | ---------------- |
| ROUTER                 | Makes routing decisions (AUTO mode)  | gemma3:4b        |
| LOCAL_FALLBACK_CHAT    | Default local chat model             | gemma3:4b        |
| LOCAL_CODING           | Code generation and review           | phi3:mini        |
| LOCAL_REASONING        | Chain-of-thought reasoning           | llama3.2:3b      |
| LOCAL_FILE_GENERATION  | Structured file content generation   | gemma3:4b        |
| LOCAL_THINKING         | Research and analysis tasks          | gemma3:4b        |
| LOCAL_IMAGE_GENERATION | Local diffusion model                | sdxl-turbo       |

## API Endpoints

### Public API

| Method | Path                          | Description                         |
| ------ | ----------------------------- | ----------------------------------- |
| GET    | /models                       | List installed local models         |
| GET    | /models/:id                   | Get model details                   |
| GET    | /models/:id/roles             | Get role assignments for a model    |
| POST   | /models/:id/roles             | Assign role to model (ADMIN)        |
| DELETE | /models/:id/roles/:roleId     | Remove role assignment (ADMIN)      |
| GET    | /catalog                      | Browse model catalog (filterable)   |
| GET    | /catalog/:id                  | Get catalog entry details           |
| POST   | /catalog/:id/pull             | Start model download                |
| GET    | /pull-jobs                    | List active download jobs           |
| GET    | /pull-jobs/:id/progress       | SSE stream of download progress     |
| DELETE | /pull-jobs/:id                | Cancel a download                   |
| POST   | /generate                     | Generate text with a local model    |
| DELETE | /models/:id                   | Delete an installed model (ADMIN)   |

### Internal API (service-to-service)

| Method | Path                             | Description                        |
| ------ | -------------------------------- | ---------------------------------- |
| GET    | /internal/installed-models       | List installed models for routing  |
| GET    | /internal/model-by-role/:role    | Get active model for a given role  |
| POST   | /internal/generate               | Generate text (no auth required)   |

## Model Pull with SSE Progress

The pull flow:

1. POST to `/catalog/:id/pull` creates a PullJob record (PENDING)
2. Service calls Ollama's `/api/pull` with streaming enabled
3. Progress updates are written to the PullJob record
4. Frontend connects to `/pull-jobs/:id/progress` SSE endpoint
5. SSE events include: `{ status, progress, downloadedBytes, totalBytes }`
6. On completion, the model is synced to LocalModel table and `model.pulled` event is published
7. On failure, error is recorded and `model.pulled` event includes error details

## Auto-Pull on Startup

Models listed in the `AUTO_PULL_MODELS` environment variable (space-separated) are automatically pulled when the Docker container starts. Default list: `gemma3:4b llama3.2:3b phi3:mini gemma2:2b tinyllama`.

## Events

| Event          | Direction | Notes                                  |
| -------------- | --------- | -------------------------------------- |
| model.pulled   | Publish   | After model download completes         |
| model.deleted  | Publish   | After model removed                    |
| catalog.updated| Publish   | After catalog seed/update              |

## Ollama API Proxy

The service wraps the Ollama HTTP API:

| Ollama Endpoint   | Purpose                    |
| ----------------- | -------------------------- |
| GET /api/tags     | List installed models      |
| POST /api/generate| Generate text completion   |
| POST /api/pull    | Download model (streaming) |
| DELETE /api/delete| Remove a model             |
| GET /api/show     | Get model details          |
