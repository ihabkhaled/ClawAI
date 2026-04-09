# Database Reference

> Complete reference for all ClawAI databases, tables, collections, and data models.

---

## 1. Database Topology

ClawAI follows a **database-per-service** pattern. Each microservice owns its data exclusively. No shared databases. Cross-service data access is done via HTTP calls or RabbitMQ events.

| Service                      | Database Engine       | Database Name          | Port (host) | ORM         |
| ---------------------------- | --------------------- | ---------------------- | ----------- | ----------- |
| claw-auth-service            | PostgreSQL            | `claw_auth`            | 5441        | Prisma 5.22 |
| claw-chat-service            | PostgreSQL            | `claw_chat`            | 5442        | Prisma 5.22 |
| claw-connector-service       | PostgreSQL            | `claw_connectors`      | 5443        | Prisma 5.22 |
| claw-routing-service         | PostgreSQL            | `claw_routing`         | 5444        | Prisma 5.22 |
| claw-memory-service          | PostgreSQL + pgvector | `claw_memory`          | 5445        | Prisma 5.22 |
| claw-file-service            | PostgreSQL            | `claw_files`           | 5446        | Prisma 5.22 |
| claw-ollama-service          | PostgreSQL            | `claw_ollama`          | 5447        | Prisma 5.22 |
| claw-image-service           | PostgreSQL            | `claw_images`          | 5448        | Prisma 5.22 |
| claw-file-generation-service | PostgreSQL            | `claw_file_generation` | --          | Prisma 5.22 |
| claw-audit-service           | MongoDB               | `claw_audit`           | 27018       | Mongoose    |
| claw-client-logs-service     | MongoDB               | `claw_client_logs`     | 27018       | Mongoose    |
| claw-server-logs-service     | MongoDB               | `claw_server_logs`     | 27018       | Mongoose    |
| Redis (shared)               | Redis                 | --                     | 6380        | --          |

**Infrastructure notes:**

- All PostgreSQL instances run in separate Docker containers with dedicated volumes.
- MongoDB runs as a single container with three logical databases.
- Redis is shared across services for caching (no persistent data).

---

## 2. PostgreSQL Tables

### 2.1 Auth Service (`claw_auth`)

#### `users`

| Column                  | Type                            | Constraints       | Default      | Notes                                |
| ----------------------- | ------------------------------- | ----------------- | ------------ | ------------------------------------ |
| `id`                    | String (CUID)                   | PK                | `cuid()`     |                                      |
| `email`                 | String                          | Unique, indexed   | --           |                                      |
| `username`              | String                          | Unique            | --           |                                      |
| `password_hash`         | String                          | Not null          | --           | Argon2 hash                          |
| `role`                  | Enum `UserRole`                 | Not null          | `VIEWER`     |                                      |
| `status`                | Enum `UserStatus`               | Not null, indexed | `PENDING`    |                                      |
| `must_change_password`  | Boolean                         | Not null          | `false`      | Forces password change on next login |
| `language_preference`   | Enum `UserLanguagePreference`   | Not null          | `EN`         |                                      |
| `appearance_preference` | Enum `UserAppearancePreference` | Not null          | `SYSTEM`     |                                      |
| `created_at`            | DateTime                        | Not null          | `now()`      |                                      |
| `updated_at`            | DateTime                        | Not null          | Auto-updated |                                      |

**Indexes:** `email`, `status`

**Relations:** `User` 1--\* `Session`

**Enums:**

- `UserRole`: `ADMIN`, `OPERATOR`, `VIEWER`
- `UserStatus`: `ACTIVE`, `SUSPENDED`, `PENDING`
- `UserLanguagePreference`: `EN`, `AR`, `FR`, `IT`, `DE`, `ES`, `RU`, `PT`
- `UserAppearancePreference`: `SYSTEM`, `LIGHT`, `DARK`

#### `sessions`

| Column          | Type          | Constraints             | Default  | Notes                        |
| --------------- | ------------- | ----------------------- | -------- | ---------------------------- |
| `id`            | String (CUID) | PK                      | `cuid()` |                              |
| `user_id`       | String        | FK -> users.id, indexed | --       | Cascade delete               |
| `refresh_token` | String        | Unique                  | --       | Rotated on each refresh      |
| `expires_at`    | DateTime      | Indexed                 | --       | Default 7 days from creation |
| `created_at`    | DateTime      | Not null                | `now()`  |                              |

**Indexes:** `user_id`, `expires_at`

#### `system_settings`

| Column       | Type          | Constraints     | Default      | Notes              |
| ------------ | ------------- | --------------- | ------------ | ------------------ |
| `id`         | String (CUID) | PK              | `cuid()`     |                    |
| `key`        | String        | Unique, indexed | --           | Setting identifier |
| `value`      | String        | Not null        | --           | Setting value      |
| `updated_at` | DateTime      | Not null        | Auto-updated |                    |

---

### 2.2 Chat Service (`claw_chat`)

#### `chat_threads`

| Column               | Type               | Constraints | Default      | Notes                           |
| -------------------- | ------------------ | ----------- | ------------ | ------------------------------- |
| `id`                 | String (CUID)      | PK          | `cuid()`     |                                 |
| `user_id`            | String             | Indexed     | --           | Owner (not FK -- cross-service) |
| `title`              | String?            | Nullable    | --           | Auto-generated or user-set      |
| `routing_mode`       | Enum `RoutingMode` | Not null    | `AUTO`       |                                 |
| `last_provider`      | String?            | Nullable    | --           | Last used provider              |
| `last_model`         | String?            | Nullable    | --           | Last used model                 |
| `is_pinned`          | Boolean            | Not null    | `false`      |                                 |
| `is_archived`        | Boolean            | Not null    | `false`      |                                 |
| `preferred_provider` | String?            | Nullable    | --           | User override                   |
| `preferred_model`    | String?            | Nullable    | --           | User override                   |
| `context_pack_ids`   | String[]           | Not null    | `[]`         | Array of context pack CUIDs     |
| `system_prompt`      | String?            | Nullable    | --           | Custom system prompt            |
| `temperature`        | Float?             | Nullable    | `0.7`        |                                 |
| `max_tokens`         | Int?               | Nullable    | --           |                                 |
| `created_at`         | DateTime           | Indexed     | `now()`      |                                 |
| `updated_at`         | DateTime           | Not null    | Auto-updated |                                 |

**Indexes:** `user_id`, `created_at`

**Relations:** `ChatThread` 1--\* `ChatMessage`

**Enums:**

- `RoutingMode`: `AUTO`, `MANUAL_MODEL`, `LOCAL_ONLY`, `PRIVACY_FIRST`, `LOW_LATENCY`, `HIGH_REASONING`, `COST_SAVER`

#### `chat_messages`

| Column           | Type                | Constraints                    | Default  | Notes                                 |
| ---------------- | ------------------- | ------------------------------ | -------- | ------------------------------------- |
| `id`             | String (CUID)       | PK                             | `cuid()` |                                       |
| `thread_id`      | String              | FK -> chat_threads.id, indexed | --       | Cascade delete                        |
| `role`           | Enum `MessageRole`  | Not null                       | --       |                                       |
| `content`        | String              | Not null                       | --       | Message text                          |
| `provider`       | String?             | Nullable                       | --       | e.g., "anthropic", "openai"           |
| `model`          | String?             | Nullable                       | --       | e.g., "claude-sonnet-4"               |
| `routing_mode`   | Enum `RoutingMode`? | Nullable                       | --       | Mode used for this message            |
| `router_model`   | String?             | Nullable                       | --       | Which model made the routing decision |
| `used_fallback`  | Boolean             | Not null                       | `false`  | Whether fallback was triggered        |
| `input_tokens`   | Int?                | Nullable                       | --       |                                       |
| `output_tokens`  | Int?                | Nullable                       | --       |                                       |
| `estimated_cost` | Decimal(12,8)?      | Nullable                       | --       | USD estimate                          |
| `latency_ms`     | Int?                | Nullable                       | --       | End-to-end latency                    |
| `feedback`       | String?             | Nullable                       | --       | "thumbs_up" or "thumbs_down"          |
| `metadata`       | Json?               | Nullable                       | --       | Flexible extra data                   |
| `created_at`     | DateTime            | Indexed                        | `now()`  |                                       |

**Indexes:** `thread_id`, `created_at`

**Relations:** `ChatMessage` 1--\* `MessageAttachment`

**Enums:**

- `MessageRole`: `SYSTEM`, `USER`, `ASSISTANT`, `TOOL`

#### `message_attachments`

| Column       | Type          | Constraints                     | Default  | Notes                     |
| ------------ | ------------- | ------------------------------- | -------- | ------------------------- |
| `id`         | String (CUID) | PK                              | `cuid()` |                           |
| `message_id` | String        | FK -> chat_messages.id, indexed | --       | Cascade delete            |
| `file_id`    | String        | Not null                        | --       | Reference to file-service |
| `type`       | String        | Not null                        | --       | MIME type or category     |

---

### 2.3 Connector Service (`claw_connectors`)

#### `connectors`

| Column             | Type                     | Constraints       | Default      | Notes                      |
| ------------------ | ------------------------ | ----------------- | ------------ | -------------------------- |
| `id`               | String (CUID)            | PK                | `cuid()`     |                            |
| `name`             | String                   | Not null          | --           | Display name               |
| `provider`         | Enum `ConnectorProvider` | Not null, indexed | --           |                            |
| `status`           | Enum `ConnectorStatus`   | Not null, indexed | `UNKNOWN`    |                            |
| `auth_type`        | Enum `ConnectorAuthType` | Not null          | --           |                            |
| `encrypted_config` | String?                  | Nullable          | --           | AES-256-GCM encrypted JSON |
| `is_enabled`       | Boolean                  | Indexed           | `true`       |                            |
| `default_model_id` | String?                  | Nullable          | --           |                            |
| `base_url`         | String?                  | Nullable          | --           | Custom endpoint URL        |
| `region`           | String?                  | Nullable          | --           | AWS region, etc.           |
| `created_at`       | DateTime                 | Not null          | `now()`      |                            |
| `updated_at`       | DateTime                 | Not null          | Auto-updated |                            |

**Relations:** `Connector` 1--\* `ConnectorModel`, `ConnectorHealthEvent`, `ModelSyncRun`

**Enums:**

- `ConnectorProvider`: `OPENAI`, `ANTHROPIC`, `GEMINI`, `AWS_BEDROCK`, `DEEPSEEK`, `OLLAMA`
- `ConnectorStatus`: `HEALTHY`, `DEGRADED`, `DOWN`, `UNKNOWN`
- `ConnectorAuthType`: `API_KEY`, `OAUTH2`, `NONE`

#### `connector_models`

| Column                       | Type                     | Constraints       | Default  | Notes                             |
| ---------------------------- | ------------------------ | ----------------- | -------- | --------------------------------- |
| `id`                         | String (CUID)            | PK                | `cuid()` |                                   |
| `connector_id`               | String                   | FK, indexed       | --       | Cascade delete                    |
| `provider`                   | Enum `ConnectorProvider` | Not null, indexed | --       |                                   |
| `model_key`                  | String                   | Not null          | --       | e.g., "gpt-4o", "claude-sonnet-4" |
| `display_name`               | String                   | Not null          | --       | Human-friendly name               |
| `lifecycle`                  | Enum `ModelLifecycle`    | Indexed           | `ACTIVE` |                                   |
| `supports_streaming`         | Boolean                  | Not null          | `false`  |                                   |
| `supports_tools`             | Boolean                  | Not null          | `false`  |                                   |
| `supports_vision`            | Boolean                  | Not null          | `false`  |                                   |
| `supports_audio`             | Boolean                  | Not null          | `false`  |                                   |
| `supports_structured_output` | Boolean                  | Not null          | `false`  |                                   |
| `max_context_tokens`         | Int?                     | Nullable          | --       |                                   |
| `synced_at`                  | DateTime                 | Not null          | `now()`  |                                   |

**Unique constraint:** `(connector_id, model_key)`

**Enums:**

- `ModelLifecycle`: `ACTIVE`, `DEPRECATED`, `SUNSET`

#### `connector_health_events`

| Column          | Type                   | Constraints | Default  | Notes          |
| --------------- | ---------------------- | ----------- | -------- | -------------- |
| `id`            | String (CUID)          | PK          | `cuid()` |                |
| `connector_id`  | String                 | FK, indexed | --       | Cascade delete |
| `status`        | Enum `ConnectorStatus` | Not null    | --       |                |
| `latency_ms`    | Int?                   | Nullable    | --       |                |
| `error_message` | String?                | Nullable    | --       |                |
| `checked_at`    | DateTime               | Indexed     | `now()`  |                |

#### `model_sync_runs`

| Column           | Type                   | Constraints | Default  | Notes          |
| ---------------- | ---------------------- | ----------- | -------- | -------------- |
| `id`             | String (CUID)          | PK          | `cuid()` |                |
| `connector_id`   | String                 | FK, indexed | --       | Cascade delete |
| `status`         | Enum `ModelSyncStatus` | Indexed     | --       |                |
| `models_found`   | Int                    | Not null    | `0`      |                |
| `models_added`   | Int                    | Not null    | `0`      |                |
| `models_removed` | Int                    | Not null    | `0`      |                |
| `started_at`     | DateTime               | Not null    | `now()`  |                |
| `completed_at`   | DateTime?              | Nullable    | --       |                |
| `error_message`  | String?                | Nullable    | --       |                |

**Enums:**

- `ModelSyncStatus`: `RUNNING`, `COMPLETED`, `FAILED`

---

### 2.4 Routing Service (`claw_routing`)

#### `routing_decisions`

| Column              | Type               | Constraints | Default  | Notes                       |
| ------------------- | ------------------ | ----------- | -------- | --------------------------- |
| `id`                | String (CUID)      | PK          | `cuid()` |                             |
| `message_id`        | String?            | Indexed     | --       | Reference to chat message   |
| `thread_id`         | String             | Indexed     | --       |                             |
| `selected_provider` | String             | Not null    | --       |                             |
| `selected_model`    | String             | Not null    | --       |                             |
| `routing_mode`      | Enum `RoutingMode` | Indexed     | --       |                             |
| `confidence`        | Decimal(5,4)?      | Nullable    | --       | 0.0000 to 1.0000            |
| `reason_tags`       | String[]           | Not null    | --       | e.g., ["coding", "complex"] |
| `privacy_class`     | String?            | Nullable    | --       | e.g., "local", "cloud"      |
| `cost_class`        | String?            | Nullable    | --       | e.g., "free", "low", "high" |
| `fallback_provider` | String?            | Nullable    | --       |                             |
| `fallback_model`    | String?            | Nullable    | --       |                             |
| `created_at`        | DateTime           | Indexed     | `now()`  |                             |

#### `routing_policies`

| Column         | Type               | Constraints | Default      | Notes                         |
| -------------- | ------------------ | ----------- | ------------ | ----------------------------- |
| `id`           | String (CUID)      | PK          | `cuid()`     |                               |
| `name`         | String             | Not null    | --           |                               |
| `routing_mode` | Enum `RoutingMode` | Indexed     | --           |                               |
| `priority`     | Int                | Indexed     | `0`          | Higher = evaluated first      |
| `is_active`    | Boolean            | Indexed     | `true`       |                               |
| `config`       | Json               | Not null    | --           | Policy-specific configuration |
| `created_at`   | DateTime           | Not null    | `now()`      |                               |
| `updated_at`   | DateTime           | Not null    | Auto-updated |                               |

---

### 2.5 Memory Service (`claw_memory`)

**Extension:** `pgvector` enabled for vector similarity search.

#### `memory_records`

| Column              | Type              | Constraints | Default      | Notes                       |
| ------------------- | ----------------- | ----------- | ------------ | --------------------------- |
| `id`                | String (CUID)     | PK          | `cuid()`     |                             |
| `user_id`           | String            | Indexed     | --           | Owner                       |
| `type`              | Enum `MemoryType` | Indexed     | --           |                             |
| `content`           | String            | Not null    | --           | Memory text                 |
| `source_thread_id`  | String?           | Nullable    | --           | Where it was extracted from |
| `source_message_id` | String?           | Nullable    | --           |                             |
| `is_enabled`        | Boolean           | Indexed     | `true`       | Soft toggle                 |
| `created_at`        | DateTime          | Not null    | `now()`      |                             |
| `updated_at`        | DateTime          | Not null    | Auto-updated |                             |

**Enums:**

- `MemoryType`: `SUMMARY`, `FACT`, `PREFERENCE`, `INSTRUCTION`

#### `context_packs`

| Column        | Type          | Constraints | Default      | Notes |
| ------------- | ------------- | ----------- | ------------ | ----- |
| `id`          | String (CUID) | PK          | `cuid()`     |       |
| `user_id`     | String        | Indexed     | --           | Owner |
| `name`        | String        | Not null    | --           |       |
| `description` | String?       | Nullable    | --           |       |
| `scope`       | String?       | Nullable    | --           |       |
| `created_at`  | DateTime      | Not null    | `now()`      |       |
| `updated_at`  | DateTime      | Not null    | Auto-updated |       |

**Relations:** `ContextPack` 1--\* `ContextPackItem`

#### `context_pack_items`

| Column            | Type          | Constraints | Default  | Notes                        |
| ----------------- | ------------- | ----------- | -------- | ---------------------------- |
| `id`              | String (CUID) | PK          | `cuid()` |                              |
| `context_pack_id` | String        | FK, indexed | --       | Cascade delete               |
| `type`            | String        | Not null    | --       | Item type (text, file, etc.) |
| `content`         | String?       | Nullable    | --       | Inline text content          |
| `file_id`         | String?       | Nullable    | --       | Reference to file-service    |
| `sort_order`      | Int           | Indexed     | `0`      |                              |
| `created_at`      | DateTime      | Not null    | `now()`  |                              |

---

### 2.6 File Service (`claw_files`)

#### `files`

| Column             | Type                       | Constraints | Default      | Notes                       |
| ------------------ | -------------------------- | ----------- | ------------ | --------------------------- |
| `id`               | String (CUID)              | PK          | `cuid()`     |                             |
| `user_id`          | String                     | Indexed     | --           | Owner                       |
| `filename`         | String                     | Not null    | --           | Original filename           |
| `mime_type`        | String                     | Not null    | --           | e.g., "application/pdf"     |
| `size_bytes`       | Int                        | Not null    | --           |                             |
| `storage_path`     | String                     | Not null    | --           | Path on disk                |
| `content`          | String?                    | Nullable    | --           | Extracted full-text content |
| `ingestion_status` | Enum `FileIngestionStatus` | Indexed     | `COMPLETED`  |                             |
| `created_at`       | DateTime                   | Not null    | `now()`      |                             |
| `updated_at`       | DateTime                   | Not null    | Auto-updated |                             |

**Relations:** `File` 1--\* `FileChunk`

**Enums:**

- `FileIngestionStatus`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`

#### `file_chunks`

| Column        | Type          | Constraints | Default  | Notes                   |
| ------------- | ------------- | ----------- | -------- | ----------------------- |
| `id`          | String (CUID) | PK          | `cuid()` |                         |
| `file_id`     | String        | FK, indexed | --       | Cascade delete          |
| `chunk_index` | Int           | Indexed     | --       | Sequential chunk number |
| `content`     | String        | Not null    | --       | Chunk text              |
| `created_at`  | DateTime      | Not null    | `now()`  |                         |

---

### 2.7 Ollama Service (`claw_ollama`)

#### `local_models`

| Column         | Type               | Constraints | Default      | Notes           |
| -------------- | ------------------ | ----------- | ------------ | --------------- |
| `id`           | String (CUID)      | PK          | `cuid()`     |                 |
| `name`         | String             | Not null    | --           | e.g., "gemma3"  |
| `tag`          | String             | Not null    | --           | e.g., "4b"      |
| `runtime`      | Enum `RuntimeType` | Indexed     | --           |                 |
| `size_bytes`   | BigInt?            | Nullable    | --           | Model file size |
| `family`       | String?            | Nullable    | --           | e.g., "gemma"   |
| `parameters`   | String?            | Nullable    | --           | e.g., "4B"      |
| `quantization` | String?            | Nullable    | --           | e.g., "Q4_K_M"  |
| `is_installed` | Boolean            | Indexed     | `true`       |                 |
| `created_at`   | DateTime           | Not null    | `now()`      |                 |
| `updated_at`   | DateTime           | Not null    | Auto-updated |                 |

**Unique constraint:** `(name, tag, runtime)`

**Relations:** `LocalModel` 1--\* `LocalModelRoleAssignment`

**Enums:**

- `RuntimeType`: `OLLAMA`, `VLLM`, `LLAMA_CPP`, `LOCAL_AI`

#### `local_model_roles`

| Column       | Type                  | Constraints | Default  | Notes          |
| ------------ | --------------------- | ----------- | -------- | -------------- |
| `id`         | String (CUID)         | PK          | `cuid()` |                |
| `model_id`   | String                | FK, indexed | --       | Cascade delete |
| `role`       | Enum `LocalModelRole` | Indexed     | --       |                |
| `is_active`  | Boolean               | Not null    | `true`   |                |
| `created_at` | DateTime              | Not null    | `now()`  |                |

**Unique constraint:** `(role, is_active)` -- ensures only one active model per role.

**Enums:**

- `LocalModelRole`: `ROUTER`, `LOCAL_FALLBACK_CHAT`, `LOCAL_REASONING`, `LOCAL_CODING`

#### `pull_jobs`

| Column          | Type                 | Constraints | Default   | Notes             |
| --------------- | -------------------- | ----------- | --------- | ----------------- |
| `id`            | String (CUID)        | PK          | `cuid()`  |                   |
| `model_name`    | String               | Not null    | --        | e.g., "gemma3:4b" |
| `runtime`       | Enum `RuntimeType`   | Indexed     | --        |                   |
| `status`        | Enum `PullJobStatus` | Indexed     | `PENDING` |                   |
| `progress`      | Int?                 | Nullable    | --        | 0-100 percentage  |
| `error_message` | String?              | Nullable    | --        |                   |
| `started_at`    | DateTime             | Not null    | `now()`   |                   |
| `completed_at`  | DateTime?            | Nullable    | --        |                   |

**Enums:**

- `PullJobStatus`: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`

#### `runtime_configs`

| Column       | Type               | Constraints | Default      | Notes                       |
| ------------ | ------------------ | ----------- | ------------ | --------------------------- |
| `id`         | String (CUID)      | PK          | `cuid()`     |                             |
| `runtime`    | Enum `RuntimeType` | Unique      | --           | One config per runtime      |
| `base_url`   | String             | Not null    | --           | e.g., "http://ollama:11434" |
| `is_enabled` | Boolean            | Not null    | `true`       |                             |
| `created_at` | DateTime           | Not null    | `now()`      |                             |
| `updated_at` | DateTime           | Not null    | Auto-updated |                             |

---

### 2.8 Image Service (`claw_images`)

#### `image_generations`

| Column                 | Type                         | Constraints                 | Default      | Notes                |
| ---------------------- | ---------------------------- | --------------------------- | ------------ | -------------------- |
| `id`                   | String (CUID)                | PK                          | `cuid()`     |                      |
| `user_id`              | String                       | Indexed                     | --           |                      |
| `thread_id`            | String?                      | Indexed                     | --           |                      |
| `user_message_id`      | String?                      | Nullable                    | --           |                      |
| `assistant_message_id` | String?                      | Indexed                     | --           |                      |
| `prompt`               | String                       | Not null                    | --           | Original user prompt |
| `revised_prompt`       | String?                      | Nullable                    | --           | AI-revised prompt    |
| `provider`             | String                       | Not null                    | --           |                      |
| `model`                | String                       | Not null                    | --           |                      |
| `width`                | Int                          | Not null                    | `1024`       |                      |
| `height`               | Int                          | Not null                    | `1024`       |                      |
| `quality`              | String?                      | Nullable                    | --           |                      |
| `style`                | String?                      | Nullable                    | --           |                      |
| `status`               | Enum `ImageGenerationStatus` | Indexed (with `created_at`) | `QUEUED`     |                      |
| `error_code`           | String?                      | Nullable                    | --           |                      |
| `error_message`        | String?                      | Nullable                    | --           |                      |
| `started_at`           | DateTime?                    | Nullable                    | --           |                      |
| `completed_at`         | DateTime?                    | Nullable                    | --           |                      |
| `latency_ms`           | Int?                         | Nullable                    | --           |                      |
| `created_at`           | DateTime                     | Not null                    | `now()`      |                      |
| `updated_at`           | DateTime                     | Not null                    | Auto-updated |                      |

**Relations:** `ImageGeneration` 1--\* `ImageGenerationAsset`, `ImageGenerationEvent`

**Enums:**

- `ImageGenerationStatus`: `QUEUED`, `STARTING`, `GENERATING`, `FINALIZING`, `COMPLETED`, `FAILED`, `TIMED_OUT`, `CANCELLED`

#### `image_generation_assets`

| Column          | Type          | Constraints | Default  | Notes             |
| --------------- | ------------- | ----------- | -------- | ----------------- |
| `id`            | String (CUID) | PK          | `cuid()` |                   |
| `generation_id` | String        | FK, indexed | --       | Cascade delete    |
| `storage_key`   | String        | Not null    | --       | File storage path |
| `url`           | String        | Not null    | --       | Public URL        |
| `download_url`  | String        | Not null    | --       | Download endpoint |
| `mime_type`     | String        | Not null    | --       |                   |
| `width`         | Int?          | Nullable    | --       |                   |
| `height`        | Int?          | Nullable    | --       |                   |
| `size_bytes`    | Int?          | Nullable    | --       |                   |
| `created_at`    | DateTime      | Not null    | `now()`  |                   |

#### `image_generation_events`

| Column          | Type                         | Constraints                 | Default  | Notes               |
| --------------- | ---------------------------- | --------------------------- | -------- | ------------------- |
| `id`            | String (CUID)                | PK                          | `cuid()` |                     |
| `generation_id` | String                       | Indexed (with `created_at`) | --       | Cascade delete      |
| `status`        | Enum `ImageGenerationStatus` | Not null                    | --       |                     |
| `payload_json`  | Json?                        | Nullable                    | --       | Event-specific data |
| `created_at`    | DateTime                     | Not null                    | `now()`  |                     |

---

### 2.9 File Generation Service (`claw_file_generation`)

#### `file_generations`

| Column                 | Type                        | Constraints                 | Default      | Notes                  |
| ---------------------- | --------------------------- | --------------------------- | ------------ | ---------------------- |
| `id`                   | String (CUID)               | PK                          | `cuid()`     |                        |
| `user_id`              | String                      | Indexed                     | --           |                        |
| `thread_id`            | String?                     | Indexed                     | --           |                        |
| `user_message_id`      | String?                     | Nullable                    | --           |                        |
| `assistant_message_id` | String?                     | Indexed                     | --           |                        |
| `prompt`               | String                      | Not null                    | --           |                        |
| `content`              | Text?                       | Nullable                    | --           | Generated file content |
| `format`               | Enum `FileFormat`           | Not null                    | --           |                        |
| `filename`             | String?                     | Nullable                    | --           |                        |
| `provider`             | String                      | Not null                    | --           |                        |
| `model`                | String                      | Not null                    | --           |                        |
| `status`               | Enum `FileGenerationStatus` | Indexed (with `created_at`) | `QUEUED`     |                        |
| `error_code`           | String?                     | Nullable                    | --           |                        |
| `error_message`        | String?                     | Nullable                    | --           |                        |
| `started_at`           | DateTime?                   | Nullable                    | --           |                        |
| `completed_at`         | DateTime?                   | Nullable                    | --           |                        |
| `latency_ms`           | Int?                        | Nullable                    | --           |                        |
| `created_at`           | DateTime                    | Not null                    | `now()`      |                        |
| `updated_at`           | DateTime                    | Not null                    | Auto-updated |                        |

**Relations:** `FileGeneration` 1--\* `FileGenerationAsset`, `FileGenerationEvent`

**Enums:**

- `FileGenerationStatus`: `QUEUED`, `STARTING`, `GENERATING_CONTENT`, `CONVERTING`, `FINALIZING`, `COMPLETED`, `FAILED`, `TIMED_OUT`, `CANCELLED`
- `FileFormat`: `TXT`, `MD`, `PDF`, `DOCX`, `CSV`, `JSON`, `HTML`

#### `file_generation_assets`

| Column          | Type          | Constraints | Default  | Notes          |
| --------------- | ------------- | ----------- | -------- | -------------- |
| `id`            | String (CUID) | PK          | `cuid()` |                |
| `generation_id` | String        | FK, indexed | --       | Cascade delete |
| `storage_key`   | String        | Not null    | --       |                |
| `url`           | String        | Not null    | --       |                |
| `download_url`  | String        | Not null    | --       |                |
| `mime_type`     | String        | Not null    | --       |                |
| `size_bytes`    | Int?          | Nullable    | --       |                |
| `created_at`    | DateTime      | Not null    | `now()`  |                |

#### `file_generation_events`

| Column          | Type                        | Constraints                 | Default  | Notes          |
| --------------- | --------------------------- | --------------------------- | -------- | -------------- |
| `id`            | String (CUID)               | PK                          | `cuid()` |                |
| `generation_id` | String                      | Indexed (with `created_at`) | --       | Cascade delete |
| `status`        | Enum `FileGenerationStatus` | Not null                    | --       |                |
| `payload_json`  | Json?                       | Nullable                    | --       |                |
| `created_at`    | DateTime                    | Not null                    | `now()`  |                |

---

## 3. MongoDB Collections

All MongoDB collections use Mongoose schemas with NestJS decorators. The three databases share a single MongoDB instance (`mongodb:27017`).

### 3.1 Audit Database (`claw_audit`)

#### `audit_logs`

| Field        | Type   | Required | Default    | Notes                                   |
| ------------ | ------ | -------- | ---------- | --------------------------------------- |
| `userId`     | String | Yes      | --         | Who performed the action                |
| `action`     | String | Yes      | --         | e.g., "user.login", "connector.created" |
| `entityType` | String | No       | --         | e.g., "connector", "thread"             |
| `entityId`   | String | No       | --         | ID of affected entity                   |
| `severity`   | String | Yes      | `"LOW"`    | LOW, MEDIUM, HIGH, CRITICAL             |
| `details`    | Object | No       | --         | Flexible JSON payload                   |
| `ipAddress`  | String | No       | --         | Client IP address                       |
| `createdAt`  | Date   | Yes      | `Date.now` |                                         |

**Timestamps:** Mongoose `timestamps: true` (auto `createdAt`, `updatedAt`)

#### `usage_ledger`

| Field          | Type   | Required | Default    | Notes                             |
| -------------- | ------ | -------- | ---------- | --------------------------------- |
| `userId`       | String | Yes      | --         |                                   |
| `resourceType` | String | Yes      | --         | e.g., "token", "request", "image" |
| `action`       | String | Yes      | --         | e.g., "message.completed"         |
| `quantity`     | Number | Yes      | `0`        | Count or amount                   |
| `unit`         | String | No       | --         | e.g., "tokens", "requests"        |
| `metadata`     | Object | No       | --         | Provider, model, cost, etc.       |
| `createdAt`    | Date   | Yes      | `Date.now` |                                   |

---

### 3.2 Client Logs Database (`claw_client_logs`)

#### `client_logs`

| Field         | Type   | Required | Default    | Notes                    |
| ------------- | ------ | -------- | ---------- | ------------------------ |
| `level`       | String | Yes      | --         | ERROR, WARN, INFO, DEBUG |
| `message`     | String | Yes      | --         | Log message              |
| `component`   | String | No       | --         | React component name     |
| `action`      | String | No       | --         | User action              |
| `route`       | String | No       | --         | Current page route       |
| `userId`      | String | No       | --         | Authenticated user       |
| `sessionId`   | String | No       | --         | Browser session          |
| `threadId`    | String | No       | --         | Active chat thread       |
| `connectorId` | String | No       | --         | Related connector        |
| `requestId`   | String | No       | --         | X-Request-ID             |
| `locale`      | String | No       | --         | User language            |
| `appearance`  | String | No       | --         | Light/dark/system        |
| `userAgent`   | String | No       | --         | Browser user agent       |
| `errorCode`   | String | No       | --         | Error classification     |
| `errorStack`  | String | No       | --         | Stack trace              |
| `metadata`    | Mixed  | No       | --         | Extra data               |
| `createdAt`   | Date   | Yes      | `Date.now` | **TTL: 30 days**         |

**Indexes:** `level`, `component`, `action`, `userId`, `route`, `message` (text)

**TTL:** Documents auto-expire after 30 days (`expires: 2592000` seconds on `createdAt`).

---

### 3.3 Server Logs Database (`claw_server_logs`)

#### `server_logs`

| Field          | Type   | Required | Default    | Notes                     |
| -------------- | ------ | -------- | ---------- | ------------------------- |
| `level`        | String | Yes      | --         | ERROR, WARN, INFO, DEBUG  |
| `message`      | String | Yes      | --         | Log message               |
| `serviceName`  | String | Yes      | --         | e.g., "chat-service"      |
| `module`       | String | No       | --         | NestJS module name        |
| `controller`   | String | No       | --         | Controller name           |
| `service`      | String | No       | --         | Service class name        |
| `manager`      | String | No       | --         | Manager class name        |
| `repository`   | String | No       | --         | Repository class name     |
| `action`       | String | No       | --         | Operation being performed |
| `route`        | String | No       | --         | HTTP route                |
| `method`       | String | No       | --         | HTTP method               |
| `statusCode`   | Number | No       | --         | HTTP status code          |
| `requestId`    | String | No       | --         | X-Request-ID              |
| `traceId`      | String | No       | --         | Distributed trace ID      |
| `userId`       | String | No       | --         | Authenticated user        |
| `threadId`     | String | No       | --         | Chat thread               |
| `messageId`    | String | No       | --         | Chat message              |
| `connectorId`  | String | No       | --         | Connector                 |
| `provider`     | String | No       | --         | AI provider               |
| `modelName`    | String | No       | --         | AI model                  |
| `latencyMs`    | Number | No       | --         | Request latency           |
| `errorCode`    | String | No       | --         | Error classification      |
| `errorMessage` | String | No       | --         | Error description         |
| `errorStack`   | String | No       | --         | Stack trace               |
| `metadata`     | Mixed  | No       | --         | Extra data                |
| `createdAt`    | Date   | Yes      | `Date.now` | **TTL: 30 days**          |

**Indexes:** `level`, `serviceName`, `action`, `requestId`, `traceId`, `userId`, `threadId`, `createdAt`, `message` (text)

**TTL:** Documents auto-expire after 30 days (`expires: 2592000` seconds on `createdAt`).

---

## 4. Migration Strategy

### Prisma Migrations

All PostgreSQL schema changes use Prisma Migrate:

```bash
# Create a new migration
cd apps/claw-<service>
npx prisma migrate dev --name <descriptive-name>

# Apply in production (runs automatically on container start)
npx prisma migrate deploy
```

**Rules:**

- Every schema change MUST have a corresponding migration.
- Migration names are descriptive: `add-feedback-to-messages`, `create-image-generations`.
- Migrations are committed to source control.
- Docker containers run `prisma migrate deploy` in their entrypoint scripts.

### MongoDB

MongoDB collections are schemaless with Mongoose validation. Changes are additive (new fields with defaults). No formal migration tool -- schema changes are backward-compatible.

---

## 5. Data Lifecycle

| Data Type               | Retention         | Mechanism                                          |
| ----------------------- | ----------------- | -------------------------------------------------- |
| Client logs             | 30 days           | MongoDB TTL index on `createdAt`                   |
| Server logs             | 30 days           | MongoDB TTL index on `createdAt`                   |
| Sessions                | Until `expiresAt` | Application-level cleanup (refresh token rotation) |
| Audit logs              | Indefinite        | No TTL (compliance requirement)                    |
| Usage ledger            | Indefinite        | No TTL (billing/analytics)                         |
| Chat threads/messages   | Indefinite        | User can archive or delete                         |
| Files                   | Indefinite        | User can delete (removes DB record + disk file)    |
| Connector health events | Indefinite        | Consider periodic cleanup in production            |
| Pull jobs               | Indefinite        | Historical record                                  |

---

## 6. ID Generation

All PostgreSQL primary keys use **CUID** (Collision-resistant Unique Identifiers) generated by Prisma's `@default(cuid())`. CUIDs are:

- Monotonically increasing (sortable by creation time).
- URL-safe (lowercase alphanumeric).
- Example: `clwx7b9yp0001lk08c9x3g4z2`.

MongoDB documents use the default `ObjectId` (`_id`).

---

## 7. Encryption

Connector API keys and secrets are stored encrypted:

- Algorithm: AES-256-GCM
- Key: `ENCRYPTION_KEY` (64 hex characters = 32 bytes)
- Stored in: `connectors.encrypted_config`
- Encrypted/decrypted at the service layer -- never stored in plaintext
