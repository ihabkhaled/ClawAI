# Shared Packages Reference

ClawAI has 4 shared packages in the `packages/` directory, consumed by all backend services.

---

## Package Overview

| Package | NPM Name | Purpose |
|---------|----------|---------|
| `packages/shared-types` | `@claw/shared-types` | Enums, event patterns, event payloads, auth types |
| `packages/shared-constants` | `@claw/shared-constants` | Exchange name, ports, API prefix, pagination |
| `packages/shared-rabbitmq` | `@claw/shared-rabbitmq` | RabbitMQModule, RabbitMQService, StructuredLogger |
| `packages/shared-auth` | `@claw/shared-auth` | AuthGuard, RolesGuard, decorators (@Public, @Roles, @CurrentUser) |

---

## shared-types

### Enums (18 total)

```typescript
// User domain
UserRole          // ADMIN, OPERATOR, VIEWER
UserStatus        // ACTIVE, SUSPENDED, PENDING
UserLanguagePreference  // EN, AR, FR, IT, DE, ES, RU, PT
UserAppearancePreference // SYSTEM, LIGHT, DARK

// Connector domain
ConnectorProvider  // OPENAI, ANTHROPIC, GEMINI, AWS_BEDROCK, DEEPSEEK, OLLAMA
ConnectorStatus    // HEALTHY, DEGRADED, DOWN, UNKNOWN
ConnectorAuthType  // API_KEY, OAUTH2, NONE
ModelLifecycle     // ACTIVE, DEPRECATED, SUNSET

// Chat domain
RoutingMode       // AUTO, MANUAL_MODEL, LOCAL_ONLY, PRIVACY_FIRST, LOW_LATENCY, HIGH_REASONING, COST_SAVER
MessageRole       // SYSTEM, USER, ASSISTANT, TOOL

// Memory domain
MemoryType        // SUMMARY, FACT, PREFERENCE, INSTRUCTION

// File domain
FileIngestionStatus // PENDING, PROCESSING, COMPLETED, FAILED

// Audit domain
AuditAction       // USER_LOGIN, USER_LOGOUT, MESSAGE_SENT, CONNECTOR_CREATED, ...
AuditSeverity     // LOW, MEDIUM, HIGH, CRITICAL

// Health domain
HealthStatus      // HEALTHY, DEGRADED, UNHEALTHY

// Logging domain
LogLevel          // INFO, WARN, ERROR, DEBUG

// Ollama domain
LocalModelRole    // ROUTER, LOCAL_FALLBACK_CHAT, LOCAL_REASONING, LOCAL_CODING, LOCAL_FILE_GENERATION, LOCAL_THINKING, LOCAL_IMAGE_GENERATION
```

### Event Patterns

28 event patterns defined in `EventPattern` enum. See `event-bus-reference.md`.

### Event Payloads

Typed interfaces for all event payloads. See `event-bus-reference.md` for complete schemas.

### Auth Types

```typescript
interface JwtPayload {
  sub: string;     // User ID
  email: string;
  role: UserRole;
  iat: number;     // Issued at
  exp: number;     // Expiration
}

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Import Usage

```typescript
import { UserRole, EventPattern, RoutingMode } from '@claw/shared-types';
import type { JwtPayload, AuthenticatedUser, PaginatedResult } from '@claw/shared-types';
```

---

## shared-constants

All constants are exported from a single `index.ts`:

```typescript
// RabbitMQ
export const EXCHANGE_NAME = 'claw.events';
export const RABBITMQ_QUEUE_PREFIX = 'claw';

// Service Ports
export const AUTH_SERVICE_PORT = 4001;
export const CHAT_SERVICE_PORT = 4002;
export const CONNECTOR_SERVICE_PORT = 4003;
export const ROUTING_SERVICE_PORT = 4004;
export const MEMORY_SERVICE_PORT = 4005;
export const FILE_SERVICE_PORT = 4006;
export const AUDIT_SERVICE_PORT = 4007;
export const OLLAMA_SERVICE_PORT = 4008;
export const HEALTH_SERVICE_PORT = 4009;
export const IMAGE_SERVICE_PORT = 4012;
export const FILE_GENERATION_SERVICE_PORT = 4013;

// Service Names
export const AUTH_SERVICE = 'auth-service';
export const CHAT_SERVICE = 'chat-service';
export const CONNECTOR_SERVICE = 'connector-service';
export const ROUTING_SERVICE = 'routing-service';
export const MEMORY_SERVICE = 'memory-service';
export const FILE_SERVICE = 'file-service';
export const AUDIT_SERVICE = 'audit-service';
export const OLLAMA_SERVICE = 'ollama-service';
export const HEALTH_SERVICE = 'health-service';
export const IMAGE_SERVICE = 'image-service';
export const FILE_GENERATION_SERVICE = 'file-generation-service';

// API
export const API_PREFIX = 'api/v1';

// Pagination
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
```

### Import Usage

```typescript
import { API_PREFIX, DEFAULT_PAGE_SIZE, EXCHANGE_NAME } from '@claw/shared-constants';
```

---

## shared-rabbitmq

### RabbitMQModule

NestJS dynamic module for RabbitMQ connection management:

```typescript
// Static registration
RabbitMQModule.forRoot({
  url: 'amqp://user:pass@rabbitmq:5672',
  serviceName: 'chat-service',
})

// Async registration (with config injection)
RabbitMQModule.forRootAsync({
  useFactory: (config: AppConfig) => ({
    url: config.rabbitmqUrl,
    serviceName: 'chat-service',
  }),
  inject: [AppConfig],
})
```

The module is `@Global()` — RabbitMQService is available in all modules without importing.

### RabbitMQService

Core service for publish/subscribe:

```typescript
class RabbitMQService {
  // Lifecycle
  async onModuleInit(): Promise<void>     // Auto-connect
  async onModuleDestroy(): Promise<void>  // Auto-disconnect

  // Publishing
  async publish(pattern: EventPattern | string, payload: unknown): Promise<void>

  // Subscribing
  async subscribe(
    pattern: EventPattern | string,
    handler: (data: unknown) => Promise<void>,
  ): Promise<void>
}
```

Features:
- Auto-reconnect on connection loss (5s interval)
- Topic exchange with durable queues
- Dead-letter queues (DLQ) for failed messages
- 3 retries with exponential backoff (5s, 10s, 15s)
- 24-hour message TTL
- Persistent messages

### StructuredLogger

Publishes structured log events to RabbitMQ for the server-logs service:

```typescript
class StructuredLogger {
  constructor(
    rabbitMQ: RabbitMQService,
    serviceName: string,
    eventPattern: EventPattern,
    context?: string,
  )

  logAction(params: StructuredLogParams): void
}
```

Usage:
```typescript
this.structuredLogger.logAction({
  level: LogLevel.INFO,
  message: 'User logged in',
  action: 'user.login',
  userId: user.id,
  module: 'AuthModule',
});
```

The logger:
1. Logs locally via NestJS Logger (console output)
2. Publishes structured log event to RabbitMQ asynchronously
3. Never throws — logging failures are silently caught

---

## shared-auth

### AuthGuard

JWT validation guard. See `middleware-reference.md` for details.

### RolesGuard

Role-based access control guard. See `middleware-reference.md` for details.

### Decorators

```typescript
// Mark endpoint as public (skip auth)
@Public()

// Require specific roles
@Roles(UserRole.ADMIN)
@Roles(UserRole.ADMIN, UserRole.OPERATOR)

// Extract current user from request
@CurrentUser() user: AuthenticatedUser
```

### Metadata Keys

```typescript
export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
```

---

## Adding to Shared Packages

When adding new exports to shared packages:

1. Add the code in the package's `src/` directory
2. Export from `src/index.ts`
3. Run `npm run build` in the package
4. Restart dependent services (they import the built output)

When adding a new enum:
```
packages/shared-types/src/enums/<name>.enum.ts  — define enum
packages/shared-types/src/enums/index.ts        — export
packages/shared-types/src/index.ts              — already exports all from enums
```

When adding a new event:
```
packages/shared-types/src/events/event-patterns.ts  — add to EventPattern enum
packages/shared-types/src/events/event-payloads.type.ts — add payload interface
packages/shared-types/src/events/index.ts           — already exports all
```
