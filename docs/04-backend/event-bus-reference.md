# Event Bus Reference

Complete reference for the RabbitMQ event bus used for async inter-service communication.

---

## Infrastructure

- **Exchange**: `claw.events` (topic, durable)
- **Library**: amqplib (wrapped in `@claw/shared-rabbitmq`)
- **Queue naming**: `claw.<service-name>.<event-pattern>`
- **Dead Letter Queue**: `claw.<service-name>.<event-pattern>.dlq`
- **Retries**: 3 max, with exponential backoff (5s, 10s, 15s)
- **Message TTL**: 24 hours
- **Message format**: JSON with `{ pattern, data, timestamp, source }`

---

## Event Patterns

All patterns are defined in `packages/shared-types/src/events/event-patterns.ts`:

```typescript
export enum EventPattern {
  USER_CREATED          = 'user.created',
  USER_LOGIN            = 'user.login',
  USER_LOGOUT           = 'user.logout',
  USER_ROLE_CHANGED     = 'user.role_changed',
  USER_DEACTIVATED      = 'user.deactivated',
  MESSAGE_CREATED       = 'message.created',
  MESSAGE_ROUTED        = 'message.routed',
  MESSAGE_COMPLETED     = 'message.completed',
  CONNECTOR_CREATED     = 'connector.created',
  CONNECTOR_UPDATED     = 'connector.updated',
  CONNECTOR_DELETED     = 'connector.deleted',
  CONNECTOR_SYNCED      = 'connector.synced',
  CONNECTOR_HEALTH_CHECKED = 'connector.health_checked',
  ROUTING_DECISION_MADE = 'routing.decision_made',
  FILE_UPLOADED         = 'file.uploaded',
  FILE_CHUNKED          = 'file.chunked',
  MEMORY_EXTRACTED      = 'memory.extracted',
  AUDIT_EVENT           = 'audit.event',
  HEALTH_CHECK          = 'health.check',
  LOG_SERVER            = 'log.server',
  IMAGE_GENERATED       = 'image.generated',
  IMAGE_FAILED          = 'image.failed',
  FILE_GENERATED        = 'file.generated',
  FILE_GENERATION_FAILED = 'file_generation.failed',
  MODEL_PULLED          = 'model.pulled',
  MODEL_DELETED         = 'model.deleted',
  CATALOG_UPDATED       = 'catalog.updated',
}
```

---

## Publisher/Consumer Matrix

| Event | Publisher | Consumers | Purpose |
|-------|----------|-----------|---------|
| `user.created` | auth | audit | Audit new user creation |
| `user.login` | auth | audit | Audit login events |
| `user.logout` | auth | audit | Audit logout events |
| `user.role_changed` | auth | audit | Audit role changes |
| `user.deactivated` | auth | audit | Audit deactivation |
| `message.created` | chat | routing | Trigger routing decision |
| `message.routed` | routing | chat | Trigger AI execution |
| `message.completed` | chat | audit, memory | Record usage + extract memories |
| `connector.created` | connector | audit | Audit connector creation |
| `connector.updated` | connector | audit | Audit connector changes |
| `connector.deleted` | connector | audit | Audit connector deletion |
| `connector.synced` | connector | audit, routing | Update model availability |
| `connector.health_checked` | connector | audit, routing | Update connector status |
| `routing.decision_made` | routing | audit | Audit routing decisions |
| `file.uploaded` | file | - | (no consumers yet) |
| `file.chunked` | file | - | (no consumers yet) |
| `memory.extracted` | memory | audit | Audit memory extraction |
| `audit.event` | all | audit | Generic audit events |
| `log.server` | all | server-logs | Structured log ingestion |
| `image.generated` | image | audit | Audit image generation |
| `image.failed` | image | audit | Audit image failures |
| `file.generated` | file-gen | audit | Audit file generation |
| `file_generation.failed` | file-gen | audit | Audit file gen failures |
| `model.pulled` | ollama | routing | Invalidate model cache |
| `model.deleted` | ollama | routing | Invalidate model cache |
| `catalog.updated` | ollama | - | (no consumers yet) |

---

## Event Payload Schemas

All payloads extend `BaseEventPayload`:

```typescript
interface BaseEventPayload {
  timestamp: string;       // ISO 8601
  correlationId?: string;  // For request tracing
}
```

### User Events

```typescript
interface UserCreatedPayload extends BaseEventPayload {
  userId: string;
  email: string;
  role: UserRole;    // ADMIN | OPERATOR | VIEWER
}

interface UserLoginPayload extends BaseEventPayload {
  userId: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

interface UserLogoutPayload extends BaseEventPayload {
  userId: string;
}

interface UserRoleChangedPayload extends BaseEventPayload {
  userId: string;
  previousRole: UserRole;
  newRole: UserRole;
  changedBy: string;  // Admin user ID
}

interface UserDeactivatedPayload extends BaseEventPayload {
  userId: string;
  deactivatedBy: string;  // Admin user ID
}
```

### Message Events (Critical Flow)

```typescript
interface MessageCreatedPayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  userId: string;
  content: string;          // User's message text
  routingMode?: RoutingMode;
  forcedProvider?: string;  // For MANUAL_MODEL mode
  forcedModel?: string;     // For MANUAL_MODEL mode
}

interface MessageRoutedPayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  selectedProvider: string;   // e.g., "anthropic"
  selectedModel: string;      // e.g., "claude-sonnet-4"
  routingMode: RoutingMode;
  fallbackProvider?: string;
  fallbackModel?: string;
}

interface MessageCompletedPayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  assistantMessageId: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}
```

### Connector Events

```typescript
interface ConnectorCreatedPayload extends BaseEventPayload {
  connectorId: string;
  provider: ConnectorProvider;  // OPENAI | ANTHROPIC | GEMINI | ...
  name: string;
  userId: string;
}

interface ConnectorSyncedPayload extends BaseEventPayload {
  connectorId: string;
  provider: ConnectorProvider;
  modelsDiscovered: number;
}

interface ConnectorHealthCheckedPayload extends BaseEventPayload {
  connectorId: string;
  provider: ConnectorProvider;
  status: ConnectorStatus;  // HEALTHY | DEGRADED | DOWN | UNKNOWN
  latencyMs?: number;
}
```

### Routing Events

```typescript
interface RoutingDecisionMadePayload extends BaseEventPayload {
  messageId: string;
  threadId: string;
  routingMode: RoutingMode;
  selectedConnectorId: string;
  selectedModelId: string;
  reason: string;
  candidateCount: number;
}
```

### File Events

```typescript
interface FileUploadedPayload extends BaseEventPayload {
  fileId: string;
  threadId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
```

### Memory Events

```typescript
interface MemoryExtractedPayload extends BaseEventPayload {
  memoryId: string;
  threadId: string;
  userId: string;
  type: MemoryType;   // FACT | PREFERENCE | INSTRUCTION | SUMMARY
  content: string;
}
```

### Server Log Events

```typescript
interface ServerLogPayload extends BaseEventPayload {
  level: LogLevel;        // INFO | WARN | ERROR | DEBUG
  message: string;
  serviceName: string;
  module?: string;
  controller?: string;
  service?: string;
  manager?: string;
  repository?: string;
  action?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  traceId?: string;
  userId?: string;
  threadId?: string;
  messageId?: string;
  connectorId?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  metadata?: Record<string, unknown>;
}
```

---

## Publishing Events

```typescript
// In a service method
await this.rabbitMQ.publish(EventPattern.MESSAGE_CREATED, {
  messageId: message.id,
  threadId: message.threadId,
  userId,
  content: message.content,
  timestamp: new Date().toISOString(),
});
```

The `RabbitMQService.publish()` method:
1. Serializes payload to JSON Buffer
2. Wraps in `{ pattern, data, timestamp, source }` envelope
3. Publishes to `claw.events` exchange with pattern as routing key
4. Messages are persistent and expire after 24 hours

---

## Subscribing to Events

```typescript
// In module's onModuleInit or a dedicated subscriber
async onModuleInit(): Promise<void> {
  await this.rabbitMQ.subscribe(
    EventPattern.MESSAGE_CREATED,
    async (data: unknown) => {
      const payload = data as MessageCreatedPayload;
      await this.routingManager.route(payload);
    },
  );
}
```

The `RabbitMQService.subscribe()` method:
1. Creates a queue: `claw.<service>.<pattern>`
2. Creates a DLQ: `claw.<service>.<pattern>.dlq`
3. Binds queue to exchange with pattern routing key
4. Sets up consumer with retry logic

---

## Retry and DLQ Behavior

```
Message received
  -> Handler called
  -> Success? ACK message
  -> Failure?
    -> Retry count < 3?
      -> ACK + republish with x-retry-count header
      -> Delay: 5s * (retryCount + 1) — exponential backoff
    -> Retry count >= 3?
      -> NACK (no requeue) -> Message moves to DLQ
      -> Log error: "Message exhausted 3 retries, sending to DLQ"
```

---

## Critical Message Flow

The most important event chain is the message flow:

```
1. User sends message (POST /chat-messages)
2. chat-service stores USER message
3. chat-service publishes: message.created
4. routing-service receives message.created
5. routing-service makes routing decision
6. routing-service publishes: message.routed
7. chat-service receives message.routed
8. chat-service executes AI call (with fallback)
9. chat-service stores ASSISTANT message
10. chat-service publishes: message.completed
11. audit-service receives message.completed -> records usage
12. memory-service receives message.completed -> extracts memories
```

If any step fails:
- Retry up to 3 times with backoff
- After 3 failures, message goes to DLQ
- Chat service stores error ASSISTANT message so frontend polling stops

---

## Module Registration

```typescript
// In app.module.ts
RabbitMQModule.forRootAsync({
  useFactory: (config: AppConfig) => ({
    url: config.rabbitmqUrl,
    serviceName: 'chat-service',
  }),
  inject: [AppConfig],
}),
```

---

## Monitoring

- Check queue depths: RabbitMQ Management UI at `localhost:15672`
- Check DLQ: Look for `*.dlq` queues with messages
- Check logs: Search for "Published event:" and "Subscribed to:" messages
- Check retries: Search for "Retry X/3" log messages
