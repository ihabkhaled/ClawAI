# Connector Database Schema (claw_connectors)

PostgreSQL database for the connector service (port 5443). Manages cloud AI provider connections, models, health, and sync.

---

## Connection

```
Database: claw_connectors
Port: 5443 (host) / 5432 (container)
URL: postgresql://claw:claw_secret@pg-connector:5432/claw_connectors?schema=public
Prisma schema: apps/claw-connector-service/prisma/schema.prisma
```

---

## Tables

### connectors

Stores AI provider connections with encrypted API keys.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Connector identifier |
| name | String | NO | - | - | Display name |
| provider | ConnectorProvider enum | NO | - | - | Provider type |
| status | ConnectorStatus enum | NO | `UNKNOWN` | - | Health status |
| auth_type | ConnectorAuthType enum | NO | - | - | Authentication method |
| encrypted_config | String | YES | - | - | AES-256-GCM encrypted API key/config |
| is_enabled | Boolean | NO | `true` | - | Whether connector is active |
| default_model_id | String | YES | - | - | Default model for this connector |
| base_url | String | YES | - | - | Custom API base URL (for self-hosted) |
| region | String | YES | - | - | AWS region (for Bedrock) |
| created_at | DateTime | NO | `now()` | - | Creation timestamp |
| updated_at | DateTime | NO | auto | - | Last update timestamp |

**Indexes**:
- `provider` — filter by provider type
- `status` — filter by health status
- `is_enabled` — filter active connectors

**Relations**:
- `models` — one-to-many with ConnectorModel (cascade delete)
- `healthEvents` — one-to-many with ConnectorHealthEvent (cascade delete)
- `syncRuns` — one-to-many with ModelSyncRun (cascade delete)

### connector_models

Stores available models for each connector, synced from the provider.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Model identifier |
| connector_id | String | NO | - | FK -> connectors.id | Parent connector |
| provider | ConnectorProvider enum | NO | - | - | Provider type (denormalized) |
| model_key | String | NO | - | - | Provider's model identifier |
| display_name | String | NO | - | - | Human-readable name |
| lifecycle | ModelLifecycle enum | NO | `ACTIVE` | - | Model lifecycle state |
| supports_streaming | Boolean | NO | `false` | - | Streaming support |
| supports_tools | Boolean | NO | `false` | - | Tool/function calling |
| supports_vision | Boolean | NO | `false` | - | Image input support |
| supports_audio | Boolean | NO | `false` | - | Audio input support |
| supports_structured_output | Boolean | NO | `false` | - | JSON mode support |
| max_context_tokens | Int | YES | - | - | Max context window |
| synced_at | DateTime | NO | `now()` | - | Last sync timestamp |

**Unique constraint**: `(connector_id, model_key)` — one model per key per connector

**Indexes**:
- `connector_id` — models for a connector
- `provider` — models by provider
- `lifecycle` — active vs deprecated

### connector_health_events

Historical health check results.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Event identifier |
| connector_id | String | NO | - | FK -> connectors.id | Connector checked |
| status | ConnectorStatus enum | NO | - | - | Health result |
| latency_ms | Int | YES | - | - | Response time |
| error_message | String | YES | - | - | Error details if unhealthy |
| checked_at | DateTime | NO | `now()` | - | Check timestamp |

**Indexes**:
- `connector_id` — health history for a connector
- `checked_at` — sort by time

### model_sync_runs

Records of model synchronization operations.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Sync run identifier |
| connector_id | String | NO | - | FK -> connectors.id | Connector synced |
| status | ModelSyncStatus enum | NO | - | - | RUNNING, COMPLETED, FAILED |
| models_found | Int | NO | `0` | - | Models discovered |
| models_added | Int | NO | `0` | - | New models added |
| models_removed | Int | NO | `0` | - | Models removed |
| started_at | DateTime | NO | `now()` | - | Sync start time |
| completed_at | DateTime | YES | - | - | Sync completion time |
| error_message | String | YES | - | - | Error details if failed |

**Indexes**:
- `connector_id` — sync history for a connector
- `status` — find running/failed syncs

---

## Enums

### ConnectorProvider
```
OPENAI      — OpenAI API
ANTHROPIC   — Anthropic Claude API
GEMINI      — Google Gemini API
AWS_BEDROCK — AWS Bedrock
DEEPSEEK    — DeepSeek API
OLLAMA      — Local Ollama (auto-created)
```

### ConnectorStatus
```
HEALTHY  — Provider responding normally
DEGRADED — Provider responding with issues
DOWN     — Provider unreachable
UNKNOWN  — Not yet checked
```

### ConnectorAuthType
```
API_KEY — Bearer token / API key
OAUTH2  — OAuth2 flow
NONE    — No auth (local Ollama)
```

### ModelLifecycle
```
ACTIVE     — Available for use
DEPRECATED — Still works but being phased out
SUNSET     — No longer available
```

### ModelSyncStatus
```
RUNNING   — Sync in progress
COMPLETED — Sync finished successfully
FAILED    — Sync encountered an error
```

---

## Security

- API keys are encrypted at rest using AES-256-GCM
- The `encrypted_config` field stores the IV + ciphertext + auth tag
- Decryption key: `ENCRYPTION_KEY` env var (64 hex chars = 32 bytes)
- Decrypted configs are only returned via internal API (`/internal/connectors/config`)
- External API never exposes the encrypted config value
