# Shared NPM Packages

## Overview

ClawAI uses four internal NPM packages in the `packages/` directory to share code across services. These packages are linked via npm workspaces and consumed by backend services and the frontend.

```
packages/
  shared-types/       # Enums, event payloads, auth types
  shared-constants/   # Exchange name, ports, API prefix
  shared-rabbitmq/    # RabbitMQModule, RabbitMQService, StructuredLogger
  shared-auth/        # AuthGuard, RolesGuard, decorators
```

## shared-types

Types and enums shared across all backend services. This is the most widely imported package.

### Exports

**Enums:**

| Enum               | Values                                                           | Used By            |
| ------------------ | ---------------------------------------------------------------- | ------------------ |
| `Provider`         | OPENAI, ANTHROPIC, GEMINI, DEEPSEEK, LOCAL_OLLAMA                | All services       |
| `RoutingMode`      | AUTO, MANUAL_MODEL, LOCAL_ONLY, PRIVACY_FIRST, LOW_LATENCY, etc. | chat, routing      |
| `ConnectorStatus`  | ACTIVE, INACTIVE, ERROR                                          | connector          |
| `ModelLifecycle`   | ACTIVE, DEPRECATED, RETIRED                                      | connector, routing |
| `AuditAction`      | 10 actions (LOGIN, LOGOUT, MESSAGE_SENT, etc.)                   | audit, all         |
| `MessageRole`      | USER, ASSISTANT, SYSTEM                                          | chat               |
| `MemoryType`       | FACT, PREFERENCE, INSTRUCTION, SUMMARY                           | memory             |
| `FileIngestionStatus` | PENDING, PROCESSING, COMPLETED, FAILED                        | file               |
| `ModelRole`        | ROUTER, LOCAL_FALLBACK_CHAT, LOCAL_CODING, etc.                  | ollama, routing    |
| `CatalogCategory`  | CODING, REASONING, THINKING, FILE_GENERATION, etc.              | ollama, routing    |
| `ModelRuntime`     | OLLAMA, COMFYUI                                                  | ollama, image      |
| `ImageProvider`    | OPENAI, GEMINI, STABLE_DIFFUSION, COMFYUI                       | image              |

**Event Patterns:**

```typescript
export const EVENT_PATTERNS = {
  MESSAGE_CREATED: 'message.created',
  MESSAGE_ROUTED: 'message.routed',
  MESSAGE_COMPLETED: 'message.completed',
  THREAD_CREATED: 'thread.created',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  CONNECTOR_CREATED: 'connector.created',
  CONNECTOR_SYNCED: 'connector.synced',
  MODEL_PULLED: 'model.pulled',
  MODEL_DELETED: 'model.deleted',
  IMAGE_GENERATED: 'image.generated',
  IMAGE_FAILED: 'image.failed',
  FILE_GENERATED: 'file.generated',
  // ... more
} as const;
```

**Event Payload Types:**

```typescript
export type MessageCreatedEvent = {
  messageId: string;
  threadId: string;
  content: string;
  userId: string;
  routingMode: RoutingMode;
  forcedProvider?: Provider;
  forcedModel?: string;
};
```

### Consumers

Every backend service imports `shared-types`. The frontend imports selected enums for type consistency.

## shared-constants

Scalar constants shared across services.

### Exports

| Constant               | Value            | Purpose                      |
| ---------------------- | ---------------- | ---------------------------- |
| `EXCHANGE_NAME`        | `claw.events`    | RabbitMQ exchange name       |
| `API_PREFIX`           | `api/v1`         | URL prefix for all endpoints |
| `DEFAULT_PAGE_SIZE`    | `20`             | Pagination default           |
| `MAX_PAGE_SIZE`        | `100`            | Pagination maximum           |
| Service port constants | `4001`-`4013`    | Per-service port numbers     |
| Service name constants | String identifiers| For logging and health checks|

### Consumers

All backend services, nginx configuration reference.

## shared-rabbitmq

RabbitMQ integration module for NestJS with built-in retry, DLQ, and structured logging.

### Exports

**RabbitMQModule:**

```typescript
// In any service's app.module.ts
@Module({
  imports: [
    RabbitMQModule.forRoot({
      url: config.RABBITMQ_URL,
      exchange: EXCHANGE_NAME,
    }),
  ],
})
export class AppModule {}
```

**RabbitMQService:**

```typescript
// Publishing events
@Injectable()
export class ChatService {
  constructor(private readonly rabbitmq: RabbitMQService) {}

  async createMessage(): Promise<void> {
    // ... create message
    await this.rabbitmq.publish('message.created', payload);
  }
}
```

**Event subscription (decorator-based):**

```typescript
@RabbitSubscribe({
  exchange: EXCHANGE_NAME,
  routingKey: 'message.completed',
  queue: 'audit.message.completed',
})
async handleMessageCompleted(event: MessageCompletedEvent): Promise<void> {
  // Process event
}
```

**StructuredLogger:**

A Pino-based logger wrapper that includes service name, request ID, and trace ID in every log entry. Configured for JSON output in production and pretty-printed output in development.

### Features

- **Automatic retry**: 3 retries with exponential backoff (1s, 5s, 15s)
- **Dead-letter queue**: Messages that fail all retries go to `claw.events.dlq`
- **Connection recovery**: Automatic reconnection if RabbitMQ restarts
- **Health check**: Exposes connection status for the health service

### Consumers

All 13 backend services import `shared-rabbitmq`.

## shared-auth

Authentication and authorization primitives for NestJS services.

### Exports

**Guards:**

| Guard        | Purpose                                          |
| ------------ | ------------------------------------------------ |
| `AuthGuard`  | Validates JWT from Authorization header          |
| `RolesGuard` | Checks user role against `@Roles()` decorator    |

**Decorators:**

| Decorator        | Usage                                   |
| ---------------- | --------------------------------------- |
| `@Public()`      | Mark endpoint as public (skip auth)     |
| `@Roles(...)`    | Require specific roles (ADMIN, etc.)    |
| `@CurrentUser()` | Extract authenticated user from request |

**Usage:**

```typescript
@Controller('threads')
export class ThreadController {
  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateThreadDto,
  ): Promise<Thread> {
    return this.threadService.create(user.id, dto);
  }

  @Get('public-info')
  @Public()
  getPublicInfo(): Promise<Info> {
    return this.service.getPublicInfo();
  }
}
```

### Auth Flow

1. Frontend sends `Authorization: Bearer <jwt>` header
2. `AuthGuard` extracts and validates the JWT
3. If valid, attaches user object to request
4. `RolesGuard` checks `@Roles()` metadata against user's role
5. `@CurrentUser()` extracts the user object for the controller method

### Consumers

All backend services except health-service (which has only public endpoints).

## Updating Shared Packages

When modifying any shared package:

1. Make the change in `packages/<package>/src/`
2. Build the package: `cd packages/<package> && npm run build`
3. Restart all consuming services (they import from the build output)
4. In Docker: `docker compose restart <service1> <service2> ...`

Changes to shared packages do NOT auto-reload via `node --watch`. A manual restart of consuming services is required.
