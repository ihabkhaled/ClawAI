# Ollama Database Schema (claw_ollama)

PostgreSQL database for the ollama service (port 5447). Manages local models, roles, pull jobs, runtime configs, and the model catalog.

---

## Connection

```
Database: claw_ollama
Port: 5447 (host) / 5432 (container)
URL: postgresql://claw:claw_secret@pg-ollama:5432/claw_ollama?schema=public
Prisma schema: apps/claw-ollama-service/prisma/schema.prisma
```

---

## Tables

### local_models

Installed local AI models.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Model identifier |
| name | String | NO | - | - | Model name (e.g., "gemma3") |
| tag | String | NO | - | - | Model tag (e.g., "4b") |
| runtime | RuntimeType enum | NO | - | - | Runtime engine |
| size_bytes | BigInt | YES | - | - | Model size on disk |
| family | String | YES | - | - | Model family (e.g., "gemma") |
| parameters | String | YES | - | - | Parameter count (e.g., "4B") |
| quantization | String | YES | - | - | Quantization type (e.g., "Q4_0") |
| category | ModelCategory enum | YES | - | - | Model category |
| is_installed | Boolean | NO | `true` | - | Whether model is installed |
| created_at | DateTime | NO | `now()` | - | First seen timestamp |
| updated_at | DateTime | NO | auto | - | Last update timestamp |

**Unique constraint**: `(name, tag, runtime)` — one entry per model variant per runtime

**Indexes**:
- `runtime` — filter by runtime
- `is_installed` — installed models
- `category` — filter by category

**Relations**:
- `roles` — one-to-many with LocalModelRoleAssignment (cascade delete)

### local_model_roles

Assigns functional roles to local models.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Assignment identifier |
| model_id | String | NO | - | FK -> local_models.id | Assigned model |
| role | LocalModelRole enum | NO | - | - | Functional role |
| is_active | Boolean | NO | `true` | - | Whether assignment is active |
| created_at | DateTime | NO | `now()` | - | Assignment timestamp |

**Unique constraint**: `(role, is_active)` — only one active model per role

**Indexes**:
- `model_id` — roles for a model
- `role` — find model by role

### pull_jobs

Tracks model download operations.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Job identifier |
| model_name | String | NO | - | - | Model being pulled (e.g., "gemma3:4b") |
| runtime | RuntimeType enum | NO | - | - | Target runtime |
| status | PullJobStatus enum | NO | `PENDING` | - | Job status |
| progress | Int | YES | - | - | Download progress (0-100) |
| total_bytes | BigInt | YES | - | - | Total download size |
| downloaded_bytes | BigInt | YES | - | - | Bytes downloaded so far |
| error_message | String | YES | - | - | Error details if failed |
| started_at | DateTime | NO | `now()` | - | Job start time |
| completed_at | DateTime | YES | - | - | Job completion time |

**Indexes**:
- `status` — find active/failed jobs
- `runtime` — jobs by runtime

### runtime_configs

Runtime engine configurations.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Config identifier |
| runtime | RuntimeType enum | NO | - | UNIQUE | Runtime type |
| base_url | String | NO | - | - | Runtime API URL |
| is_enabled | Boolean | NO | `true` | - | Whether runtime is enabled |
| created_at | DateTime | NO | `now()` | - | Creation timestamp |
| updated_at | DateTime | NO | auto | - | Last update timestamp |

### model_catalog_entries

Built-in catalog of recommended models for download.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Catalog entry identifier |
| name | String | NO | - | - | Model name |
| tag | String | NO | - | - | Model tag/version |
| display_name | String | NO | - | - | Human-readable name |
| category | ModelCategory enum | NO | - | - | Model category |
| description | String | YES | - | - | Model description |
| size_bytes | BigInt | YES | - | - | Download size |
| parameter_count | String | YES | - | - | Parameter count string |
| quantization | String | YES | - | - | Quantization type |
| runtime | RuntimeType enum | NO | - | - | Target runtime |
| ollama_name | String | YES | - | - | Ollama pull name |
| is_recommended | Boolean | NO | `false` | - | Featured in recommendations |
| capabilities | String[] | NO | - | - | Capability tags |
| created_at | DateTime | NO | `now()` | - | Creation timestamp |
| updated_at | DateTime | NO | auto | - | Last update timestamp |

**Unique constraint**: `(name, tag, runtime)` — one catalog entry per model variant

**Indexes**:
- `category` — browse by category
- `runtime` — filter by runtime

---

## Enums

### LocalModelRole
```
ROUTER                 — Makes routing decisions in AUTO mode
LOCAL_FALLBACK_CHAT    — Default local chat model
LOCAL_REASONING        — Chain-of-thought reasoning
LOCAL_CODING           — Specialized for code tasks
LOCAL_FILE_GENERATION  — Structured output for file generation
LOCAL_THINKING         — Agentic/search/research tasks
LOCAL_IMAGE_GENERATION — Local diffusion model
```

### RuntimeType
```
OLLAMA    — Ollama runtime (default)
VLLM      — vLLM runtime
LLAMA_CPP — llama.cpp runtime
LOCAL_AI  — LocalAI runtime
COMFYUI   — ComfyUI (for image generation)
```

### ModelCategory
```
CODING           — Code generation, debugging
FILE_GENERATION  — Document/file creation
IMAGE_GENERATION — Image creation (diffusion)
ROUTING          — Lightweight routing decisions
REASONING        — Deep analysis, chain-of-thought
THINKING         — Agentic tasks, research
GENERAL          — General purpose
```

### PullJobStatus
```
PENDING     — Queued for download
IN_PROGRESS — Currently downloading
COMPLETED   — Download finished successfully
FAILED      — Download failed
```

---

## Seed Data

The model catalog is seeded with 30 models across 6 categories via `prisma/seed-catalog.ts`. See CLAUDE.md for the full model list.

Auto-pull models on startup (configurable via `AUTO_PULL_MODELS`):
```
tinyllama, gemma3:4b, gemma2:2b, phi3:mini, llama3.2:3b
```

---

## Role Assignment Logic

Only one model can be active per role at a time. The unique constraint `(role, is_active)` ensures this. When assigning a new model to a role, the service first deactivates the current assignment, then creates the new one.
