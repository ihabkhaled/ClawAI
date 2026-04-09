# Backend Services Index

Complete reference for all 13 ClawAI NestJS backend services.

---

## Quick Reference Table

| #   | Service         | App Name                       | Port | Database                             | Primary Purpose                                     |
| --- | --------------- | ------------------------------ | ---- | ------------------------------------ | --------------------------------------------------- |
| 1   | Auth            | `claw-auth-service`            | 4001 | PostgreSQL (`claw_auth`)             | Authentication, user management, sessions, RBAC     |
| 2   | Chat            | `claw-chat-service`            | 4002 | PostgreSQL (`claw_chat`)             | Threads, messages, context assembly, AI execution   |
| 3   | Connector       | `claw-connector-service`       | 4003 | PostgreSQL (`claw_connectors`)       | Cloud AI provider management, model sync, health    |
| 4   | Routing         | `claw-routing-service`         | 4004 | PostgreSQL (`claw_routing`)          | Intelligent model routing, policies, decisions      |
| 5   | Memory          | `claw-memory-service`          | 4005 | PostgreSQL (`claw_memory`, pgvector) | Memory CRUD, extraction, context packs              |
| 6   | File            | `claw-file-service`            | 4006 | PostgreSQL (`claw_files`)            | File upload, storage, chunking, download            |
| 7   | Audit           | `claw-audit-service`           | 4007 | MongoDB (`claw_audit`)               | Audit trail, usage ledger, cost/latency analytics   |
| 8   | Ollama          | `claw-ollama-service`          | 4008 | PostgreSQL (`claw_ollama`)           | Local model management, pull, generate, roles       |
| 9   | Health          | `claw-health-service`          | 4009 | None                                 | Aggregated health checks across all services        |
| 10  | Client Logs     | `claw-client-logs-service`     | 4010 | MongoDB (`claw_client_logs`)         | Frontend log ingestion, search, stats (TTL 30d)     |
| 11  | Server Logs     | `claw-server-logs-service`     | 4011 | MongoDB (`claw_server_logs`)         | Backend structured logs, search, stats (TTL 30d)    |
| 12  | Image           | `claw-image-service`           | 4012 | PostgreSQL (`claw_images`)           | Image generation orchestration (DALL-E, Gemini, SD) |
| 13  | File Generation | `claw-file-generation-service` | 4013 | PostgreSQL (`claw_file_generations`) | File format conversion (PDF, DOCX, CSV, HTML, etc.) |

---

## Service Details

### 1. Auth Service

**Port**: 4001 | **Database**: PostgreSQL (`claw_auth`) | **ORM**: Prisma

Authentication, authorization, user management, and session lifecycle management. Issues JWT access tokens and manages refresh token rotation with argon2 password hashing.

**Controllers**:

| Controller         | Route Prefix     | Description                             |
| ------------------ | ---------------- | --------------------------------------- |
| `AuthController`   | `/api/v1/auth`   | Login, refresh, logout, profile         |
| `UsersController`  | `/api/v1/users`  | User CRUD, role management, preferences |
| `HealthController` | `/api/v1/health` | Service health check                    |

**Key Routes**:

- `POST /auth/login` -- Authenticate user (public)
- `POST /auth/refresh` -- Refresh JWT token (public)
- `POST /auth/logout` -- End session (authenticated)
- `GET /auth/me` -- Get current user profile (authenticated)
- `POST /users` -- Create user (ADMIN only)
- `GET /users` -- List users with pagination (ADMIN only)
- `GET /users/:id` -- Get user by ID (ADMIN only)
- `PATCH /users/:id` -- Update user (ADMIN only)
- `DELETE /users/:id` -- Deactivate user (ADMIN only)
- `PATCH /users/:id/reactivate` -- Reactivate user (ADMIN only)
- `PATCH /users/:id/role` -- Change user role (ADMIN only)
- `PATCH /users/me/preferences` -- Update own preferences (authenticated)
- `PATCH /users/me/password` -- Change own password (authenticated)

**Key Services**: `AuthService`, `UsersService`, `SessionService`

**Database Tables**:

- `User` -- email, username, passwordHash, role, status, preferences
- `Session` -- userId, refreshToken, expiresAt
- `SystemSetting` -- key/value store

**Events Published**:

- `user.created` -- When a new user is created
- `user.login` -- When a user successfully logs in
- `user.logout` -- When a user logs out
- `user.role_changed` -- When a user's role is updated
- `user.deactivated` -- When a user is deactivated

**Events Consumed**: None

**Inter-Service Dependencies**: None (foundational service)

**Health Endpoint**: `GET /api/v1/health`

---

### 2. Chat Service

**Port**: 4002 | **Database**: PostgreSQL (`claw_chat`) | **ORM**: Prisma

Core chat functionality. Manages threads and messages, assembles context (memories, files, context packs), executes AI completions through cloud providers and Ollama, and streams responses via SSE.

**Controllers**:

| Controller               | Route Prefix            | Description                             |
| ------------------------ | ----------------------- | --------------------------------------- |
| `ChatMessagesController` | `/api/v1/chat-messages` | Create, list, get, regenerate, feedback |
| `ChatStreamController`   | `/api/v1/chat-messages` | SSE streaming for thread updates        |
| `ChatThreadsController`  | `/api/v1/chat-threads`  | Thread CRUD                             |
| `HealthController`       | `/api/v1/health`        | Service health check                    |

**Key Routes**:

- `POST /chat-messages` -- Send a message (triggers routing + AI execution)
- `GET /chat-messages/thread/:threadId` -- List messages in thread (paginated)
- `GET /chat-messages/:id` -- Get single message
- `POST /chat-messages/:id/regenerate` -- Regenerate AI response
- `PATCH /chat-messages/:id/feedback` -- Set thumbs up/down feedback
- `SSE /chat-messages/stream/:threadId` -- Real-time message stream (skip throttle)
- `POST /chat-threads` -- Create new thread
- `GET /chat-threads` -- List user's threads (paginated)
- `GET /chat-threads/:id` -- Get thread details
- `PATCH /chat-threads/:id` -- Update thread settings
- `DELETE /chat-threads/:id` -- Delete thread

**Key Services**: `ChatMessagesService`, `ChatThreadsService`, `ChatStreamService`, `ContextAssemblyManager`, `ChatExecutionManager`

**Database Tables**:

- `ChatThread` -- userId, title, routingMode, preferredProvider/Model, contextPackIds, systemPrompt, temperature, maxTokens
- `ChatMessage` -- threadId, role, content, provider, model, routingMode, inputTokens, outputTokens, latencyMs, feedback, metadata
- `MessageAttachment` -- messageId, fileId, type

**Events Published**:

- `message.created` -- When user sends a message
- `message.completed` -- When AI response is stored

**Events Consumed**:

- `message.routed` -- Receives routing decision from routing service

**Inter-Service Dependencies**:

- Routing Service -- via RabbitMQ (message.created -> message.routed)
- Memory Service -- HTTP (`/internal/memories/for-context`)
- Memory Service -- HTTP (`/internal/context-packs/:id/items`)
- File Service -- HTTP (`/internal/files/:id/chunks`, `/internal/files/:id/content`)
- Connector Service -- HTTP (`/internal/connectors/config`)
- Ollama Service -- HTTP (`/internal/ollama/router-model`)
- Image Service -- HTTP (`/internal/images/generate`)
- File Generation Service -- HTTP (`/internal/file-generations/generate`)

**Health Endpoint**: `GET /api/v1/health`

---

### 3. Connector Service

**Port**: 4003 | **Database**: PostgreSQL (`claw_connectors`) | **ORM**: Prisma

Manages cloud AI provider connectors (OpenAI, Anthropic, Google, DeepSeek, xAI). Handles encrypted API key storage (AES-256-GCM), model discovery/sync, and health monitoring.

**Controllers**:

| Controller                     | Route Prefix                  | Description                    |
| ------------------------------ | ----------------------------- | ------------------------------ |
| `ConnectorsController`         | `/api/v1/connectors`          | CRUD, test, sync, list models  |
| `ConnectorsInternalController` | `/api/v1/internal/connectors` | Inter-service connector config |
| `HealthController`             | `/api/v1/health`              | Service health check           |

**Key Routes**:

- `POST /connectors` -- Create new connector
- `GET /connectors` -- List connectors (paginated)
- `GET /connectors/:id` -- Get connector with models
- `PATCH /connectors/:id` -- Update connector
- `DELETE /connectors/:id` -- Delete connector
- `POST /connectors/:id/test` -- Test connector connectivity
- `POST /connectors/:id/sync` -- Sync available models
- `GET /connectors/:id/models` -- List connector's models
- `GET /internal/connectors/config?provider=X` -- Get connector config (internal, public)

**Key Services**: `ConnectorsService`, `ModelSyncManager`, `HealthCheckManager`

**Database Tables**:

- `Connector` -- name, provider, status, encryptedConfig (AES-256-GCM), baseUrl
- `ConnectorModel` -- modelKey, displayName, lifecycle, capability flags
- `ConnectorHealthEvent` -- health check history
- `ModelSyncRun` -- sync run history

**Events Published**:

- `connector.created` -- When a connector is created
- `connector.updated` -- When a connector is updated
- `connector.deleted` -- When a connector is deleted
- `connector.synced` -- When models are synced
- `connector.health_checked` -- When health check completes

**Events Consumed**: None

**Inter-Service Dependencies**: None (consumed by chat and routing)

**Health Endpoint**: `GET /api/v1/health`

---

### 4. Routing Service

**Port**: 4004 | **Database**: PostgreSQL (`claw_routing`) | **ORM**: Prisma

Intelligent AI model routing across 7 modes. Uses Ollama-assisted AUTO mode with Zod-validated structured output, heuristic fallback, and configurable policies.

**Controllers**:

| Controller          | Route Prefix      | Description                        |
| ------------------- | ----------------- | ---------------------------------- |
| `RoutingController` | `/api/v1/routing` | Policies CRUD, evaluate, decisions |
| `HealthController`  | `/api/v1/health`  | Service health check               |

**Key Routes**:

- `POST /routing/policies` -- Create routing policy
- `GET /routing/policies` -- List policies (paginated)
- `GET /routing/policies/:id` -- Get policy
- `PATCH /routing/policies/:id` -- Update policy
- `DELETE /routing/policies/:id` -- Delete policy
- `POST /routing/evaluate` -- Evaluate route for a message
- `GET /routing/decisions/:threadId` -- Get routing decisions for thread (paginated)

**Key Services**: `RoutingService`, `RoutingManager`

**Database Tables**:

- `RoutingDecision` -- selectedProvider/Model, confidence, reasonTags, privacyClass, costClass, fallback
- `RoutingPolicy` -- name, routingMode, priority, config (JSON), isActive

**Events Published**:

- `message.routed` -- When routing decision is made
- `routing.decision_made` -- For audit trail

**Events Consumed**:

- `message.created` -- Triggers routing evaluation
- `connector.synced` -- Updates available model cache
- `connector.health_checked` -- Updates provider health status

**Inter-Service Dependencies**:

- Ollama Service -- HTTP (for AUTO mode router model)
- Connector Service -- HTTP (for available providers/models)

**Health Endpoint**: `GET /api/v1/health`

---

### 5. Memory Service

**Port**: 4005 | **Database**: PostgreSQL (`claw_memory`, pgvector) | **ORM**: Prisma

Manages user memories (facts, preferences, instructions, summaries) and context packs. Supports automatic extraction from completed messages via Ollama. Uses pgvector for semantic similarity search.

**Controllers**:

| Controller                       | Route Prefix                     | Description                |
| -------------------------------- | -------------------------------- | -------------------------- |
| `MemoryController`               | `/api/v1/memories`               | Memory CRUD + toggle       |
| `ContextPacksController`         | `/api/v1/context-packs`          | Context pack CRUD + items  |
| `MemoryInternalController`       | `/api/v1/internal/memories`      | Inter-service memory fetch |
| `ContextPacksInternalController` | `/api/v1/internal/context-packs` | Inter-service pack items   |
| `HealthController`               | `/api/v1/health`                 | Service health check       |

**Key Routes**:

- `POST /memories` -- Create memory record
- `GET /memories` -- List memories (paginated, filtered)
- `GET /memories/:id` -- Get memory
- `PATCH /memories/:id` -- Update memory
- `DELETE /memories/:id` -- Delete memory
- `PATCH /memories/:id/toggle` -- Enable/disable memory
- `POST /context-packs` -- Create context pack
- `GET /context-packs` -- List context packs
- `GET /context-packs/:id` -- Get pack with items
- `PATCH /context-packs/:id` -- Update pack
- `DELETE /context-packs/:id` -- Delete pack
- `POST /context-packs/:id/items` -- Add item to pack
- `DELETE /context-packs/:id/items/:itemId` -- Remove item from pack
- `GET /internal/memories/for-context?userId=X&limit=N` -- Get memories for context assembly (internal, public)
- `GET /internal/context-packs/:id/items` -- Get pack items (internal, public)

**Key Services**: `MemoryService`, `ContextPacksService`, `MemoryExtractionManager`

**Database Tables**:

- `MemoryRecord` -- userId, type, content, sourceThreadId/MessageId, isEnabled
- `ContextPack` -- name, description, scope
- `ContextPackItem` -- type, content, fileId, sortOrder

**Events Published**:

- `memory.extracted` -- When memory is auto-extracted from a message

**Events Consumed**:

- `message.completed` -- Triggers memory extraction

**Inter-Service Dependencies**:

- Ollama Service -- HTTP (for memory extraction model)

**Health Endpoint**: `GET /api/v1/health`

---

### 6. File Service

**Port**: 4006 | **Database**: PostgreSQL (`claw_files`) | **ORM**: Prisma

File upload, storage, chunking (JSON, CSV, Markdown, text), and download. Supports base64 file content with automatic chunking for AI context assembly.

**Controllers**:

| Controller                | Route Prefix             | Description                                 |
| ------------------------- | ------------------------ | ------------------------------------------- |
| `FilesController`         | `/api/v1/files`          | Upload, list, get, delete, download, chunks |
| `FilesInternalController` | `/api/v1/internal/files` | Inter-service file access                   |
| `HealthController`        | `/api/v1/health`         | Service health check                        |

**Key Routes**:

- `POST /files/upload` -- Upload file (base64 content)
- `GET /files` -- List user's files (paginated)
- `GET /files/:id` -- Get file metadata
- `DELETE /files/:id` -- Delete file
- `GET /files/download/:id` -- Download file content
- `GET /files/:id/chunks` -- Get file chunks
- `GET /internal/files/:id/chunks` -- Get chunks (internal, public)
- `GET /internal/files/:id/content` -- Get file content (internal, public)
- `GET /internal/files/download/:id` -- Download file (internal, public)
- `POST /internal/files/store-image` -- Store generated image (internal, public)

**Key Services**: `FilesService`, `FileChunkingManager`

**Database Tables**:

- `File` -- userId, filename, mimeType, sizeBytes, storagePath, ingestionStatus, content
- `FileChunk` -- fileId, chunkIndex, content

**Events Published**:

- `file.uploaded` -- When a file is uploaded
- `file.chunked` -- When chunking completes

**Events Consumed**: None

**Inter-Service Dependencies**: None (consumed by chat)

**Health Endpoint**: `GET /api/v1/health`

---

### 7. Audit Service

**Port**: 4007 | **Database**: MongoDB (`claw_audit`) | **ODM**: Mongoose

Audit trail and usage ledger. Records 11 audit actions across all services. Provides usage summary, cost analysis, and latency analytics.

**Controllers**:

| Controller         | Route Prefix     | Description                  |
| ------------------ | ---------------- | ---------------------------- |
| `AuditsController` | `/api/v1/`       | Audit logs + usage analytics |
| `HealthController` | `/api/v1/health` | Service health check         |

**Key Routes**:

- `GET /audits` -- List audit logs (paginated, filtered by action/severity/entity/date)
- `GET /audits/stats` -- Aggregated audit statistics
- `GET /usage` -- List usage entries (paginated, filtered by provider/model/date)
- `GET /usage/summary` -- Usage summary (token counts, request counts)
- `GET /usage/cost` -- Cost summary by provider/model
- `GET /usage/latency` -- Latency summary by provider/model

**Key Services**: `AuditsService`, `UsageService`, `AuditEventHandler`

**Database Collections**:

- `audit_logs` -- userId, action, entityType, entityId, severity, details
- `usage_ledger` -- resourceType, action, quantity, unit, metadata

**Events Published**: None

**Events Consumed**:

- `user.login` / `user.logout` -- Record auth events
- `connector.created` / `connector.updated` / `connector.deleted` -- Record connector changes
- `connector.synced` -- Record sync events
- `routing.decision_made` -- Record routing decisions
- `message.completed` -- Record usage (tokens, latency)
- `memory.extracted` -- Record extraction events

**Inter-Service Dependencies**: None (event consumer only)

**Health Endpoint**: `GET /api/v1/health`

---

### 8. Ollama Service

**Port**: 4008 | **Database**: PostgreSQL (`claw_ollama`) | **ORM**: Prisma

Manages the local Ollama AI runtime. Handles model pulling, role assignment (router, fallback, reasoning, coding), text generation, and health monitoring. Auto-pulls 5 default models on startup.

**Controllers**:

| Controller                 | Route Prefix              | Description                                           |
| -------------------------- | ------------------------- | ----------------------------------------------------- |
| `OllamaController`         | `/api/v1/ollama`          | Models, pull, assign-role, generate, health, runtimes |
| `OllamaInternalController` | `/api/v1/internal/ollama` | Inter-service router model lookup                     |
| `HealthController`         | `/api/v1/health`          | Service health check                                  |

**Key Routes**:

- `GET /ollama/models` -- List local models (paginated)
- `POST /ollama/pull` -- Pull a model from Ollama registry
- `POST /ollama/assign-role` -- Assign role to a model
- `POST /ollama/generate` -- Generate text completion (public)
- `GET /ollama/health?runtime=X` -- Check Ollama runtime health (public)
- `GET /ollama/runtimes` -- List configured runtimes
- `GET /internal/ollama/router-model` -- Get current router model name (internal, public)

**Key Services**: `OllamaService`, `OllamaStartupService`

**Database Tables**:

- `LocalModel` -- name, tag, runtime, family, parameters, sizeBytes
- `LocalModelRoleAssignment` -- modelId, role, isActive
- `PullJob` -- model pull progress tracking
- `RuntimeConfig` -- runtime configuration

**Events Published**: None (generates on request)

**Events Consumed**: None

**Inter-Service Dependencies**:

- Ollama Runtime -- HTTP (`OLLAMA_BASE_URL`, default port 11434)

**Health Endpoint**: `GET /api/v1/health`

---

### 9. Health Service

**Port**: 4009 | **Database**: None

Lightweight aggregation service. Queries health endpoints of all other services and returns a consolidated status report.

**Controllers**:

| Controller         | Route Prefix     | Description             |
| ------------------ | ---------------- | ----------------------- |
| `HealthController` | `/api/v1/health` | Aggregated health check |

**Key Routes**:

- `GET /health` -- Aggregated health status of all services

**Key Services**: `HealthService`

**Database Tables**: None

**Events Published**:

- `health.check` -- Periodic health check results

**Events Consumed**: None

**Inter-Service Dependencies**: All other services (HTTP health endpoints)

**Health Endpoint**: `GET /api/v1/health` (this IS the health endpoint)

---

### 10. Client Logs Service

**Port**: 4010 | **Database**: MongoDB (`claw_client_logs`) | **ODM**: Mongoose

Ingests frontend/browser logs. Supports batched ingestion, search, and statistics. Documents auto-expire after 30 days (TTL index).

**Controllers**:

| Controller             | Route Prefix          | Description           |
| ---------------------- | --------------------- | --------------------- |
| `ClientLogsController` | `/api/v1/client-logs` | Create, search, stats |
| `HealthController`     | `/api/v1/health`      | Service health check  |

**Key Routes**:

- `POST /client-logs` -- Create client log entry (public, no auth required)
- `GET /client-logs` -- Search/list client logs (ADMIN, OPERATOR)
- `GET /client-logs/stats` -- Log statistics (ADMIN, OPERATOR)

**Key Services**: `ClientLogsService`

**Database Collections**:

- `client_logs` -- level, message, component, action, userId, route, userAgent (TTL 30d)

**Events Published**: None

**Events Consumed**: None

**Inter-Service Dependencies**: None

**Health Endpoint**: `GET /api/v1/health`

---

### 11. Server Logs Service

**Port**: 4011 | **Database**: MongoDB (`claw_server_logs`) | **ODM**: Mongoose

Ingests structured backend logs from all services via RabbitMQ and HTTP. Supports rich filtering (service, module, controller, action, request/trace IDs) and statistics. TTL 30 days.

**Controllers**:

| Controller             | Route Prefix          | Description                         |
| ---------------------- | --------------------- | ----------------------------------- |
| `ServerLogsController` | `/api/v1/server-logs` | Create, batch create, search, stats |
| `HealthController`     | `/api/v1/health`      | Service health check                |

**Key Routes**:

- `POST /server-logs` -- Create single log entry (public)
- `POST /server-logs/batch` -- Create batch of log entries (public)
- `GET /server-logs` -- Search/list server logs (authenticated, filtered)
- `GET /server-logs/stats` -- Log statistics

**Key Services**: `ServerLogsService`, `ServerLogEventHandler`

**Database Collections**:

- `server_logs` -- level, serviceName, module, action, requestId, traceId, userId, threadId, provider, model, latencyMs, error fields (TTL 30d)

**Events Published**: None

**Events Consumed**:

- `log.server` -- Receives structured log events from all services via RabbitMQ

**Inter-Service Dependencies**: None (event consumer only)

**Health Endpoint**: `GET /api/v1/health`

---

### 12. Image Service

**Port**: 4012 | **Database**: PostgreSQL (`claw_images`) | **ORM**: Prisma

Orchestrates image generation across cloud providers (OpenAI DALL-E 3, Google Gemini Imagen) and local Stable Diffusion. Supports async generation with SSE progress events, retry with alternate models.

**Controllers**:

| Controller                  | Route Prefix              | Description                                   |
| --------------------------- | ------------------------- | --------------------------------------------- |
| `ImageGenerationController` | `/api/v1/images`          | List, get, retry, retry-alternate, SSE events |
| `InternalImageController`   | `/api/v1/internal/images` | Inter-service generation trigger              |
| `HealthController`          | `/api/v1/health`          | Service health check                          |

**Key Routes**:

- `GET /images` -- List user's image generations (paginated)
- `GET /images/:id` -- Get image generation by ID
- `POST /images/:id/retry` -- Retry failed generation
- `POST /images/:id/retry-alternate` -- Retry with different provider/model
- `SSE /images/:id/events` -- Real-time generation progress (public)
- `POST /internal/images/generate` -- Enqueue image generation (internal, public)
- `GET /internal/images/:generationId` -- Get generation status (internal, public)
- `POST /internal/images/:generationId/retry` -- Retry (internal, public)
- `POST /internal/images/:generationId/retry-alternate` -- Retry alternate (internal, public)
- `SSE /internal/images/:generationId/events` -- Progress events (internal, public)

**Key Services**: `ImageGenerationService`, `ImageGenerationEventsService`, `ImageExecutionManager`

**Database Tables**:

- `ImageGeneration` -- prompt, provider, model, status, resultUrl, error, userId

**Events Published**:

- `image.generated` -- When image generation completes
- `image.failed` -- When image generation fails

**Events Consumed**: None

**Inter-Service Dependencies**:

- Connector Service -- HTTP (for provider API keys)
- File Service -- HTTP (for storing generated images)

**Health Endpoint**: `GET /api/v1/health`

---

### 13. File Generation Service

**Port**: 4013 | **Database**: PostgreSQL (`claw_file_generations`) | **ORM**: Prisma

Converts LLM-generated text content into downloadable files. Supports 7 output formats: PDF, DOCX, CSV, HTML, Markdown, JSON, and TXT. Async generation with SSE progress events.

**Controllers**:

| Controller                         | Route Prefix                        | Description                      |
| ---------------------------------- | ----------------------------------- | -------------------------------- |
| `FileGenerationController`         | `/api/v1/file-generations`          | List, get, retry, SSE events     |
| `InternalFileGenerationController` | `/api/v1/internal/file-generations` | Inter-service generation trigger |
| `HealthController`                 | `/api/v1/health`                    | Service health check             |

**Key Routes**:

- `GET /file-generations` -- List user's file generations (paginated)
- `GET /file-generations/:id` -- Get file generation by ID
- `POST /file-generations/:id/retry` -- Retry failed generation
- `SSE /file-generations/:id/events` -- Real-time generation progress (public)
- `POST /internal/file-generations/generate` -- Enqueue file generation (internal, public)
- `GET /internal/file-generations/:generationId` -- Get generation status (internal, public)
- `POST /internal/file-generations/:generationId/retry` -- Retry (internal, public)
- `SSE /internal/file-generations/:generationId/events` -- Progress events (internal, public)

**Key Services**: `FileGenerationService`, `FileGenerationEventsService`, `FileExecutionManager`

**Database Tables**:

- `FileGeneration` -- content, format, status, resultUrl, error, userId
- `FileGenerationAsset` -- generated file assets
- `FileGenerationEvent` -- generation event log

**Events Published**: None

**Events Consumed**: None

**Inter-Service Dependencies**:

- File Service -- HTTP (for storing generated files)

**Health Endpoint**: `GET /api/v1/health`

---

## Event Bus Summary

All events flow through the `claw.events` topic exchange on RabbitMQ with durable queues, 3 retries with exponential backoff, and dead-letter queues.

| Event Pattern              | Publisher    | Consumers      |
| -------------------------- | ------------ | -------------- |
| `user.created`             | Auth         | --             |
| `user.login`               | Auth         | Audit          |
| `user.logout`              | Auth         | Audit          |
| `user.role_changed`        | Auth         | --             |
| `user.deactivated`         | Auth         | --             |
| `message.created`          | Chat         | Routing        |
| `message.routed`           | Routing      | Chat           |
| `message.completed`        | Chat         | Audit, Memory  |
| `connector.created`        | Connector    | Audit          |
| `connector.updated`        | Connector    | Audit          |
| `connector.deleted`        | Connector    | Audit          |
| `connector.synced`         | Connector    | Audit, Routing |
| `connector.health_checked` | Connector    | Audit, Routing |
| `routing.decision_made`    | Routing      | Audit          |
| `file.uploaded`            | File         | --             |
| `file.chunked`             | File         | --             |
| `memory.extracted`         | Memory       | Audit          |
| `image.generated`          | Image        | --             |
| `image.failed`             | Image        | --             |
| `health.check`             | Health       | --             |
| `log.server`               | All services | Server Logs    |

---

## Inter-Service HTTP Dependencies

```
Chat Service
  -> Connector Service  (GET /internal/connectors/config)
  -> Memory Service     (GET /internal/memories/for-context)
  -> Memory Service     (GET /internal/context-packs/:id/items)
  -> File Service       (GET /internal/files/:id/chunks)
  -> File Service       (GET /internal/files/:id/content)
  -> Ollama Service     (GET /internal/ollama/router-model)
  -> Image Service      (POST /internal/images/generate)
  -> File Gen Service   (POST /internal/file-generations/generate)

Routing Service
  -> Connector Service  (GET /internal/connectors/config)
  -> Ollama Service     (POST /ollama/generate)

Memory Service
  -> Ollama Service     (POST /ollama/generate)

Image Service
  -> Connector Service  (GET /internal/connectors/config)
  -> File Service       (POST /internal/files/store-image)

File Generation Service
  -> File Service       (POST /internal/files/store-image)

Health Service
  -> All services       (GET /health)
```

---

## Common Patterns Across All Services

Every backend service shares these characteristics:

1. **Global Prefix**: All routes prefixed with `/api/v1/`
2. **Auth Guard**: JWT-based `AuthGuard` applied globally, opt-out via `@Public()`
3. **Roles Guard**: `RolesGuard` for RBAC (`@Roles(UserRole.ADMIN)`)
4. **Rate Limiting**: `@nestjs/throttler` (100 req/min default, SSE endpoints skip throttle)
5. **Helmet**: Security headers on all services
6. **Zod Validation**: All input validated via `ZodValidationPipe`
7. **Error Handling**: `GlobalExceptionFilter` with `BusinessException`
8. **Logging**: NestJS Logger + Pino structured logging + RabbitMQ log events
9. **Health Check**: Every service exposes `GET /api/v1/health`
10. **CORS**: Configured via `CORS_ORIGINS` environment variable
