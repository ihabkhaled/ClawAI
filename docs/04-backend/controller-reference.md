# Controller Reference

Complete reference for every controller across all 13 ClawAI services.

---

## Architecture Rules

- Controllers have **3-line methods only**: extract params, call ONE service method, return result.
- NO try/catch, NO throw, NO business logic in controllers.
- All validation handled by `ZodValidationPipe` in parameter decorators.
- Authentication enforced globally via `AuthGuard` (JWT Bearer token).
- Public endpoints marked with `@Public()` decorator.
- Role-based access via `@Roles(UserRole.ADMIN)` decorator.
- Current user extracted via `@CurrentUser()` decorator.

---

## Auth Service (Port 4001)

### AuthController — `/api/v1/auth`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/auth/login` | Public | Authenticate user | `{ email, password }` | `LoginResult` (accessToken, refreshToken, user) |
| POST | `/auth/refresh` | Public | Refresh JWT tokens | `{ refreshToken }` | `RefreshResult` (accessToken, refreshToken) |
| POST | `/auth/logout` | Bearer | Invalidate sessions | None | 204 No Content |
| GET | `/auth/me` | Bearer | Get current user profile | None | `UserProfile` |

### UsersController — `/api/v1/users`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/users` | ADMIN | Create user | `CreateUserDto` | `SafeUser` |
| GET | `/users` | ADMIN | List users (paginated) | Query: page, limit, search, role, status | `PaginatedResult<SafeUser>` |
| GET | `/users/:id` | ADMIN | Get user by ID | None | `SafeUser` |
| PATCH | `/users/:id` | ADMIN | Update user | `UpdateUserDto` | `SafeUser` |
| DELETE | `/users/:id` | ADMIN | Deactivate user | None | `SafeUser` |
| PATCH | `/users/:id/reactivate` | ADMIN | Reactivate user | None | `SafeUser` |
| PATCH | `/users/:id/role` | ADMIN | Change user role | `{ role }` | `SafeUser` |
| PATCH | `/users/me/preferences` | Bearer | Update own preferences | `UpdatePreferencesDto` | `SafeUser` |
| PATCH | `/users/me/password` | Bearer | Change own password | `ChangePasswordDto` | 204 No Content |

---

## Chat Service (Port 4002)

### ChatThreadsController — `/api/v1/chat-threads`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/chat-threads` | Bearer | Create thread | `CreateThreadDto` | `ChatThread` |
| GET | `/chat-threads` | Bearer | List user's threads | Query: page, limit, search | `PaginatedResult<ThreadWithMessageCount>` |
| GET | `/chat-threads/:id` | Bearer | Get thread by ID | None | `ChatThread` |
| PATCH | `/chat-threads/:id` | Bearer | Update thread | `UpdateThreadDto` | `ChatThread` |
| DELETE | `/chat-threads/:id` | Bearer | Delete thread | None | `ChatThread` |

### ChatMessagesController — `/api/v1/chat-messages`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/chat-messages` | Bearer | Send message | `CreateMessageDto` | `ChatMessage` |
| GET | `/chat-messages/thread/:threadId` | Bearer | List messages in thread | Query: page, limit | `PaginatedResult<ChatMessage>` |
| GET | `/chat-messages/:id` | Bearer | Get message by ID | None | `ChatMessage` |
| POST | `/chat-messages/:id/regenerate` | Bearer | Regenerate AI response | None | `ChatMessage` |
| PATCH | `/chat-messages/:id/feedback` | Bearer | Set feedback on message | `{ feedback }` | `ChatMessage` |

### ChatStreamController — `/api/v1/chat-messages` (SSE)

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| SSE | `/chat-messages/stream/:threadId` | Bearer | Real-time message events | `Observable<MessageEvent>` |

Decorators: `@SkipLogging()`, `@SkipThrottle()` (required for SSE).

---

## Connector Service (Port 4003)

### ConnectorsController — `/api/v1/connectors`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/connectors` | Bearer | Create connector | `CreateConnectorDto` | `ConnectorWithModels` |
| GET | `/connectors` | Bearer | List connectors | Query: page, limit, provider, status | `PaginatedResult<ConnectorWithModels>` |
| GET | `/connectors/:id` | Bearer | Get connector | None | `ConnectorWithModels` |
| PATCH | `/connectors/:id` | Bearer | Update connector | `UpdateConnectorDto` | `ConnectorWithModels` |
| DELETE | `/connectors/:id` | Bearer | Delete connector | None | `ConnectorWithModels` |
| POST | `/connectors/:id/test` | Bearer | Test connector health | None | `HealthCheckResult` |
| POST | `/connectors/:id/sync` | Bearer | Sync models from provider | None | `SyncModelsResult` |
| GET | `/connectors/:id/models` | Bearer | Get connector's models | None | `ConnectorModel[]` |

### ConnectorsInternalController — `/api/v1/internal/connectors`

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | `/internal/connectors/config?provider=X` | Public (internal) | Get decrypted connector config | `ConnectorConfigResult` |

---

## Routing Service (Port 4004)

### RoutingController — `/api/v1/routing`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/routing/policies` | Bearer | Create routing policy | `CreatePolicyDto` | `RoutingPolicy` |
| GET | `/routing/policies` | Bearer | List policies | Query: page, limit, routingMode, isActive | `PaginatedResult<RoutingPolicy>` |
| GET | `/routing/policies/:id` | Bearer | Get policy | None | `RoutingPolicy` |
| PATCH | `/routing/policies/:id` | Bearer | Update policy | `UpdatePolicyDto` | `RoutingPolicy` |
| DELETE | `/routing/policies/:id` | Bearer | Delete policy | None | `RoutingPolicy` |
| POST | `/routing/evaluate` | Bearer | Evaluate routing for a message | `EvaluateRouteDto` | `RoutingDecisionResult` |
| GET | `/routing/decisions/:threadId` | Bearer | Get decisions for thread | Query: page, limit | `PaginatedResult<RoutingDecision>` |

---

## Memory Service (Port 4005)

### MemoryController — `/api/v1/memories`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/memories` | Bearer | Create memory | `CreateMemoryDto` | `MemoryRecord` |
| GET | `/memories` | Bearer | List user's memories | Query: page, limit, type, search | `PaginatedResult<MemoryRecord>` |
| GET | `/memories/:id` | Bearer | Get memory | None | `MemoryRecord` |
| PATCH | `/memories/:id` | Bearer | Update memory | `UpdateMemoryDto` | `MemoryRecord` |
| DELETE | `/memories/:id` | Bearer | Delete memory | None | `MemoryRecord` |
| PATCH | `/memories/:id/toggle` | Bearer | Toggle memory enabled/disabled | None | `MemoryRecord` |

### MemoryInternalController — `/api/v1/internal/memories`

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | `/internal/memories/for-context?userId=X&limit=N` | Public (internal) | Get memories for context assembly | `MemoryRecord[]` |

### ContextPacksController — `/api/v1/context-packs`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/context-packs` | Bearer | Create context pack | `CreateContextPackDto` | `ContextPack` |
| GET | `/context-packs` | Bearer | List user's packs | Query: page, limit, search | `PaginatedResult<ContextPack>` |
| GET | `/context-packs/:id` | Bearer | Get pack with items | None | `ContextPackWithItems` |
| PATCH | `/context-packs/:id` | Bearer | Update pack | `UpdateContextPackDto` | `ContextPack` |
| DELETE | `/context-packs/:id` | Bearer | Delete pack | None | `ContextPack` |
| POST | `/context-packs/:id/items` | Bearer | Add item to pack | `AddContextPackItemDto` | `ContextPackItem` |
| DELETE | `/context-packs/:id/items/:itemId` | Bearer | Remove item from pack | None | `ContextPackItem` |

### ContextPacksInternalController — `/api/v1/internal/context-packs`

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | `/internal/context-packs/:id/items` | Public (internal) | Get pack items for context assembly | `ContextPackWithItems` |

---

## File Service (Port 4006)

### FilesController — `/api/v1/files`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/files/upload` | Bearer | Upload file | `UploadFileDto` | `File` |
| GET | `/files` | Bearer | List user's files | Query: page, limit, search | `PaginatedResult<File>` |
| GET | `/files/:id` | Bearer | Get file metadata | None | `File` |
| DELETE | `/files/:id` | Bearer | Delete file | None | `File` |
| GET | `/files/download/:id` | Bearer | Download file content | None | Binary stream |
| GET | `/files/:id/chunks` | Bearer | Get file chunks | None | `FileChunk[]` |

### FilesInternalController — `/api/v1/internal/files`

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | `/internal/files/:id/chunks` | Public (internal) | Get file chunks | `FileChunk[]` |
| GET | `/internal/files/:id/content` | Public (internal) | Get file content | `{ id, filename, mimeType, content }` |
| GET | `/internal/files/download/:id` | Public (internal) | Public download | Binary stream |
| POST | `/internal/files/store-image` | Public (internal) | Store image from base64 | `{ fileId }` |

---

## Audit Service (Port 4007)

### AuditsController — `/api/v1/`

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | `/audits` | Bearer | List audit logs | `PaginatedResult<AuditLog>` |
| GET | `/audits/stats` | Bearer | Get audit statistics | `AuditStatsResponse` |
| GET | `/usage` | Bearer | List usage entries | `PaginatedResult<UsageLedger>` |
| GET | `/usage/summary` | Bearer | Get usage summary | `UsageSummaryResponse` |
| GET | `/usage/cost` | Bearer | Get cost summary | `CostSummaryResult` |
| GET | `/usage/latency` | Bearer | Get latency summary | `LatencySummaryResult` |

Query parameters for `/audits`: page, limit, action, severity, entityType, startDate, endDate, search.
Query parameters for `/usage`: page, limit, provider, model, startDate, endDate.

---

## Ollama Service (Port 4008)

### OllamaController — `/api/v1/ollama`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| GET | `/ollama/models` | Bearer | List installed models | Query: page, limit, runtime, category | `PaginatedResult<LocalModel>` |
| GET | `/ollama/catalog` | Bearer | Browse model catalog | Query: page, limit, category, runtime, search | `PaginatedResult<CatalogEntryWithInstallStatus>` |
| GET | `/ollama/catalog/:id` | Bearer | Get catalog entry | None | `CatalogEntryWithInstallStatus` |
| POST | `/ollama/catalog/:id/pull` | Bearer | Pull model from catalog | None | `{ pullJobId }` |
| GET | `/ollama/pull-jobs` | Bearer | List active pull jobs | None | `PullJob[]` |
| SSE | `/ollama/pull-jobs/:id/progress` | Bearer | Stream pull progress | None | `Observable<MessageEvent>` |
| DELETE | `/ollama/pull-jobs/:id` | Bearer | Cancel pull job | None | `PullJob` |
| POST | `/ollama/pull` | Bearer | Pull model by name | `PullModelDto` | `LocalModel` |
| POST | `/ollama/assign-role` | Bearer | Assign role to model | `AssignRoleDto` | `LocalModelRoleAssignment` |
| POST | `/ollama/generate` | Public | Generate text | `GenerateDto` | `GenerateResponse` |
| GET | `/ollama/health` | Public | Check runtime health | Query: runtime | `RuntimeHealth` |
| GET | `/ollama/runtimes` | Bearer | List runtime configs | None | `RuntimeConfig[]` |

### OllamaInternalController — `/api/v1/internal/ollama`

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | `/internal/ollama/router-model` | Public (internal) | Get current router model | `{ model }` |
| GET | `/internal/ollama/installed-models` | Public (internal) | Get installed models with details | `InstalledModelsApiResponse` |

---

## Health Service (Port 4009)

### HealthController — `/api/v1/health`

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | `/health` | Public | Aggregated health check | `AggregatedHealth` |

Checks all 12 services: auth, chat, connector, routing, memory, file, audit, ollama, client-logs, server-logs, image, file-generation.

---

## Client Logs Service (Port 4010)

### ClientLogsController — `/api/v1/client-logs`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/client-logs` | Public | Create client log | `CreateClientLogDto` | `CreateClientLogResponse` |
| GET | `/client-logs` | ADMIN/OPERATOR | Search client logs | Query: page, limit, level, component, userId, search | `PaginatedResult<ClientLog>` |
| GET | `/client-logs/stats` | ADMIN/OPERATOR | Get log statistics | None | `ClientLogStatsResponse` |

---

## Server Logs Service (Port 4011)

### ServerLogsController — `/api/v1/server-logs`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/server-logs` | Public | Create server log | `CreateServerLogDto` | `CreateServerLogResponse` |
| POST | `/server-logs/batch` | Public | Create batch of logs | `BatchCreateServerLogsDto` | `BatchCreateServerLogsResponse` |
| GET | `/server-logs` | Bearer | List server logs | Query: page, limit, level, serviceName, module, controller, action, requestId, traceId, userId, threadId, provider, search, startDate, endDate | `PaginatedResult<ServerLog>` |
| GET | `/server-logs/stats` | Bearer | Get log statistics | None | `ServerLogStatsResponse` |

---

## Image Service (Port 4012)

### ImageGenerationController — `/api/v1/images`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| GET | `/images` | Bearer | List user's generations | Query: page, limit, status | Paginated list |
| GET | `/images/:id` | Bearer | Get generation details | None | Generation with assets |
| POST | `/images/:id/retry` | Bearer | Retry failed generation | None | `{ generationId, status }` |
| POST | `/images/:id/retry-alternate` | Bearer | Retry with different model | `{ provider?, model? }` | `{ generationId, status, provider, model }` |
| SSE | `/images/:id/events` | Public | Stream generation events | None | `Observable<MessageEvent>` |

### InternalImageController — `/api/v1/internal/images`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/internal/images/generate` | Public (internal) | Enqueue generation | `GenerateImageDto` | `{ generationId, status, provider, model }` |
| GET | `/internal/images/:generationId` | Public (internal) | Get generation | None | Generation record |
| POST | `/internal/images/:generationId/retry` | Public (internal) | Retry generation | None | `{ generationId, status }` |
| POST | `/internal/images/:generationId/retry-alternate` | Public (internal) | Retry with alt model | `{ provider?, model? }` | `{ generationId, status, provider, model }` |
| SSE | `/internal/images/:generationId/events` | Public (internal) | Stream events | None | `Observable<MessageEvent>` |

---

## File Generation Service (Port 4013)

### FileGenerationController — `/api/v1/file-generations`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| GET | `/file-generations` | Bearer | List user's generations | Query: page, limit, status, format | Paginated list |
| GET | `/file-generations/:id` | Bearer | Get generation details | None | Generation with assets |
| POST | `/file-generations/:id/retry` | Bearer | Retry failed generation | None | `{ generationId, status }` |
| SSE | `/file-generations/:id/events` | Public | Stream generation events | None | `Observable<MessageEvent>` |

### InternalFileGenerationController — `/api/v1/internal/file-generations`

| Method | Endpoint | Auth | Description | Request Body | Response |
|--------|----------|------|-------------|-------------|----------|
| POST | `/internal/file-generations/generate` | Public (internal) | Enqueue generation | `GenerateFileDto` | `{ generationId, status, format }` |
| GET | `/internal/file-generations/:generationId` | Public (internal) | Get generation | None | Generation record |
| POST | `/internal/file-generations/:generationId/retry` | Public (internal) | Retry generation | None | `{ generationId, status }` |
| SSE | `/internal/file-generations/:generationId/events` | Public (internal) | Stream events | None | `Observable<MessageEvent>` |

---

## Health Controllers (All Services)

Every service except health-service itself has a `HealthController` at `/api/v1/health`:

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | `/health` | Public | Service health status | `{ status: "ok" }` |

These are hit by the Health Service's aggregated check.

---

## Internal vs Public Endpoints

- **Public endpoints** (`@Public()`): No JWT required. Used for login, health checks, inter-service communication.
- **Internal endpoints** (`/internal/*`): Marked `@Public()` but intended only for service-to-service calls within Docker network. Not exposed through nginx.
- **Bearer endpoints**: Require valid JWT access token in `Authorization: Bearer <token>` header.
- **Role-restricted endpoints** (`@Roles(UserRole.ADMIN)`): Require specific role in addition to valid JWT.
