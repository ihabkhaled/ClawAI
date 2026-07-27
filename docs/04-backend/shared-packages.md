# Shared Packages Reference

Reference for the shared npm workspace packages used across the ClawAI backend services.

---

## Table of Contents

1. [shared-types](#shared-types)
2. [shared-constants](#shared-constants)
3. [shared-rabbitmq](#shared-rabbitmq)
4. [shared-auth](#shared-auth)
5. [shared-utilities](#shared-utilities) — added 2026-04-26

---

## shared-types

**Package**: `@claw/shared-types`
**Path**: `packages/shared-types/`
**Purpose**: Central type definitions shared across all backend services. Contains enums, event payloads, and authentication types.

### Enums

All domain enums are defined here and imported by every service. Using raw string literals or service-local enums for these values is forbidden.

| Enum                                  | Values                                                                                                                                 | Used By                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `UserRole`                            | `ADMIN`, `OPERATOR`, `VIEWER`                                                                                                          | Auth, all services via AuthGuard |
| `UserStatus`                          | `ACTIVE`, `INACTIVE`                                                                                                                   | Auth                             |
| `UserLanguagePreference`              | `EN`, `AR`, `DE`, `ES`, `FR`, `IT`, `PT`, `RU`                                                                                         | Auth                             |
| `UserAppearancePreference`            | `LIGHT`, `DARK`, `SYSTEM`                                                                                                              | Auth                             |
| `ConnectorProvider`                   | `OPENAI`, `ANTHROPIC`, `GOOGLE`, `DEEPSEEK`, `XAI`, `LOCAL_OLLAMA`                                                                     | Connector, Chat, Routing         |
| `ConnectorStatus`                     | `ACTIVE`, `INACTIVE`, `ERROR`                                                                                                          | Connector, Routing               |
| `ConnectorAuthType`                   | `API_KEY`, `OAUTH`, `NONE`                                                                                                             | Connector                        |
| `ModelLifecycle`                      | `ACTIVE`, `DEPRECATED`, `PREVIEW`                                                                                                      | Connector                        |
| `RoutingMode`                         | `AUTO`, `MANUAL_MODEL`, `LOCAL_ONLY`, `PRIVACY_FIRST`, `LOW_LATENCY`, `HIGH_REASONING`, `COST_SAVER`                                   | Routing, Chat                    |
| `MessageRole`                         | `USER`, `ASSISTANT`, `SYSTEM`                                                                                                          | Chat                             |
| `MemoryType`                          | `FACT`, `PREFERENCE`, `INSTRUCTION`, `SUMMARY`                                                                                         | Memory                           |
| `FileIngestionStatus`                 | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`                                                                                         | File                             |
| `AuditAction`                         | `LOGIN`, `LOGOUT`, `CREATE`, `UPDATE`, `DELETE`, `ACCESS`, `EXPORT`, `IMPORT`, `SETTINGS_CHANGE`, `CONNECTOR_SYNC`, `ROUTING_DECISION` | Audit                            |
| `AuditSeverity`                       | `INFO`, `WARNING`, `CRITICAL`                                                                                                          | Audit                            |
| `LocalModelRole`                      | `ROUTER`, `FALLBACK_CHAT`, `REASONING`, `CODING`                                                                                       | Ollama                           |
| `HealthCheckStatus` / `ServiceStatus` | Health check status values                                                                                                             | Health                           |
| `LogLevel`                            | `DEBUG`, `INFO`, `WARN`, `ERROR`                                                                                                       | All services                     |

### Event Patterns

The `EventPattern` enum defines all RabbitMQ routing keys used across the event bus:

```typescript
enum EventPattern {
  // User events
  USER_CREATED           = 'user.created'
  USER_LOGIN             = 'user.login'
  USER_LOGOUT            = 'user.logout'
  USER_ROLE_CHANGED      = 'user.role_changed'
  USER_DEACTIVATED       = 'user.deactivated'

  // Message events
  MESSAGE_CREATED        = 'message.created'
  MESSAGE_ROUTED         = 'message.routed'
  MESSAGE_COMPLETED      = 'message.completed'

  // Connector events
  CONNECTOR_CREATED      = 'connector.created'
  CONNECTOR_UPDATED      = 'connector.updated'
  CONNECTOR_DELETED      = 'connector.deleted'
  CONNECTOR_SYNCED       = 'connector.synced'
  CONNECTOR_HEALTH_CHECKED = 'connector.health_checked'

  // Routing events
  ROUTING_DECISION_MADE  = 'routing.decision_made'

  // File events
  FILE_UPLOADED          = 'file.uploaded'
  FILE_CHUNKED           = 'file.chunked'

  // Memory events
  MEMORY_EXTRACTED       = 'memory.extracted'

  // System events
  AUDIT_EVENT            = 'audit.event'
  HEALTH_CHECK           = 'health.check'
  LOG_SERVER             = 'log.server'

  // Image events
  IMAGE_GENERATED        = 'image.generated'
  IMAGE_FAILED           = 'image.failed'
}
```

### Event Payloads

Type-safe payload interfaces for every event. All extend `BaseEventPayload`:

```typescript
interface BaseEventPayload {
  timestamp: string;
  correlationId?: string;
}
```

| Payload Type                    | Event Pattern              | Key Fields                                                                                                                                                                                       |
| ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `UserCreatedPayload`            | `user.created`             | userId, email, role                                                                                                                                                                              |
| `UserLoginPayload`              | `user.login`               | userId, email, ipAddress?, userAgent?                                                                                                                                                            |
| `UserLogoutPayload`             | `user.logout`              | userId                                                                                                                                                                                           |
| `UserRoleChangedPayload`        | `user.role_changed`        | userId, previousRole, newRole, changedBy                                                                                                                                                         |
| `UserDeactivatedPayload`        | `user.deactivated`         | userId, deactivatedBy                                                                                                                                                                            |
| `MessageCreatedPayload`         | `message.created`          | messageId, threadId, userId, content, routingMode?, forcedProvider?, forcedModel?                                                                                                                |
| `MessageRoutedPayload`          | `message.routed`           | messageId, threadId, selectedProvider, selectedModel, routingMode, fallbackProvider?, fallbackModel?                                                                                             |
| `MessageCompletedPayload`       | `message.completed`        | messageId, threadId, assistantMessageId, provider, model, inputTokens?, outputTokens?, latencyMs                                                                                                 |
| `ConnectorCreatedPayload`       | `connector.created`        | connectorId, provider, name, userId                                                                                                                                                              |
| `ConnectorUpdatedPayload`       | `connector.updated`        | connectorId, provider, changes                                                                                                                                                                   |
| `ConnectorDeletedPayload`       | `connector.deleted`        | connectorId, provider                                                                                                                                                                            |
| `ConnectorSyncedPayload`        | `connector.synced`         | connectorId, provider, modelsDiscovered                                                                                                                                                          |
| `ConnectorHealthCheckedPayload` | `connector.health_checked` | connectorId, provider, status, latencyMs?                                                                                                                                                        |
| `RoutingDecisionMadePayload`    | `routing.decision_made`    | messageId, threadId, routingMode, selectedConnectorId, selectedModelId, reason, candidateCount                                                                                                   |
| `FileUploadedPayload`           | `file.uploaded`            | fileId, threadId, userId, fileName, mimeType, sizeBytes                                                                                                                                          |
| `FileChunkedPayload`            | `file.chunked`             | fileId, chunkCount, status                                                                                                                                                                       |
| `MemoryExtractedPayload`        | `memory.extracted`         | memoryId, threadId, userId, type, content                                                                                                                                                        |
| `AuditEventPayload`             | `audit.event`              | userId, action, severity, resource, resourceId?, details?                                                                                                                                        |
| `HealthCheckPayload`            | `health.check`             | serviceName, status, details?                                                                                                                                                                    |
| `ServerLogPayload`              | `log.server`               | level, message, serviceName, module?, controller?, service?, action?, requestId?, traceId?, userId?, threadId?, messageId?, connectorId?, provider?, model?, latencyMs?, error fields, metadata? |

The union type `EventPayload` combines all payload types for generic handler signatures.

### Authentication Types

| Type                   | Fields                                                   | Purpose                                  |
| ---------------------- | -------------------------------------------------------- | ---------------------------------------- |
| `JwtPayload`           | sub (userId), email, role, iat?, exp?                    | JWT token payload structure              |
| `AuthenticatedUser`    | id, email, role                                          | Extracted user info attached to requests |
| `AuthenticatedRequest` | Extends Express `Request` with `user: AuthenticatedUser` | Typed request object                     |
| `PaginationParams`     | page, limit                                              | Standard pagination input                |
| `PaginatedResult<T>`   | data: T[], meta: { total, page, limit, totalPages }      | Standard pagination output               |

### Usage

```typescript
import {
  UserRole,
  RoutingMode,
  EventPattern,
  type MessageCreatedPayload,
  type AuthenticatedUser,
  type PaginatedResult,
} from '@claw/shared-types';
```

---

## shared-constants

**Package**: `@claw/shared-constants`
**Path**: `packages/shared-constants/`
**Purpose**: Shared constant values used across services. Prevents magic numbers and strings.

### RabbitMQ Constants

| Constant                | Value           | Description                        |
| ----------------------- | --------------- | ---------------------------------- |
| `EXCHANGE_NAME`         | `'claw.events'` | Topic exchange name for all events |
| `RABBITMQ_QUEUE_PREFIX` | `'claw'`        | Prefix for queue names             |

Queue naming convention: `{prefix}.{serviceName}.{eventPattern}` (e.g., `claw.audit-service.message.completed`)

### Service Ports

| Constant                 | Value  | Service   |
| ------------------------ | ------ | --------- |
| `AUTH_SERVICE_PORT`      | `4001` | Auth      |
| `CHAT_SERVICE_PORT`      | `4002` | Chat      |
| `CONNECTOR_SERVICE_PORT` | `4003` | Connector |
| `ROUTING_SERVICE_PORT`   | `4004` | Routing   |
| `MEMORY_SERVICE_PORT`    | `4005` | Memory    |
| `FILE_SERVICE_PORT`      | `4006` | File      |
| `AUDIT_SERVICE_PORT`     | `4007` | Audit     |
| `OLLAMA_SERVICE_PORT`    | `4008` | Ollama    |
| `HEALTH_SERVICE_PORT`    | `4009` | Health    |
| `IMAGE_SERVICE_PORT`     | `4012` | Image     |

Note: Client Logs (4010), Server Logs (4011), and File Generation (4013) ports are defined in their respective service configs.

### Service Names

| Constant            | Value                 |
| ------------------- | --------------------- |
| `AUTH_SERVICE`      | `'auth-service'`      |
| `CHAT_SERVICE`      | `'chat-service'`      |
| `CONNECTOR_SERVICE` | `'connector-service'` |
| `ROUTING_SERVICE`   | `'routing-service'`   |
| `MEMORY_SERVICE`    | `'memory-service'`    |
| `FILE_SERVICE`      | `'file-service'`      |
| `AUDIT_SERVICE`     | `'audit-service'`     |
| `OLLAMA_SERVICE`    | `'ollama-service'`    |
| `HEALTH_SERVICE`    | `'health-service'`    |
| `IMAGE_SERVICE`     | `'image-service'`     |

### API Constants

| Constant     | Value      | Description                          |
| ------------ | ---------- | ------------------------------------ |
| `API_PREFIX` | `'api/v1'` | Global route prefix for all services |

### Pagination Defaults

| Constant            | Value | Description            |
| ------------------- | ----- | ---------------------- |
| `DEFAULT_PAGE`      | `1`   | Default page number    |
| `DEFAULT_PAGE_SIZE` | `20`  | Default items per page |
| `MAX_PAGE_SIZE`     | `100` | Maximum items per page |

### Usage

```typescript
import {
  EXCHANGE_NAME,
  API_PREFIX,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  AUTH_SERVICE_PORT,
} from '@claw/shared-constants';
```

---

## shared-rabbitmq

**Package**: `@claw/shared-rabbitmq`
**Path**: `packages/shared-rabbitmq/`
**Purpose**: RabbitMQ client module with publish/subscribe, automatic retry with exponential backoff, dead-letter queues, and structured logging.

### Exports

| Export             | Type               | Description                                     |
| ------------------ | ------------------ | ----------------------------------------------- |
| `RabbitMQModule`   | NestJS Module      | Global dynamic module for RabbitMQ connectivity |
| `RabbitMQService`  | Injectable Service | Publish/subscribe operations with retry + DLQ   |
| `StructuredLogger` | Class              | Structured log emission via RabbitMQ            |

### RabbitMQModule

A `@Global()` NestJS dynamic module. Two registration methods:

**Static registration** (`forRoot`):

```typescript
@Module({
  imports: [
    RabbitMQModule.forRoot({
      url: 'amqp://user:password@localhost:5672',
      serviceName: 'chat-service',
      exchangeName: EXCHANGE_NAME, // optional, defaults to 'claw.events'
      queuePrefix: RABBITMQ_QUEUE_PREFIX, // optional, defaults to 'claw'
    }),
  ],
})
export class AppModule {}
```

**Async registration** (`forRootAsync`):

```typescript
RabbitMQModule.forRootAsync({
  useFactory: (config: AppConfig) => ({
    url: config.rabbitmqUrl,
    serviceName: 'chat-service',
  }),
  inject: [AppConfig],
});
```

### RabbitMQService

Injectable service providing publish and subscribe operations.

**Configuration Constants**:

- `MAX_RETRIES`: 3 -- Maximum retry attempts before sending to DLQ
- `RETRY_DELAY_MS`: 5000ms -- Base delay between retries (multiplied by attempt number)
- `MESSAGE_TTL_MS`: 86,400,000ms (24 hours) -- Message expiration

**Connection Management**:

- Auto-connects on module init (`onModuleInit`)
- Auto-disconnects on module destroy (`onModuleDestroy`)
- Auto-reconnects on connection close (5-second delay)
- Creates a durable topic exchange on connect

**`publish(pattern, payload)`**:

```typescript
await this.rabbitMQ.publish(EventPattern.MESSAGE_CREATED, {
  messageId: message.id,
  threadId: message.threadId,
  userId: message.userId,
  content: message.content,
  timestamp: new Date().toISOString(),
});
```

Published messages include:

- `pattern` -- The event routing key
- `data` -- The payload object
- `timestamp` -- ISO 8601 timestamp
- `source` -- The publishing service name

Message properties:

- `persistent: true` -- Survives broker restart
- `contentType: 'application/json'`
- `expiration` -- 24-hour TTL

**`subscribe(pattern, handler)`**:

```typescript
await this.rabbitMQ.subscribe(EventPattern.MESSAGE_COMPLETED, async (data: unknown) => {
  const payload = data as MessageCompletedPayload;
  await this.processCompletion(payload);
});
```

Subscription creates:

1. **Dead-letter queue** (`{prefix}.{service}.{pattern}.dlq`) -- Durable, 24-hour TTL
2. **Main queue** (`{prefix}.{service}.{pattern}`) -- Durable, dead-letter routing to DLQ
3. **Binding** -- Main queue bound to exchange with pattern as routing key

**Retry Behavior**:

- On handler failure, message is acked and republished with incremented `x-retry-count` header
- Retry delay increases with each attempt: `RETRY_DELAY_MS * (retryCount + 1)` (5s, 10s, 15s)
- After `MAX_RETRIES` (3) exhausted, message is nacked without requeue (sent to DLQ)
- Each retry is logged as a warning; DLQ sends are logged as errors

**Queue Naming Convention**:

```
Main:  claw.audit-service.message.completed
DLQ:   claw.audit-service.message.completed.dlq
```

### StructuredLogger

A logging utility that writes to both the local NestJS Logger and publishes structured log events to RabbitMQ for centralized collection by the Server Logs Service.

**Constructor**:

```typescript
const logger = new StructuredLogger(
  rabbitMQService, // RabbitMQService instance
  'chat-service', // Service name
  EventPattern.LOG_SERVER, // Event pattern for log routing
  'ChatService', // Optional NestJS Logger context
);
```

**`logAction(params)`**:

Accepts a `StructuredLogParams` object with:

| Field          | Type                      | Required | Description              |
| -------------- | ------------------------- | -------- | ------------------------ |
| `level`        | `LogLevel`                | Yes      | DEBUG, INFO, WARN, ERROR |
| `message`      | `string`                  | Yes      | Log message              |
| `module`       | `string`                  | No       | Module name              |
| `controller`   | `string`                  | No       | Controller name          |
| `service`      | `string`                  | No       | Service class name       |
| `manager`      | `string`                  | No       | Manager class name       |
| `repository`   | `string`                  | No       | Repository class name    |
| `action`       | `string`                  | No       | Action being performed   |
| `route`        | `string`                  | No       | HTTP route               |
| `method`       | `string`                  | No       | HTTP method              |
| `statusCode`   | `number`                  | No       | HTTP status code         |
| `requestId`    | `string`                  | No       | X-Request-ID correlation |
| `traceId`      | `string`                  | No       | Distributed trace ID     |
| `userId`       | `string`                  | No       | Acting user ID           |
| `threadId`     | `string`                  | No       | Chat thread ID           |
| `messageId`    | `string`                  | No       | Chat message ID          |
| `connectorId`  | `string`                  | No       | Connector ID             |
| `provider`     | `string`                  | No       | AI provider name         |
| `model`        | `string`                  | No       | AI model name            |
| `latencyMs`    | `number`                  | No       | Operation latency        |
| `errorCode`    | `string`                  | No       | Error code               |
| `errorMessage` | `string`                  | No       | Error message            |
| `errorStack`   | `string`                  | No       | Error stack trace        |
| `metadata`     | `Record<string, unknown>` | No       | Additional metadata      |

**Behavior**:

1. Logs locally via NestJS Logger at the appropriate level (error/warn/debug/log)
2. Publishes a `ServerLogPayload` to RabbitMQ with `timestamp` and `serviceName` auto-populated
3. Publishing failures are silently caught -- logging never breaks the service

**Usage Example**:

```typescript
this.logger.logAction({
  level: LogLevel.INFO,
  message: 'Message routed successfully',
  action: 'routeMessage',
  service: 'RoutingService',
  threadId: payload.threadId,
  messageId: payload.messageId,
  provider: decision.selectedProvider,
  model: decision.selectedModel,
  latencyMs: elapsed,
});
```

---

## shared-auth

**Package**: `@claw/shared-auth`
**Path**: `packages/shared-auth/`
**Purpose**: Authentication and authorization guards plus decorators. Used by all services that need JWT verification and RBAC.

### Exports

| Export             | Type                | Description                             |
| ------------------ | ------------------- | --------------------------------------- |
| `AuthGuard`        | NestJS Guard        | JWT token verification                  |
| `RolesGuard`       | NestJS Guard        | Role-based access control               |
| `@Public()`        | Decorator           | Mark endpoint as public (skip auth)     |
| `@Roles(...roles)` | Decorator           | Require specific roles                  |
| `@CurrentUser()`   | Parameter Decorator | Extract authenticated user from request |

### AuthGuard

A `CanActivate` guard that verifies JWT access tokens on every request.

**Behavior**:

1. Checks for `@Public()` metadata -- if present, allows request through
2. Extracts `Authorization: Bearer <token>` header
3. Verifies token using `JWT_SECRET` from environment
4. Attaches decoded user info to `request.user` as `AuthenticatedUser`
5. Throws `UnauthorizedException` for missing/invalid tokens

**Error Cases**:

- Missing authorization header: `"Missing authorization header"`
- Invalid format (not Bearer): `"Invalid authorization header format"`
- Missing token: `"Missing token"`
- Missing JWT_SECRET: `"Authentication service misconfigured"`
- Invalid/expired token: `"Invalid or expired token"`

**Decoded Token Structure**:

```typescript
request.user = {
  id: payload.sub, // User UUID
  email: payload.email, // User email
  role: payload.role, // UserRole enum value
};
```

**Registration** (typically in AppModule):

```typescript
@Module({
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

### RolesGuard

A `CanActivate` guard that checks if the authenticated user has the required role.

**Behavior**:

1. Reads `@Roles()` metadata from handler and class
2. If no roles are required, allows request through
3. Checks if `request.user.role` is in the required roles array
4. Returns `false` (403 Forbidden) if user lacks the required role

**Example**:

```typescript
@Roles(UserRole.ADMIN)
@Get('admin-only')
async adminEndpoint(): Promise<void> { ... }

@Roles(UserRole.ADMIN, UserRole.OPERATOR)
@Get('staff-only')
async staffEndpoint(): Promise<void> { ... }
```

### @Public() Decorator

Marks an endpoint or controller as publicly accessible, bypassing the AuthGuard.

**Implementation**: Sets `isPublic` metadata to `true` via `SetMetadata`.

**Usage**:

```typescript
@Public()
@Post('login')
async login(@Body() dto: LoginDto): Promise<LoginResult> { ... }
```

**Common Use Cases**:

- Login and refresh token endpoints
- Health check endpoints
- Internal inter-service endpoints
- Client log ingestion endpoint
- SSE stream endpoints
- Ollama generate endpoint

### @Roles() Decorator

Specifies which `UserRole` values are required to access an endpoint.

**Implementation**: Sets `roles` metadata with the provided roles array.

**Parameters**: Accepts one or more `UserRole` enum values.

```typescript
@Roles(UserRole.ADMIN)                        // Admin only
@Roles(UserRole.ADMIN, UserRole.OPERATOR)     // Admin or Operator
```

### @CurrentUser() Decorator

A parameter decorator that extracts the `AuthenticatedUser` from the request object. Only usable on endpoints that are NOT marked `@Public()`.

**Implementation**: Creates a parameter decorator via `createParamDecorator` that reads `request.user`.

**Return Type**: `AuthenticatedUser` (`{ id, email, role }`)

**Usage**:

```typescript
@Get('me')
async me(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
  return this.authService.getProfile(user.id);
}
```

### Full Integration Example

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Public, Roles, CurrentUser } from '@claw/shared-auth';
import { UserRole, type AuthenticatedUser } from '@claw/shared-types';

@Controller('example')
export class ExampleController {
  // Public -- no auth required
  @Public()
  @Get('health')
  async health(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  // Authenticated -- any logged-in user
  @Get('profile')
  async profile(@CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.service.getProfile(user.id);
  }

  // Admin only
  @Roles(UserRole.ADMIN)
  @Post('admin-action')
  async adminAction(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.service.performAdminAction(user.id);
  }
}
```

---

## shared-utilities

**Package**: `@claw/shared-utilities`
**Path**: `packages/shared-utilities/`
**Added**: 2026-04-26 (Phase C-1 of the codebase-wide refactor)
**Purpose**: Cross-service utility functions. The third "shape" alongside `shared-types` (types) and `shared-constants` (values) — this package owns _functions_ that 2+ services need. Eliminates per-service duplicates of the same wrapper code.

### Sub-packages

| Subdir            | Exports                                                                              | Wraps              | Notes                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jwt/`            | `verifyAccessToken<TPayload>(token, secret): TPayload`                               | `jsonwebtoken`     | Generic over payload type — services pass their local `JwtPayload` (or import from `@claw/shared-types`). Uses `JWT_ALGORITHM` from `@claw/shared-constants`.                                                                            |
| `http-client/`    | `httpRequest(options): Promise<HttpResponse<T>>` (fetch)                             | `globalThis.fetch` | Used by chat / memory / routing flavour. Takes `HttpRequestOptions` from `@claw/shared-types`.                                                                                                                                           |
| `http-client/`    | `createHttpClient(config)`, `httpGet<T>(url, cfg?)`, `httpPost<T>(url, body?, cfg?)` | `axios`            | Used by image / ollama / file-gen / file / health flavour. Defaults to `DEFAULT_HTTP_TIMEOUT` from `@claw/shared-constants`.                                                                                                             |
| `safe-stringify/` | `safeStringify(value): string`                                                       | `JSON.stringify`   | Recursively redacts `password`, `token`, `apiKey`, `apikey`, `refreshToken`, `accessToken`, `secret`, `authorization`, `cookie`, `clientSecret` before stringifying. Use in `logger.debug()` calls when input may contain auth material. |

### Adoption status (per `@claw/shared-utilities` import)

| Service         | JWT verifier                                                                                       | HTTP client                | crypto / url-safety |
| --------------- | -------------------------------------------------------------------------------------------------- | -------------------------- | ------------------- |
| auth            | ✅ `signAccessToken` + `signRefreshToken` are auth-local; `verifyAccessToken` delegates to shared. | n/a                        | ⏳ pending          |
| chat            | ✅                                                                                                 | ⏳ pending                 | n/a                 |
| connector       | ✅                                                                                                 | n/a                        | ⏳ pending          |
| memory          | ✅                                                                                                 | ⏳ pending                 | n/a                 |
| ollama          | ✅                                                                                                 | ⏳ pending                 | n/a                 |
| routing         | ✅                                                                                                 | ⏳ pending                 | n/a                 |
| image           | ✅                                                                                                 | ⏳ pending                 | n/a                 |
| file-generation | ✅                                                                                                 | ⏳ pending                 | n/a                 |
| file            | ✅                                                                                                 | n/a                        | n/a                 |
| audit           | ✅                                                                                                 | n/a                        | n/a                 |
| client-logs     | ✅                                                                                                 | n/a                        | n/a                 |
| server-logs     | ✅                                                                                                 | n/a                        | n/a                 |
| health          | n/a                                                                                                | ✅ axios wrapper redirects | n/a                 |
| agent           | ❌ uses custom JWT (audience/issuer/scopes) — intentionally NOT deduped                            | n/a                        | n/a                 |
| workspace       | ❌ no `jwt.utility.ts`                                                                             | n/a                        | ⏳ pending          |
| research        | n/a                                                                                                | ⏳ pending                 | ⏳ pending          |

### Wrapping pattern (per-service)

When adopting `@claw/shared-utilities`, services keep a 4-line typed wrapper at `src/common/utilities/jwt.utility.ts` so every consumer (auth guards, etc.) keeps importing from `@common/utilities` — this avoids touching dozens of call sites:

```ts
// apps/<service>/src/common/utilities/jwt.utility.ts
import { verifyAccessToken as verifyAccessTokenGeneric } from '@claw/shared-utilities';
import { type JwtPayload } from '../types';

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  return verifyAccessTokenGeneric<JwtPayload>(token, secret);
}
```

The actual `jsonwebtoken` library call now lives **exactly once** in `packages/shared-utilities/src/jwt/jwt-verifier.utility.ts`. The per-service file is just a typing adapter.

### Future planned utilities

The package skeleton is designed to grow. Reserved sub-packages for future phases:

- `crypto/` — AES-256-GCM encryption (currently duplicated in 4 services: auth / connector / research / workspace)
- `url-safety/` — URL parsing + SSRF blocklists (currently duplicated in research + workspace)
- `retry-policy/` — exponential backoff + jitter
- `pkce/` — OAuth 2.1 PKCE helpers (currently in workspace only, but research will need it)

### Adding to a new service

1. Add to `apps/<service>/package.json` dependencies: `"@claw/shared-utilities": "*"`
2. Run `npm install` from monorepo root.
3. **Add to `.github/workflows/ci.yml` "Build shared packages" step** — see footgun below.
4. Import from `@claw/shared-utilities` in code.

### ⚠️ CI Footgun (added 2026-04-26)

The CI workflow has a "Build shared packages" step that compiles each package's `dist/` before service typecheck/test/build runs. When a new shared package is added, **all four jobs** (lint / typecheck / test / build) must include the new compile line, otherwise consumer services fail with `Cannot find module '@claw/shared-utilities'` even though the package is in `package-lock.json`. Local builds work because `node_modules/@claw/<pkg>` symlink + `dist/` are populated by the developer's `npm run build`.

The workflow step now reads:

```yaml
- name: Build shared packages
  run: |
    cd packages/shared-types && npx tsgo -p tsconfig.build.json
    cd ../shared-constants && npx tsgo -p tsconfig.build.json
    cd ../shared-utilities && npx tsgo -p tsconfig.build.json
    cd ../shared-rabbitmq && npx tsgo -p tsconfig.build.json
    cd ../shared-auth && npx tsgo -p tsconfig.build.json
    cd ../shared-entitlements && npx tsgo -p tsconfig.build.json
```

This rule is now codified in `rules/05-infra-rules.md` and `rules/09-refactor-rules.md`.

---

## Package Dependency Graph

```text
shared-types ─────────┬─> shared-utilities ─> shared-auth
                     ├─> shared-rabbitmq
                     └─> shared-entitlements
shared-constants ────┴─> shared-utilities / shared-rabbitmq
```

All services use only the shared packages they declare. In particular,
`shared-auth` depends on `shared-utilities`, so a clean build must compile
utilities before auth.

### Build Order

When modifying shared packages, rebuild in dependency order:

1. `shared-types` and `shared-constants` (independent, can build in parallel)
2. `shared-utilities` (depends on shared-types and shared-constants)
3. `shared-rabbitmq` (depends on shared-types and shared-constants)
4. `shared-auth` (depends on shared-types and shared-utilities)
5. `shared-entitlements` (depends on shared-types)
6. All service packages (depend on the shared packages above)

The CI workflow `.github/workflows/ci.yml` enforces this order — if you add a new shared package, you MUST update the "Build shared packages" step in **all four** jobs (lint / typecheck / test / build).
