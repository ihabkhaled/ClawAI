# Controllers Reference

Complete reference for all controllers across all 13 ClawAI backend services. Every route is prefixed with `/api/v1/` via the global API prefix.

---

## Table of Contents

1. [Auth Service Controllers](#auth-service-controllers)
2. [Chat Service Controllers](#chat-service-controllers)
3. [Connector Service Controllers](#connector-service-controllers)
4. [Routing Service Controllers](#routing-service-controllers)
5. [Memory Service Controllers](#memory-service-controllers)
6. [File Service Controllers](#file-service-controllers)
7. [Audit Service Controllers](#audit-service-controllers)
8. [Ollama Service Controllers](#ollama-service-controllers)
9. [Health Service Controllers](#health-service-controllers)
10. [Client Logs Service Controllers](#client-logs-service-controllers)
11. [Server Logs Service Controllers](#server-logs-service-controllers)
12. [Image Service Controllers](#image-service-controllers)
13. [File Generation Service Controllers](#file-generation-service-controllers)

---

## Auth Service Controllers

### AuthController

**Route Prefix**: `/api/v1/auth`
**File**: `apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts`

| Method | Path            | Auth          | Description                                | Input DTO                                                        | Response Type                                    | Error Codes                                |
| ------ | --------------- | ------------- | ------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------ |
| `POST` | `/auth/login`   | Public        | Authenticate user with email/password      | `LoginDto` (`loginSchema`) -- email: string, password: string    | `LoginResult` -- accessToken, refreshToken, user | `INVALID_CREDENTIALS`, `USER_INACTIVE`     |
| `POST` | `/auth/refresh` | Public        | Refresh JWT access token                   | `RefreshTokenDto` (`refreshTokenSchema`) -- refreshToken: string | `RefreshResult` -- accessToken, refreshToken     | `INVALID_REFRESH_TOKEN`, `SESSION_EXPIRED` |
| `POST` | `/auth/logout`  | Authenticated | End user session, invalidate refresh token | None (uses `@CurrentUser()`)                                     | `void` (204 No Content)                          | `SESSION_NOT_FOUND`                        |
| `GET`  | `/auth/me`      | Authenticated | Get current user profile                   | None (uses `@CurrentUser()`)                                     | `UserProfile`                                    | `USER_NOT_FOUND`                           |

### UsersController

**Route Prefix**: `/api/v1/users`
**File**: `apps/claw-auth-service/src/modules/users/controllers/users.controller.ts`

| Method   | Path                    | Auth          | Description                    | Input DTO                                                                               | Response Type               | Error Codes                                 |
| -------- | ----------------------- | ------------- | ------------------------------ | --------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------- |
| `POST`   | `/users`                | ADMIN         | Create a new user              | `CreateUserDto` (`createUserSchema`) -- email, username, password, role                 | `SafeUser`                  | `EMAIL_ALREADY_EXISTS`, `USERNAME_TAKEN`    |
| `GET`    | `/users`                | ADMIN         | List all users with pagination | `ListUsersQueryDto` (`listUsersQuerySchema`) -- page, limit, search, role, status       | `PaginatedResult<SafeUser>` | --                                          |
| `GET`    | `/users/:id`            | ADMIN         | Get user by ID                 | Path: `id` (UUID)                                                                       | `SafeUser`                  | `USER_NOT_FOUND`                            |
| `PATCH`  | `/users/:id`            | ADMIN         | Update user details            | `UpdateUserDto` (`updateUserSchema`) -- username?, email?, role?                        | `SafeUser`                  | `USER_NOT_FOUND`, `EMAIL_ALREADY_EXISTS`    |
| `DELETE` | `/users/:id`            | ADMIN         | Deactivate user                | Path: `id` (UUID)                                                                       | `SafeUser`                  | `USER_NOT_FOUND`, `CANNOT_DEACTIVATE_SELF`  |
| `PATCH`  | `/users/:id/reactivate` | ADMIN         | Reactivate deactivated user    | Path: `id` (UUID)                                                                       | `SafeUser`                  | `USER_NOT_FOUND`, `USER_ALREADY_ACTIVE`     |
| `PATCH`  | `/users/:id/role`       | ADMIN         | Change user role               | `ChangeRoleDto` (`changeRoleSchema`) -- role: UserRole                                  | `SafeUser`                  | `USER_NOT_FOUND`, `CANNOT_CHANGE_OWN_ROLE`  |
| `PATCH`  | `/users/me/preferences` | Authenticated | Update own preferences         | `UpdatePreferencesDto` (`updatePreferencesSchema`) -- language?, appearance?, timezone? | `SafeUser`                  | `USER_NOT_FOUND`                            |
| `PATCH`  | `/users/me/password`    | Authenticated | Change own password            | `ChangePasswordDto` (`changePasswordSchema`) -- currentPassword, newPassword            | `void` (204)                | `INVALID_CURRENT_PASSWORD`, `SAME_PASSWORD` |

---

## Chat Service Controllers

### ChatMessagesController

**Route Prefix**: `/api/v1/chat-messages`
**File**: `apps/claw-chat-service/src/modules/chat-messages/controllers/chat-messages.controller.ts`

| Method  | Path                              | Auth          | Description                                      | Input DTO                                                                                    | Response Type                  | Error Codes                                                  |
| ------- | --------------------------------- | ------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| `POST`  | `/chat-messages`                  | Authenticated | Send a message (triggers routing + AI execution) | `CreateMessageDto` (`createMessageSchema`) -- threadId, content, provider?, model?, fileIds? | `ChatMessage`                  | `THREAD_NOT_FOUND`, `THREAD_ACCESS_DENIED`, `ROUTING_FAILED` |
| `GET`   | `/chat-messages/thread/:threadId` | Authenticated | List messages in a thread                        | `ListMessagesQueryDto` (`listMessagesQuerySchema`) -- page, limit                            | `PaginatedResult<ChatMessage>` | `THREAD_NOT_FOUND`, `THREAD_ACCESS_DENIED`                   |
| `GET`   | `/chat-messages/:id`              | Authenticated | Get a single message                             | Path: `id` (UUID)                                                                            | `ChatMessage`                  | `MESSAGE_NOT_FOUND`, `MESSAGE_ACCESS_DENIED`                 |
| `POST`  | `/chat-messages/:id/regenerate`   | Authenticated | Regenerate AI response for a message             | Path: `id` (UUID)                                                                            | `ChatMessage`                  | `MESSAGE_NOT_FOUND`, `REGENERATION_FAILED`                   |
| `PATCH` | `/chat-messages/:id/feedback`     | Authenticated | Set feedback (thumbs up/down)                    | `SetFeedbackDto` (`setFeedbackSchema`) -- feedback: string                                   | `ChatMessage`                  | `MESSAGE_NOT_FOUND`                                          |

### ChatStreamController

**Route Prefix**: `/api/v1/chat-messages`
**File**: `apps/claw-chat-service/src/modules/chat-messages/controllers/chat-stream.controller.ts`

| Method | Path                              | Auth          | Description                                            | Input DTO               | Response Type              | Error Codes |
| ------ | --------------------------------- | ------------- | ------------------------------------------------------ | ----------------------- | -------------------------- | ----------- |
| `SSE`  | `/chat-messages/stream/:threadId` | Authenticated | Real-time message stream (skip throttle, skip logging) | Path: `threadId` (UUID) | `Observable<MessageEvent>` | --          |

**Notes**: Uses `@SkipThrottle()` to bypass rate limiting. Uses `@SkipLogging()` to avoid noisy log entries. Events are filtered by `threadId` and emitted as JSON-serialized SSE data.

### ChatThreadsController

**Route Prefix**: `/api/v1/chat-threads`
**File**: `apps/claw-chat-service/src/modules/chat-threads/controllers/chat-threads.controller.ts`

| Method   | Path                | Auth          | Description                              | Input DTO                                                                                                                                      | Response Type                             | Error Codes                                |
| -------- | ------------------- | ------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| `POST`   | `/chat-threads`     | Authenticated | Create a new chat thread                 | `CreateThreadDto` (`createThreadSchema`) -- title?, routingMode?, preferredProvider?, preferredModel?, systemPrompt?, temperature?, maxTokens? | `ChatThread`                              | --                                         |
| `GET`    | `/chat-threads`     | Authenticated | List user's threads (with message count) | `ListThreadsQueryDto` (`listThreadsQuerySchema`) -- page, limit, search                                                                        | `PaginatedResult<ThreadWithMessageCount>` | --                                         |
| `GET`    | `/chat-threads/:id` | Authenticated | Get thread details                       | Path: `id` (UUID)                                                                                                                              | `ChatThread`                              | `THREAD_NOT_FOUND`, `THREAD_ACCESS_DENIED` |
| `PATCH`  | `/chat-threads/:id` | Authenticated | Update thread settings                   | `UpdateThreadDto` (`updateThreadSchema`) -- title?, routingMode?, systemPrompt?, temperature?, maxTokens?, contextPackIds?                     | `ChatThread`                              | `THREAD_NOT_FOUND`, `THREAD_ACCESS_DENIED` |
| `DELETE` | `/chat-threads/:id` | Authenticated | Delete thread and all messages           | Path: `id` (UUID)                                                                                                                              | `ChatThread`                              | `THREAD_NOT_FOUND`, `THREAD_ACCESS_DENIED` |

---

## Connector Service Controllers

### ConnectorsController

**Route Prefix**: `/api/v1/connectors`
**File**: `apps/claw-connector-service/src/modules/connectors/controllers/connectors.controller.ts`

| Method   | Path                     | Auth          | Description                         | Input DTO                                                                                 | Response Type                          | Error Codes                                    |
| -------- | ------------------------ | ------------- | ----------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------- |
| `POST`   | `/connectors`            | Authenticated | Create a new AI provider connector  | `CreateConnectorDto` (`createConnectorSchema`) -- name, provider, apiKey, baseUrl?        | `ConnectorWithModels`                  | `CONNECTOR_ALREADY_EXISTS`, `INVALID_PROVIDER` |
| `GET`    | `/connectors`            | Authenticated | List connectors with models         | `ListConnectorsQueryDto` (`listConnectorsQuerySchema`) -- page, limit, provider?, status? | `PaginatedResult<ConnectorWithModels>` | --                                             |
| `GET`    | `/connectors/:id`        | Authenticated | Get connector with its models       | Path: `id` (UUID)                                                                         | `ConnectorWithModels`                  | `CONNECTOR_NOT_FOUND`                          |
| `PATCH`  | `/connectors/:id`        | Authenticated | Update connector configuration      | `UpdateConnectorDto` (`updateConnectorSchema`) -- name?, apiKey?, baseUrl?, status?       | `ConnectorWithModels`                  | `CONNECTOR_NOT_FOUND`                          |
| `DELETE` | `/connectors/:id`        | Authenticated | Delete connector and all models     | Path: `id` (UUID)                                                                         | `ConnectorWithModels`                  | `CONNECTOR_NOT_FOUND`                          |
| `POST`   | `/connectors/:id/test`   | Authenticated | Test connector connectivity         | Path: `id` (UUID)                                                                         | `HealthCheckResult`                    | `CONNECTOR_NOT_FOUND`, `HEALTH_CHECK_FAILED`   |
| `POST`   | `/connectors/:id/sync`   | Authenticated | Sync available models from provider | Path: `id` (UUID)                                                                         | `SyncModelsResult`                     | `CONNECTOR_NOT_FOUND`, `SYNC_FAILED`           |
| `GET`    | `/connectors/:id/models` | Authenticated | List models for a connector         | Path: `id` (UUID)                                                                         | `ConnectorModel[]`                     | `CONNECTOR_NOT_FOUND`                          |

### ConnectorsInternalController

**Route Prefix**: `/api/v1/internal/connectors`
**File**: `apps/claw-connector-service/src/modules/connectors/controllers/connectors-internal.controller.ts`

| Method | Path                          | Auth   | Description                                      | Input DTO                  | Response Type           | Error Codes           |
| ------ | ----------------------------- | ------ | ------------------------------------------------ | -------------------------- | ----------------------- | --------------------- |
| `GET`  | `/internal/connectors/config` | Public | Get connector config by provider (inter-service) | Query: `provider` (string) | `ConnectorConfigResult` | `CONNECTOR_NOT_FOUND` |

**Notes**: This is an internal endpoint used by other services (chat, routing) to retrieve decrypted connector configuration for making AI API calls. Marked `@Public()` because inter-service calls do not carry user JWT tokens.

---

## Routing Service Controllers

### RoutingController

**Route Prefix**: `/api/v1/routing`
**File**: `apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts`

| Method   | Path                           | Auth          | Description                           | Input DTO                                                                                          | Response Type                      | Error Codes          |
| -------- | ------------------------------ | ------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------- |
| `POST`   | `/routing/policies`            | Authenticated | Create a routing policy               | `CreatePolicyDto` (`createPolicySchema`) -- name, routingMode, priority, config, isActive          | `RoutingPolicy`                    | `POLICY_NAME_EXISTS` |
| `GET`    | `/routing/policies`            | Authenticated | List routing policies                 | `ListPoliciesQueryDto` (`listPoliciesQuerySchema`) -- page, limit                                  | `PaginatedResult<RoutingPolicy>`   | --                   |
| `GET`    | `/routing/policies/:id`        | Authenticated | Get routing policy by ID              | Path: `id` (UUID)                                                                                  | `RoutingPolicy`                    | `POLICY_NOT_FOUND`   |
| `PATCH`  | `/routing/policies/:id`        | Authenticated | Update routing policy                 | `UpdatePolicyDto` (`updatePolicySchema`) -- name?, routingMode?, priority?, config?, isActive?     | `RoutingPolicy`                    | `POLICY_NOT_FOUND`   |
| `DELETE` | `/routing/policies/:id`        | Authenticated | Delete routing policy                 | Path: `id` (UUID)                                                                                  | `RoutingPolicy`                    | `POLICY_NOT_FOUND`   |
| `POST`   | `/routing/evaluate`            | Authenticated | Manually evaluate route for a message | `EvaluateRouteDto` (`evaluateRouteSchema`) -- content, routingMode?, forcedProvider?, forcedModel? | `RoutingDecisionResult`            | `EVALUATION_FAILED`  |
| `GET`    | `/routing/decisions/:threadId` | Authenticated | Get routing decisions for a thread    | Path: `threadId`, Query: `page`, `limit`                                                           | `PaginatedResult<RoutingDecision>` | --                   |

---

## Memory Service Controllers

### MemoryController

**Route Prefix**: `/api/v1/memories`
**File**: `apps/claw-memory-service/src/modules/memory/controllers/memory.controller.ts`

| Method   | Path                   | Auth          | Description                    | Input DTO                                                                                    | Response Type                   | Error Codes                                |
| -------- | ---------------------- | ------------- | ------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| `POST`   | `/memories`            | Authenticated | Create a memory record         | `CreateMemoryDto` (`createMemorySchema`) -- type, content, sourceThreadId?, sourceMessageId? | `MemoryRecord`                  | --                                         |
| `GET`    | `/memories`            | Authenticated | List user's memories           | `ListMemoriesQueryDto` (`listMemoriesQuerySchema`) -- page, limit, type?, search?            | `PaginatedResult<MemoryRecord>` | --                                         |
| `GET`    | `/memories/:id`        | Authenticated | Get memory by ID               | Path: `id` (UUID)                                                                            | `MemoryRecord`                  | `MEMORY_NOT_FOUND`, `MEMORY_ACCESS_DENIED` |
| `PATCH`  | `/memories/:id`        | Authenticated | Update memory content/type     | `UpdateMemoryDto` (`updateMemorySchema`) -- content?, type?                                  | `MemoryRecord`                  | `MEMORY_NOT_FOUND`, `MEMORY_ACCESS_DENIED` |
| `DELETE` | `/memories/:id`        | Authenticated | Delete memory                  | Path: `id` (UUID)                                                                            | `MemoryRecord`                  | `MEMORY_NOT_FOUND`, `MEMORY_ACCESS_DENIED` |
| `PATCH`  | `/memories/:id/toggle` | Authenticated | Toggle memory enabled/disabled | Path: `id` (UUID)                                                                            | `MemoryRecord`                  | `MEMORY_NOT_FOUND`, `MEMORY_ACCESS_DENIED` |

### ContextPacksController

**Route Prefix**: `/api/v1/context-packs`
**File**: `apps/claw-memory-service/src/modules/context-packs/controllers/context-packs.controller.ts`

| Method   | Path                               | Auth          | Description           | Input DTO                                                                                   | Response Type                  | Error Codes                                            |
| -------- | ---------------------------------- | ------------- | --------------------- | ------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| `POST`   | `/context-packs`                   | Authenticated | Create a context pack | `CreateContextPackDto` (`createContextPackSchema`) -- name, description?, scope?            | `ContextPack`                  | --                                                     |
| `GET`    | `/context-packs`                   | Authenticated | List context packs    | Query: `page`, `limit`, `search`                                                            | `PaginatedResult<ContextPack>` | --                                                     |
| `GET`    | `/context-packs/:id`               | Authenticated | Get pack with items   | Path: `id` (UUID)                                                                           | `ContextPackWithItems`         | `CONTEXT_PACK_NOT_FOUND`, `CONTEXT_PACK_ACCESS_DENIED` |
| `PATCH`  | `/context-packs/:id`               | Authenticated | Update pack           | `UpdateContextPackDto` (`updateContextPackSchema`) -- name?, description?, scope?           | `ContextPack`                  | `CONTEXT_PACK_NOT_FOUND`, `CONTEXT_PACK_ACCESS_DENIED` |
| `DELETE` | `/context-packs/:id`               | Authenticated | Delete pack and items | Path: `id` (UUID)                                                                           | `ContextPack`                  | `CONTEXT_PACK_NOT_FOUND`, `CONTEXT_PACK_ACCESS_DENIED` |
| `POST`   | `/context-packs/:id/items`         | Authenticated | Add item to pack      | `AddContextPackItemDto` (`addContextPackItemSchema`) -- type, content?, fileId?, sortOrder? | `ContextPackItem`              | `CONTEXT_PACK_NOT_FOUND`, `CONTEXT_PACK_ACCESS_DENIED` |
| `DELETE` | `/context-packs/:id/items/:itemId` | Authenticated | Remove item from pack | Path: `id`, `itemId` (UUID)                                                                 | `ContextPackItem`              | `CONTEXT_PACK_NOT_FOUND`, `ITEM_NOT_FOUND`             |

### MemoryInternalController

**Route Prefix**: `/api/v1/internal/memories`
**File**: `apps/claw-memory-service/src/modules/memory/controllers/memory-internal.controller.ts`

| Method | Path                             | Auth   | Description                       | Input DTO                                  | Response Type    | Error Codes |
| ------ | -------------------------------- | ------ | --------------------------------- | ------------------------------------------ | ---------------- | ----------- |
| `GET`  | `/internal/memories/for-context` | Public | Get memories for context assembly | Query: `userId` (string), `limit` (string) | `MemoryRecord[]` | --          |

### ContextPacksInternalController

**Route Prefix**: `/api/v1/internal/context-packs`
**File**: `apps/claw-memory-service/src/modules/context-packs/controllers/context-packs-internal.controller.ts`

| Method | Path                                | Auth   | Description                         | Input DTO         | Response Type                  | Error Codes |
| ------ | ----------------------------------- | ------ | ----------------------------------- | ----------------- | ------------------------------ | ----------- |
| `GET`  | `/internal/context-packs/:id/items` | Public | Get pack items for context assembly | Path: `id` (UUID) | `ContextPackWithItems \| null` | --          |

---

## File Service Controllers

### FilesController

**Route Prefix**: `/api/v1/files`
**File**: `apps/claw-file-service/src/modules/files/controllers/files.controller.ts`

| Method   | Path                  | Auth          | Description                    | Input DTO                                                                    | Response Type                | Error Codes                            |
| -------- | --------------------- | ------------- | ------------------------------ | ---------------------------------------------------------------------------- | ---------------------------- | -------------------------------------- |
| `POST`   | `/files/upload`       | Authenticated | Upload a file (base64 content) | `UploadFileDto` (`uploadFileSchema`) -- filename, mimeType, content (base64) | `File`                       | `UPLOAD_FAILED`, `FILE_TOO_LARGE`      |
| `GET`    | `/files`              | Authenticated | List user's files              | `ListFilesQueryDto` (`listFilesQuerySchema`) -- page, limit, search?         | `PaginatedResult<File>`      | --                                     |
| `GET`    | `/files/:id`          | Authenticated | Get file metadata              | Path: `id` (UUID)                                                            | `File`                       | `FILE_NOT_FOUND`, `FILE_ACCESS_DENIED` |
| `DELETE` | `/files/:id`          | Authenticated | Delete file and chunks         | Path: `id` (UUID)                                                            | `File`                       | `FILE_NOT_FOUND`, `FILE_ACCESS_DENIED` |
| `GET`    | `/files/download/:id` | Authenticated | Download file content          | Path: `id` (UUID)                                                            | Binary stream (via `@Res()`) | `FILE_NOT_FOUND`, `FILE_ACCESS_DENIED` |
| `GET`    | `/files/:id/chunks`   | Authenticated | Get file chunks                | Path: `id` (UUID)                                                            | `FileChunk[]`                | `FILE_NOT_FOUND`, `FILE_ACCESS_DENIED` |

### FilesInternalController

**Route Prefix**: `/api/v1/internal/files`
**File**: `apps/claw-file-service/src/modules/files/controllers/files-internal.controller.ts`

| Method | Path                           | Auth   | Description                      | Input DTO                                          | Response Type                         | Error Codes |
| ------ | ------------------------------ | ------ | -------------------------------- | -------------------------------------------------- | ------------------------------------- | ----------- |
| `GET`  | `/internal/files/:id/chunks`   | Public | Get file chunks (inter-service)  | Path: `id` (UUID)                                  | `FileChunk[]`                         | --          |
| `GET`  | `/internal/files/:id/content`  | Public | Get file content (inter-service) | Path: `id` (UUID)                                  | `{ id, filename, mimeType, content }` | --          |
| `GET`  | `/internal/files/download/:id` | Public | Download file (inter-service)    | Path: `id` (UUID)                                  | Binary stream                         | --          |
| `POST` | `/internal/files/store-image`  | Public | Store a generated image          | Body: `{ userId, filename, mimeType, base64Data }` | `{ fileId }`                          | --          |

---

## Audit Service Controllers

### AuditsController

**Route Prefix**: `/api/v1/` (root-level, no prefix)
**File**: `apps/claw-audit-service/src/modules/audits/controllers/audits.controller.ts`

| Method | Path             | Auth          | Description                           | Input DTO                                                                                           | Response Type                  | Error Codes |
| ------ | ---------------- | ------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------ | ----------- |
| `GET`  | `/audits`        | Authenticated | List audit logs                       | `ListAuditsQueryDto` -- page, limit, action?, severity?, entityType?, startDate?, endDate?, search? | `PaginatedResult<AuditLog>`    | --          |
| `GET`  | `/audits/stats`  | Authenticated | Get audit statistics                  | None                                                                                                | `AuditStatsResponse`           | --          |
| `GET`  | `/usage`         | Authenticated | List usage ledger entries             | `ListUsageQueryDto` -- page, limit, provider?, model?, startDate?, endDate?                         | `PaginatedResult<UsageLedger>` | --          |
| `GET`  | `/usage/summary` | Authenticated | Get usage summary                     | None                                                                                                | `UsageSummaryResponse`         | --          |
| `GET`  | `/usage/cost`    | Authenticated | Get cost summary by provider/model    | None                                                                                                | `CostSummaryResult`            | --          |
| `GET`  | `/usage/latency` | Authenticated | Get latency summary by provider/model | None                                                                                                | `LatencySummaryResult`         | --          |

---

## Ollama Service Controllers

### OllamaController

**Route Prefix**: `/api/v1/ollama`
**File**: `apps/claw-ollama-service/src/modules/ollama/ollama.controller.ts`

| Method | Path                  | Auth          | Description                       | Input DTO                                                              | Response Type                 | Error Codes                            |
| ------ | --------------------- | ------------- | --------------------------------- | ---------------------------------------------------------------------- | ----------------------------- | -------------------------------------- |
| `GET`  | `/ollama/models`      | Authenticated | List local Ollama models          | `ListModelsQueryDto` (`listModelsQuerySchema`) -- page, limit, search? | `PaginatedResult<LocalModel>` | --                                     |
| `POST` | `/ollama/pull`        | Authenticated | Pull a model from Ollama registry | `PullModelDto` (`pullModelSchema`) -- name, tag?                       | `LocalModel`                  | `PULL_FAILED`, `MODEL_ALREADY_EXISTS`  |
| `POST` | `/ollama/assign-role` | Authenticated | Assign a role to a local model    | `AssignRoleDto` (`assignRoleSchema`) -- modelId, role, isActive        | `LocalModelRoleAssignment`    | `MODEL_NOT_FOUND`, `INVALID_ROLE`      |
| `POST` | `/ollama/generate`    | Public        | Generate text completion          | `GenerateDto` (`generateSchema`) -- model, prompt, options?            | `GenerateResponse`            | `GENERATION_FAILED`, `MODEL_NOT_FOUND` |
| `GET`  | `/ollama/health`      | Public        | Check Ollama runtime health       | Query: `runtime` (string, default "OLLAMA")                            | `RuntimeHealth`               | --                                     |
| `GET`  | `/ollama/runtimes`    | Authenticated | List configured AI runtimes       | None                                                                   | `RuntimeConfig[]`             | --                                     |

### OllamaInternalController

**Route Prefix**: `/api/v1/internal/ollama`
**File**: `apps/claw-ollama-service/src/modules/ollama/ollama-internal.controller.ts`

| Method | Path                            | Auth   | Description                   | Input DTO | Response Type               | Error Codes |
| ------ | ------------------------------- | ------ | ----------------------------- | --------- | --------------------------- | ----------- |
| `GET`  | `/internal/ollama/router-model` | Public | Get current router model name | None      | `{ model: string \| null }` | --          |

---

## Health Service Controllers

### HealthController

**Route Prefix**: `/api/v1/health`
**File**: `apps/claw-health-service/src/modules/health/controllers/health.controller.ts`

| Method | Path      | Auth   | Description                              | Input DTO | Response Type            | Error Codes |
| ------ | --------- | ------ | ---------------------------------------- | --------- | ------------------------ | ----------- |
| `GET`  | `/health` | Public | Aggregated health status of all services | None      | Aggregated health report | --          |

---

## Client Logs Service Controllers

### ClientLogsController

**Route Prefix**: `/api/v1/client-logs`
**File**: `apps/claw-client-logs-service/src/modules/client-logs/controllers/client-logs.controller.ts`

| Method | Path                 | Auth            | Description               | Input DTO                                                                                                          | Response Type                   | Error Codes |
| ------ | -------------------- | --------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ----------- |
| `POST` | `/client-logs`       | Public          | Ingest a client log entry | `CreateClientLogDto` (`createClientLogSchema`) -- level, message, component?, action?, userId?, route?, userAgent? | `CreateClientLogResponse` (201) | --          |
| `GET`  | `/client-logs`       | ADMIN, OPERATOR | Search/list client logs   | `SearchClientLogsDto` (`searchClientLogsSchema`) -- page, limit, level?, component?, search?, startDate?, endDate? | `PaginatedResult<ClientLog>`    | --          |
| `GET`  | `/client-logs/stats` | ADMIN, OPERATOR | Get client log statistics | None                                                                                                               | `ClientLogStatsResponse`        | --          |

---

## Server Logs Service Controllers

### ServerLogsController

**Route Prefix**: `/api/v1/server-logs`
**File**: `apps/claw-server-logs-service/src/modules/server-logs/controllers/server-logs.controller.ts`

| Method | Path                 | Auth          | Description                        | Input DTO                                                                                                                                                                                                      | Response Type                   | Error Codes |
| ------ | -------------------- | ------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------- |
| `POST` | `/server-logs`       | Public        | Create a single server log entry   | `CreateServerLogDto` (`createServerLogSchema`) -- level, message, serviceName, module?, controller?, action?, requestId?, traceId?, userId?, model?                                                            | `CreateServerLogResponse`       | --          |
| `POST` | `/server-logs/batch` | Public        | Create batch of server log entries | `BatchCreateServerLogsDto` (`batchCreateServerLogsSchema`) -- entries: CreateServerLogDto[]                                                                                                                    | `BatchCreateServerLogsResponse` | --          |
| `GET`  | `/server-logs`       | Authenticated | Search/list server logs            | `ListServerLogsQueryDto` (`listServerLogsQuerySchema`) -- page, limit, level?, serviceName?, module?, controller?, action?, requestId?, traceId?, userId?, threadId?, provider?, search?, startDate?, endDate? | `PaginatedResult<ServerLog>`    | --          |
| `GET`  | `/server-logs/stats` | Authenticated | Get server log statistics          | None                                                                                                                                                                                                           | `ServerLogStatsResponse`        | --          |

---

## Image Service Controllers

### ImageGenerationController

**Route Prefix**: `/api/v1/images`
**File**: `apps/claw-image-service/src/modules/image-generation/controllers/image-generation.controller.ts`

| Method | Path                          | Auth          | Description                          | Input DTO                                                              | Response Type                               | Error Codes                              |
| ------ | ----------------------------- | ------------- | ------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| `GET`  | `/images`                     | Authenticated | List user's image generations        | `ListImagesQueryDto` (`listImagesQuerySchema`) -- page, limit, status? | Paginated image generations                 | --                                       |
| `GET`  | `/images/:id`                 | Authenticated | Get image generation by ID           | Path: `id` (UUID)                                                      | Image generation record                     | `IMAGE_NOT_FOUND`, `IMAGE_ACCESS_DENIED` |
| `POST` | `/images/:id/retry`           | Authenticated | Retry a failed image generation      | Path: `id` (UUID)                                                      | `{ generationId, status }`                  | `IMAGE_NOT_FOUND`                        |
| `POST` | `/images/:id/retry-alternate` | Authenticated | Retry with alternate provider/model  | Path: `id` (UUID), Body: `{ provider?, model? }`                       | `{ generationId, status, provider, model }` | `IMAGE_NOT_FOUND`                        |
| `SSE`  | `/images/:id/events`          | Public        | Real-time generation progress stream | Path: `id` (UUID)                                                      | `Observable<MessageEvent>`                  | --                                       |

### InternalImageController

**Route Prefix**: `/api/v1/internal/images`
**File**: `apps/claw-image-service/src/modules/image-generation/controllers/internal-image.controller.ts`

| Method | Path                                             | Auth   | Description                              | Input DTO                                                                                        | Response Type                               | Error Codes |
| ------ | ------------------------------------------------ | ------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------- | ----------- |
| `POST` | `/internal/images/generate`                      | Public | Enqueue image generation (inter-service) | `GenerateImageDto` (`generateImageSchema`) -- prompt, userId, provider?, model?, size?, quality? | `{ generationId, status, provider, model }` | --          |
| `GET`  | `/internal/images/:generationId`                 | Public | Get generation status                    | Path: `generationId` (UUID)                                                                      | Image generation record                     | --          |
| `POST` | `/internal/images/:generationId/retry`           | Public | Retry generation                         | Path: `generationId` (UUID)                                                                      | `{ generationId, status }`                  | --          |
| `POST` | `/internal/images/:generationId/retry-alternate` | Public | Retry with alternate provider            | Path: `generationId`, Body: `{ provider?, model? }`                                              | `{ generationId, status, provider, model }` | --          |
| `SSE`  | `/internal/images/:generationId/events`          | Public | Generation progress stream               | Path: `generationId` (UUID)                                                                      | `Observable<MessageEvent>`                  | --          |

---

## File Generation Service Controllers

### FileGenerationController

**Route Prefix**: `/api/v1/file-generations`
**File**: `apps/claw-file-generation-service/src/modules/file-generation/controllers/file-generation.controller.ts`

| Method | Path                           | Auth          | Description                          | Input DTO                                                                                         | Response Type              | Error Codes                                  |
| ------ | ------------------------------ | ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------- |
| `GET`  | `/file-generations`            | Authenticated | List user's file generations         | `ListFileGenerationsQueryDto` (`listFileGenerationsQuerySchema`) -- page, limit, status?, format? | Paginated file generations | --                                           |
| `GET`  | `/file-generations/:id`        | Authenticated | Get file generation by ID            | Path: `id` (UUID)                                                                                 | File generation record     | `FILE_GENERATION_NOT_FOUND`, `ACCESS_DENIED` |
| `POST` | `/file-generations/:id/retry`  | Authenticated | Retry a failed file generation       | Path: `id` (UUID)                                                                                 | `{ generationId, status }` | `FILE_GENERATION_NOT_FOUND`                  |
| `SSE`  | `/file-generations/:id/events` | Public        | Real-time generation progress stream | Path: `id` (UUID)                                                                                 | `Observable<MessageEvent>` | --                                           |

### InternalFileGenerationController

**Route Prefix**: `/api/v1/internal/file-generations`
**File**: `apps/claw-file-generation-service/src/modules/file-generation/controllers/internal-file-generation.controller.ts`

| Method | Path                                              | Auth   | Description                             | Input DTO                                                                      | Response Type                      | Error Codes |
| ------ | ------------------------------------------------- | ------ | --------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------- | ----------- |
| `POST` | `/internal/file-generations/generate`             | Public | Enqueue file generation (inter-service) | `GenerateFileDto` (`generateFileSchema`) -- content, format, userId, filename? | `{ generationId, status, format }` | --          |
| `GET`  | `/internal/file-generations/:generationId`        | Public | Get generation status                   | Path: `generationId` (UUID)                                                    | File generation record             | --          |
| `POST` | `/internal/file-generations/:generationId/retry`  | Public | Retry generation                        | Path: `generationId` (UUID)                                                    | `{ generationId, status }`         | --          |
| `SSE`  | `/internal/file-generations/:generationId/events` | Public | Generation progress stream              | Path: `generationId` (UUID)                                                    | `Observable<MessageEvent>`         | --          |

---

## Cross-Cutting Patterns

### Authentication Levels

| Level               | Description                            | Decorator                                   | Used By                                                                |
| ------------------- | -------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| **Public**          | No authentication required             | `@Public()`                                 | Login, refresh, health, internal endpoints, log ingestion, SSE streams |
| **Authenticated**   | Valid JWT access token required        | Default (AuthGuard)                         | Most CRUD endpoints                                                    |
| **ADMIN**           | Authenticated + ADMIN role             | `@Roles(UserRole.ADMIN)`                    | User management, some admin routes                                     |
| **ADMIN, OPERATOR** | Authenticated + ADMIN or OPERATOR role | `@Roles(UserRole.ADMIN, UserRole.OPERATOR)` | Log viewing, stats                                                     |

### Standard Pagination

All list endpoints follow the same pagination pattern:

- **Input**: `page` (default: 1), `limit` (default: 20, max: 100)
- **Output**: `PaginatedResult<T>` with `{ data: T[], meta: { total, page, limit, totalPages } }`

### Validation Pattern

All input validation uses Zod schemas applied via `ZodValidationPipe`:

```
@Body(new ZodValidationPipe(schema)) dto: DtoType
@Query(new ZodValidationPipe(schema)) query: QueryType
@UsePipes(new ZodValidationPipe(schema)) -- applied at method level
```

### Internal vs. Public Controllers

- **Public controllers** require authentication (default) and serve the frontend
- **Internal controllers** are marked `@Public()` and serve inter-service communication
- Internal controllers use the `/internal/` path prefix convention
- Internal endpoints should never be exposed through Nginx to external clients

### Error Response Format

All errors return a consistent JSON format via `GlobalExceptionFilter`:

```json
{
  "statusCode": 404,
  "message": "Entity not found",
  "code": "ENTITY_NOT_FOUND",
  "timestamp": "2026-04-09T12:00:00.000Z",
  "path": "/api/v1/memories/abc-123"
}
```
